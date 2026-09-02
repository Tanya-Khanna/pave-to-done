import { compileSteps, buildRepair } from "./compiler";
import { DEFAULT_RECORDED_GUIDE } from "./fixtures";
import { actorMayExecute } from "./policies";
import type { CommandEnvelope, Decision, DomainError, JourneySnapshot, JourneyStep } from "./types";

const fail = (code: DomainError["code"], message: string, retryable = false): Decision => ({
  ok: false,
  error: { code, message, retryable },
});

function currentStep(snapshot: JourneySnapshot): JourneyStep | undefined {
  return snapshot.steps.find((step) => step.status === "current");
}

function requireActive(snapshot: JourneySnapshot): Decision | null {
  if (!snapshot.source || snapshot.status === "idle")
    return fail("PRECONDITION_FAILED", "Start a journey first.");
  if (snapshot.status === "repair_required")
    return fail("REPAIR_REQUIRED", "Review the portal repair before continuing.");
  if (snapshot.status === "paused")
    return fail(
      "AWAITING_HUMAN",
      "This journey is paused. A person must resume it from the visible Journey dock before work can continue.",
    );
  if (snapshot.status === "awaiting_confirmation")
    return fail("AWAITING_HUMAN", "A person must review the prepared submission.");
  if (snapshot.status === "completed")
    return fail("PRECONDITION_FAILED", "This journey is already complete.");
  return null;
}

function canRunCurrent(
  snapshot: JourneySnapshot,
  envelope: CommandEnvelope,
  expectedCapability?: string,
): Decision | null {
  const active = requireActive(snapshot);
  if (active) return active;
  const step = currentStep(snapshot);
  if (!step) return fail("PRECONDITION_FAILED", "No current step is available.");
  if (expectedCapability && step.capabilityId !== expectedCapability) {
    return fail(
      "PRECONDITION_FAILED",
      `Current step is ${step.capabilityId}; complete it before ${expectedCapability}.`,
    );
  }
  if (!actorMayExecute(envelope.actor, snapshot.agencyMode, step.risk, step)) {
    return fail(
      "POLICY_DENIED",
      `${envelope.actor.kind} cannot perform ${step.capabilityId} in ${snapshot.agencyMode} mode. Current control belongs to ${step.assignedActor}; ${step.title} must be completed next.`,
    );
  }
  return null;
}

function fieldCapability(field: string) {
  return `expense.${field}`;
}

