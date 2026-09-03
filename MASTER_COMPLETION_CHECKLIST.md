# pave.to(done) — Master Completion Checklist

**Created:** September 1, 2026  
**Deadline:** September 3, 2026 at 4:00 PM local deadline shown by Devpost  
**Source:** Remaining work audited from `IMPLEMENTATION_PLAN.md`, `ENGINEERING_SPEC.md`, `PRD.md`, and the deployed submission state.

## Completion rules

- Work through the numbered steps in order.
- Mark an item complete only after implementation and verification evidence exist.
- Record the evidence beside the completed item: test, file, deployed URL, screenshot, video, or release identifier.
- Leave a combined item unchecked if any part remains incomplete or unverified.
- Do not mark browser, device, usability, video, or public-link checks complete from source inspection alone.

## Current progress

**Active step:** Step 20 — Devpost submission (public YouTube and outside-participant/device checks remain external prerequisites)
**Completed in Step 1:** 8 of 9 items
**Completed in Step 2:** 3 of 3 items
**Completed in Step 3:** 4 of 4 items
**Completed in Step 4:** 20 of 20 items
**Completed in Step 5:** 12 of 12 items
**Completed in Step 6:** 8 of 8 items
**Completed in Step 7:** 16 of 16 items
**Completed in Step 8:** 10 of 10 items
**Completed in Step 9:** 7 of 7 items
**Completed in Step 10:** 10 of 10 items
**Completed in Step 11:** 13 of 13 items
**Completed in Step 12:** 46 of 46 items
**Completed in Step 13:** 13 of 13 items
**Completed in Step 14:** 12 of 12 items
**Completed in Step 15:** 5 of 7 items
**Completed in Step 16:** 0 of 6 items
**Completed in Step 17:** 4 of 7 items
**Completed in Step 18:** 5 of 6 items
**Completed in Step 19:** 9 of 12 items
**Completed in Step 20:** 8 of 14 items

**Current implementation deployment:** Cloudflare version `b7d26bd2-d51c-437b-a0ae-ad072587de0f` from verified GitHub commit `1b945e6` at `https://pave-to-done.north-raincoat.workers.dev`. GitHub release gate `33657148841`, the live protocol verifier, all 91 local unit/integration tests, all 32 deployed browser tests, and 30 final in-app-browser WebMCP prompt trials passed.

**External verification still required:** reconnect the separate Chrome test window so the Chrome 149+ WebMCP check can run. The user's everyday Chrome profile must not be changed. The deployed response serves `Origin-Agent-Cluster: ?1`; `curl`, Worker integration tests, and the live verifier all confirm the header. The current in-app browser process loaded this origin before the header was introduced and continues to report `false` for that already-allocated process.

## 1. Architecture and platform gaps

- [x] Decide whether to add React Router as specified or update the normative plans to document the current custom navigation. — Evidence: `IMPLEMENTATION_PLAN.md` now records the intentional two-route History API decision; `src/test/App.test.tsx` verifies direct routes and history navigation.
- [x] Decide whether to add Motion for the signature animations or update the normative plans to document the CSS/SVG implementation. — Evidence: `IMPLEMENTATION_PLAN.md`, `ENGINEERING_SPEC.md`, and `PRD.md` now consistently specify dependency-free CSS/SVG motion.
- [x] Generate WebMCP JSON Schemas from the canonical domain schemas; remove manually mirrored schemas. — Evidence: `src/webmcp/toolContracts.ts` generates every registered input schema with Zod 4 `toJSONSchema`; `src/test/toolContracts.test.ts` verifies closure, bounds, required fields, and runtime alignment.
- [x] Add meaningful React Testing Library coverage. — Evidence: `src/test/App.test.tsx` exercises root rendering, in-app navigation, deep linking, and browser-history restoration.
- [x] Add Miniflare or equivalent Worker integration tests. — Evidence: `src/test/worker.integration.test.ts` exercises the real Worker entrypoint for health, asset handling, production security headers, and pre-Durable-Object cross-origin rejection.
- [ ] Verify the application in Chrome 149+ with WebMCP enabled.
- [x] Serve and verify `Origin-Agent-Cluster: ?1`. — Evidence: the Worker integration suite asserts the production header, `npm run verify:live` confirms it on the deployed response, and direct `curl` verification passed against Cloudflare version `710c2aef-a1d2-4b16-9143-686aa51b4d89`.
- [x] Display `window.originAgentCluster` in the diagnostics panel. — Evidence: `useWebMCPTools` captures the runtime value and `DiagnosticPanel` renders `isolated` or `not isolated`; type-check and production build pass.
- [x] Perform the final test on the exact deployed top-level URL, outside an iframe. — Evidence: the in-app browser loaded `https://pave-to-done.north-raincoat.workers.dev/demo`, reported `self === top`, and discovered the generated WebMCP tool surface from Cloudflare version `710c2aef-a1d2-4b16-9143-686aa51b4d89`.

## 2. Repository and deployment foundation

- [x] Connect continuous deployment; GitHub Actions must test, build, and deploy the intended release through a documented protected path. — Evidence: GitHub `production` is restricted to `main`; account ID is a repository variable and the seven-day least-privilege token is an environment secret; run `33593442250` passed the `verify` job before `Deploy production`, then deployed commit `5c4bece` as Cloudflare version `b7e4036e-3969-48d8-8174-7201135c6786`; the post-deploy live verifier passed.
- [x] Run the complete Gate 0 fresh-clone exercise: install, test, build, local run, documented deployment, `/health`, `/demo`, top-level Worker origin, and origin isolation. — Evidence: a public shallow clone at commit `68d42a1` completed `npm ci`, formatting, lint, type checking, all 18 tests, production build, and `wrangler deploy --dry-run`; its local Worker returned 200 for `/api/health` and `/demo` with `Origin-Agent-Cluster: ?1`, and the canonical top-level deployment had already passed the live verifier.
- [x] Ensure a fresh contributor can deploy without relying on undocumented local state. — Evidence: the clean-clone Wrangler dry run discovered the static assets, `JOURNEYS` Durable Object binding, and checked-in SQLite migration without environment variables or local files; `README.md` now documents exact authentication, deployment, fork naming, and verification steps.

## 3. Domain model and backend foundations

- [x] Define the complete named domain models: `JourneySnapshot`, `JourneyStep`, `Guide`, `RecordingTrace`, `Repair`, `AgencyPolicy`, portal and capability manifests, command/result envelopes, and event records. — Evidence: `src/domain/types.ts` exports each named model; `src/domain/manifests.ts` consumes the canonical manifest types; Wrangler-generated `worker-configuration.d.ts` binds the runtime from `wrangler.jsonc`, and CI checks it for drift.
- [x] Move receipt, project, category, policy, recorded-guide, and related demo data into proper typed fixtures rather than UI constants. — Evidence: `src/domain/fixtures.ts` is the typed source for the receipt, choices, business purpose, default goal, all three policy presentations, and the published recorded guide; the compiler, decision layer, initial state, UI, and WebMCP adapter import it.
- [x] Add structured server logging for request ID, operation ID, expected revision, resulting revision, accepted event, and redacted failure details. — Evidence: `src/server/logging.ts` emits `pave.operation.v1` records; the Worker creates and returns a request ID, propagates it to the Durable Object, and Workers Logs plus traces are explicitly enabled in `wrangler.jsonc`.
- [x] Verify logs never contain receipt contents, challenges, sensitive identifiers, or raw upstream responses. — Evidence: `src/test/logging.test.ts` supplies a confirmation challenge, receipt identifier, merchant, event payload, and failure message, then proves none enter serialized logs; only allowlisted lineage, event names, error code, retryability, route class, and the literal `redacted` detail marker remain.

