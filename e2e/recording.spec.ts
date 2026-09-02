import { expect, test } from "@playwright/test";

async function sessionSnapshot(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const sessionId = sessionStorage.getItem("pave.session.v1")!;
    const state = await fetch(`/api/sessions/${sessionId}`).then((response) => response.json());
    return state.snapshot;
  });
}

test("an expert records semantic actions and a person publishes the reviewed guide", async ({
  page,
}) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await expect(page.getByText(/0 semantic actions · recording/)).toBeVisible();
  await page.getByRole("button", { name: "Start shared journey" }).click();
  await page.getByRole("button", { name: "Use Aug 31, 2026" }).click();
  await page.getByRole("button", { name: "Use $86.00" }).click();
  await expect(page.getByRole("button", { name: "Choose Project Atlas" })).toBeVisible();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByText(/2 semantic actions · review/)).toBeVisible();
  await expect(page.getByText("Before · outcome not met").first()).toBeVisible();
  await expect(page.getByText("After · outcome met").first()).toBeVisible();
  const narration = "Use the verified receipt date before making allocation judgments.";
  await page.getByLabel("Optional narration for action 1").fill(narration);
  await page.getByRole("button", { name: "Save narration for action 1" }).click();
  await expect
    .poll(async () => (await sessionSnapshot(page)).recording.entries[0].narration)
    .toBe(narration);

  const result = await page.evaluate(async () => {
    const sessionId = sessionStorage.getItem("pave.session.v1")!;
    const state = await fetch(`/api/sessions/${sessionId}`).then((response) => response.json());
    const response = await fetch(`/api/sessions/${sessionId}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationId: crypto.randomUUID(),
        expectedRevision: state.snapshot.revision,
        actor: { kind: "agent", surface: "webmcp" },
        command: {
          type: "SaveGuideDraft",
          title: "Submit a client dinner",
          narration: "Use verified receipt facts and preserve human confirmation.",
        },
        sentAt: new Date().toISOString(),
      }),
    });
    return response.json();
  });
  expect(result.ok).toBe(true);
  expect(result.snapshot.recording.entries).toHaveLength(2);
  expect(result.snapshot.recording.draft.provenance).toBe("AI-generated draft");
  await page.reload();
  await expect(page.getByText("AI-generated draft", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Submit a client dinner" })).toBeVisible();
  await expect(page.getByText(narration).first()).toBeVisible();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText(/2 semantic actions · published/)).toBeVisible();
  await expect(page.getByText("Recorded guide", { exact: true }).first()).toBeVisible();
});

test("a person can build and review a deterministic draft without an agent", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await expect(page.getByText(/0 semantic actions · recording/)).toBeVisible();
  await page.getByRole("button", { name: "Start shared journey" }).click();
  await page.getByRole("button", { name: "Use Aug 31, 2026" }).click();
  await expect(page.getByText(/1 semantic actions · recording/)).toBeVisible();
  await page.getByRole("button", { name: "Stop" }).click();
  await page.getByRole("button", { name: "Build draft without an agent" }).click();

  await expect(page.getByText("AI-generated draft", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Deterministic fallback · server validated")).toBeVisible();
  await expect(
    page.getByRole("listitem").getByText("Set expense date", { exact: true }),
  ).toBeVisible();
});
