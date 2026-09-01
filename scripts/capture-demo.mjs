import { chromium } from "@playwright/test";
import { mkdir, readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const baseURL = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:5173";
const outputDir = path.resolve("docs/assets/capture");
const gifPath = path.resolve("docs/assets/interaction-preview.gif");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 810 },
  recordVideo: { dir: outputDir, size: { width: 1440, height: 810 } },
  reducedMotion: "no-preference",
});
const page = await context.newPage();

const pause = (milliseconds) => page.waitForTimeout(milliseconds);
const click = async (role, name) => {
  await page.getByRole(role, { name }).click();
  await pause(650);
};

await page.goto(baseURL, { waitUntil: "networkidle" });
await pause(1800);
await click("button", "Run the expense journey");
await page.getByRole("button", { name: "Start shared journey" }).waitFor();
await pause(1200);

await click("radio", /Show me/);
await click("button", "Start shared journey");
await click("button", "Highlight this step");
await pause(1200);
await click("button", "Use Aug 31, 2026");
await click("button", "Use $86.00");
await click("radio", /Do it with me/);
await click("button", "Choose Project Atlas");
await click("button", "Choose Client meal");
await click("radio", /Do it for me/);
await click("button", "Prepare for my review");
await pause(1600);
await click("button", "Confirm and submit expense");
await page.getByText("VERIFIED COMPLETION").waitFor();
await pause(1800);

await click("button", "Reset");
await page.getByRole("button", { name: "Start shared journey" }).waitFor();
await click("button", "Start shared journey");
await click("button", "Simulate Portal v2");
await page.getByText("PORTAL CHANGE DETECTED").waitFor();
await pause(1500);

await page.evaluate(async () => {
  const sessionId = sessionStorage.getItem("pave.session.v1");
  if (!sessionId) throw new Error("Capture session is missing.");
  const current = await fetch(`/api/sessions/${sessionId}`).then((response) => response.json());
  const response = await fetch(`/api/sessions/${sessionId}/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationId: crypto.randomUUID(),
      expectedRevision: current.snapshot.revision,
      actor: { kind: "agent", surface: "webmcp" },
      sentAt: new Date().toISOString(),
      command: {
        type: "ProposeRepair",
        businessPurpose: "Client dinner after Project Atlas workshop",
      },
    }),
  });
  if (!response.ok) throw new Error(`Repair proposal failed (${response.status}).`);
});
await page.reload({ waitUntil: "networkidle" });
await page.getByText("REPAIR PROPOSAL").waitFor();
await pause(1700);
await click("button", "Approve material repair");
await pause(1800);

await context.close();
await browser.close();

const videos = (await readdir(outputDir)).filter((file) => file.endsWith(".webm"));
if (videos.length !== 1) throw new Error(`Expected one captured video, found ${videos.length}.`);
const videoPath = path.join(outputDir, videos[0]);
const filter =
  "fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle";
const result = spawnSync("ffmpeg", ["-y", "-i", videoPath, "-vf", filter, "-loop", "0", gifPath], {
  stdio: "inherit",
});
if (result.status !== 0) throw new Error("ffmpeg could not generate the README GIF.");

console.log(`Captured ${gifPath} from ${baseURL}`);
