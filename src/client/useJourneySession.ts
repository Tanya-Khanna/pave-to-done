import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Actor,
  CommandResult,
  DomainEvent,
  JourneyCommand,
  JourneySnapshot,
} from "../domain/types";
import {
  createSession,
  getEvents,
  getSession,
  getStoredSessionId,
  pendingForSession,
  sendCommand,
} from "./journeyClient";

interface Invocation {
  name: string;
  status: "idle" | "pending" | "ok" | "error" | "reconciling";
  durationMs: number;
  operationId?: string;
  message?: string;
  sentRevision?: number;
  resultingRevision?: number;
  reconciled?: boolean;
  reconciledState?: { revision: number; status: JourneySnapshot["status"] };
}

export function useJourneySession() {
  const [snapshot, setSnapshot] = useState<JourneySnapshot | null>(null);
  const snapshotRef = useRef<JourneySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [invocation, setInvocation] = useState<Invocation>({
    name: "—",
    status: "idle",
    durationMs: 0,
  });
  const channelRef = useRef<BroadcastChannel | null>(null);

  const accept = useCallback((next: JourneySnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
    channelRef.current?.postMessage(next);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = getStoredSessionId();
        const next = stored
          ? await getSession(stored).catch(() => createSession())
          : await createSession();
        if (!active) return;
        accept(next);
        setEvents(await getEvents(next.sessionId).catch(() => []));
        const channel = new BroadcastChannel(`pave:${next.sessionId}`);
        channel.onmessage = (event) => {
          const incoming = event.data as JourneySnapshot;
          if (incoming.revision > (snapshotRef.current?.revision ?? -1)) {
            snapshotRef.current = incoming;
            setSnapshot(incoming);
          }
        };
        channelRef.current = channel;
      } catch (cause) {
        if (active)
          setError(cause instanceof Error ? cause.message : "Could not start the guest journey.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      channelRef.current?.close();
    };
  }, [accept]);

  const refresh = useCallback(async () => {
    const current = snapshotRef.current;
    if (!current) return null;
    const next = await getSession(current.sessionId);
    accept(next);
    return next;
  }, [accept]);

  const command = useCallback(
    async (
      name: string,
      journeyCommand: JourneyCommand,
      actor: Actor,
      signal?: AbortSignal,
    ): Promise<CommandResult> => {
      const current = snapshotRef.current;
      if (!current) throw new Error("Journey session is still loading.");
      const started = performance.now();
      setInvocation({ name, status: "pending", durationMs: 0 });
      try {
        const result = await sendCommand({
          sessionId: current.sessionId,
          revision: current.revision,
          actor,
          command: journeyCommand,
          signal,
        });
        accept(result.snapshot);
        if (result.ok) {
          setEvents((previous) => {
            const byId = new Map(previous.map((event) => [event.eventId, event]));
            result.events.forEach((event) => byId.set(event.eventId, event));
            return [...byId.values()].sort((a, b) => a.revision - b.revision);
          });
        }
        setInvocation({
          name,
          status: result.ok ? "ok" : "error",
          durationMs: Math.round(performance.now() - started),
          operationId: result.operationId,
          sentRevision: result.sentRevision,
          resultingRevision: result.revision,
          reconciled: result.reconciled,
          reconciledState: result.reconciled
            ? { revision: result.snapshot.revision, status: result.snapshot.status }
            : undefined,
          message: result.ok
            ? result.deduplicated
              ? "Deduplicated and verified"
              : "Applied and verified"
            : result.error.message,
        });
        if (!result.ok && result.error.code === "STALE_REVISION") await refresh();
        return result;
      } catch (cause) {
        const ambiguous =
          cause instanceof Error && "code" in cause && cause.code === "AMBIGUOUS_OUTCOME";
        const reconciledState = ambiguous ? await refresh().catch(() => null) : null;
        setInvocation({
          name,
          status: ambiguous ? "reconciling" : "error",
          durationMs: Math.round(performance.now() - started),
          message: cause instanceof Error ? cause.message : "Command failed.",
          sentRevision: current.revision,
          resultingRevision: reconciledState?.revision,
          reconciled: Boolean(reconciledState),
          reconciledState: reconciledState
            ? { revision: reconciledState.revision, status: reconciledState.status }
            : undefined,
        });
        throw cause;
      }
    },
    [accept, refresh],
  );

  return {
    snapshot,
    snapshotRef,
    loading,
    error,
    events,
    invocation,
    command,
    refresh,
    pending: snapshot ? pendingForSession(snapshot.sessionId) : [],
  };
}
