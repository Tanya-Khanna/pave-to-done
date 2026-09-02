# pave.to(done) — Product Requirements Document

**Version:** Submission scope v1.0  
**Date:** September 1, 2026  
**Hackathon:** The WebMCP Challenge  
**External deadline:** September 3, 2026 at 1:00 p.m. PDT / 4:00 p.m. EDT  
**Product line:** Teach once. Assist at any level. Stay correct as software changes.

> **Implementation audit — September 1, 2026:** ~~Struck-through items~~ ✅ are verified by the shipped source, automated tests, or the permanent live deployment. Unstruck items are incomplete, only partially implemented, or still require human/browser verification. A combined line remains unstruck if any part of it is unproven.

## 1. Executive decision

`pave.to(done)` is an adaptive, in-product guide and execution layer for web software. A person describes a task in natural language and chooses how much help they want:

- **SHOW ME:** the agent explains and highlights; the person performs each action.
- **DO IT WITH ME:** the person and agent alternate according to risk and judgment.
- **DO IT FOR ME:** the agent performs permitted actions and pauses for sensitive approval.

The journey can begin from an expert-recorded guide or be planned from the website's current capabilities with no recording. If the website changes, the journey resolves its steps against live semantic capabilities, preserves completed work, and either remaps safely or asks a person to approve a material repair. A repair may change the route, but it may never silently expand the agent's authority.

The submission is a complete vertical slice inside a fictional **Acme Expense Portal**. The product itself is general; the expense workflow makes its value, safety model, and self-healing behavior concrete enough to test in under three minutes.

### Product promise

> Record a workflow once—or ask for a new task. Learn it, complete it with an agent, or delegate it. When the software changes, the journey adapts without losing progress or control.

### Why this is the chosen concept

The hackathon asks for an app that becomes meaningfully better when people and agents use it together. This concept makes the visible webpage the shared work surface. The agent reads structured application state, constructs or follows a journey, moves the product through real state transitions, and returns control to the person at the right moments. The person can act directly, change the agency level, teach a reusable workflow, inspect repairs, and approve sensitive consequences. Neither participant can provide the same experience alone.

## 2. Problem and audience

Modern web products force people to choose between three imperfect forms of help:

1. Documentation and videos explain a workflow outside the live product and become stale when the interface changes.
2. Tours and tooltips follow a fixed script, rarely understand the user's actual goal, and cannot complete work.
3. Computer-use agents can act, but often infer intent from pixels, obscure what they changed, and offer an all-or-nothing level of control.

The practical result is repeated support tickets, one-to-one training, abandoned tasks, unsafe delegation, and brittle automation.

### Primary audience

**SaaS product, customer education, support, and operations teams** responsible for helping users complete complex workflows in frequently changing web applications.

### End users

- A new employee completing an unfamiliar internal process.
- An occasional user who remembers the goal but not the steps.
- A power user who wants to delegate repetitive work but retain approval over consequential actions.
- An expert who wants to teach a workflow once and make that knowledge reusable.

### Job to be done

> When I need to complete an unfamiliar or repetitive task in a changing web app, help me at the level I choose, keep me oriented in the actual interface, and never take a sensitive action without clear control.

### Submission's specific demonstration

An employee asks:

> “Submit my $86 client dinner from yesterday under Project Atlas.”

The employee can use any of the three modes. A pre-approved expense guide is available, but a second task can be planned on demand without one. Mid-journey, the fictional portal is updated: navigation moves and a new required business-purpose field appears. `pave.to(done)` remaps the moved controls, identifies the material requirement, proposes a repair, preserves completed steps, and continues only after review. Final submission always requires a human confirmation.

## 3. Goals and non-goals

### Submission goals

1. ~~Demonstrate a non-trivial WebMCP implementation in which agent tool calls and direct human actions modify the same visible application state.~~ ✅
2. ~~Make all three agency modes materially different and allow switching modes without restarting.~~ ✅
3. ~~Support both expert-recorded and on-demand journeys.~~ ✅
4. Demonstrate self-healing for one cosmetic change and one material workflow change in every agency mode.
5. ~~Enforce a clear authority boundary: reversible actions may be delegated; sensitive actions require a person.~~ ✅
6. ~~Deliver a polished, coherent live product with voice, accessible visual guidance, graceful fallbacks, and a resettable guest demo.~~ ✅
7. Make the WebMCP implementation easy for judges to discover, test, and verify from the live URL, video, README, and source.

