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

**Active step:** Step 8 — Teach once and recording (with Chrome verification pending in Step 1 and mileage bounds deferred from Step 4 to Step 9)
**Completed in Step 1:** 8 of 9 items
**Completed in Step 2:** 3 of 3 items
**Completed in Step 3:** 4 of 4 items
**Completed in Step 4:** 19 of 20 items
**Completed in Step 5:** 12 of 12 items
**Completed in Step 6:** 8 of 8 items
**Completed in Step 7:** 16 of 16 items

**Current deployment:** Cloudflare version `aeb8eab9-94cc-4ce5-96da-50d006facd55` from verified GitHub commit `5b165f2` at `https://pave-to-done.north-raincoat.workers.dev`. GitHub release gate `33598613004`, the live protocol verifier, all 59 local unit/integration tests, and all 13 deployed browser tests passed.

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
- [x] Audit every tool name, description, parameter description, and annotation. — Evidence: the lifecycle test reaches all 13 state-dependent and route tools, asserts the exact public name set, validates closed schemas, and requires explicit read-only, destructive, idempotent, and open-world annotations.
- [x] Keep tool descriptions below roughly 500 characters and parameter descriptions below roughly 150 characters. — Evidence: lifecycle tests enforce 500 characters for every registered tool; schema tests recursively enforce 150 characters for every generated parameter description.
- [ ] Add appropriate numeric and string bounds, including mileage inputs.
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

- [ ] Capture before-state and after-state for every recorded action.
- [ ] Attach optional narration to recording entries.
- [ ] Build deterministic server-backed guide drafting from ordered recording events when no agent is available.
- [ ] Make the resulting draft visible for human review.
- [ ] Ensure only registered capabilities can appear in a draft.
- [ ] Verify recording begins only after explicit human activation.
- [ ] Verify sensitive values are redacted at capture time.
- [ ] Verify an agent cannot publish a guide.
- [ ] Complete the human publish flow with clear recorded/draft provenance.
- [ ] Use the exact source labels `Recorded guide`, `AI-generated draft`, and `Planned for this session`.

## 9. No-recording and mileage workflow

- [ ] Build a genuine second task for the no-recording path.
- [ ] Add mileage-specific capabilities and fixtures.
- [ ] Validate the generated session plan against the live capability manifest.
- [ ] Do not reuse the expense task while merely relabeling it as mileage.
- [ ] Demonstrate a different task starting successfully without a pre-existing guide.
- [ ] Confirm the session-only plan is not presented as a published guide.
- [ ] Demonstrate Show Me, With Me, For Me, and healing on the no-recording path where applicable.

## 10. Voice and accessibility

- [ ] Add speech output for the current instruction.
- [ ] Add speech output for repair warnings.
- [ ] Add speech output for human approval summaries.
- [ ] Add a visible mute/unmute control.
- [ ] Test speech-available environments.
- [ ] Test speech-unavailable environments.
- [ ] Test reduced-motion mode.
- [ ] Verify no animation is required to understand state.
- [ ] Complete keyboard-only testing.
- [ ] Complete screen-reader labeling and live-region testing.

## 11. Landing page and visual experience

- [ ] Add an interactive three-mode preview rather than relying only on static mode cards.
- [ ] Add the teach-once and on-demand convergence story.
- [ ] Add a visible healing morph demonstration.
- [ ] Add a stronger WebMCP proof section showing actual registered tools and shared state.
- [ ] Add the final conversion CTA specified by the plan.
- [ ] Add a copyable judge/demo prompt.
- [ ] Complete route-drawing animation.
- [ ] Complete human/agent control-baton handoff animation.
- [ ] Complete semantic-anchor movement animation during healing.
- [ ] Confirm animations remain smooth under CPU throttling.
- [ ] Validate that a new visitor understands the product within five seconds.
- [ ] Verify the primary demo CTA is above the fold at common screen sizes.
- [ ] Remove ambiguity about which actions belong to the human and which belong to the agent.

## 12. Automated test coverage

### Journey and policy tests

- [ ] Show Me rejects every agent domain mutation.
- [ ] With Me only permits the current reversible agent-assigned step.
- [ ] For Me rejects sensitive agent execution.
- [ ] All six mode transitions preserve valid state.
- [ ] Out-of-order commands do not mutate state.
- [ ] Repair and confirmation states block inappropriate progression.

### Healing tests

- [ ] V1 capability maps to a V2 semantic anchor.
- [ ] Removed capability blocks.
- [ ] An already-satisfied postcondition skips safely.
- [ ] A newly required field creates a repair.
- [ ] Repair cannot downgrade sensitive to reversible.
- [ ] Rejected repair preserves state and stops.

### Recording tests

- [ ] Recording only starts explicitly.
- [ ] Capture redacts sensitive data.
- [ ] Drafts contain registered capabilities only.
- [ ] Agents cannot publish.

### Tool-handler tests

- [ ] Strict input validation.
- [ ] Bounded result size.
- [ ] Fresh-state execution.
- [ ] Prepare-only confirmation behavior.
- [ ] Correct read/write/destructive annotations.
- [ ] Unregister on abort, route change, and unmount.
- [ ] Dynamic registration without duplicates.
- [ ] Cancellation and ambiguous-result reconciliation.

### Persistence and protocol tests

- [ ] Duplicate operation ID creates no second event.
- [ ] Two commands against one revision produce one stale-revision rejection.
- [ ] Event replay reconstructs the exact snapshot.
- [ ] A tampered chain blocks progression.
- [ ] Expired or replayed confirmation challenge fails.
- [ ] The trail shows accepted events only.
- [ ] Logs and results redact identifiers, challenges, receipt content, and upstream payloads.

