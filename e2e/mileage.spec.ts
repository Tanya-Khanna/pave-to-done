import { expect, test, type Page } from "@playwright/test";
import { fillMileage, startMileage as startMileageTask } from "./journey-actions";

async function agentCommand(page: Page, command: Record<string, unknown>) {
  return page.evaluate(async (nextCommand) => {
    const sessionId = sessionStorage.getItem("pave.session.v1")!;
    const state = await fetch(`/api/sessions/${sessionId}`).then((response) => response.json());
    return fetch(`/api/sessions/${sessionId}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationId: crypto.randomUUID(),
        expectedRevision: state.snapshot.revision,
        actor: { kind: "agent", surface: "webmcp" },
        command: nextCommand,
        sentAt: new Date().toISOString(),
      }),
    }).then((response) => response.json());
  }, command);
}

async function startMileage(page: Page, mode: "Show me" | "Do it for me" = "Show me") {
  await page.goto("/demo");
  await page.getByRole("radio", { name: new RegExp(mode, "i") }).click();
  await startMileageTask(page);
  await expect(page.getByText("Planned for this session", { exact: true }).first()).toBeVisible();
}

test("an on-demand mileage journey is a complete second workflow", async ({ page }) => {
  await startMileage(page);
  await expect(page.getByText(/mileage\.origin/)).toBeVisible();
  await expect(page.getByText("DEMO RECEIPT")).toHaveCount(0);
  await fillMileage(page);
  await page.getByRole("button", { name: "Prepare mileage for review" }).click();
  await expect(page.getByText("$12.06", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Confirm and submit reimbursement" }).click();
  await expect(page.getByText("VERIFIED COMPLETION")).toBeVisible();
  await expect(page.getByRole("heading", { name: /^MILE-/ })).toBeVisible();
});

test("pressing Enter selects and starts the matching journey source", async ({ page }) => {
  await page.goto("/demo");
  const task = page.getByRole("textbox", { name: "Your task" });
  await task.fill("Create a mileage reimbursement for an 18-mile customer visit");
  await task.press("Enter");
  await expect(page.getByRole("heading", { name: "Mileage reimbursement" })).toBeVisible();
  await expect(page.getByText("Planned for this session", { exact: true }).first()).toBeVisible();
});

test("the on-demand mileage plan self-heals through a material V2 change", async ({ page }) => {
  await startMileage(page, "Do it for me");
  await fillMileage(page);
  await page.getByRole("button", { name: "Simulate Portal v2" }).click();
  await expect(page.getByText("PORTAL CHANGE DETECTED", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Distance")).toHaveValue("18");
  await expect(page.getByText("Safe remap · mileage.distance")).toBeVisible();
  await expect(page.getByText("New required input · vehicleType")).toBeVisible();
  await expect(page.getByText(/expense\.create|Business purpose changes/)).toHaveCount(0);

  const proposed = await agentCommand(page, {
    type: "ProposeRepair",
    vehicleType: "Personal car",
  });
  expect(proposed).toMatchObject({ ok: true });
  await page.reload();
  await page.getByRole("button", { name: "Approve material repair" }).click();
  await expect(page.getByRole("heading", { name: "Choose vehicle type" })).toBeVisible();
  await page.getByLabel("Vehicle type").selectOption("Personal car");
  await expect(page.getByLabel("Vehicle type")).toHaveValue("Personal car");
  await expect(page.getByRole("button", { name: "Prepare mileage for review" })).toBeVisible();
});
