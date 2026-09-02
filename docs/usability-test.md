# Uncoached usability test

Use this protocol with two people who have not worked on `pave.to(done)`. Do not explain the product or point at controls while the participant is testing. Record only observations that actually occurred.

## Setup

- Open `https://pave-to-done.north-raincoat.workers.dev` in a fresh browser window.
- Make sure the demo is reset.
- Start a timer when the page appears.
- Ask permission before recording audio or video. Written notes are sufficient.

## Participant prompt

> Please use this site as if you discovered it on your own. First tell me what you think it does. Then enter the demo and submit the $86 client dinner to Project Atlas. Use any assistance level you prefer. Think aloud when something is confusing. I cannot answer product questions while you work.

After the expense reaches its review boundary, ask:

> Before clicking anything, tell me what the agent has done, what will happen next, and who controls that action.

Then let the participant confirm the fictional expense. After completion, ask them to reset, start another journey, simulate Portal v2, and respond to the repair prompt without coaching.

## Record for each participant

| Observation                                    | Participant 1 | Participant 2 |
| ---------------------------------------------- | ------------- | ------------- |
| Date, device, browser                          |               |               |
| First-sentence interpretation                  |               |               |
| Time to open demo                              |               |               |
| Chosen agency mode and why                     |               |               |
| Time to prepared boundary                      |               |               |
| Understood agent versus human control          |               |               |
| Understood why final confirmation was required |               |               |
| Completed Portal v2 repair                     |               |               |
| Material confusion or failure                  |               |               |
| Participant's own summary                      |               |               |

## Pass conditions

- The participant explains the product as guided, shared, or delegated task completion inside a website.
- The participant reaches the sensitive review without intervention.
- The participant understands that the agent prepared the expense and cannot submit it.
- The participant recognizes that Portal v2 changed the workflow and that approving the repair is a human decision.
- No material issue prevents completion.

## Handling findings

Classify a finding as material when it prevents completion, causes a participant to misunderstand a consequence, or makes them believe the agent can cross a human-only boundary. Fix every material finding, rerun the affected flow with both participants, and record the deployed commit and outcome below.

## Results

Testing has not yet been conducted. Keep the corresponding master-checklist items unchecked until two uninvolved participants complete this protocol and the observations are recorded here.
