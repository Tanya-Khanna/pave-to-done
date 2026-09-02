import { expect, test } from "@playwright/test";

test("the main experience has no console errors or third-party requests", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const thirdPartyRequests = new Set<string>();

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    const pageUrl = page.url();
    if (
      ["http:", "https:"].includes(requestUrl.protocol) &&
      pageUrl.startsWith("http") &&
      requestUrl.origin !== new URL(pageUrl).origin
    )
      thirdPartyRequests.add(requestUrl.origin);
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "From “show me” to safely done." })).toBeVisible();
  await page.getByRole("button", { name: "Open the live journey" }).click();
  await expect(page.getByRole("button", { name: "Start shared journey" })).toBeVisible();
  await page.getByRole("button", { name: "Start shared journey" }).click();
  await expect(page.getByText("STEP 01 / 06")).toBeVisible();

  const productionErrors = consoleErrors.filter(
    (message) =>
      !(
        new URL(page.url()).hostname === "127.0.0.1" &&
        message.includes("Executing inline script violates")
      ),
  );
  expect(productionErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect([...thirdPartyRequests]).toEqual([]);
});

test("signature motion uses bounded composited or SVG properties", async ({ page }) => {
  await page.goto("/");
  const properties = await page.evaluate(() => {
    const styles = [...document.styleSheets].flatMap((sheet) => {
      try {
        return [...sheet.cssRules].map((rule) => rule.cssText);
      } catch {
        return [];
      }
    });
    const relevant = styles.filter((rule) =>
      /@keyframes (spin|pulse|baton|toast-in|route-draw|dash)/.test(rule),
    );
    return relevant.join("\n");
  });

  expect(properties).toContain("transform:");
  expect(properties).toContain("opacity:");
  expect(properties).toContain("stroke-dashoffset:");
  expect(properties).not.toMatch(/\b(top|right|bottom|left|width|height):/);
});