## 4. WebMCP contract completion

- [x] Make WebMCP schemas single-source and generated. — Evidence: `src/webmcp/toolContracts.ts` generates every JSON Schema from the same Zod validator used at execution time.
- [x] Enforce `additionalProperties: false` at every object boundary. — Evidence: all validators are strict and `src/test/toolContracts.test.ts` plus `src/test/webmcpLifecycle.test.tsx` recursively inspect every registered object schema.
- [x] Audit every tool name, description, parameter description, and annotation. — Evidence: the lifecycle test reaches all 15 state-dependent and route tools across expense, mileage, repair, and recording states; it asserts the exact public name set, validates closed schemas, and requires explicit read-only, destructive, idempotent, and open-world annotations.
- [x] Keep tool descriptions below roughly 500 characters and parameter descriptions below roughly 150 characters. — Evidence: lifecycle tests enforce 500 characters for every registered tool; schema tests recursively enforce 150 characters for every generated parameter description.
- [x] Add appropriate numeric and string bounds, including mileage inputs. — Evidence: the canonical strict validators bound text fields and expense amounts; the mileage tool schema and domain command constrain distance to 0.1–1,000 miles, `src/test/toolContracts.test.ts` proves schema/runtime agreement, and `src/test/mileageJourney.test.ts` proves out-of-range commands cannot mutate state.
- [x] Make every normal tool result include `ok`, `operationId`, `revision`, `changed`, `summary`, `next`, and useful grounded error details when rejected. — Evidence: `src/webmcp/resultFormat.ts` owns the uniform read, success, and rejection envelopes; `src/test/resultFormat.test.ts` verifies all required fields and grounded stale-revision details.
- [x] Explicitly identify the next human or agent control boundary in results. — Evidence: `nextControlBoundary` identifies the actor, action, and reason for active, repair, confirmation, idle, and completed states.
- [x] Keep normal tool results around 1.5 KB. — Evidence: result-format tests enforce a 1,500-byte serialized ceiling for representative read and mutation results.
- [x] Bound recording-trace output; do not return an unbounded complete trace. — Evidence: `get_recording_trace` returns the latest 10 redacted entries plus `totalEntries` and `truncated`.
- [x] Add bounded `limit` inputs or summaries wherever lists can grow. — Evidence: the server caps event pages at 50, the client paginates to the session's 200-event ceiling, and recording output reports total and truncation; capabilities and published-guide lists are fixture-bounded.
- [x] Confirm every tool executes against fresh state and never trusts stale UI state. — Evidence: all handlers read `snapshotRef.current`; the lifecycle test keeps a route tool registered, advances the snapshot to revision 3, invokes it, and observes revision 3.
- [x] Verify all sensitive tools only prepare confirmation and cannot finalize it. — Evidence: the exhaustive registration test proves there is no confirmation, repair-approval, or guide-publication tool; `prepare_expense_submission` stops at the visible human boundary.
- [x] Verify registration cleanup, route changes, unmounting, abort propagation, and duplicate protection under React Strict Mode. — Evidence: `src/test/webmcpLifecycle.test.tsx` runs the hook under Strict Mode, proves one active registration per name, and proves every registration signal aborts on unmount; existing server protocol tests cover duplicate operation IDs.
- [x] Verify cancellation reaches `fetch`, and ambiguous cancellation reconciles from authoritative state. — Evidence: `src/test/journeyClient.test.ts` asserts the exact AbortSignal reaches the mutation fetch and that an aborted response resolves through the authoritative operation endpoint with `reconciled: true`.
- [x] Add top-level-page confirmation to diagnostics. — Evidence: the diagnostic panel renders `top-level` or `embedded` from `window.self === window.top`.
- [x] Add origin-isolation status to diagnostics. — Evidence: the panel renders `isolated` or `not isolated` from `window.originAgentCluster`.
- [x] Add permissions status to diagnostics where applicable. — Evidence: the panel exposes effective `tools allowed` only when WebMCP exists on a top-level document, otherwise `unavailable`.
- [x] Display the last resulting revision separately from the revision originally sent. — Evidence: invocation state and diagnostics render `Revision sent` and `Revision returned`; tool results expose `sentRevision` and `resultingRevision` separately.
- [x] Display the reconciled state after ambiguous cancellation. — Evidence: client results carry `reconciled`; unresolved ambiguity refreshes authoritative state; diagnostics render the reconciled revision and journey status.
- [x] Display the complete accepted event chain. — Evidence: the client follows 50-event pages instead of retaining only the last page, the UI no longer truncates accepted events, and the Durable Object enforces a 200-event ceiling so the bounded chain is complete.

## 5. Three agency modes

- [x] Add a real pause control to the guide dock. — Evidence: the dock has distinct Pause/Resume controls backed by `SetJourneyPaused`, persisted `JourneyPaused`/`JourneyResumed` events, and a paused control boundary; local and deployed Playwright tests prove the UI preserves state.
- [x] Verify Show Me from reset. — Evidence: the parameterized agency-mode suite completes the expense from a reset Show Me session with every reversible action performed by the person and final confirmation remaining human-only.
- [x] Verify Do It With Me from reset. — Evidence: the same suite completes a reset With Me session with the agent handling receipt facts, the person making the project judgment, the agent resuming reversible work, and the person confirming.
- [x] Verify Do It For Me from reset. — Evidence: the same suite completes a reset For Me session with the agent executing all reversible steps and the person executing the sensitive consequence.
- [x] Verify Show Me denies every agent domain mutation. — Evidence: `src/test/agencyModes.test.ts` attempts each expense mutation at its current Show Me step plus final submission, asserts the correct policy rejection, and proves the snapshot is unchanged.
- [x] Verify With Me only permits the current assigned reversible step. — Evidence: the suite permits the first agent assignment, denies the agent at the human project judgment, rejects an out-of-order prior field, and permits the newly current agent category step.
- [x] Verify For Me permits reversible agent actions and denies sensitive actions. — Evidence: the suite lets the agent create, allocate, classify, and prepare the draft, then rejects its final confirmation attempt without altering state.
- [x] Test all six directed mode changes between the three modes. — Evidence: a table-driven test covers Show→With, Show→For, With→Show, With→For, For→Show, and For→With; the server also rejects agent-requested authority escalation while allowing reduction.
- [x] Confirm mode changes preserve completed work and valid draft state. — Evidence: every directed-transition case compares the complete expense projection, completed capability set, and current capability before and after the transition; deployed browser verification also preserves the visible date.
- [x] Confirm out-of-order steps cannot mutate state. — Evidence: the suite attempts `expense.project` while `expense.date` is current, receives a grounded precondition failure, and compares the unchanged projection.
- [x] Confirm agent work is blocked during repair and human confirmation. — Evidence: focused tests receive `REPAIR_REQUIRED` after Portal v2 changes and `AWAITING_HUMAN` after preparation; dynamic WebMCP registration omits ordinary agent mutation tools in paused, repair, and confirmation states.
- [x] Confirm forbidden mutations return grounded errors explaining the rejection and next allowed action. — Evidence: policy errors name the capability, active mode, current owner, and required next step; pause and authority-escalation errors explicitly direct the person to the visible Journey dock.

