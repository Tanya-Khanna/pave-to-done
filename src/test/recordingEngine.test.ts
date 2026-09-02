import { describe, expect, it } from "vitest";
import { decide } from "../domain/decide";
import { createInitialSnapshot } from "../domain/initialState";
import { getManifest } from "../domain/manifests";
import type { Actor, JourneyCommand, JourneySnapshot } from "../domain/types";
import { apply } from "./helpers";

const human = { kind: "human", surface: "ui" } as const;
const agent = { kind: "agent", surface: "webmcp" } as const;

function decision(snapshot: JourneySnapshot, command: JourneyCommand, actor: Actor) {
  return decide(snapshot, {
    operationId: crypto.randomUUID(),
    expectedRevision: snapshot.revision,
    actor,
    command,
    sentAt: new Date().toISOString(),
  });
}

async function recordedExpense() {
  let state = createInitialSnapshot(`recording-${crypto.randomUUID()}`);
  state = (
    await apply(
      state,
      { type: "StartRecording", narration: "Teach the expense review flow" },
      human,
    )
  ).snapshot;
  state = (
    await apply(
      state,
      {
        type: "StartJourney",
        source: { kind: "recorded", guideId: "expense-client-dinner", guideVersion: 1 },
        mode: "show",
      },
      human,
    )
  ).snapshot;
  state = (
    await apply(state, { type: "UpdateExpenseDraft", field: "date", value: "2026-08-31" }, human)
  ).snapshot;
  state = (await apply(state, { type: "UpdateExpenseDraft", field: "amount", value: 86 }, human))
    .snapshot;
  state = (
    await apply(
      state,
      { type: "UpdateExpenseDraft", field: "project", value: "Project Atlas" },
      human,
    )
  ).snapshot;
  state = (
    await apply(
      state,
      { type: "UpdateExpenseDraft", field: "category", value: "Client meal" },
      human,
    )
  ).snapshot;
  state = (await apply(state, { type: "PrepareExpenseSubmission" }, human)).snapshot;
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
  state = (await apply(state, { type: "StopRecording" }, human)).snapshot;
  return state;
}

describe("teach-once recording engine", () => {
  it("starts only after explicit human activation", () => {
    const state = createInitialSnapshot("recording-boundary");
    expect(decision(state, { type: "StartRecording" }, agent)).toMatchObject({
      ok: false,
      error: { code: "POLICY_DENIED" },
    });
    expect(state.recording).toBeUndefined();
    expect(decision(state, { type: "StartRecording" }, human)).toMatchObject({ ok: true });
  });

  it("captures before and after observations while redacting values at capture time", async () => {
    const state = await recordedExpense();
    expect(state.recording?.entries).toHaveLength(6);
    for (const [index, entry] of state.recording!.entries.entries()) {
      expect(entry).toMatchObject({
        sequence: index + 1,
        manifestVersion: "manifest.expense.v1",
        portalVersion: "expense.v1",
        before: expect.any(Object),
        after: expect.any(Object),
      });
      expect(Object.keys(entry.before).length).toBeGreaterThan(0);
      expect(Object.keys(entry.after).length).toBeGreaterThan(0);
    }
    const captured = JSON.stringify(state.recording!.entries);
    for (const secret of [
      "2026-08-31",
      "Project Atlas",
      "Client meal",
      "Juniper & Co.",
      "EXP-",
      state.expense.expenseId!,
    ])
      expect(captured).not.toContain(secret);
    expect(captured).toContain("[REDACTED]");
  });

  it("attaches bounded narration to a specific recorded action", async () => {
    let state = await recordedExpense();
    state = (
      await apply(
        state,
        {
          type: "UpdateRecordingNarration",
          sequence: 3,
          narration: "Choose the project that benefited from the dinner.",
        },
        human,
      )
    ).snapshot;
    expect(state.recording?.entries[2].narration).toBe(
      "Choose the project that benefited from the dinner.",
    );
    expect(state.recording?.entries[1].narration).toBeUndefined();
  });

  it("builds a deterministic, server-backed draft using registered capabilities in order", async () => {
    let state = await recordedExpense();
    state = (
      await apply(state, { type: "GenerateGuideDraft", title: "Review a client expense" }, human)
    ).snapshot;
    expect(state.recording).toMatchObject({
      status: "draft",
      draftOrigin: "deterministic",
      draft: {
        title: "Review a client expense",
        provenance: "AI-generated draft",
        status: "draft",
      },
    });
    const registered = new Set(
      getManifest(state.portalVersion).capabilities.map((capability) => capability.id),
    );
    expect(state.recording!.draft!.steps.every((step) => registered.has(step.capabilityId))).toBe(
      true,
    );
    expect(state.recording!.draft!.steps.map((step) => step.capabilityId)).toEqual(
      state.recording!.entries.map((entry) => entry.capabilityId),
    );
  });

  it("rejects agent drafts containing capabilities outside the recorded manifest path", async () => {
    const state = await recordedExpense();
    const rejected = decision(
      state,
      {
        type: "SaveGuideDraft",
        title: "Unsafe draft",
        steps: [
          {
            capabilityId: "admin.deleteEverything",
            title: "Delete everything",
            description: "This capability was never recorded or registered.",
          },
        ],
      },
      agent,
    );
    expect(rejected).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(state.recording?.status).toBe("review");
  });

  it("lets an agent draft but only a person publish with recorded provenance", async () => {
    let state = await recordedExpense();
    state = (
      await apply(state, { type: "SaveGuideDraft", title: "Agent-reviewed expense guide" }, agent)
    ).snapshot;
    expect(state.recording).toMatchObject({
      status: "draft",
      draftOrigin: "agent",
      draft: { provenance: "AI-generated draft" },
    });
    expect(decision(state, { type: "PublishGuide" }, agent)).toMatchObject({
      ok: false,
      error: { code: "POLICY_DENIED" },
    });
    state = (await apply(state, { type: "PublishGuide" }, human)).snapshot;
    expect(state.recording).toMatchObject({
      status: "published",
      publishedGuide: { provenance: "Recorded guide", status: "published" },
    });
  });
});
