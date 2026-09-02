import { reassignSteps } from "./compiler";
import { createInitialSnapshot } from "./initialState";
import type {
  DomainEvent,
  ExpenseField,
  JourneySnapshot,
  JourneyStep,
  RecordingEntry,
} from "./types";

function advance(steps: JourneyStep[], completedCapabilities: string[]): JourneyStep[] {
  let foundCurrent = false;
  return steps.map((step) => {
    if (completedCapabilities.includes(step.capabilityId)) return { ...step, status: "complete" };
    if (!foundCurrent && step.status !== "complete") {
      foundCurrent = true;
      return { ...step, status: "current" };
    }
    return step.status === "complete" ? step : { ...step, status: "pending" };
  });
}

function recordingEntry(event: DomainEvent, snapshot: JourneySnapshot): RecordingEntry | null {
  const map: Record<string, { capabilityId: string; title: string; risk: RecordingEntry["risk"] }> =
    {
      ExpenseDraftCreated: {
        capabilityId: "expense.readReceipt",
        title: "Read receipt and create draft",
        risk: "reversible",
      },
      ExpenseFieldUpdated: {
        capabilityId: String(event.safePayload.capabilityId ?? "expense.update"),
        title: "Update expense field",
        risk: "reversible",
      },
      ExpenseSubmissionPrepared: {
        capabilityId: "expense.prepare",
        title: "Prepare expense",
        risk: "reversible",
      },
    };
  const definition = map[event.type];
  if (!definition || snapshot.recording?.status !== "recording") return null;
  return { ...definition, actor: event.actor.kind, redactedInput: { recorded: true } };
}

export function evolve(previous: JourneySnapshot, event: DomainEvent): JourneySnapshot {
  if (event.type === "SessionReset") {
    const reset = createInitialSnapshot(previous.sessionId, event.occurredAt);
    return { ...reset, revision: event.revision, lastEventHash: event.eventHash };
  }

  let next: JourneySnapshot = {
    ...previous,
    revision: event.revision,
    lastEventHash: event.eventHash,
    updatedAt: event.occurredAt,
  };

  switch (event.type) {
    case "JourneyStarted":
      next = {
        ...next,
        source: event.safePayload.source as JourneySnapshot["source"],
        goal: String(event.safePayload.goal),
        agencyMode: event.safePayload.mode as JourneySnapshot["agencyMode"],
        status: "active",
        pausedFrom: undefined,
        steps: event.safePayload.steps as JourneyStep[],
        pendingRepair: undefined,
        pendingConfirmation: undefined,
        expense: {
          ...previous.expense,
          date: "",
          amount: null,
          project: "",
          category: "",
          businessPurpose: "",
          status: "empty",
          expenseId: undefined,
        },
      };
      break;
    case "JourneyPaused":
      next = {
        ...next,
        status: "paused",
        pausedFrom: event.safePayload.pausedFrom as "active" | "awaiting_user",
      };
      break;
    case "JourneyResumed":
      next = {
        ...next,
        status: next.pausedFrom === "awaiting_user" ? "awaiting_user" : "active",
        pausedFrom: undefined,
      };
      break;
    case "AgencyModeChanged":
      next = {
        ...next,
        agencyMode: event.safePayload.mode as JourneySnapshot["agencyMode"],
        steps: reassignSteps(next.steps, event.safePayload.mode as JourneySnapshot["agencyMode"]),
      };
      break;
    case "GuidanceShown":
      next = {
        ...next,
        status: "awaiting_user",
        lastGuidance: {
          stepId: String(event.safePayload.stepId),
          message: String(event.safePayload.message),
          anchorKey: String(event.safePayload.anchorKey || ""),
        },
      };
      break;
    case "ExpenseDraftCreated": {
      const completed = event.safePayload.completedCapabilities as string[];
      next = {
        ...next,
        status: "active",
        expense: {
          ...next.expense,
          date: String(event.safePayload.date),
          amount: Number(event.safePayload.amount),
          status: "draft",
        },
        steps: advance(next.steps, completed),
      };
      break;
    }
    case "ExpenseFieldUpdated": {
      const field = event.safePayload.field as ExpenseField;
      next = {
        ...next,
        status: "active",
        expense: { ...next.expense, [field]: event.safePayload.value, status: "draft" },
        steps: advance(next.steps, [String(event.safePayload.capabilityId)]),
      };
      break;
    }
    case "ExpenseSubmissionPrepared":
      next = {
        ...next,
        status: "awaiting_confirmation",
        expense: { ...next.expense, status: "prepared" },
        steps: advance(next.steps, ["expense.prepare"]),
        pendingConfirmation: {
          challenge: String(event.safePayload.challenge),
          expiresAt: String(event.safePayload.expiresAt),
          amount: Number(event.safePayload.amount),
          project: String(event.safePayload.project),
          category: String(event.safePayload.category),
          merchant: String(event.safePayload.merchant),
        },
      };
      break;
    case "ExpenseSubmitted":
      next = {
        ...next,
        status: "completed",
        expense: {
          ...next.expense,
          status: "submitted",
          expenseId: String(event.safePayload.expenseId),
        },
        steps: next.steps.map((step) => ({ ...step, status: "complete" })),
        pendingConfirmation: undefined,
      };
      break;
    case "PortalVersionChanged": {
      const version = event.safePayload.version as JourneySnapshot["portalVersion"];
      next = {
        ...next,
        portalVersion: version,
        capabilityManifestVersion: `manifest.${version}`,
        status: event.safePayload.requiresRepair ? "repair_required" : next.status,
        pendingRepair: undefined,
      };
      break;
    }
    case "JourneyRepairProposed":
      next = {
        ...next,
        status: "repair_required",
        pendingRepair: event.safePayload.repair as JourneySnapshot["pendingRepair"],
      };
      break;
    case "JourneyRepairApproved": {
      const steps = event.safePayload.steps as JourneyStep[];
      next = { ...next, status: "active", pendingRepair: undefined, steps: advance(steps, []) };
      break;
    }
    case "RecordingStarted":
      next = {
        ...next,
        recording: {
          status: "recording",
          startedAt: event.occurredAt,
          narration: String(event.safePayload.narration ?? ""),
          entries: [],
        },
      };
      break;
    case "RecordingStopped":
      if (next.recording) next = { ...next, recording: { ...next.recording, status: "review" } };
      break;
    case "GuideDraftSaved":
      if (next.recording)
        next = {
          ...next,
          recording: {
            ...next.recording,
            status: "draft",
            draftTitle: String(event.safePayload.title),
            narration: String(event.safePayload.narration ?? next.recording.narration),
          },
        };
      break;
    case "GuidePublished":
      if (next.recording)
        next = {
          ...next,
          recording: {
            ...next.recording,
            status: "published",
            guideId: String(event.safePayload.guideId),
          },
        };
      break;
  }

  const entry = recordingEntry(event, previous);
  if (entry && next.recording)
    next = {
      ...next,
      recording: { ...next.recording, entries: [...next.recording.entries, entry] },
    };
  return next;
}
