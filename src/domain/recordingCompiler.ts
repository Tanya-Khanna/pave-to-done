import type { CapabilityManifest, Guide, GuideStep, RecordingTrace } from "./types";

export type RecordingDraftResult = { ok: true; guide: Guide } | { ok: false; reason: string };

function orderedUniqueCapabilities(recording: RecordingTrace) {
  const seen = new Set<string>();
  return recording.entries.filter((entry) => {
    if (seen.has(entry.capabilityId)) return false;
    seen.add(entry.capabilityId);
    return true;
  });
}

function deterministicId(recording: RecordingTrace) {
  const timestamp = recording.startedAt.replaceAll(/\D/g, "").slice(0, 14) || "recording";
  return `draft-${timestamp}`;
}

export function compileRecordingGuide(input: {
  recording: RecordingTrace;
  manifest: CapabilityManifest;
  title?: string;
  narration?: string;
  proposedSteps?: GuideStep[];
}): RecordingDraftResult {
  const { recording, manifest } = input;
  if (recording.status === "recording")
    return { ok: false, reason: "Stop the recording before drafting a guide." };
  if (!recording.entries.length)
    return { ok: false, reason: "The recording contains no accepted semantic actions." };

  const capabilities = new Map(
    manifest.capabilities.map((capability) => [capability.id, capability]),
  );
  const orderedEntries = orderedUniqueCapabilities(recording);
  const unregistered = orderedEntries.find((entry) => !capabilities.has(entry.capabilityId));
  if (unregistered)
    return {
      ok: false,
      reason: `Recorded capability ${unregistered.capabilityId} is not registered in ${manifest.version}.`,
    };

  let steps: GuideStep[];
  if (input.proposedSteps) {
    const proposedIds = input.proposedSteps.map((step) => step.capabilityId);
    const recordedIds = orderedEntries.map((entry) => entry.capabilityId);
    if (
      proposedIds.length !== recordedIds.length ||
      proposedIds.some((capabilityId, index) => capabilityId !== recordedIds[index])
    )
      return {
        ok: false,
        reason: "Draft steps must preserve the registered capability order in the recording.",
      };
    const unknown = input.proposedSteps.find((step) => !capabilities.has(step.capabilityId));
    if (unknown)
      return {
        ok: false,
        reason: `Draft references unregistered capability ${unknown.capabilityId}.`,
      };
    steps = input.proposedSteps.map((step) => ({ ...step }));
  } else {
    steps = orderedEntries.map((entry) => {
      const capability = capabilities.get(entry.capabilityId)!;
      return {
        capabilityId: capability.id,
        title: capability.title,
        description: entry.narration?.trim() || capability.description,
      };
    });
  }

  const title = input.title?.trim() || `Guide: ${steps[0].title}`;
  return {
    ok: true,
    guide: {
      id: deterministicId(recording),
      version: 1,
      title,
      goal: input.narration?.trim() || recording.narration.trim() || title,
      manifestVersion: manifest.version,
      provenance: "AI-generated draft",
      status: "draft",
      steps,
    },
  };
}
