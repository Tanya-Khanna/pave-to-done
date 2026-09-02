import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandResult, DomainEvent } from "../domain/types";
import { createInitialSnapshot } from "../domain/initialState";
import { getEvents, sendCommand } from "../client/journeyClient";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("journey client protocol", () => {
  it("creates no committed operation when cancellation wins before the request is sent", async () => {
    const controller = new AbortController();
    controller.abort();
    const snapshot = createInitialSnapshot("f332f28d-a3aa-4d32-8fd2-d5bb19f86f74");
    const operationId = "83714486-5c48-457f-b870-3a755d81e9b1";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).includes("/commands")) {
        expect(init?.signal).toBe(controller.signal);
        throw new DOMException("Aborted", "AbortError");
      }
      return new Response(JSON.stringify({ ok: false, error: { code: "NOT_FOUND" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    await expect(
      sendCommand({
        sessionId: snapshot.sessionId,
        revision: 0,
        actor: { kind: "agent", surface: "webmcp" },
        command: { type: "ShowGuidance" },
        signal: controller.signal,
        operationId,
      }),
    ).rejects.toMatchObject({ code: "AMBIGUOUS_OUTCOME", operationId });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain(`/operations/${operationId}`);
  });

  it("passes cancellation to fetch and reconciles from authoritative operation state", async () => {
    const controller = new AbortController();
    controller.abort();
    const snapshot = createInitialSnapshot("f332f28d-a3aa-4d32-8fd2-d5bb19f86f74");
    const authoritative: CommandResult = {
      ok: true,
      operationId: "40428ac4-54a1-4f6f-b244-d26137e5545c",
      revision: 1,
      deduplicated: false,
      snapshot: { ...snapshot, revision: 1 },
      events: [],
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new DOMException("Aborted", "AbortError"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(authoritative), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const result = await sendCommand({
      sessionId: snapshot.sessionId,
      revision: 0,
      actor: { kind: "agent", surface: "webmcp" },
      command: { type: "ShowGuidance" },
      signal: controller.signal,
      operationId: authoritative.operationId,
    });

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ signal: controller.signal });
    expect(fetchMock.mock.calls[1][0]).toContain(`/operations/${authoritative.operationId}`);
    expect(result).toMatchObject({ reconciled: true, sentRevision: 0, revision: 1 });
  });

  it("loads a bounded complete event chain across server pages", async () => {
    const event = (revision: number): DomainEvent => ({
      type: "GuidanceShown",
      safePayload: {},
      eventId: `event-${revision}`,
      sessionId: "session-1",
      revision,
      operationId: `operation-${revision}`,
      actor: { kind: "agent", surface: "webmcp" },
      previousHash: `hash-${revision - 1}`,
      eventHash: `hash-${revision}`,
      occurredAt: "2026-09-02T00:00:00.000Z",
    });
    const first = Array.from({ length: 50 }, (_, index) => event(index + 1));
    const second = [event(51)];
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, events: first })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, events: second })));

    const events = await getEvents("session-1");

    expect(events).toHaveLength(51);
    expect(fetchMock.mock.calls[1][0]).toContain("afterRevision=50");
  });
});
