import { expect, test, type Locator, type Page } from "@playwright/test";

const dateField = (page: Page) => page.getByLabel("Expense date");

async function expectOverlayAttached(page: Page, target: Locator) {
  await expect(page.locator(".guidance-spotlight")).toBeVisible();
  await expect(page.locator(".guidance-coach")).toBeVisible();
  await expect
    .poll(async () => {
      const [targetBox, spotlightBox] = await Promise.all([
        target.boundingBox(),
        page.locator(".guidance-spotlight").boundingBox(),
      ]);
      if (!targetBox || !spotlightBox) return Number.POSITIVE_INFINITY;
      return Math.max(
        Math.abs(spotlightBox.x - (targetBox.x - 7)),
        Math.abs(spotlightBox.y - (targetBox.y - 7)),
        Math.abs(spotlightBox.width - (targetBox.width + 14)),
      );
    })
    .toBeLessThan(2);
  const [targetBox, spotlightBox, coachBox, viewport] = await Promise.all([
    target.boundingBox(),
    page.locator(".guidance-spotlight").boundingBox(),
    page.locator(".guidance-coach").boundingBox(),
    page.evaluate(() => ({ width: innerWidth, height: innerHeight })),
  ]);
  expect(targetBox).not.toBeNull();
  expect(spotlightBox).not.toBeNull();
  expect(coachBox).not.toBeNull();
  expect(coachBox!.x).toBeGreaterThanOrEqual(11);
  expect(coachBox!.y).toBeGreaterThanOrEqual(11);
  expect(coachBox!.x + coachBox!.width).toBeLessThanOrEqual(viewport.width - 11);
  expect(coachBox!.y + coachBox!.height).toBeLessThanOrEqual(viewport.height - 11);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("radio", { name: /Show me/ }).click();
  await page.getByRole("button", { name: "Start guiding me" }).click();
  await expect(page.locator(".guidance-coach")).toBeVisible();
});

test("guidance stays attached after scroll and resize while its coach remains on-screen", async ({
  page,
}) => {
  const target = dateField(page);
  await expectOverlayAttached(page, target);

  await page.locator(".portal-main").evaluate((element) => element.scrollTo({ top: 40 }));
  await expectOverlayAttached(page, target);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await target.scrollIntoViewIfNeeded();
  await expectOverlayAttached(page, target);

  await page.setViewportSize({ width: 1024, height: 720 });
  await target.scrollIntoViewIfNeeded();
  await expectOverlayAttached(page, target);

  await page.setViewportSize({ width: 390, height: 844 });
  await target.scrollIntoViewIfNeeded();
  await expectOverlayAttached(page, target);
});

test("coach text communicates ownership and outcome without blocking the human action", async ({
  page,
}) => {
  const coach = page.locator(".guidance-coach");
  await expect(coach).toContainText("CURRENT STEP");
  await expect(coach).toContainText("You act");
  await expect(coach).toContainText("Add the receipt date");
  await expect(coach).toContainText("Why");
  await expect(coach).toContainText("Expected");
  expect(await coach.evaluate((node) => getComputedStyle(node).pointerEvents)).toBe("none");
  expect(
    await page
      .locator(".guidance-spotlight")
      .evaluate((node) => getComputedStyle(node).pointerEvents),
  ).toBe("none");

  await page.getByLabel("Expense date").fill("2026-08-31");
  await page.getByLabel("Expense date").press("Enter");
  await expect(page.getByText("STEP 02 / 06")).toBeVisible();
  await expect(page.locator(".guidance-coach")).toContainText("Add the amount");
  await expectOverlayAttached(page, page.getByLabel("Amount"));
});

test("automatic guidance records exactly once for each verified human step", async ({ page }) => {
  await expect(page.locator(".guidance-coach")).toContainText("Add the receipt date");
  await page.getByRole("button", { name: "Diagnostics" }).click();
  await page.getByRole("button", { name: "Close diagnostics" }).click();
  const firstCount = await page.evaluate(async () => {
    const sessionId = sessionStorage.getItem("pave.session.v1")!;
    const payload = (await fetch(`/api/sessions/${sessionId}/events`).then((response) =>
      response.json(),
    )) as { events: Array<{ type: string; safePayload: { stepId?: string } }> };
    return payload.events.filter(
      (event) => event.type === "GuidanceShown" && event.safePayload.stepId === "step-1",
    ).length;
  });
  expect(firstCount).toBe(1);

  await page.getByLabel("Expense date").fill("2026-08-31");
  await page.getByLabel("Expense date").press("Enter");
  await expect(page.locator(".guidance-coach")).toContainText("Add the amount");
  const secondCount = await page.evaluate(async () => {
    const sessionId = sessionStorage.getItem("pave.session.v1")!;
    const payload = (await fetch(`/api/sessions/${sessionId}/events`).then((response) =>
      response.json(),
    )) as { events: Array<{ type: string; safePayload: { stepId?: string } }> };
    return payload.events.filter(
      (event) => event.type === "GuidanceShown" && event.safePayload.stepId === "step-2",
    ).length;
  });
  expect(secondCount).toBe(1);
});

test("invalid portal input keeps the current waypoint and explains the correction", async ({
  page,
}) => {
  await page.getByLabel("Expense date").fill("2026-08-31");
  await page.getByLabel("Expense date").press("Enter");
  await expect(page.getByLabel("Amount")).toBeEnabled();
  await page.getByLabel("Amount").fill("0");
  await page.getByLabel("Amount").press("Enter");
  await expect(page.getByText("Enter a valid value before continuing.")).toBeVisible();
  await expect(page.getByText("STEP 02 / 06")).toBeVisible();
  await expect(page.locator(".guidance-coach")).toContainText("Add the amount");
});

test("the complete Show Me journey can be operated by keyboard with announced state", async ({
  page,
}) => {
  await expect(page.locator(".toast")).toHaveCount(0, { timeout: 6_000 });
  // Complete the automatically guided journey through the real controls using only the keyboard.
  const activate = async (name: string) => {
    const button = page.getByRole("button", { name });
    await button.focus();
    await expect(button).toBeFocused();
    await button.press("Space");
  };

  const date = page.getByLabel("Expense date");
  await date.focus();
  await date.pressSequentially("2026-08-31");
  await date.press("Enter");
  await expect(page.locator(".sr-only[role='status']")).toContainText("Control is with you");
  const amount = page.getByLabel("Amount");
  await amount.focus();
  await amount.pressSequentially("86");
  await amount.press("Enter");
  const project = page.getByLabel("Project");
  await expect(project).toBeEnabled();
  await project.focus();
  await project.press("ArrowDown");
  await expect(page.getByLabel("Category")).toBeEnabled();
  const category = page.getByLabel("Category");
  await category.focus();
  await category.press("ArrowDown");
  await expect(page.getByRole("button", { name: "Prepare for my review" })).toBeEnabled();
  await activate("Prepare for my review");
  await expect(page.getByText("HUMAN-ONLY BOUNDARY")).toBeVisible();
  await activate("Confirm and submit expense");
  await expect(page.locator(".sr-only[role='status']")).toContainText("history verified");
  await expect(page.getByText("VERIFIED COMPLETION")).toBeVisible();
});
