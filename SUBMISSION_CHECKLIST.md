# pave.to(done) — Submission Checklist

**Official deadline:** September 3, 2026 at 1:00 p.m. PDT / 4:00 p.m. EDT  
**Target submission:** September 3 at 2:00 p.m. EDT  
**Freeze:** September 3 at 12:00 p.m. EDT

Use this as a literal release checklist. Do not mark an item complete because it is planned.

## A. Stage One eligibility gate

- [ ] Entrant has joined the hackathon and satisfies the official eligibility/location rules.
- [ ] Project is new or all qualifying WebMCP work was added during the permitted submission period and is documented.
- [ ] Project reasonably fits the theme: humans and agents interact, collaborate, and create together on the same live page.
- [ ] Project uses a real, working WebMCP implementation rather than a simulated API in the submitted build.
- [ ] App runs consistently as depicted in the description and video.
- [ ] Every third-party asset, font, icon, library, and media element is authorized and credited where its license requires.
- [ ] All submission materials are in English.

## B. Required submission artifacts

### Live project

- [ ] Public HTTPS URL opens while logged out.
- [ ] No authentication or credentials are required for the guest demo.
- [ ] `/demo` opens as a top-level page, not inside an iframe.
- [ ] Reset returns the app to the exact documented starting state.
- [ ] Live URL works in ChatGPT's in-app browser.
- [ ] Live URL works in Chrome 149+ with `chrome://flags/#enable-webmcp-testing`.
- [ ] WebMCP tools are discoverable after visiting the demo page.
- [ ] The main demo prompt is visible and copyable.
- [ ] Normal manual UI remains usable when WebMCP is unavailable.
- [ ] No console error, missing asset, broken route, or mixed-content warning appears.
- [ ] Deployment remains free and unrestricted for judges through the judging period.

### Public source repository

- [ ] Repository is public on GitHub, GitLab, or Bitbucket.
- [ ] Root `LICENSE` is a valid open-source license; use MIT for this submission.
- [ ] Repository host detects and displays the license near the top/About section.
- [ ] All source code and required assets are present.
- [ ] No API key, token, credential, private URL, personal data, or local absolute path is committed.
- [ ] Fresh-clone setup instructions work exactly as written.
- [ ] `npm install`, `npm run dev`, `npm test`, and `npm run build` succeed.
- [ ] README starts with product line, screenshot/GIF, live URL, and one demo prompt.
- [ ] README explains the problem and specific audience.
- [ ] README explains why WebMCP is necessary for the experience.
- [ ] README lists registered tools and their effects.
- [ ] README hero GIF is captured from the deployed product, shows real behavior, contains no sensitive data, renders on GitHub, has descriptive alt text, and stays small enough to load quickly.
- [ ] Any pre-build storyboard label is removed only after the real capture replaces it; no mock animation is presented as product footage.
- [ ] Interactive `architecture.html` and accessible `architecture.md` match the shipped implementation and are linked from the README.
- [ ] README documents architecture, shared state/action layer, semantic healing, and authority policy.
- [ ] README links `ENGINEERING_SPEC.md` and explains revisions, idempotency, event replay, cancellation recovery, and server-side policy enforcement.
- [ ] README links `RESOURCE_AUDIT.md` so protocol and production decisions are traceable to the official materials.
- [ ] README gives exact ChatGPT and Chrome testing instructions.
- [ ] README documents security/privacy decisions and known limitations.
- [ ] README credits inspiration without claiming that standard ideas are original.
- [ ] README links the live site, public video, PRD, and implementation plan.
- [ ] Screenshots and architecture diagram render on the repository page.
- [ ] Exact submitted commit has tag `submission-v1.0.0`.

### Project description

- [ ] Project name is exactly **pave.to(done)** everywhere.
- [ ] One-line description is concrete:

  > A WebMCP-native journey layer that lets people learn a web task, share it with an agent, or delegate it—and repairs the path when the app changes.

