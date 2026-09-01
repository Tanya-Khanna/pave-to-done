import { decide } from "../domain/decide";
import { evolve } from "../domain/evolve";
import { hashEvent } from "../domain/eventHash";
import type { Actor, DomainEvent, JourneyCommand, JourneySnapshot } from "../domain/types";

export async function apply(
  snapshot: JourneySnapshot,
  command: JourneyCommand,
  actor: Actor = { kind: "human", surface: "ui" },
) {
  const operationId = crypto.randomUUID();
  const decision = decide(snapshot, {
    operationId,
    expectedRevision: snapshot.revision,
    actor,
    command,
    sentAt: new Date().toISOString(),
  });
  if (!decision.ok) throw new Error(`${decision.error.code}: ${decision.error.message}`);
  let next = snapshot;
  const events: DomainEvent[] = [];
  for (const draft of decision.events) {
    const occurredAt = new Date().toISOString();
    const revision = next.revision + 1;
    const eventHash = await hashEvent({
      previousHash: next.lastEventHash,
      revision,
      actor,
      draft,
      occurredAt,
    });
    const event: DomainEvent = {
      ...draft,
      eventId: crypto.randomUUID(),
      sessionId: next.sessionId,
      revision,
      operationId,
      actor,
      previousHash: next.lastEventHash,
      eventHash,
      occurredAt,
    };
    next = evolve(next, event);
    events.push(event);
  }
  return { snapshot: next, events };
}
