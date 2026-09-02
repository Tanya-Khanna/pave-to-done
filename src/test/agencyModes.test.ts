import { describe, expect, it } from "vitest";
import { decide } from "../domain/decide";
import { createInitialSnapshot } from "../domain/initialState";
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

async function start(mode: AgencyMode, session = `agency-${mode}-${crypto.randomUUID()}`) {
  return (
    await apply(
      createInitialSnapshot(session),
      {
        type: "StartJourney",
        source: { kind: "recorded", guideId: "expense-client-dinner", guideVersion: 1 },
        mode,
      },
      human,
    )
  ).snapshot;
}

async function finish(mode: AgencyMode) {
  let snapshot = await start(mode);
  const reversibleActor = mode === "show" ? human : agent;
  snapshot = (
    await apply(
      snapshot,
      { type: "CreateExpenseDraft", date: "2026-08-31", amount: 86 },
      reversibleActor,
    )
  ).snapshot;
  snapshot = (
    await apply(
      snapshot,
      { type: "UpdateExpenseDraft", field: "project", value: "Project Atlas" },
      mode === "with" || mode === "show" ? human : agent,
    )
  ).snapshot;
  snapshot = (
    await apply(
      snapshot,
      { type: "UpdateExpenseDraft", field: "category", value: "Client meal" },
      reversibleActor,
    )
  ).snapshot;
  snapshot = (await apply(snapshot, { type: "PrepareExpenseSubmission" }, reversibleActor))
    .snapshot;
  expect(snapshot.status).toBe("awaiting_confirmation");
  snapshot = (
    await apply(
      snapshot,
      {
        type: "ConfirmExpenseSubmission",
        challenge: snapshot.pendingConfirmation!.challenge,
        userActivated: true,
      },
      human,
    )
  ).snapshot;
  return snapshot;
}

