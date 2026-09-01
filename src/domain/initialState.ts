import type { JourneySnapshot } from "./types";

export function createInitialSnapshot(
  sessionId: string,
  now = new Date().toISOString(),
): JourneySnapshot {
  return {
    sessionId,
    revision: 0,
    portalVersion: "expense.v1",
    capabilityManifestVersion: "manifest.expense.v1",
    source: null,
    goal: "",
    agencyMode: "show",
    status: "idle",
    steps: [],
    expense: {
      receiptId: "receipt-demo-86",
      merchant: "Juniper & Co.",
      date: "",
      amount: null,
      project: "",
      category: "",
      businessPurpose: "",
      status: "empty",
    },
    lastEventHash: "GENESIS",
    historyVerified: true,
    updatedAt: now,
  };
}
