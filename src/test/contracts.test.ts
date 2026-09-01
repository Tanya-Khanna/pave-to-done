import { describe, expect, it } from "vitest";
import { commandEnvelopeSchema } from "../domain/contracts";

describe("command contracts", () => {
  const base = {
    operationId: crypto.randomUUID(),
    expectedRevision: 0,
    actor: { kind: "agent", surface: "webmcp" },
    sentAt: new Date().toISOString(),
  };

  it("rejects unknown properties and generic action inputs", () => {
    expect(
      commandEnvelopeSchema.safeParse({
        ...base,
        command: { type: "ChangeAgencyMode", mode: "with", selector: "#submit" },
      }).success,
    ).toBe(false);
    expect(
      commandEnvelopeSchema.safeParse({
        ...base,
        command: {
          type: "UpdateExpenseDraft",
          field: "project",
          value: "Project Atlas",
          arbitrary: { action: "click" },
        },
      }).success,
    ).toBe(false);
  });

  it("accepts the bounded typed mutation", () => {
    expect(
      commandEnvelopeSchema.safeParse({
        ...base,
        command: { type: "UpdateExpenseDraft", field: "project", value: "Project Atlas" },
      }).success,
    ).toBe(true);
  });
});