## 6. Guidance experience

- [x] Anchor the coach card directly to the relevant semantic target. — Evidence: `GuidanceOverlay` resolves the live semantic anchor, outlines its measured bounds, and places a connected coach card on the best available side with the capability's action and reason.
- [x] Decide whether the optional ghost gesture improves the product; implement it if retained and document the decision either way. — Evidence: `PRD.md` and `IMPLEMENTATION_PLAN.md` document the decision to omit simulated cursor movement because it can falsely imply execution and adds no information beyond the semantic target.
- [x] Test the target outline and coach card after scrolling and resizing. — Evidence: `e2e/guidance.spec.ts` scrolls the portal, resizes across 1440×900, 1024×720, and 390×844, and polls the spotlight-to-target geometry to sub-two-pixel alignment.
- [x] Ensure the coach overlay never blocks the target's click action. — Evidence: both spotlight and coach compute to `pointer-events: none`; the browser test activates the instructed human control while guidance is visible and observes the verified next step.
- [x] Keep the coach card on-screen at common viewport sizes. — Evidence: viewport-aware placement and clamping preserve 12-pixel margins; the browser suite measures every card edge at desktop, tablet, and mobile sizes.
- [x] Verify guidance communicates state without relying on color. — Evidence: the visible coach explicitly renders `CURRENT STEP`, `You act`/`Agent acts`, the action heading, `Why`, and `Expected`; tests assert all labels as text.
- [x] Verify keyboard navigation through the full guided flow. — Evidence: the deployed browser suite completes every Show Me action and sensitive confirmation using focused native-button keyboard activation, ending at `VERIFIED COMPLETION`.
- [x] Verify screen-reader labeling through the full guided flow. — Evidence: the atomic live region announces step count, action, and control owner; the coach is a polite status; the keyboard journey asserts intermediate and final accessible status text including history verification.
- [x] Start guidance automatically without requiring a separate highlight action. — Evidence: the focused visible-tab orchestrator issues `ShowGuidance` when a human-owned current step lacks matching guidance; `e2e/guidance.spec.ts` starts from one task action and verifies the first coach appears automatically.
- [x] Advance visual and spoken guidance automatically after every verified human action. — Evidence: each accepted field command returns the authoritative next step, the orchestrator records exactly one matching `GuidanceShown` event, and the browser suite verifies the coach moves from date to amount without another request.
- [x] Make the semantic waypoint target the real portal control. — Evidence: expense and mileage fields are accessible inputs/selects with anchors on the interactive elements; preparation is the actual portal review button; dock shortcut mutation buttons were removed; full expense and mileage browser journeys pass.
- [x] Prevent automatic guidance from racing fast human input. — Evidence: human-owned controls unlock only after the matching guidance revision commits; text-field submission deduplicates Enter/blur; the exactly-once test and a three-run keyboard stress check pass without `STALE_REVISION`.
- [x] Preserve the current step and explain invalid portal input. — Evidence: client validation rejects zero amount in place, renders an accessible correction, retains step 2, and keeps the amount waypoint attached in `e2e/guidance.spec.ts`.
- [x] Add user-activated reveal for offscreen targets. — Evidence: `GuidanceOverlay` detects targets outside the viewport and renders `Take me to…`; scrolling occurs only from that explicit control and reduced-motion CSS collapses smooth motion.
- [x] Add point-on-demand without advancing the journey. — Evidence: bounded help resolves named manifest capabilities to semantic anchors, renders a transient amber locator, and the browser test locates mileage distance while the journey remains at step 1.

## 7. Self-healing engine

- [x] Implement a pure generic compiler that compares the guide with source and current capability manifests. — Evidence: `src/domain/healingCompiler.ts` exports a side-effect-free `compileHealing` function over a snapshot, source manifest, and current manifest; focused tests supply synthetic manifests rather than portal-specific branches.
- [x] Detect manifest-version changes before every step transition. — Evidence: the shared `requireActive` guard compares the snapshot manifest to the live portal manifest before guidance or mutation, and the healing suite proves a stale version blocks progression.
- [x] Classify every step as compatible, safely remapped, repair required, or blocked. — Evidence: `HealingStepClassification` records one of the four dispositions plus source/target risk, anchor, agent eligibility, and postcondition state; compiler tests exercise all four outcomes.
- [x] Treat any risk increase as blocking. — Evidence: the generic compiler compares ordered risk ranks and the removed/risk test proves reversible-to-sensitive produces a blocked assessment.
- [x] Build a safe-remap path that moves guidance to the new semantic anchor without losing progress. — Evidence: the compiler resolves by ID, semantic anchor, or alias; `PortalVersionChanged` and repair evolution remap the active guidance anchor while retaining the expense projection and completed steps.
- [x] Make server validation reject any repair that lowers risk, expands agent authority, turns an agent-ineligible action into an agent action, removes required outcomes, or modifies completed events. — Evidence: `validateRepair` binds proposals to session, revision, manifests, classifications, risks, authority, required outcomes, and completed steps; table-driven tampering tests plus the human-only reversible-capability regression test cover every rejection.
- [x] Verify repair rejection preserves the original state and stops progression. — Evidence: the domain test compares the unchanged expense projection after `RejectRepair`, and the local and deployed rejection browser journey shows `JOURNEY STOPPED` with Project Atlas preserved and progression absent.
- [x] Verify the same healing system works in Show Me, With Me, and For Me. — Evidence: the material-change compiler test runs against all three modes and verifies the same new requirement with mode-correct ownership; the common server transition guard applies to every mode.
- [x] Test capability-ID change with a surviving semantic anchor. — Evidence: the synthetic manifest test remaps `task.value` to `task.value.v2` through the unchanged semantic anchor and retains the current step.
- [x] Test a removed capability. — Evidence: the synthetic manifest test removes the current capability and receives a blocked assessment with a grounded reason.
- [x] Test an already-satisfied postcondition. — Evidence: the compiler test begins with Project Atlas already stored and marks the mapped step complete rather than replaying it.
- [x] Test a newly required field. — Evidence: V2 inserts `expense.businessPurpose` in manifest order and the all-mode test verifies it becomes the current material requirement.
- [x] Test a cosmetic portal change. — Evidence: the anchor-remap test changes `sidebar.action` to `header.action`, returns `remapped`, and preserves the existing amount.
- [x] Test a material portal change. — Evidence: domain and browser tests switch the working V1 expense to V2, preserve completed facts, require an agent proposal and visible human approval, then resume at business purpose.
- [x] Test user rejection of a repair. — Evidence: `RejectRepair` is human-UI-only; the deployed browser test rejects the proposal, preserves the draft, and exposes reset as the next action.
- [x] Verify autonomous work remains blocked until material repair approval. — Evidence: preparation is denied both before and after the agent proposal; WebMCP mutation tools remain unavailable at the repair boundary, and only visible human approval resumes the journey.

