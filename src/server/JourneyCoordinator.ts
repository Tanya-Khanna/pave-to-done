import { DurableObject } from "cloudflare:workers";
import { commandEnvelopeSchema } from "../domain/contracts";
import { decide } from "../domain/decide";
import { evolve } from "../domain/evolve";
import { hashEvent } from "../domain/eventHash";
import { createInitialSnapshot } from "../domain/initialState";
import type { CommandEnvelope, CommandResult, DomainEvent, JourneySnapshot } from "../domain/types";
import { errorResponse, json } from "./http";

type Env = Record<string, never>;
interface RateWindow {
  startedAt: number;
  count: number;
}

const STATE_KEY = "snapshot";
const RATE_KEY = "rate-window";
const MAX_COMMANDS_PER_MINUTE = 90;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export class JourneyCoordinator extends DurableObject<Env> {
  private async snapshot(sessionId?: string): Promise<JourneySnapshot> {
    const stored = await this.ctx.storage.get<JourneySnapshot>(STATE_KEY);
    if (stored) return stored;
    if (!sessionId) throw new Error("Session has not been initialized.");
    const initial = createInitialSnapshot(sessionId);
    await this.ctx.storage.put(STATE_KEY, initial);
    await this.ctx.storage.setAlarm(Date.now() + RETENTION_MS);
    return initial;
  }

  private async rateAllowed(): Promise<boolean> {
    const now = Date.now();
    const window = (await this.ctx.storage.get<RateWindow>(RATE_KEY)) ?? {
      startedAt: now,
      count: 0,
    };
    const next =
      now - window.startedAt >= 60_000
        ? { startedAt: now, count: 1 }
        : { ...window, count: window.count + 1 };
    await this.ctx.storage.put(RATE_KEY, next);
    return next.count <= MAX_COMMANDS_PER_MINUTE;
  }

  private async execute(envelope: CommandEnvelope): Promise<CommandResult> {
    const existing = await this.ctx.storage.get<CommandResult>(`op:${envelope.operationId}`);
    if (existing) return existing.ok ? { ...existing, deduplicated: true } : existing;
    if (!(await this.rateAllowed())) {
      const snapshot = await this.snapshot();
      return {
        ok: false,
        operationId: envelope.operationId,
        revision: snapshot.revision,
        error: {
          code: "RATE_LIMITED",
          message: "This demo session reached its command budget. Try again shortly.",
          retryable: true,
        },
        snapshot,
      };
    }

    return this.ctx.storage.transaction(async (txn) => {
      const duplicate = await txn.get<CommandResult>(`op:${envelope.operationId}`);
      if (duplicate) return duplicate.ok ? { ...duplicate, deduplicated: true } : duplicate;
      const current = await txn.get<JourneySnapshot>(STATE_KEY);
      if (!current) throw new Error("Session has not been initialized.");
      const decision = decide(current, envelope);
      if (!decision.ok) {
        const failed: CommandResult = {
          ok: false,
          operationId: envelope.operationId,
          revision: current.revision,
          error: decision.error,
          snapshot: current,
        };
        await txn.put(`op:${envelope.operationId}`, failed);
        return failed;
      }

      let snapshot = current;
      const events: DomainEvent[] = [];
      for (const draft of decision.events) {
        const occurredAt = new Date().toISOString();
        const revision = snapshot.revision + 1;
        const eventHash = await hashEvent({
          previousHash: snapshot.lastEventHash,
          revision,
          actor: envelope.actor,
          draft,
          occurredAt,
        });
        const event: DomainEvent = {
          ...draft,
          eventId: crypto.randomUUID(),
          sessionId: snapshot.sessionId,
          revision,
          operationId: envelope.operationId,
          actor: envelope.actor,
          previousHash: snapshot.lastEventHash,
          eventHash,
          occurredAt,
        };
        snapshot = evolve(snapshot, event);
        events.push(event);
        await txn.put(`event:${String(revision).padStart(10, "0")}`, event);
      }
      const result: CommandResult = {
        ok: true,
        operationId: envelope.operationId,
        revision: snapshot.revision,
        deduplicated: false,
        snapshot,
        events,
      };
      await txn.put(STATE_KEY, snapshot);
      await txn.put(`op:${envelope.operationId}`, result);
      return result;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/initialize") {
      const body = (await request.json()) as { sessionId?: string };
      if (!body.sessionId || body.sessionId.length > 80)
        return errorResponse(400, "INVALID_INPUT", "A bounded session ID is required.");
      return json({ ok: true, snapshot: await this.snapshot(body.sessionId) });
    }
    if (request.method === "GET" && url.pathname === "/state") {
      try {
        return json({ ok: true, snapshot: await this.snapshot() });
      } catch {
        return errorResponse(404, "NOT_FOUND", "Session not found.");
      }
    }
    if (request.method === "GET" && url.pathname === "/events") {
      const after = Math.max(0, Number(url.searchParams.get("afterRevision") ?? 0));
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
      const entries = await this.ctx.storage.list<DomainEvent>({ prefix: "event:" });
      const events = [...entries.values()]
        .filter((event) => event.revision > after)
        .sort((a, b) => a.revision - b.revision)
        .slice(0, limit);
      return json({ ok: true, events });
    }
    if (request.method === "GET" && url.pathname.startsWith("/operations/")) {
      const operationId = decodeURIComponent(url.pathname.split("/").pop() ?? "");
      const result = await this.ctx.storage.get<CommandResult>(`op:${operationId}`);
      return result ? json(result) : errorResponse(404, "NOT_FOUND", "Operation not found.");
    }
    if (request.method === "POST" && url.pathname === "/commands") {
      if (Number(request.headers.get("content-length") ?? 0) > 16_384)
        return errorResponse(413, "INVALID_INPUT", "Command body is too large.");
      let parsed: unknown;
      try {
        parsed = await request.json();
      } catch {
        return errorResponse(400, "INVALID_INPUT", "Command body must be JSON.");
      }
      const result = commandEnvelopeSchema.safeParse(parsed);
      if (!result.success)
        return errorResponse(
          400,
          "INVALID_INPUT",
          result.error.issues[0]?.message ?? "Invalid command.",
        );
      const commandResult = await this.execute(result.data as CommandEnvelope);
      return json(commandResult, {
        status: commandResult.ok ? 200 : commandResult.error.code === "STALE_REVISION" ? 409 : 422,
      });
    }
    return errorResponse(404, "NOT_FOUND", "Journey coordinator route not found.");
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
