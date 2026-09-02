import { z } from "zod";

const boundedText = z.string().trim().min(1).max(240);
const agencyMode = z.enum(["show", "with", "for"]);
const portalVersion = z.enum(["expense.v1", "expense.v2"]);

export const journeySourceSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("recorded"),
      guideId: boundedText,
      guideVersion: z.number().int().positive(),
    })
    .strict(),
  z.object({ kind: z.literal("on-demand"), goal: boundedText }).strict(),
]);

export const journeyCommandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("StartJourney"),
      source: journeySourceSchema,
      mode: agencyMode.optional(),
    })
    .strict(),
  z.object({ type: z.literal("ChangeAgencyMode"), mode: agencyMode }).strict(),
  z.object({ type: z.literal("SetJourneyPaused"), paused: z.boolean() }).strict(),
  z.object({ type: z.literal("ShowGuidance") }).strict(),
  z
    .object({
      type: z.literal("CreateExpenseDraft"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      amount: z.number().positive().max(10000),
    })
    .strict(),
  z
    .object({
      type: z.literal("UpdateExpenseDraft"),
      field: z.enum(["date", "amount", "project", "category", "businessPurpose"]),
      value: z.union([boundedText, z.number().positive().max(10000)]),
    })
    .strict(),
  z.object({ type: z.literal("PrepareExpenseSubmission") }).strict(),
  z
    .object({
      type: z.literal("ConfirmExpenseSubmission"),
      challenge: z.string().min(16).max(160),
      userActivated: z.boolean(),
    })
    .strict(),
  z.object({ type: z.literal("ChangePortalVersion"), version: portalVersion }).strict(),
  z.object({ type: z.literal("ProposeRepair"), businessPurpose: boundedText }).strict(),
  z.object({ type: z.literal("ApproveRepair"), repairId: z.string().min(8).max(80) }).strict(),
  z.object({ type: z.literal("RejectRepair"), repairId: z.string().min(8).max(80) }).strict(),
  z
    .object({ type: z.literal("StartRecording"), narration: z.string().max(500).optional() })
    .strict(),
  z.object({ type: z.literal("StopRecording") }).strict(),
  z
    .object({
      type: z.literal("UpdateRecordingNarration"),
      sequence: z.number().int().positive().max(200),
      narration: z.string().trim().min(1).max(500),
    })
    .strict(),
  z.object({ type: z.literal("GenerateGuideDraft"), title: boundedText.optional() }).strict(),
  z
    .object({
      type: z.literal("SaveGuideDraft"),
      title: boundedText,
      narration: z.string().max(500).optional(),
      steps: z
        .array(
          z
            .object({
              capabilityId: boundedText,
              title: boundedText,
              description: boundedText,
            })
            .strict(),
        )
        .min(1)
        .max(20)
        .optional(),
    })
    .strict(),
  z.object({ type: z.literal("PublishGuide") }).strict(),
  z.object({ type: z.literal("ResetSession") }).strict(),
]);

export const commandEnvelopeSchema = z
  .object({
    operationId: z.string().uuid(),
    expectedRevision: z.number().int().nonnegative(),
    actor: z
      .object({ kind: z.enum(["human", "agent"]), surface: z.enum(["ui", "webmcp"]) })
      .strict(),
    command: journeyCommandSchema,
    sentAt: z.string().datetime(),
  })
  .strict();
