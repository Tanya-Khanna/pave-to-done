# pave.to(done) — Devpost Submission Copy

## Tagline

A WebMCP-native journey layer that lets people learn a web task, share it with an agent, or delegate it—and repairs the path when the app changes.

## Links

- **Live app:** https://pave-to-done.north-raincoat.workers.dev/demo
- **Source:** https://github.com/Tanya-Khanna/pave-to-done
- **Demo video:** add the public YouTube URL before submission

## What it does

Most web help lives outside the work. Documentation becomes stale, fixed product tours cannot share control, and computer-use agents guess from pixels. `pave.to(done)` turns the task itself into a shared, visible object between a person and an agent.

The same task supports three enforced agency modes:

- **SHOW ME:** the agent explains and highlights the current semantic control; the person acts.
- **DO IT WITH ME:** the person and agent alternate as judgment and risk change.
- **DO IT FOR ME:** the agent executes reversible work and stops at visible human-only consequences.

A journey may come from an expert recording or be composed on demand from the capabilities currently exposed by the page. When the site changes, the journey binds to meaning instead of coordinates: safe layout changes remap automatically, while a new material requirement pauses at a repair diff for human approval. Completed work and existing authority boundaries survive the repair.

The working demo is a fictional Acme Expense Portal. Ask it to submit an $86 client dinner under Project Atlas, change modes without restarting, then simulate Portal v2. The expense action moves from the sidebar to the header, which heals automatically. Portal v2 also adds a required business-purpose field, which requires a reviewed repair. The agent can prepare the final expense but cannot submit it; only the visible human control can cross that boundary.

## Why this is a strong fit for WebMCP

WebMCP is the collaboration layer, not an API attached after the fact. The top-level page imperatively registers narrow tools for current capabilities, journey state, guidance, execution, recording review, and repair. Those tools appear and disappear as route and task state change. Agent calls and human UI actions dispatch the same typed commands to one server-authoritative, revisioned journey.

Tool calls can change the visible page, request guidance that resolves to the current React element, and return verified postconditions from committed state. Read results are bounded and marked as untrusted where appropriate. Mutation calls carry operation IDs and expected revisions; retries reconcile before repeating. Sensitive confirmation, material-repair approval, recording start, and guide publication are deliberately absent from the WebMCP surface and enforced again by server policy.

Without WebMCP, the central experience disappears: the agent cannot discover the page's current meaning, operate the same visible journey as the person, follow the selected agency policy, or repair the path against the site's new capability manifest.

## What people and agents can now do together

A person can start in teaching mode, hand reversible steps to an agent, take back control for judgment, and delegate the remainder without restarting or copying context. When the application changes mid-task, both participants see the same preserved progress, the same repair, and the same approval boundary. Existing tours guide but do not share execution; autonomous agents execute but do not preserve a product-owned teaching path. This project makes instruction, collaboration, delegation, and maintenance one continuous journey.

## How it was built

The client uses React, TypeScript, and Vite. The WebMCP adapter registers 13 strict tools through `document.modelContext.registerTool`, with route-level and state-level `AbortController` cleanup. A semantic anchor registry connects tool capabilities to visible guidance without letting tool executors click the DOM.

Cloudflare Workers route each anonymous guest session to one Durable Object. The object serializes concurrent writes, enforces expected revisions and agency policy, stores exactly-once operation results, and appends a tamper-evident hash chain of domain events. The deterministic core follows `decide → events → evolve`, allowing replay and property testing. One-time expiring confirmation challenges protect final submission.

The release gate includes 10 unit, property, contract, and prompt-eval checks; 8 browser journeys; formatting, lint, and TypeScript checks; production build verification; and a live smoke test for security headers, idempotent retries, stale revisions, and persisted events.

## Better user experience

Users do not have to choose permanently between a tutorial and automation. They can move along an agency spectrum during one task and always see who has control, what changed, what was verified, and what still needs them. Voice input and spoken guidance have complete text fallbacks. Keyboard focus, live status announcements, reduced motion, responsive layouts, reset, loading, repair, approval, and completion states are built into the demo.

## Audience and potential impact

The initial audience is SaaS product, support, customer-education, and operations teams that repeatedly teach complex workflows while their product continues to change. One maintained semantic journey can serve a novice who needs instruction, a colleague who wants shared execution, and a power user who wants safe delegation. The hackathon build proves this focused experience with a fictional expense workflow; production identity, organization RBAC, real financial integrations, regional retention controls, and an embeddable SDK remain future work.

## Built with

WebMCP, React, TypeScript, Vite, Cloudflare Workers, Cloudflare Durable Objects, Zod, Vitest, fast-check, Playwright, and Lucide.

## Test prompt

> On this page, help me submit the $86 client dinner from yesterday to Project Atlas. Inspect the current state first, use the available site tools, explain consequential actions, and stop for my confirmation.

## Judge walkthrough

1. Open the live `/demo` page in ChatGPT's in-app browser.
2. Start the recorded guide in **SHOW ME** and ask the agent to inspect the current state and highlight the next step.
3. Switch the same journey to **DO IT WITH ME** and let the agent fill reversible fields.
4. Switch to **DO IT FOR ME** and ask it to prepare submission. Verify that no final-submit tool exists.
5. Use the visible human confirmation control.
6. Reset, start again, and select **Simulate Portal v2**.
7. Ask the agent to propose the repair. Review and approve the material change in the UI.
8. Open **Diagnostics** to see the current tool set, revision, manifest, operation outcome, and pending reconciliation count.
