import { compileSteps, validateJourneyPlan } from "./compiler";
import { DEFAULT_RECORDED_GUIDE, DEMO_BUSINESS_PURPOSE, DEMO_MILEAGE } from "./fixtures";
import { compileHealing, createRepair, validateRepair } from "./healingCompiler";
import { getManifest } from "./manifests";
import { actorMayExecute } from "./policies";
import { compileRecordingGuide } from "./recordingCompiler";
import type { CommandEnvelope, Decision, DomainError, JourneySnapshot, JourneyStep } from "./types";

const fail = (code: DomainError["code"], message: string, retryable = false): Decision => ({
  ok: false,
  error: { code, message, retryable },
});

function currentStep(snapshot: JourneySnapshot): JourneyStep | undefined {
  return snapshot.steps.find((step) => step.status === "current");
}

function requireActive(snapshot: JourneySnapshot): Decision | null {
  if (!snapshot.source || snapshot.status === "idle")
    return fail("PRECONDITION_FAILED", "Start a journey first.");
  if (snapshot.status === "repair_required")
    return fail("REPAIR_REQUIRED", "Review the portal repair before continuing.");
  if (snapshot.status === "paused")
    return fail(
      "AWAITING_HUMAN",
      "This journey is paused. A person must resume it from the visible Journey dock before work can continue.",
    );
  if (snapshot.status === "awaiting_confirmation")
    return fail("AWAITING_HUMAN", "A person must review the prepared submission.");
  if (snapshot.status === "completed")
    return fail("PRECONDITION_FAILED", "This journey is already complete.");
  if (snapshot.status === "blocked")
    return fail(
      "REPAIR_REQUIRED",
      snapshot.blockedReason ?? "This journey is blocked. Reset it or resolve the unsafe change.",
    );
  const liveManifest = getManifest(snapshot.portalVersion);
  if (snapshot.capabilityManifestVersion !== liveManifest.version)
    return fail(
      "REPAIR_REQUIRED",
      `Journey manifest ${snapshot.capabilityManifestVersion} is stale; ${liveManifest.version} must be reconciled before the next step.`,
    );
  return null;
}

function canRunCurrent(
  snapshot: JourneySnapshot,
  envelope: CommandEnvelope,
  expectedCapability?: string,
): Decision | null {
  const active = requireActive(snapshot);
  if (active) return active;
  const step = currentStep(snapshot);
  if (!step) return fail("PRECONDITION_FAILED", "No current step is available.");
  if (expectedCapability && step.capabilityId !== expectedCapability) {
    return fail(
      "PRECONDITION_FAILED",
      `Current step is ${step.capabilityId}; complete it before ${expectedCapability}.`,
    );
  }
  const capability = getManifest(snapshot.portalVersion).capabilities.find(
    (candidate) => candidate.id === step.capabilityId,
  );
  if (envelope.actor.kind === "agent" && !capability?.allowedActors.includes("agent")) {
    return fail(
      "POLICY_DENIED",
      `${step.capabilityId} is human-only in ${snapshot.capabilityManifestVersion}. Complete it in the visible interface.`,
    );
  }
  if (!actorMayExecute(envelope.actor, snapshot.agencyMode, step.risk, step)) {
    return fail(
      "POLICY_DENIED",
      `${envelope.actor.kind} cannot perform ${step.capabilityId} in ${snapshot.agencyMode} mode. Current control belongs to ${step.assignedActor}; ${step.title} must be completed next.`,
    );
  }
  return null;
}

function fieldCapability(field: string) {
  return `expense.${field}`;
}

