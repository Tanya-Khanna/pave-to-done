import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Code2,
  FileText,
  Gauge,
  History,
  Mic,
  MousePointer2,
  Pause,
  Play,
  Plus,
  Radio,
  Receipt,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
  Volume2,
  WandSparkles,
} from "lucide-react";
import { navigate } from "../app/App";
import { useJourneySession } from "../client/useJourneySession";
import {
  DEFAULT_JOURNEY_GOAL,
  DEFAULT_RECORDED_GUIDE,
  DEMO_AGENCY_POLICIES,
  DEMO_BUSINESS_PURPOSE,
  DEMO_CATEGORIES,
  DEMO_PROJECTS,
  DEMO_RECEIPT,
} from "../domain/fixtures";
import type { Actor, AgencyMode, DomainEvent, JourneySnapshot } from "../domain/types";
import { AnchorRegistryProvider, useAnchorRef } from "../guidance/AnchorRegistry";
import { GuidanceOverlay } from "../guidance/GuidanceOverlay";
import { useWebMCPTools } from "../webmcp/useWebMCPTools";

const human: Actor = { kind: "human", surface: "ui" };
const modeCopy = DEMO_AGENCY_POLICIES;

function shortOperation(value?: string) {
  return value ? `${value.slice(0, 8)}…` : "—";
}

export function DemoPage() {
  return (
    <AnchorRegistryProvider>
      <DemoExperience />
    </AnchorRegistryProvider>
  );
}

