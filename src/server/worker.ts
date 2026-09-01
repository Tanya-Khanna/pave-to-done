import { JourneyCoordinator } from "./JourneyCoordinator";
import { errorResponse, json } from "./http";
import { withSecurityHeaders } from "./headers";

export { JourneyCoordinator };

interface Env {
  ASSETS: Fetcher;
  JOURNEYS: DurableObjectNamespace<JourneyCoordinator>;
}

function sessionStub(env: Env, sessionId: string) {
  return env.JOURNEYS.get(env.JOURNEYS.idFromName(sessionId));
}

function validSessionId(value: string) {
  return /^[a-f0-9-]{36}$/.test(value);
}

function originAllowed(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin === url.origin) return true;
  return !origin && ["127.0.0.1", "localhost"].includes(url.hostname);
}

async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({ ok: true, service: "pave.to(done)", time: new Date().toISOString() });
  }
  if (request.method !== "GET" && !originAllowed(request))
    return errorResponse(403, "POLICY_DENIED", "Mutations require an exact same-origin request.");

  if (url.pathname === "/api/sessions" && request.method === "POST") {
    const sessionId = crypto.randomUUID();
    const stub = sessionStub(env, sessionId);
    return stub.fetch(
      new Request("https://journey.internal/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }),
    );
  }

  const match = url.pathname.match(
    /^\/api\/sessions\/([^/]+)(?:\/(commands|events|operations\/[^/]+))?$/,
  );
  if (!match) return errorResponse(404, "NOT_FOUND", "API route not found.");
  const sessionId = decodeURIComponent(match[1]);
  if (!validSessionId(sessionId)) return errorResponse(404, "NOT_FOUND", "Session not found.");
  const action = match[2] ?? "state";
  const target =
    action === "state"
      ? "/state"
      : action === "commands"
        ? "/commands"
        : action === "events"
          ? `/events${url.search}`
          : `/${action}`;
  return sessionStub(env, sessionId).fetch(
    new Request(`https://journey.internal${target}`, request),
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      const response = url.pathname.startsWith("/api/")
        ? await api(request, env)
        : await env.ASSETS.fetch(request);
      return withSecurityHeaders(response);
    } catch (error) {
      console.error(
        JSON.stringify({
          outcome: "internal_error",
          message: error instanceof Error ? error.message : "unknown",
        }),
      );
      return withSecurityHeaders(
        errorResponse(500, "INTERNAL", "The request could not be completed."),
      );
    }
  },
};