export function decide(snapshot: JourneySnapshot, envelope: CommandEnvelope): Decision {
  const { command, actor } = envelope;

  if (command.type !== "ResetSession" && envelope.expectedRevision !== snapshot.revision) {
    return fail(
      "STALE_REVISION",
      `Expected revision ${envelope.expectedRevision}; current revision is ${snapshot.revision}.`,
      true,
    );
  }

  switch (command.type) {
    case "ResetSession":
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "Only the visible human UI can reset a session.");
      return { ok: true, events: [{ type: "SessionReset", safePayload: {} }] };

    case "StartJourney": {
      if (snapshot.status !== "idle" && snapshot.status !== "completed")
        return fail("PRECONDITION_FAILED", "Reset or finish the current journey first.");
      const mode = command.mode ?? snapshot.agencyMode;
      const goal =
        command.source.kind === "on-demand" ? command.source.goal : DEFAULT_RECORDED_GUIDE.goal;
      const portalVersion =
        command.source.kind === "on-demand" && /\bmileage\b/i.test(command.source.goal)
          ? ("mileage.v1" as const)
          : ("expense.v1" as const);
      const manifest = getManifest(portalVersion);
      const steps = compileSteps(mode, portalVersion);
      const validation = validateJourneyPlan(steps, manifest);
      if (!validation.ok)
        return fail("INVALID_INPUT", `Generated journey is invalid: ${validation.reason}`);
      return {
        ok: true,
        events: [
          {
            type: "JourneyStarted",
            safePayload: {
              source: command.source,
              mode,
              goal,
              portalVersion,
              manifestVersion: manifest.version,
              steps,
            },
          },
        ],
      };
    }

    case "ChangeAgencyMode":
      if (["repair_required", "awaiting_confirmation", "blocked"].includes(snapshot.status))
        return fail(
          "AWAITING_HUMAN",
          "Resolve or reset the current human control boundary before changing modes.",
        );
      if (command.mode === snapshot.agencyMode) return { ok: true, events: [] };
      if (actor.kind === "agent") {
        const authority = { show: 0, with: 1, for: 2 } as const;
        if (authority[command.mode] > authority[snapshot.agencyMode])
          return fail(
            "AWAITING_HUMAN",
            `Changing from ${snapshot.agencyMode} to ${command.mode} expands agent authority. A person must select that mode in the visible Journey dock.`,
          );
      }
      return {
        ok: true,
        events: [{ type: "AgencyModeChanged", safePayload: { mode: command.mode } }],
      };

    case "SetJourneyPaused": {
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "Only the visible human UI can pause or resume a journey.");
      if (!snapshot.source || snapshot.status === "idle")
        return fail("PRECONDITION_FAILED", "Start a journey before pausing it.");
      if (command.paused) {
        if (snapshot.status === "paused")
          return fail("PRECONDITION_FAILED", "This journey is already paused.");
        if (!["active", "awaiting_user"].includes(snapshot.status))
          return fail(
            "AWAITING_HUMAN",
            `The journey cannot be paused while it is ${snapshot.status.replaceAll("_", " ")}. Resolve that human boundary first.`,
          );
        return {
          ok: true,
          events: [
            {
              type: "JourneyPaused",
              safePayload: { pausedFrom: snapshot.status },
            },
          ],
        };
      }
      if (snapshot.status !== "paused")
        return fail("PRECONDITION_FAILED", "This journey is not paused.");
      return { ok: true, events: [{ type: "JourneyResumed", safePayload: {} }] };
    }

    case "ShowGuidance": {
      const active = requireActive(snapshot);
      if (active) return active;
      const step = currentStep(snapshot);
      if (!step) return fail("NOT_FOUND", "There is no step to explain.");
      return {
        ok: true,
        events: [
          {
            type: "GuidanceShown",
            safePayload: {
              stepId: step.id,
              capabilityId: step.capabilityId,
              message: step.description,
              anchorKey: step.anchorKey ?? "",
            },
          },
        ],
      };
    }

    case "CreateExpenseDraft": {
      const denial = canRunCurrent(snapshot, envelope);
      if (denial) return denial;
      const step = currentStep(snapshot)!;
      if (!["expense.date", "expense.amount"].includes(step.capabilityId))
        return fail(
          "PRECONDITION_FAILED",
          "Receipt facts can only be drafted at the start of the journey.",
        );
      return {
        ok: true,
        events: [
          {
            type: "ExpenseDraftCreated",
            safePayload: {
              date: command.date,
              amount: command.amount,
              completedCapabilities: ["expense.date", "expense.amount"],
            },
          },
        ],
      };
    }

    case "UpdateExpenseDraft": {
      const capabilityId = fieldCapability(command.field);
      const denial = canRunCurrent(snapshot, envelope, capabilityId);
      if (denial) return denial;
      if (command.field === "amount" && (typeof command.value !== "number" || command.value <= 0))
        return fail("INVALID_INPUT", "Amount must be a positive number.");
      if (command.field !== "amount" && typeof command.value !== "string")
        return fail("INVALID_INPUT", `${command.field} must be text.`);
      return {
        ok: true,
        events: [
          {
            type: "ExpenseFieldUpdated",
            safePayload: { field: command.field, value: command.value, capabilityId },
          },
        ],
      };
    }

    case "UpdateMileageDraft": {
      const capabilityId =
        command.field === "distanceMiles"
          ? "mileage.distance"
          : command.field === "tripDate"
            ? "mileage.date"
            : `mileage.${command.field}`;
      const denial = canRunCurrent(snapshot, envelope, capabilityId);
      if (denial) return denial;
      if (
        command.field === "distanceMiles" &&
        (typeof command.value !== "number" || command.value < 0.1 || command.value > 1000)
      )
        return fail("INVALID_INPUT", "Distance must be between 0.1 and 1,000 miles.");
      if (command.field !== "distanceMiles" && typeof command.value !== "string")
        return fail("INVALID_INPUT", `${command.field} must be text.`);
      return {
        ok: true,
        events: [
          {
            type: "MileageFieldUpdated",
            safePayload: { field: command.field, value: command.value, capabilityId },
          },
        ],
      };
    }

    case "PrepareExpenseSubmission": {
      const denial = canRunCurrent(snapshot, envelope, "expense.prepare");
      if (denial) return denial;
      const required: Array<keyof typeof snapshot.expense> = [
        "date",
        "amount",
        "project",
        "category",
      ];
      if (snapshot.portalVersion === "expense.v2") required.push("businessPurpose");
      const missing = required.filter((field) => !snapshot.expense[field]);
      if (missing.length)
        return fail("PRECONDITION_FAILED", `Missing required fields: ${missing.join(", ")}.`);
      const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
      return {
        ok: true,
        events: [
          {
            type: "ExpenseSubmissionPrepared",
            safePayload: {
              kind: "expense",
              challenge: crypto.randomUUID(),
              expiresAt,
              amount: snapshot.expense.amount,
              project: snapshot.expense.project,
              category: snapshot.expense.category,
              merchant: snapshot.expense.merchant,
            },
          },
        ],
      };
    }

    case "PrepareMileageSubmission": {
      const denial = canRunCurrent(snapshot, envelope, "mileage.prepare");
      if (denial) return denial;
      const required: Array<keyof typeof snapshot.mileage> = [
        "origin",
        "destination",
        "distanceMiles",
        "tripDate",
        "purpose",
      ];
      if (snapshot.portalVersion === "mileage.v2") required.push("vehicleType");
      const missing = required.filter((field) => !snapshot.mileage[field]);
      if (missing.length)
        return fail(
          "PRECONDITION_FAILED",
          `Missing required mileage fields: ${missing.join(", ")}.`,
        );
      const distanceMiles = snapshot.mileage.distanceMiles!;
      return {
        ok: true,
        events: [
          {
            type: "MileageSubmissionPrepared",
            safePayload: {
              kind: "mileage",
              challenge: crypto.randomUUID(),
              expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
              distanceMiles,
              origin: snapshot.mileage.origin,
              destination: snapshot.mileage.destination,
              reimbursementAmount: Number((distanceMiles * DEMO_MILEAGE.ratePerMile).toFixed(2)),
            },
          },
        ],
      };
    }

    case "ConfirmExpenseSubmission": {
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail(
          "POLICY_DENIED",
          "Final submission is human-only and is never exposed as a WebMCP tool.",
        );
      if (!command.userActivated)
        return fail("POLICY_DENIED", "A current human activation is required.");
      if (
        !snapshot.pendingConfirmation ||
        snapshot.pendingConfirmation.kind !== "expense" ||
        snapshot.status !== "awaiting_confirmation"
      )
        return fail("PRECONDITION_FAILED", "No prepared submission is awaiting confirmation.");
      if (snapshot.pendingConfirmation.challenge !== command.challenge)
        return fail("POLICY_DENIED", "The confirmation challenge is invalid or already used.");
      if (Date.parse(snapshot.pendingConfirmation.expiresAt) < Date.now())
        return fail(
          "PRECONDITION_FAILED",
          "The confirmation expired; prepare the submission again.",
        );
      return {
        ok: true,
        events: [
          {
            type: "ExpenseSubmitted",
            safePayload: { expenseId: `EXP-${String(snapshot.revision + 2041).padStart(4, "0")}` },
          },
        ],
      };
    }

    case "ConfirmMileageSubmission": {
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "Mileage submission is human-only and has no WebMCP tool.");
      if (!command.userActivated)
        return fail("POLICY_DENIED", "A current human activation is required.");
      if (
        !snapshot.pendingConfirmation ||
        snapshot.pendingConfirmation.kind !== "mileage" ||
        snapshot.status !== "awaiting_confirmation"
      )
        return fail("PRECONDITION_FAILED", "No mileage reimbursement is awaiting confirmation.");
      if (snapshot.pendingConfirmation.challenge !== command.challenge)
        return fail("POLICY_DENIED", "The confirmation challenge is invalid or already used.");
      if (Date.parse(snapshot.pendingConfirmation.expiresAt) < Date.now())
        return fail("PRECONDITION_FAILED", "The confirmation expired; prepare it again.");
      return {
        ok: true,
        events: [
          {
            type: "MileageSubmitted",
            safePayload: { reimbursementId: `MILE-${String(snapshot.revision + 3100)}` },
          },
        ],
      };
    }

    case "ChangePortalVersion": {
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "The demo portal version switch is a human UI control.");
      if (command.version === snapshot.portalVersion)
        return fail("PRECONDITION_FAILED", `Portal is already ${command.version}.`);
      const assessment = compileHealing({
        snapshot,
        sourceManifest: getManifest(snapshot.portalVersion),
        currentManifest: getManifest(command.version),
        requirementDescriptions: {
          businessPurpose: DEMO_BUSINESS_PURPOSE,
          vehicleType: DEMO_MILEAGE.vehicleType,
        },
      });
      if (!snapshot.source)
        return {
          ok: true,
          events: [
            {
              type: "PortalVersionChanged",
              safePayload: { version: command.version, requiresRepair: false, assessment },
            },
          ],
        };
      if (
        (snapshot.portalVersion === "expense.v1" && command.version === "expense.v2") ||
        (snapshot.portalVersion === "mileage.v1" && command.version === "mileage.v2")
      ) {
        return {
          ok: true,
          events: [
            {
              type: "PortalVersionChanged",
              safePayload: {
                version: command.version,
                requiresRepair: assessment.overall === "repair_required",
                blocked: assessment.overall === "blocked",
                assessment,
                steps: assessment.proposedSteps,
              },
            },
          ],
        };
      }
      return fail(
        "PRECONDITION_FAILED",
        "The demo only upgrades an active journey to the matching v2 manifest; reset first.",
      );
    }

    case "ProposeRepair": {
      if (actor.kind !== "agent" || actor.surface !== "webmcp")
        return fail("POLICY_DENIED", "The agent proposes a bounded repair through WebMCP.");
      if (snapshot.status !== "repair_required" || !snapshot.portalVersion.endsWith(".v2"))
        return fail("PRECONDITION_FAILED", "No repair is currently required.");
      if (!snapshot.healingAssessment || snapshot.healingAssessment.overall !== "repair_required")
        return fail("PRECONDITION_FAILED", "No approvable healing assessment is current.");
      if (snapshot.pendingRepair)
        return fail("AWAITING_HUMAN", "A repair proposal is already waiting for human review.");
      const assessment = compileHealing({
        snapshot,
        sourceManifest: getManifest(
          snapshot.portalVersion === "mileage.v2" ? "mileage.v1" : "expense.v1",
        ),
        currentManifest: getManifest(snapshot.portalVersion),
        requirementDescriptions: {
          businessPurpose: command.businessPurpose || DEMO_BUSINESS_PURPOSE,
          vehicleType: command.vehicleType || DEMO_MILEAGE.vehicleType,
        },
      });
      if (assessment.overall !== "repair_required")
        return fail("PRECONDITION_FAILED", "The current manifest no longer needs that repair.");
      const repair = createRepair(snapshot, assessment);
      return { ok: true, events: [{ type: "JourneyRepairProposed", safePayload: { repair } }] };
    }

    case "ApproveRepair": {
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "Repair approval is human-only.");
      if (!snapshot.pendingRepair || snapshot.pendingRepair.id !== command.repairId)
        return fail("NOT_FOUND", "That repair proposal is no longer current.");
      const validation = validateRepair(snapshot, snapshot.pendingRepair);
      if (!validation.ok)
        return fail("POLICY_DENIED", `Unsafe repair rejected: ${validation.reason}`);
      return {
        ok: true,
        events: [
          {
            type: "JourneyRepairApproved",
            safePayload: {
              repairId: command.repairId,
              steps: snapshot.pendingRepair.proposedSteps,
            },
          },
        ],
      };
    }

    case "RejectRepair":
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "Repair rejection is human-only.");
      if (!snapshot.pendingRepair || snapshot.pendingRepair.id !== command.repairId)
        return fail("NOT_FOUND", "That repair proposal is no longer current.");
      return {
        ok: true,
        events: [
          {
            type: "JourneyRepairRejected",
            safePayload: {
              repairId: command.repairId,
              reason: "The person rejected the material workflow change. Reset to start over.",
            },
          },
        ],
      };

    case "StartRecording":
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "Recording begins only from an explicit human UI action.");
      if (snapshot.recording?.status === "recording")
        return fail("PRECONDITION_FAILED", "Recording is already active.");
      return {
        ok: true,
        events: [{ type: "RecordingStarted", safePayload: { narration: command.narration ?? "" } }],
      };

    case "StopRecording":
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "Only the visible human UI can stop recording.");
      if (snapshot.recording?.status !== "recording")
        return fail("PRECONDITION_FAILED", "No recording is active.");
      return { ok: true, events: [{ type: "RecordingStopped", safePayload: {} }] };

    case "UpdateRecordingNarration":
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "Only the visible human UI can annotate a recording.");
      if (!snapshot.recording || snapshot.recording.status === "recording")
        return fail("PRECONDITION_FAILED", "Stop the recording before annotating its actions.");
      if (!snapshot.recording.entries.some((entry) => entry.sequence === command.sequence))
        return fail("NOT_FOUND", `Recorded action ${command.sequence} does not exist.`);
      return {
        ok: true,
        events: [
          {
            type: "RecordingNarrationUpdated",
            safePayload: { sequence: command.sequence, narration: command.narration },
          },
        ],
      };

    case "GenerateGuideDraft": {
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "The deterministic fallback is a visible human UI action.");
      if (!snapshot.recording || !["review", "draft"].includes(snapshot.recording.status))
        return fail("PRECONDITION_FAILED", "Stop and review a recording first.");
      const compiled = compileRecordingGuide({
        recording: snapshot.recording,
        manifest: getManifest(snapshot.portalVersion),
        title: command.title,
      });
      if (!compiled.ok) return fail("INVALID_INPUT", compiled.reason);
      return {
        ok: true,
        events: [
          {
            type: "GuideDraftSaved",
            safePayload: { guide: compiled.guide, origin: "deterministic" },
          },
        ],
      };
    }

    case "SaveGuideDraft": {
      if (actor.kind !== "agent" || actor.surface !== "webmcp")
        return fail("POLICY_DENIED", "Guide drafts are proposed by the agent through WebMCP.");
      if (!snapshot.recording || !["review", "draft"].includes(snapshot.recording.status))
        return fail("PRECONDITION_FAILED", "Stop and review a recording first.");
      const compiled = compileRecordingGuide({
        recording: snapshot.recording,
        manifest: getManifest(snapshot.portalVersion),
        title: command.title,
        narration: command.narration,
        proposedSteps: command.steps,
      });
      if (!compiled.ok) return fail("INVALID_INPUT", compiled.reason);
      return {
        ok: true,
        events: [
          {
            type: "GuideDraftSaved",
            safePayload: { guide: compiled.guide, origin: "agent" },
          },
        ],
      };
    }

    case "PublishGuide":
      if (actor.kind !== "human" || actor.surface !== "ui")
        return fail("POLICY_DENIED", "Guide publication is human-only.");
      if (snapshot.recording?.status !== "draft" || !snapshot.recording.draft)
        return fail(
          "PRECONDITION_FAILED",
          "Review an agent-authored guide draft before publication.",
        );
      return {
        ok: true,
        events: [
          {
            type: "GuidePublished",
            safePayload: {
              guide: {
                ...snapshot.recording.draft,
                id: `guide-${crypto.randomUUID().slice(0, 8)}`,
                provenance: "Recorded guide",
                status: "published",
              },
            },
          },
        ],
      };
  }
}
