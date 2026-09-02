import { z } from "zod";

const agencyMode = z.enum(["show", "with", "for"]);

export const toolInputValidators = {
  empty: z.object({}).strict(),
  setAgencyMode: z
    .object({
      mode: agencyMode.describe(
        "show: explain only; with: alternate; for: execute reversible work.",
      ),
    })
    .strict(),
  createJourney: z
    .object({
      goal: z.string().trim().min(8).max(240).describe("Concrete task goal."),
      source: z
        .enum(["recorded", "on-demand"])
        .describe("Use a reviewed guide or compose from current capabilities."),
      mode: agencyMode.describe("Initial collaboration mode."),
    })
    .strict(),
  createExpenseDraft: z
    .object({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Receipt date in YYYY-MM-DD format."),
      amount: z.number().positive().max(10_000).describe("Expense amount."),
    })
    .strict(),
  updateExpenseDraft: z
    .object({
      field: z
        .enum(["project", "category", "businessPurpose"])
        .describe("Current reversible expense field."),
      value: z.string().trim().min(1).max(240).describe("Bounded field value."),
    })
    .strict(),
  proposeRepair: z
    .object({
      businessPurpose: z
        .string()
        .trim()
        .min(8)
        .max(240)
        .describe("Proposed value for the newly required field."),
    })
    .strict(),
  saveGuideDraft: z
    .object({
      title: z.string().trim().min(3).max(120).describe("Human-readable guide title."),
      narration: z
        .string()
        .max(500)
        .optional()
        .describe("Optional bounded narration from the reviewed trace."),
      steps: z
        .array(
          z
            .object({
              capabilityId: z
                .string()
                .trim()
                .min(3)
                .max(120)
                .describe("Registered capability from the trace."),
              title: z.string().trim().min(3).max(120).describe("Clear action title."),
              description: z
                .string()
                .trim()
                .min(3)
                .max(240)
                .describe("Grounded action description."),
            })
            .strict(),
        )
        .min(1)
        .max(20)
        .optional()
        .describe("Ordered steps matching the recorded capabilities."),
    })
    .strict(),
} as const;

type ToolInputValidatorName = keyof typeof toolInputValidators;

function inputSchema(name: ToolInputValidatorName): JsonSchema {
  const generated = z.toJSONSchema(toolInputValidators[name], {
    target: "draft-7",
    unrepresentable: "any",
  }) as JsonSchema;
  delete generated.$schema;
  return generated;
}

export const toolInputSchemas = {
  empty: inputSchema("empty"),
  setAgencyMode: inputSchema("setAgencyMode"),
  createJourney: inputSchema("createJourney"),
  createExpenseDraft: inputSchema("createExpenseDraft"),
  updateExpenseDraft: inputSchema("updateExpenseDraft"),
  proposeRepair: inputSchema("proposeRepair"),
  saveGuideDraft: inputSchema("saveGuideDraft"),
} as const;
