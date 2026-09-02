import { expect, test } from "@playwright/test";

test("manual fallback completes the same human-controlled journey", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("button", { name: "Start shared journey" })).toBeVisible();
  await page.getByRole("radio", { name: /Show me/ }).click();
  await page.getByRole("button", { name: "Start shared journey" }).click();

  await page.getByRole("button", { name: "Highlight this step" }).click();
  await expect(page.locator(".guidance-spotlight")).toBeVisible();
  await page.getByRole("button", { name: "Use Aug 31, 2026" }).click();
  await page.getByRole("button", { name: "Use $86.00" }).click();
  await page.getByRole("button", { name: "Choose Project Atlas" }).click();
  await page.getByRole("button", { name: "Choose Client meal" }).click();
  await page.getByRole("button", { name: "Prepare for my review" }).click();

  await expect(page.getByText("HUMAN-ONLY BOUNDARY")).toBeVisible();
  await page.getByRole("button", { name: "Confirm and submit expense" }).click();
  await expect(page.getByText("VERIFIED COMPLETION")).toBeVisible();
  await expect(page.getByText(/EXP-/)).toBeVisible();
});

test("changing modes preserves completed work", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Start shared journey" }).click();
  await page.getByRole("button", { name: "Use Aug 31, 2026" }).click();
  await expect(
    page.locator(".expense-field").filter({ hasText: "Expense date" }).getByText("Aug 31, 2026"),
  ).toBeVisible();
  const delegatedMode = page.getByRole("radio", { name: /Do it for me/ });
  await delegatedMode.click();
  await expect(delegatedMode).toBeChecked();
  await expect(page.getByText("Do it for me", { exact: true })).toBeVisible();
});

test("the human can pause and resume without losing verified work", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Start shared journey" }).click();
  await page.getByRole("button", { name: "Pause journey" }).click();

  await expect(page.getByText("JOURNEY PAUSED")).toBeVisible();
  await expect(page.getByText("Work is safely held")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume journey" })).toHaveCount(2);

  await page.getByRole("button", { name: "Resume journey" }).last().click();
  await expect(page.getByText("STEP 01 / 06")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause journey" })).toBeVisible();
});