describe("three agency modes", () => {
  it.each(["show", "with", "for"] as const)(
    "completes %s mode from a reset session with the promised control split",
    async (mode) => {
      const snapshot = await finish(mode);
      expect(snapshot.status).toBe("completed");
      expect(snapshot.expense).toMatchObject({
        date: "2026-08-31",
        amount: 86,
        project: "Project Atlas",
        category: "Client meal",
        status: "submitted",
      });
      expect(snapshot.steps.every((step) => step.status === "complete")).toBe(true);
    },
  );

  it("denies every agent expense mutation in Show Me with a grounded next action", async () => {
    let snapshot = await start("show");
    const mutations: JourneyCommand[] = [
      { type: "CreateExpenseDraft", date: "2026-08-31", amount: 86 },
      { type: "UpdateExpenseDraft", field: "project", value: "Project Atlas" },
      { type: "UpdateExpenseDraft", field: "category", value: "Client meal" },
      { type: "PrepareExpenseSubmission" },
    ];
    const humanCommands = [...mutations];

    for (let index = 0; index < mutations.length; index += 1) {
      const before = structuredClone(snapshot);
      const rejected = decision(snapshot, mutations[index]);
      expect(rejected).toMatchObject({ ok: false, error: { code: "POLICY_DENIED" } });
      if (!rejected.ok) {
        expect(rejected.error.message).toContain("show mode");
        expect(rejected.error.message).toContain("Current control belongs to human");
        expect(rejected.error.message).toContain(
          snapshot.steps.find((step) => step.status === "current")!.title,
        );
      }
      expect(snapshot).toEqual(before);
      snapshot = (await apply(snapshot, humanCommands[index], human)).snapshot;
    }
    expect(snapshot.status).toBe("awaiting_confirmation");
    const sensitive = decision(snapshot, {
      type: "ConfirmExpenseSubmission",
      challenge: snapshot.pendingConfirmation!.challenge,
      userActivated: true,
    });
    expect(sensitive).toMatchObject({ ok: false, error: { code: "POLICY_DENIED" } });
  });

  it("permits only the current assigned reversible agent step in With Me", async () => {
    let snapshot = await start("with");
    snapshot = (
      await apply(snapshot, { type: "CreateExpenseDraft", date: "2026-08-31", amount: 86 }, agent)
    ).snapshot;
    expect(snapshot.steps.find((step) => step.status === "current")).toMatchObject({
      capabilityId: "expense.project",
      assignedActor: "human",
    });
    expect(
      decision(snapshot, {
        type: "UpdateExpenseDraft",
        field: "project",
        value: "Project Atlas",
      }),
    ).toMatchObject({ ok: false, error: { code: "POLICY_DENIED" } });
    snapshot = (
      await apply(
        snapshot,
        { type: "UpdateExpenseDraft", field: "project", value: "Project Atlas" },
        human,
      )
    ).snapshot;
    expect(
      decision(snapshot, {
        type: "UpdateExpenseDraft",
        field: "project",
        value: "Project Atlas",
      }),
    ).toMatchObject({ ok: false, error: { code: "PRECONDITION_FAILED" } });
    expect(
      decision(snapshot, {
        type: "UpdateExpenseDraft",
        field: "category",
        value: "Client meal",
      }),
    ).toMatchObject({ ok: true });
  });

  it("permits reversible For Me work but never the sensitive consequence", async () => {
    let snapshot = await start("for");
    snapshot = (
      await apply(snapshot, { type: "CreateExpenseDraft", date: "2026-08-31", amount: 86 }, agent)
    ).snapshot;
    snapshot = (
      await apply(
        snapshot,
        { type: "UpdateExpenseDraft", field: "project", value: "Project Atlas" },
        agent,
      )
    ).snapshot;
    snapshot = (
      await apply(
        snapshot,
        { type: "UpdateExpenseDraft", field: "category", value: "Client meal" },
        agent,
      )
    ).snapshot;
    snapshot = (await apply(snapshot, { type: "PrepareExpenseSubmission" }, agent)).snapshot;
    const before = structuredClone(snapshot);
    expect(
      decision(snapshot, {
        type: "ConfirmExpenseSubmission",
        challenge: snapshot.pendingConfirmation!.challenge,
        userActivated: true,
      }),
    ).toMatchObject({ ok: false, error: { code: "POLICY_DENIED" } });
    expect(snapshot).toEqual(before);
  });

  const transitions: Array<[AgencyMode, AgencyMode]> = [
    ["show", "with"],
    ["show", "for"],
    ["with", "show"],
    ["with", "for"],
    ["for", "show"],
    ["for", "with"],
  ];

  it.each(transitions)("preserves valid work when changing %s to %s", async (from, to) => {
    let snapshot = await start(from);
    snapshot = (
      await apply(
        snapshot,
        { type: "CreateExpenseDraft", date: "2026-08-31", amount: 86 },
        from === "show" ? human : agent,
      )
    ).snapshot;
    const expenseBefore = structuredClone(snapshot.expense);
    const completeBefore = snapshot.steps
      .filter((step) => step.status === "complete")
      .map((step) => step.capabilityId);

    snapshot = (await apply(snapshot, { type: "ChangeAgencyMode", mode: to }, human)).snapshot;

    expect(snapshot.agencyMode).toBe(to);
    expect(snapshot.expense).toEqual(expenseBefore);
    expect(
      snapshot.steps.filter((step) => step.status === "complete").map((step) => step.capabilityId),
    ).toEqual(completeBefore);
    expect(snapshot.steps.find((step) => step.status === "current")?.capabilityId).toBe(
      "expense.project",
    );
  });

  it("rejects agent authority escalation while allowing a safe reduction", async () => {
    const show = await start("show");
    const escalation = decision(show, { type: "ChangeAgencyMode", mode: "for" });
    expect(escalation).toMatchObject({ ok: false, error: { code: "AWAITING_HUMAN" } });
    if (!escalation.ok) expect(escalation.error.message).toContain("expands agent authority");

    const delegated = await start("for");
    expect(decision(delegated, { type: "ChangeAgencyMode", mode: "show" })).toMatchObject({
      ok: true,
    });
  });

  it("rejects out-of-order work without mutating the projection", async () => {
    const snapshot = await start("for");
    const before = structuredClone(snapshot);
    const rejected = decision(snapshot, {
      type: "UpdateExpenseDraft",
      field: "project",
      value: "Project Atlas",
    });
    expect(rejected).toMatchObject({ ok: false, error: { code: "PRECONDITION_FAILED" } });
    if (!rejected.ok) {
      expect(rejected.error.message).toContain("Current step is expense.date");
      expect(rejected.error.message).toContain("before expense.project");
    }
    expect(snapshot).toEqual(before);
  });

  it("holds state while paused and requires the visible human UI to resume", async () => {
    let snapshot = await start("for");
    snapshot = (
      await apply(snapshot, { type: "CreateExpenseDraft", date: "2026-08-31", amount: 86 }, agent)
    ).snapshot;
    const heldExpense = structuredClone(snapshot.expense);
    const heldSteps = structuredClone(snapshot.steps);
    snapshot = (await apply(snapshot, { type: "SetJourneyPaused", paused: true }, human)).snapshot;
    expect(snapshot).toMatchObject({ status: "paused", pausedFrom: "active" });

    const rejected = decision(snapshot, {
      type: "UpdateExpenseDraft",
      field: "project",
      value: "Project Atlas",
    });
    expect(rejected).toMatchObject({ ok: false, error: { code: "AWAITING_HUMAN" } });
    if (!rejected.ok)
      expect(rejected.error.message).toContain("resume it from the visible Journey dock");
    expect(snapshot.expense).toEqual(heldExpense);
    expect(snapshot.steps).toEqual(heldSteps);

    snapshot = (await apply(snapshot, { type: "SetJourneyPaused", paused: false }, human)).snapshot;
    expect(snapshot.status).toBe("active");
    expect(snapshot.pausedFrom).toBeUndefined();
    expect(snapshot.expense).toEqual(heldExpense);
    expect(snapshot.steps).toEqual(heldSteps);
  });

  it("blocks ordinary agent work during repair and human confirmation", async () => {
    let repair = await start("for");
    repair = (await apply(repair, { type: "ChangePortalVersion", version: "expense.v2" }, human))
      .snapshot;
    expect(
      decision(repair, { type: "CreateExpenseDraft", date: "2026-08-31", amount: 86 }),
    ).toMatchObject({ ok: false, error: { code: "REPAIR_REQUIRED" } });

    let confirmation = await start("for");
    confirmation = (
      await apply(
        confirmation,
        { type: "CreateExpenseDraft", date: "2026-08-31", amount: 86 },
        agent,
      )
    ).snapshot;
    confirmation = (
      await apply(
        confirmation,
        { type: "UpdateExpenseDraft", field: "project", value: "Project Atlas" },
        agent,
      )
    ).snapshot;
    confirmation = (
      await apply(
        confirmation,
        { type: "UpdateExpenseDraft", field: "category", value: "Client meal" },
        agent,
      )
    ).snapshot;
    confirmation = (await apply(confirmation, { type: "PrepareExpenseSubmission" }, agent))
      .snapshot;
    expect(
      decision(confirmation, {
        type: "UpdateExpenseDraft",
        field: "category",
        value: "Client meal",
      }),
    ).toMatchObject({ ok: false, error: { code: "AWAITING_HUMAN" } });
  });
});
