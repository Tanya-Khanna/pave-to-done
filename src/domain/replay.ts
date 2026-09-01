import { evolve } from "./evolve";
import { hashEvent } from "./eventHash";
import { createInitialSnapshot } from "./initialState";
import type { DomainEvent, JourneySnapshot } from "./types";

export async function replay(sessionId: string, events: DomainEvent[]): Promise<JourneySnapshot> {
  let snapshot = createInitialSnapshot(sessionId);
  for (const event of events) {
    const expected = await hashEvent({
      previousHash: event.previousHash,
      revision: event.revision,
      actor: event.actor,
      draft: { type: event.type, safePayload: event.safePayload },
      occurredAt: event.occurredAt,
    });
    if (event.previousHash !== snapshot.lastEventHash || expected !== event.eventHash) {
      return { ...snapshot, status: "blocked", historyVerified: false };
    }
    snapshot = evolve(snapshot, event);
  }
  return snapshot;
}
