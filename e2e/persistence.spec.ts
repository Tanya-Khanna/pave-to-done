import { expect, test } from "@playwright/test";

async function reachExpenseConfirmation(page: import("@playwright/test").Page) {
  await page.goto("/demo");
  await page.getByRole("radio", { name: /Show me/ }).click();
  await page.getByRole("button", { name: "Start shared journey" }).click();
  await page.getByRole("button", { name: "Use Aug 31, 2026" }).click();
  await page.getByRole("button", { name: "Use $86.00" }).click();
  await page.getByRole("button", { name: "Choose Project Atlas" }).click();
  await page.getByRole("button", { name: "Choose Client meal" }).click();
  await page.getByRole("button", { name: "Prepare for my review" }).click();
  await expect(page.getByRole("button", { name: "Confirm and submit expense" })).toBeVisible();
}

test("refresh preserves the expiring human confirmation and completed outcome", async ({
  page,
}) => {
  await reachExpenseConfirmation(page);
  const sessionId = await page.evaluate(() => sessionStorage.getItem("pave.session.v1"));
  expect(sessionId).toMatch(/^[a-f0-9-]{36}$/);

  await page.reload();
  await expect(page.getByText("HUMAN-ONLY BOUNDARY")).toBeVisible();
  await expect(page.getByText("$86.00", { exact: true })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "Project Atlas" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm and submit expense" }).click();
  await expect(page.getByText("VERIFIED COMPLETION")).toBeVisible();

  await page.reload();
  await expect(page.getByText("VERIFIED COMPLETION")).toBeVisible();
  await expect(page.evaluate(() => sessionStorage.getItem("pave.session.v1"))).resolves.toBe(
    sessionId,
  );
});

test("two tabs sharing a guest session converge after either tab acts", async ({
  page,
  context,
}) => {
  await page.goto("/demo");
  await expect(page.getByRole("button", { name: "Start shared journey" })).toBeVisible();
  const sessionId = await page.evaluate(() => sessionStorage.getItem("pave.session.v1"));
  expect(sessionId).toBeTruthy();

  const teammate = await context.newPage();
  await teammate.addInitScript((sharedSessionId) => {
    sessionStorage.setItem("pave.session.v1", sharedSessionId);
  }, sessionId!);
  await teammate.goto("/demo");
  await expect(teammate.getByRole("button", { name: "Start shared journey" })).toBeVisible();

  await page.getByRole("button", { name: "Start shared journey" }).click();
  await expect(teammate.getByText("STEP 01 / 06")).toBeVisible();
  await expect(teammate.getByRole("button", { name: "Use Aug 31, 2026" })).toBeVisible();

  await teammate.getByRole("button", { name: "Use Aug 31, 2026" }).click();
  await expect(page.getByText("STEP 02 / 06")).toBeVisible();
  await expect(page.getByRole("button", { name: "Use $86.00" })).toBeVisible();
});

test("reset starts a fresh document so WebMCP registration limits also reset", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Start shared journey" }).click();
  await page.getByRole("button", { name: "Use Aug 31, 2026" }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();

  await expect(page.getByRole("button", { name: "Start shared journey" })).toBeVisible();
  expect(
    await page.evaluate(
      () => (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming).type,
    ),
  ).toBe("reload");
});
