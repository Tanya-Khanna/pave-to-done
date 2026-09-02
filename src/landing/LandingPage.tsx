import { useState } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  Clipboard,
  Code2,
  History,
  MousePointer2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  WandSparkles,
  Waypoints,
} from "lucide-react";
import { navigate } from "../app/App";

const judgePrompt =
  "Create an 18-mile mileage reimbursement with no recorded guide. Do reversible steps for me, stop before submission, and explain any repair if the portal changes.";

const modes = [
  {
    id: "show",
    number: "01",
    title: "Show me",
    copy: "The agent explains and highlights. You perform every action.",
    color: "coral",
    icon: MousePointer2,
    owner: "YOU",
    ownerCopy: "You click every step",
    sequence: ["YOU", "YOU", "YOU", "YOU"],
  },
  {
    id: "with",
    number: "02",
    title: "Do it with me",
    copy: "You and the agent alternate as judgment and risk change.",
    color: "amber",
    icon: Waypoints,
    owner: "AGENT",
    ownerCopy: "The agent has the next reversible step",
    sequence: ["AGENT", "YOU", "AGENT", "YOU"],
  },
  {
    id: "for",
    number: "03",
    title: "Do it for me",
    copy: "The agent completes reversible work. You approve the consequence.",
    color: "mint",
    icon: Sparkles,
    owner: "AGENT",
    ownerCopy: "The agent acts until risk changes",
    sequence: ["AGENT", "AGENT", "AGENT", "YOU"],
  },
] as const;