### Explicit non-goals for the hackathon build

- Arbitrary automation across websites that have not integrated the product.
- A browser extension, native desktop overlay, or pixel-only computer-use model.
- Authentication, organizations, billing, team permissions, or a workflow marketplace.
- Model training, crowdsourced learning, analytics dashboards, or production storage.
- Multi-agent team chat, coding-agent coordination, or an agent benchmark arena.
- Perfect voice recognition in every browser or voice-only approval.
- A general workflow editor with branches, loops, variables, and every enterprise policy primitive.

These exclusions are deliberate. The entry needs one undeniable, finished collaborative loop rather than a broad collection of partially working features.

## 4. Product principles

### The page is the shared object

Guidance, progress, agent actions, human actions, policy, and repair state appear in the same live interface. WebMCP is not a remote control bolted onto an existing product.

### Agency is a spectrum the person controls

The person may change modes at any point. Completed work remains complete, and moving to a more autonomous mode never bypasses an existing approval.

### Teach once is an accelerator, not a prerequisite

A recorded guide improves reuse and organizational consistency. If no guide exists, the agent can inspect current capabilities and propose a valid journey for the task at hand.

### Meaning survives layout changes

Journey steps reference semantic capability IDs and pre/postconditions, not CSS selectors or screen coordinates. Visual anchors are presentation mappings for the current version.

### Repair cannot expand authority

Cosmetic remapping may be automatic. New data requirements, cost, permissions, or consequences require visible review. Sensitive effects always fail closed.

### Every agent action is legible

The interface shows what the agent is doing, why, what changed, and who has control. In delegated mode, it uses an action trail rather than pretending to be a human cursor.

## 5. Core experience

### 5.1 Entry and task creation

The demo opens in a resettable guest session. The person sees the expense portal as the main work surface and a compact `pave.to(done)` dock. They may:

- ~~type or speak a task;~~ ✅
- ~~choose a mode before starting;~~ ✅
- ~~select a recorded guide; or~~ ✅
- ~~choose **Plan from this live app** when no guide applies.~~ ✅

The dock explains whether the journey is recorded or on demand. It never claims an on-demand plan has been expert-approved.

### 5.2 SHOW ME

The agent reads application state and displays one current step. The guidance system combines:

- a spotlight that lowers irrelevant visual noise;
- ~~a semantic outline around the actual target;~~ ✅
- ~~a small pulsing attention marker;~~ ✅
- ~~a deliberately omitted ghost-cursor gesture: simulated pointer movement could imply an action occurred and adds no information beyond the semantic target, so the production interaction does not use one;~~ ✅
- ~~an anchored coach card with action, reason, and expected result;~~ ✅
- ~~a progress rail; and~~ ✅
- ~~a control baton labeled **Your turn**.~~ ✅

The person performs the action. The domain action updates state, the step's postcondition is verified, and the guide advances. The WebMCP agent cannot use domain mutation tools while SHOW ME is active.

### 5.3 DO IT WITH ME

The journey assigns each step according to policy:

- ~~the agent may read state and complete explicitly reversible steps;~~ ✅
- ~~the person supplies judgment, missing information, and sensitive decisions;~~ ✅
- ~~the control baton moves between **Your turn** and **Agent's turn**;~~ ✅
- either participant can pause or ask why;
- the person can take over an agent-assigned reversible step.

The interface explains the next handoff before it occurs. Alternation is derived from the work, not imposed after every click.

### 5.4 DO IT FOR ME

The agent executes current permitted steps and writes a compact action trail:

- `Found receipt: Bistro North, $86.00`
- `Created draft`
- `Set project: Atlas`
- `Prepared submission`
- `Waiting for your confirmation`

