import { describe, expect, it } from "vitest";
import { compileSteps } from "../domain/compiler";
import { createInitialSnapshot } from "../domain/initialState";
import type { JourneySnapshot } from "../domain/types";
import { buildSpokenStatus, speechActionLabel } from "../shared/speechOutput";

function activeMileage(): JourneySnapshot {
  return {
    ...createInitialSnapshot("speech"),
    portalVersion: "mileage.v1",
    capabilityManifestVersion: "manifest.mileage.v1",
    status: "active",
    source: { kind: "on-demand", goal: "Create mileage reimbursement" },
    goal: "Create mileage reimbursement",
    steps: compileSteps("show", "mileage.v1"),
  };
}

describe("spoken journey status", () => {
  it("describes the current instruction and control owner", () => {
    const spoken = buildSpokenStatus(activeMileage());
    expect(spoken).toContain("Step 1 of 7");
    expect(spoken).toContain("Set starting point");
    expect(spoken).toContain("Control is with you");
  });

  it("describes repair warnings without exposing a confirmation challenge", () => {
    const snapshot = {
      ...activeMileage(),
      status: "repair_required" as const,
      healingAssessment: {
        fromManifest: "manifest.mileage.v1",
        toManifest: "manifest.mileage.v2",
        overall: "repair_required" as const,
        classifications: [],
        safeRemaps: [
          {
            capabilityId: "mileage.distance",
            from: "mileage.distance",
            to: "mileage.routeDistance",
          },
        ],
        materialChanges: [
          {
            capabilityId: "mileage.vehicleType",
            requiredField: "vehicleType",
            reason: "Vehicle type is newly required.",
          },
        ],
        blockedReasons: [],
        proposedSteps: [],
      },
    };
    expect(buildSpokenStatus(snapshot)).toContain("Portal change detected");
    expect(buildSpokenStatus(snapshot)).toContain("vehicleType");
    expect(speechActionLabel(snapshot)).toBe("Read repair warning aloud");
  });

  it("reads the visible human approval facts and omits the challenge", () => {
    const snapshot = {
      ...activeMileage(),
      status: "awaiting_confirmation" as const,
      pendingConfirmation: {
        kind: "mileage" as const,
        challenge: "never-speak-this",
        expiresAt: "2026-09-02T12:00:00.000Z",
        origin: "Acme HQ",
        destination: "JFK Airport",
        distanceMiles: 18,
        reimbursementAmount: 12.06,
      },
    };
    const spoken = buildSpokenStatus(snapshot);
    expect(spoken).toContain("Human approval required");
    expect(spoken).toContain("$12.06");
    expect(spoken).not.toContain("never-speak-this");
    expect(speechActionLabel(snapshot)).toBe("Read approval summary aloud");
  });
});
