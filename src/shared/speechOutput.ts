import type { JourneySnapshot } from "../domain/types";

function money(value?: number) {
  return typeof value === "number" ? `$${value.toFixed(2)}` : "the displayed amount";
}

export function buildSpokenStatus(snapshot: JourneySnapshot) {
  if (snapshot.status === "repair_required") {
    const repair = snapshot.pendingRepair;
    const assessment = snapshot.healingAssessment;
    const material = (repair?.materialChanges ?? assessment?.materialChanges ?? [])
      .map((change) => `${change.requiredField}: ${change.reason}`)
      .join(" ");
    const remapCount = (repair?.safeRemaps ?? assessment?.safeRemaps ?? []).length;
    return `Portal change detected. ${remapCount} safe ${remapCount === 1 ? "remap was" : "remaps were"} found. ${material || "The path requires human review."} Agent work is paused until a person reviews the change.`;
  }

  if (snapshot.status === "awaiting_confirmation" && snapshot.pendingConfirmation) {
    const summary = snapshot.pendingConfirmation;
    if (summary.kind === "mileage")
      return `Human approval required. Mileage reimbursement from ${summary.origin} to ${summary.destination}, ${summary.distanceMiles} miles, for ${money(summary.reimbursementAmount)}. Review the visible summary before confirming.`;
    return `Human approval required. Expense for ${summary.merchant}, ${money(summary.amount)}, allocated to ${summary.project} as ${summary.category}. Review the visible summary before confirming.`;
  }

  if (snapshot.status === "paused")
    return "Journey paused. Agent work is blocked. Resume from the visible play control when you are ready.";

  if (snapshot.status === "completed")
    return "Journey complete. The submitted outcome and accepted event history are verified.";

  const current = snapshot.steps.find((step) => step.status === "current");
  if (!current) return "Start a journey to receive spoken guidance.";
  const index = snapshot.steps.findIndex((step) => step.id === current.id) + 1;
  return `Step ${index} of ${snapshot.steps.length}. ${current.title}. ${snapshot.lastGuidance?.message ?? current.description} Control is with ${current.assignedActor === "agent" ? "the agent" : "you"}.`;
}

export function speechActionLabel(snapshot: JourneySnapshot) {
  if (snapshot.status === "repair_required") return "Read repair warning aloud";
  if (snapshot.status === "awaiting_confirmation") return "Read approval summary aloud";
  return "Read current instruction aloud";
}