The person can pause, inspect the draft, undo reversible edits, or lower the agency level. Final submission opens a normal in-page confirmation card containing the amount, category, project, and consequence. No WebMCP tool can click the final confirmation on the person's behalf.

### 5.5 Switching modes

Mode changes take effect at the next safe boundary. The journey recomputes actors for all incomplete steps, preserves completed steps and entered data, and records the mode change in the action trail. Switching never erases a pending approval or approves a repair.

### 5.6 Voice

Voice is an input and feedback channel, not a separate product mode.

- The person may dictate a goal, ask a question, say “pause,” or change modes.
- Speech output reads concise instructions, warnings, and approval summaries.
- Every voice interaction has visible text, captions, mute, and keyboard controls.
- Sensitive confirmation requires an explicit in-page control; speech alone cannot finalize it.
- Unsupported speech recognition falls back to text without blocking the core journey.

## 6. Journey sources

### 6.1 Expert-recorded journey

An expert deliberately starts recording. The persistent recording indicator names what is captured. The application records semantic domain events, not raw keystrokes or video:

- capability invoked;
- safe, redacted arguments;
- state before and after;
- inferred precondition and postcondition;
- target semantic anchor;
- risk level; and
- optional typed or dictated narration.

Sensitive field values and credentials are excluded. When recording stops, the trace becomes a draft. An agent can read the structured trace through WebMCP and propose clear steps; a deterministic local fallback can preserve the ordered events if no agent is present. The expert reviews and publishes the guide. Publication is human-only.

### 6.2 On-demand journey

When no guide exists, the agent reads the current app context, capabilities, policies, and goal. It proposes a journey whose steps must reference registered capability IDs and valid risk classes. The application validates the plan before displaying or executing it. It is labeled **Planned for this session**.

After successful completion, the person may save it as a draft for expert review. It does not silently become approved organizational knowledge.

## 7. Self-healing

### 7.1 Semantic mechanism

Each journey step carries a stable `capabilityId`, preconditions, postconditions, risk, and authority rule. Each product version maps capability IDs to current UI anchors and domain actions. On every step transition, the journey engine checks current application version and state.

### 7.2 Change classes

| Change                           | Example                                                                                   | Behavior                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Cosmetic                         | “New expense” moved from sidebar to a top action and changed label                        | Resolve the same capability ID to the new anchor, animate the guide moving, and continue.    |
| Structural but non-consequential | A previously separate category step moved into the draft form                             | Recompute step order, preserve satisfied postconditions, and explain the shortcut.           |
| Material                         | A business-purpose field becomes required                                                 | Pause, present the missing requirement and proposed step, and require repair approval.       |
| Sensitive                        | Submission now creates a charge, changes permissions, or adds an irreversible consequence | Block execution and require explicit human review; never infer approval from an older guide. |
| Unresolvable                     | Capability removed or conflicting state                                                   | Mark the journey blocked and provide a precise recovery request.                             |

### 7.3 Behavior across agency modes

| Mode          | Cosmetic change                                                           | Material change                                                                  |
| ------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| SHOW ME       | Move spotlight and rewrite the current instruction; person still acts.    | Explain the new requirement, wait for repair approval, then guide the person.    |
| DO IT WITH ME | Recompute remaining actor assignments and continue from verified state.   | Preserve work, ask the person to approve the repair and supply judgment.         |
| DO IT FOR ME  | Resolve the current capability and continue permitted reversible actions. | Stop autonomous execution, show the repair diff, and resume only after approval. |

### 7.4 Repair review

The repair card shows:

- what changed in the app;
- which completed and remaining steps are affected;
- the old and proposed journey fragments;
- whether authority or consequence changes;
- **Approve repair**, **Edit**, and **Stop** actions.

Approved repairs affect the current journey. Updating a published guide remains a separate expert review action.

## 8. Demo scope and acceptance stories

### Demo fixture

The fictional Acme Expense Portal contains:

- receipt inbox with a seeded $86 Bistro North receipt;
- expense drafts;
- project and category selection;
- organization policy summary;
- submission review;
- a version switch that simulates a product update; and
- deterministic reset.