function DemoExperience() {
  const session = useJourneySession();
  const [source, setSource] = useState<"recorded" | "on-demand">("recorded");
  const [mode, setMode] = useState<AgencyMode>("with");
  const [goal, setGoal] = useState(DEFAULT_JOURNEY_GOAL);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const webmcp = useWebMCPTools({
    snapshot: session.snapshot,
    snapshotRef: session.snapshotRef,
    command: session.command,
    enabled: true,
  });

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (session.loading)
    return (
      <div className="boot-screen">
        <div className="boot-route" />
        <span>Preparing a fresh journey…</span>
      </div>
    );
  if (session.error || !session.snapshot)
    return (
      <div className="error-screen">
        <CircleAlert />
        <h1>The guest journey could not start.</h1>
        <p>{session.error}</p>
        <button className="button primary" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  const snapshot = session.snapshot;
  const current = snapshot.steps.find((step) => step.status === "current");
  const completed = snapshot.steps.filter((step) => step.status === "complete").length;
  const progress = snapshot.steps.length
    ? Math.round((completed / snapshot.steps.length) * 100)
    : 0;

  const run = async (name: string, command: Parameters<typeof session.command>[1]) => {
    try {
      const result = await session.command(name, command, human);
      setNotice(result.ok ? "State verified." : result.error.message);
      return result;
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Action failed.");
    }
  };

  const start = () =>
    run("start_journey_ui", {
      type: "StartJourney",
      source:
        source === "recorded"
          ? {
              kind: "recorded",
              guideId: DEFAULT_RECORDED_GUIDE.id,
              guideVersion: DEFAULT_RECORDED_GUIDE.version,
            }
          : { kind: "on-demand", goal },
      mode,
    });

  const setAgency = (next: AgencyMode) => {
    setMode(next);
    if (snapshot.source)
      void run("change_agency_mode_ui", { type: "ChangeAgencyMode", mode: next });
  };

  const speak = () => {
    const text =
      snapshot.lastGuidance?.message ??
      current?.description ??
      "Start a journey to receive guidance.";
    if (!("speechSynthesis" in window)) {
      setNotice("Speech output is unavailable in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.94;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <main className={`demo-shell portal-${snapshot.portalVersion.endsWith("v2") ? "v2" : "v1"}`}>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {snapshot.status === "completed"
          ? "Journey complete and history verified."
          : snapshot.status === "paused"
            ? "Journey paused. Agent work is blocked until you resume it."
            : current
              ? `Step ${completed + 1} of ${snapshot.steps.length}. ${current.title}. Control is with ${current.assignedActor === "agent" ? "the agent" : "you"}.`
              : `Journey status: ${snapshot.status}.`}
      </div>
      <header className="demo-topbar">
        <div className="topbar-left">
          <button
            className="icon-button"
            onClick={() => navigate("/")}
            aria-label="Back to landing page"
          >
            <ArrowLeft size={17} />
          </button>
          <button className="wordmark" onClick={() => navigate("/")}>
            pave.to<span>(done)</span>
          </button>
          <span className="demo-badge">LIVE JOURNEY</span>
        </div>
        <div className="topbar-center">
          <span className={`connection ${webmcp.supported ? "connected" : "fallback"}`}>
            <i />
            {webmcp.supported ? `WebMCP ${webmcp.state}` : "Manual fallback"}
          </span>
          <span>
            revision <strong>{snapshot.revision}</strong>
          </span>
          <span>
            <ShieldCheck size={13} /> History {snapshot.historyVerified ? "verified" : "blocked"}
          </span>
        </div>
        <div className="topbar-actions">
          <button className="quiet-button" onClick={() => setShowDiagnostics((value) => !value)}>
            <Code2 size={15} /> Diagnostics
          </button>
          <button
            className="quiet-button"
            onClick={() => void run("reset_session_ui", { type: "ResetSession" })}
          >
            <RotateCcw size={15} /> Reset
          </button>
        </div>
      </header>

      {showDiagnostics && (
        <DiagnosticPanel
          snapshot={snapshot}
          webmcp={webmcp}
          invocation={session.invocation}
          pending={session.pending.length}
          onClose={() => setShowDiagnostics(false)}
        />
      )}

      <section className="demo-layout">
        <aside className="portal-sidebar">
          <div className="acme-brand">
            <span className="acme-mark">A</span>
            <div>
              <strong>Acme</strong>
              <small>Expense OS</small>
            </div>
          </div>
          <nav aria-label="Expense portal">
            <button>
              <Gauge size={17} /> Overview
            </button>
            <button className="active">
              <Receipt size={17} /> Expenses <span>4</span>
            </button>
            <button>
              <ClipboardCheck size={17} /> Approvals
            </button>
            <button>
              <FileText size={17} /> Reports
            </button>
          </nav>
          {snapshot.portalVersion === "expense.v1" && <NewExpenseButton />}
          <div className="sidebar-user">
            <span>TK</span>
            <div>
              <b>Tanya K.</b>
              <small>Operations</small>
            </div>
          </div>
        </aside>

        <section className="portal-main">
          <div className="portal-heading">
            <div>
              <span className="portal-kicker">EXPENSES / NEW</span>
              <h1>{snapshot.portalVersion === "expense.v2" ? "Add expense" : "New expense"}</h1>
              <p>Receipt details and allocation</p>
            </div>
            <div className="portal-heading-actions">
              {snapshot.portalVersion === "expense.v2" && <AddExpenseButton />}
              <button
                className="portal-version"
                disabled={snapshot.portalVersion === "expense.v2"}
                onClick={() =>
                  void run("portal_upgrade_ui", {
                    type: "ChangePortalVersion",
                    version: "expense.v2",
                  })
                }
              >
                <RefreshCcw size={14} />{" "}
                {snapshot.portalVersion === "expense.v2"
                  ? "Portal v2 active"
                  : "Simulate Portal v2"}
              </button>
            </div>
          </div>

          <div className="receipt-banner">
            <div className="receipt-icon">
              <Receipt size={21} />
            </div>
            <div>
              <span>DEMO RECEIPT</span>
              <strong>{DEMO_RECEIPT.merchant}</strong>
              <small>
                {DEMO_RECEIPT.displayDate.replace(", 2026", "")} · Client dinner · $
                {DEMO_RECEIPT.amount.toFixed(2)}
              </small>
            </div>
            <div className="receipt-confidence">
              <span>98%</span>
              <small>read confidence</small>
            </div>
          </div>

          <ExpenseForm snapshot={snapshot} />
        </section>

        <aside className="journey-dock">
          <div className="dock-header">
            <div>
              <span className="dock-signal">
                <Radio size={13} />
              </span>
              <b>Journey</b>
            </div>
            <div className="dock-actions">
              {snapshot.source &&
                ["active", "awaiting_user", "paused"].includes(snapshot.status) && (
                  <button
                    className={`icon-button ${snapshot.status === "paused" ? "active" : ""}`}
                    onClick={() =>
                      void run("set_journey_paused_ui", {
                        type: "SetJourneyPaused",
                        paused: snapshot.status !== "paused",
                      })
                    }
                    aria-label={snapshot.status === "paused" ? "Resume journey" : "Pause journey"}
                    aria-pressed={snapshot.status === "paused"}
                    title={snapshot.status === "paused" ? "Resume journey" : "Pause journey"}
                  >
                    {snapshot.status === "paused" ? <Play size={15} /> : <Pause size={15} />}
                  </button>
                )}
              <button
                className="icon-button"
                onClick={speak}
                aria-label="Read current guidance aloud"
              >
                {speaking ? <Pause size={15} /> : <Volume2 size={15} />}
              </button>
            </div>
          </div>

          <AgencySelector
            value={snapshot.source ? snapshot.agencyMode : mode}
            onChange={setAgency}
            disabled={snapshot.status === "awaiting_confirmation"}
          />

          {!snapshot.source ? (
            <JourneyStart
              source={source}
              setSource={setSource}
              goal={goal}
              setGoal={setGoal}
              onStart={start}
            />
          ) : (
            <JourneyControl
              snapshot={snapshot}
              progress={progress}
              events={session.events}
              run={run}
            />
          )}

          <RecordingControl snapshot={snapshot} run={run} />
        </aside>
      </section>

      <GuidanceOverlay
        anchorKey={snapshot.lastGuidance?.anchorKey}
        active={Boolean(snapshot.lastGuidance && snapshot.status === "awaiting_user")}
        title={current?.title}
        reason={snapshot.lastGuidance?.message ?? current?.description}
        actor={current?.assignedActor}
      />
      {notice && (
        <div className="toast" role="status">
          <Check size={15} />
          {notice}
        </div>
      )}
    </main>
  );
}

function NewExpenseButton() {
  const ref = useAnchorRef<HTMLButtonElement>("sidebar.newExpense");
  return (
    <button ref={ref} className="new-expense">
      <Plus size={16} /> New expense
    </button>
  );
}
function AddExpenseButton() {
  const ref = useAnchorRef<HTMLButtonElement>("header.addExpense");
  return (
    <button ref={ref} className="button portal-primary">
      <Plus size={15} /> Add expense
    </button>
  );
}

function AgencySelector({
  value,
  onChange,
  disabled,
}: {
  value: AgencyMode;
  onChange(value: AgencyMode): void;
  disabled: boolean;
}) {
  return (
    <div className="agency-selector" role="radiogroup" aria-label="Agency mode">
      {(Object.keys(modeCopy) as AgencyMode[]).map((mode) => (
        <button
          key={mode}
          disabled={disabled}
          className={`${modeCopy[mode].color} ${value === mode ? "selected" : ""}`}
          onClick={() => onChange(mode)}
          role="radio"
          aria-checked={value === mode}
        >
          <span>
            {mode === "show" ? (
              <MousePointer2 size={14} />
            ) : mode === "with" ? (
              <UserRound size={14} />
            ) : (
              <Bot size={14} />
            )}
          </span>
          <b>{modeCopy[mode].label}</b>
          <small>{modeCopy[mode].shortLabel}</small>
        </button>
      ))}
    </div>
  );
}

function JourneyStart({
  source,
  setSource,
  goal,
  setGoal,
  onStart,
}: {
  source: "recorded" | "on-demand";
  setSource(value: "recorded" | "on-demand"): void;
  goal: string;
  setGoal(value: string): void;
  onStart(): void;
}) {
  return (
    <div className="journey-start">
      <div className="source-toggle">
        <button
          className={source === "recorded" ? "active" : ""}
          onClick={() => setSource("recorded")}
        >
          <History size={14} /> Recorded guide
        </button>
        <button
          className={source === "on-demand" ? "active" : ""}
          onClick={() => setSource("on-demand")}
        >
          <WandSparkles size={14} /> On demand
        </button>
      </div>
      <label>
        <span className="task-label">
          <span>Your task</span>
          <VoiceTaskButton onTranscript={setGoal} />
        </span>
        <textarea value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={240} />
      </label>
      {source === "recorded" ? (
        <div className="guide-match">
          <span>
            <Check size={13} />
          </span>
          <div>
            <b>{DEFAULT_RECORDED_GUIDE.title}</b>
            <small>6 semantic steps · reviewed</small>
          </div>
          <strong>96% match</strong>
        </div>
      ) : (
        <div className="on-demand-note">
          <Sparkles size={15} />
          <span>
            <b>Planned for this session</b>
            The agent will compose a journey from the capabilities currently exposed by this page.
          </span>
        </div>
      )}
      <button className="button primary dock-start" onClick={onStart}>
        <Play size={15} /> Start shared journey
      </button>
    </div>
  );
}

function VoiceTaskButton({ onTranscript }: { onTranscript(value: string): void }) {
  const [listening, setListening] = useState(false);
  const supported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const listen = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) onTranscript(transcript);
    };
    recognition.start();
  };
  return (
    <button
      type="button"
      className={`voice-task ${listening ? "listening" : ""}`}
      disabled={!supported}
      onClick={listen}
      aria-label={supported ? "Speak the task" : "Speech recognition unavailable"}
    >
      <span>
        <Mic size={11} />
      </span>
      {listening ? "Listening…" : "Voice"}
    </button>
  );
}

