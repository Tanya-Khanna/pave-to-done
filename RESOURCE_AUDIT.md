# WebMCP Challenge Resource Audit

**Reviewed:** September 1, 2026  
**Purpose:** convert every relevant official challenge/resource link into a concrete product, engineering, testing, or submission decision for `pave.to(done)`

**Audit scope:** every challenge requirement, FAQ, protocol document, official implementation guide, security/evaluation/debug guide, example/starter, and supporter engineering resource linked from the challenge pages. Login, social sharing, calendar export, credit-redemption forms, generic pricing pages, legal footers, and community-contact links were checked for submission relevance but are not treated as engineering sources.

## 1. Challenge and submission material

### [Challenge overview](https://webmcp.devpost.com/)

What matters:

- The theme is a web app that becomes meaningfully better when people and agents interact, collaborate, and create together.
- Stage Two weights WebMCP leverage, execution, potential impact, and creativity/ambition equally.
- The live URL must work in ChatGPT's in-app browser or supported Chrome.
- The text must explain WebMCP fit, UX improvement, new human-agent capability, and implementation.
- A public repository with all source/instructions and a visible open-source license is required.
- A public YouTube demo under three minutes with audio must show the project functioning and its WebMCP use.
- The judges span browser platforms, WebMCP/MCP, applied AI, frontend frameworks, commerce, edge infrastructure, and deployment.

Applied decision:

- One shared visible journey is the product's center. The human changes mode, acts, teaches, approves, and confirms; the agent inspects, plans, guides, performs reversible work, and proposes repairs.
- Repository evidence must satisfy protocol/browser reviewers; the live experience must satisfy product/frontend reviewers.

### [Official rules](https://webmcp.devpost.com/rules)

What matters:

- Stage One is a pass/fail viability and required-technology gate.
- The app must run consistently as depicted.
- Judges may decide from the description, repository, images, and video without rebuilding the project.
- Testing must remain free and available during judging.
- The official deadline is September 3, 2026 at 1:00 p.m. PDT.

Applied decision:

- Guest sessions require no credentials, payment, or model key.
- The README and video expose the complete proof without relying on a judge to inspect hidden functionality.
- Freeze the exact tagged repo/deployment/submission before the deadline.

### [Challenge resources and FAQ](https://webmcp.devpost.com/resources)

What matters:

- Chrome 149+ testing flag and ChatGPT's in-app browser are the named test surfaces.
- Existing projects must document qualifying new WebMCP work; this repository begins as a new project.
- Hosting is platform-neutral; supporter credits are optional.
- Public source and visible license are mandatory.

Applied decision:

- Test both named browsers, include exact prompts, and show registered tools in diagnostics.
- Use a supporter platform only when it improves architecture. Cloudflare Workers/Durable Objects provide serialized server state; they are not included as a scoring gimmick.

### [Challenge updates](https://webmcp.devpost.com/updates)

What matters:

- The organizers' halfway guidance expects registered tools already called by an agent, an end-to-end flow, a deployment, a licensed public repo, and a video plan before final polish.

Applied decision:

- Day 1 noon is a hard deployed-agent gate. Landing animation stops if the real tool loop is not working.

## 2. WebMCP specification and platform model

### [WebMCP repository and explainer](https://github.com/webmachinelearning/webmcp)

What matters:

- WebMCP is client-side and keeps the web UI, active page context, authentication, and human control in the loop.
- Its primary goal is cooperative local-browser work, not headless or fully autonomous operation.
- Imperative tools use `document.modelContext.registerTool` and reuse existing application logic.
- Registration and execution support `AbortSignal`.
- Tool availability can change dynamically and emits `toolchange` in the broader specification.
- Origins, permissions policy, document lifecycle, and cancellation are platform concerns.

Applied decision:

- Register in the top-level demo route, reuse one typed command path, dynamically scope mutation tools, abort them on route/state teardown, and propagate execution cancellation.
- Keep the human web interface primary in all three modes.

### [WebMCP specification draft](https://webmachinelearning.github.io/webmcp/)

What matters:

- The current IDL includes `readOnlyHint`, `untrustedContentHint`, registration abort signals, execution abort signals, origin exposure controls, and permissions policy.
- Registration can reject for duplicate names, inactive documents, disallowed policy, unsafe origins, or invalid serialization.
- The standard remains a draft with open error/elicitation questions.

Applied decision:

- Catch and display registration failures, prove Strict Mode remount cleanup, keep same-origin exposure, and define a product-level error taxonomy rather than depending on unstable browser error detail.

### [Implementation status](https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md)

What matters:

- Chrome 149 has an origin trial; browser support remains experimental and version-dependent.

Applied decision:

- Feature detection and a normal manual interface are mandatory. README instructions pin the tested browser/setup and record the test date.

### [Security and privacy questionnaire](https://github.com/webmachinelearning/webmcp/blob/main/security-privacy-questionnaire.md)

What matters:

- Tool inputs/outputs cross a new agent trust boundary.
- Built-in agents and explicitly authorized origins can invoke registered callbacks.
- Permissions policy, trustworthy origins, and origin isolation are relevant.
- Multi-origin agents may carry state between origins.

Applied decision:

- Use same-origin tools only, a restrictive Permissions Policy/CSP, no sensitive values in outputs, and server authorization independent of the agent's text.

## 3. OpenAI guidance

### [ChatGPT Site Tools](https://learn.chatgpt.com/docs/webmcp)

What matters:

- Site tools use the live page and its current session.
- ChatGPT currently supports imperative tools registered in the top-level page.
- Declarative tools and iframe-registered tools are not currently discovered.
- Inputs should be narrow; side effects should be clear; results should verify changes.
- Existing authentication, authorization, and validation must remain in force.
- Each invocation receives safety review, but site definitions/results remain untrusted.

Applied decision:

- The Acme portal and guide dock are top-level React components, not an iframe.
- All 13 tools are imperative, task-specific, bounded, state-verified, and backed by server policy.
- Human confirmation remains a normal visible application control.

### [OpenAI WebMCP showcase](https://developers.openai.com/showcase?view=webmcp-apps)

What matters:

- The strongest showcased interaction pattern keeps an editable or inspectable artifact visible while the agent contributes structured work.

Applied decision:

- The journey, repair diff, action trail, and portal state are shared artifacts. The agent does not disappear into a background automation run.

## 4. Chrome implementation, security, debugging, and evaluation

### [Chrome WebMCP guide](https://developer.chrome.com/docs/ai/webmcp)

What matters:

- WebMCP requires origin-isolated documents and the `tools` Permissions Policy.
- Tool discovery requires visiting the page.
- Complex interfaces may need explicit application-state refactoring.
- The Chrome inspector can verify registration, schemas, manual calls, outputs, and agent selection.

Applied decision:

- Send `Origin-Agent-Cluster: ?1`, avoid `document.domain`, use `tools=(self)`, display origin/lifecycle diagnostics, and model application state explicitly.

### [Chrome origin trial](https://developer.chrome.com/blog/ai-webmcp-origin-trial)

What matters:

- Browser availability is experimental and the flag/origin-trial path can change.

Applied decision:

- The demo is validated in both the challenge's ChatGPT path and current Chrome testing path. Browser setup is documented rather than assumed.

### [Chrome tool security guide](https://developer.chrome.com/docs/ai/webmcp/secure-tools)

What matters:

- Prompt injection cannot be made impossible by model quality.
- UGC/external data should carry `untrustedContentHint`; reads should carry `readOnlyHint`.
- Cross-origin exposure should be explicit and narrow.
- Recommended budgets are 30 characters for names, 150 per parameter description, 500 per tool description, and 1.5 KB per output.

Applied decision:

- Receipt notes and recording narration are marked untrusted, treated only as data, and tested with injected instructions.
- Tool/result budgets are automated contract tests; no cross-origin exposure is configured.

### [Chrome WebMCP eval guidance](https://developer.chrome.com/docs/ai/webmcp/evals)

What matters:

- Evaluate tool purpose/selection, argument prediction, logic/output, multi-step order, complete application state, direct and ambiguous prompts, deterministic logic, probabilistic model calls, end-to-end paths, and mid-chain failures.
- A failed mid-chain discount must not be followed by full-price checkout; downstream action must respect failure state.

Applied decision:

- Tests cover direct, ambiguous, adversarial, out-of-order, and mode-conflicting prompts.
- A failed material repair or missing field blocks later mutation. Mid-chain failures are first-class state, not toast messages.

### [Chrome DevTools WebMCP panel](https://developer.chrome.com/docs/devtools/application/webmcp)

What matters:

- The panel shows live tools and chronological calls with input, output, completion, cancellation, progress, and error status.

Applied decision:

- Capture a lifecycle screenshot/trace for the README and show a concise parallel diagnostic view in-product.

### [Google Chrome WebMCP demos](https://github.com/GoogleChromeLabs/webmcp-tools/tree/main/demos)

What matters:

- Official demos use state-dependent tool surfaces and human-in-the-loop confirmation for consequential completion.

Applied decision:

- Expose read tools continuously and mutation tools only in valid phases. `prepare_expense_submission` produces a human confirmation boundary instead of a finalizing tool.

### [Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance)

What matters:

