# pave.to(done) — Interactive Architecture

[Open the interactive click-through diagram](./architecture.html). Choose a flow, press play, step with the arrow keys, toggle **Portal v1 / Portal v2**, click a node to jump to its first handoff, or drag nodes to inspect another layout.

## Components

| Component                | Responsibility                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Human                    | Supplies the goal, judgment, agency choice, material-repair approval, and consequential confirmation.                           |
| ChatGPT agent            | Interprets the goal, discovers the current tool surface, chooses tools, explains, and proposes plans or repairs.                |
| React work surface       | Renders the expense portal, journey, progress, control baton, repair diff, approval, recording, and action trail.               |
| WebMCP adapter           | Registers route/state-scoped imperative tools, validates bounded inputs, propagates cancellation, and formats redacted results. |
| Semantic anchor registry | Maps stable capability IDs to the current accessible UI elements for spotlight and coach-card placement.                        |
| Typed command client     | Gives direct UI actions and WebMCP tool calls one operation/revision/cancellation protocol.                                     |
| Cloudflare Worker        | Serves the app, applies secure headers, validates requests, and routes each session to its coordinator.                         |
| Journey compiler         | Reconciles recorded or on-demand steps with the current versioned capability manifest and agency policy.                        |
| Journey coordinator      | One Durable Object per guest journey; serializes commands, decides events, evolves state, and enforces policy.                  |
| Durable event store      | Transactionally stores snapshot, accepted events, idempotent operation results, and the hash chain.                             |

## Flow 1 — Shared journey

1. The person enters a goal and chooses an agency mode on the visible work surface.
2. ChatGPT discovers only the WebMCP tools relevant to the current top-level route and state.
3. A tool call becomes a typed command with an operation ID, expected revision, actor, and cancellation signal.
4. Direct human UI actions enter through the same command client.
5. The Worker validates the request and routes it to the session's Durable Object.
6. The coordinator serializes the command and rechecks mode, actor, risk, step, and preconditions.
7. Accepted facts, the new snapshot, and the idempotent result commit atomically.
8. A bounded, redacted, state-verified result returns.
9. Portal state, progress, control baton, and event trail render the same revision.

## Flow 2 — Self-heal

The v1/v2 toggle demonstrates a website change. A stable semantic capability resolves to a moved control automatically. The compiler recognizes the newly required business-purpose field as material, persists a repair boundary, and preserves completed facts. The UI shows a repair diff; the agent cannot continue until a person approves it.

## Flow 3 — Human approval

The agent may prepare an expense submission, but no finalization tool exists. Preparation creates a durable, expiring, one-time confirmation boundary. The normal UI shows the complete consequence. Finalization requires a human UI command, an unexpired challenge, and transient user activation.

## Flow 4 — Safe recovery

Every mutation records an operation ID before dispatch. If a WebMCP execution is canceled after the server may have committed, the adapter reports an ambiguous outcome instead of failure. It reads the operation record and authoritative snapshot, then converges the UI and tool result before permitting another action. The same operation cannot create a second event.

## Flow 5 — Teach once

An expert deliberately records semantic accepted events, safe arguments, pre/postconditions, actor, and risk. Pixels, selectors, raw keys, credentials, and sensitive values are excluded. The agent reads a redacted trace marked as untrusted and proposes a guide. The server validates the draft against the trace and current manifest. Only a person can publish an immutable guide version.

## Portal-version mode differences

| Concern         | Portal v1                 | Portal v2                                  |
| --------------- | ------------------------- | ------------------------------------------ |
| Expense action  | Sidebar “New expense”     | Header “Add expense”                       |
| Anchor          | Original semantic ref     | Moved semantic ref with same capability ID |
| Required data   | No business-purpose field | Business purpose is required               |
| Compiler result | Compatible                | Safe anchor remap plus material repair     |
| Authority       | Active agency policy      | Unchanged; the migration cannot expand it  |

## Invariants

- Server state is authoritative.
- Each accepted mutation increments the revision exactly once.
- One operation ID has at most one domain effect.
- Agent commands cannot create sensitive events.
- Unapproved repairs cannot resume the journey.
- Completed facts remain completed except through explicit reset.
- Event replay reproduces the stored snapshot.
- A portal migration cannot lower risk or expand agent authority.
