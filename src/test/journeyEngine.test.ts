import { describe, expect, it } from "vitest";
import { decide } from "../domain/decide";
import { createInitialSnapshot } from "../domain/initialState";
import { apply } from "./helpers";

const human = { kind: "human", surface: "ui" } as const;
const agent = { kind: "agent", surface: "webmcp" } as const;

describe("journey engine", () => {
  it("runs a full delegated draft but keeps submission human-only", async () => {
    let state = createInitialSnapshot("test-session");
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
    state = (await apply(state, { type: "PrepareExpenseSubmission" }, agent)).snapshot;
    expect(state.status).toBe("awaiting_confirmation");
    expect(state.revision).toBe(5);

    const denied = decide(state, {
      operationId: crypto.randomUUID(),
      expectedRevision: state.revision,
      actor: agent,
      command: {
        type: "ConfirmExpenseSubmission",
        challenge: state.pendingConfirmation!.challenge,
        userActivated: true,
      },
      sentAt: new Date().toISOString(),
    });
    expect(denied).toMatchObject({ ok: false, error: { code: "POLICY_DENIED" } });

    state = (
      await apply(
        state,
        {
          type: "ConfirmExpenseSubmission",
          challenge: state.pendingConfirmation!.challenge,
          userActivated: true,
        },
        human,
      )
    ).snapshot;
    expect(state.status).toBe("completed");
    expect(state.expense.status).toBe("submitted");
  });

  it("rejects stale revisions with a recoverable error", async () => {
    const initial = createInitialSnapshot("stale-session");
    const started = (
      await apply(initial, {
        type: "StartJourney",
        source: { kind: "recorded", guideId: "expense-client-dinner", guideVersion: 1 },
        mode: "show",
      })
    ).snapshot;
    const result = decide(started, {
      operationId: crypto.randomUUID(),
      expectedRevision: 0,
      actor: human,
      command: { type: "ChangeAgencyMode", mode: "with" },
      sentAt: new Date().toISOString(),
    });
    expect(result).toMatchObject({ ok: false, error: { code: "STALE_REVISION", retryable: true } });
  });
});
