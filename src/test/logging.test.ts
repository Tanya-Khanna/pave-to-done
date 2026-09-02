import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialSnapshot } from "../domain/initialState";
import type { CommandEnvelope, CommandFailure, CommandSuccess } from "../domain/types";
import { writeOperationLog, writeRequestFailure } from "../server/logging";

afterEach(() => vi.restoreAllMocks());

describe("structured Worker logging", () => {
  it("records operation lineage without receipt, challenge, or failure details", () => {
    const output: string[] = [];
    vi.spyOn(console, "log").mockImplementation((value) => output.push(String(value)));
    const snapshot = createInitialSnapshot("session-sensitive");
    const envelope: CommandEnvelope = {
      operationId: "09027f80-8785-4449-b622-c4d983ae770f",
      expectedRevision: 4,
      actor: { kind: "human", surface: "ui" },
      command: {
        type: "ConfirmExpenseSubmission",
        challenge: "secret-confirmation-challenge",
        userActivated: true,
      },
      sentAt: "2026-09-02T00:00:00.000Z",
    };
    const result: CommandFailure = {
      ok: false,
      operationId: envelope.operationId,
      revision: 5,
      error: { code: "PRECONDITION_FAILED", message: "receipt-demo-86 failed", retryable: false },
      snapshot,
    };

    writeOperationLog("request-123", envelope, result);

    expect(output).toHaveLength(1);
    expect(JSON.parse(output[0])).toMatchObject({
      schema: "pave.operation.v1",
      outcome: "rejected",
      requestId: "request-123",
      operationId: envelope.operationId,
      expectedRevision: 4,
      resultingRevision: 5,
      acceptedEvents: [],
      failure: { code: "PRECONDITION_FAILED", retryable: false, details: "redacted" },
    });
    expect(output[0]).not.toContain("secret-confirmation-challenge");
    expect(output[0]).not.toContain("receipt-demo-86");
    expect(output[0]).not.toContain("Juniper & Co.");
  });

  it("allowlists accepted event names and redacts request failures", () => {
    const logs: string[] = [];
    const errors: string[] = [];
    vi.spyOn(console, "log").mockImplementation((value) => logs.push(String(value)));
    vi.spyOn(console, "error").mockImplementation((value) => errors.push(String(value)));
    const snapshot = createInitialSnapshot("session-sensitive");
    const envelope: CommandEnvelope = {
      operationId: "6e51ae8f-94dc-44fb-a1a8-36c0c67946aa",
      expectedRevision: 0,
      actor: { kind: "agent", surface: "webmcp" },
      command: { type: "ShowGuidance" },
      sentAt: "2026-09-02T00:00:00.000Z",
    };
    const result: CommandSuccess = {
      ok: true,
      operationId: envelope.operationId,
      revision: 1,
      deduplicated: false,
      snapshot: { ...snapshot, revision: 1 },
      events: [
        {
          type: "GuidanceShown",
          safePayload: { receipt: "must-not-be-logged" },
          eventId: "event-1",
          sessionId: snapshot.sessionId,
          revision: 1,
          operationId: envelope.operationId,
          actor: envelope.actor,
          previousHash: "GENESIS",
          eventHash: "hash-1",
          occurredAt: "2026-09-02T00:00:01.000Z",
        },
      ],
    };

    writeOperationLog("invalid request id with spaces", envelope, result);
    writeRequestFailure("request-456", "session");

    expect(JSON.parse(logs[0])).toMatchObject({
      outcome: "accepted",
      requestId: "redacted",
      acceptedEvents: ["GuidanceShown"],
    });
    expect(logs[0]).not.toContain("must-not-be-logged");
    expect(JSON.parse(errors[0])).toEqual({
      schema: "pave.request.v1",
      outcome: "internal_error",
      requestId: "request-456",
      route: "session",
      details: "redacted",
    });
  });
});