It is implemented inside the same top-level React page as the guide. It is not an iframe, because ChatGPT site tools are top-level and iframe-registered tools are not currently supported.

### ~~Story A — recorded guide in SHOW ME~~ ✅

Given the approved “Client meal reimbursement” guide and portal v1, when the person starts in SHOW ME, the interface highlights the correct live control one step at a time and advances only after the expected state change. No agent mutation succeeds.

### Story B — recorded guide in DO IT WITH ME

The agent creates and populates a reversible draft, the person supplies the business justification, and the agent prepares review. The control baton, progress, and action trail match the actual actor.

### ~~Story C — recorded guide in DO IT FOR ME~~ ✅

The agent completes every permitted reversible step and stops at final submission. The person sees a complete approval summary and must explicitly confirm.

### Story D — no recording

For “Create a mileage reimbursement for 18 miles,” no guide matches. The agent reads live capabilities, proposes an on-demand journey, and completes it in the selected mode. The app rejects unknown capabilities or illegal mode/action combinations.

### Story E — cosmetic heal

While any mode is active, switching to portal v2 moves and renames the next control. The guide resolves the same capability to the new visual anchor, displays “Path updated,” and continues without replaying completed steps.

### ~~Story F — material heal~~ ✅

Portal v2 adds a required business-purpose field. The journey pauses, proposes a step, and requires repair approval. Autonomous execution does not continue while the repair is pending.

### Story G — teach once

An expert starts recording, completes a short mileage workflow, adds narration, ends recording, and asks the agent to turn the trace into a draft guide. The expert reviews and publishes it. A fresh session can select the guide in any agency mode.

## 9. Functional requirements

### P0: required for submission

- ~~Guest demo starts without authentication or credentials.~~ ✅
- ~~Task input accepts text and supported voice input.~~ ✅
- ~~The three modes are visibly distinct and enforced in domain logic.~~ ✅
- ~~Users can switch modes without losing work.~~ ✅
- ~~One approved recorded guide is seeded.~~ ✅
- ~~One on-demand journey can be created through WebMCP.~~ ✅
- ~~Recording captures a real semantic action trace and produces a reviewable guide draft.~~ ✅
- ~~The guide system includes spotlight, target outline, coach card, progress rail, attention marker, and control baton.~~ ✅
- ~~Speech output and captions work; text fallback is complete.~~ ✅
- Cosmetic and material self-healing scenarios work from all three modes.
- ~~Sensitive submission requires in-page human confirmation.~~ ✅
- ~~All UI actions and WebMCP tools call the same domain action layer.~~ ✅
- ~~Journey state is authoritative on the server, revisioned, durable across refresh, and serialized per guest session.~~ ✅
- ~~Every mutation carries an idempotency key and expected revision; duplicate, stale, canceled, and ambiguous operations recover safely.~~ ✅
- ~~The accepted action trail is an append-only, replayable event log rather than a client-side activity list.~~ ✅
- A visible WebMCP status indicator says connected, unavailable, or tools need refresh.
- ~~Guest state can be reset deterministically.~~ ✅
- ~~The app works at desktop widths used by the in-app browser and remains usable on mobile.~~ ✅

### P1: only after every P0 acceptance check passes

- Guide repair editor beyond approve/reject.
- Copyable demo prompts in the app.
- Keyboard shortcut to change agency level.
- A polished “Journey anatomy” developer panel showing live capability, pre/postconditions, and authority.
- ~~Same-session synchronization across two browser tabs.~~ ✅

### Not in submission scope

- User accounts, global guide synchronization, analytics, marketplace, role-based organization permissions, arbitrary external websites, browser extension, or SDK packaging. Guest journey durability and audit history are included.

## 10. WebMCP product architecture

### Centrality test

If WebMCP is removed, the page still supports manual expense entry and a deterministic recorded walkthrough. It loses on-demand planning, agent participation, mode-aware execution, live explanations, agent-authored guide drafts, and proposed repairs. Those are the central product promises. WebMCP is therefore the collaboration protocol, not an optional shortcut.

### Registration model

The `/demo` top-level page uses the imperative API:

