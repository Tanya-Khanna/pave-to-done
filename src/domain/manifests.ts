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

export function getManifest(version: PortalVersion): CapabilityManifest {
  return version === "expense.v2" ? portalV2Manifest : portalV1Manifest;
}

export function getCapability(version: PortalVersion, capabilityId: string) {
  return getManifest(version).capabilities.find((capability) => capability.id === capabilityId);
}
