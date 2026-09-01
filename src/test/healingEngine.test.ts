import { describe, expect, it } from "vitest";
import { createInitialSnapshot } from "../domain/initialState";
import { apply } from "./helpers";

const agent = { kind: "agent", surface: "webmcp" } as const;
const human = { kind: "human", surface: "ui" } as const;

describe("self-healing", () => {
  it("preserves completed facts and blocks on a material v2 requirement", async () => {
    let state = createInitialSnapshot("repair-session");
    state = (
      await apply(state, {
        type: "StartJourney",
        source: { kind: "on-demand", goal: "Submit the client dinner" },
        mode: "for",
      })
    ).snapshot;
    state = (
      await apply(state, { type: "CreateExpenseDraft", date: "2026-08-31", amount: 86 }, agent)
    ).snapshot;
    state = (
      await apply(
        state,
        { type: "UpdateExpenseDraft", field: "project", value: "Project Atlas" },
        agent,
      )
    ).snapshot;
    state = (
      await apply(
        state,
        { type: "UpdateExpenseDraft", field: "category", value: "Client meal" },
        agent,
      )
    ).snapshot;
    const completedBefore = state.steps
      .filter((step) => step.status === "complete")
      .map((step) => step.capabilityId);

    state = (await apply(state, { type: "ChangePortalVersion", version: "expense.v2" }, human))
      .snapshot;
    expect(state.status).toBe("repair_required");
    expect(state.expense.project).toBe("Project Atlas");

    state = (
      await apply(
        state,
        { type: "ProposeRepair", businessPurpose: "Client dinner after Project Atlas workshop" },
        agent,
      )
    ).snapshot;
    expect(state.pendingRepair?.safeRemaps[0]).toMatchObject({ capabilityId: "expense.create" });
    expect(state.pendingRepair?.materialChanges[0]).toMatchObject({
      capabilityId: "expense.businessPurpose",
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
  });
});
