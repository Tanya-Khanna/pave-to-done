import { assignActor } from "./policies";
import type {
  AgencyMode,
  CapabilityDefinition,
  CapabilityManifest,
  CapabilityRisk,
  HealingAssessment,
  HealingDisposition,
  JourneySnapshot,
  JourneyStep,
  Repair,
} from "./types";

const riskRank: Record<CapabilityRisk, number> = {
  read: 0,
  guidance: 1,
  reversible: 2,
  sensitive: 3,
};

function intersects(first: readonly string[] = [], second: readonly string[] = []) {
  const values = new Set(first.map((value) => value.toLowerCase()));
  return second.some((value) => values.has(value.toLowerCase()));
}

function resolveCapability(
  source: CapabilityDefinition | undefined,
  current: CapabilityManifest,
): CapabilityDefinition | undefined {
  if (!source) return undefined;
  return (
    current.capabilities.find((capability) => capability.id === source.id) ??
    current.capabilities.find(
      (capability) => source.anchorKey && capability.anchorKey === source.anchorKey,
    ) ??
    current.capabilities.find((capability) => intersects(source.aliases, capability.aliases))
  );
}

function expenseFieldSatisfied(
  snapshot: JourneySnapshot,
  field?: keyof JourneySnapshot["expense"],
) {
  if (!field) return false;
  const value = snapshot.expense[field];
  return typeof value === "number" ? Number.isFinite(value) && value > 0 : Boolean(value);
}

function mileageFieldSatisfied(
  snapshot: JourneySnapshot,
  field?: keyof JourneySnapshot["mileage"],
) {
  if (!field) return false;
  const value = snapshot.mileage[field];
  return typeof value === "number" ? Number.isFinite(value) && value > 0 : Boolean(value);
}

function outcomeSatisfied(snapshot: JourneySnapshot, capability: CapabilityDefinition) {
  return (
    expenseFieldSatisfied(snapshot, capability.requiredField) ||
    mileageFieldSatisfied(snapshot, capability.mileageRequiredField)
  );
}

function stepSatisfied(
  snapshot: JourneySnapshot,
  step: JourneyStep,
  capability: CapabilityDefinition,
) {
  if (
    outcomeSatisfied(snapshot, capability) ||
    expenseFieldSatisfied(snapshot, step.requiredField) ||
    mileageFieldSatisfied(snapshot, step.mileageRequiredField)
  )
    return true;
  if (capability.id === "expense.prepare")
    return ["prepared", "submitted"].includes(snapshot.expense.status);
  if (capability.id === "expense.submit") return snapshot.expense.status === "submitted";
  if (capability.id === "mileage.prepare")
    return ["prepared", "submitted"].includes(snapshot.mileage.status);
  if (capability.id === "mileage.submit") return snapshot.mileage.status === "submitted";
  return step.status === "complete";
}

function normalizeSteps(steps: JourneyStep[]) {
  let currentAssigned = false;
  return steps.map((step) => {
    if (step.status === "complete") return step;
    if (!currentAssigned) {
      currentAssigned = true;
      return { ...step, status: "current" as const };
    }
    return { ...step, status: "pending" as const };
  });
}

function overallDisposition(dispositions: HealingDisposition[]): HealingDisposition {
  if (dispositions.includes("blocked")) return "blocked";
  if (dispositions.includes("repair_required")) return "repair_required";
  if (dispositions.includes("remapped")) return "remapped";
  return "compatible";
}

function assignPermittedActor(index: number, capability: CapabilityDefinition, mode: AgencyMode) {
  const assigned = assignActor(index, capability.risk, mode);
  return assigned === "agent" && !capability.allowedActors.includes("agent") ? "human" : assigned;
}

