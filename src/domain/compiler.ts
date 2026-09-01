import { getManifest } from "./manifests";
import { assignActor } from "./policies";
import type {
  AgencyMode,
  ExpenseProjection,
  JourneySnapshot,
  JourneyStep,
  PortalVersion,
  RepairProposal,
} from "./types";

const baseSteps: Array<[string, string, string, keyof ExpenseProjection]> = [
  ["expense.date", "Add the receipt date", "Enter yesterday’s date from the demo receipt.", "date"],
  ["expense.amount", "Add the amount", "Enter the verified $86.00 amount.", "amount"],
  [
    "expense.project",
    "Choose Project Atlas",
    "This allocation needs human judgment in With Me mode.",
    "project",
  ],
  ["expense.category", "Choose Client meal", "Classify the dinner expense.", "category"],
];

export function compileSteps(mode: AgencyMode, portalVersion: PortalVersion): JourneyStep[] {
  const manifest = getManifest(portalVersion);
  const raw = [...baseSteps];
  if (portalVersion === "expense.v2") {
    raw.push([
      "expense.businessPurpose",
      "Add business purpose",
      "Explain why the client dinner was required.",
      "businessPurpose",
    ]);
  }
  const steps: JourneyStep[] = raw.map(
    ([capabilityId, title, description, requiredField], index) => {
      const capability = manifest.capabilities.find((c) => c.id === capabilityId)!;
      return {
        id: `step-${index + 1}`,
        capabilityId,
        title,
        description,
        status: index === 0 ? "current" : "pending",
        assignedActor: assignActor(index, capability.risk, mode),
        risk: capability.risk,
        anchorKey: capability.anchorKey,
        requiredField,
      };
    },
  );
  const prepare = manifest.capabilities.find((c) => c.id === "expense.prepare")!;
  const submit = manifest.capabilities.find((c) => c.id === "expense.submit")!;
  steps.push({
    id: "step-prepare",
    capabilityId: prepare.id,
    title: prepare.title,
    description: prepare.description,
    status: "pending",
    assignedActor: assignActor(steps.length, prepare.risk, mode),
    risk: prepare.risk,
    anchorKey: prepare.anchorKey,
  });
  steps.push({
    id: "step-confirm",
    capabilityId: submit.id,
    title: submit.title,
    description: submit.description,
    status: "pending",
    assignedActor: "human",
    risk: submit.risk,
    anchorKey: submit.anchorKey,
  });
  return steps;
}

export function reassignSteps(steps: JourneyStep[], mode: AgencyMode): JourneyStep[] {
  return steps.map((step, index) => ({
    ...step,
    assignedActor: assignActor(index, step.risk, mode),
  }));
}

export function buildRepair(snapshot: JourneySnapshot, businessPurpose: string): RepairProposal {
  const businessStep: JourneyStep = {
    id: "step-business-purpose",
    capabilityId: "expense.businessPurpose",
    title: "Add business purpose",
    description: businessPurpose || "Explain why the client dinner was required.",
    status: "pending",
    assignedActor: assignActor(4, "reversible", snapshot.agencyMode),
    risk: "reversible",
    anchorKey: "expense.businessPurpose",
    requiredField: "businessPurpose",
  };
  const insertBefore = snapshot.steps.findIndex((s) => s.capabilityId === "expense.prepare");
  const steps = snapshot.steps.filter((s) => s.capabilityId !== businessStep.capabilityId);
  steps.splice(insertBefore < 0 ? steps.length : insertBefore, 0, businessStep);
  return {
    id: crypto.randomUUID(),
    fromManifest: "manifest.expense.v1",
    toManifest: "manifest.expense.v2",
    safeRemaps: [
      { capabilityId: "expense.create", from: "sidebar.newExpense", to: "header.addExpense" },
    ],
    materialChanges: [
      {
        capabilityId: "expense.businessPurpose",
        reason: "Portal v2 requires a business purpose before preparation.",
        requiredField: "businessPurpose",
      },
    ],
    proposedSteps: steps,
    status: "proposed",
  };
}
