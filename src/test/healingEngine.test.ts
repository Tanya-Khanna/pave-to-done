import { describe, expect, it } from "vitest";
import { decide } from "../domain/decide";
import { compileHealing, createRepair, validateRepair } from "../domain/healingCompiler";
import { createInitialSnapshot } from "../domain/initialState";
import { portalV1Manifest, portalV2Manifest } from "../domain/manifests";
import type {
  Actor,
  AgencyMode,
  CapabilityDefinition,
  CapabilityManifest,
  JourneyCommand,
  JourneySnapshot,
  JourneyStep,
} from "../domain/types";
import { apply } from "./helpers";

const agent = { kind: "agent", surface: "webmcp" } as const;
const human = { kind: "human", surface: "ui" } as const;

function decision(snapshot: JourneySnapshot, command: JourneyCommand, actor: Actor = agent) {
  return decide(snapshot, {
    operationId: crypto.randomUUID(),
    expectedRevision: snapshot.revision,
    actor,
    command,
    sentAt: new Date().toISOString(),
  });
}

function capability(overrides: Partial<CapabilityDefinition> = {}): CapabilityDefinition {
  return {
    id: "task.value",
    version: "1",
    title: "Set value",
    description: "Set the required value.",
    risk: "reversible",
    allowedActors: ["human", "agent"],
    requiredField: "project",
    anchorKey: "task.value",
    aliases: ["set value"],
    ...overrides,
  };
}

function manifest(version: string, capabilities: CapabilityDefinition[]): CapabilityManifest {
  return {
    version,
    portalVersion: "expense.v1",
    capabilities,
  };
}

function syntheticSnapshot(stepOverrides: Partial<JourneyStep> = {}) {
  return {
    ...createInitialSnapshot("synthetic-healing"),
    source: { kind: "on-demand" as const, goal: "Set a value" },
    status: "active" as const,
    steps: [
      {
        id: "step-value",
        capabilityId: "task.value",
        title: "Set value",
        description: "Set the value.",
        status: "current" as const,
        assignedActor: "agent" as const,
        risk: "reversible" as const,
        requiredField: "project" as const,
        anchorKey: "task.value",
        ...stepOverrides,
      },
    ],
  };
}

async function readyForPortalChange(mode: AgencyMode = "for") {
  let state = createInitialSnapshot(`repair-${mode}-${crypto.randomUUID()}`);
  state = (
    await apply(
      state,
      {
        type: "StartJourney",
        source: { kind: "on-demand", goal: "Submit the client dinner" },
        mode,
      },
      human,
    )
  ).snapshot;
  const reversible = mode === "show" ? human : agent;
  state = (
    await apply(state, { type: "CreateExpenseDraft", date: "2026-08-31", amount: 86 }, reversible)
  ).snapshot;
  state = (
    await apply(
      state,
      { type: "UpdateExpenseDraft", field: "project", value: "Project Atlas" },
      mode === "with" || mode === "show" ? human : agent,
    )
  ).snapshot;
  state = (
    await apply(
      state,
      { type: "UpdateExpenseDraft", field: "category", value: "Client meal" },
      reversible,
    )
  ).snapshot;
  return state;
}

async function proposedRepair(mode: AgencyMode = "for") {
  let state = await readyForPortalChange(mode);
  state = (await apply(state, { type: "ChangePortalVersion", version: "expense.v2" }, human))
    .snapshot;
  state = (
    await apply(
      state,
      { type: "ProposeRepair", businessPurpose: "Client dinner after Project Atlas workshop" },
      agent,
    )
  ).snapshot;
  return state;
}

