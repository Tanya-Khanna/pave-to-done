import { describe, expect, it } from "vitest";
import { compileSteps } from "../domain/compiler";
import { createInitialSnapshot } from "../domain/initialState";
import type { JourneySnapshot } from "../domain/types";
import { resolveGuidanceHelp } from "../guidance/help";

function activeExpense(): JourneySnapshot {
  return {
    ...createInitialSnapshot("help"),
    portalVersion: "expense.v1",
    capabilityManifestVersion: "manifest.expense.v1",
    source: { kind: "on-demand", goal: "Submit an expense" },
    goal: "Submit an expense",
    status: "awaiting_user",
    steps: compileSteps("show", "expense.v1"),
  };
}

describe("bounded journey help", () => {
  it("answers current-step, reason, and progress questions from semantic state", () => {
    const snapshot = activeExpense();
    expect(resolveGuidanceHelp("What do I do next?", snapshot)).toMatchObject({
      intent: "repeat",
      capabilityId: "expense.date",
    });
    expect(resolveGuidanceHelp("Why do I need this?", snapshot)).toMatchObject({
      intent: "why",
      capabilityId: "expense.date",
    });
    expect(resolveGuidanceHelp("How far am I?", snapshot).answer).toContain("0 of 6");
  });

  it("locates a named control without changing the snapshot", () => {
    const snapshot = activeExpense();
    const before = structuredClone(snapshot);
    expect(resolveGuidanceHelp("Where is the amount control?", snapshot)).toMatchObject({
      intent: "locate",
      capabilityId: "expense.amount",
      anchorKey: "expense.amount",
    });
    expect(snapshot).toEqual(before);
  });

  it("recognizes pause, resume, and agency changes without storing the transcript", () => {
    const snapshot = activeExpense();
    expect(resolveGuidanceHelp("Pause for now", snapshot).intent).toBe("pause");
    expect(resolveGuidanceHelp("Continue", snapshot).intent).toBe("resume");
    expect(resolveGuidanceHelp("Switch to do it for me", snapshot)).toMatchObject({
      intent: "change_mode",
      mode: "for",
    });
  });

  it("returns an honest bounded fallback for unknown questions", () => {
    expect(resolveGuidanceHelp("What is the weather?", activeExpense())).toMatchObject({
      intent: "unknown",
    });
  });
});
