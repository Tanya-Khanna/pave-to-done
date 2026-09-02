import { getManifest } from "./manifests";
import { assignActor } from "./policies";
import { DEMO_CATEGORIES, DEMO_MILEAGE, DEMO_PROJECTS, DEMO_RECEIPT } from "./fixtures";
import type {
  AgencyMode,
  CapabilityManifest,
  ExpenseProjection,
  JourneyStep,
  MileageProjection,
  PortalVersion,
} from "./types";

const baseSteps: Array<[string, string, string, keyof ExpenseProjection]> = [
  [
    "expense.date",
    "Add the receipt date",
    `Enter ${DEMO_RECEIPT.displayDate} from the demo receipt.`,
    "date",
  ],
  [
    "expense.amount",
    "Add the amount",
    `Enter the verified $${DEMO_RECEIPT.amount.toFixed(2)} amount.`,
    "amount",
  ],
  [
    "expense.project",
    `Choose ${DEMO_PROJECTS[0]}`,
    "This allocation needs human judgment in With Me mode.",
    "project",
  ],
  ["expense.category", `Choose ${DEMO_CATEGORIES[0]}`, "Classify the dinner expense.", "category"],
];

export function compileSteps(mode: AgencyMode, portalVersion: PortalVersion): JourneyStep[] {
  if (portalVersion.startsWith("mileage.")) return compileMileageSteps(mode, portalVersion);
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

function compileMileageSteps(mode: AgencyMode, portalVersion: PortalVersion): JourneyStep[] {
  const manifest = getManifest(portalVersion);
  const raw: Array<[string, string, string, keyof MileageProjection]> = [
    ["mileage.origin", "Set starting point", `Use ${DEMO_MILEAGE.origin}.`, "origin"],
    ["mileage.destination", "Set destination", `Use ${DEMO_MILEAGE.destination}.`, "destination"],
    [
      "mileage.distance",
      "Set trip distance",
      `Enter the verified ${DEMO_MILEAGE.distanceMiles} miles.`,
      "distanceMiles",
    ],
    ["mileage.date", "Set trip date", `Use ${DEMO_MILEAGE.displayDate}.`, "tripDate"],
    ["mileage.purpose", "Add trip purpose", DEMO_MILEAGE.purpose, "purpose"],
  ];
  if (portalVersion === "mileage.v2")
    raw.push([
      "mileage.vehicleType",
      "Choose vehicle type",
      `Use ${DEMO_MILEAGE.vehicleType}.`,
      "vehicleType",
    ]);
  const steps: JourneyStep[] = raw.map(
    ([capabilityId, title, description, mileageRequiredField], index) => {
      const capability = manifest.capabilities.find((candidate) => candidate.id === capabilityId)!;
      return {
        id: `mileage-step-${index + 1}`,
        capabilityId,
        title,
        description,
        status: index === 0 ? ("current" as const) : ("pending" as const),
        assignedActor: assignActor(index, capability.risk, mode),
        risk: capability.risk,
        anchorKey: capability.anchorKey,
        mileageRequiredField,
      };
    },
  );
  const prepare = manifest.capabilities.find((capability) => capability.id === "mileage.prepare")!;
  const submit = manifest.capabilities.find((capability) => capability.id === "mileage.submit")!;
  steps.push({
    id: "mileage-step-prepare",
    capabilityId: prepare.id,
    title: prepare.title,
    description: prepare.description,
    status: "pending",
    assignedActor: assignActor(steps.length, prepare.risk, mode),
    risk: prepare.risk,
    anchorKey: prepare.anchorKey,
  });
  steps.push({
    id: "mileage-step-confirm",
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

export function validateJourneyPlan(steps: JourneyStep[], manifest: CapabilityManifest) {
  const seen = new Set<string>();
  for (const step of steps) {
    const capability = manifest.capabilities.find(
      (candidate) => candidate.id === step.capabilityId,
    );
    if (!capability)
      return { ok: false as const, reason: `Unknown capability ${step.capabilityId}.` };
    if (seen.has(step.capabilityId))
      return { ok: false as const, reason: `Duplicate capability ${step.capabilityId}.` };
    if (
      step.risk !== capability.risk ||
      step.anchorKey !== capability.anchorKey ||
      step.requiredField !== capability.requiredField ||
      step.mileageRequiredField !== capability.mileageRequiredField
    )
      return { ok: false as const, reason: `Plan metadata drifted for ${step.capabilityId}.` };
    if (step.assignedActor === "agent" && !capability.allowedActors.includes("agent"))
      return { ok: false as const, reason: `${step.capabilityId} is not agent eligible.` };
    seen.add(step.capabilityId);
  }
  return { ok: true as const };
}

export function reassignSteps(steps: JourneyStep[], mode: AgencyMode): JourneyStep[] {
  return steps.map((step, index) => ({
    ...step,
    assignedActor: assignActor(index, step.risk, mode),
  }));
}
