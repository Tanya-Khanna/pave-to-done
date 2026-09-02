import { describe, expect, it } from "vitest";
import { createInitialSnapshot } from "../domain/initialState";
import type { CommandFailure, CommandSuccess, JourneyStep } from "../domain/types";
import { commandResult, readResult } from "../webmcp/resultFormat";

const currentStep: JourneyStep = {
  id: "step-1",
  capabilityId: "expense.project",
  title: "Choose project",
  description: "Allocate the expense.",
  status: "current",
  assignedActor: "human",
  risk: "reversible",
};

describe("bounded WebMCP results", () => {
  it("returns the uniform read contract and next control boundary", () => {
    const snapshot = {
      ...createInitialSnapshot("session-1"),
      status: "active" as const,
      steps: [currentStep],
    };
    const result = readResult("Current state.", snapshot);

    expect(result.structuredContent).toMatchObject({
      ok: true,
      operationId: null,
      revision: 0,
      sentRevision: null,
      resultingRevision: 0,
      changed: false,
      summary: "Current state.",
      next: { actor: "human", action: "expense.project" },
    });
    expect(JSON.stringify(result).length).toBeLessThan(1_500);
  });

  it("reports changed state, both revisions, and reconciliation", () => {
    const snapshot = {
      ...createInitialSnapshot("session-2"),
      revision: 5,
      status: "awaiting_confirmation" as const,
    };
    const success: CommandSuccess = {
      ok: true,
      operationId: "operation-1",
      revision: 5,
      sentRevision: 4,
      reconciled: true,
      deduplicated: false,
      snapshot,
      events: [
        {
          type: "ExpenseSubmissionPrepared",
          safePayload: {},
          eventId: "event-1",
          sessionId: "session-2",
          revision: 5,
          operationId: "operation-1",
          actor: { kind: "agent", surface: "webmcp" },
          previousHash: "previous",
          eventHash: "current",
          occurredAt: "2026-09-02T00:00:00.000Z",
        },
      ],
    };

    const formatted = commandResult("Prepared.", success);
    expect(formatted.structuredContent).toMatchObject({
      ok: true,
      operationId: "operation-1",
      revision: 5,
      sentRevision: 4,
      resultingRevision: 5,
      changed: true,
      reconciled: true,
      next: { actor: "human", action: "review_and_confirm_in_ui" },
    });
    expect(JSON.stringify(formatted).length).toBeLessThan(1_500);
  });

  it("returns grounded rejection details without claiming a change", () => {
    const snapshot = { ...createInitialSnapshot("session-3"), revision: 7 };
    const failure: CommandFailure = {
      ok: false,
      operationId: "operation-2",
      revision: 7,
      sentRevision: 6,
      error: { code: "STALE_REVISION", message: "Refresh current state.", retryable: true },
      snapshot,
    };

    expect(commandResult("Ignored", failure).structuredContent).toMatchObject({
      ok: false,
      operationId: "operation-2",
      sentRevision: 6,
      resultingRevision: 7,
      changed: false,
      next: { actor: "none", action: "start_journey" },
      error: {
        code: "STALE_REVISION",
        message: "Refresh current state.",
        retryable: true,
        currentRevision: 7,
      },
    });
  });
});
