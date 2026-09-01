import type { Actor, AgencyMode, CapabilityRisk, JourneyStep } from "./types";

export function actorMayExecute(
  actor: Actor,
  mode: AgencyMode,
  risk: CapabilityRisk,
  step?: JourneyStep,
): boolean {
  if (risk === "read" || risk === "guidance") return true;
  if (risk === "sensitive") return actor.kind === "human" && actor.surface === "ui";
  if (actor.kind === "human") return true;
  if (mode === "show") return false;
  if (mode === "for") return true;
  return step?.assignedActor === "agent";
}

export function assignActor(
  index: number,
  risk: CapabilityRisk,
  mode: AgencyMode,
): "human" | "agent" {
  if (risk === "sensitive" || mode === "show") return "human";
  if (mode === "for") return "agent";
  return index === 2 ? "human" : "agent";
}