function JourneyControl({
  snapshot,
  progress,
  events,
  run,
}: {
  snapshot: JourneySnapshot;
  progress: number;
  events: DomainEvent[];
  run: (name: string, command: any) => Promise<any>;
}) {
  const current = snapshot.steps.find((step) => step.status === "current");
  if (snapshot.status === "completed")
    return (
      <div className="completion-card">
        <div className="completion-orbit">
          <Check size={25} />
        </div>
        <span>VERIFIED COMPLETION</span>
        <h2>{snapshot.expense.expenseId}</h2>
        <p>
          The expense is submitted and the action trail agrees with revision {snapshot.revision}.
        </p>
        <div>
          <ShieldCheck size={14} /> History verified
        </div>
      </div>
    );
  if (snapshot.status === "repair_required")
    return <RepairBoundary snapshot={snapshot} run={run} />;
  if (snapshot.status === "blocked")
    return (
      <div className="blocked-card" role="alert">
        <div>
          <CircleAlert size={19} />
        </div>
        <span>JOURNEY STOPPED</span>
        <h2>Nothing unsafe was inferred.</h2>
        <p>{snapshot.blockedReason ?? "This journey cannot continue safely."}</p>
        <button
          className="button ghost full"
          onClick={() => void run("reset_session_ui", { type: "ResetSession" })}
        >
          <RotateCcw size={15} /> Reset journey
        </button>
      </div>
    );
  if (snapshot.status === "awaiting_confirmation" && snapshot.pendingConfirmation)
    return <Confirmation snapshot={snapshot} run={run} />;
  if (snapshot.status === "paused")
    return (
      <div className="paused-card" role="status">
        <div>
          <Pause size={18} />
        </div>
        <span>JOURNEY PAUSED</span>
        <h2>Work is safely held</h2>
        <p>
          Agent mutations are unavailable. Resume from the play control above to continue at the
          same step with the same verified draft.
        </p>
        <button
          className="button primary full"
          onClick={() =>
            void run("set_journey_paused_ui", { type: "SetJourneyPaused", paused: false })
          }
        >
          <Play size={15} /> Resume journey
        </button>
      </div>
    );
  if (!current) return <div className="empty-control">No current step.</div>;
  const index = snapshot.steps.findIndex((step) => step.id === current.id);
  return (
    <div className="journey-control">
      <div className="journey-source-label">
        {snapshot.source?.kind === "recorded" ? <History size={11} /> : <WandSparkles size={11} />}
        {snapshot.source?.kind === "recorded" ? "Recorded guide" : "Planned for this session"}
      </div>
      <div className="progress-meta">
        <span>
          STEP {String(index + 1).padStart(2, "0")} /{" "}
          {String(snapshot.steps.length).padStart(2, "0")}
        </span>
        <strong>{progress}%</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className={`control-baton ${current.assignedActor}`}>
        <span>
          {current.assignedActor === "agent" ? <Bot size={14} /> : <UserRound size={14} />}
        </span>
        <div>
          <small>CONTROL IS WITH</small>
          <b>{current.assignedActor === "agent" ? "Agent" : "You"}</b>
        </div>
        <i />
      </div>
      <span className="step-risk">
        {current.risk.toUpperCase()} · {current.capabilityId}
      </span>
      <h2>{current.title}</h2>
      <p>{current.description}</p>
      {snapshot.lastGuidance?.stepId === current.id && (
        <div className="coach-note">
          <Sparkles size={14} />
          <span>{snapshot.lastGuidance.message}</span>
        </div>
      )}
      <div className="control-actions">
        <button
          className="button ghost full"
          onClick={() => void run("show_guidance_ui", { type: "ShowGuidance" })}
        >
          <MousePointer2 size={15} /> Highlight this step
        </button>
        <HumanStepAction snapshot={snapshot} run={run} />
      </div>
      {current.assignedActor === "agent" && (
        <div className="agent-ready">
          <Activity size={14} />
          <span>Ask ChatGPT to use the currently registered mutation tool.</span>
        </div>
      )}
      <div className="step-list">
        {snapshot.steps.map((step, stepIndex) => (
          <div key={step.id} className={step.status}>
            <span>{step.status === "complete" ? <Check size={12} /> : stepIndex + 1}</span>
            <p>{step.title}</p>
            <small>{step.assignedActor === "agent" ? "AI" : "YOU"}</small>
          </div>
        ))}
      </div>
      <ActionTrail events={events} />
    </div>
  );
}

