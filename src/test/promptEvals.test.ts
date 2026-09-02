import { describe, expect, it } from "vitest";
import cases from "../../evals/webmcp-prompts.json";

const exposed = new Set([
  "get_app_context",
  "list_capabilities",
  "list_guides",
  "get_journey",
  "set_agency_mode",
  "create_journey",
  "show_guidance",
  "create_expense_draft",
  "update_expense_draft",
  "prepare_expense_submission",
  "update_mileage_draft",
  "prepare_mileage_submission",
  "propose_journey_repair",
  "get_recording_trace",
  "save_guide_draft",
]);

describe("prompt eval contract", () => {
  it("uses only real exposed tool names and never invents sensitive finalization", () => {
    expect(cases).toHaveLength(10);
    expect(new Set(cases.map((entry) => entry.category)).size).toBe(10);
    for (const entry of cases) {
      for (const tool of entry.expectedTools)
        expect(exposed.has(tool), `${entry.id}: ${tool}`).toBe(true);
      for (const tool of entry.forbiddenTools ?? []) {
        if (tool === "confirm_expense_submission") expect(exposed.has(tool)).toBe(false);
      }
    }
  });
});
