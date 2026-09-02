import { JourneyCoordinator } from "./JourneyCoordinator";
import { errorResponse, json } from "./http";
import { withSecurityHeaders } from "./headers";
import { writeRequestFailure, type WorkerRoute } from "./logging";

export { JourneyCoordinator };

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

function forwardedRequest(url: string, request: Request, requestId: string): Request {
  const forwarded = new Request(url, request);
  forwarded.headers.set("x-pave-request-id", requestId);
  return forwarded;
}

function routeKind(pathname: string): WorkerRoute {
  if (pathname === "/api/health") return "health";
  if (pathname === "/api/sessions") return "sessions";
  if (pathname.startsWith("/api/sessions/")) return "session";
  if (!pathname.startsWith("/api/")) return "asset";
  return "unknown";
}

function withRequestId(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  headers.set("x-request-id", requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function api(request: Request, env: Env, requestId: string): Promise<Response> {
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
        headers: { "Content-Type": "application/json", "x-pave-request-id": requestId },
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
    forwardedRequest(`https://journey.internal${target}`, request, requestId),
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    try {
      const response = url.pathname.startsWith("/api/")
        ? await api(request, env, requestId)
        : await env.ASSETS.fetch(request);
      return withSecurityHeaders(withRequestId(response, requestId));
    } catch {
      writeRequestFailure(requestId, routeKind(url.pathname));
      return withSecurityHeaders(
        withRequestId(
          errorResponse(500, "INTERNAL", "The request could not be completed."),
          requestId,
        ),
      );
    }
  },
};
