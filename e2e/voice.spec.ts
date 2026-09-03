import { expect, test, type Page } from "@playwright/test";
import { fillMileage, startMileage as startMileageTask } from "./journey-actions";

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

async function installRecognitionStub(page: Page, transcript: string) {
  await page.addInitScript((spokenQuestion) => {
    class FakeRecognition {
      lang = "";
      interimResults = false;
      maxAlternatives = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onresult:
        | ((event: { results: Record<number, Record<number, { transcript: string }>> }) => void)
        | null = null;
      start() {
        this.onstart?.();
        window.setTimeout(() => {
          this.onresult?.({ results: { 0: { 0: { transcript: spokenQuestion } } } });
          this.onend?.();
        }, 0);
      }
    }
    Object.defineProperty(window, "SpeechRecognition", {
      value: FakeRecognition,
      configurable: true,
    });
  }, transcript);
}

async function startMileage(page: Page) {
  await page.goto("/demo");
  await startMileageTask(page);
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
  await expect.poll(() => lastSpoken(page)).toContain("Set starting point");
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

test("speaking a task starts its matched journey without another click", async ({ page }) => {
  await installRecognitionStub(page, "Create a mileage reimbursement for an 18 mile trip");
  await page.goto("/demo");
  await page.getByRole("button", { name: "Speak the task" }).click();
  await expect(page.getByRole("heading", { name: "Mileage reimbursement" })).toBeVisible();
  await expect(page.getByText("Planned for this session", { exact: true }).first()).toBeVisible();
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

test("typed journey help points on demand and resumes without advancing", async ({ page }) => {
  await installSpeechStub(page);
  await startMileage(page);
  await page
    .getByRole("textbox", { name: "Journey question" })
    .fill("Where is the distance control?");
  await page.getByRole("button", { name: "Ask journey question", exact: true }).click();

  await expect(page.getByRole("status", { name: "Located mileage.distance" })).toBeVisible();
  await expect(page.getByText(/marked Set trip distance in amber/)).toBeVisible();
  await expect(page.getByText("STEP 01 / 07")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause journey" })).toBeVisible();
});

test("mid-session voice help pauses, answers, and resumes at the same step", async ({ page }) => {
  await installSpeechStub(page);
  await installRecognitionStub(page, "Why do I need this?");
  await startMileage(page);
  await page.getByRole("button", { name: "Ask while guiding" }).click();

  await expect(page.getByText("Choose where the reimbursable trip began.")).toBeVisible();
  await expect.poll(() => lastSpoken(page)).toContain("Choose where the reimbursable trip began");
  await expect(page.getByText("STEP 01 / 07")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause journey" })).toBeVisible();
  const events = await page.evaluate(async () => {
    const sessionId = sessionStorage.getItem("pave.session.v1")!;
    return fetch(`/api/sessions/${sessionId}/events`).then((response) => response.text());
  });
  expect(events).not.toContain("Why do I need this");
});