- [ ] Description states why this use case is a strong fit for WebMCP.
- [ ] Description states how it creates a better user experience.
- [ ] Description states what people and agents can do together that was difficult or impossible before.
- [ ] Description briefly explains the WebMCP implementation.
- [ ] Description names the real primary audience: SaaS product, support, enablement, and operations teams.
- [ ] Description describes the working expense demo rather than only the future platform.
- [ ] Description mentions both journey sources: expert-recorded and on demand.
- [ ] Description explains all three agency modes.
- [ ] Description explains cosmetic remapping, material repair review, and preserved authority.
- [ ] Claims are limited to behavior that is live and demonstrated.
- [ ] No unsupported cost reduction, accuracy, adoption, or market-size statistic appears.
- [ ] No claim implies endorsement or partnership by OpenAI, Chrome, or any supporter.
- [ ] “Built with” list includes only products actually used.

### Public demo video

- [ ] Video is shorter than three minutes; target 2:45–2:55.
- [ ] Video is uploaded to YouTube and set to Public, not Private or an expiring link.
- [ ] Playback works while logged out and in a private window.
- [ ] Video contains clear audible narration.
- [ ] Captions are reviewed for product name and WebMCP terminology.
- [ ] The product visibly functions; the video is not a slide-only concept pitch.
- [ ] A real agent invokes real WebMCP tools on the live page.
- [ ] Human and agent both act on the same visible state.
- [ ] Sensitive approval is visibly human-controlled.
- [ ] Self-healing is shown live rather than described only in narration.
- [ ] The WebMCP diagnostic/tool proof is visible briefly.
- [ ] No copyrighted music, personal notifications, credentials, or private browser data appear.
- [ ] All cuts preserve honesty; no edit implies an action occurred when it did not.

## C. Recommended 2:50 video script

### 0:00–0:12 — problem and promise

**Picture:** landing hero; the waypoint moves from task to done.  
**Narration:** “Tutorials become stale, and autonomous agents take too much control. pave.to(done) gives one web task three levels of help and repairs the journey when the app changes.”

### 0:12–0:27 — WebMCP connection and task

**Picture:** open live `/demo` inside ChatGPT's in-app browser; WebMCP status shows connected. Paste the exact task prompt.  
**Narration:** “The page exposes its current capabilities and state through WebMCP. There is no separate API session and no pixel guessing.”

### 0:27–0:52 — SHOW ME

**Picture:** choose SHOW ME. Agent reads state and displays the next step. Person follows spotlight, semantic outline, coach card, and progress rail.  
**Narration:** “In Show Me, the agent can inspect and guide, but the product rejects agent mutations. I remain the actor.”

### 0:52–1:16 — DO IT WITH ME and mode switch

**Picture:** switch the same journey to DO IT WITH ME. Control baton moves. Agent creates/populates the draft; person provides business purpose.  
**Narration:** “I can change agency without restarting. Reversible clerical work moves to the agent; judgment returns to me.”

### 1:16–1:37 — DO IT FOR ME and approval

**Picture:** switch to DO IT FOR ME. Agent finishes allowed steps and opens the confirmation card. Person pauses over, but does not yet confirm.  
**Narration:** “In Do It For Me, the agent executes permitted steps and verifies the state. Final submission is not a tool: it remains a human-only control.”

### 1:37–2:08 — self-healing

**Picture:** simulate portal v2. The expense action moves/renames and guidance visibly follows. New business-purpose requirement triggers repair diff. Person approves repair; journey preserves completed work.  
**Narration:** “The journey refers to semantic capabilities, not selectors. Layout changes remap automatically. A new material requirement pauses the agent, shows the repair, and never expands authority without review.”

### 2:08–2:27 — teach once and no recording

**Picture:** briefly open recorder trace and approved guide library, then show “Plan for this session” for mileage.  
**Narration:** “An expert can record semantic actions once and publish a reviewed guide. But recording is optional: an agent can also compose a validated journey from the site's live WebMCP capabilities.”

