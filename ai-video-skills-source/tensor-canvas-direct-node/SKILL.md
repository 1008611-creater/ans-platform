---
name: tensor-canvas-direct-node
description: name: tensor-canvas-direct-node
---

---
name: tensor-canvas-direct-node
description: Automate Tensor.art canvas video workflows by connecting to a logged-in Chrome session through CDP, uploading or binding verified local assets, creating or locating video nodes, writing model/capability/ratio/resolution/duration directly into the Tensor business canvas store, verifying persistence, submitting paid generation only when approved, and recording account/output provenance. Use when working with Tensor.art canvas, canvas.tensor.art, Tensor login/account switching, video node setup, Happy Horse 1.1, Seedance 2.0 Mini, or when UI clicking is too slow or desyncs from saved canvas state.
---

# 画布节点直写术

Use this skill to prepare Tensor.art canvas video nodes quickly and reliably. Prefer internal upload plus direct node parameter injection over slow manual UI clicking. Never click Generate or spend credits without explicit user approval.

## Owner Channel Status

- Tensor.Art / Tensor 渠道已由用户在 2026-07-03 明确停用。不要再把生产视频路由到 Tensor，不要继续 Tensor 账号轮换、画布配置、旧产物下载或旧结果复用。
- 只有用户在当前 turn 明确说“重新启用 Tensor.Art/Tensor”时，才允许恢复本 skill 的生产执行；恢复前必须同步更新渠道路由 skill、当前 run checkpoint、evidence log 和账号账本。
- 如果打开本 skill 时发现当前任务仍在 Tensor 画布或 Tensor 登录流程中，先停止并记录 `tensor_channel_disabled_by_owner`，再切换到非禁用渠道。

## Mandatory Default Path: Internal Upload + Direct Node Write

This section supersedes older UI-click fallback notes.

For production clips, do not manually switch screens, type prompts, or click model/ratio/duration controls one by one when the asset can be uploaded or bound directly.

Default path:

1. Use the current logged-in Tensor canvas account through CDP.
2. Resolve the verified local reference image/video asset.
3. Upload or bind the asset into the current canvas through the site's upload workflow or canvas data structures.
4. Create or locate the intended video node in canvas data.
5. Write prompt, reference/source IDs, model, capability, aspect ratio, resolution, and duration directly into the business canvas store.
6. Mirror the updated node into React Flow only for visible refresh.
7. Verify persistence from the business store, UI, and network save before spending credits.
8. Use UI only for the final paid Generate click, or as a labeled fallback when direct upload/node write is blocked.

If UI hand-clicking is used, the run evidence must record it as `ui_fallback`, including the reason direct upload or direct node write was unavailable. UI fallback must not become the default workflow.

## Operating Rules

- Use real Chrome when possible, not Codex in-app browser, because logged-in sessions, uploads, and canvas operations are more reliable there.
- Connect to an existing logged-in Chrome through CDP instead of launching a fresh profile. Fresh profiles may hit Cloudflare and lose the user's login.
- Keep one active Tensor canvas tab unless the user explicitly asks for more. Too many canvas tabs create state confusion.
- Treat the canvas as the execution surface, not a place to guess. Use only verified prompt text, verified reference images, and known model config values.
- Do not expose credentials, cookies, localStorage, tokens, mailbox codes, account secrets, signed media URL query strings, passwords, or verification links.
- Do not mark generated videos verified until the user or QA workflow verifies output quality.
- After downloading generated AI video, keep the system run artifact if one exists and copy the user-facing video into the user-requested output folder when one is specified.

## Chrome CDP Connection

Use Playwright against the user's existing Chrome remote debugging session:

```js
var { chromium } = await import("playwright");
var cdpBrowser = await chromium.connectOverCDP("http://127.0.0.1:9222");
var liveCtx = cdpBrowser.contexts()[0];
var livePage = liveCtx.pages().find(p => p.url().includes("canvas.tensor.art"))
  || liveCtx.pages().find(p => p.url().includes("tensor.art"));
```

