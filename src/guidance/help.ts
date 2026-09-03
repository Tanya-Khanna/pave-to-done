import { getManifest } from "../domain/manifests";
import type { AgencyMode, CapabilityDefinition, JourneySnapshot } from "../domain/types";

export type GuidanceHelpIntent =
  "repeat" | "why" | "locate" | "progress" | "pause" | "resume" | "change_mode" | "unknown";

export interface GuidanceHelpResult {
  intent: GuidanceHelpIntent;
  answer: string;
  capabilityId?: string;
  anchorKey?: string;
  mode?: AgencyMode;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();
}

function capabilityTerms(capability: CapabilityDefinition) {
  return [
    capability.id,
    capability.id.split(".").at(-1) ?? "",
    capability.title,
    capability.requiredField ?? "",
    capability.mileageRequiredField ?? "",
    ...(capability.aliases ?? []),
  ]
    .map((term) => normalize(String(term)))
    .filter(Boolean);
}

function findCapability(question: string, snapshot: JourneySnapshot) {
  const normalized = normalize(question);
  const manifest = getManifest(snapshot.portalVersion);
  return manifest.capabilities
    .map((capability) => ({
      capability,
      score: Math.max(
        ...capabilityTerms(capability).map((term) => {
          if (normalized.includes(term)) return term.length + 10;
          const words = term.split(" ");
          return words.filter((word) => word.length > 2 && normalized.includes(word)).length;
        }),
      ),
    }))
    .filter(({ capability, score }) => capability.anchorKey && score > 0)
    .sort((left, right) => right.score - left.score)[0]?.capability;
}

export function resolveGuidanceHelp(
  question: string,
  snapshot: JourneySnapshot,
): GuidanceHelpResult {
  const normalized = normalize(question);
  const current = snapshot.steps.find((step) => step.status === "current");
  const completed = snapshot.steps.filter((step) => step.status === "complete").length;

  if (/\b(resume|continue|carry on)\b/.test(normalized))
    return {
      intent: "resume",
      answer: "Resuming at the same verified step.",
    };

  if (/\b(pause|hold|stop for now)\b/.test(normalized))
    return {
      intent: "pause",
      answer: "The journey is paused. No agent work can continue until you resume it.",
    };

  const requestedMode: AgencyMode | undefined = /\b(show me|show mode)\b/.test(normalized)
    ? "show"
    : /\b(with me|together|with mode)\b/.test(normalized)
      ? "with"
      : /\b(for me|delegate|for mode)\b/.test(normalized)
        ? "for"
        : undefined;
  if (requestedMode)
    return {
      intent: "change_mode",
      mode: requestedMode,
      answer: `Changing to ${requestedMode === "show" ? "Show Me" : requestedMode === "with" ? "Do It With Me" : "Do It For Me"}. Completed work stays in place.`,
    };

  if (/\b(progress|how far|status|how many)\b/.test(normalized))
    return {
      intent: "progress",
      answer: current
        ? `${completed} of ${snapshot.steps.length} steps are complete. The current step is ${current.title}.`
        : `The journey is ${snapshot.status.replaceAll("_", " ")}.`,
    };

  const matched = findCapability(question, snapshot);
  if (/\b(where|point|find|show me the|which control)\b/.test(normalized) && matched)
    return {
      intent: "locate",
      capabilityId: matched.id,
      anchorKey: matched.anchorKey,
      answer: `I marked ${matched.title} in amber without changing your current step.`,
    };

  if (/\bwhy\b/.test(normalized)) {
    const capability =
      matched ??
      getManifest(snapshot.portalVersion).capabilities.find(
        (candidate) => candidate.id === current?.capabilityId,
      );
    if (capability)
      return {
        intent: "why",
        capabilityId: capability.id,
        anchorKey: capability.anchorKey,
        answer: capability.description,
      };
  }

  if (/\b(next|repeat|again|what do i do|help me)\b/.test(normalized) && current)
    return {
      intent: "repeat",
      capabilityId: current.capabilityId,
      anchorKey: current.anchorKey,
      answer: `${current.title}. ${current.description}`,
    };

  return {
    intent: "unknown",
    answer:
      "I can repeat the current step, explain why it is needed, report progress, point to a journey control, pause or resume, and change the agency mode.",
  };
}
