import { expect, test, type Page } from "@playwright/test";
import { fillExpense, startExpense } from "./journey-actions";

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
  await startExpense(page);
  await fillExpense(page);
  await expect(page.getByRole("button", { name: "Prepare for my review" })).toBeVisible();

  await page.getByRole("button", { name: "Simulate Portal v2" }).click();
  await expect(page.getByText("PORTAL CHANGE DETECTED", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Project")).toHaveValue("Project Atlas");
  const proposed = await agentCommand(page, {
    type: "ProposeRepair",
    businessPurpose: "Client dinner after Project Atlas workshop",
  });
  expect(proposed, JSON.stringify(proposed)).toMatchObject({ ok: true });
  await page.reload();
  await expect(page.getByRole("button", { name: "Approve material repair" })).toBeVisible();
  await page.getByRole("button", { name: "Approve material repair" }).click();
  await expect(page.getByRole("heading", { name: "Add business purpose" })).toBeVisible();
  await page.getByLabel("Business purpose").fill("Client dinner after Project Atlas workshop");
  await page.getByLabel("Business purpose").press("Enter");
  await expect(page.getByLabel("Business purpose")).toHaveValue(
    "Client dinner after Project Atlas workshop",
  );
});

test("rejecting a material repair preserves the draft and stops progression", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("radio", { name: /Show me/ }).click();
  await startExpense(page);
  await fillExpense(page);
  await expect(page.getByRole("button", { name: "Prepare for my review" })).toBeVisible();
  await page.getByRole("button", { name: "Simulate Portal v2" }).click();
  await expect(page.getByText("PORTAL CHANGE DETECTED", { exact: true })).toBeVisible();

  const proposed = await agentCommand(page, {
    type: "ProposeRepair",
    businessPurpose: "Client dinner after Project Atlas workshop",
  });
  expect(proposed, JSON.stringify(proposed)).toMatchObject({ ok: true });
  await page.reload();
  await page.getByRole("button", { name: "Stop this journey" }).click();

  await expect(page.getByText("JOURNEY STOPPED", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Project")).toHaveValue("Project Atlas");
  await expect(page.getByRole("button", { name: "Prepare for my review" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Reset journey" })).toBeVisible();
});
