# Demo video package

This folder contains the submission narration, reviewed captions, source frames captured from real WebMCP sessions, and the rendered draft video.

Render it after capturing the deployed product:

```bash
CAPTURE_BASE_URL=https://pave-to-done.north-raincoat.workers.dev npm run capture:demo
npm run render:video
```

The current draft is 2:21 at 1280×720. It contains H.264 video, mono AAC narration, and an embedded caption track; `captions.srt` is also ready for YouTube upload. Automated validation measured audible narration at -16.1 dB mean / -1.6 dB peak and found no black segment lasting 1.5 seconds.

The intended public upload must remain shorter than three minutes and use the exact submitted deployment. Before uploading, review the rendered MP4 for audio, legibility, honest cuts, and absence of notifications or private data. After upload, verify YouTube playback while logged out and add the public URL to `README.md`, `DEVPOST_SUBMISSION.md`, and the Devpost form.

The real WebMCP capture provenance is documented in `../media-proof.md`. The primary application footage comes from the checked-in deployed capture command; the WebMCP, repair, and on-demand frames were captured from ChatGPT's in-app browser while calling the native page tools.
