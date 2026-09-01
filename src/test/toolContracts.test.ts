import { describe, expect, it } from "vitest";
import { toolInputSchemas, toolInputValidators } from "../webmcp/toolContracts";

describe("generated WebMCP input schemas", () => {
  it("generates closed object schemas from the same validators used at runtime", () => {
    for (const generated of Object.values(toolInputSchemas)) {
      expect(generated.type).toBe("object");
      expect(generated.additionalProperties).toBe(false);
    }
  });

  it("keeps generated bounds aligned with runtime parsing", () => {
    const schema = toolInputSchemas.createExpenseDraft;
    const properties = schema.properties as Record<string, Record<string, unknown>>;

    expect(properties.amount.exclusiveMinimum).toBe(0);
    expect(properties.amount.maximum).toBe(10_000);
    expect(properties.date.pattern).toBe("^\\d{4}-\\d{2}-\\d{2}$");
    expect(
      toolInputValidators.createExpenseDraft.safeParse({ date: "2026-09-01", amount: 48.2 })
        .success,
    ).toBe(true);
    expect(
      toolInputValidators.createExpenseDraft.safeParse({
        date: "2026-09-01",
        amount: 48.2,
        selector: "#submit",
      }).success,
    ).toBe(false);
  });

  it("requires exactly the fields advertised to an agent", () => {
    expect(toolInputSchemas.createJourney.required).toEqual(["goal", "source", "mode"]);
    expect(toolInputValidators.createJourney.safeParse({ goal: "Submit mileage" }).success).toBe(
      false,
    );
  });
});
