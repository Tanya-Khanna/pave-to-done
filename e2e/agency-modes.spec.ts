import { expect, test } from "@playwright/test";
import { fillExpense, setExpenseDate, startExpense } from "./journey-actions";

test("manual fallback completes the same human-controlled journey", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("button", { name: "Start guiding me" })).toBeVisible();
  await page.getByRole("radio", { name: /Show me/ }).click();
  await startExpense(page);
  await expect(page.locator(".guidance-spotlight")).toBeVisible();
  await fillExpense(page);
  await page.getByRole("button", { name: "Prepare for my review" }).click();

  await expect(page.getByText("HUMAN-ONLY BOUNDARY")).toBeVisible();
  await page.getByRole("button", { name: "Confirm and submit expense" }).click();
  await expect(page.getByText("VERIFIED COMPLETION")).toBeVisible();
  await expect(page.getByText(/EXP-/)).toBeVisible();
});

test("changing modes preserves completed work", async ({ page }) => {
  await page.goto("/demo");
  await startExpense(page);
  await setExpenseDate(page);
  await expect(page.getByLabel("Expense date")).toHaveValue("2026-08-31");
  const delegatedMode = page.getByRole("radio", { name: /Do it for me/ });
  await delegatedMode.click();
  await expect(delegatedMode).toBeChecked();
  await expect(page.getByText("Do it for me", { exact: true })).toBeVisible();
});

test("the human can pause and resume without losing verified work", async ({ page }) => {
  await page.goto("/demo");
  await startExpense(page);
  await page.getByRole("button", { name: "Pause journey" }).click();

  await expect(page.getByText("JOURNEY PAUSED", { exact: true })).toBeVisible();
  await expect(page.getByText("Work is safely held")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume journey" })).toHaveCount(2);

  await page.getByRole("button", { name: "Resume journey" }).last().click();
  await expect(page.getByText("STEP 01 / 06")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause journey" })).toBeVisible();
});
