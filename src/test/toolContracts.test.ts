import { describe, expect, it } from "vitest";
import { toolInputSchemas, toolInputValidators } from "../webmcp/toolContracts";

describe("generated WebMCP input schemas", () => {
  function inspect(value: unknown, visit: (schema: Record<string, unknown>) => void) {
    if (!value || typeof value !== "object") return;
    const schema = value as Record<string, unknown>;
    visit(schema);
    Object.values(schema).forEach((child) => inspect(child, visit));
  }

  it("generates closed object schemas from the same validators used at runtime", () => {
    for (const generated of Object.values(toolInputSchemas)) {
      inspect(generated, (schema) => {
        if (schema.type === "object") expect(schema.additionalProperties).toBe(false);
        if (typeof schema.description === "string")
          expect(schema.description.length).toBeLessThanOrEqual(150);
      });
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

  it("bounds mileage values in the generated schema and runtime validator", () => {
    const schema = toolInputSchemas.updateMileageDraft;
    const properties = schema.properties as Record<string, Record<string, unknown>>;
    const alternatives = properties.value.anyOf as Array<Record<string, unknown>>;
    const numeric = alternatives.find((candidate) => candidate.type === "number");

    expect(numeric).toMatchObject({ minimum: 0.1, maximum: 1000 });
    expect(
      toolInputValidators.updateMileageDraft.safeParse({ field: "distanceMiles", value: 18 })
        .success,
    ).toBe(true);
    expect(
      toolInputValidators.updateMileageDraft.safeParse({ field: "distanceMiles", value: 1001 })
        .success,
    ).toBe(false);
  });

  it("requires exactly the fields advertised to an agent", () => {
    expect(toolInputSchemas.createJourney.required).toEqual(["goal", "source", "mode"]);
    expect(toolInputValidators.createJourney.safeParse({ goal: "Submit mileage" }).success).toBe(
      false,
    );
  });
});
