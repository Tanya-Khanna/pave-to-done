import { expect, test } from "@playwright/test";
import { fillExpense, startExpense } from "./journey-actions";

test("sensitive completion is absent until preparation and requires the visible UI", async ({
  page,
}) => {
  await page.goto("/demo");
  await expect(page.getByRole("button", { name: "Confirm and submit expense" })).toHaveCount(0);
  await startExpense(page);
  await fillExpense(page);
  await page.getByRole("button", { name: "Prepare for my review" }).click();
  await expect(page.getByRole("button", { name: "Confirm and submit expense" })).toBeVisible();
});