function ActionTrail({ events }: { events: DomainEvent[] }) {
  if (!events.length) return null;
  return (
    <details className="action-trail">
      <summary>
        <Activity size={13} /> Verified action trail <span>{events.length}</span>
      </summary>
      <div>
        {events
          .slice(-6)
          .reverse()
          .map((event) => (
            <article key={event.eventId}>
              <i className={event.actor.kind} />
              <div>
                <b>{event.type.replace(/([a-z])([A-Z])/g, "$1 $2")}</b>
                <small>{event.actor.kind === "agent" ? "AGENT · WEBMCP" : "HUMAN · UI"}</small>
              </div>
              <time>r{event.revision}</time>
            </article>
          ))}
      </div>
    </details>
  );
}

function HumanStepAction({
  snapshot,
  run,
}: {
  snapshot: JourneySnapshot;
  run: (name: string, command: any) => Promise<any>;
}) {
  const step = snapshot.steps.find((item) => item.status === "current");
  if (!step) return null;
  const actions: Record<string, { label: string; command: any }> = {
    "expense.date": {
      label: `Use ${DEMO_RECEIPT.displayDate}`,
      command: { type: "UpdateExpenseDraft", field: "date", value: DEMO_RECEIPT.date },
    },
    "expense.amount": {
      label: `Use $${DEMO_RECEIPT.amount.toFixed(2)}`,
      command: { type: "UpdateExpenseDraft", field: "amount", value: DEMO_RECEIPT.amount },
    },
    "expense.project": {
      label: `Choose ${DEMO_PROJECTS[0]}`,
      command: { type: "UpdateExpenseDraft", field: "project", value: DEMO_PROJECTS[0] },
    },
    "expense.category": {
      label: `Choose ${DEMO_CATEGORIES[0]}`,
      command: { type: "UpdateExpenseDraft", field: "category", value: DEMO_CATEGORIES[0] },
    },
    "expense.businessPurpose": {
      label: "Use client workshop purpose",
      command: {
        type: "UpdateExpenseDraft",
        field: "businessPurpose",
        value: DEMO_BUSINESS_PURPOSE,
      },
    },
    "expense.prepare": {
      label: "Prepare for my review",
      command: { type: "PrepareExpenseSubmission" },
    },
  };
  const action = actions[step.capabilityId];
  if (!action) return null;
  return (
    <button
      className="button primary full"
      onClick={() => void run(`human_${step.capabilityId}`, action.command)}
    >
      {action.label}
      <ArrowRight size={15} />
    </button>
  );
}

