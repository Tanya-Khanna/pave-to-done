import type { CommandResult, JourneySnapshot } from "../domain/types";

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
      status: "ok",
      revision: snapshot.revision,
      summary,
      ...safeSummary(snapshot),
      ...extra,
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
        status,
        revision: result.revision,
        summary: result.error.message,
        error: { code: result.error.code, retryable: result.error.retryable },
        ...safeSummary(result.snapshot),
      },
    };
  }
  const needsHuman = ["awaiting_confirmation", "repair_required"].includes(result.snapshot.status);
  return {
    content: [{ type: "text", text: summary }],
    structuredContent: {
      status: needsHuman ? "needs_human" : "ok",
      revision: result.revision,
      summary,
      operationId: result.operationId,
      deduplicated: result.deduplicated,
      ...safeSummary(result.snapshot),
    },
  };
}