```ts
document.modelContext.registerTool({
  name,
  description,
  inputSchema,
  annotations,
  execute,
});
```

Tools register when the demo mounts and unregister through `AbortController` when the page or relevant state ends. The app feature-detects `document.modelContext` and presents a normal manual fallback when WebMCP is unavailable. Read tools remain available throughout `/demo`; mutation tools register only when the current journey and agency policy make them relevant. This reduces model ambiguity, but every command is still revalidated server-side. Tool execution passes the callback's cancellation signal to the underlying request.

### Shared action layer

Both React controls and tool executors dispatch typed commands to one authoritative journey service. A Cloudflare Worker routes each guest session to a Durable Object, which serializes human and agent commands, enforces expected revisions and policy, appends accepted domain events, and returns the committed projection. Executors never click DOM elements, synthesize pointer events, or maintain a second hidden state. After a command, the tool returns a concise result derived from committed server state.

Each command has a cryptographically random operation ID. Repeating the ID returns the original result without creating a second event. A stale revision fails with a refresh instruction. If a tool is canceled after dispatch and the commit outcome is unknown, the client reconciles the operation against the event log before allowing a retry. The complete runtime, state machine, persistence, self-healing compiler, WebMCP lifecycle, security, observability, and testing contract is specified in [`ENGINEERING_SPEC.md`](./ENGINEERING_SPEC.md).

### Tool surface

| Tool                         | Type                      | Purpose and visible effect                                                                                           |
| ---------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `get_app_context`            | Read                      | Return current page, portal version, user-visible task state, policy, and pending control boundary.                  |
| `list_capabilities`          | Read                      | Return the live semantic actions, required data, risk, and current availability.                                     |
| `list_guides`                | Read                      | Return approved and draft guides relevant to the current task.                                                       |
| `get_journey`                | Read                      | Return current steps, verified progress, actor, and blocking state.                                                  |
| `get_recording_trace`        | Read, untrusted           | Return redacted semantic events and expert narration for guide drafting.                                             |
| `create_journey`             | Reversible                | Validate and display an on-demand plan referencing registered capabilities.                                          |
| `set_agency_mode`            | Reversible                | Request a mode change; authority reductions apply at a safe boundary, while expansions require the visible human UI. |
| `show_guidance`              | Reversible UI             | Resolve a valid capability to its current anchor and render the accessible guide treatment.                          |
| `create_expense_draft`       | Reversible                | Create a real visible draft if policy and mode allow the agent to do so.                                             |
| `update_expense_draft`       | Reversible                | Update allowlisted draft fields and show the result in the portal.                                                   |
| `prepare_expense_submission` | Consequential preparation | Validate the draft and open the human confirmation card; it cannot finalize submission.                              |
| `propose_journey_repair`     | Reversible proposal       | Validate and display a repair diff; approval remains human-only.                                                     |
| `save_guide_draft`           | Reversible                | Save an agent-proposed guide draft from a recording; publication remains human-only.                                 |

Tool names are short, descriptions state when and when not to call them, schemas use enums and bounds with `additionalProperties: false`, and outputs stay concise. Read tools use `readOnlyHint`; recording and receipt-derived content use `untrustedContentHint` because it may contain text an agent must not treat as instructions.

### Human-only actions

The following are intentionally absent from the WebMCP surface:

- ~~confirm final expense submission;~~ ✅
- ~~publish an organization guide;~~ ✅
- ~~approve a material repair;~~ ✅
- ~~start recording sensitive activity; and~~ ✅
- ~~increase a persisted authority policy.~~ ✅

### Domain state

```ts
type AgencyMode = "show" | "with" | "for";
type JourneySource = { kind: "recorded"; guideId: string } | { kind: "on-demand"; goal: string };
type JourneyStatus =
  | "planning"
  | "active"
  | "awaiting_user"
  | "awaiting_approval"
  | "repair_required"
  | "completed"
  | "blocked";
type Risk = "read" | "reversible" | "sensitive";

interface JourneyStep {
  id: string;
  capabilityId: string;
  instruction: string;
  actor: "human" | "agent" | "shared";
  preconditions: string[];
  postconditions: string[];
  risk: Risk;
  status: "pending" | "current" | "completed" | "blocked";
}
```

