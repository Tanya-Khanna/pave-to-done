import { expect, test } from "@playwright/test";

test("sensitive completion is absent until preparation and requires the visible UI", async ({
  page,
}) => {
  await page.goto("/demo");
  await expect(page.getByRole("button", { name: "Confirm and submit expense" })).toHaveCount(0);
  await page.getByRole("button", { name: "Start shared journey" }).click();
  await page.getByRole("button", { name: "Use Aug 31, 2026" }).click();
  await page.getByRole("button", { name: "Use $86.00" }).click();
  await page.getByRole("button", { name: "Choose Project Atlas" }).click();
  await page.getByRole("button", { name: "Choose Client meal" }).click();
  await page.getByRole("button", { name: "Prepare for my review" }).click();
  await expect(page.getByRole("button", { name: "Confirm and submit expense" })).toBeVisible();
});
