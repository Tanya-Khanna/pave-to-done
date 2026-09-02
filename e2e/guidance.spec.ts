import { expect, test, type Locator, type Page } from "@playwright/test";

const dateField = (page: Page) =>
  page.locator(".expense-field").filter({ hasText: "Expense date" });

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
  await page.getByRole("button", { name: "Start shared journey" }).click();
  await page.getByRole("button", { name: "Highlight this step" }).click();
});

test("guidance stays attached after scroll and resize while its coach remains on-screen", async ({
  page,
}) => {
  const target = dateField(page);
  await expectOverlayAttached(page, target);

  await page.locator(".portal-main").evaluate((element) => element.scrollTo({ top: 40 }));
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

  await page.getByRole("button", { name: "Use Aug 31, 2026" }).click();
  await expect(page.getByText("STEP 02 / 06")).toBeVisible();
  await expect(page.locator(".guidance-coach")).toHaveCount(0);
});

test("the complete Show Me journey can be operated by keyboard with announced state", async ({
  page,
}) => {
  await expect(page.locator(".toast")).toHaveCount(0, { timeout: 6_000 });
  // Complete the already-highlighted date step and every subsequent action using keyboard activation.
  const activate = async (name: string) => {
    const button = page.getByRole("button", { name });
    await button.focus();
    await expect(button).toBeFocused();
    await button.press("Space");
  };

  await activate("Use Aug 31, 2026");
  await expect(page.getByRole("status").filter({ hasText: /Step 2 of 6/ })).toContainText(
    "Control is with you",
  );
  await activate("Use $86.00");
  await activate("Choose Project Atlas");
  await activate("Choose Client meal");
  await activate("Prepare for my review");
  await expect(page.getByText("HUMAN-ONLY BOUNDARY")).toBeVisible();
  await activate("Confirm and submit expense");
  await expect(page.getByRole("status").filter({ hasText: /Journey complete/ })).toContainText(
    "history verified",
  );
  await expect(page.getByText("VERIFIED COMPLETION")).toBeVisible();
});
