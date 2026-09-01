import { expect, test, type Page } from "@playwright/test";

async function agentCommand(page: Page, command: Record<string, unknown>) {
  return page.evaluate(async (nextCommand) => {
    const sessionId = sessionStorage.getItem("pave.session.v1");
    if (!sessionId) throw new Error("missing session");
    const state = await fetch(`/api/sessions/${sessionId}`).then((response) => response.json());
    const response = await fetch(`/api/sessions/${sessionId}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationId: crypto.randomUUID(),
        expectedRevision: state.snapshot.revision,
        actor: { kind: "agent", surface: "webmcp" },
        command: nextCommand,
        sentAt: new Date().toISOString(),
      }),
    });
    return response.json();
  }, command);
}

test("Portal v2 preserves progress and requires repair approval", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("radio", { name: /Do it for me/ }).click();
  await page.getByRole("button", { name: "Start shared journey" }).click();
  await page.getByRole("button", { name: "Use Aug 31, 2026" }).click();
  await page.getByRole("button", { name: "Use $86.00" }).click();
  await page.getByRole("button", { name: "Choose Project Atlas" }).click();
  await page.getByRole("button", { name: "Choose Client meal" }).click();

  await page.getByRole("button", { name: "Simulate Portal v2" }).click();
  await expect(page.getByText("PORTAL CHANGE DETECTED")).toBeVisible();
  await expect(page.getByText("Project Atlas", { exact: true })).toBeVisible();
  const proposed = await agentCommand(page, {
    type: "ProposeRepair",
    businessPurpose: "Client dinner after Project Atlas workshop",
  });
  expect(proposed.ok).toBe(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "Approve material repair" })).toBeVisible();
  await page.getByRole("button", { name: "Approve material repair" }).click();
  await expect(page.getByRole("heading", { name: "Add business purpose" })).toBeVisible();
  await page.getByRole("button", { name: "Use client workshop purpose" }).click();
  await expect(page.getByText("Client dinner after Project Atlas workshop")).toBeVisible();
});
