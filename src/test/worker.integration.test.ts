import { describe, expect, it, vi } from "vitest";
import worker from "../server/worker";

function environment(assetResponse = new Response("asset", { status: 200 })) {
  return {
    ASSETS: { fetch: vi.fn(async () => assetResponse.clone()) },
    JOURNEYS: {
      idFromName: vi.fn(),
      get: vi.fn(),
    },
  };
}

describe("Worker entrypoint integration", () => {
  it("serves health through the real Worker entrypoint with the production security headers", async () => {
    const response = await worker.fetch(
      new Request("https://pave.example/api/health"),
      environment() as never,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, service: "pave.to(done)" });
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("permissions-policy")).toContain("tools=(self)");
    expect(response.headers.get("origin-agent-cluster")).toBe("?1");
  });

  it("applies the same security boundary to static application responses", async () => {
    const env = environment(new Response("<!doctype html>", { status: 200 }));
    const response = await worker.fetch(new Request("https://pave.example/demo"), env as never);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<!doctype html>");
    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
    expect(response.headers.get("origin-agent-cluster")).toBe("?1");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it("rejects cross-origin mutations before Durable Object access", async () => {
    const env = environment();
    const response = await worker.fetch(
      new Request("https://pave.example/api/sessions", {
        method: "POST",
        headers: { Origin: "https://attacker.example" },
      }),
      env as never,
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "POLICY_DENIED" },
    });
    expect(env.JOURNEYS.get).not.toHaveBeenCalled();
  });
});
