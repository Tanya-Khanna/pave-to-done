import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AudioLines,
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
  VolumeX,
  WandSparkles,
} from "lucide-react";
import { navigate } from "../app/App";
import { useJourneySession } from "../client/useJourneySession";
import {
  DEFAULT_JOURNEY_GOAL,
  DEFAULT_MILEAGE_GOAL,
  DEFAULT_RECORDED_GUIDE,
  DEMO_AGENCY_POLICIES,
  DEMO_CATEGORIES,
  DEMO_MILEAGE,
  DEMO_PROJECTS,
  DEMO_RECEIPT,
} from "../domain/fixtures";
import type { Actor, AgencyMode, DomainEvent, JourneySnapshot } from "../domain/types";
import { AnchorRegistryProvider, useAnchorRef } from "../guidance/AnchorRegistry";
import { GuidanceOverlay, LocatorOverlay } from "../guidance/GuidanceOverlay";
import { resolveGuidanceHelp } from "../guidance/help";
import { buildSpokenStatus, speechActionLabel } from "../shared/speechOutput";
import { useWebMCPTools } from "../webmcp/useWebMCPTools";

const human: Actor = { kind: "human", surface: "ui" };
const modeCopy = DEMO_AGENCY_POLICIES;

function shortOperation(value?: string) {
  return value ? `${value.slice(0, 8)}…` : "—";
}