export function compileHealing(input: {
  snapshot: JourneySnapshot;
  sourceManifest: CapabilityManifest;
  currentManifest: CapabilityManifest;
  mode?: AgencyMode;
  requirementDescriptions?: Record<string, string>;
}): HealingAssessment {
  const { snapshot, sourceManifest, currentManifest } = input;
  const mode = input.mode ?? snapshot.agencyMode;
  const classifications: HealingAssessment["classifications"] = [];
  const safeRemaps: HealingAssessment["safeRemaps"] = [];
  const materialChanges: HealingAssessment["materialChanges"] = [];
  const blockedReasons: string[] = [];
  const proposedSteps: JourneyStep[] = [];

  for (const [index, step] of snapshot.steps.entries()) {
    const source = sourceManifest.capabilities.find(
      (capability) => capability.id === step.capabilityId,
    );
    const current = resolveCapability(source, currentManifest);
    let disposition: HealingDisposition = "compatible";
    let reason = "Capability semantics and authority are unchanged.";

    if (!source || !current) {
      disposition = "blocked";
      reason = `Capability ${step.capabilityId} was removed or cannot be resolved unambiguously.`;
      blockedReasons.push(reason);
    } else if (riskRank[current.risk] > riskRank[source.risk]) {
      disposition = "blocked";
      reason = `${step.capabilityId} increased risk from ${source.risk} to ${current.risk}.`;
      blockedReasons.push(reason);
    } else if (riskRank[current.risk] < riskRank[source.risk]) {
      disposition = "blocked";
      reason = `${step.capabilityId} changed risk from ${source.risk} to ${current.risk}; risk downgrades are never inferred.`;
      blockedReasons.push(reason);
    } else if (current.allowedActors.includes("agent") && !source.allowedActors.includes("agent")) {
      disposition = "blocked";
      reason = `${step.capabilityId} would expand agent authority.`;
      blockedReasons.push(reason);
    } else if (
      source.requiredField !== current.requiredField ||
      source.mileageRequiredField !== current.mileageRequiredField
    ) {
      disposition = "repair_required";
      reason = `${step.capabilityId} changed its required outcome.`;
      materialChanges.push({
        capabilityId: current.id,
        reason,
        requiredField: String(
          current.requiredField ??
            current.mileageRequiredField ??
            source.requiredField ??
            source.mileageRequiredField ??
            "unknown",
        ),
      });
    } else if (source.id !== current.id || source.anchorKey !== current.anchorKey) {
      disposition = "remapped";
      reason = `${source.id} resolves safely to ${current.id} at its current semantic anchor.`;
      safeRemaps.push({
        capabilityId: current.id,
        fromCapabilityId: source.id,
        toCapabilityId: current.id,
        from: source.anchorKey ?? "semantic action",
        to: current.anchorKey ?? "semantic action",
      });
    }

    const satisfied = Boolean(current && stepSatisfied(snapshot, step, current));
    classifications.push({
      stepId: step.id,
      fromCapabilityId: step.capabilityId,
      toCapabilityId: current?.id,
      disposition,
      reason,
      satisfied,
      fromRisk: source?.risk ?? step.risk,
      toRisk: current?.risk,
      fromAgentEligible: source?.allowedActors.includes("agent") ?? false,
      toAgentEligible: current?.allowedActors.includes("agent"),
      fromAnchor: source?.anchorKey ?? step.anchorKey,
      toAnchor: current?.anchorKey,
    });

    if (current && disposition !== "blocked") {
      proposedSteps.push({
        ...step,
        capabilityId: current.id,
        title: current.title,
        description: current.description,
        status: satisfied ? "complete" : step.status,
        assignedActor: satisfied ? step.assignedActor : assignPermittedActor(index, current, mode),
        risk: current.risk,
        anchorKey: current.anchorKey,
        requiredField: current.requiredField,
        mileageRequiredField: current.mileageRequiredField,
      });
    }
  }

  const resolvedTargetIds = new Set(
    sourceManifest.capabilities
      .map((source) => resolveCapability(source, currentManifest)?.id)
      .filter((value): value is string => Boolean(value)),
  );
  for (const capability of currentManifest.capabilities) {
    const requiredField = capability.requiredField ?? capability.mileageRequiredField;
    if (!requiredField || resolvedTargetIds.has(capability.id)) continue;
    const satisfied = outcomeSatisfied(snapshot, capability);
    const disposition: HealingDisposition = satisfied ? "compatible" : "repair_required";
    const reason = satisfied
      ? `${capability.id} is new, but its required outcome is already satisfied.`
      : `${capability.id} is a new required outcome in ${currentManifest.version}.`;
    classifications.push({
      stepId: `new-${capability.id}`,
      fromCapabilityId: capability.id,
      toCapabilityId: capability.id,
      disposition,
      reason,
      satisfied,
      fromRisk: capability.risk,
      toRisk: capability.risk,
      fromAgentEligible: false,
      toAgentEligible: capability.allowedActors.includes("agent"),
      toAnchor: capability.anchorKey,
    });
    if (satisfied) continue;
    materialChanges.push({
      capabilityId: capability.id,
      reason,
      requiredField,
    });
    const targetOrder = currentManifest.capabilities.findIndex((item) => item.id === capability.id);
    const insertion = proposedSteps.findIndex((step) => {
      const stepOrder = currentManifest.capabilities.findIndex(
        (item) => item.id === step.capabilityId,
      );
      return stepOrder > targetOrder;
    });
    proposedSteps.splice(insertion < 0 ? proposedSteps.length : insertion, 0, {
      id: `step-${capability.id.replaceAll(".", "-")}`,
      capabilityId: capability.id,
      title: capability.title,
      description: input.requirementDescriptions?.[requiredField] ?? capability.description,
      status: "pending",
      assignedActor: assignPermittedActor(Math.max(0, insertion), capability, mode),
      risk: capability.risk,
      anchorKey: capability.anchorKey,
      requiredField: capability.requiredField,
      mileageRequiredField: capability.mileageRequiredField,
    });
  }

  for (const source of sourceManifest.capabilities) {
    const current = resolveCapability(source, currentManifest);
    if (
      !current ||
      source.risk !== current.risk ||
      source.anchorKey === current.anchorKey ||
      safeRemaps.some((remap) => remap.fromCapabilityId === source.id)
    )
      continue;
    safeRemaps.push({
      capabilityId: current.id,
      fromCapabilityId: source.id,
      toCapabilityId: current.id,
      from: source.anchorKey ?? "semantic action",
      to: current.anchorKey ?? "semantic action",
    });
  }

  return {
    fromManifest: sourceManifest.version,
    toManifest: currentManifest.version,
    overall: overallDisposition(
      classifications.map((classification) => classification.disposition),
    ),
    classifications,
    safeRemaps,
    materialChanges,
    blockedReasons,
    proposedSteps: normalizeSteps(proposedSteps),
  };
}

