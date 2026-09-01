import type {
  Actor,
  CommandEnvelope,
  CommandResult,
  DomainEvent,
  JourneyCommand,
  JourneySnapshot,
} from "../domain/types";

const SESSION_KEY = "pave.session.v1";
const PENDING_KEY = "pave.pending-operations.v1";

interface PendingOperation {
  operationId: string;
  sessionId: string;
  commandType: string;
  startedAt: string;
}

function apiHeaders() {
  return { "Content-Type": "application/json" };
}

async function parse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok && typeof data === "object" && data !== null && "ok" in data) return data;
  if (!response.ok) throw new Error(data.error?.message ?? `Request failed (${response.status}).`);
  return data;
}

export function getStoredSessionId() {
  return sessionStorage.getItem(SESSION_KEY);
}

export async function createSession(): Promise<JourneySnapshot> {
  const response = await fetch("/api/sessions", {
    method: "POST",
    headers: apiHeaders(),
    body: "{}",
  });
  const data = await parse<{ ok: true; snapshot: JourneySnapshot }>(response);
  sessionStorage.setItem(SESSION_KEY, data.snapshot.sessionId);
  return data.snapshot;
}

export async function getSession(
  sessionId: string,
  signal?: AbortSignal,
): Promise<JourneySnapshot> {
  const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, { signal });
  const data = await parse<{ ok: true; snapshot: JourneySnapshot }>(response);
  return data.snapshot;
}

export async function getEvents(
  sessionId: string,
  afterRevision = 0,
  signal?: AbortSignal,
): Promise<DomainEvent[]> {
  const response = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/events?afterRevision=${afterRevision}&limit=50`,
    { signal },
  );
  const data = await parse<{ ok: true; events: DomainEvent[] }>(response);
  return data.events;
}

function readPending(): PendingOperation[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]") as PendingOperation[];
  } catch {
    return [];
  }
}

function setPending(items: PendingOperation[]) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(items.slice(-20)));
}

function addPending(item: PendingOperation) {
  setPending([
    ...readPending().filter((candidate) => candidate.operationId !== item.operationId),
    item,
  ]);
}

function clearPending(operationId: string) {
  setPending(readPending().filter((candidate) => candidate.operationId !== operationId));
}

export function pendingForSession(sessionId: string) {
  return readPending().filter((item) => item.sessionId === sessionId);
}

export async function getOperation(
  sessionId: string,
  operationId: string,
  signal?: AbortSignal,
): Promise<CommandResult | null> {
  const response = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/operations/${encodeURIComponent(operationId)}`,
    { signal },
  );
  if (response.status === 404) return null;
  return parse<CommandResult>(response);
}

export async function sendCommand(options: {
  sessionId: string;
  revision: number;
  actor: Actor;
  command: JourneyCommand;
  signal?: AbortSignal;
  operationId?: string;
}): Promise<CommandResult> {
  const operationId = options.operationId ?? crypto.randomUUID();
  const envelope: CommandEnvelope = {
    operationId,
    expectedRevision: options.revision,
    actor: options.actor,
    command: options.command,
    sentAt: new Date().toISOString(),
  };
  addPending({
    operationId,
    sessionId: options.sessionId,
    commandType: options.command.type,
    startedAt: envelope.sentAt,
  });
  try {
    const response = await fetch(
      `/api/sessions/${encodeURIComponent(options.sessionId)}/commands`,
      {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(envelope),
        signal: options.signal,
      },
    );
    const result = await parse<CommandResult>(response);
    clearPending(operationId);
    return result;
  } catch (error) {
    if (options.signal?.aborted || error instanceof TypeError) {
      const reconciled = await reconcileOperation(options.sessionId, operationId);
      if (reconciled) return reconciled;
      throw Object.assign(new Error("Outcome unknown—reconciling before retry."), {
        code: "AMBIGUOUS_OUTCOME",
        operationId,
      });
    }
    throw error;
  }
}

export async function reconcileOperation(
  sessionId: string,
  operationId: string,
): Promise<CommandResult | null> {
  try {
    const result = await getOperation(sessionId, operationId);
    if (result) clearPending(operationId);
    return result;
  } catch {
    return null;
  }
}

export function forgetSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
