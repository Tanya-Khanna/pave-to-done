import { describe, expect, it, vi } from "vitest";
import { JourneyCoordinator } from "../server/JourneyCoordinator";
import type { CommandEnvelope, CommandResult, DomainEvent, JourneySnapshot } from "../domain/types";

class TransactionView {
  constructor(private readonly values: Map<string, unknown>) {}

  async get<T>(key: string) {
    return this.values.get(key) as T | undefined;
  }

  async put(key: string, value: unknown) {
    this.values.set(key, structuredClone(value));
  }
}

class MemoryStorage extends TransactionView {
  values = new Map<string, unknown>();
  alarm?: number;
  private tail: Promise<void> = Promise.resolve();

  constructor() {
    super(new Map());
  }

  override async get<T>(key: string) {
    return this.values.get(key) as T | undefined;
  }

  override async put(key: string, value: unknown) {
    this.values.set(key, structuredClone(value));
  }

  async list<T>(options: { prefix?: string } = {}) {
    return new Map(
      [...this.values.entries()].filter(([key]) => key.startsWith(options.prefix ?? "")),
    ) as Map<string, T>;
  }

  async setAlarm(value: number) {
    this.alarm = value;
  }

  async deleteAll() {
    this.values.clear();
  }

  async transaction<T>(callback: (txn: TransactionView) => Promise<T>) {
    let release = () => {};
    const previous = this.tail;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    const staged = new Map(this.values);
    try {
      const result = await callback(new TransactionView(staged));
      this.values = staged;
      return result;
    } finally {
      release();
    }
  }
}

function coordinator(storage = new MemoryStorage()) {
  return {
    storage,
    value: new JourneyCoordinator({ storage } as any, {} as Cloudflare.Env),
  };
}

async function initialize(value: JourneyCoordinator, sessionId = crypto.randomUUID()) {
  const response = await value.fetch(
    new Request("https://journey.internal/initialize", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    }),
  );
  expect(response.status).toBe(200);
  return sessionId;
}

function envelope(command: CommandEnvelope["command"], expectedRevision: number): CommandEnvelope {
  return {
    operationId: crypto.randomUUID(),
    expectedRevision,
    actor: { kind: "human", surface: "ui" },
    command,
    sentAt: new Date().toISOString(),
  };
}

async function send(value: JourneyCoordinator, command: CommandEnvelope) {
  const response = await value.fetch(
    new Request("https://journey.internal/commands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    }),
  );
  return { response, result: (await response.json()) as CommandResult };
}

describe("JourneyCoordinator persistence protocol", () => {
  it("atomically stores snapshot, event, and idempotency result and applies an operation once", async () => {
    const { value, storage } = coordinator();
    await initialize(value);
    const start = envelope(
      {
        type: "StartJourney",
        source: { kind: "on-demand", goal: "Submit an expense safely" },
        mode: "show",
      },
      0,
    );

    const first = await send(value, start);
    expect(first.result).toMatchObject({ ok: true, revision: 1, deduplicated: false });
    expect(storage.values.get("snapshot")).toMatchObject({ revision: 1, status: "active" });
    expect(storage.values.get("event:0000000001")).toMatchObject({
      operationId: start.operationId,
      revision: 1,
    });
    expect(storage.values.get(`op:${start.operationId}`)).toMatchObject({
      ok: true,
      revision: 1,
    });

    const retry = await send(value, start);
    expect(retry.result).toMatchObject({ ok: true, revision: 1, deduplicated: true });
    const events = await value.fetch(new Request("https://journey.internal/events"));
    expect(((await events.json()) as { events: DomainEvent[] }).events).toHaveLength(1);
  });

  it("serializes commands against one revision so exactly one succeeds", async () => {
    const { value } = coordinator();
    await initialize(value);
    const started = await send(
      value,
      envelope(
        {
          type: "StartJourney",
          source: { kind: "on-demand", goal: "Submit an expense safely" },
          mode: "show",
        },
        0,
      ),
    );
    expect(started.result.ok).toBe(true);

    const [withMode, forMode] = await Promise.all([
      send(value, envelope({ type: "ChangeAgencyMode", mode: "with" }, 1)),
      send(value, envelope({ type: "ChangeAgencyMode", mode: "for" }, 1)),
    ]);
    const results = [withMode, forMode];
    expect(results.filter(({ result }) => result.ok)).toHaveLength(1);
    expect(results.find(({ result }) => !result.ok)?.result).toMatchObject({
      ok: false,
      revision: 2,
      error: { code: "STALE_REVISION" },
    });
    const events = await value.fetch(new Request("https://journey.internal/events"));
    expect(((await events.json()) as { events: DomainEvent[] }).events).toHaveLength(2);
  });

  it("preserves state across coordinator instances and deletes it only on the retention alarm", async () => {
    const shared = new MemoryStorage();
    const first = coordinator(shared).value;
    const sessionId = await initialize(first);
    await send(
      first,
      envelope(
        {
          type: "StartJourney",
          source: { kind: "recorded", guideId: "expense-client-dinner", guideVersion: 1 },
          mode: "show",
        },
        0,
      ),
    );

    const restarted = coordinator(shared).value;
    const stateResponse = await restarted.fetch(new Request("https://journey.internal/state"));
    const state = (await stateResponse.json()) as { snapshot: JourneySnapshot };
    expect(state.snapshot).toMatchObject({ sessionId, revision: 1, status: "active" });
    expect(shared.alarm).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);

    await restarted.alarm();
    expect((await restarted.fetch(new Request("https://journey.internal/state"))).status).toBe(404);
  });

  it("rejects oversized bodies and rate-limits before reaching the transaction", async () => {
    const { value, storage } = coordinator();
    await initialize(value);
    const oversized = await value.fetch(
      new Request("https://journey.internal/commands", {
        method: "POST",
        headers: { "Content-Length": "16385", "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    expect(oversized.status).toBe(413);

    await storage.put("rate-window", { startedAt: Date.now(), count: 90 });
    const transactionSpy = vi.spyOn(storage, "transaction");
    const limited = await send(
      value,
      envelope(
        {
          type: "StartJourney",
          source: { kind: "on-demand", goal: "Submit an expense safely" },
          mode: "show",
        },
        0,
      ),
    );
    expect(limited.result).toMatchObject({ ok: false, error: { code: "RATE_LIMITED" } });
    expect(transactionSpy).not.toHaveBeenCalled();
  });
});