function speechOutputAvailable() {
  return (
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

function journeySourceForGoal(goal: string) {
  const normalized = goal.toLowerCase();
  const recordedTerms = ["expense", "receipt", "dinner", "client meal", "project atlas"];
  const recorded = recordedTerms.some((term) => normalized.includes(term));
  return recorded
    ? ({
        kind: "recorded" as const,
        guideId: DEFAULT_RECORDED_GUIDE.id,
        guideVersion: DEFAULT_RECORDED_GUIDE.version,
      } as const)
    : ({ kind: "on-demand" as const, goal } as const);
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
  const [mode, setMode] = useState<AgencyMode>("show");
  const [goal, setGoal] = useState(DEFAULT_JOURNEY_GOAL);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [speechMuted, setSpeechMuted] = useState(false);
  const [helpListening, setHelpListening] = useState(false);
  const [helpAnswer, setHelpAnswer] = useState<string | null>(null);
  const [guidanceWake, setGuidanceWake] = useState(0);
  const [locator, setLocator] = useState<{
    anchorKey: string;
    label: string;
  } | null>(null);
  const autoGuidanceInFlight = useRef<string | null>(null);
  const autoSpokenStep = useRef<string | null>(null);
  const helpPausePromise = useRef<Promise<unknown> | null>(null);
  const helpProducedResult = useRef(false);
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

  useEffect(
    () => () => {
      if (speechOutputAvailable()) window.speechSynthesis.cancel();
    },
    [],
  );

  useEffect(() => {
    const wake = () => setGuidanceWake((value) => value + 1);
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  const run = useCallback(
    async (name: string, command: Parameters<typeof session.command>[1]) => {
      try {
        const result = await session.command(name, command, human);
        setNotice(result.ok ? "State verified." : result.error.message);
        return result;
      } catch (cause) {
        setNotice(cause instanceof Error ? cause.message : "Action failed.");
      }
    },
    [session.command],
  );

  const speakText = useCallback(
    (text: string, onFinished?: () => void) => {
      if (speechMuted || !speechOutputAvailable()) {
        onFinished?.();
        return false;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.94;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        onFinished?.();
      };
      utterance.onerror = () => {
        setSpeaking(false);
        onFinished?.();
      };
      window.speechSynthesis.speak(utterance);
      return true;
    },
    [speechMuted],
  );

  const start = useCallback(
    (requestedGoal = goal) => {
      const trimmed = requestedGoal.trim();
      if (!trimmed) {
        setNotice("Describe the task before starting the journey.");
        return Promise.resolve(undefined);
      }
      setGoal(trimmed);
      return run("start_journey_ui", {
        type: "StartJourney",
        source: journeySourceForGoal(trimmed),
        mode,
      });
    },
    [goal, mode, run],
  );

  const setAgency = useCallback(
    (next: AgencyMode) => {
      setMode(next);
      if (session.snapshotRef.current?.source)
        void run("change_agency_mode_ui", { type: "ChangeAgencyMode", mode: next });
    },
    [run, session.snapshotRef],
  );

  useEffect(() => {
    const snapshot = session.snapshot;
    const current = snapshot?.steps.find((step) => step.status === "current");
    if (
      !snapshot?.source ||
      !current ||
      current.assignedActor !== "human" ||
      !["active", "awaiting_user"].includes(snapshot.status) ||
      snapshot.lastGuidance?.stepId === current.id ||
      document.visibilityState !== "visible" ||
      !document.hasFocus()
    )
      return;
    const key = `${snapshot.sessionId}:${snapshot.revision}:${current.id}`;
    if (autoGuidanceInFlight.current === key) return;
    autoGuidanceInFlight.current = key;
    void session
      .command("automatic_guidance_ui", { type: "ShowGuidance" }, human)
      .catch((cause) =>
        setNotice(cause instanceof Error ? cause.message : "Automatic guidance could not start."),
      )
      .finally(() => {
        if (autoGuidanceInFlight.current === key) autoGuidanceInFlight.current = null;
      });
  }, [guidanceWake, session.command, session.snapshot]);

  useEffect(() => {
    const snapshot = session.snapshot;
    const current = snapshot?.steps.find((step) => step.status === "current");
    if (
      !snapshot ||
      !current ||
      current.assignedActor !== "human" ||
      snapshot.status !== "awaiting_user" ||
      snapshot.lastGuidance?.stepId !== current.id ||
      document.visibilityState !== "visible" ||
      !document.hasFocus()
    )
      return;
    const key = `${snapshot.sessionId}:${current.id}:${snapshot.lastGuidance.anchorKey ?? ""}`;
    if (autoSpokenStep.current === key) return;
    autoSpokenStep.current = key;
    speakText(buildSpokenStatus(snapshot));
  }, [guidanceWake, session.snapshot, speakText]);

  const answerGuidanceQuestion = useCallback(
    async (question: string, alreadyPausedForHelp = false) => {
      let snapshot = session.snapshotRef.current;
      if (!snapshot?.source) return;
      let resumeAfterAnswer = alreadyPausedForHelp;
      if (!alreadyPausedForHelp && ["active", "awaiting_user"].includes(snapshot.status)) {
        const paused = await run("voice_help_pause_ui", {
          type: "SetJourneyPaused",
          paused: true,
        });
        resumeAfterAnswer = Boolean(paused?.ok);
        snapshot = session.snapshotRef.current;
      }
      if (!snapshot) return;
      const help = resolveGuidanceHelp(question, snapshot);
      setHelpAnswer(help.answer);
      if (help.anchorKey)
        setLocator({ anchorKey: help.anchorKey, label: help.capabilityId ?? "Requested control" });

      if (help.intent === "pause") {
        if (snapshot.status !== "paused")
          await run("voice_pause_ui", { type: "SetJourneyPaused", paused: true });
        speakText(help.answer);
        return;
      }
      if (help.intent === "resume") {
        if (session.snapshotRef.current?.status === "paused")
          await run("voice_resume_ui", { type: "SetJourneyPaused", paused: false });
        speakText(help.answer);
        return;
      }
      if (help.intent === "change_mode" && help.mode)
        await run("voice_change_agency_mode_ui", { type: "ChangeAgencyMode", mode: help.mode });

      const resume = () => {
        if (resumeAfterAnswer && session.snapshotRef.current?.status === "paused")
          void run("voice_help_resume_ui", { type: "SetJourneyPaused", paused: false });
      };
      speakText(help.answer, resume);
    },
    [run, session.snapshotRef, speakText],
  );

  const beginHelpListening = useCallback(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition || !session.snapshotRef.current?.source) {
      setHelpAnswer("Voice recognition is unavailable. Type a journey question instead.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    helpProducedResult.current = false;
    recognition.onstart = () => {
      setHelpListening(true);
      const status = session.snapshotRef.current?.status;
      helpPausePromise.current = ["active", "awaiting_user"].includes(status ?? "")
        ? run("voice_help_pause_ui", { type: "SetJourneyPaused", paused: true })
        : Promise.resolve(undefined);
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      helpProducedResult.current = true;
      void Promise.resolve(helpPausePromise.current).then(() =>
        answerGuidanceQuestion(transcript, true),
      );
    };
    recognition.onerror = () => {
      setHelpListening(false);
      setHelpAnswer("I could not hear that. Type the question or try the microphone again.");
    };
    recognition.onend = () => {
      setHelpListening(false);
      if (!helpProducedResult.current)
        void Promise.resolve(helpPausePromise.current).then(() => {
          if (session.snapshotRef.current?.status === "paused")
            void run("voice_help_resume_ui", { type: "SetJourneyPaused", paused: false });
        });
    };
    recognition.start();
  }, [answerGuidanceQuestion, run, session.snapshotRef]);

  const dismissLocator = useCallback(() => setLocator(null), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.key !== "?" ||
        target?.matches("input, textarea, select, [contenteditable='true']") ||
        !session.snapshotRef.current?.source
      )
        return;
      event.preventDefault();
      beginHelpListening();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [beginHelpListening, session.snapshotRef]);

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
  const isMileage = snapshot.portalVersion.startsWith("mileage.");
  const current = snapshot.steps.find((step) => step.status === "current");
  const completed = snapshot.steps.filter((step) => step.status === "complete").length;
  const progress = snapshot.steps.length
    ? Math.round((completed / snapshot.steps.length) * 100)
    : 0;

  const resetAndReload = async () => {
    const result = await run("reset_session_ui", { type: "ResetSession" });
    if (result?.ok) window.location.reload();
  };

  const spokenText = buildSpokenStatus(snapshot);
  const spokenActionLabel = speechActionLabel(snapshot);
  const speechAvailable = speechOutputAvailable();

  const speak = () => {
    if (speechMuted) {
      setNotice("Voice is muted. Unmute voice to hear this message.");
      return;
    }
    if (!speechOutputAvailable()) {
      setNotice("Speech output is unavailable in this browser.");
      return;
    }
    speakText(spokenText);
  };

  const toggleSpeechMuted = () => {
    setSpeechMuted((muted) => {
      const next = !muted;
      if (next && speechOutputAvailable()) window.speechSynthesis.cancel();
      if (next) setSpeaking(false);
      setNotice(next ? "Voice muted. All guidance remains visible." : "Voice unmuted.");
      return next;
    });
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
          <button className="quiet-button" onClick={() => void resetAndReload()}>
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
              <span className="portal-kicker">EXPENSES / {isMileage ? "MILEAGE" : "NEW"}</span>
              <h1>
                {isMileage
                  ? "Mileage reimbursement"
                  : snapshot.portalVersion === "expense.v2"
                    ? "Add expense"
                    : "New expense"}
              </h1>
              <p>
                {isMileage ? "Route, policy, and reimbursement" : "Receipt details and allocation"}
              </p>
            </div>
            <div className="portal-heading-actions">
              {snapshot.portalVersion === "expense.v2" && <AddExpenseButton />}
              <button
                className="portal-version"
                disabled={snapshot.portalVersion.endsWith(".v2")}
                onClick={() =>
                  void run("portal_upgrade_ui", {
                    type: "ChangePortalVersion",
                    version: isMileage ? "mileage.v2" : "expense.v2",
                  })
                }
              >
                <RefreshCcw size={14} />{" "}
                {snapshot.portalVersion.endsWith(".v2") ? "Portal v2 active" : "Simulate Portal v2"}
              </button>
            </div>
          </div>

          {isMileage ? (
            <div className="receipt-banner mileage-banner">
              <div className="receipt-icon">
                <Activity size={21} />
              </div>
              <div>
                <span>ON-DEMAND TASK</span>
                <strong>
                  {DEMO_MILEAGE.origin} → {DEMO_MILEAGE.destination}
                </strong>
                <small>
                  {DEMO_MILEAGE.distanceMiles} miles · $
                  {(DEMO_MILEAGE.distanceMiles * DEMO_MILEAGE.ratePerMile).toFixed(2)} estimated
                </small>
              </div>
              <div className="receipt-confidence">
                <span>LIVE</span>
                <small>manifest plan</small>
              </div>
            </div>
          ) : (
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
          )}

          {isMileage ? (
            <MileageForm snapshot={snapshot} run={run} />
          ) : (
            <ExpenseForm snapshot={snapshot} run={run} />
          )}
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
                aria-label={spokenActionLabel}
                title={spokenActionLabel}
              >
                {speaking ? <Pause size={15} /> : <AudioLines size={15} />}
              </button>
              {snapshot.source && (
                <button
                  className={`icon-button ${helpListening ? "active" : ""}`}
                  onClick={beginHelpListening}
                  aria-label="Ask while guiding"
                  aria-pressed={helpListening}
                  title="Ask while guiding (?)"
                >
                  <Mic size={15} />
                </button>
              )}
              <button
                className={`icon-button ${speechMuted ? "active" : ""}`}
                onClick={toggleSpeechMuted}
                aria-label={speechMuted ? "Unmute voice" : "Mute voice"}
                aria-pressed={speechMuted}
                title={speechMuted ? "Unmute voice" : "Mute voice"}
              >
                {speechMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            </div>
          </div>

          <div className="speech-status" role="status" aria-live="polite">
            <span>
              {!speechAvailable
                ? "Voice unavailable"
                : speechMuted
                  ? "Voice muted"
                  : speaking
                    ? "Speaking"
                    : "Voice ready"}
            </span>
            <p>
              {speaking
                ? spokenText
                : speechMuted
                  ? "Spoken guidance is off. Every instruction remains visible."
                  : speechAvailable
                    ? "Instructions, warnings, and approval facts can be read aloud."
                    : "Use the same visible guidance and keyboard controls."}
            </p>
          </div>

          <AgencySelector
            value={snapshot.source ? snapshot.agencyMode : mode}
            onChange={setAgency}
            disabled={snapshot.status === "awaiting_confirmation"}
          />

          {!snapshot.source ? (
            <JourneyStart goal={goal} setGoal={setGoal} onStart={start} />
          ) : (
            <JourneyControl
              snapshot={snapshot}
              progress={progress}
              events={session.events}
              run={run}
            />
          )}

          {snapshot.source && (
            <GuidanceHelp
              listening={helpListening}
              answer={helpAnswer}
              onListen={beginHelpListening}
              onAsk={(question) => void answerGuidanceQuestion(question)}
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
      <LocatorOverlay
        anchorKey={locator?.anchorKey}
        active={Boolean(locator)}
        label={locator?.label}
        onDismiss={dismissLocator}
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
  goal,
  setGoal,
  onStart,
}: {
  goal: string;
  setGoal(value: string): void;
  onStart(goal?: string): void;
}) {
  const source = journeySourceForGoal(goal);
  return (
    <div className="journey-start">
      <label htmlFor="journey-task">
        <span className="task-label">
          <span>Your task</span>
          <VoiceTaskButton
            onTranscript={(transcript) => {
              setGoal(transcript);
              onStart(transcript);
            }}
          />
        </span>
        <textarea
          id="journey-task"
          aria-label="Your task"
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onStart(goal);
            }
          }}
          maxLength={240}
        />
      </label>
      <div className="task-examples" aria-label="Example tasks">
        <button type="button" onClick={() => setGoal(DEFAULT_JOURNEY_GOAL)}>
          Expense receipt
        </button>
        <button type="button" onClick={() => setGoal(DEFAULT_MILEAGE_GOAL)}>
          Mileage reimbursement
        </button>
      </div>
      {source.kind === "recorded" ? (
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
      <button className="button primary dock-start" onClick={() => onStart(goal)}>
        <Play size={15} /> Start guiding me
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

function GuidanceHelp({
  listening,
  answer,
  onListen,
  onAsk,
}: {
  listening: boolean;
  answer: string | null;
  onListen(): void;
  onAsk(question: string): void;
}) {
  const [question, setQuestion] = useState("");
  return (
    <div className="guidance-help">
      <div className="guidance-help-heading">
        <span>
          <Mic size={13} /> Ask while guiding
        </span>
        <kbd>?</kbd>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const value = question.trim();
          if (!value) return;
          onAsk(value);
          setQuestion("");
        }}
      >
        <input
          aria-label="Journey question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Try “why?” or “where is amount?”"
          maxLength={240}
        />
        <button type="button" onClick={onListen} aria-label="Ask journey question by voice">
          {listening ? <AudioLines size={14} /> : <Mic size={14} />}
        </button>
        <button type="submit" aria-label="Ask journey question">
          <ArrowRight size={14} />
        </button>
      </form>
      {answer && (
        <p role="status" aria-live="polite">
          {answer}
        </p>
      )}
    </div>
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
        <h2>
          {snapshot.portalVersion.startsWith("mileage.")
            ? snapshot.mileage.reimbursementId
            : snapshot.expense.expenseId}
        </h2>
        <p>
          The {snapshot.portalVersion.startsWith("mileage.") ? "reimbursement" : "expense"} is
          submitted and the action trail agrees with revision {snapshot.revision}.
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
          <AudioLines size={15} /> Repeat instruction
        </button>
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

function Confirmation({
  snapshot,
  run,
}: {
  snapshot: JourneySnapshot;
  run: (name: string, command: any) => Promise<any>;
}) {
  const summary = snapshot.pendingConfirmation!;
  const mileage = summary.kind === "mileage";
  return (
    <div className="confirmation-card">
      <div className="human-boundary">
        <ShieldCheck size={18} />
        <span>HUMAN-ONLY BOUNDARY</span>
      </div>
      <h2>Review the consequence.</h2>
      <p>The agent prepared this {mileage ? "reimbursement" : "draft"}. It cannot submit it.</p>
      <dl>
        {mileage ? (
          <>
            <div>
              <dt>Route</dt>
              <dd>
                {summary.origin} → {summary.destination}
              </dd>
            </div>
            <div>
              <dt>Distance</dt>
              <dd>{summary.distanceMiles} miles</dd>
            </div>
            <div>
              <dt>Rate</dt>
              <dd>${DEMO_MILEAGE.ratePerMile.toFixed(2)} / mile</dd>
            </div>
            <div>
              <dt>Reimbursement</dt>
              <dd>${summary.reimbursementAmount?.toFixed(2)}</dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt>Merchant</dt>
              <dd>{summary.merchant}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>${summary.amount?.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Project</dt>
              <dd>{summary.project}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{summary.category}</dd>
            </div>
          </>
        )}
      </dl>
      <button
        ref={useAnchorRef<HTMLButtonElement>(mileage ? "mileage.confirm" : "expense.confirm")}
        className="button danger full"
        onClick={() =>
          void run(mileage ? "confirm_mileage_ui" : "confirm_expense_ui", {
            type: mileage ? "ConfirmMileageSubmission" : "ConfirmExpenseSubmission",
            challenge: summary.challenge,
            userActivated: navigator.userActivation?.isActive ?? true,
          })
        }
      >
        <ShieldCheck size={15} /> Confirm and submit {mileage ? "reimbursement" : "expense"}
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
  const assessment = snapshot.healingAssessment;
  if (!snapshot.pendingRepair)
    return (
      <div className="repair-card waiting">
        <div className="repair-title">
          <RefreshCcw size={18} />
          <span>PORTAL CHANGE DETECTED</span>
        </div>
        <h2>The path needs one decision.</h2>
        {assessment?.safeRemaps.map((change) => (
          <div className="repair-row safe" key={`${change.capabilityId}-${change.from}`}>
            <Check size={15} />
            <div>
              <b>Safe remap · {change.capabilityId}</b>
              <small>
                {change.from} → {change.to}
              </small>
            </div>
            <span>AUTO</span>
          </div>
        ))}
        {assessment?.materialChanges.map((change) => (
          <div className="repair-row material" key={change.capabilityId}>
            <CircleAlert size={15} />
            <div>
              <b>New required input · {change.requiredField}</b>
              <small>{change.reason}</small>
            </div>
            <span>REVIEW</span>
          </div>
        ))}
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

function TextPortalField({
  anchor,
  label,
  value,
  hint,
  active,
  type = "text",
  placeholder,
  parse = (next) => next.trim(),
  onCommit,
}: {
  anchor: string;
  label: string;
  value: string;
  hint: string;
  active: boolean;
  type?: "text" | "number";
  placeholder?: string;
  parse?: (value: string) => string | number | null;
  onCommit(value: string | number): Promise<any>;
}) {
  const ref = useAnchorRef<HTMLInputElement>(anchor);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const lastSubmitted = useRef<string | null>(null);
  const committing = useRef(false);
  useEffect(() => setDraft(value), [value]);

  const commit = async () => {
    if (!active || draft === value || committing.current) return;
    const parsed = parse(draft);
    if (parsed === null || parsed === "") {
      setError("Enter a valid value before continuing.");
      return;
    }
    const submitted = String(parsed);
    if (lastSubmitted.current === submitted) return;
    lastSubmitted.current = submitted;
    committing.current = true;
    const result = await onCommit(parsed);
    committing.current = false;
    if (result?.ok) setError(null);
    else {
      lastSubmitted.current = null;
      if (result?.error?.message) setError(result.error.message);
    }
  };

  return (
    <div className={`expense-field portal-input ${active ? "field-active" : ""}`}>
      <label htmlFor={`field-${anchor}`}>{label}</label>
      <div className="field-value">
        <input
          ref={ref}
          id={`field-${anchor}`}
          type={type}
          value={draft}
          placeholder={placeholder ?? "Not set"}
          disabled={!active}
          aria-invalid={Boolean(error)}
          aria-describedby={`hint-${anchor}`}
          inputMode={type === "number" ? "decimal" : undefined}
          min={type === "number" ? "0.1" : undefined}
          step={type === "number" ? "0.01" : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void commit();
            }
          }}
        />
        {value && <Check size={13} aria-hidden="true" />}
      </div>
      <small id={`hint-${anchor}`} className={error ? "field-error" : ""}>
        {error ?? hint}
      </small>
    </div>
  );
}

function SelectPortalField({
  anchor,
  label,
  value,
  hint,
  active,
  options,
  onCommit,
}: {
  anchor: string;
  label: string;
  value: string;
  hint: string;
  active: boolean;
  options: string[];
  onCommit(value: string): Promise<any>;
}) {
  const ref = useAnchorRef<HTMLSelectElement>(anchor);
  return (
    <div className={`expense-field portal-input ${active ? "field-active" : ""}`}>
      <label htmlFor={`field-${anchor}`}>{label}</label>
      <div className="field-value">
        <select
          ref={ref}
          id={`field-${anchor}`}
          value={value}
          disabled={!active}
          onChange={(event) => void onCommit(event.target.value)}
          onKeyDown={(event) => {
            if (!active || !["ArrowDown", "ArrowUp"].includes(event.key)) return;
            event.preventDefault();
            const selected = Math.max(0, options.indexOf(value));
            const next = value
              ? event.key === "ArrowDown"
                ? Math.min(options.length - 1, selected + 1)
                : Math.max(0, selected - 1)
              : 0;
            void onCommit(options[next]);
          }}
        >
          <option value="" disabled>
            Select…
          </option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {value && <Check size={13} aria-hidden="true" />}
      </div>
      <small>{hint}</small>
    </div>
  );
}

function PrepareControl({
  anchor,
  active,
  title,
  description,
  onPrepare,
}: {
  anchor: string;
  active: boolean;
  title: string;
  description: string;
  onPrepare(): Promise<any>;
}) {
  const ref = useAnchorRef<HTMLButtonElement>(anchor);
  return (
    <button
      ref={ref}
      className={`form-review form-review-action ${active ? "active" : ""}`}
      disabled={!active}
      onClick={() => void onPrepare()}
    >
      <div>
        <ShieldCheck size={17} />
        <span>
          <b>{title}</b>
          <small>{description}</small>
        </span>
      </div>
      <ChevronRight size={16} />
    </button>
  );
}

function ExpenseForm({
  snapshot,
  run,
}: {
  snapshot: JourneySnapshot;
  run: (name: string, command: any) => Promise<any>;
}) {
  const currentStep = snapshot.steps.find((step) => step.status === "current");
  const current = currentStep?.capabilityId;
  const actionable =
    ["active", "awaiting_user"].includes(snapshot.status) &&
    (currentStep?.assignedActor === "agent" || snapshot.lastGuidance?.stepId === currentStep?.id);
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
        <TextPortalField
          anchor="expense.date"
          label="Expense date"
          value={snapshot.expense.date}
          placeholder="YYYY-MM-DD"
          hint={`Required · receipt says ${DEMO_RECEIPT.displayDate}`}
          active={actionable && current === "expense.date"}
          onCommit={(value) =>
            run("human_expense.date", { type: "UpdateExpenseDraft", field: "date", value })
          }
        />
        <TextPortalField
          anchor="expense.amount"
          label="Amount"
          value={snapshot.expense.amount?.toString() ?? ""}
          type="number"
          placeholder="0.00"
          hint={`Required · receipt says $${DEMO_RECEIPT.amount.toFixed(2)}`}
          active={actionable && current === "expense.amount"}
          parse={(value) => {
            const amount = Number(value);
            return Number.isFinite(amount) && amount > 0 ? amount : null;
          }}
          onCommit={(value) =>
            run("human_expense.amount", { type: "UpdateExpenseDraft", field: "amount", value })
          }
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
        <SelectPortalField
          anchor="expense.project"
          label="Project"
          value={snapshot.expense.project}
          hint="Required · judgment"
          active={actionable && current === "expense.project"}
          options={[...DEMO_PROJECTS]}
          onCommit={(value) =>
            run("human_expense.project", {
              type: "UpdateExpenseDraft",
              field: "project",
              value,
            })
          }
        />
        <SelectPortalField
          anchor="expense.category"
          label="Category"
          value={snapshot.expense.category}
          hint="Required"
          active={actionable && current === "expense.category"}
          options={[...DEMO_CATEGORIES]}
          onCommit={(value) =>
            run("human_expense.category", {
              type: "UpdateExpenseDraft",
              field: "category",
              value,
            })
          }
        />
        {snapshot.portalVersion === "expense.v2" && (
          <div className="full-field">
            <TextPortalField
              anchor="expense.businessPurpose"
              label="Business purpose"
              value={snapshot.expense.businessPurpose}
              hint="New in Portal v2 · required"
              active={actionable && current === "expense.businessPurpose"}
              placeholder="Explain the business purpose"
              onCommit={(value) =>
                run("human_expense.businessPurpose", {
                  type: "UpdateExpenseDraft",
                  field: "businessPurpose",
                  value,
                })
              }
            />
          </div>
        )}
      </div>
      <PrepareControl
        anchor="expense.review"
        active={actionable && current === "expense.prepare"}
        title={
          current === "expense.prepare"
            ? "Prepare for my review"
            : "Submission stays human-controlled"
        }
        description="Validate the draft; final submission still requires you."
        onPrepare={() => run("human_expense.prepare", { type: "PrepareExpenseSubmission" })}
      />
    </div>
  );
}

function MileageForm({
  snapshot,
  run,
}: {
  snapshot: JourneySnapshot;
  run: (name: string, command: any) => Promise<any>;
}) {
  const currentStep = snapshot.steps.find((step) => step.status === "current");
  const current = currentStep?.capabilityId;
  const mileage = snapshot.mileage;
  const actionable =
    ["active", "awaiting_user"].includes(snapshot.status) &&
    (currentStep?.assignedActor === "agent" || snapshot.lastGuidance?.stepId === currentStep?.id);
  return (
    <div className="expense-form mileage-form">
      <div className="form-section-title">
        <span>01</span>
        <div>
          <b>Route</b>
          <small>A separate on-demand workflow compiled from live mileage capabilities</small>
        </div>
      </div>
      <div className="form-grid">
        <TextPortalField
          anchor="mileage.origin"
          label="Starting point"
          value={mileage.origin}
          hint={`Required · use ${DEMO_MILEAGE.origin}`}
          active={actionable && current === "mileage.origin"}
          onCommit={(value) =>
            run("human_mileage.origin", {
              type: "UpdateMileageDraft",
              field: "origin",
              value,
            })
          }
        />
        <TextPortalField
          anchor="mileage.destination"
          label="Destination"
          value={mileage.destination}
          hint={`Required · use ${DEMO_MILEAGE.destination}`}
          active={actionable && current === "mileage.destination"}
          onCommit={(value) =>
            run("human_mileage.destination", {
              type: "UpdateMileageDraft",
              field: "destination",
              value,
            })
          }
        />
        <TextPortalField
          anchor={
            snapshot.portalVersion === "mileage.v2" ? "mileage.routeDistance" : "mileage.distance"
          }
          label="Distance"
          value={mileage.distanceMiles?.toString() ?? ""}
          type="number"
          hint={`0.1–1,000 miles · use ${DEMO_MILEAGE.distanceMiles}`}
          active={actionable && current === "mileage.distance"}
          parse={(value) => {
            const distance = Number(value);
            return Number.isFinite(distance) && distance >= 0.1 && distance <= 1000
              ? distance
              : null;
          }}
          onCommit={(value) =>
            run("human_mileage.distance", {
              type: "UpdateMileageDraft",
              field: "distanceMiles",
              value,
            })
          }
        />
        <TextPortalField
          anchor="mileage.date"
          label="Trip date"
          value={mileage.tripDate}
          placeholder="YYYY-MM-DD"
          hint={`Required · use ${DEMO_MILEAGE.displayDate}`}
          active={actionable && current === "mileage.date"}
          onCommit={(value) =>
            run("human_mileage.date", {
              type: "UpdateMileageDraft",
              field: "tripDate",
              value,
            })
          }
        />
      </div>
      <div className="form-divider" />
      <div className="form-section-title">
        <span>02</span>
        <div>
          <b>Policy details</b>
          <small>Explain the trip before reimbursement is calculated</small>
        </div>
      </div>
      <div className="form-grid">
        <div className="full-field">
          <TextPortalField
            anchor="mileage.purpose"
            label="Business purpose"
            value={mileage.purpose}
            hint={`Required · ${DEMO_MILEAGE.purpose}`}
            active={actionable && current === "mileage.purpose"}
            onCommit={(value) =>
              run("human_mileage.purpose", {
                type: "UpdateMileageDraft",
                field: "purpose",
                value,
              })
            }
          />
        </div>
        {snapshot.portalVersion === "mileage.v2" && (
          <div className="full-field">
            <SelectPortalField
              anchor="mileage.vehicleType"
              label="Vehicle type"
              value={mileage.vehicleType}
              hint="New in Portal v2 · required"
              active={actionable && current === "mileage.vehicleType"}
              options={[DEMO_MILEAGE.vehicleType, "Electric vehicle", "Motorcycle"]}
              onCommit={(value) =>
                run("human_mileage.vehicleType", {
                  type: "UpdateMileageDraft",
                  field: "vehicleType",
                  value,
                })
              }
            />
          </div>
        )}
      </div>
      <PrepareControl
        anchor="mileage.review"
        active={actionable && current === "mileage.prepare"}
        title={
          current === "mileage.prepare"
            ? "Prepare mileage for review"
            : "Reimbursement stays human-controlled"
        }
        description="Calculate the draft; final submission still requires you."
        onPrepare={() => run("human_mileage.prepare", { type: "PrepareMileageSubmission" })}
      />
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
