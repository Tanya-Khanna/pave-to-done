import { expect, test } from "@playwright/test";

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
  await page.reload();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText(/2 semantic actions · published/)).toBeVisible();
});