An anchor registry maps each `capabilityId` to the current React element for visual guidance. Portal v1 and v2 use different components and positions but preserve capability semantics where meaning is unchanged.

## 11. Safety, privacy, and trust requirements

- ~~Every mutation validates current state, agency mode, capability availability, and risk on the application side.~~ ✅
- ~~Tool-call arguments are treated as untrusted input and validated at runtime.~~ ✅
- ~~Receipt text, expert narration, and user-provided labels are data, never executable instructions.~~ ✅
- ~~No tool accepts arbitrary URLs, selectors, HTML, code, or broad key/value payloads.~~ ✅
- ~~Tool descriptions and outputs avoid secrets and hidden implementation details.~~ ✅
- ~~The recorder explicitly starts and stops, displays a persistent indicator, and excludes credentials and sensitive field values.~~ ✅
- ~~The app never relies on agent confirmation for a sensitive consequence.~~ ✅
- ~~A pending repair or approval blocks later mutation tools.~~ ✅
- ~~A tool result reports an action as complete only after verifying committed state/postconditions.~~ ✅
- The UI provides pause, undo for reversible changes, reset demo, and visible action history.
- ~~The experience remains keyboard operable and never communicates actor/risk/status by color alone.~~ ✅
- ~~Motion obeys `prefers-reduced-motion`; overlays cannot trap focus or block the instructed control.~~ ✅

## 12. Visual and interaction design

### Creative direction

The aesthetic is editorial, tactile, and precise: warm bone backgrounds, near-black type, electric coral for attention, and mint for verified completion. It avoids generic dark AI dashboards and purple gradients. The dot in `pave.to(done)` becomes a moving waypoint along a path, tying the identity to task progress.

### Landing page

The landing page must communicate the product in the first viewport and provide a direct **Try the live journey** action. Its sections are:

1. **Hero:** the task sentence transforms into a paved path through `SHOW ME → WITH ME → FOR ME → DONE`; the dot travels along the route with scroll and pointer response.
2. **Live product window:** a small interactive preview switches among the three modes and changes the control baton.
3. **The broken-help problem:** static tutorial, all-or-nothing agent, and changing software shown as one visual sequence.
4. ~~**Three modes:** one shared journey, with the human/agent contribution visibly changing rather than three disconnected feature cards.~~ ✅
5. **Teach once or start now:** recorded and on-demand paths converge into the same journey model.
6. **Self-healing morph:** an interface control moves and changes label while the semantic path remains attached; a material change opens review.
7. ~~**Built on WebMCP:** concise explanation and live tool-status proof, not a sponsor-logo wall.~~ ✅
8. **Final CTA:** open the guest demo and copy the recommended ChatGPT prompt.

### App layout

- ~~**Top bar:** brand, WebMCP status, portal version/demo update control, reset.~~ ✅
- ~~**Main work surface:** Acme Expense Portal, fully interactive without the agent.~~ ✅
- **Guide dock:** goal, source, mode selector, current step, explanation, progress, actor, pause.
- ~~**Action trail:** real state changes and repairs, with actor and time.~~ ✅
- **Voice control:** compact microphone/waveform with visible transcript and mute.
- **Recorder drawer:** deliberate record control, captured semantic events, narration, review/publish.
- **Repair review:** diff card anchored to the affected journey step.

### Motion rules

- Use CSS/SVG for three signature effects: path drawing, semantic-anchor movement, and control-baton handoff.
- Keep motion purposeful, interruptible, and under 400 ms for task interactions.
- ~~Never hijack the cursor or scroll.~~ ✅
- ~~Avoid a video background and heavy 3D libraries; preserve fast first load.~~ ✅
- Target Lighthouse performance and accessibility scores of 90 or higher on the deployed desktop experience.

## 13. Measurement and acceptance gates

### Product acceptance

