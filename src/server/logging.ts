import type { CommandEnvelope, CommandResult } from "../domain/types";

export type WorkerRoute = "health" | "sessions" | "session" | "asset" | "unknown";

function boundedIdentifier(value: string, max = 80): string {
  return /^[a-zA-Z0-9._:-]+$/.test(value) ? value.slice(0, max) : "redacted";
}

export function writeOperationLog(
  requestId: string,
  envelope: CommandEnvelope,
  result: CommandResult,
): void {
  console.log(
    JSON.stringify({
      schema: "pave.operation.v1",
      outcome: result.ok ? "accepted" : "rejected",
      requestId: boundedIdentifier(requestId),
      operationId: boundedIdentifier(envelope.operationId),
      commandType: envelope.command.type,
      expectedRevision: envelope.expectedRevision,
      resultingRevision: result.revision,
      acceptedEvents: result.ok ? result.events.map((event) => event.type).slice(0, 16) : [],
      deduplicated: result.ok ? result.deduplicated : false,
      failure: result.ok
        ? undefined
        : { code: result.error.code, retryable: result.error.retryable, details: "redacted" },
    }),
  );
}

export function writeRequestFailure(requestId: string, route: WorkerRoute): void {
  console.error(
    JSON.stringify({
      schema: "pave.request.v1",
      outcome: "internal_error",
      requestId: boundedIdentifier(requestId),
      route,
      details: "redacted",
    }),
  );
}