### Property-based invariants

- [ ] Revisions are monotonic.
- [ ] Operations apply at most once.
- [ ] Sensitive actions are never executed by an agent.
- [ ] Progress never crosses an unapproved repair.
- [ ] Completed facts persist except after reset.
- [ ] Replay equals stored state.
- [ ] Hash-chain verification detects tampering.
- [ ] Migrations never expand authority.

### Worker and fault tests

- [ ] A domain mutation atomically commits snapshot, event, and idempotency record.
- [ ] Cancellation before commit creates no event.
- [ ] A lost response after commit reconciles correctly.
- [ ] Refresh during confirmation behaves safely.
- [ ] Multiple tabs converge.
- [ ] Worker restart and reload preserve state.
- [ ] Validate request-size limits, origin checks, rate limiting, CSP, Permissions Policy, and Origin-Agent-Cluster headers.

## 13. Browser prompt evaluation

- [ ] Run the direct-start prompt category repeatedly in the target WebMCP browser.
- [ ] Run the guidance-only prompt category repeatedly in the target WebMCP browser.
- [ ] Run the collaborative prompt category repeatedly in the target WebMCP browser.
- [ ] Run the delegation prompt category repeatedly in the target WebMCP browser.
- [ ] Run the no-recording mileage prompt category repeatedly in the target WebMCP browser.
- [ ] Run the ambiguous prompt category repeatedly in the target WebMCP browser.
- [ ] Run the adversarial prompt category repeatedly in the target WebMCP browser.
- [ ] Run the out-of-order prompt category repeatedly in the target WebMCP browser.
- [ ] Run the mid-chain mode-change prompt category repeatedly in the target WebMCP browser.
- [ ] Run the mode-violation prompt category repeatedly in the target WebMCP browser.
- [ ] Record browser, model, date, prompt, tool sequence, outcome, and failure for every run.
- [ ] Publish the results in `docs/evals.md`.
- [ ] Fix prompts or tool descriptions that cause inconsistent routing.

## 14. Full end-to-end matrix

- [ ] Test three modes against the V1 portal.
- [ ] Test three modes against a cosmetic portal change.
- [ ] Test three modes against a material portal change.
- [ ] Test all six directed mode transitions.
- [ ] Test recorded-guide and on-demand flows.
- [ ] Test WebMCP available and unavailable.
- [ ] Test speech available and unavailable.
- [ ] Test keyboard and reduced-motion modes.
- [ ] Test reset and refresh.
- [ ] Test concurrent, double-clicked, and canceled actions.
- [ ] Test route-change tool unregistration.
- [ ] Test Worker restart and persistence.

## 15. Performance and visual quality

- [ ] Achieve a Lighthouse performance score of at least 90.
- [ ] Achieve a Lighthouse accessibility score of at least 90.
- [ ] Remove all production console errors.
- [ ] Verify no third-party request blocks the main flow.
- [ ] Test guidance at phone, tablet, laptop, and wide-desktop widths.
- [ ] Confirm coach elements remain visible and do not cover targets.
- [ ] Confirm animations use transform/opacity where possible and remain smooth under throttling.

## 16. Human usability testing

- [ ] Conduct two uncoached usability attempts.
- [ ] Use people who have not been involved in implementation.
- [ ] Ask each participant to discover and complete the demo without verbal help.
- [ ] Record comprehension and workflow blockers.
- [ ] Fix every material blocker found.
- [ ] Repeat each affected flow after its fixes.

## 17. Production environment verification

- [ ] Test the permanent production URL in ChatGPT's in-app browser.
- [ ] Test it in Chrome 149+ with WebMCP enabled.
- [ ] Test logged out or in incognito mode.
- [ ] Test on a second machine or device.
- [ ] Test on a second network.
- [ ] Test the mobile layout.
- [ ] Verify diagnostics report genuine WebMCP registration and invocation.

## 18. README and media

- [ ] Replace or supplement the GIF with one that proves real WebMCP tool calls.
- [ ] Show visible tool invocation and corresponding UI/state changes in the GIF.
- [ ] Verify GIF playback on the logged-out GitHub repository.
- [ ] Verify meaningful GIF alt text.
- [ ] Ensure every README command works from a fresh clone.
- [ ] Ensure README instructions match the frozen submission tag and deployment.

## 19. Demo video

- [ ] Record a narrated demo shorter than three minutes.
- [ ] Include an audible explanation.
- [ ] Show actual WebMCP tool registration or diagnostics.
- [ ] Show the agent invoking multiple tools.
- [ ] Show all three modes.
- [ ] Show a sensitive action requiring human confirmation.
- [ ] Show a website change and self-healing repair.
- [ ] Show recording or the no-guide path.
- [ ] Show the resulting shared visible state.
- [ ] Upload the video publicly to YouTube.
- [ ] Verify playback while logged out.
- [ ] Confirm audio, captions, resolution, and description links.

## 20. Devpost submission

- [ ] Write final text explaining why the use case is a strong fit for WebMCP.
- [ ] Explain how the product creates a better user experience.
- [ ] Explain what people and agents can now do together that was difficult or impossible before.
- [ ] Briefly explain how WebMCP was implemented.
- [ ] Make the real audience and problem specific and credible.
- [ ] Explain novelty compared with ordinary browser automation and existing products.
- [ ] Add the permanent live URL.
- [ ] Add the public repository URL.
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
