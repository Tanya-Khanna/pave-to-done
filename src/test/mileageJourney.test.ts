import { describe, expect, it } from "vitest";
import { validateJourneyPlan } from "../domain/compiler";
import { decide } from "../domain/decide";
import { DEFAULT_MILEAGE_GOAL, DEMO_MILEAGE } from "../domain/fixtures";
import { createInitialSnapshot } from "../domain/initialState";
import { getManifest } from "../domain/manifests";
import type { Actor, AgencyMode, JourneyCommand, JourneySnapshot } from "../domain/types";
import { apply } from "./helpers";

const human = { kind: "human", surface: "ui" } as const;
const agent = { kind: "agent", surface: "webmcp" } as const;

function decision(snapshot: JourneySnapshot, command: JourneyCommand, actor: Actor = agent) {
  return decide(snapshot, {
    operationId: crypto.randomUUID(),
    expectedRevision: snapshot.revision,
    actor,
    command,
    sentAt: new Date().toISOString(),
  });
}

async function startMileage(mode: AgencyMode) {
  return (
    await apply(
      createInitialSnapshot(`mileage-${mode}-${crypto.randomUUID()}`),
      {
        type: "StartJourney",
        source: { kind: "on-demand", goal: DEFAULT_MILEAGE_GOAL },
        mode,
      },
      human,
    )
  ).snapshot;
}

const updates = [
  { field: "origin", value: DEMO_MILEAGE.origin },
  { field: "destination", value: DEMO_MILEAGE.destination },
  { field: "distanceMiles", value: DEMO_MILEAGE.distanceMiles },
  { field: "tripDate", value: DEMO_MILEAGE.tripDate },
  { field: "purpose", value: DEMO_MILEAGE.purpose },
] as const;

async function fillMileage(state: JourneySnapshot) {
  for (const update of updates) {
    const assigned = state.steps.find((step) => step.status === "current")!.assignedActor;
    state = (
      await apply(
        state,
        { type: "UpdateMileageDraft", field: update.field, value: update.value },
        assigned === "agent" ? agent : human,
      )
    ).snapshot;
  }
  return state;
}

describe("on-demand mileage journey", () => {
  it("builds a separate validated plan without a pre-existing guide", async () => {
    const state = await startMileage("show");
    expect(state).toMatchObject({
      portalVersion: "mileage.v1",
      capabilityManifestVersion: "manifest.mileage.v1",
      source: { kind: "on-demand", goal: DEFAULT_MILEAGE_GOAL },
      expense: { status: "empty" },
      mileage: { status: "empty" },
    });
    expect(state.steps.every((step) => step.capabilityId.startsWith("mileage."))).toBe(true);
    expect(validateJourneyPlan(state.steps, getManifest("mileage.v1"))).toEqual({ ok: true });
    expect(
      validateJourneyPlan(
        [{ ...state.steps[0], capabilityId: "expense.date" }],
        getManifest("mileage.v1"),
      ),
    ).toMatchObject({ ok: false, reason: expect.stringContaining("Unknown capability") });
  });

  it("enforces the 0.1 to 1,000 mile contract before mutation", async () => {
    let state = await startMileage("for");
    state = (
      await apply(
        state,
        { type: "UpdateMileageDraft", field: "origin", value: DEMO_MILEAGE.origin },
        agent,
      )
    ).snapshot;
    state = (
      await apply(
        state,
        { type: "UpdateMileageDraft", field: "destination", value: DEMO_MILEAGE.destination },
        agent,
      )
    ).snapshot;
    const before = structuredClone(state);
    for (const value of [0, 1000.1])
      expect(
        decision(state, { type: "UpdateMileageDraft", field: "distanceMiles", value }),
      ).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(state).toEqual(before);
  });

  it.each(["show", "with", "for"] as const)(
    "completes the genuine mileage task in %s mode with human-only submission",
    async (mode) => {
      let state = await fillMileage(await startMileage(mode));
      const prepareActor =
        state.steps.find((step) => step.status === "current")!.assignedActor === "agent"
          ? agent
          : human;
      state = (await apply(state, { type: "PrepareMileageSubmission" }, prepareActor)).snapshot;
      expect(state).toMatchObject({
        status: "awaiting_confirmation",
        mileage: { distanceMiles: 18, status: "prepared" },
        pendingConfirmation: { kind: "mileage", reimbursementAmount: 12.06 },
      });
      expect(
        decision(
          state,
          {
            type: "ConfirmMileageSubmission",
            challenge: state.pendingConfirmation!.challenge,
            userActivated: true,
          },
          agent,
        ),
      ).toMatchObject({ ok: false, error: { code: "POLICY_DENIED" } });
      state = (
        await apply(
          state,
          {
            type: "ConfirmMileageSubmission",
            challenge: state.pendingConfirmation!.challenge,
            userActivated: true,
          },
          human,
        )
      ).snapshot;
      expect(state).toMatchObject({
        status: "completed",
        mileage: { status: "submitted", reimbursementId: expect.stringMatching(/^MILE-/) },
      });
    },
  );

  it.each(["show", "with", "for"] as const)(
    "uses the same safe healing compiler for a mileage V2 change in %s mode",
    async (mode) => {
      let state = await fillMileage(await startMileage(mode));
      state = (await apply(state, { type: "ChangePortalVersion", version: "mileage.v2" }, human))
        .snapshot;
      expect(state).toMatchObject({
        status: "repair_required",
        portalVersion: "mileage.v2",
        mileage: { distanceMiles: 18, purpose: DEMO_MILEAGE.purpose },
        healingAssessment: { overall: "repair_required" },
      });
      expect(state.healingAssessment?.safeRemaps).toContainEqual(
        expect.objectContaining({ from: "mileage.distance", to: "mileage.routeDistance" }),
      );
      state = (
        await apply(state, { type: "ProposeRepair", vehicleType: DEMO_MILEAGE.vehicleType }, agent)
      ).snapshot;
      expect(decision(state, { type: "PrepareMileageSubmission" })).toMatchObject({
        ok: false,
        error: { code: "REPAIR_REQUIRED" },
      });
      state = (
        await apply(state, { type: "ApproveRepair", repairId: state.pendingRepair!.id }, human)
      ).snapshot;
      expect(state.steps.find((step) => step.status === "current")).toMatchObject({
        capabilityId: "mileage.vehicleType",
        assignedActor: mode === "show" ? "human" : "agent",
      });
    },
  );
});
