import { expect, test, type Page } from "@playwright/test";

async function installSpeechStub(page: Page) {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    Object.defineProperty(window, "__paveSpoken", { value: spoken, configurable: true });
    class FakeUtterance {
      text: string;
      rate = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: FakeUtterance,
      configurable: true,
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        cancel() {},
        speak(utterance: FakeUtterance) {
          spoken.push(utterance.text);
          utterance.onstart?.();
          utterance.onend?.();
        },
      },
      configurable: true,
    });
  });
}

async function startMileage(page: Page) {
  await page.goto("/demo");
  await page.getByRole("button", { name: "On demand" }).click();
  await page.getByRole("button", { name: "Start shared journey" }).click();
  await expect(page.getByRole("heading", { name: "Mileage reimbursement" })).toBeVisible();
}

async function fillMileage(page: Page) {
  for (const label of [
    "Use Acme HQ",
    "Use JFK Airport",
    "Use 18 miles",
    "Use Sep 1, 2026",
    "Use customer workshop purpose",
  ])
    await page.getByRole("button", { name: label }).click();
  await expect(page.getByRole("button", { name: "Prepare mileage for review" })).toBeVisible();
}

async function lastSpoken(page: Page) {
  return page.evaluate(() => {
    const spoken = (window as Window & { __paveSpoken?: string[] }).__paveSpoken ?? [];
    return spoken.at(-1) ?? "";
  });
}

test("available speech reads the current instruction and honors visible mute controls", async ({
  page,
}) => {
  await installSpeechStub(page);
  await startMileage(page);
  await page.getByRole("button", { name: "Read current instruction aloud" }).click();
  await expect.poll(() => lastSpoken(page)).toContain("Set starting point");

  await page.getByRole("button", { name: "Mute voice" }).click();
  await expect(page.getByText("Voice muted", { exact: true }).first()).toBeVisible();
  const spokenBefore = await lastSpoken(page);
  await page.getByRole("button", { name: "Read current instruction aloud" }).click();
  await expect(page.getByText("Voice is muted. Unmute voice to hear this message.")).toBeVisible();
  expect(await lastSpoken(page)).toBe(spokenBefore);
  await page.getByRole("button", { name: "Unmute voice" }).click();
});

test("speech-unavailable browsers keep visible guidance and explain the fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: undefined,
      configurable: true,
    });
  });
  await startMileage(page);
  await expect(page.getByText(/Set starting point/).first()).toBeVisible();
  await page.getByRole("button", { name: "Read current instruction aloud" }).click();
  await expect(page.getByText("Speech output is unavailable in this browser.")).toBeVisible();
});

test("repair warnings have grounded speech output", async ({ page }) => {
  await installSpeechStub(page);
  await startMileage(page);
  await fillMileage(page);
  await page.getByRole("button", { name: "Simulate Portal v2" }).click();
  await expect(page.getByText("PORTAL CHANGE DETECTED", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Read repair warning aloud" }).click();
  await expect.poll(() => lastSpoken(page)).toContain("Portal change detected");
  expect(await lastSpoken(page)).toContain("vehicleType");
  await expect(page.getByText("New required input · vehicleType")).toBeVisible();
});

test("human approval summaries read facts without triggering submission", async ({ page }) => {
  await installSpeechStub(page);
  await startMileage(page);
  await fillMileage(page);
  await page.getByRole("button", { name: "Prepare mileage for review" }).click();
  await page.getByRole("button", { name: "Read approval summary aloud" }).click();
  await expect.poll(() => lastSpoken(page)).toContain("Human approval required");
  expect(await lastSpoken(page)).toContain("$12.06");
  await expect(page.getByText("VERIFIED COMPLETION")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Confirm and submit reimbursement" }),
  ).toBeVisible();
});
