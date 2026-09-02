export type AgencyMode = "show" | "with" | "for";
export type ActorKind = "human" | "agent";
export type ActorSurface = "ui" | "webmcp";
export type PortalVersion = "expense.v1" | "expense.v2";
export type CapabilityRisk = "read" | "guidance" | "reversible" | "sensitive";
export type JourneyStatus =
  | "idle"
  | "planning"
  | "active"
  | "awaiting_user"
  | "paused"
  | "awaiting_confirmation"
  | "repair_required"
  | "completed"
  | "blocked";
export type StepStatus = "pending" | "current" | "complete" | "blocked";

export interface Actor {
  kind: ActorKind;
  surface: ActorSurface;
}

export interface ExpenseProjection {
  receiptId: string;
  merchant: string;
  date: string;
  amount: number | null;
  project: string;
  category: string;
  businessPurpose: string;
  status: "empty" | "draft" | "prepared" | "submitted";
  expenseId?: string;
}

export interface JourneyStep {
  id: string;
  capabilityId: string;
  title: string;
  description: string;
  status: StepStatus;
  assignedActor: ActorKind;
  risk: CapabilityRisk;
  anchorKey?: string;
  requiredField?: keyof ExpenseProjection;
}

export interface GuideStep {
  capabilityId: string;
  title: string;
  description: string;
}

export type GuideProvenance = "Recorded guide" | "AI-generated draft" | "Planned for this session";

export interface Guide {
  id: string;
  version: number;
  title: string;
  goal: string;
  manifestVersion: string;
  provenance: GuideProvenance;
  status: "draft" | "published";
  steps: GuideStep[];
}

export interface Repair {
  id: string;
  fromManifest: string;
  toManifest: string;
  safeRemaps: Array<{ capabilityId: string; from: string; to: string }>;
  materialChanges: Array<{ capabilityId: string; reason: string; requiredField: string }>;
  proposedSteps: JourneyStep[];
  status: "proposed" | "approved";
}

export type RepairProposal = Repair;

export interface ConfirmationSummary {
  challenge: string;
  expiresAt: string;
  amount: number;
  project: string;
  category: string;
  merchant: string;
}

export interface RecordingEntry {
  capabilityId: string;
  title: string;
  actor: ActorKind;
  risk: CapabilityRisk;
  redactedInput: Record<string, unknown>;
  before?: Partial<ExpenseProjection>;
  after?: Partial<ExpenseProjection>;
  narration?: string;
}

export interface RecordingTrace {
  status: "recording" | "review" | "draft" | "published";
  startedAt: string;
  narration: string;
  entries: RecordingEntry[];
  draftTitle?: string;
  guideId?: string;
}

export type RecordingProjection = RecordingTrace;

export interface AgencyPolicy {
  mode: AgencyMode;
  label: string;
  shortLabel: string;
  agentAuthority: readonly CapabilityRisk[];
  sensitiveBoundary: "human-ui-only";
}

export interface CapabilityDefinition {
  id: string;
  version: string;
  title: string;
  description: string;
  risk: CapabilityRisk;
  allowedActors: readonly ActorKind[];
  requiredField?: keyof ExpenseProjection;
  anchorKey?: string;
  aliases?: string[];
}

export interface CapabilityManifest {
  version: string;
  portalVersion: PortalVersion;
  capabilities: CapabilityDefinition[];
}

export interface PortalManifest {
  version: PortalVersion;
  capabilityManifestVersion: string;
  displayName: string;
  capabilities: CapabilityManifest;
}

export interface JourneySourceRecorded {
  kind: "recorded";
  guideId: string;
  guideVersion: number;
}

export interface JourneySourceOnDemand {
  kind: "on-demand";
  goal: string;
}

export type JourneySource = JourneySourceRecorded | JourneySourceOnDemand;

export interface JourneySnapshot {
  sessionId: string;
  revision: number;
  portalVersion: PortalVersion;
  capabilityManifestVersion: string;
  source: JourneySource | null;
  goal: string;
  agencyMode: AgencyMode;
  status: JourneyStatus;
  pausedFrom?: "active" | "awaiting_user";
  steps: JourneyStep[];
  expense: ExpenseProjection;
  pendingRepair?: Repair;
  pendingConfirmation?: ConfirmationSummary;
  recording?: RecordingProjection;
  lastGuidance?: { stepId: string; message: string; anchorKey?: string };
  lastEventHash: string;
  historyVerified: boolean;
  updatedAt: string;
}

export type ExpenseField = "date" | "amount" | "project" | "category" | "businessPurpose";

export type JourneyCommand =
  | { type: "StartJourney"; source: JourneySource; mode?: AgencyMode }
  | { type: "ChangeAgencyMode"; mode: AgencyMode }
  | { type: "SetJourneyPaused"; paused: boolean }
  | { type: "ShowGuidance" }
  | { type: "CreateExpenseDraft"; date: string; amount: number }
  | { type: "UpdateExpenseDraft"; field: ExpenseField; value: string | number }
  | { type: "PrepareExpenseSubmission" }
  | { type: "ConfirmExpenseSubmission"; challenge: string; userActivated: boolean }
  | { type: "ChangePortalVersion"; version: PortalVersion }
  | { type: "ProposeRepair"; businessPurpose: string }
  | { type: "ApproveRepair"; repairId: string }
  | { type: "StartRecording"; narration?: string }
  | { type: "StopRecording" }
  | { type: "SaveGuideDraft"; title: string; narration?: string }
  | { type: "PublishGuide" }
  | { type: "ResetSession" };

export interface CommandEnvelope<C extends JourneyCommand = JourneyCommand> {
  operationId: string;
  expectedRevision: number;
  actor: Actor;
  command: C;
  sentAt: string;
}

export interface DomainEventDraft {
  type: string;
  safePayload: Record<string, unknown>;
}

export interface DomainEvent extends DomainEventDraft {
  eventId: string;
  sessionId: string;
  revision: number;
  operationId: string;
  actor: Actor;
  previousHash: string;
  eventHash: string;
  occurredAt: string;
}

export type EventRecord = DomainEvent;

export type DomainErrorCode =
  | "INVALID_INPUT"
  | "STALE_REVISION"
  | "POLICY_DENIED"
  | "PRECONDITION_FAILED"
  | "REPAIR_REQUIRED"
  | "AWAITING_HUMAN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "CANCELED"
  | "AMBIGUOUS_OUTCOME"
  | "INTERNAL";

export interface DomainError {
  code: DomainErrorCode;
  message: string;
  retryable: boolean;
}

export type Decision = { ok: true; events: DomainEventDraft[] } | { ok: false; error: DomainError };

export interface CommandSuccess {
  ok: true;
  operationId: string;
  revision: number;
  deduplicated: boolean;
  snapshot: JourneySnapshot;
  events: DomainEvent[];
  sentRevision?: number;
  reconciled?: boolean;
}

export interface CommandFailure {
  ok: false;
  operationId: string;
  revision: number;
  error: DomainError;
  snapshot: JourneySnapshot;
  sentRevision?: number;
  reconciled?: boolean;
}

export type CommandResult = CommandSuccess | CommandFailure;
