import type { JourneySnapshot } from "./types";
import { DEMO_RECEIPT } from "./fixtures";

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
      receiptId: DEMO_RECEIPT.id,
      merchant: DEMO_RECEIPT.merchant,
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