If the default port is unavailable, probe known active CDP ports from the run context. Do not launch an anonymous browser for paid logged-in workflows unless the user explicitly requests it.

## Fast Login And Account Switching

Use this path when Tensor needs fresh login or the user wants account switching:

1. Start from Tensor, not the mailbox. Open `https://tensor.art/forge` and let Tensor decide whether login is required.
2. Prefer real Chrome over in-app browser. If default CDP is unavailable or Tensor times out, use the dedicated Chrome debugging port and proxy already established in the project context.
3. Keep one Tensor canvas tab and one mailbox tab only when needed.
4. For mailbox access, import only the target mailbox row. Never print, store, paste, or log account secrets, tokens, cookies, verification codes, or login URLs.
   - Account rotation dedupe is mailbox-first: check the run's `mailbox_usage_ledger.json` by lowercase email before selecting a mailbox.
   - Once a mailbox is used for login, quota probe, generation attempt, Cloudflare attempt, or output download, mark that email `attempted_do_not_reuse` or `used_do_not_reuse`; visible Tensor IDs are auxiliary only.
   - For quota-sensitive Happy Horse 1.1 production, use one mailbox for one 15s shot only. Upload only that shot's material on that account, generate/download/QA that one clip, then rotate to a fresh unused mailbox for the next 15s shot.
5. Tensor login mail may be a magic link inside an `about:srcdoc` iframe. Click the mailbox UI's login action directly; do not copy the link into logs.
6. Cloudflare or真人验证 is user-only. Stop and ask the user to pass it manually; do not try to bypass, solve, or simulate it.
7. After redirect, confirm the intended Tensor account by visible account/Energy state, then return to Forge/canvas.

## Canvas Store Principle

React Flow state alone is not authoritative on Tensor.art. Updating `window.__rfStore.getState().setNodes(nodes)` can appear to work and then revert.

Find and update the business canvas store instead. The useful Zustand-like store contains fields such as `canvasId`, `nodes`, `edges`, `dirty`, and methods such as `initialize` or `onNodesChange`. Cache it as `window.__canvasBizStore` when found.

After editing nodes:

```js
window.__canvasBizStore.setState({ nodes, dirty: true });
window.__rfStore?.getState?.().setNodes?.(nodes);
```

The business store is the source of truth; mirroring into React Flow is only for immediate UI refresh.

## Node Creation Pattern

Use internal upload and direct node mutation first:

1. Resolve verified local reference assets and upload or bind them into the current canvas without third-party substitutes.
2. Create or locate the intended image/video node in canvas data while preserving unrelated nodes, IDs, positions, edges, prompts, and uploaded assets.
3. Write prompt, reference/source IDs, model, capability, aspect ratio, resolution, and duration directly into the business canvas store.
4. Mirror the updated node into React Flow only for visible refresh.
5. Verify persistence from the business store, UI, and network save before spending credits.

Use UI only for actions safer through the interface, such as adding the initial Video node if no usable node exists or confirming the final paid Generate action. Avoid manual dropdown/slider/textbox setup unless direct store injection and internal upload are blocked.

When placing a visible node, convert screen coordinates to canvas coordinates using the current React Flow transform:

```js
const [tx, ty, z] = window.__rfStore.getState().transform;
const toCanvas = (sx, sy) => ({ x: (sx - tx) / z, y: (sy - ty) / z });
```

Update only the target node's video config. Preserve unrelated node fields, IDs, positions, edges, prompts, uploaded assets, and user work.

## Known Tensor Video Configs

Fetch current model metadata from:

`https://config.tensorartassets.com/tensor/canvas-workspace.json`

Known working configs:

```json
{
  "happyHorse11": {
    "model": "1010711179892370659",
    "videoCapability": "OMNI_REF2VIDEO",
    "aspectRatio": "9:16",
    "imageSize": "1080P",
    "videoDuration": 15
  },
  "seedance20Mini": {
    "model": "1014073603487977875",
    "videoCapability": "OMNI_REF2VIDEO",
    "aspectRatio": "9:16",
    "imageSize": "720p",
    "videoDuration": 10
  }
}
```