## 8. Teach once and recording

- [x] Capture before-state and after-state for every recorded action. — Evidence: `recordingEntry` records bounded semantic observations before and after each accepted expense action; the full recording test verifies all six entries have both observations.
- [x] Attach optional narration to recording entries. — Evidence: human-only `UpdateRecordingNarration` targets a numbered entry, the review UI offers a bounded narration field per action, and unit/browser tests prove the text persists and enters the draft description.
- [x] Build deterministic server-backed guide drafting from ordered recording events when no agent is available. — Evidence: `compileRecordingGuide` deterministically deduplicates the ordered trace against the live manifest; `GenerateGuideDraft` persists the result through the event-sourced server, and the deployed fallback browser journey passes without an agent command.
- [x] Make the resulting draft visible for human review. — Evidence: the dock renders the draft title, generation origin, provenance, and ordered title/description list before the Publish button; both live drafting paths assert the review surface.
- [x] Ensure only registered capabilities can appear in a draft. — Evidence: the compiler rejects missing, reordered, or unregistered capabilities against the live manifest and recorded path; a server decision test submits `admin.deleteEverything` and proves the draft remains in review.
- [x] Verify recording begins only after explicit human activation. — Evidence: the domain test denies agent/WebMCP activation without changing state, while both browser journeys begin from the visible Record control.
- [x] Verify sensitive values are redacted at capture time. — Evidence: capture emits only field names, redaction markers, and boolean/status observations; the test proves raw date, project, category, merchant, expense ID, and receipt values do not occur in the stored trace.
- [x] Verify an agent cannot publish a guide. — Evidence: the server rejects agent `PublishGuide` with `POLICY_DENIED`, publication has no WebMCP tool, and the successful path uses the visible human Publish control.
- [x] Complete the human publish flow with clear recorded/draft provenance. — Evidence: an agent-created draft persists as `AI-generated draft`; human publication creates an immutable `Recorded guide` artifact that appears through `list_guides`; the deployed end-to-end test covers the transition.
- [x] Use the exact source labels `Recorded guide`, `AI-generated draft`, and `Planned for this session`. — Evidence: the source selector, active journey label, recording review, persisted `Guide.provenance`, and on-demand card render those exact strings; tests assert the first two and the type system constrains all three.

## 9. No-recording and mileage workflow

- [x] Build a genuine second task for the no-recording path. — Evidence: `src/domain/compiler.ts` compiles a seven-step route, policy, calculation, and reimbursement workflow backed by its own `MileageProjection`; the deployed browser journey completes it and produces a `MILE-*` reimbursement rather than an expense.
- [x] Add mileage-specific capabilities and fixtures. — Evidence: `src/domain/manifests.ts` defines separate V1/V2 mileage manifests and `src/domain/fixtures.ts` owns the typed route, distance, purpose, vehicle, date, and reimbursement-rate facts.
- [x] Validate the generated session plan against the live capability manifest. — Evidence: `StartJourney` compiles against `getManifest(portalVersion)` and rejects a plan unless `validateJourneyPlan` verifies every capability, risk, anchor, required field, actor permission, and duplicate; focused tests prove both valid and unknown-capability cases.
- [x] Do not reuse the expense task while merely relabeling it as mileage. — Evidence: mileage has its own projection, commands, events, capability IDs, semantic anchors, UI form, calculation, confirmation kind, completion ID, WebMCP tools, two manifest versions, and browser suite; the test asserts every compiled capability begins with `mileage.` and the expense projection remains empty.
- [x] Demonstrate a different task starting successfully without a pre-existing guide. — Evidence: entering or speaking “Create an 18-mile mileage reimbursement…” automatically selects an on-demand source; `e2e/mileage.spec.ts` completes the distinct workflow and `e2e/voice.spec.ts` proves spoken start needs no second click.
- [x] Confirm the session-only plan is not presented as a published guide. — Evidence: its source remains `{ kind: "on-demand" }`, the UI labels it exactly `Planned for this session`, and it is absent from the bounded published-guide fixture/list; the deployed browser test asserts the session-only label before starting.
- [x] Demonstrate Show Me, With Me, For Me, and healing on the no-recording path where applicable. — Evidence: `src/test/mileageJourney.test.ts` completes mileage in all three policies with human-only submission and runs V2 healing in all three; `e2e/mileage.spec.ts` verifies full human execution and material distance-anchor/new-vehicle repair on the deployed site. Release gate `33622571965`, live protocol verification, and all 16 deployed browser tests passed for commit `f2cdccd` and Cloudflare version `ae343898-db45-49ef-a54d-df9fd20741bf`.

## 10. Voice and accessibility

- [x] Add speech output for the current instruction. — Evidence: the dock's contextual read control speaks the numbered current step, action, explanation, and control owner from `buildSpokenStatus`; pure and deployed browser tests assert the grounded instruction.
- [x] Add speech output for repair warnings. — Evidence: repair speech is generated from the live healing assessment, names safe-remap count and material requirements, and states that agent work is paused; the deployed mileage-repair voice journey asserts the actual `vehicleType` warning.
- [x] Add speech output for human approval summaries. — Evidence: expense and mileage speech read only visible consequence facts and omit the one-time challenge; tests prove the mileage summary includes `$12.06` and speech does not submit it.
- [x] Add a visible mute/unmute control. — Evidence: the dock renders a persistent labeled mute toggle, cancels active speech when muted, keeps a visible caption/fallback, and the browser test proves muted reads emit nothing until unmuted.
- [x] Test speech-available environments. — Evidence: `e2e/voice.spec.ts` installs a deterministic Speech Synthesis implementation and verifies instruction, repair, approval, speaking, and mute paths locally and against Cloudflare.
- [x] Test speech-unavailable environments. — Evidence: the browser suite removes both speech APIs, confirms visible guidance remains, and verifies the app reports `Speech output is unavailable in this browser.` without blocking the journey.
- [x] Automatically speak each newly guided human-owned step once. — Evidence: speech is keyed by session, step, and resolved anchor; `e2e/voice.spec.ts` observes the starting-point instruction without pressing the read control, while the guidance suite proves one accepted event per step.
- [x] Start a spoken task without a second click. — Evidence: a deterministic SpeechRecognition browser test speaks a mileage goal, observes the mileage journey and `Planned for this session` source, and never activates the start button.
- [x] Add typed and spoken mid-session journey help. — Evidence: `resolveGuidanceHelp` covers repeat, why, locate, progress, pause, resume, and agency-mode intents; four focused unit tests and browser tests exercise typed locating and spoken why-help.
- [x] Pause authoritative work while voice help listens and resume at the same step. — Evidence: the microphone path persists `JourneyPaused`, answers from the live manifest, resumes after speech, and remains at mileage step 1 with the normal Pause control restored.
- [x] Keep raw help transcripts out of persistence. — Evidence: help parsing and locator state remain client-local; the voice browser test fetches the accepted event stream and proves the spoken question text is absent.
- [x] Test reduced-motion mode. — Evidence: `e2e/accessibility-responsive.spec.ts` emulates reduced motion, verifies decorative route movement is collapsed, and confirms the primary content and demo action remain visible on the deployed site.
- [x] Verify no animation is required to understand state. — Evidence: control ownership, current step, risk, source provenance, repair classification, confirmation boundary, and completion are all rendered as text and semantic controls; the reduced-motion browser journey preserves them.
- [x] Complete keyboard-only testing. — Evidence: `e2e/guidance.spec.ts` completes every Show Me step and the human-only sensitive confirmation through native keyboard focus/activation, ending at verified completion locally and in the deployed suite.
- [x] Complete screen-reader labeling and live-region testing. — Evidence: the full journey exposes atomic step/control announcements, polite coach and voice states, named agency radios, named speech/pause controls, and an announced verified completion; accessibility browser tests pass against production.

