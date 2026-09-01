import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createInitialSnapshot } from "../domain/initialState";
import { replay } from "../domain/replay";
import { apply } from "./helpers";

const human = { kind: "human", surface: "ui" } as const;

describe("event replay properties", () => {
  it("reproduces snapshots for arbitrary valid mode changes", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom("show", "with", "for"), { minLength: 1, maxLength: 20 }),
        async (modes) => {
          let state = createInitialSnapshot("property-session");
          const allEvents = [];
          const started = await apply(
            state,
            {
              type: "StartJourney",
              source: { kind: "on-demand", goal: "Submit an expense safely" },
              mode: "show",
            },
            human,
          );
          state = started.snapshot;
          allEvents.push(...started.events);
          for (const mode of modes) {
            const changed = await apply(state, { type: "ChangeAgencyMode", mode }, human);
            state = changed.snapshot;
            allEvents.push(...changed.events);
          }
          const rebuilt = await replay(state.sessionId, allEvents);
          expect(rebuilt).toEqual(state);
          expect(rebuilt.historyVerified).toBe(true);
        },
      ),
    );
  });

  it("blocks a tampered hash chain", async () => {
    const initial = createInitialSnapshot("tamper-session");
    const started = await apply(
      initial,
      {
        type: "StartJourney",
        source: { kind: "on-demand", goal: "Submit an expense safely" },
        mode: "show",
      },
      human,
    );
    const tampered = [{ ...started.events[0], safePayload: { goal: "tampered" } }];
    const rebuilt = await replay(initial.sessionId, tampered);
    expect(rebuilt.status).toBe("blocked");
    expect(rebuilt.historyVerified).toBe(false);
  });
});
