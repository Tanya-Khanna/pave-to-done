import type { CommandResult, JourneySnapshot } from "../domain/types";

export interface NextControlBoundary {
  actor: "human" | "agent" | "none";
  action: string;
  reason: string;
}

export function nextControlBoundary(snapshot: JourneySnapshot): NextControlBoundary {
  if (snapshot.status === "awaiting_confirmation")
    return {
      actor: "human",
      action: "review_and_confirm_in_ui",
      reason: "Final expense submission is sensitive and human-only.",
    };
  if (snapshot.status === "repair_required")
    return snapshot.pendingRepair
      ? {
          actor: "human",
          action: "review_material_repair_in_ui",
          reason: "A material workflow change requires explicit approval.",
        }
      : {
          actor: "agent",
          action: "propose_journey_repair",
          reason: "The portal changed and a bounded repair must be proposed.",
        };
  const step = snapshot.steps.find((item) => item.status === "current");
  if (step)
    return {
      actor: step.assignedActor,
      action: step.capabilityId,
      reason: `${step.title} is the current ${step.risk} step.`,
    };
  return {
    actor: "none",
    action: snapshot.status === "completed" ? "journey_complete" : "start_journey",
    reason:
      snapshot.status === "completed"
        ? "The accepted event chain reached the verified outcome."
        : "No journey is active.",
  };
}

function safeSummary(snapshot: JourneySnapshot) {
  const step = snapshot.steps.find((item) => item.status === "current");
  return {
    journeyStatus: snapshot.status,
    mode: snapshot.agencyMode,
    portalVersion: snapshot.portalVersion,
    currentRevision: snapshot.revision,
    expense: {
      date: snapshot.expense.date || null,
      amount: snapshot.expense.amount,
      project: snapshot.expense.project || null,
      category: snapshot.expense.category || null,
      businessPurpose: snapshot.expense.businessPurpose || null,
      status: snapshot.expense.status,
    },
    currentStep: step
      ? {
          capabilityId: step.capabilityId,
          title: step.title,
          assignedActor: step.assignedActor,
          risk: step.risk,
        }
      : null,
    needsHuman: ["awaiting_confirmation", "repair_required"].includes(snapshot.status),
    historyVerified: snapshot.historyVerified,
  };
}

export function readResult(
  summary: string,
  snapshot: JourneySnapshot,
  extra: Record<string, unknown> = {},
) {
  return {
    content: [{ type: "text", text: summary }],
    structuredContent: {
      ok: true,
      status: "ok",
      operationId: null,
      revision: snapshot.revision,
      sentRevision: null,
      resultingRevision: snapshot.revision,
      changed: false,
      summary,
      next: nextControlBoundary(snapshot),
      ...safeSummary(snapshot),
      data: extra,
    },
  };
}

export function commandResult(summary: string, result: CommandResult) {
  if (!result.ok) {
    const status =
      result.error.code === "STALE_REVISION"
        ? "refresh"
        : ["AWAITING_HUMAN", "REPAIR_REQUIRED", "POLICY_DENIED"].includes(result.error.code)
          ? "needs_human"
          : "blocked";
    return {
      content: [{ type: "text", text: `${result.error.code}: ${result.error.message}` }],
      structuredContent: {
        ok: false,
        status,
        operationId: result.operationId,
        revision: result.revision,
        sentRevision: result.sentRevision ?? null,
        resultingRevision: result.revision,
        changed: false,
        summary: result.error.message,
        next: nextControlBoundary(result.snapshot),
        error: {
          code: result.error.code,
          message: result.error.message,
          retryable: result.error.retryable,
          currentRevision: result.snapshot.revision,
        },
        reconciled: result.reconciled ?? false,
        ...safeSummary(result.snapshot),
      },
    };
  }
  const needsHuman = ["awaiting_confirmation", "repair_required"].includes(result.snapshot.status);
  return {
    content: [{ type: "text", text: summary }],
    structuredContent: {
      ok: true,
      status: needsHuman ? "needs_human" : "ok",
      revision: result.revision,
      sentRevision: result.sentRevision ?? null,
      resultingRevision: result.revision,
      changed: result.events.length > 0 && !result.deduplicated,
      summary,
      operationId: result.operationId,
      next: nextControlBoundary(result.snapshot),
      reconciled: result.reconciled ?? false,
      deduplicated: result.deduplicated,
      ...safeSummary(result.snapshot),
    },
  };
}