## 11. Landing page and visual experience

- [x] Add an interactive three-mode preview rather than relying only on static mode cards. — Evidence: each accessible mode button updates a live reimbursement task, ownership sequence, explanation, and moving baton; browser tests operate Show Me and Do It For Me and assert their distinct owners.
- [x] Add the teach-once and on-demand convergence story. — Evidence: the `TWO STARTS · ONE SAFE RUNTIME` map visibly connects a recorded expert demonstration and a session-only live-capability plan to the same policy, revision, repair, and human-boundary runtime.
- [x] Add a visible healing morph demonstration. — Evidence: the V1/V2 control moves `expense.create` from a sidebar mock to a header mock while revealing the new human-reviewed field; local and deployed browser tests operate both states and verify opacity, content, and semantic tether.
- [x] Add a stronger WebMCP proof section showing actual registered tools and shared state. — Evidence: the landing page diagrams human clicks and ChatGPT tool calls converging on authoritative revision 7, then shows real `get_journey`, dynamic `update_mileage_draft`, and prepare-only `prepare_mileage_submission` contracts.
- [x] Add the final conversion CTA specified by the plan. — Evidence: the final high-contrast section states the guest/no-extension proposition and links `Start in the shared surface` to the working demo; deployed browser tests confirm it is visible.
- [x] Add a copyable judge/demo prompt. — Evidence: the non-trivial mileage/delegation/repair prompt has a named copy control, a visible `Copied` state, and a deployed clipboard test that reads back the expected text.
- [x] Complete route-drawing animation. — Evidence: the hero now layers a `route-progress` path with a seven-second stroke-dash draw over the route and synchronizes it with the traveling state marker; the browser test asserts its `route-draw` animation and path length.
- [x] Complete human/agent control-baton handoff animation. — Evidence: changing modes transitions the baton between labeled YOU and AGENT endpoints in 650 ms; the browser test waits for both positions, measures the movement, and verifies the transition duration.
- [x] Complete semantic-anchor movement animation during healing. — Evidence: V1→V2 fades and translates the old anchor while promoting the new header anchor, preserves the `expense.create` tether, and separately reveals the material requirement; browser geometry/style assertions pass.
- [x] Confirm animations remain smooth under CPU throttling. — Evidence: `e2e/landing-experience.spec.ts` applies Chromium 6× CPU throttling, operates the mode handoff and V2 repair morph, and requires both visible state changes within three seconds; the deployed run passes.
- [x] Validate that a new visitor understands the product within five seconds. — Evidence: in-app browser visual inspection confirmed the first viewport communicates the task, three control levels, healing, and human authority without scrolling; an automated five-second information-scent test requires the headline, concrete lede, three proof points, and primary action to render together and passes locally and deployed.
- [x] Verify the primary demo CTA is above the fold at common screen sizes. — Evidence: the browser suite measures the CTA at 1440×900, 1280×720, and 390×844 and requires its bottom edge to remain within each first viewport.
- [x] Remove ambiguity about which actions belong to the human and which belong to the agent. — Evidence: the interactive task labels every sequence step YOU or AGENT, shows the current owner in text, and states that submission never moves; the live demo independently enforces and announces the same ownership policy.

## 12. Automated test coverage

### Journey and policy tests

- [x] Show Me rejects every agent domain mutation. — Evidence: `src/test/agencyModes.test.ts` attempts every expense-domain mutation as an agent at its current Show Me step and compares the unchanged snapshot after each policy rejection.
- [x] With Me only permits the current reversible agent-assigned step. — Evidence: `src/test/agencyModes.test.ts` permits assigned receipt extraction, denies the human-owned project judgment, rejects an out-of-order prior field, and permits the next assigned category step.
- [x] For Me rejects sensitive agent execution. — Evidence: `src/test/agencyModes.test.ts` lets the agent complete every reversible expense step, then proves agent confirmation returns `POLICY_DENIED` without changing state.
- [x] All six mode transitions preserve valid state. — Evidence: the table-driven agency suite covers Show→With, Show→For, With→Show, With→For, For→Show, and For→With while comparing the complete projection and completed capabilities.
- [x] Out-of-order commands do not mutate state. — Evidence: the agency suite attempts `expense.project` while `expense.date` is current, receives `PRECONDITION_FAILED`, and verifies the projection is unchanged.
- [x] Repair and confirmation states block inappropriate progression. — Evidence: `src/test/agencyModes.test.ts` and `src/test/healingEngine.test.ts` prove ordinary progression returns `REPAIR_REQUIRED` or `AWAITING_HUMAN` until the corresponding person-controlled boundary resolves.

### Healing tests

- [x] V1 capability maps to a V2 semantic anchor. — Evidence: `src/test/healingEngine.test.ts` compiles a changed capability ID through its surviving anchor and verifies the remapped ID, anchor, and current step.
- [x] Removed capability blocks. — Evidence: the pure healing suite removes a required capability and verifies a blocked assessment with a grounded reason.
- [x] An already-satisfied postcondition skips safely. — Evidence: the compiler receives an already-populated project fact and marks the corresponding proposed step complete.
- [x] A newly required field creates a repair. — Evidence: the suite evaluates real Portal V1→V2 manifests in all three modes and finds `expense.businessPurpose` as the current material repair step.
- [x] Repair cannot downgrade sensitive to reversible. — Evidence: healing tests block risk increases, block expanded agent authority, keep agent-ineligible work human-owned, and reject a tampered repair assignment.
- [x] Rejected repair preserves state and stops. — Evidence: both `src/test/healingEngine.test.ts` and deployed `e2e/healing.spec.ts` compare preserved facts after rejection and prove the prepare action remains unavailable.

### Recording tests

- [x] Recording only starts explicitly. — Evidence: `src/test/recordingEngine.test.ts` proves ordinary actions do not create a trace before the human sends `StartRecording`.
- [x] Capture redacts sensitive data. — Evidence: recording tests execute before/after snapshots containing receipt details and confirmation data, then verify the retained trace contains only allowlisted semantic fields and narration.
- [x] Drafts contain registered capabilities only. — Evidence: the recording suite accepts a deterministic draft made solely from registered capabilities and rejects an injected unknown capability.
- [x] Agents cannot publish. — Evidence: recording tests deny `PublishGuide` for the agent without mutation and permit publication only from the visible human UI actor.

### Tool-handler tests