- All seven demo stories pass after a clean reset.
- Each of the three modes passes before and after the cosmetic update.
- ~~Each mode stops correctly at the material update and final confirmation.~~ ✅
- ~~Switching modes preserves verified progress in all pairwise transitions.~~ ✅
- A journey cannot reference an unknown capability.
- ~~SHOW ME rejects agent domain mutations.~~ ✅
- ~~No WebMCP path can finalize expense submission, publish a guide, or approve a material repair.~~ ✅
- ~~The app remains usable when WebMCP and speech recognition are unavailable.~~ ✅
- ~~Refresh restores the authoritative journey and pending control boundary.~~ ✅
- ~~Concurrent commands from one revision produce one accepted transition and one explicit stale-state result.~~ ✅
- ~~Repeating an operation ID produces no duplicate event or domain effect.~~ ✅
- ~~Replaying the append-only event log reproduces the stored snapshot and verifies its hash chain.~~ ✅
- Random command-sequence tests preserve the invariants that agents never create sensitive events and unapproved repairs never resume work.

### WebMCP quality acceptance

- Tools are visible in ChatGPT's in-app browser and Chrome's WebMCP tooling.
- At least one realistic prompt requires multiple tools, state inspection, sequencing, and a human handoff.
- Read, reversible mutation, guidance, plan, recording, and repair tools are demonstrated live.
- Tool selection tests cover direct, ambiguous, adversarial, and out-of-order prompts.
- Mid-chain failures cover stale state, missing required field, pending approval, and removed capability.
- Cancellation tests cover abort-before-dispatch and unknown-outcome-after-dispatch reconciliation.
- Dynamic registration exposes only route- and state-relevant mutation tools and cleans them up without duplicates.
- Tool outputs remain within the project's output budget and never contradict visible state.

### User validation acceptance

Before final recording, at least two people who did not build the flow must attempt the main task without oral coaching. Record observations, not invented success statistics. Fix every blocker that prevents task completion or obscures who is in control.

## 14. Rubric strategy and judge-visible proof

No plan can guarantee a perfect score; judging is discretionary. The target is to remove avoidable reasons for losing points and make each claim verifiable in under three minutes.

### Stage One — pass/fail viability

| Requirement                            | Pass evidence                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fits human-agent collaboration theme   | Human changes agency, performs steps, teaches, approves repairs, and confirms consequence while the agent plans, acts, explains, and adapts on the same page. |
| Required WebMCP implementation is real | Imperative top-level tools register in the live deployment; agent calls visibly change real app state; source and tests are public.                           |
| Runnable                               | Guest URL opens without credentials and reset restores the exact demo.                                                                                        |
| Submission complete                    | Description, public repository with visible MIT license, and public YouTube demo under three minutes are linked.                                              |

### WebMCP Leverage — target 25/25

**Judge-visible case:** WebMCP carries a multi-step collaboration protocol: live state discovery, journey construction, mode-aware mutations, visual guidance, recording-to-guide conversion, self-healing proposals, and verified human handoffs. It uses lifecycle cleanup, narrow schemas, annotations, current-state validation, and evals.

**Proof locations:** live tool calls; tool-status indicator; video segment showing ChatGPT and the same page; `src/webmcp/`; tool table and architecture diagram in README; deterministic and prompt-based eval results.

**Failure to avoid:** a demo in which ChatGPT merely fills a form or calls one large `complete_task` tool.

### Execution — target 25/25

**Judge-visible case:** a complete path from task to verified outcome, with three coherent modes, voice/text, stateful visual guidance, safe approval, recovery, recording, reset, polished landing page, responsive layout, accessibility, and browser fallbacks.

**Proof locations:** live guest demo; uncut task completion in video; setup and test instructions; screenshots; automated tests; incognito and second-machine test record.

**Failure to avoid:** spending final hours on ornamental landing motion while the agent path, deployed URL, or reset flow is unreliable.

### Potential Impact — target 25/25

**Judge-visible case:** a specific audience—SaaS product, support, enablement, and operations teams—can replace brittle tutorials and unsafe all-or-nothing automation with one semantic journey that supports novice learning, shared execution, delegation, and change. The expense workflow demonstrates the whole claim rather than describing hypothetical integrations.

