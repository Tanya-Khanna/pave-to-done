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

**Active step:** Step 1 — Architecture and platform gaps  
**Completed in Step 1:** 6 of 9 items  
**External verification still required:** authorize Wrangler for the claimed Cloudflare account, deploy this commit, and connect the Chrome browser extension so the Chrome 149+ WebMCP check can run. The currently deployed build was verified as top-level with working WebMCP, but it predates the new `Origin-Agent-Cluster` header and reports `window.originAgentCluster === false`.

## 1. Architecture and platform gaps

- [x] Decide whether to add React Router as specified or update the normative plans to document the current custom navigation. — Evidence: `IMPLEMENTATION_PLAN.md` now records the intentional two-route History API decision; `src/test/App.test.tsx` verifies direct routes and history navigation.
- [x] Decide whether to add Motion for the signature animations or update the normative plans to document the CSS/SVG implementation. — Evidence: `IMPLEMENTATION_PLAN.md`, `ENGINEERING_SPEC.md`, and `PRD.md` now consistently specify dependency-free CSS/SVG motion.
- [x] Generate WebMCP JSON Schemas from the canonical domain schemas; remove manually mirrored schemas. — Evidence: `src/webmcp/toolContracts.ts` generates every registered input schema with Zod 4 `toJSONSchema`; `src/test/toolContracts.test.ts` verifies closure, bounds, required fields, and runtime alignment.
- [x] Add meaningful React Testing Library coverage. — Evidence: `src/test/App.test.tsx` exercises root rendering, in-app navigation, deep linking, and browser-history restoration.
- [x] Add Miniflare or equivalent Worker integration tests. — Evidence: `src/test/worker.integration.test.ts` exercises the real Worker entrypoint for health, asset handling, production security headers, and pre-Durable-Object cross-origin rejection.
- [ ] Verify the application in Chrome 149+ with WebMCP enabled.
- [ ] Serve and verify `Origin-Agent-Cluster: ?1`.
- [x] Display `window.originAgentCluster` in the diagnostics panel. — Evidence: `useWebMCPTools` captures the runtime value and `DiagnosticPanel` renders `isolated` or `not isolated`; type-check and production build pass.
- [ ] Perform the final test on the exact deployed top-level URL, outside an iframe.

## 2. Repository and deployment foundation

- [ ] Connect continuous deployment; GitHub Actions must test, build, and deploy the intended release through a documented protected path.
- [ ] Run the complete Gate 0 fresh-clone exercise: install, test, build, local run, documented deployment, `/health`, `/demo`, top-level Worker origin, and origin isolation.
- [ ] Ensure a fresh contributor can deploy without relying on undocumented local state.

## 3. Domain model and backend foundations

- [ ] Define the complete named domain models: `JourneySnapshot`, `JourneyStep`, `Guide`, `RecordingTrace`, `Repair`, `AgencyPolicy`, portal and capability manifests, command/result envelopes, and event records.
- [ ] Move receipt, project, category, policy, recorded-guide, and related demo data into proper typed fixtures rather than UI constants.
- [ ] Add structured server logging for request ID, operation ID, expected revision, resulting revision, accepted event, and redacted failure details.
- [ ] Verify logs never contain receipt contents, challenges, sensitive identifiers, or raw upstream responses.

## 4. WebMCP contract completion

- [ ] Make WebMCP schemas single-source and generated.
- [ ] Enforce `additionalProperties: false` at every object boundary.
- [ ] Audit every tool name, description, parameter description, and annotation.
- [ ] Keep tool descriptions below roughly 500 characters and parameter descriptions below roughly 150 characters.
- [ ] Add appropriate numeric and string bounds, including mileage inputs.
- [ ] Make every normal tool result include `ok`, `operationId`, `revision`, `changed`, `summary`, `next`, and useful grounded error details when rejected.
- [ ] Explicitly identify the next human or agent control boundary in results.
- [ ] Keep normal tool results around 1.5 KB.
- [ ] Bound recording-trace output; do not return an unbounded complete trace.
- [ ] Add bounded `limit` inputs or summaries wherever lists can grow.
- [ ] Confirm every tool executes against fresh state and never trusts stale UI state.
- [ ] Verify all sensitive tools only prepare confirmation and cannot finalize it.
- [ ] Verify registration cleanup, route changes, unmounting, abort propagation, and duplicate protection under React Strict Mode.
- [ ] Verify cancellation reaches `fetch`, and ambiguous cancellation reconciles from authoritative state.
- [ ] Add top-level-page confirmation to diagnostics.
- [ ] Add origin-isolation status to diagnostics.
- [ ] Add permissions status to diagnostics where applicable.
- [ ] Display the last resulting revision separately from the revision originally sent.
- [ ] Display the reconciled state after ambiguous cancellation.
- [ ] Display the complete accepted event chain.

## 5. Three agency modes

- [ ] Add a real pause control to the guide dock.
- [ ] Verify Show Me from reset.
- [ ] Verify Do It With Me from reset.
- [ ] Verify Do It For Me from reset.
- [ ] Verify Show Me denies every agent domain mutation.
- [ ] Verify With Me only permits the current assigned reversible step.
- [ ] Verify For Me permits reversible agent actions and denies sensitive actions.
- [ ] Test all six directed mode changes between the three modes.
- [ ] Confirm mode changes preserve completed work and valid draft state.
- [ ] Confirm out-of-order steps cannot mutate state.
- [ ] Confirm agent work is blocked during repair and human confirmation.
- [ ] Confirm forbidden mutations return grounded errors explaining the rejection and next allowed action.

## 6. Guidance experience

- [ ] Anchor the coach card directly to the relevant semantic target.
- [ ] Decide whether the optional ghost gesture improves the product; implement it if retained and document the decision either way.
- [ ] Test the target outline and coach card after scrolling and resizing.
- [ ] Ensure the coach overlay never blocks the target's click action.
- [ ] Keep the coach card on-screen at common viewport sizes.
- [ ] Verify guidance communicates state without relying on color.
- [ ] Verify keyboard navigation through the full guided flow.
- [ ] Verify screen-reader labeling through the full guided flow.

## 7. Self-healing engine

- [ ] Implement a pure generic compiler that compares the guide with source and current capability manifests.
- [ ] Detect manifest-version changes before every step transition.
- [ ] Classify every step as compatible, safely remapped, repair required, or blocked.
- [ ] Treat any risk increase as blocking.
- [ ] Build a safe-remap path that moves guidance to the new semantic anchor without losing progress.
- [ ] Make server validation reject any repair that lowers risk, expands agent authority, turns an agent-ineligible action into an agent action, removes required outcomes, or modifies completed events.
- [ ] Verify repair rejection preserves the original state and stops progression.
- [ ] Verify the same healing system works in Show Me, With Me, and For Me.
- [ ] Test capability-ID change with a surviving semantic anchor.
- [ ] Test a removed capability.
- [ ] Test an already-satisfied postcondition.
- [ ] Test a newly required field.
- [ ] Test a cosmetic portal change.
- [ ] Test a material portal change.
- [ ] Test user rejection of a repair.
- [ ] Verify autonomous work remains blocked until material repair approval.

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
