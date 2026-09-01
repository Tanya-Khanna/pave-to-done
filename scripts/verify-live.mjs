const baseURL = (
  process.env.VERIFY_BASE_URL ?? "https://pave-to-done.snapdragon-ancient.workers.dev"
).replace(/\/$/, "");

function invariant(value, message) {
  if (!value) throw new Error(message);
}

async function json(response) {
  const body = await response.json();
  invariant(response.ok, `${response.status} ${JSON.stringify(body)}`);
  return body;
}

const healthResponse = await fetch(`${baseURL}/api/health`);
const health = await json(healthResponse);
invariant(health.ok && health.service === "pave.to(done)", "Health response is incorrect.");

const pageResponse = await fetch(`${baseURL}/demo`, { method: "HEAD" });
invariant(pageResponse.ok, "Demo page is unavailable.");
invariant(
  pageResponse.headers.get("content-security-policy")?.includes("default-src 'self'"),
  "CSP is missing.",
);
invariant(
  pageResponse.headers.get("permissions-policy")?.includes("tools=(self)"),
  "WebMCP permission policy is missing.",
);
invariant(
  pageResponse.headers.get("cross-origin-opener-policy") === "same-origin",
  "Origin isolation header is missing.",
);

const mutationHeaders = { "Content-Type": "application/json", Origin: baseURL };
const created = await json(
  await fetch(`${baseURL}/api/sessions`, {
    method: "POST",
    headers: mutationHeaders,
    body: "{}",
  }),
);
const sessionId = created.snapshot.sessionId;
const operationId = crypto.randomUUID();
const envelope = {
  operationId,
  expectedRevision: 0,
  actor: { kind: "human", surface: "ui" },
  sentAt: new Date().toISOString(),
  command: {
    type: "StartJourney",
    source: { kind: "recorded", guideId: "expense-client-dinner", guideVersion: 1 },
    mode: "show",
  },
};

const commandURL = `${baseURL}/api/sessions/${sessionId}/commands`;
const first = await json(
  await fetch(commandURL, {
    method: "POST",
    headers: mutationHeaders,
    body: JSON.stringify(envelope),
  }),
);
invariant(first.ok && first.deduplicated === false, "First command did not commit normally.");

const retry = await json(
  await fetch(commandURL, {
    method: "POST",
    headers: mutationHeaders,
    body: JSON.stringify(envelope),
  }),
);
invariant(
  retry.ok && retry.deduplicated === true && retry.revision === first.revision,
  "Retry was not exactly once.",
);

const staleResponse = await fetch(commandURL, {
  method: "POST",
  headers: mutationHeaders,
  body: JSON.stringify({
    ...envelope,
    operationId: crypto.randomUUID(),
    command: { type: "ChangeAgencyMode", mode: "with" },
  }),
});
const stale = await staleResponse.json();
invariant(
  staleResponse.status === 409 && stale.error?.code === "STALE_REVISION",
  "Stale revision was not rejected.",
);

const events = await json(await fetch(`${baseURL}/api/sessions/${sessionId}/events`));
invariant(events.events.length > 0, "No events were persisted.");
invariant(
  events.events.every((event) => event.eventHash && event.operationId),
  "Event audit metadata is incomplete.",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      baseURL,
      revision: first.revision,
      exactlyOnce: retry.deduplicated,
      staleRevisionRejected: stale.error.code,
      persistedEvents: events.events.length,
      securityHeaders: true,
    },
    null,
    2,
  ),
);