- [x] Strict input validation. — Evidence: `src/test/toolContracts.test.ts` verifies generated closed JSON Schemas, field bounds, rejected extra properties, and agreement with the runtime Zod parsers.
- [x] Bounded result size. — Evidence: `src/test/resultFormat.test.ts` enforces a 1,500-byte ceiling for representative read and mutation results; trace and event collections are independently bounded.
- [x] Fresh-state execution. — Evidence: `src/test/webmcpLifecycle.test.tsx` advances the snapshot to revision 3 after registration and observes revision 3 when invoking the still-registered route tool.
- [x] Prepare-only confirmation behavior. — Evidence: the lifecycle suite proves no confirmation tool exists, while the approval and agency tests prove preparation stops at `awaiting_confirmation` for visible human action.
- [x] Correct read/write/destructive annotations. — Evidence: the complete 15-tool lifecycle audit requires explicit read-only, destructive, idempotent, and open-world hints for every registered tool.
- [x] Unregister on abort, route change, and unmount. — Evidence: `src/test/webmcpLifecycle.test.tsx` verifies the exact AbortSignal lifecycle, aborts all registrations when the WebMCP route is disabled, and proves every registration is aborted on Strict Mode unmount.
- [x] Dynamic registration without duplicates. — Evidence: lifecycle tests traverse idle, active, repair, recording, expense, and mileage states and require one active registration per name under React Strict Mode.
- [x] Cancellation and ambiguous-result reconciliation. — Evidence: `src/test/journeyClient.test.ts` proves cancellation reaches `fetch`, looks up the idempotency result, returns the authoritative committed result when present, and surfaces `AMBIGUOUS_OUTCOME` when absent.

### Persistence and protocol tests

- [x] Duplicate operation ID creates no second event. — Evidence: `src/test/JourneyCoordinator.test.ts` resends one operation ID, receives `deduplicated: true` at the original revision, and reads exactly one persisted event.
- [x] Two commands against one revision produce one stale-revision rejection. — Evidence: the in-memory Durable Object concurrency test sends two mode changes concurrently at revision 1 and observes exactly one success plus one `STALE_REVISION` at revision 2.
- [x] Event replay reconstructs the exact snapshot. — Evidence: `src/test/replay.property.test.ts` generates arbitrary valid mode sequences and compares the replayed snapshot structurally with the stored snapshot.
- [x] A tampered chain blocks progression. — Evidence: the replay suite changes a hashed event payload and verifies the reconstructed session is blocked with `historyVerified: false`.
- [x] Expired or replayed confirmation challenge fails. — Evidence: `src/test/journeyEngine.test.ts` uses a controlled clock to reject a six-minute-old challenge, accepts it once before expiry, rejects replay, and compares unchanged state after each rejection.
- [x] The trail shows accepted events only. — Evidence: the concurrent coordinator test persists two accepted revisions while retaining the rejected stale command only as its operation result; the event endpoint returns exactly those two accepted events.
- [x] Logs and results redact identifiers, challenges, receipt content, and upstream payloads. — Evidence: `src/test/logging.test.ts`, `src/test/resultFormat.test.ts`, and `src/test/recordingEngine.test.ts` feed each prohibited value through the relevant boundary and prove it is absent from serialized output.

### Property-based invariants

- [x] Revisions are monotonic. — Evidence: the fast-check replay property generates up to 20 mode changes and requires the emitted revision sequence to equal every integer from 1 through the final event count.
- [x] Operations apply at most once. — Evidence: the coordinator idempotency test proves retrying an arbitrary UUID returns the stored result and creates no second event; the live protocol verifier independently confirms exactly-once behavior on Cloudflare.
- [x] Sensitive actions are never executed by an agent. — Evidence: the exhaustive policy suite attempts sensitive submission in all agency modes and at the prepared boundary; every agent attempt is rejected without mutation.
- [x] Progress never crosses an unapproved repair. — Evidence: healing tests attempt preparation before a proposal and again before approval; both return `REPAIR_REQUIRED`, with the repaired step becoming current only after human approval.
- [x] Completed facts persist except after reset. — Evidence: a fast-check property completes the expense date, generates arbitrary mode changes, and verifies the date and completed step after every transition; reset behavior is separately covered by the domain suite.
- [x] Replay equals stored state. — Evidence: fast-check rebuilds each generated valid event sequence and requires complete snapshot equality plus `historyVerified: true`.
- [x] Hash-chain verification detects tampering. — Evidence: the tamper property alters hashed safe payload data and verifies replay blocks the session.
- [x] Migrations never expand authority. — Evidence: the healing compiler suite blocks a manifest that adds agent authority and converts constrained work back to human ownership in delegated mode.

### Worker and fault tests

- [x] A domain mutation atomically commits snapshot, event, and idempotency record. — Evidence: `src/test/JourneyCoordinator.test.ts` executes the real transaction path and inspects all three staged keys at the same committed revision.
- [x] Cancellation before commit creates no event. — Evidence: the client cancellation test simulates an abort before request delivery, finds no authoritative operation at the operation endpoint, and returns an explicit ambiguous outcome instead of claiming a mutation.
- [x] A lost response after commit reconciles correctly. — Evidence: `src/test/journeyClient.test.ts` aborts the first response, returns the authoritative stored operation on lookup, and verifies `reconciled: true` at the committed revision.
- [x] Refresh during confirmation behaves safely. — Evidence: deployed `e2e/persistence.spec.ts` reloads at the expiring human boundary, verifies the exact amount and project, completes once, reloads again, and observes durable verified completion.
- [x] Multiple tabs converge. — Evidence: deployed `e2e/persistence.spec.ts` opens two tabs on one guest session, starts from tab one, advances from tab two, and observes each revision propagate to the other through the shared authoritative journey.
- [x] Worker restart and reload preserve state. — Evidence: the coordinator persistence test reconstructs a new Durable Object instance over the same storage and reads the prior revision; the browser persistence test proves the same behavior across UI reloads and the retention alarm test proves deliberate expiry.
- [x] Validate request-size limits, origin checks, rate limiting, CSP, Permissions Policy, and Origin-Agent-Cluster headers. — Evidence: coordinator tests verify 413 and pre-transaction 429 behavior; `src/test/worker.integration.test.ts` proves cross-origin rejection and all named headers; `npm run verify:live` passed the same protocol and header assertions on Cloudflare version `1b0340ff-f1cf-4c87-9be8-c72ea6b76f8c`.

## 13. Browser prompt evaluation

