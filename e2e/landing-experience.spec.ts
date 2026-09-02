import { expect, test } from "@playwright/test";

test("the first viewport communicates the product and primary action within five seconds", async ({
  page,
}) => {
  const started = Date.now();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "From “show me” to safely done." })).toBeVisible();
  await expect(page.getByText(/Teach any web task once—or ask for one on demand/)).toBeVisible();
  await expect(page.getByText("Shared visible state", { exact: true })).toBeVisible();
  await expect(page.getByText("Semantic self-healing", { exact: true })).toBeVisible();
  await expect(page.getByText("Human-only consequence", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open the live journey" })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(5000);
});

test("the interactive agency preview makes control ownership explicit", async ({ page }) => {
  await page.goto("/");
  const preview = page.locator(".mode-preview");

  await page.getByRole("button", { name: /01 Show me/ }).click();
  await expect(page.getByRole("button", { name: /01 Show me/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(preview.getByText("YOU", { exact: true })).toHaveCount(6);
  await expect(preview.getByText("You click every step")).toBeVisible();

  await page.waitForTimeout(700);
  const humanBaton = await page.locator(".baton-track i").boundingBox();
  await page.getByRole("button", { name: /03 Do it for me/ }).click();
  await expect(preview.getByText("The agent acts until risk changes")).toBeVisible();
  await page.waitForTimeout(700);
  const agentBaton = await page.locator(".baton-track i").boundingBox();
  expect(agentBaton!.x).toBeGreaterThan(humanBaton!.x + 100);
  expect(
    await page
      .locator(".baton-track i")
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe("0.65s");
  await expect(preview.getByText("YOU", { exact: true })).toHaveCount(2);
  await expect(preview.getByText("AGENT", { exact: true })).toHaveCount(5);
});

test("the landing page demonstrates semantic healing as an operable morph", async ({ page }) => {
  await page.goto("/");
  const oldAnchor = page.locator(".sidebar-anchor");
  const newAnchor = page.locator(".header-anchor");
  await expect(oldAnchor).toContainText("+ New expense");
  expect(Number(await oldAnchor.evaluate((element) => getComputedStyle(element).opacity))).toBe(1);

  await page.getByRole("button", { name: "V2", exact: true }).click();
  await expect(page.getByRole("button", { name: "V2", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(oldAnchor).toContainText("Moved safely");
  await expect(newAnchor).toContainText("+ Add expense");
  await expect(page.getByText("Needs your review", { exact: true })).toBeVisible();
  await page.waitForTimeout(800);
  expect(
    Number(await oldAnchor.evaluate((element) => getComputedStyle(element).opacity)),
  ).toBeLessThan(0.5);
  expect(Number(await newAnchor.evaluate((element) => getComputedStyle(element).opacity))).toBe(1);
  await expect(page.getByText("expense.create", { exact: true })).toBeVisible();
});

test("the landing page proves WebMCP and offers a copyable non-trivial judge prompt", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "The page is the shared object of work." }),
  ).toBeVisible();
  for (const tool of ["get_journey()", "update_mileage_draft()", "prepare_mileage_submission()"])
    await expect(page.getByText(tool, { exact: true })).toBeVisible();
  await expect(page.getByText("No WebMCP tool can submit.")).toBeVisible();

  await page.getByRole("button", { name: "Copy judge prompt" }).click();
  await expect(page.getByRole("button", { name: "Copy judge prompt" })).toContainText("Copied");
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("18-mile mileage reimbursement");
  await expect(page.getByRole("button", { name: "Start in the shared surface" })).toBeVisible();
});

test("the primary demo CTA stays above the fold at common viewports", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const cta = page.getByRole("button", { name: "Open the live journey" });
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  }
  const routeAnimation = await page.locator(".route-progress").evaluate((element) => ({
    name: getComputedStyle(element).animationName,
    dash: getComputedStyle(element).strokeDasharray,
  }));
  expect(routeAnimation.name).toContain("route-draw");
  expect(routeAnimation.dash).toContain("1350");
});

test("signature landing interactions remain responsive under six-times CPU throttling", async ({
  page,
}) => {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await page.goto("/");
  const started = Date.now();
  await page.getByRole("button", { name: /03 Do it for me/ }).click();
  await expect(page.locator(".mode-preview")).toContainText("The agent acts until risk changes");
  await page.getByRole("button", { name: "V2", exact: true }).click();
  await expect(page.getByText("Needs your review", { exact: true })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(3000);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await session.detach();
});
