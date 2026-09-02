import type { CapabilityDefinition, CapabilityManifest, PortalVersion } from "./types";

const shared: CapabilityDefinition[] = [
  {
    id: "expense.readReceipt",
    version: "1",
    title: "Read receipt",
    description: "Inspect the bounded demo receipt facts.",
    risk: "read",
    allowedActors: ["human", "agent"],
  },
  {
    id: "expense.date",
    version: "1",
    title: "Set expense date",
    description: "Set the receipt date.",
    risk: "reversible",
    allowedActors: ["human", "agent"],
    requiredField: "date",
    anchorKey: "expense.date",
  },
  {
    id: "expense.amount",
    version: "1",
    title: "Set amount",
    description: "Set the receipt amount.",
    risk: "reversible",
    allowedActors: ["human", "agent"],
    requiredField: "amount",
    anchorKey: "expense.amount",
  },
  {
    id: "expense.project",
    version: "1",
    title: "Choose project",
    description: "Allocate the expense to a project.",
    risk: "reversible",
    allowedActors: ["human", "agent"],
    requiredField: "project",
    anchorKey: "expense.project",
  },
  {
    id: "expense.category",
    version: "1",
    title: "Choose category",
    description: "Classify the expense.",
    risk: "reversible",
    allowedActors: ["human", "agent"],
    requiredField: "category",
    anchorKey: "expense.category",
  },
  {
    id: "expense.prepare",
    version: "1",
    title: "Prepare submission",
    description: "Validate the draft and create a visible confirmation.",
    risk: "reversible",
    allowedActors: ["human", "agent"],
    anchorKey: "expense.review",
  },
  {
    id: "expense.submit",
    version: "1",
    title: "Submit expense",
    description: "Create the final expense record.",
    risk: "sensitive",
    allowedActors: ["human"],
    anchorKey: "expense.confirm",
  },
];

export const portalV1Manifest: CapabilityManifest = {
  version: "manifest.expense.v1",
  portalVersion: "expense.v1",
  capabilities: [
    {
      id: "expense.create",
      version: "1",
      title: "New expense",
      description: "Open the expense form.",
      risk: "reversible",
      allowedActors: ["human", "agent"],
      anchorKey: "sidebar.newExpense",
      aliases: ["new expense"],
    },
    ...shared,
  ],
};

export const portalV2Manifest: CapabilityManifest = {
  version: "manifest.expense.v2",
  portalVersion: "expense.v2",
  capabilities: (() => {
    const current = shared.map((capability) => ({ ...capability, version: "2" }));
    current.splice(5, 0, {
      id: "expense.businessPurpose",
      version: "2",
      title: "Add business purpose",
      description: "Explain the business purpose required by policy.",
      risk: "reversible",
      allowedActors: ["human", "agent"],
      requiredField: "businessPurpose",
      anchorKey: "expense.businessPurpose",
    });
    return [
      {
        id: "expense.create",
        version: "2",
        title: "Add expense",
        description: "Open the expense form from the header.",
        risk: "reversible" as const,
        allowedActors: ["human", "agent"] as const,
        anchorKey: "header.addExpense",
        aliases: ["new expense", "add expense"],
      },
      ...current,
    ];
  })(),
};

const mileageShared: CapabilityDefinition[] = [
  {
    id: "mileage.origin",
    version: "1",
    title: "Set starting point",
    description: "Choose where the reimbursable trip began.",
    risk: "reversible",
    allowedActors: ["human", "agent"],
    mileageRequiredField: "origin",
    anchorKey: "mileage.origin",
  },
  {
    id: "mileage.destination",
    version: "1",
    title: "Set destination",
    description: "Choose where the reimbursable trip ended.",
    risk: "reversible",
    allowedActors: ["human", "agent"],
    mileageRequiredField: "destination",
    anchorKey: "mileage.destination",
  },
  {
    id: "mileage.distance",
    version: "1",
    title: "Set trip distance",
    description: "Enter the bounded route distance in miles.",
    risk: "reversible",
    allowedActors: ["human", "agent"],
    mileageRequiredField: "distanceMiles",
    anchorKey: "mileage.distance",
    aliases: ["trip distance"],
  },
  {
    id: "mileage.date",
    version: "1",
    title: "Set trip date",
    description: "Enter the date of travel.",
    risk: "reversible",
    allowedActors: ["human", "agent"],
    mileageRequiredField: "tripDate",
    anchorKey: "mileage.date",
  },
  {
    id: "mileage.purpose",
    version: "1",
    title: "Add trip purpose",
    description: "Explain the business reason for the trip.",
    risk: "reversible",
    allowedActors: ["human", "agent"],
    mileageRequiredField: "purpose",
    anchorKey: "mileage.purpose",
  },
  {
    id: "mileage.prepare",
    version: "1",
    title: "Prepare reimbursement",
    description: "Validate mileage details and calculate a reviewable reimbursement.",
    risk: "reversible",
    allowedActors: ["human", "agent"],
    anchorKey: "mileage.review",
  },
  {
    id: "mileage.submit",
    version: "1",
    title: "Submit reimbursement",
    description: "Create the final mileage reimbursement.",
    risk: "sensitive",
    allowedActors: ["human"],
    anchorKey: "mileage.confirm",
  },
];

export const mileageV1Manifest: CapabilityManifest = {
  version: "manifest.mileage.v1",
  portalVersion: "mileage.v1",
  capabilities: mileageShared,
};

export const mileageV2Manifest: CapabilityManifest = {
  version: "manifest.mileage.v2",
  portalVersion: "mileage.v2",
  capabilities: (() => {
    const current = mileageShared.map((capability) => ({ ...capability, version: "2" }));
    const distance = current.find((capability) => capability.id === "mileage.distance")!;
    distance.anchorKey = "mileage.routeDistance";
    current.splice(5, 0, {
      id: "mileage.vehicleType",
      version: "2",
      title: "Choose vehicle type",
      description: "Choose the policy category used for reimbursement.",
      risk: "reversible",
      allowedActors: ["human", "agent"],
      mileageRequiredField: "vehicleType",
      anchorKey: "mileage.vehicleType",
    });
    return current;
  })(),
};

export function getManifest(version: PortalVersion): CapabilityManifest {
  if (version === "expense.v2") return portalV2Manifest;
  if (version === "mileage.v1") return mileageV1Manifest;
  if (version === "mileage.v2") return mileageV2Manifest;
  return portalV1Manifest;
}

export function getCapability(version: PortalVersion, capabilityId: string) {
  return getManifest(version).capabilities.find((capability) => capability.id === capabilityId);
}