### 2:27–2:43 — implementation proof

**Picture:** diagnostic panel and compact code/tool list; action trail matches the authoritative revision and visible expense state.  
**Narration:** “Thirteen narrow tools and the human UI share a revisioned command service. A Durable Object serializes actions, deduplicates retries, appends auditable events, and returns state-verified results. Tools use strict schemas, scoped lifecycles, cancellation, and untrusted-content annotations.”

### 2:43–2:50 — close

**Picture:** person confirms, completion animation draws the final path.  
**Narration:** “Teach once. Assist at any level. Stay correct as software changes. This is pave.to(done).”

## D. Devpost description blueprint

Write the final description in plain language and make the working demo the hero.

### Opening

> People currently choose between stale tutorials and all-or-nothing automation. pave.to(done) lets someone start with a real web task, choose how much agency to keep, and share one live journey with an agent. The journey can come from an expert recording or be planned on demand, and it repairs itself when the website changes without silently expanding agent authority.

### Why WebMCP

Include these concrete points:

- The website declares live semantic capabilities, policy, and state.
- The agent uses those tools to plan, guide, or execute according to the active mode.
- Human UI actions and agent tool calls update one visible journey and one domain store.
- Tool results verify postconditions instead of reporting simulated clicks.
- Guidance resolves capabilities to current in-page anchors.
- Material changes and sensitive consequences return control to a person.

### What people and agents can newly do together

> A person can begin a task in teaching mode, hand reversible steps to an agent, take control back for judgment, and then delegate the rest without restarting or copying context. When the application changes mid-task, both participants see the same repair and continue from verified progress.

### Working implementation

Describe only the shipped vertical slice:

- guest Acme expense portal;
- three enforced agency modes;
- recorded and on-demand journeys;
- semantic guidance and voice/text;
- cosmetic and material healing;
- human-only final confirmation;
- imperative top-level WebMCP tools with strict schemas and annotations;
- deterministic tests and public source.

### Audience and impact

> The initial customer is a SaaS product, support, customer-education, or operations team that repeatedly teaches users a complex workflow while the product continues to change. One maintained semantic journey can serve a novice who wants instruction, a colleague who wants shared execution, and a power user who wants safe delegation.

### Honest limitations

State that the hackathon build uses a fictional expense portal, anonymous seven-day guest sessions, and a focused workflow. Journey state and audit events are durable, but production identity, organization RBAC, encrypted real financial data, regional retention controls, and an embeddable SDK are future work.

## E. Rubric evidence audit

### WebMCP Leverage

- [ ] Video shows multiple tools and a multi-step sequence.
- [ ] Tool calls modify the same state visible in the UI.
- [ ] One agent call causes visual guidance, not only data mutation.
- [ ] One flow uses a recorded guide and another builds on demand.
- [ ] One flow detects stale state and repairs it.
- [ ] Code shows imperative top-level registration and lifecycle cleanup.
- [ ] Schemas are narrow; read-only and untrusted-content annotations are present.
- [ ] Tool results verify state/postconditions.
- [ ] Human and agent commands use one server-authoritative revisioned state machine.
- [ ] Duplicate, concurrent, stale, canceled, and ambiguous operations have demonstrated behavior.
- [ ] Event replay reproduces the stored snapshot; logs/results are bounded and redacted.
- [ ] Dynamic mutation-tool registration follows route/state and cleans up correctly.
- [ ] Eval file covers tool choice, arguments, sequencing, state, and mid-chain failure.
- [ ] README explains what disappears if WebMCP is removed.

### Execution

- [ ] A fresh guest can go from task to completion.
- [ ] All three modes are complete and distinct.
- [ ] Mode switching preserves progress.
- [ ] Voice has text/caption/mute fallback.
- [ ] Loading, error, blocked, repair, approval, empty, and completion states are designed.
- [ ] Landing page clearly explains and links to the demo.
- [ ] Demo works without oral instructions from the builder.
- [ ] Keyboard, reduced-motion, responsive, and contrast checks pass.
- [ ] Reset, deployment, and setup are reliable.

