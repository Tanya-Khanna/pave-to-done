import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const videoDir = path.join(root, "docs/video");
const renderDir = path.join(videoDir, "render");
const captureDir = path.join(root, "docs/assets/capture");
const outputPath = path.join(videoDir, "pave-to-done-demo.mp4");
const captionsPath = path.join(videoDir, "captions.srt");

const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`${command} failed with status ${result.status}.`);
  }
  return result.stdout.trim();
};

const probeDuration = (file) =>
  Number(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file,
    ]),
  );

const srtTime = (seconds) => {
  const milliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((milliseconds % 60_000) / 1000);
  const millis = milliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
    secs,
  ).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
};

const concatEntry = (file) => `file '${file.replaceAll("'", "'\\''")}'`;

await rm(renderDir, { recursive: true, force: true });
await mkdir(renderDir, { recursive: true });

const narration = await readFile(path.join(videoDir, "narration.txt"), "utf8");
const paragraphs = narration
  .trim()
  .split(/\n\s*\n/)
  .map((paragraph) => paragraph.replaceAll(/\s+/g, " ").trim());

const audioEntries = [];
const captionBlocks = [];
let audioCursor = 0;
const pauseDuration = 0.55;

const silencePath = path.join(renderDir, "silence.aiff");
run("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "anullsrc=r=22050:cl=mono",
  "-t",
  String(pauseDuration),
  "-c:a",
  "pcm_s16be",
  silencePath,
]);

for (const [index, paragraph] of paragraphs.entries()) {
  const partPath = path.join(renderDir, `narration-${String(index).padStart(2, "0")}.aiff`);
  run("say", ["-v", "Samantha", "-r", "155", "-o", partPath, paragraph]);
  const duration = probeDuration(partPath);
  const start = audioCursor;
  const end = start + duration;
  const captionText = paragraph
    .replaceAll("pave to done", "pave.to(done)")
    .replaceAll("Web M C P", "WebMCP");
  captionBlocks.push(`${index + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${captionText}\n`);
  audioEntries.push(concatEntry(partPath));
  audioCursor = end;
  if (index < paragraphs.length - 1) {
    audioEntries.push(concatEntry(silencePath));
    audioCursor += pauseDuration;
  }
}

const audioListPath = path.join(renderDir, "audio-concat.txt");
await writeFile(audioListPath, `${audioEntries.join("\n")}\n`);
await writeFile(captionsPath, `${captionBlocks.join("\n")}\n`);
const narrationPath = path.join(videoDir, "narration.m4a");
run("ffmpeg", [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  audioListPath,
  "-c:a",
  "aac",
  "-b:a",
  "160k",
  narrationPath,
]);

const captures = (await readdir(captureDir)).filter((file) => file.endsWith(".webm"));
if (captures.length !== 1) {
  throw new Error("Run `CAPTURE_BASE_URL=<deployment> npm run capture:demo` before rendering.");
}
const capturePath = path.join(captureDir, captures[0]);
const coverPath = path.join(renderDir, "deployed-landing.jpg");
run("ffmpeg", ["-y", "-ss", "1", "-i", capturePath, "-frames:v", "1", "-q:v", "2", coverPath]);

const scenes = [
  { file: coverPath, duration: 16, kind: "image" },
  { file: capturePath, start: 6, duration: 21, kind: "video" },
  ...(await readdir(path.join(root, "docs/assets/webmcp-capture")))
    .filter((file) => file.endsWith(".jpg"))
    .sort()
    .map((file) => ({
      file: path.join(root, "docs/assets/webmcp-capture", file),
      duration: 4,
      kind: "image",
    })),
  ...(await readdir(path.join(videoDir, "healing-frames")))
    .filter((file) => file.endsWith(".jpg"))
    .sort()
    .map((file) => ({
      file: path.join(videoDir, "healing-frames", file),
      duration: 9,
      kind: "image",
    })),
  ...(await readdir(path.join(videoDir, "mileage-frames")))
    .filter((file) => file.endsWith(".jpg"))
    .sort()
    .map((file) => ({
      file: path.join(videoDir, "mileage-frames", file),
      duration: 8,
      kind: "image",
    })),
  { file: path.join(root, "docs/assets/architecture-preview.png"), duration: 12, kind: "image" },
  { file: coverPath, duration: 20, kind: "image" },
];

const videoEntries = [];
for (const [index, scene] of scenes.entries()) {
  const scenePath = path.join(renderDir, `scene-${String(index).padStart(2, "0")}.mp4`);
  const inputArgs =
    scene.kind === "image"
      ? ["-loop", "1", "-i", scene.file]
      : ["-ss", String(scene.start ?? 0), "-i", scene.file];
  run("ffmpeg", [
    "-y",
    ...inputArgs,
    "-t",
    String(scene.duration),
    "-vf",
    "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x090b0a,fps=30,format=yuv420p",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "19",
    "-movflags",
    "+faststart",
    scenePath,
  ]);
  videoEntries.push(concatEntry(scenePath));
}

const videoListPath = path.join(renderDir, "video-concat.txt");
await writeFile(videoListPath, `${videoEntries.join("\n")}\n`);
const visualsPath = path.join(renderDir, "visuals.mp4");
run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", videoListPath, "-c", "copy", visualsPath]);

run("ffmpeg", [
  "-y",
  "-i",
  visualsPath,
  "-i",
  narrationPath,
  "-i",
  captionsPath,
  "-map",
  "0:v:0",
  "-map",
  "1:a:0",
  "-map",
  "2:0",
  "-c:v",
  "copy",
  "-c:a",
  "copy",
  "-c:s",
  "mov_text",
  "-shortest",
  "-movflags",
  "+faststart",
  "-metadata",
  "title=pave.to(done) — WebMCP demo",
  outputPath,
]);

const finalDuration = probeDuration(outputPath);
if (finalDuration >= 180)
  throw new Error(`Rendered video is ${finalDuration}s; it must stay under 180s.`);

console.log(
  JSON.stringify(
    {
      output: outputPath,
      durationSeconds: Number(finalDuration.toFixed(2)),
      narrationSeconds: Number(probeDuration(narrationPath).toFixed(2)),
      captions: captionsPath,
      scenes: scenes.length,
    },
    null,
    2,
  ),
);