export function createRepair(snapshot: JourneySnapshot, assessment: HealingAssessment): Repair {
  return {
    id: crypto.randomUUID(),
    sessionId: snapshot.sessionId,
    basedOnRevision: snapshot.revision,
    fromManifest: assessment.fromManifest,
    toManifest: assessment.toManifest,
    safeRemaps: assessment.safeRemaps,
    materialChanges: assessment.materialChanges,
    classifications: assessment.classifications,
    proposedSteps: assessment.proposedSteps,
    status: "proposed",
  };
}

export function validateRepair(snapshot: JourneySnapshot, repair: Repair) {
  const assessment = snapshot.healingAssessment;
  const reject = (reason: string) => ({ ok: false as const, reason });
  if (!assessment) return reject("No current healing assessment exists.");
  if (snapshot.pendingConfirmation)
    return reject("A repair cannot bypass a pending human confirmation.");
  if (repair.sessionId !== snapshot.sessionId) return reject("Repair targets a different session.");
  if (repair.basedOnRevision !== snapshot.revision - 1)
    return reject("Repair is not based on the immediately preceding verified revision.");
  if (
    repair.fromManifest !== assessment.fromManifest ||
    repair.toManifest !== snapshot.capabilityManifestVersion ||
    repair.toManifest !== assessment.toManifest
  )
    return reject("Repair targets a stale or different capability manifest.");
  if (assessment.overall !== "repair_required")
    return reject("Only a material, non-blocked assessment can be approved.");
  if (
    JSON.stringify(repair.safeRemaps) !== JSON.stringify(assessment.safeRemaps) ||
    JSON.stringify(repair.materialChanges) !== JSON.stringify(assessment.materialChanges) ||
    JSON.stringify(repair.classifications) !== JSON.stringify(assessment.classifications)
  )
    return reject("Repair metadata does not match the server-generated assessment.");

  const currentManifestIds = new Set(
    assessment.classifications.map((item) => item.toCapabilityId).filter(Boolean),
  );
  const proposedIds = new Set(repair.proposedSteps.map((step) => step.capabilityId));
  for (const step of repair.proposedSteps) {
    if (!currentManifestIds.has(step.capabilityId))
      return reject(`Repair references unknown capability ${step.capabilityId}.`);
    const classification = assessment.classifications.find(
      (item) => item.toCapabilityId === step.capabilityId,
    );
    if (!classification || step.risk !== classification.toRisk)
      return reject(`Repair changes the validated risk for ${step.capabilityId}.`);
    if (step.assignedActor === "agent" && !classification.toAgentEligible)
      return reject(`Repair assigns agent-ineligible capability ${step.capabilityId} to an agent.`);
    if (
      step.assignedActor === "agent" &&
      (step.risk === "sensitive" ||
        assignActor(repair.proposedSteps.indexOf(step), step.risk, snapshot.agencyMode) !== "agent")
    )
      return reject(`Repair expands agent authority for ${step.capabilityId}.`);
  }
  for (const original of snapshot.steps) {
    const mapped = assessment.classifications.find((item) => item.stepId === original.id);
    if (!mapped?.toCapabilityId || !proposedIds.has(mapped.toCapabilityId))
      return reject(`Repair removes required outcome ${original.capabilityId}.`);
    if (original.status === "complete") {
      const proposed = repair.proposedSteps.find((step) => step.id === original.id);
      if (!proposed || proposed.status !== "complete" || proposed.risk !== original.risk)
        return reject(`Repair modifies completed step ${original.capabilityId}.`);
    }
  }
  for (const material of assessment.materialChanges) {
    if (!proposedIds.has(material.capabilityId))
      return reject(`Repair removes new required outcome ${material.capabilityId}.`);
  }
  return { ok: true as const };
}
