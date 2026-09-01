import {
  ArrowRight,
  Check,
  MousePointer2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { navigate } from "../app/App";

const modes = [
  {
    number: "01",
    title: "Show me",
    copy: "The agent explains and highlights. You perform every action.",
    color: "coral",
    icon: MousePointer2,
  },
  {
    number: "02",
    title: "Do it with me",
    copy: "You and the agent alternate as judgment and risk change.",
    color: "amber",
    icon: Waypoints,
  },
  {
    number: "03",
    title: "Do it for me",
    copy: "The agent completes reversible work. You approve consequence.",
    color: "mint",
    icon: Sparkles,
  },
];

export function LandingPage() {
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
            Teach a web workflow once—or ask for one on demand. Learn it, share control, or delegate
            it. When the product changes, the path repairs without losing progress or human
            authority.
          </p>
          <div className="hero-actions">
            <button className="button primary magnetic" onClick={() => navigate("/demo")}>
              Run the expense journey <ArrowRight size={17} />
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

      <section className="modes-section shell">
        <div className="section-heading">
          <span>ONE TASK · YOUR CONTROL</span>
          <h2>
            Agency is a spectrum,
            <br />
            not a switch.
          </h2>
        </div>
        <div className="mode-grid">
          {modes.map(({ number, title, copy, color, icon: Icon }) => (
            <article className={`mode-card ${color}`} key={title}>
              <header>
                <span>{number}</span>
                <Icon size={22} />
              </header>
              <h3>{title}</h3>
              <p>{copy}</p>
              <div className="mode-line" />
            </article>
          ))}
        </div>
      </section>

      <section className="healing-section shell">
        <div className="healing-visual">
          <div className="manifest old">
            <span>PORTAL V1</span>
            <b>sidebar.newExpense</b>
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
          <div className="manifest new">
            <span>PORTAL V2</span>
            <b>header.addExpense</b>
            <code>expense.create</code>
          </div>
          <div className="material-change">
            <ShieldCheck size={18} />
            <span>New required field</span>
            <strong>Needs your review</strong>
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
            Steps bind to semantic capabilities and verified outcomes. Safe layout changes remap
            automatically. New requirements pause at a visible repair boundary.
          </p>
          <button className="text-link coral-link" onClick={() => navigate("/demo")}>
            Break the demo on purpose <ArrowRight size={15} />
          </button>
        </div>
      </section>

      <section className="webmcp-statement">
        <div className="shell statement-inner">
          <span className="eyebrow">WHY WEBMCP</span>
          <h2>
            The page is not a backdrop.
            <br />
            <em>It is the shared object.</em>
          </h2>
          <p>
            Human clicks and agent tool calls enter one command path, update one authoritative
            revision, and remain visible to both participants.
          </p>
          <button className="button light" onClick={() => navigate("/demo")}>
            See the shared state <ArrowRight size={17} />
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
