import { reassignSteps } from "./compiler";
import { createInitialSnapshot } from "./initialState";
import { getManifest } from "./manifests";
import type {
  DomainEvent,
  ExpenseField,
  Guide,
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

function observedState(snapshot: JourneySnapshot, capabilityId: string) {
  const capability = getManifest(snapshot.portalVersion).capabilities.find(
    (candidate) => candidate.id === capabilityId,
  );
  const value = capability?.requiredField ? snapshot.expense[capability.requiredField] : undefined;
  const outcomeSatisfied =
    typeof value === "number" ? Number.isFinite(value) && value > 0 : Boolean(value);
  return {
    outcomeSatisfied:
      capabilityId === "expense.prepare"
        ? ["prepared", "submitted"].includes(snapshot.expense.status)
        : capabilityId === "expense.submit"
          ? snapshot.expense.status === "submitted"
          : outcomeSatisfied,
    expenseStatus: snapshot.expense.status,
    stepComplete: snapshot.steps.some(
      (step) => step.capabilityId === capabilityId && step.status === "complete",
    ),
  };
}

function recordingEntry(
  event: DomainEvent,
  before: JourneySnapshot,
  after: JourneySnapshot,
): RecordingEntry | null {
  if (before.recording?.status !== "recording") return null;
  const capabilityId =
    event.type === "ExpenseDraftCreated"
      ? "expense.readReceipt"
      : event.type === "ExpenseFieldUpdated"
        ? String(event.safePayload.capabilityId ?? "")
        : event.type === "ExpenseSubmissionPrepared"
          ? "expense.prepare"
          : event.type === "ExpenseSubmitted"
            ? "expense.submit"
            : "";
  if (!capabilityId) return null;
  const capability = getManifest(after.portalVersion).capabilities.find(
    (candidate) => candidate.id === capabilityId,
  );
  if (!capability) return null;
  const redactedInput =
    event.type === "ExpenseFieldUpdated"
      ? { field: String(event.safePayload.field), value: "[REDACTED]" }
      : event.type === "ExpenseSubmissionPrepared"
        ? { confirmation: "[REDACTED]" }
        : event.type === "ExpenseSubmitted"
          ? { result: "[REDACTED]" }
          : { receiptFacts: "[REDACTED]" };
  return {
    sequence: before.recording.entries.length + 1,
    capabilityId,
    title: capability.title,
    actor: event.actor.kind,
    risk: capability.risk,
    redactedInput,
    before: observedState(before, capabilityId),
    after: observedState(after, capabilityId),
    portalVersion: after.portalVersion,
    manifestVersion: after.capabilityManifestVersion,
    anchorKey: capability.anchorKey,
  };
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
        healingAssessment: undefined,
        blockedReason: undefined,
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
      const assessment = event.safePayload.assessment as JourneySnapshot["healingAssessment"];
      const proposedSteps = event.safePayload.steps as JourneyStep[] | undefined;
      const applyAutomatically =
        !event.safePayload.requiresRepair && !event.safePayload.blocked && proposedSteps?.length;
      const nextSteps = applyAutomatically ? proposedSteps : next.steps;
      const guided = next.lastGuidance
        ? nextSteps.find((step) => step.id === next.lastGuidance?.stepId)
        : undefined;
      next = {
        ...next,
        portalVersion: version,
        capabilityManifestVersion: assessment?.toManifest ?? `manifest.${version}`,
        status: event.safePayload.blocked
          ? "blocked"
          : event.safePayload.requiresRepair
            ? "repair_required"
            : next.status,
        steps: nextSteps,
        healingAssessment: assessment,
        blockedReason: event.safePayload.blocked
          ? (assessment?.blockedReasons[0] ?? "The portal change cannot be repaired safely.")
          : undefined,
        lastGuidance:
          guided && next.lastGuidance
            ? { ...next.lastGuidance, anchorKey: guided.anchorKey }
            : next.lastGuidance,
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
      const advanced = advance(steps, []);
      const guided = next.lastGuidance
        ? advanced.find((step) => step.id === next.lastGuidance?.stepId)
        : undefined;
      next = {
        ...next,
        status: "active",
        pendingRepair: undefined,
        healingAssessment: undefined,
        blockedReason: undefined,
        steps: advanced,
        lastGuidance:
          guided && next.lastGuidance
            ? { ...next.lastGuidance, anchorKey: guided.anchorKey }
            : next.lastGuidance,
      };
      break;
    }
    case "JourneyRepairRejected":
      next = {
        ...next,
        status: "blocked",
        pendingRepair: undefined,
        blockedReason: String(event.safePayload.reason),
      };
      break;
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
      if (next.recording) {
        const guide = event.safePayload.guide as Guide;
        next = {
          ...next,
          recording: {
            ...next.recording,
            status: "draft",
            draftTitle: guide.title,
            draft: guide,
            draftOrigin: event.safePayload.origin as "agent" | "deterministic",
          },
        };
      }
      break;
    case "RecordingNarrationUpdated":
      if (next.recording)
        next = {
          ...next,
          recording: {
            ...next.recording,
            entries: next.recording.entries.map((entry) =>
              entry.sequence === Number(event.safePayload.sequence)
                ? { ...entry, narration: String(event.safePayload.narration) }
                : entry,
            ),
          },
        };
      break;
    case "GuidePublished":
      if (next.recording) {
        const guide = event.safePayload.guide as Guide;
        next = {
          ...next,
          recording: {
            ...next.recording,
            status: "published",
            guideId: guide.id,
            publishedGuide: guide,
          },
        };
      }
      break;
  }

  const entry = recordingEntry(event, previous, next);
  if (entry && next.recording)
    next = {
      ...next,
      recording: { ...next.recording, entries: [...next.recording.entries, entry] },
    };
  return next;
}