describe("pure manifest healing compiler", () => {
  it("classifies an unchanged capability as compatible", () => {
    const source = capability();
    const result = compileHealing({
      snapshot: syntheticSnapshot(),
      sourceManifest: manifest("source", [source]),
      currentManifest: manifest("current", [{ ...source, version: "2" }]),
    });
    expect(result.overall).toBe("compatible");
    expect(result.classifications[0]).toMatchObject({
      disposition: "compatible",
      satisfied: false,
    });
  });

  it("remaps a changed capability ID through a surviving semantic anchor", () => {
    const result = compileHealing({
      snapshot: syntheticSnapshot(),
      sourceManifest: manifest("source", [capability()]),
      currentManifest: manifest("current", [capability({ id: "task.value.v2", version: "2" })]),
    });
    expect(result.overall).toBe("remapped");
    expect(result.classifications[0]).toMatchObject({
      disposition: "remapped",
      fromCapabilityId: "task.value",
      toCapabilityId: "task.value.v2",
    });
    expect(result.proposedSteps[0]).toMatchObject({
      capabilityId: "task.value.v2",
      anchorKey: "task.value",
      status: "current",
    });
  });

  it("blocks a removed capability and any risk increase", () => {
    const removed = compileHealing({
      snapshot: syntheticSnapshot(),
      sourceManifest: manifest("source", [capability()]),
      currentManifest: manifest("current", []),
    });
    expect(removed.overall).toBe("blocked");
    expect(removed.blockedReasons[0]).toContain("removed");

    const increased = compileHealing({
      snapshot: syntheticSnapshot(),
      sourceManifest: manifest("source", [capability()]),
      currentManifest: manifest("current", [capability({ risk: "sensitive" })]),
    });
    expect(increased.overall).toBe("blocked");
    expect(increased.blockedReasons[0]).toContain("increased risk");
  });

  it("blocks manifest authority expansion and keeps agent-ineligible work human-owned", () => {
    const humanOnly = capability({ allowedActors: ["human"] });
    const expanded = compileHealing({
      snapshot: syntheticSnapshot({ assignedActor: "human" }),
      sourceManifest: manifest("source", [humanOnly]),
      currentManifest: manifest("expanded", [capability({ version: "2" })]),
      mode: "for",
    });
    expect(expanded.overall).toBe("blocked");
    expect(expanded.blockedReasons[0]).toContain("expand agent authority");

    const constrained = compileHealing({
      snapshot: syntheticSnapshot(),
      sourceManifest: manifest("source", [capability()]),
      currentManifest: manifest("constrained", [
        capability({ version: "2", allowedActors: ["human"] }),
      ]),
      mode: "for",
    });
    expect(constrained.proposedSteps[0].assignedActor).toBe("human");
    expect(constrained.classifications[0].toAgentEligible).toBe(false);
  });

  it("marks an already-satisfied postcondition complete instead of replaying it", () => {
    const snapshot = syntheticSnapshot();
    snapshot.expense.project = "Project Atlas";
    const result = compileHealing({
      snapshot,
      sourceManifest: manifest("source", [capability()]),
      currentManifest: manifest("current", [capability({ version: "2" })]),
    });
    expect(result.classifications[0].satisfied).toBe(true);
    expect(result.proposedSteps[0].status).toBe("complete");
  });

  it("applies a cosmetic anchor change without losing progress", () => {
    const snapshot = syntheticSnapshot();
    snapshot.expense.amount = 86;
    const source = capability({ requiredField: undefined, anchorKey: "sidebar.action" });
    const current = capability({
      requiredField: undefined,
      anchorKey: "header.action",
      version: "2",
      title: "Add value",
    });
    const result = compileHealing({
      snapshot,
      sourceManifest: manifest("source", [source]),
      currentManifest: manifest("current", [current]),
    });
    expect(result.overall).toBe("remapped");
    expect(result.safeRemaps[0]).toMatchObject({
      from: "sidebar.action",
      to: "header.action",
    });
    expect(result.proposedSteps[0].anchorKey).toBe("header.action");
    expect(snapshot.expense.amount).toBe(86);
  });

  it("detects the real new required field as a material change in every mode", async () => {
    for (const mode of ["show", "with", "for"] as const) {
      const snapshot = await readyForPortalChange(mode);
      const result = compileHealing({
        snapshot,
        sourceManifest: portalV1Manifest,
        currentManifest: portalV2Manifest,
        mode,
      });
      expect(result.overall).toBe("repair_required");
      expect(result.safeRemaps).toContainEqual(
        expect.objectContaining({
          capabilityId: "expense.create",
          from: "sidebar.newExpense",
          to: "header.addExpense",
        }),
      );
      expect(result.materialChanges).toContainEqual(
        expect.objectContaining({ capabilityId: "expense.businessPurpose" }),
      );
      expect(
        result.proposedSteps.find((step) => step.capabilityId === "expense.businessPurpose"),
      ).toMatchObject({
        status: "current",
        assignedActor: mode === "show" ? "human" : "agent",
      });
    }
  });

  it.each(["show", "with", "for"] as const)(
    "preserves progress through a purely cosmetic anchor change in %s mode",
    async (mode) => {
      const snapshot = await readyForPortalChange(mode);
      const cosmetic = structuredClone(portalV1Manifest);
      cosmetic.version = "manifest.expense.cosmetic-v2";
      const moved = cosmetic.capabilities.find((item) => item.id === "expense.date")!;
      moved.version = "2";
      moved.anchorKey = "expense.receiptDate.v2";

      const result = compileHealing({
        snapshot,
        sourceManifest: portalV1Manifest,
        currentManifest: cosmetic,
        mode,
      });

      expect(result.overall).toBe("remapped");
      expect(result.materialChanges).toHaveLength(0);
      expect(result.safeRemaps).toContainEqual(
        expect.objectContaining({
          capabilityId: "expense.date",
          from: "expense.date",
          to: "expense.receiptDate.v2",
        }),
      );
      expect(snapshot.expense).toMatchObject({
        date: "2026-08-31",
        amount: 86,
        project: "Project Atlas",
        category: "Client meal",
      });
    },
  );
});

