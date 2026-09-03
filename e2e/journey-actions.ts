import { expect, type Page } from "@playwright/test";

export async function startExpense(page: Page) {
  await page.getByRole("button", { name: "Start guiding me" }).click();
  await expect(page.getByLabel("Expense date")).toBeEnabled();
}

export async function setExpenseDate(page: Page) {
  await page.getByLabel("Expense date").fill("2026-08-31");
  await page.getByLabel("Expense date").press("Enter");
  await expect(page.getByLabel("Amount")).toBeEnabled();
}

export async function setExpenseAmount(page: Page) {
  await page.getByLabel("Amount").fill("86");
  await page.getByLabel("Amount").press("Enter");
  await expect(page.getByLabel("Project")).toBeEnabled();
}

export async function setExpenseProject(page: Page) {
  await page.getByLabel("Project").selectOption("Project Atlas");
  await expect(page.getByLabel("Category")).toBeEnabled();
}

export async function setExpenseCategory(page: Page) {
  await page.getByLabel("Category").selectOption("Client meal");
  await expect(page.getByRole("button", { name: "Prepare for my review" })).toBeEnabled();
}

export async function fillExpense(page: Page) {
  await setExpenseDate(page);
  await setExpenseAmount(page);
  await setExpenseProject(page);
  await setExpenseCategory(page);
}

export async function chooseMileageTask(page: Page) {
  await page.getByRole("button", { name: "Mileage reimbursement" }).click();
  await expect(page.getByRole("textbox", { name: "Your task" })).toHaveValue(/mileage/i);
}

export async function startMileage(page: Page) {
  await chooseMileageTask(page);
  await page.getByRole("button", { name: "Start guiding me" }).click();
  await expect(page.getByRole("heading", { name: "Mileage reimbursement" })).toBeVisible();
  await expect(page.getByLabel("Starting point")).toBeEnabled();
}

async function commitText(page: Page, label: string, value: string, nextLabel: string) {
  await page.getByLabel(label).fill(value);
  await page.getByLabel(label).press("Enter");
  await expect(page.getByLabel(nextLabel)).toBeEnabled();
}

export async function fillMileage(page: Page) {
  await commitText(page, "Starting point", "Acme HQ", "Destination");
  await commitText(page, "Destination", "JFK Airport", "Distance");
  await commitText(page, "Distance", "18", "Trip date");
  await commitText(page, "Trip date", "2026-09-01", "Business purpose");
  await page.getByLabel("Business purpose").fill("Customer workshop at destination");
  await page.getByLabel("Business purpose").press("Enter");
  await expect(page.getByRole("button", { name: "Prepare mileage for review" })).toBeEnabled();
}