function Confirmation({
  snapshot,
  run,
}: {
  snapshot: JourneySnapshot;
  run: (name: string, command: any) => Promise<any>;
}) {
  const summary = snapshot.pendingConfirmation!;
  return (
    <div className="confirmation-card">
      <div className="human-boundary">
        <ShieldCheck size={18} />
        <span>HUMAN-ONLY BOUNDARY</span>
      </div>
      <h2>Review the consequence.</h2>
      <p>The agent prepared this draft. It cannot submit it.</p>
      <dl>
        <div>
          <dt>Merchant</dt>
          <dd>{summary.merchant}</dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>${summary.amount.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Project</dt>
          <dd>{summary.project}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{summary.category}</dd>
        </div>
      </dl>
      <button
        ref={useAnchorRef<HTMLButtonElement>("expense.confirm")}
        className="button danger full"
        onClick={() =>
          void run("confirm_expense_ui", {
            type: "ConfirmExpenseSubmission",
            challenge: summary.challenge,
            userActivated: navigator.userActivation?.isActive ?? true,
          })
        }
      >
        <ShieldCheck size={15} /> Confirm and submit expense
      </button>
      <small>
        One-time challenge · expires{" "}
        {new Date(summary.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </small>
    </div>
  );
}

function RepairBoundary({
  snapshot,
  run,
}: {
  snapshot: JourneySnapshot;
  run: (name: string, command: any) => Promise<any>;
}) {
  if (!snapshot.pendingRepair)
    return (
      <div className="repair-card waiting">
        <div className="repair-title">
          <RefreshCcw size={18} />
          <span>PORTAL CHANGE DETECTED</span>
        </div>
        <h2>The path needs one decision.</h2>
        <div className="repair-row safe">
          <Check size={15} />
          <div>
            <b>Safe remap found</b>
            <small>expense.create moved from sidebar to header.</small>
          </div>
          <span>AUTO</span>
        </div>
        <div className="repair-row material">
          <CircleAlert size={15} />
          <div>
            <b>New required input</b>
            <small>Business purpose changes the workflow.</small>
          </div>
          <span>REVIEW</span>
        </div>
        <p className="agent-instruction">
          Ask the connected agent to call <code>propose_journey_repair</code>. Completed work is
          locked while it reasons.
        </p>
      </div>
    );
  return (
    <div className="repair-card">
      <div className="repair-title">
        <RefreshCcw size={18} />
        <span>REPAIR PROPOSAL</span>
      </div>
      <h2>Approve what changed.</h2>
      {snapshot.pendingRepair.safeRemaps.map((change) => (
        <div className="repair-row safe" key={change.capabilityId}>
          <Check size={15} />
          <div>
            <b>{change.capabilityId}</b>
            <small>
              {change.from} → {change.to}
            </small>
          </div>
          <span>SAFE</span>
        </div>
      ))}
      {snapshot.pendingRepair.materialChanges.map((change) => (
        <div className="repair-row material" key={change.capabilityId}>
          <CircleAlert size={15} />
          <div>
            <b>{change.capabilityId}</b>
            <small>{change.reason}</small>
          </div>
          <span>NEW</span>
        </div>
      ))}
      <button
        className="button primary full"
        onClick={() =>
          void run("approve_repair_ui", {
            type: "ApproveRepair",
            repairId: snapshot.pendingRepair!.id,
          })
        }
      >
        <ShieldCheck size={15} /> Approve material repair
      </button>
      <button
        className="button ghost full"
        onClick={() =>
          void run("reject_repair_ui", {
            type: "RejectRepair",
            repairId: snapshot.pendingRepair!.id,
          })
        }
      >
        <CircleAlert size={15} /> Stop this journey
      </button>
      <small>The repair cannot lower risk or expand agent authority.</small>
    </div>
  );
}

function RecordingControl({
  snapshot,
  run,
}: {
  snapshot: JourneySnapshot;
  run: (name: string, command: any) => Promise<any>;
}) {
  const recording = snapshot.recording;
  const [narration, setNarration] = useState<Record<number, string>>({});
  const statusLabel =
    recording?.status === "draft"
      ? "AI-generated draft"
      : recording?.status === "published"
        ? "Recorded guide"
        : recording?.status === "review"
          ? "Recorded guide · awaiting draft"
          : recording?.status === "recording"
            ? "Recording in progress"
            : "Ready to teach";
  return (
    <div className="recording-control">
      <div>
        <span
          className={recording?.status === "recording" ? "recording-dot active" : "recording-dot"}
        />
        <div>
          <b>Teach once</b>
          <small>
            {recording
              ? `${recording.entries.length} semantic actions · ${recording.status}`
              : "Record accepted actions, never pixels"}
          </small>
        </div>
      </div>
      <span className={`recording-provenance ${recording?.status ?? "ready"}`}>{statusLabel}</span>
      {!recording || recording.status === "published" ? (
        <button
          onClick={() =>
            void run("start_recording_ui", {
              type: "StartRecording",
              narration: DEFAULT_RECORDED_GUIDE.title,
            })
          }
        >
          <Radio size={14} /> Record
        </button>
      ) : recording.status === "recording" ? (
        <button onClick={() => void run("stop_recording_ui", { type: "StopRecording" })}>
          <Pause size={14} /> Stop
        </button>
      ) : recording.status === "draft" ? (
        <button onClick={() => void run("publish_guide_ui", { type: "PublishGuide" })}>
          <Check size={14} /> Publish
        </button>
      ) : (
        <div className="recording-draft-actions">
          <span className="await-agent">Ask the agent via WebMCP</span>
          <button
            onClick={() =>
              void run("generate_guide_draft_ui", {
                type: "GenerateGuideDraft",
                title: "Submit a client dinner",
              })
            }
          >
            <WandSparkles size={14} /> Build draft without an agent
          </button>
        </div>
      )}
      {recording && recording.status !== "recording" && recording.entries.length > 0 && (
        <div className="recording-review" aria-label="Recorded actions">
          {recording.entries.map((entry) => (
            <article key={entry.sequence}>
              <div className="recording-entry-heading">
                <span>{String(entry.sequence).padStart(2, "0")}</span>
                <div>
                  <b>{entry.title}</b>
                  <small>{entry.capabilityId}</small>
                </div>
              </div>
              <div className="recording-state-change">
                <span>
                  Before · {entry.before.outcomeSatisfied ? "outcome met" : "outcome not met"}
                </span>
                <ArrowRight size={12} />
                <span>After · {entry.after.outcomeSatisfied ? "outcome met" : "recorded"}</span>
              </div>
              {recording.status === "review" && (
                <label>
                  <span>Optional narration for action {entry.sequence}</span>
                  <div>
                    <input
                      value={narration[entry.sequence] ?? entry.narration ?? ""}
                      maxLength={500}
                      placeholder="Explain the judgment behind this step"
                      onChange={(event) =>
                        setNarration((current) => ({
                          ...current,
                          [entry.sequence]: event.target.value,
                        }))
                      }
                    />
                    <button
                      aria-label={`Save narration for action ${entry.sequence}`}
                      disabled={!(narration[entry.sequence] ?? "").trim()}
                      onClick={() =>
                        void run("update_recording_narration_ui", {
                          type: "UpdateRecordingNarration",
                          sequence: entry.sequence,
                          narration: narration[entry.sequence],
                        })
                      }
                    >
                      Save
                    </button>
                  </div>
                </label>
              )}
              {entry.narration && recording.status !== "review" && <p>{entry.narration}</p>}
            </article>
          ))}
        </div>
      )}
      {recording?.draft && ["draft", "published"].includes(recording.status) && (
        <div className="guide-draft-review">
          <span>{recording.status === "published" ? "Recorded guide" : "AI-generated draft"}</span>
          <h3>{recording.draft.title}</h3>
          <small>
            {recording.draftOrigin === "deterministic"
              ? "Deterministic fallback · server validated"
              : "Agent-authored · server validated"}
          </small>
          <ol>
            {recording.draft.steps.map((step) => (
              <li key={step.capabilityId}>
                <b>{step.title}</b>
                <span>{step.description}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function FieldShell({
  anchor,
  label,
  value,
  hint,
  active,
}: {
  anchor: string;
  label: string;
  value: string;
  hint: string;
  active: boolean;
}) {
  const ref = useAnchorRef<HTMLDivElement>(anchor);
  return (
    <div ref={ref} className={`expense-field ${active ? "field-active" : ""}`}>
      <label>{label}</label>
      <div className="field-value">
        <span>{value || "Not set"}</span>
        {value && <Check size={13} />}
      </div>
      <small>{hint}</small>
    </div>
  );
}

function ExpenseForm({ snapshot }: { snapshot: JourneySnapshot }) {
  const current = snapshot.steps.find((step) => step.status === "current")?.capabilityId;
  return (
    <div className="expense-form">
      <div className="form-section-title">
        <span>01</span>
        <div>
          <b>Receipt details</b>
          <small>Verified against the attached demo receipt</small>
        </div>
      </div>
      <div className="form-grid">
        <FieldShell
          anchor="expense.date"
          label="Expense date"
          value={snapshot.expense.date ? DEMO_RECEIPT.displayDate : ""}
          hint="Required"
          active={current === "expense.date"}
        />
        <FieldShell
          anchor="expense.amount"
          label="Amount"
          value={snapshot.expense.amount ? `$${snapshot.expense.amount.toFixed(2)} USD` : ""}
          hint="Required"
          active={current === "expense.amount"}
        />
      </div>
      <div className="form-divider" />
      <div className="form-section-title">
        <span>02</span>
        <div>
          <b>Allocation</b>
          <small>Where this expense belongs</small>
        </div>
      </div>
      <div className="form-grid">
        <FieldShell
          anchor="expense.project"
          label="Project"
          value={snapshot.expense.project}
          hint="Required · judgment"
          active={current === "expense.project"}
        />
        <FieldShell
          anchor="expense.category"
          label="Category"
          value={snapshot.expense.category}
          hint="Required"
          active={current === "expense.category"}
        />
        {snapshot.portalVersion === "expense.v2" && (
          <div className="full-field">
            <FieldShell
              anchor="expense.businessPurpose"
              label="Business purpose"
              value={snapshot.expense.businessPurpose}
              hint="New in Portal v2 · required"
              active={current === "expense.businessPurpose"}
            />
          </div>
        )}
      </div>
      <div ref={useAnchorRef<HTMLDivElement>("expense.review")} className="form-review">
        <div>
          <ShieldCheck size={17} />
          <span>
            <b>Submission stays human-controlled</b>
            <small>The agent may prepare this draft but cannot finalize it.</small>
          </span>
        </div>
        <ChevronRight size={16} />
      </div>
    </div>
  );
}

function DiagnosticPanel({
  snapshot,
  webmcp,
  invocation,
  pending,
  onClose,
}: {
  snapshot: JourneySnapshot;
  webmcp: {
    supported: boolean;
    state: string;
    registered: string[];
    topLevel: boolean;
    originAgentCluster: boolean;
    permissions: "tools-allowed" | "unavailable";
    error?: string;
  };
  invocation: {
    name: string;
    status: string;
    durationMs: number;
    operationId?: string;
    message?: string;
    sentRevision?: number;
    resultingRevision?: number;
    reconciled?: boolean;
    reconciledState?: { revision: number; status: JourneySnapshot["status"] };
  };
  pending: number;
  onClose(): void;
}) {
  return (
    <aside className="diagnostic-panel" aria-label="WebMCP diagnostics">
      <header>
        <div>
          <Code2 size={16} />
          <b>WebMCP proof</b>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close diagnostics">
          ×
        </button>
      </header>
      <div className="diag-grid">
        <article>
          <span>SUPPORT</span>
          <b className={webmcp.supported ? "good" : "warn"}>
            {webmcp.supported ? webmcp.state : "unavailable"}
          </b>
        </article>
        <article>
          <span>TOOLS</span>
          <b>{webmcp.registered.length}</b>
        </article>
        <article>
          <span>REVISION</span>
          <b>{snapshot.revision}</b>
        </article>
        <article>
          <span>MANIFEST</span>
          <b>{snapshot.capabilityManifestVersion.replace("manifest.", "")}</b>
        </article>
        <article>
          <span>PAGE</span>
          <b className={webmcp.topLevel ? "good" : "warn"}>
            {webmcp.topLevel ? "top-level" : "embedded"}
          </b>
        </article>
        <article>
          <span>ORIGIN</span>
          <b className={webmcp.originAgentCluster ? "good" : "warn"}>
            {webmcp.originAgentCluster ? "isolated" : "not isolated"}
          </b>
        </article>
        <article>
          <span>PERMISSION</span>
          <b className={webmcp.permissions === "tools-allowed" ? "good" : "warn"}>
            {webmcp.permissions === "tools-allowed" ? "tools allowed" : "unavailable"}
          </b>
        </article>
      </div>
      <section>
        <span>REGISTERED NOW</span>
        <div className="tool-chips">
          {webmcp.registered.length ? (
            webmcp.registered.map((tool) => <code key={tool}>{tool}</code>)
          ) : (
            <p>
              Open in ChatGPT’s in-app browser or Chrome with WebMCP enabled. The manual UI remains
              functional.
            </p>
          )}
        </div>
      </section>
      <section>
        <span>LAST COMMAND</span>
        <dl>
          <div>
            <dt>Name</dt>
            <dd>{invocation.name}</dd>
          </div>
          <div>
            <dt>Outcome</dt>
            <dd>{invocation.status}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{invocation.durationMs} ms</dd>
          </div>
          <div>
            <dt>Operation</dt>
            <dd>{shortOperation(invocation.operationId)}</dd>
          </div>
          <div>
            <dt>Revision sent</dt>
            <dd>{invocation.sentRevision ?? "—"}</dd>
          </div>
          <div>
            <dt>Revision returned</dt>
            <dd>{invocation.resultingRevision ?? "—"}</dd>
          </div>
          <div>
            <dt>Reconciled state</dt>
            <dd>
              {invocation.reconciledState
                ? `r${invocation.reconciledState.revision} · ${invocation.reconciledState.status}`
                : invocation.reconciled
                  ? "verified"
                  : "—"}
            </dd>
          </div>
          <div>
            <dt>Pending reconciliation</dt>
            <dd>{pending}</dd>
          </div>
        </dl>
        {invocation.message && <p>{invocation.message}</p>}
      </section>
      <footer>
        <ShieldCheck size={14} /> Same-origin tools · serialized writes · bounded outputs
      </footer>
    </aside>
  );
}
