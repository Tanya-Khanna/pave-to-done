import { expect, test } from "@playwright/test";

test("the demo exposes a visible keyboard focus and a live journey status", async ({ page }) => {
  await page.goto("/demo");
  const back = page.getByRole("button", { name: "Back to landing page" });
  await expect(back).toBeVisible();
  await page.keyboard.press("Tab");

  await expect(back).toBeFocused();
  const outline = await back.evaluate((node) => getComputedStyle(node).outlineStyle);
  expect(outline).not.toBe("none");

  await page.getByRole("button", { name: "Start shared journey" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Step 1 of 6/ })).toHaveText(
    /Control is with/,
  );
});

test("the landing page and demo do not overflow a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of ["/", "/demo"]) {
    await page.goto(path);
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  }
});

test("reduced motion collapses decorative animations without hiding content", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /From “show me” to safely done/ })).toBeVisible();
  const duration = await page
    .locator(".route-line")
    .evaluate((node) => getComputedStyle(node).animationDuration);
  expect(parseFloat(duration)).toBeLessThan(0.01);
});