export function LandingPage() {
  const [activeMode, setActiveMode] = useState<(typeof modes)[number]["id"]>("with");
  const [portalVersion, setPortalVersion] = useState<"v1" | "v2">("v1");
  const [copied, setCopied] = useState(false);
  const mode = modes.find((candidate) => candidate.id === activeMode)!;

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(judgePrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="landing">
      <nav className="marketing-nav shell" aria-label="Primary navigation">
        <button className="wordmark" onClick={() => navigate("/")} aria-label="pave.to(done) home">
          pave.to<span>(done)</span>
        </button>
        <div className="nav-proof">
          <span className="live-dot" /> Built for WebMCP
        </div>
        <button className="text-link" onClick={() => navigate("/demo")}>
          Open live demo <ArrowRight size={15} />
        </button>
      </nav>

      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow">
            <span>THE JOURNEY LAYER FOR THE AGENTIC WEB</span>
          </div>
          <h1>
            From <em>“show me”</em>
            <br />
            to safely <strong>done.</strong>
          </h1>
          <p className="hero-lede">
            Teach any web task once—or ask for one on demand. Learn it, share control, or delegate
            it. When the product changes, the path repairs without losing progress or human
            authority.
          </p>
          <div className="hero-actions">
            <button className="button primary magnetic" onClick={() => navigate("/demo")}>
              Open the live journey <ArrowRight size={17} />
            </button>
            <a className="button ghost" href="/architecture.html">
              Explore the architecture
            </a>
          </div>
          <div className="proof-strip">
            <span>
              <Check size={14} /> Shared visible state
            </span>
            <span>
              <Check size={14} /> Semantic self-healing
            </span>
            <span>
              <Check size={14} /> Human-only consequence
            </span>
          </div>
        </div>

        <div className="hero-stage" aria-label="Animated journey preview">
          <svg
            className="route-map"
            viewBox="0 0 600 610"
            role="img"
            aria-label="A route connecting human, agent, repair, and completion"
          >
            <defs>
              <linearGradient id="routeGradient" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#ff705f" />
                <stop offset=".5" stopColor="#f6ce75" />
                <stop offset="1" stopColor="#9ce3c1" />
              </linearGradient>
              <filter id="routeGlow">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              className="route-shadow"
              d="M92 96 C255 38 477 83 475 218 C473 322 184 267 172 400 C163 500 340 529 510 485"
            />
            <path
              className="route-line"
              d="M92 96 C255 38 477 83 475 218 C473 322 184 267 172 400 C163 500 340 529 510 485"
            />
            <path
              className="route-progress"
              d="M92 96 C255 38 477 83 475 218 C473 322 184 267 172 400 C163 500 340 529 510 485"
            />
            <circle className="route-runner" r="8" fill="#ff705f" filter="url(#routeGlow)">
              <animateMotion
                dur="7s"
                repeatCount="indefinite"
                path="M92 96 C255 38 477 83 475 218 C473 322 184 267 172 400 C163 500 340 529 510 485"
              />
            </circle>
          </svg>
          <div className="route-node node-human">
            <small>YOU</small>
            <b>Set the goal</b>
            <span>judgment + approval</span>
          </div>
          <div className="route-node node-agent">
            <small>AGENT</small>
            <b>Take the next move</b>
            <span>structured WebMCP action</span>
          </div>
          <div className="route-node node-change">
            <small>PORTAL V2</small>
            <b>The interface changed</b>
            <span>meaning stayed stable</span>
          </div>
          <div className="route-node node-done">
            <span className="done-check">
              <Check size={18} />
            </span>
            <div>
              <small>VERIFIED</small>
              <b>Done at revision 18</b>
            </div>
          </div>
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
        </div>
      </section>

      <section className="modes-section shell" aria-labelledby="modes-title">
        <div className="section-heading">
          <span>ONE TASK · YOUR CONTROL</span>
          <h2 id="modes-title">
            Agency is a spectrum,
            <br />
            not a switch.
          </h2>
        </div>
        <div className="mode-grid" role="group" aria-label="Preview an agency mode">
          {modes.map(({ id, number, title, copy, color, icon: Icon }) => (
            <button
              className={`mode-card ${color} ${activeMode === id ? "selected" : ""}`}
              key={title}
              onClick={() => setActiveMode(id)}
              aria-pressed={activeMode === id}
            >
              <header>
                <span>{number}</span>
                <Icon size={22} />
              </header>
              <h3>{title}</h3>
              <p>{copy}</p>
              <div className="mode-line" />
            </button>
          ))}
        </div>
        <div className={`mode-preview ${mode.color}`} aria-live="polite">
          <div className="preview-task">
            <span>LIVE CONTROL PREVIEW</span>
            <b>Create an 18-mile reimbursement</b>
            <small>Reversible actions can move. Submission never does.</small>
          </div>
          <div className="preview-baton" data-owner={mode.owner.toLowerCase()}>
            <div>
              <UserRound size={19} />
              <span>YOU</span>
            </div>
            <div className="baton-track">
              <i />
            </div>
            <div>
              <Bot size={19} />
              <span>AGENT</span>
            </div>
          </div>
          <div className="preview-owner">
            <small>CONTROL IS WITH</small>
            <strong>{mode.owner}</strong>
            <span>{mode.ownerCopy}</span>
          </div>
          <ol className="preview-sequence">
            {mode.sequence.map((owner, index) => (
              <li key={`${owner}-${index}`}>
                <span>{index + 1}</span>
                <b>{["Route", "Purpose", "Prepare", "Submit"][index]}</b>
                <small className={owner.toLowerCase()}>{owner}</small>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="convergence-section shell" aria-labelledby="convergence-title">
        <div className="section-heading compact">
          <span>TWO STARTS · ONE SAFE RUNTIME</span>
          <h2 id="convergence-title">Teach once. Or start now.</h2>
        </div>
        <div className="convergence-map">
          <article>
            <span className="source-icon recorded">
              <History size={19} />
            </span>
            <small>RECORDED GUIDE</small>
            <h3>An expert demonstrates once</h3>
            <p>Accepted semantic actions become a reviewable guide—never a brittle pixel replay.</p>
          </article>
          <div className="convergence-arrow">
            <ArrowRight />
          </div>
          <article className="runtime-card">
            <span className="runtime-live">LIVE</span>
            <small>JOURNEY RUNTIME</small>
            <h3>Same policies. Same repair engine.</h3>
            <div>
              <span>semantic capabilities</span>
              <span>authoritative revision</span>
              <span>human boundary</span>
            </div>
          </article>
          <div className="convergence-arrow reverse">
            <ArrowRight />
          </div>
          <article>
            <span className="source-icon demand">
              <WandSparkles size={19} />
            </span>
            <small>PLANNED FOR THIS SESSION</small>
            <h3>No guide? Compose from live tools</h3>
            <p>
              The agent validates a task-specific path against capabilities the page exposes now.
            </p>
          </article>
        </div>
      </section>

      <section className="healing-section shell">
        <div className={`healing-visual interactive ${portalVersion}`}>
          <div className="healing-toolbar">
            <span>SEMANTIC ANCHOR LAB</span>
            <div role="group" aria-label="Portal version">
              <button
                className={portalVersion === "v1" ? "active" : ""}
                onClick={() => setPortalVersion("v1")}
                aria-pressed={portalVersion === "v1"}
              >
                V1
              </button>
              <button
                className={portalVersion === "v2" ? "active" : ""}
                onClick={() => setPortalVersion("v2")}
                aria-pressed={portalVersion === "v2"}
              >
                V2
              </button>
            </div>
          </div>
          <div className="portal-mock sidebar-anchor">
            <small>{portalVersion === "v1" ? "SIDEBAR" : "OLD LOCATION"}</small>
            <b>{portalVersion === "v1" ? "+ New expense" : "Moved safely"}</b>
          </div>
          <div className="portal-mock header-anchor">
            <small>{portalVersion === "v2" ? "HEADER" : "NEXT VERSION"}</small>
            <b>{portalVersion === "v2" ? "+ Add expense" : "Waiting"}</b>
          </div>
          <div className="semantic-tether">
            <span />
            <code>expense.create</code>
          </div>
          <div className="repair-pulse">
            <RefreshCw size={24} />
            <span>
              semantic
              <br />
              repair
            </span>
          </div>
          <div className={`material-change ${portalVersion === "v2" ? "revealed" : ""}`}>
            <ShieldCheck size={18} />
            <span>New required field</span>
            <strong>{portalVersion === "v2" ? "Needs your review" : "Not present in V1"}</strong>
          </div>
        </div>
        <div className="healing-copy">
          <div className="eyebrow">SELF-HEALING JOURNEYS</div>
          <h2>
            Pixels move.
            <br />
            Meaning survives.
          </h2>
          <p>
            Switch the live visual from V1 to V2. The same capability moves to a new semantic
            anchor, while a material requirement appears separately and pauses for review.
          </p>
          <button className="text-link coral-link" onClick={() => navigate("/demo")}>
            Break the real demo on purpose <ArrowRight size={15} />
          </button>
        </div>
      </section>

      <section className="webmcp-proof" aria-labelledby="webmcp-title">
        <div className="shell">
          <div className="proof-heading">
            <span className="eyebrow">WHY WEBMCP</span>
            <h2 id="webmcp-title">
              The page is the shared
              <br />
              object of work.
            </h2>
            <p>
              Human clicks and agent tools enter one command path, commit one authoritative
              revision, and stop at the same visible safety boundary.
            </p>
          </div>
          <div className="shared-state-diagram">
            <div className="participant human">
              <UserRound size={20} />
              <span>HUMAN UI</span>
              <b>click</b>
            </div>
            <div className="command-core">
              <i />
              <small>AUTHORITATIVE</small>
              <strong>revision 7</strong>
              <span>event accepted</span>
            </div>
            <div className="participant agent">
              <Bot size={20} />
              <span>CHATGPT</span>
              <b>tool call</b>
            </div>
          </div>
          <div className="tool-proof-grid">
            <article>
              <Code2 size={17} />
              <div>
                <code>get_journey()</code>
                <span>READ ONLY</span>
              </div>
              <p>Reads the current revision and next control boundary.</p>
            </article>
            <article className="active">
              <Code2 size={17} />
              <div>
                <code>update_mileage_draft()</code>
                <span>DYNAMIC</span>
              </div>
              <p>Exists only when the current bounded step permits the agent.</p>
            </article>
            <article className="boundary">
              <ShieldCheck size={17} />
              <div>
                <code>prepare_mileage_submission()</code>
                <span>STOPS HERE</span>
              </div>
              <p>Prepares visible review. No WebMCP tool can submit.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="judge-prompt-section shell" aria-labelledby="judge-prompt-title">
        <div>
          <span className="eyebrow">TRY THE NON-TRIVIAL PATH</span>
          <h2 id="judge-prompt-title">Give the browser agent this prompt.</h2>
          <p>It exercises on-demand planning, delegation, a human boundary, and self-healing.</p>
        </div>
        <div className="judge-prompt-card">
          <Clipboard size={18} />
          <p>{judgePrompt}</p>
          <button onClick={() => void copyPrompt()} aria-label="Copy judge prompt">
            {copied ? <Check size={15} /> : <Clipboard size={15} />}
            {copied ? "Copied" : "Copy prompt"}
          </button>
        </div>
      </section>

      <section className="final-cta">
        <div className="shell">
          <span>THE NEXT WEB TASK IS ALREADY WAITING</span>
          <h2>Choose the control. Keep the consequence.</h2>
          <p>Run the live guest journey—no account, extension, or recorded guide required.</p>
          <button className="button light" onClick={() => navigate("/demo")}>
            Start in the shared surface <ArrowRight size={17} />
          </button>
        </div>
      </section>

      <footer className="marketing-footer shell">
        <div className="wordmark">
          pave.to<span>(done)</span>
        </div>
        <p>Teach once. Assist at any level. Stay correct.</p>
        <span>WebMCP Challenge · 2026</span>
      </footer>
    </main>
  );
}