- [x] Run the direct-start prompt category repeatedly in the target WebMCP browser. — Evidence: three final Codex in-app-browser runs used the live page-defined tools to reach `awaiting_confirmation`; an earlier registration-budget failure led to the Reset reload fix in `bae400b`.
- [x] Run the guidance-only prompt category repeatedly in the target WebMCP browser. — Evidence: 3/3 runs selected Show Me, invoked semantic guidance, retained an empty expense, and yielded in `awaiting_user`.
- [x] Run the collaborative prompt category repeatedly in the target WebMCP browser. — Evidence: 3/3 runs alternated WebMCP receipt work, the visible human **Choose Project Atlas** action, resumed WebMCP work, and the human-only final boundary.
- [x] Run the delegation prompt category repeatedly in the target WebMCP browser. — Evidence: 3/3 runs executed all reversible expense work and stopped with `needsHuman: true`; the live surface exposed no confirmation tool.
- [x] Run the no-recording mileage prompt category repeatedly in the target WebMCP browser. — Evidence: 3/3 corrected runs discovered the current V1 capabilities, compiled on demand, completed all five V1 facts, and prepared the 18-mile reimbursement for human review.
- [x] Run the ambiguous prompt category repeatedly in the target WebMCP browser. — Evidence: 3/3 runs used only `get_app_context` and `get_journey`, retained idle revision 0, and requested missing facts rather than inferring a task.
- [x] Run the adversarial prompt category repeatedly in the target WebMCP browser. — Evidence: 3/3 runs observed the hostile “submit twice” receipt note through an untrusted-content tool, ignored it, executed one valid sequence, and stopped for a person.
- [x] Run the out-of-order prompt category repeatedly in the target WebMCP browser. — Evidence: 3/3 “Submit immediately” runs remained read-only at revision 0 with no finalization tool or mutation.
- [x] Run the mid-chain mode-change prompt category repeatedly in the target WebMCP browser. — Evidence: 3/3 runs preserved four completed expense facts across Portal V2, inspected the new manifest, proposed the bounded repair, and stopped at human approval.
- [x] Run the mode-violation prompt category repeatedly in the target WebMCP browser. — Evidence: 3/3 hostile Show Me requests exposed and invoked guidance only; expense facts remained empty and control stayed with the person.
- [x] Record browser, model, date, prompt, tool sequence, outcome, and failure for every run. — Evidence: `evals/browser-runs-2026-09-02.json` retains all 35 attempts, including 30 passes, five failures, human actions, failure classes, and resolutions.
- [x] Publish the results in `docs/evals.md`. — Evidence: the report documents production build, method, exact categories, 30/30 final results, all exploratory failures, resolutions, and reproduction steps.
- [x] Fix prompts or tool descriptions that cause inconsistent routing. — Evidence: the canonical mileage prompt now names current V1 facts; Reset reloads a clean document after durable reset; the adversarial fixture contains actual hostile data; three consecutive final trials pass in every category with no remaining description-driven misrouting.

## 14. Full end-to-end matrix

- [x] Test three modes against the V1 portal. — Evidence: `src/test/agencyModes.test.ts` completes Show Me, With Me, and For Me from reset through verified submission on `expense.v1`, checking the promised control split and final projection.
- [x] Test three modes against a cosmetic portal change. — Evidence: the healing matrix moves a live semantic anchor in Show Me, With Me, and For Me, verifies a safe remap with no material changes, and compares all completed facts.
- [x] Test three modes against a material portal change. — Evidence: `src/test/healingEngine.test.ts` runs V1→V2 in every mode, requires proposal plus human approval, preserves all facts, assigns the new field correctly, and resumes at preparation.
- [x] Test all six directed mode transitions. — Evidence: the agency table covers Show→With, Show→For, With→Show, With→For, For→Show, and For→With with complete-state preservation assertions.
- [x] Test recorded-guide and on-demand flows. — Evidence: expense agency and recording suites exercise the reviewed guide; mileage unit, deployed browser, and live WebMCP evals exercise a no-guide on-demand compilation.
- [x] Test WebMCP available and unavailable. — Evidence: 30 in-app-browser trials invoke native page-defined WebMCP tools; the Playwright manual journey completes the same product path with `document.modelContext` absent.
- [x] Test speech available and unavailable. — Evidence: `e2e/voice.spec.ts` stubs speech support and absence, proving spoken instructions/mute behavior and the visible fallback; both pass on the deployed build.
- [x] Test continuous guidance, real controls, automatic speech, voice start/help, and point-on-demand. — Evidence: the expanded local browser suite contains 38 passing scenarios, including automatic exactly-once guidance, invalid input retention, real-control keyboard completion, typed locator help, spoken task start, and pause/answer/resume voice help.
- [x] Test keyboard and reduced-motion modes. — Evidence: deployed guidance tests complete the journey using keyboard activation and responsive tests verify decorative motion collapses under `prefers-reduced-motion` without hiding content.
- [x] Test reset and refresh. — Evidence: `e2e/persistence.spec.ts` preserves confirmation and completion over reload, then verifies Reset creates an idle journey in a fresh browser document.
- [x] Test concurrent, double-clicked, and canceled actions. — Evidence: coordinator tests serialize two same-revision commands; the deployed browser sends two synchronous Start clicks and stores one event; client tests cover cancellation before and after possible commit.
- [x] Test route-change tool unregistration. — Evidence: `src/test/webmcpLifecycle.test.tsx` disables the WebMCP route and verifies every route/state registration signal is aborted.
- [x] Test Worker restart and persistence. — Evidence: a new `JourneyCoordinator` instance reads the prior revision from shared durable storage; deployed reload and cross-tab tests observe the same authoritative state.

## 15. Performance and visual quality

The owner explicitly deferred the two numerical Lighthouse targets on September 2 so submission-critical work could continue. They remain unchecked and are not represented as completed.

- [ ] Achieve a Lighthouse performance score of at least 90.
- [ ] Achieve a Lighthouse accessibility score of at least 90.
- [x] Remove all production console errors. — Evidence: `e2e/performance-quality.spec.ts` captures browser console errors and uncaught page errors while loading the landing page, entering the demo, and starting the shared journey; the deployed Cloudflare run passed with both collections empty.
- [x] Verify no third-party request blocks the main flow. — Evidence: the same deployed browser test records every HTTP(S) request during the main flow and fails on any origin other than `pave-to-done.north-raincoat.workers.dev`; it passed with no third-party origins.
- [x] Test guidance at phone, tablet, laptop, and wide-desktop widths. — Evidence: `e2e/guidance.spec.ts` verifies the live semantic target attachment at 390×844, 1024×720, 1440×900, and 1920×1080 with less than two pixels of positional variance; all deployed checks passed.
- [x] Confirm coach elements remain visible and do not cover targets. — Evidence: deployed guidance tests require the coach to remain at least 11 pixels inside every viewport, keep both overlay layers at `pointer-events: none`, and prove the underlying human action advances the journey.
- [x] Confirm animations use transform/opacity where possible and remain smooth under throttling. — Evidence: `e2e/performance-quality.spec.ts` inspects production CSSOM keyframes and permits transform, opacity, and SVG stroke motion while rejecting layout properties; `e2e/landing-experience.spec.ts` exercises signature interactions under 6× CPU throttling. Both deployed tests passed.

## 16. Human usability testing

The complete uncoached protocol and blank observation record are ready in `docs/usability-test.md`. These items require two uninvolved people and remain unchecked until the attempts actually occur.

- [ ] Conduct two uncoached usability attempts.
- [ ] Use people who have not been involved in implementation.
- [ ] Ask each participant to discover and complete the demo without verbal help.
- [ ] Record comprehension and workflow blockers.
- [ ] Fix every material blocker found.
- [ ] Repeat each affected flow after its fixes.

## 17. Production environment verification