### Potential Impact

- [ ] Description identifies a specific buyer/operator and end user.
- [ ] Demo directly shows the problem and solution, not a proxy feature.
- [ ] Expert knowledge reuse is shown.
- [ ] No-recording path prevents the product from depending on prior setup.
- [ ] Changing-software scenario is shown.
- [ ] At least two uncoached attempts are documented honestly.
- [ ] Claims distinguish evidence from future hypothesis.

### Creativity & Ambition

- [ ] One journey visibly changes human/agent responsibility mid-task.
- [ ] Repair preserves progress and authority.
- [ ] Semantic capability anchor visibly survives a layout change.
- [ ] Recording, on-demand planning, guidance, shared execution, delegation, and healing feel like one system.
- [ ] README comparison names adjacent projects and the precise integrated difference.
- [ ] Landing and product have a memorable, purposeful path/waypoint visual identity.

## F. Final release checks

### Function

- [ ] Reset, paste canonical prompt, and complete the exact video journey three times consecutively.
- [ ] Repeat after hard refresh.
- [ ] Repeat in a private window.
- [ ] Repeat on a second machine or network.
- [ ] Verify all three modes before and after portal update.
- [ ] Verify forbidden tool calls fail safely.
- [ ] Verify final confirmation, repair approval, and guide publication are absent from tool list.
- [ ] Double-submit one operation and verify one accepted event/effect.
- [ ] Send two commands from the same revision and verify one explicit stale-state result.
- [ ] Abort a mutation request after dispatch and verify reconciliation before retry.
- [ ] Refresh during pending confirmation and repair; verify the exact control boundary returns.
- [ ] Navigate away from `/demo`; verify route/state tools unregister without duplicates on return.

### Accessibility and visual quality

- [ ] Complete main journey using keyboard only.
- [ ] Screen-reader status announces current step/actor without reading decorative motion.
- [ ] Reduced-motion mode removes path drawing/ghost motion without losing meaning.
- [ ] Color is never the only indicator of actor, risk, progress, or error.
- [ ] Spotlight never blocks the target or traps focus.
- [ ] Coach card remains onscreen at supported widths.
- [ ] No generic placeholder copy, broken icon, overflow, or inconsistent capitalization remains.
- [ ] Product name includes its periods consistently: `pave.to(done)`.

### Link and artifact integrity

- [ ] Devpost live URL points to the frozen production deployment.
- [ ] Repository default branch contains the tagged frozen commit.
- [ ] YouTube link is public and embeds correctly.
- [ ] Every README link opens.
- [ ] Social preview and screenshots depict the submitted version.
- [ ] Devpost preview shows complete formatting and correct links.
- [ ] Submission confirmation/receipt is saved.

## G. Freeze policy

At noon EDT on September 3:

1. merge the final submitted branch;
2. run build and full gate;
3. tag `submission-v1.0.0`;
4. record commit SHA and deployment identifier in the release notes;
5. upload artifacts and submit by 2:00 p.m.;
6. make only eligibility-critical fixes before the external deadline; and
7. after 4:00 p.m. EDT, do not edit the submitted Devpost entry, repository, or live site until winners are announced. Use a fork for later development.

## H. Official sources checked September 1, 2026

- [Challenge overview and requirements](https://webmcp.devpost.com/)
- [Official rules](https://webmcp.devpost.com/rules)
- [Resources and FAQ](https://webmcp.devpost.com/resources)
- [Challenge updates](https://webmcp.devpost.com/updates)
- [WebMCP specification](https://webmachinelearning.github.io/webmcp/)
- [OpenAI Site Tools guidance](https://learn.chatgpt.com/docs/webmcp)
- [Chrome WebMCP guide](https://developer.chrome.com/docs/ai/webmcp)
- [Chrome security guide](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
- [Chrome evaluation guide](https://developer.chrome.com/docs/ai/webmcp/evals)