**Proof locations:** one-sentence audience/problem above the fold; recorded and on-demand demo; two external usability attempts documented honestly; comparison and limitations in README.

**Failure to avoid:** claims about reduced support costs or completion rates without evidence from this build.

### Creativity & Ambition — target 25/25

**Judge-visible case:** existing projects demonstrate screen guidance, recorded tutorials, or autonomous agents separately. `pave.to(done)` combines a user-controlled agency ladder, optional teach-once knowledge, semantic WebMCP-native guidance, verified outcomes, and authority-preserving self-healing in one shared task object. The same journey changes the human/agent division without restarting.

**Proof locations:** three-mode switch during one journey; v1-to-v2 live morph; repair diff; honest comparison section; architecture showing semantic capability IDs rather than selectors.

**Failure to avoid:** describing standard tooltip, RPA, or computer-use behavior as novel. The novelty claim is the integrated interaction and trust model.

### Reading the judge panel

The panel spans browser platforms, WebMCP/MCP, applied AI, frontend frameworks, commerce, edge infrastructure, and deployment. The submission should therefore be legible at multiple levels:

- browser and protocol reviewers can inspect lifecycle, schemas, security, and origin behavior;
- applied-AI reviewers can see task planning, state grounding, repair, and evaluation;
- frontend reviewers can assess interaction quality, accessibility, and coherent state;
- product and platform reviewers can understand the audience, adoption path, and generalizable integration model.

Sponsor products do not create a separate judging category or bonus in the published rules. Hosting on a supporter is reasonable; adding irrelevant sponsor integrations would weaken coherence.

## 15. Competitive boundary

| Existing direction      | What it validates                                       | `pave.to(done)` difference                                                                                           |
| ----------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Show Me How             | Experts want to record once and guide many.             | Recording is optional; one semantic journey supports guidance, shared execution, and delegation.                     |
| Unstuck                 | In-page visual and voice guidance can reduce confusion. | Site-owned WebMCP capabilities ground actions and outcomes instead of relying on a screen overlay alone.             |
| Waylo                   | Graduated help and teachable guidance are useful.       | Agency is enforced as an authority policy, can switch mid-task, and survives software changes.                       |
| Static product tours    | Users benefit from contextual onboarding.               | A user starts from their own goal; the journey can act, verify state, repair, and stop for sensitive approval.       |
| Computer-use agents/RPA | People want tasks completed for them.                   | The website declares semantic capabilities; the person can learn or collaborate, and repair cannot expand authority. |

The submission must credit inspirations in the README and make only defensible novelty claims.

## 16. Future path after judging

The product could become an embeddable SDK for WebMCP-enabled SaaS products. A host application would register domain capabilities, semantic anchors, risk classes, and confirmation boundaries; `pave.to(done)` would provide the journey engine, guidance UI, recording/review, and repair history. Production work would add authentication, durable storage, organization policies, guide versioning, analytics, and cross-application handoffs. None of those are necessary to prove the central interaction in this submission.

## 17. Authoritative references

- [WebMCP Challenge overview, requirements, judges, prizes, and rubric](https://webmcp.devpost.com/)
- [Official challenge rules](https://webmcp.devpost.com/rules)
- [Challenge resources and FAQ](https://webmcp.devpost.com/resources)
- [WebMCP specification draft](https://webmachinelearning.github.io/webmcp/)
- [OpenAI guidance for ChatGPT site tools](https://learn.chatgpt.com/docs/webmcp)
- [Chrome WebMCP developer guide](https://developer.chrome.com/docs/ai/webmcp)
- [Chrome WebMCP security guidance](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
- [Chrome WebMCP evaluation guidance](https://developer.chrome.com/docs/ai/webmcp/evals)
- [WebMCP source and examples](https://github.com/webmachinelearning/webmcp)
- [`ENGINEERING_SPEC.md`](./ENGINEERING_SPEC.md) — normative runtime, data, safety, observability, and test contract
- [`RESOURCE_AUDIT.md`](./RESOURCE_AUDIT.md) — source-by-source application of the official challenge materials