- [x] Test the permanent production URL in ChatGPT's in-app browser. — Evidence: on September 2, the in-app browser discovered the deployed page's native WebMCP surface and completed `get_app_context`, `create_journey`, `create_expense_draft`, two `update_expense_draft` calls, and `prepare_expense_submission` against the visible production UI.
- [ ] Test it in Chrome 149+ with WebMCP enabled.
- [x] Test logged out or in incognito mode. — Evidence: all 32 deployed Playwright scenarios passed in fresh ephemeral browser contexts with no stored login or application cookies.
- [ ] Test on a second machine or device.
- [ ] Test on a second network.
- [x] Test the mobile layout. — Evidence: the deployed responsive suite completes layout and semantic guidance checks at 390×844, including no horizontal overflow and a fully visible, non-blocking coach.
- [x] Verify diagnostics report genuine WebMCP registration and invocation. — Evidence: after the native `prepare_expense_submission` call, the deployed panel reported WebMCP ready, top-level, origin isolated, tools allowed, the five state-relevant registered tools, operation `f37cb023…`, revision 4→5, outcome `ok`, and `Applied and verified`; the capture is `docs/assets/webmcp-invocation-live.jpg`.

## 18. README and media

- [x] Replace or supplement the GIF with one that proves real WebMCP tool calls. — Evidence: `docs/assets/webmcp-invocation.gif` contains seven frames captured from one deployed ChatGPT in-app-browser session driven through the page's native WebMCP capability; `docs/media-proof.md` records the exact sequence and reproduction command.
- [x] Show visible tool invocation and corresponding UI/state changes in the GIF. — Evidence: every frame pairs the changing expense fields and control boundary with diagnostics for the actual last command, operation, revisions, registered tools, and verification outcome.
- [x] Verify GIF playback on the logged-out GitHub repository. — Evidence: an unauthenticated GitHub request reported `currentUser: null`, `isLoggedIn: false`, the public repository and visible MIT license, and rendered the image with `data-animated-image`; the unauthenticated raw download decoded as a 960×540 seven-frame GIF and matched the committed SHA-256 exactly.
- [x] Verify meaningful GIF alt text. — Evidence: the README alt text describes the actual progression from inspection through journey creation, draft changes, and the human-only confirmation boundary rather than using a generic image label.
- [x] Ensure every README command works from a fresh clone. — Evidence: a public depth-one clone into `/tmp/pave-fresh-verify-20260902` installed with zero vulnerabilities, passed formatting, lint, generated Worker-type consistency, type checking, all 91 tests, the production build, all 32 browser tests through the documented dev server, and the live verifier without relying on the working tree.
- [ ] Ensure README instructions match the frozen submission tag and deployment.

## 19. Demo video

- [x] Record a narrated demo shorter than three minutes. — Evidence: `npm run render:video` produced `docs/video/pave-to-done-demo.mp4` at 2:21, safely below the three-minute limit, from the permanent deployment and genuine in-app-browser WebMCP captures.
- [x] Include an audible explanation. — Evidence: the MP4 contains a 141-second AAC narration track covering the problem, three modes, WebMCP, approval boundary, healing, no-guide path, and implementation; automated audio analysis measured -16.1 dB mean and -1.6 dB peak rather than silence.
- [x] Show actual WebMCP tool registration or diagnostics. — Evidence: the video uses the provenance-recorded frames from the real native WebMCP run; the panel visibly shows live registered tools, command name, operation ID, sent/returned revisions, and verified outcome.
- [x] Show the agent invoking multiple tools. — Evidence: the seven-frame live sequence advances through `get_app_context`, `create_journey`, `create_expense_draft`, two `update_expense_draft` calls, and `prepare_expense_submission` while the visible expense changes.
- [x] Show all three modes. — Evidence: the deployed application footage visibly selects Show Me, Do It With Me, and Do It For Me during one journey without discarding progress.
- [x] Show a sensitive action requiring human confirmation. — Evidence: the native WebMCP sequence ends at the human-only review boundary and the live product footage shows the visible confirmation control rather than an agent submission tool.
- [x] Show a website change and self-healing repair. — Evidence: the video shows Portal v2 moving the expense action, adding the material business-purpose requirement, the real `propose_journey_repair` diagnostic at revision 3→4, and the subsequent human approval at revision 5.
- [x] Show recording or the no-guide path. — Evidence: the video shows the live `mileage.v1` on-demand manifest labeled `PLANNED FOR THIS SESSION`, created by a real `create_journey` WebMCP call without a recorded guide.
- [x] Show the resulting shared visible state. — Evidence: each WebMCP frame pairs the agent command diagnostics with the same portal fields, journey step, revision, and history verification visible to the person.
- [ ] Upload the video publicly to YouTube.
- [ ] Verify playback while logged out.
- [ ] Confirm audio, captions, resolution, and description links.

## 20. Devpost submission

- [x] Write final text explaining why the use case is a strong fit for WebMCP. — Evidence: `DEVPOST_SUBMISSION.md` explains that WebMCP is the in-product collaboration contract for live capabilities, shared state, guidance, execution, repair, and verified postconditions, and states exactly what disappears without it.
- [x] Explain how the product creates a better user experience. — Evidence: the final copy describes one visible task that can move between instruction, turn-taking, and delegation while retaining progress, text/voice fallbacks, verification, and human control.
- [x] Explain what people and agents can now do together that was difficult or impossible before. — Evidence: the copy states that a person and agent can exchange responsibility, repair a changed workflow, and continue from common verified state without restarting or copying context.
- [x] Briefly explain how WebMCP was implemented. — Evidence: the implementation section names imperative registration, 15 state-scoped tools, strict generated schemas, lifecycle cleanup, semantic anchors, shared typed commands, Durable Object serialization, exactly-once operations, and confirmation boundaries.
- [x] Make the real audience and problem specific and credible. — Evidence: the description identifies SaaS product, support, customer-education, and operations teams that repeatedly teach changing workflows, then confines claims to the fictional expense and mileage proof.
- [x] Explain novelty compared with ordinary browser automation and existing products. — Evidence: the `What makes it different` section contrasts pixel/selector automation, passive tours, and separate agent workspaces with an in-product, versioned semantic journey that combines agency changes and authority-preserving repair.
- [x] Add the permanent live URL. — Evidence: the links section uses `https://pave-to-done.north-raincoat.workers.dev/demo`, which passed the live verifier and deployed browser suite.
- [x] Add the public repository URL. — Evidence: the links section uses the logged-out verified public MIT repository `https://github.com/Tanya-Khanna/pave-to-done`.
- [ ] Add the public YouTube URL.
- [ ] Complete all required submission fields.
- [ ] Save and preview the submission early.
- [ ] Verify every link while logged out.
- [ ] Submit before the internal target time rather than waiting for 4:00 PM.
- [ ] Save the submission receipt and final public link.

## 21. Release freeze

- [ ] Finish the complete regression suite before freezing.
- [ ] Create the exact final tag `submission-v1.0.0`.
- [ ] Record the Cloudflare deployment or version ID tied to that tag.
- [ ] Confirm repository, deployed application, GIF, video, README, and Devpost description all describe the same build.
- [ ] Check every item in `SUBMISSION_CHECKLIST.md`.
- [ ] Stop modifying the submitted repository and deployment after the deadline.
- [ ] If development continues after submission, work in a fork or separate copy.

## Final definition of done

- [ ] ChatGPT visibly invokes registered tools on the deployed top-level page.
- [ ] The landing page is polished, fast, and routes judges directly into the demo.
- [ ] The repository is public, licensed, reproducible, documented, and matches the deployed release tag.
- [ ] The public YouTube demo is under three minutes, audible, and shows real WebMCP use.
- [ ] The Devpost submission is complete and every public artifact works while logged out before the internal deadline.