Important exact values:

- Happy Horse 1.1 uses `imageSize: "1080P"` with uppercase `P`. Writing `"1080p"` can make UI fall back to `720P`.
- Seedance 2.0 Mini uses `imageSize: "720p"` in config, though UI may display `720P`.
- Both known configs use `videoCapability: "OMNI_REF2VIDEO"` for all-purpose reference video.

## Shot Routing Rule

- Use Happy Horse 1.1 for shots longer than 10 seconds when the account has enough points: `9:16`, `1080P`, `15s`.
- Use Seedance 2.0 Mini for shots 10 seconds or shorter, or when points are limited: `9:16`, `720p`, shortest available duration if 5s is not exposed by the UI.
- Match the actual shot length, approved prompt, and verified reference assets before writing nodes.

## Verification Checklist

After internal upload and direct injection, verify all of the following before reporting success:

- The business store retains edited node values after waiting about 5 seconds.
- `window.__canvasBizStore.getState().dirty` returns to `false`, or the network log shows a successful save such as `/canvas/v1/canvas/update`.
- React Flow store and business store agree on the target node config.
- Clicking the node in UI shows the intended model, capability, aspect ratio, resolution, and duration.
- No Generate button was clicked and no paid credits were consumed unless the user explicitly approved generation.

## Common Failures And Fixes

- Many tabs open: close or ignore extras; operate on one confirmed canvas URL.
- UI dropdowns fight automation: stop hand clicking and patch the store directly.
- Wrong ratio after clicking: restore exact `aspectRatio: "9:16"` through the business store.
- Slider/state mismatch: write `videoDuration` directly and verify from UI.
- React Flow changes revert: update `__canvasBizStore`, then mirror `__rfStore`.
- Cloudflare/login friction in a new browser: connect to the user's existing Chrome session through CDP.

## Account And Output Provenance Hard Gate

- When the user asks for a new account, current account, or new canvas, every downloaded MP4 must be proven from the exact active account/canvas/session before use.
- Never reuse MP4 URLs, visible old video nodes, old successful nodes, or cached media URLs from older accounts/canvases as current production output.
- If account identity, canvas URL, node label, generation timestamp, provider result, local path, or sha256 cannot be tied to the requested account/canvas, mark the asset `blocked_wrong_or_unproven_account`.
- Before downloading video, record: active CDP port, canvas URL, visible masked account proof, node title, model, duration, resolution, reference/source IDs, download host without signed query secrets, download time, local path, and sha256.
- For account rotation, the canonical reuse ledger is mailbox/email based: record lowercase email and masked email in the run's `mailbox_usage_ledger.json`; treat old visible-account-only ledgers as legacy provenance, not as the primary reuse check.
- Do not record credentials, cookies, tokens, signed URL query secrets, passwords, mailbox codes, or verification links.
- If the canvas contains old successful videos and new pending nodes, do not infer old videos satisfy the current task. Submit or generate the required clip on the requested account/canvas, then download only that result.
- For no-host car videos, reject any visible talking-head, presenter face, digital avatar, office selfie, or unrelated person clip even if it is real provider output.
- For realistic car-review value, faceless first-person hand presence and handheld camera motion are allowed when the user asks for them.

## Subtitles And Voice Hard Gate

- If the requirement says Seedance2/provider must output synchronized audio/voice, do not add synthetic TTS, voiceover, narration, music, or lip/audio tracks in post, and do not describe post audio as provider-synced.
- If the requirement says no post subtitles, do not burn captions/subtitles into the MP4. Keep script and SRT files as planning/reference only unless the user explicitly requests post captions.
- Post-production text is allowed only when explicitly requested for the current deliverable. It must never hide missing provider-native dialogue/audio or make a non-dialogue clip look like synchronized talking/voice.
- "No fake text" is not the same as "no text at all." Verified real UI text, explicitly requested post-edit title/CTA, or source-true brand text may be allowed. Random generated letters, fake prices, fake specs, fake dealership names, or fake plate numbers are hard QA failures.