- Prefer native platform primitives, responsive fallbacks, performance-aware work scheduling, semantic forms, accessible validation, ResizeObserver, modern CSS layout, and reduced motion.

Applied decision:

- Use semantic HTML/dialog/popover where reliable, ResizeObserver for anchors, CSS/SVG for most motion, captions/text fallback, and performance/accessibility gates.

## 5. Supporter implementations

### [Cloudflare WebMCP overview](https://blog.cloudflare.com/webmcp/)

What matters:

- WebMCP can make structured browser actions faster and less brittle than screenshot-click loops.
- Cloud-based browser tooling can also discover and invoke page tools.

Applied decision:

- The product's semantic capability registry, rather than visual click automation, is the healing foundation.

### [Cloudflare Browser Run WebMCP](https://developers.cloudflare.com/browser-run/features/webmcp/)

What matters:

- Tool lists can change after actions; clients should list tools again after state changes.
- Human confirmation requires a live browser surface.
- Current Browser Run WebMCP sessions are experimental and not appropriate as the production application runtime.

Applied decision:

- Use Browser Run only as an optional testing surface, never as the app's production agent runtime. Dynamic tool changes are visible in diagnostics.

### [Cloudflare challenge page](https://webmcp-challenge.examples.workers.dev/) and [React starter](https://github.com/cloudflare/agents/tree/main/examples/webmcp-react)

What matters:

- The starter demonstrates Vite/React on Workers, shared human/agent actions, route/component lifecycle cleanup, Zod-derived schemas, runtime validation, tests, and optional durable data.
- It explicitly states that the exposed browser schema is not a validation boundary.

Applied decision:

- Start from the Worker/Vite integration pattern, use Zod as contract source, validate again on the server, and add Durable Objects because journey correctness depends on serialized durable state.

### [Vercel Shop source](https://github.com/vercel/shop), [WebMCP pull request](https://github.com/vercel/shop/pull/498), and [live storefront](https://template.vercel.shop/)

What matters:

- The implementation progressively registers tools, uses AbortSignal cleanup, validates again in server actions, resolves exact available resources, serializes writes, bounds/redacts outputs, preserves existing anti-bot paths, and labels ambiguous mutation outcomes unsafe to retry.
- Tests cover output budgets, exact resolution, serialized mutation, redaction, lifecycle remounts, and ambiguous outcomes.

Applied decision:

- `pave.to(done)` adds operation IDs, expected revisions, serialized Durable Object commands, bounded/redacted results, lifecycle remount tests, and explicit unknown-outcome reconciliation.

### [Shopify WebMCP tools](https://shopify.dev/docs/api/web-mcp) and [agentic commerce](https://shopify.dev/docs/agents)

What matters:

- Commerce tools separate discovery, cart mutation, and consequential checkout; domain identifiers and current availability matter.

Applied decision:

- Separate state discovery, reversible expense drafting, preparation, and human confirmation. Tools use semantic IDs and current availability rather than broad “complete task” payloads.

### [Angular WebMCP guidance](https://angular.dev/ai/webmcp)

What matters:

- Route-scoped tools must be automatically cleaned up or they can remain exposed after navigation.
- Dynamic registration has name-collision risks; form schemas still need runtime safety.

Applied decision:

- Maintain explicit route/state controllers, stable unique names, cleanup/remount tests, and server validation.

### [Render Workflows](https://render.com/docs/workflows)

What matters:

- Durable background workflows emphasize retries, checkpoints, and observability, but are designed for server-side jobs rather than this browser-local collaboration surface.

Applied decision:

- Do not add Render Workflows. The relevant reliability concepts—idempotency, checkpoints, and recovery—belong in the journey coordinator without moving control away from the live page.

### [Netlify hosting guidance](https://docs.netlify.com/start/choose-your-path/) and [WebMCP starter](https://webmcp-starter.netlify.app/)

What matters:

- Netlify provides a straightforward deployment path and challenge starter, but platform use is optional.

Applied decision:

- Netlify remains a contingency host. Cloudflare is selected because Durable Objects materially support concurrent human-agent journey correctness, not because a supporter logo affects the rubric.

## 6. Resulting engineering bar

The source audit produces these non-negotiable properties:

1. top-level imperative WebMCP tools;
2. route- and state-scoped registration with abort cleanup;
3. server-authoritative policy and runtime validation;
4. shared commands for human UI and agent tools;
5. serialized revisioned mutations and idempotency;
6. cancellation and ambiguous-outcome recovery;
7. append-only replayable events and visible audit history;
8. versioned semantic capabilities and constrained healing;
9. human-only consequential completion;
10. untrusted-content annotations, redaction, and output budgets;
11. deterministic, property-based, integration, prompt, and end-to-end tests; and
12. a complete manual fallback and accessible live interface.