export function decide(snapshot: JourneySnapshot, envelope: CommandEnvelope): Decision {
  const { command, actor } = envelope;

  if (command.type !== "ResetSession" && envelope.expectedRevision !== snapshot.revision) {
    return fail(
      "STALE_REVISION",
      `Expected revision ${envelope.expectedRevision}; current revision is ${snapshot.revision}.`,
      true,
    );
  }

  switch (command.type) {
    case "ResetSession":
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "Only the visible human UI can reset a session.");
      return { ok: true, events: [{ type: "SessionReset", safePayload: {} }] };

    case "StartJourney": {
      if (snapshot.status !== "idle" && snapshot.status !== "completed")
        return fail("PRECONDITION_FAILED", "Reset or finish the current journey first.");
      const mode = command.mode ?? snapshot.agencyMode;
      const goal =
        command.source.kind === "on-demand" ? command.source.goal : DEFAULT_RECORDED_GUIDE.goal;
      return {
        ok: true,
        events: [
          {
            type: "JourneyStarted",
            safePayload: {
              source: command.source,
              mode,
              goal,
              steps: compileSteps(mode, snapshot.portalVersion),
            },
          },
        ],
      };
    }

    case "ChangeAgencyMode":
      if (snapshot.status === "awaiting_confirmation")
        return fail(
          "AWAITING_HUMAN",
          "Finish or reset the pending confirmation before changing modes.",
        );
      if (command.mode === snapshot.agencyMode) return { ok: true, events: [] };
      if (actor.kind === "agent") {
        const authority = { show: 0, with: 1, for: 2 } as const;
        if (authority[command.mode] > authority[snapshot.agencyMode])
          return fail(
            "AWAITING_HUMAN",
            `Changing from ${snapshot.agencyMode} to ${command.mode} expands agent authority. A person must select that mode in the visible Journey dock.`,
          );
      }
      return {
        ok: true,
        events: [{ type: "AgencyModeChanged", safePayload: { mode: command.mode } }],
      };

    case "SetJourneyPaused": {
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "Only the visible human UI can pause or resume a journey.");
      if (!snapshot.source || snapshot.status === "idle")
        return fail("PRECONDITION_FAILED", "Start a journey before pausing it.");
      if (command.paused) {
        if (snapshot.status === "paused")
          return fail("PRECONDITION_FAILED", "This journey is already paused.");
        if (!["active", "awaiting_user"].includes(snapshot.status))
          return fail(
            "AWAITING_HUMAN",
            `The journey cannot be paused while it is ${snapshot.status.replaceAll("_", " ")}. Resolve that human boundary first.`,
          );
        return {
          ok: true,
          events: [
            {
              type: "JourneyPaused",
              safePayload: { pausedFrom: snapshot.status },
            },
          ],
        };
      }
      if (snapshot.status !== "paused")
        return fail("PRECONDITION_FAILED", "This journey is not paused.");
      return { ok: true, events: [{ type: "JourneyResumed", safePayload: {} }] };
    }

    case "ShowGuidance": {
      const active = requireActive(snapshot);
      if (active) return active;
      const step = currentStep(snapshot);
      if (!step) return fail("NOT_FOUND", "There is no step to explain.");
      return {
        ok: true,
        events: [
          {
            type: "GuidanceShown",
            safePayload: {
              stepId: step.id,
              capabilityId: step.capabilityId,
              message: step.description,
              anchorKey: step.anchorKey ?? "",
            },
          },
        ],
      };
    }

    case "CreateExpenseDraft": {
      const denial = canRunCurrent(snapshot, envelope);
      if (denial) return denial;
      const step = currentStep(snapshot)!;
      if (!["expense.date", "expense.amount"].includes(step.capabilityId))
        return fail(
          "PRECONDITION_FAILED",
          "Receipt facts can only be drafted at the start of the journey.",
        );
      return {
        ok: true,
        events: [
          {
            type: "ExpenseDraftCreated",
            safePayload: {
              date: command.date,
              amount: command.amount,
              completedCapabilities: ["expense.date", "expense.amount"],
            },
          },
        ],
      };
    }

    case "UpdateExpenseDraft": {
      const capabilityId = fieldCapability(command.field);
      const denial = canRunCurrent(snapshot, envelope, capabilityId);
      if (denial) return denial;
      if (command.field === "amount" && (typeof command.value !== "number" || command.value <= 0))
        return fail("INVALID_INPUT", "Amount must be a positive number.");
      if (command.field !== "amount" && typeof command.value !== "string")
        return fail("INVALID_INPUT", `${command.field} must be text.`);
      return {
        ok: true,
        events: [
          {
            type: "ExpenseFieldUpdated",
            safePayload: { field: command.field, value: command.value, capabilityId },
          },
        ],
      };
    }

    case "PrepareExpenseSubmission": {
      const denial = canRunCurrent(snapshot, envelope, "expense.prepare");
      if (denial) return denial;
      const required: Array<keyof typeof snapshot.expense> = [
        "date",
        "amount",
        "project",
        "category",
      ];
      if (snapshot.portalVersion === "expense.v2") required.push("businessPurpose");
      const missing = required.filter((field) => !snapshot.expense[field]);
      if (missing.length)
        return fail("PRECONDITION_FAILED", `Missing required fields: ${missing.join(", ")}.`);
      const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
      return {
        ok: true,
        events: [
          {
            type: "ExpenseSubmissionPrepared",
            safePayload: {
              challenge: crypto.randomUUID(),
              expiresAt,
              amount: snapshot.expense.amount,
              project: snapshot.expense.project,
              category: snapshot.expense.category,
              merchant: snapshot.expense.merchant,
            },
          },
        ],
      };
    }

    case "ConfirmExpenseSubmission": {
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail(
          "POLICY_DENIED",
          "Final submission is human-only and is never exposed as a WebMCP tool.",
        );
      if (!command.userActivated)
        return fail("POLICY_DENIED", "A current human activation is required.");
      if (!snapshot.pendingConfirmation || snapshot.status !== "awaiting_confirmation")
        return fail("PRECONDITION_FAILED", "No prepared submission is awaiting confirmation.");
      if (snapshot.pendingConfirmation.challenge !== command.challenge)
        return fail("POLICY_DENIED", "The confirmation challenge is invalid or already used.");
      if (Date.parse(snapshot.pendingConfirmation.expiresAt) < Date.now())
        return fail(
          "PRECONDITION_FAILED",
          "The confirmation expired; prepare the submission again.",
        );
      return {
        ok: true,
        events: [
          {
            type: "ExpenseSubmitted",
            safePayload: { expenseId: `EXP-${String(snapshot.revision + 2041).padStart(4, "0")}` },
          },
        ],
      };
    }

    case "ChangePortalVersion": {
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "The demo portal version switch is a human UI control.");
      if (command.version === snapshot.portalVersion)
        return fail("PRECONDITION_FAILED", `Portal is already ${command.version}.`);
      if (!snapshot.source)
        return {
          ok: true,
          events: [
            {
              type: "PortalVersionChanged",
              safePayload: { version: command.version, requiresRepair: false },
            },
          ],
        };
      if (command.version === "expense.v2") {
        return {
          ok: true,
          events: [
            {
              type: "PortalVersionChanged",
              safePayload: { version: command.version, requiresRepair: true },
            },
          ],
        };
      }
      return fail(
        "PRECONDITION_FAILED",
        "The demo does not downgrade an active v2 journey; reset first.",
      );
    }

    case "ProposeRepair": {
      if (actor.kind !== "agent" || actor.surface !== "webmcp")
        return fail("POLICY_DENIED", "The agent proposes a bounded repair through WebMCP.");
      if (snapshot.status !== "repair_required" || snapshot.portalVersion !== "expense.v2")
        return fail("PRECONDITION_FAILED", "No repair is currently required.");
      if (snapshot.pendingRepair)
        return fail("AWAITING_HUMAN", "A repair proposal is already waiting for human review.");
      const repair = buildRepair(snapshot, command.businessPurpose);
      return { ok: true, events: [{ type: "JourneyRepairProposed", safePayload: { repair } }] };
    }

    case "ApproveRepair": {
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "Repair approval is human-only.");
      if (!snapshot.pendingRepair || snapshot.pendingRepair.id !== command.repairId)
        return fail("NOT_FOUND", "That repair proposal is no longer current.");
      return {
        ok: true,
        events: [
          {
            type: "JourneyRepairApproved",
            safePayload: {
              repairId: command.repairId,
              steps: snapshot.pendingRepair.proposedSteps,
            },
          },
        ],
      };
    }

    case "StartRecording":
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "Recording begins only from an explicit human UI action.");
      if (snapshot.recording?.status === "recording")
        return fail("PRECONDITION_FAILED", "Recording is already active.");
      return {
        ok: true,
        events: [{ type: "RecordingStarted", safePayload: { narration: command.narration ?? "" } }],
      };

    case "StopRecording":
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "Only the visible human UI can stop recording.");
      if (snapshot.recording?.status !== "recording")
        return fail("PRECONDITION_FAILED", "No recording is active.");
      return { ok: true, events: [{ type: "RecordingStopped", safePayload: {} }] };

    case "SaveGuideDraft":
      if (actor.kind !== "agent" || actor.surface !== "webmcp")
        return fail("POLICY_DENIED", "Guide drafts are proposed by the agent through WebMCP.");
      if (!snapshot.recording || !["review", "draft"].includes(snapshot.recording.status))
        return fail("PRECONDITION_FAILED", "Stop and review a recording first.");
      if (!snapshot.recording.entries.length)
        return fail("PRECONDITION_FAILED", "The recording contains no accepted semantic actions.");
      return {
        ok: true,
        events: [
          {
            type: "GuideDraftSaved",
            safePayload: { title: command.title, narration: command.narration ?? "" },
          },
        ],
      };

    case "PublishGuide":
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "Guide publication is human-only.");
      if (snapshot.recording?.status !== "draft")
        return fail(
          "PRECONDITION_FAILED",
          "Review an agent-authored guide draft before publication.",
        );
      return {
        ok: true,
        events: [
          {
            type: "GuidePublished",
            safePayload: { guideId: `guide-${crypto.randomUUID().slice(0, 8)}` },
          },
        ],
      };
  }
}
