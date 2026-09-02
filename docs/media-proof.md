# README WebMCP capture provenance

`webmcp-invocation.gif` and `webmcp-invocation-live.jpg` were captured from the permanent Cloudflare deployment on September 2, 2026 in ChatGPT's in-app browser.

The GIF is a seven-frame sequence from one guest session. Mutations were invoked through the page's native WebMCP capability, not through the application's HTTP command endpoint:

1. Reset state with the diagnostics panel open.
2. `get_app_context` inspects the authoritative state.
3. `create_journey` starts the recorded expense journey in Do It For Me mode.
4. `create_expense_draft` writes the receipt date and amount.
5. `update_expense_draft` selects Project Atlas.
6. `update_expense_draft` selects Client meal.
7. `prepare_expense_submission` stops at the visible human-only boundary.

Each frame shows both sides of the shared surface: the portal fields on the left and the WebMCP diagnostics on the right. The diagnostics identify the registered tools, last command, result, operation ID, sent revision, returned revision, and verification status. The final tool prepares a one-time confirmation but cannot submit the expense.

The source frames are retained in `docs/assets/webmcp-capture/`. The GIF was generated from them with:

```bash
ffmpeg -framerate 1 -i docs/assets/webmcp-capture/%02d.jpg \
  -vf "scale=960:540:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=160:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" \
  -loop 0 docs/assets/webmcp-invocation.gif
```