describe("server-enforced healing workflow", () => {
  it("rejects assigning an agent-ineligible reversible capability to an agent", () => {
    const snapshot = syntheticSnapshot({ assignedActor: "human" });
    const assessment = compileHealing({
      snapshot,
      sourceManifest: manifest("source", [capability({ allowedActors: ["human"] })]),
      currentManifest: manifest("current", [
        capability({
          version: "2",
          allowedActors: ["human"],
          requiredField: "category",
        }),
      ]),
      mode: "for",
    });
    const repair = createRepair(snapshot, assessment);
    repair.proposedSteps[0].assignedActor = "agent";
    const approvalSnapshot = {
      ...snapshot,
      revision: snapshot.revision + 1,
      capabilityManifestVersion: "current",
      healingAssessment: assessment,
      pendingRepair: repair,
    };

    expect(validateRepair(approvalSnapshot, repair)).toEqual({
      ok: false,
      reason: expect.stringContaining("agent-ineligible"),
    });
  });

  it("detects stale manifest state before every step mutation", async () => {
    const state = await readyForPortalChange("for");
    const stale = {
      ...state,
      portalVersion: "expense.v2" as const,
      capabilityManifestVersion: "manifest.expense.v1",
    };
    expect(decision(stale, { type: "PrepareExpenseSubmission" })).toMatchObject({
      ok: false,
      error: { code: "REPAIR_REQUIRED", message: expect.stringContaining("stale") },
    });
  });

  it("preserves completed facts, applies the reviewed material repair, and then resumes", async () => {
    let state = await readyForPortalChange("for");
    const completedBefore = state.steps
      .filter((step) => step.status === "complete")
      .map((step) => step.capabilityId);
    state = (await apply(state, { type: "ChangePortalVersion", version: "expense.v2" }, human))
      .snapshot;
    expect(state).toMatchObject({
      status: "repair_required",
      capabilityManifestVersion: "manifest.expense.v2",
      expense: { project: "Project Atlas", category: "Client meal" },
    });
    expect(state.healingAssessment).toMatchObject({ overall: "repair_required" });
    expect(decision(state, { type: "PrepareExpenseSubmission" })).toMatchObject({
      ok: false,
      error: { code: "REPAIR_REQUIRED" },
    });

    state = (
      await apply(
        state,
        { type: "ProposeRepair", businessPurpose: "Client dinner after Project Atlas workshop" },
        agent,
      )
    ).snapshot;
    expect(decision(state, { type: "PrepareExpenseSubmission" })).toMatchObject({
      ok: false,
      error: { code: "REPAIR_REQUIRED" },
    });
    state = (
      await apply(state, { type: "ApproveRepair", repairId: state.pendingRepair!.id }, human)
    ).snapshot;

    expect(
      state.steps.filter((step) => step.status === "complete").map((step) => step.capabilityId),
    ).toEqual(completedBefore);
    expect(state.steps.find((step) => step.status === "current")?.capabilityId).toBe(
      "expense.businessPurpose",
    );
    state = (
      await apply(
        state,
        {
          type: "UpdateExpenseDraft",
          field: "businessPurpose",
          value: "Client dinner after Project Atlas workshop",
        },
        agent,
      )
    ).snapshot;
    expect(state.expense.businessPurpose).toContain("Project Atlas");
  });

  it.each(["show", "with", "for"] as const)(
    "completes a human-reviewed material repair without losing facts in %s mode",
    async (mode) => {
      let state = await readyForPortalChange(mode);
      const before = structuredClone(state.expense);
      state = (await apply(state, { type: "ChangePortalVersion", version: "expense.v2" }, human))
        .snapshot;
      state = (
        await apply(
          state,
          { type: "ProposeRepair", businessPurpose: "Client dinner after Project Atlas workshop" },
          agent,
        )
      ).snapshot;
      state = (
        await apply(state, { type: "ApproveRepair", repairId: state.pendingRepair!.id }, human)
      ).snapshot;

      expect(state.expense).toEqual(before);
      expect(state.steps.find((step) => step.status === "current")).toMatchObject({
        capabilityId: "expense.businessPurpose",
        assignedActor: mode === "show" ? "human" : "agent",
      });
      state = (
        await apply(
          state,
          {
            type: "UpdateExpenseDraft",
            field: "businessPurpose",
            value: "Client dinner after Project Atlas workshop",
          },
          mode === "show" ? human : agent,
        )
      ).snapshot;
      expect(state.steps.find((step) => step.status === "current")?.capabilityId).toBe(
        "expense.prepare",
      );
      expect(state.expense).toMatchObject({ ...before, businessPurpose: expect.any(String) });
    },
  );

  it.each([
    "lower risk",
    "expand authority",
    "unknown capability",
    "remove required outcome",
    "modify completed work",
  ])("rejects a tampered repair that would %s and leaves state unchanged", async (attack) => {
    const state = await proposedRepair("for");
    const tampered = structuredClone(state);
    const repair = tampered.pendingRepair!;
    if (attack === "lower risk") repair.proposedSteps[0].risk = "read";
    if (attack === "expand authority") {
      const sensitive = repair.proposedSteps.find((step) => step.risk === "sensitive")!;
      sensitive.assignedActor = "agent";
    }
    if (attack === "unknown capability")
      repair.proposedSteps.push({
        ...repair.proposedSteps[0],
        id: "unknown-step",
        capabilityId: "unknown.capability",
      });
    if (attack === "remove required outcome")
      repair.proposedSteps = repair.proposedSteps.filter(
        (step) => step.capabilityId !== "expense.businessPurpose",
      );
    if (attack === "modify completed work") repair.proposedSteps[0].status = "pending";
    const before = structuredClone(tampered);
    const rejected = decision(
      tampered,
      { type: "ApproveRepair", repairId: tampered.pendingRepair!.id },
      human,
    );
    expect(rejected).toMatchObject({
      ok: false,
      error: { code: "POLICY_DENIED", message: expect.stringContaining("Unsafe repair rejected") },
    });
    expect(tampered).toEqual(before);
  });

  it("lets the person reject a repair, preserves facts, and stops all progression", async () => {
    let state = await proposedRepair("for");
    const expenseBefore = structuredClone(state.expense);
    state = (await apply(state, { type: "RejectRepair", repairId: state.pendingRepair!.id }, human))
      .snapshot;
    expect(state).toMatchObject({
      status: "blocked",
      pendingRepair: undefined,
      blockedReason: expect.stringContaining("rejected"),
    });
    expect(state.expense).toEqual(expenseBefore);
    expect(decision(state, { type: "PrepareExpenseSubmission" })).toMatchObject({
      ok: false,
      error: { code: "REPAIR_REQUIRED" },
    });
  });
});
