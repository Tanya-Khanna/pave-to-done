import { describe, expect, it } from "vitest";
import { actorMayExecute, assignActor } from "../domain/policies";

const agent = { kind: "agent", surface: "webmcp" } as const;
const human = { kind: "human", surface: "ui" } as const;

describe("authority policy", () => {
  it("denies agent mutations in Show Me and every sensitive effect", () => {
    expect(actorMayExecute(agent, "show", "reversible")).toBe(false);
    expect(actorMayExecute(agent, "for", "sensitive")).toBe(false);
    expect(actorMayExecute(human, "for", "sensitive")).toBe(true);
  });

  it("assigns the judgment step to the person in With Me", () => {
    expect(assignActor(0, "reversible", "with")).toBe("agent");
    expect(assignActor(2, "reversible", "with")).toBe("human");
    expect(assignActor(5, "sensitive", "for")).toBe("human");
  });
});
