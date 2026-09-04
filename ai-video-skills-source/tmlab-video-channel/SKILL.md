---
name: tmlab-video-channel
description: name: tmlab-video-channel
---

---
name: tmlab-video-channel
description: Operate TMLab AI video channel through canvas agent.tmlab.top and API preflight for real video generation. Use when user mentions TMLab, tmlab, agent.tmlab.top, api.tmlab.top, AI video main channel, canvas video generation, API video generation, upload/generate/poll/download, account quota, or provider evidence/ledger for TMLab.
---

# TMLab Video Channel

Use this channel only for real provider execution. Do not fake outputs, and do not mark generated clips verified before download, media probe, and content QA. Do not print passwords, tokens, cookies, refresh tokens, verification codes, QQ authorization codes, or raw Authorization headers.

## Channel Facts

- Canvas URL: `https://agent.tmlab.top`
- User-provided API base: `https://api.tmlab.top`
- Observed frontend API base on 2026-07-07: `https://agent.tmlab.top/agent/api`
- DNS note from 2026-07-07 discovery: `api.tmlab.top` returned NXDOMAIN through local DNS, Google DNS, AliDNS, and Cloudflare DNS. Verify DNS again before treating it as a live external API.
- Product name in UI: `Chuangjing AI` / `创境 AI`.
- Status: user-designated main video channel, alongside Mimo.
- Mode: canvas UI is confirmed reachable. API operation is viable after QQ login/auth is available and the endpoint contract is observed.

## Login And Auth

- Canvas login uses QQ.
- Login UI requires the service-terms checkbox before `QQ 登录`.
- QQ OAuth observed fields:
  - authorize host: `https://graph.qq.com/oauth2.0/authorize` / `show`
  - `client_id`: `102806785`
  - `scope`: `get_user_info`
  - redirect URI in frontend build: `http://ai.cybernomads.cn/qq-login-callback`
  - local callback route: `/agent/auth/callback/qq`
- Frontend callback posts to `POST /agent/api/auth/qq/callback` with QQ `code` and `state`; successful response stores `token` and optional `expireTime` in `localStorage`.
- Frontend request interceptor reads `localStorage.token` and sends it as the `Authorization` header value. Never print or store the value.
- Unauthenticated API response observed:
  - HTTP `401`
  - JSON shape: `{ "code": "auth.required", "reason": "...", "status": 401, "timestamp": "..." }`
- If QQ QR, password, phone approval, or verification appears, stop with `tmlab_login_required` and ask the user to complete it in the opened browser. Never relay QR payloads, auth codes, or tokens.

## Authenticated Readback 2026-07-07

Account-specific values are only a point-in-time readback; verify again before every real run.

- Authenticated API endpoints below returned HTTP `200` after user completed QQ login.
- Points readback for this login: `totalPoints=500`, `availablePoints=500`, `frozenPoints=0`.
- Text models from `/list_models`: `minimax-m3`, `deepseek-v4-pro`, `gpt-5.5-medium`, `qwen3-7-max`.
- `/list_tools?include_details=true` returned 28 tools, including 15 video tools.
- Recommended cheap Seedance preflight candidate when vertical short video is acceptable: `generate_videos_by_seedance_20_720p_scripted`, default `9:16`, `720p`, `5s`, priced 90 points/sec, 5-15 seconds, up to 9 reference images and 3 reference audios.

## Observed API Surface

All paths below are relative to the observed base `https://agent.tmlab.top/agent/api` unless a future verified external API base replaces it.

### Account And Quota

- `GET /auth/getUserInfo`
- `GET /points/summary`
- `GET /points/logs?page=1&pageSize=20&type=all`
- `GET /account/benefits`
- `GET /activities/new-user-free-trial/status`
- `POST /activities/new-user-free-trial/claim`
- `POST /activities/daily-check-in/claim`
- `POST /referrals/code`
- `POST /referrals/accept`
- `GET /referrals/invitees`

### Models And Tools

- `GET /list_models`
- `GET /list_tools`
- `GET /list_tools?include_details=true`
- `GET /model_config/revision`

Use these for model availability, video capability, pricing/cost readback, duration, aspect, resolution, and audio option discovery after login.

### Canvas

- `GET /canvases`
- `POST /canvases/bootstrap`
- `GET /canvases/{canvasId}`
- `PUT /canvases/{canvasId}`
- `PUT /canvases/{canvasId}/layout-context`
- `PATCH /canvases/{canvasId}/title`
- `DELETE /canvases/{canvasId}`
- `GET /canvas-resources/history`

### Upload And File

- `POST /upload_image`
- `POST /upload_audio`
- `POST /upload_video`
- `GET /file/{fileId}/origin`
- `GET /file/{fileId}/preview`
- `GET /file/{fileId}/metadata`
- `POST /material-assets/analyze-upload`
- `POST /material-assets/upload`

Upload endpoints use `multipart/form-data`; observed fields include `file` and optional `canvas_id`. Material upload additionally supports title/description/tag fields in the canvas asset library.

### Workspace Chat And Magic

- `GET /canvases/{canvasId}/sessions`
- `POST /canvases/{canvasId}/sessions`
- `GET /sessions/{sessionId}/turns`
- `GET /sessions/{sessionId}/run-status`
- `GET /sessions/{sessionId}/active-turn`
- `PATCH /sessions/{sessionId}/title`
- `POST /chat`
- `POST /magic/prepare`
- `POST /magic/execute`
- `POST /cancel/{sessionId}`

Observed `POST /chat` payload fields include `canvas_id`, `session_id`, `user_content`, `text_model`, `tool_list`, and optional `usage_metadata`.

### OpenPlane Canvas Execution

This appears to be the real canvas generation path. Treat submit as paid/provider execution unless the account/cost contract proves otherwise.

- `POST /openplane/canvases/{canvasId}/executions`
- `GET /openplane/canvases/{canvasId}/execution-snapshot`
- `POST /openplane/canvases/{canvasId}/executions/{runId}/pause`
- `POST /openplane/canvases/{canvasId}/execution-results/ack`

Observed execution submit payload fields include:

- `scope_type`: usually `node`
- `scope_id`: node id
- `session_id`: current session id
- `model_config_revision`: value from `/model_config/revision`
- `openplane_snapshot`: current canvas graph/document

## Video Tool Notes

Verify `/list_tools?include_details=true` before each run because pricing and availability may change.

- `generate_videos_by_seedance_20_720p_scripted`: Seedance 2.0 Pro low-cost, fixed `9:16`, fixed `720p`, 5-15s, 90 points/sec, up to 9 reference images and 3 reference audios.
- `generate_videos_by_seedance_20_fast_special_price_scripted`: Seedance 2.0 Fast external discount, text/image/video with audio reference, 4-15s, `480p` 90 points/sec, `720p` 120 points/sec.
- `generate_videos_by_seedance_20_pro_scripted`: Seedance 2.0 Pro stable, text/image video, up to 9 reference images, 4-15s, `480p` 160 points/sec, `720p` upscale 190 points/sec, `720p` native 330 points/sec.
- `generate_videos_by_seedance_20_mini_scripted`: Seedance 2.0 Mini stable, text/image video, up to 9 reference images, 4-15s, `480p` 100 points/sec, `720p` upscale 130 points/sec, `720p` native 200 points/sec.
- `generate_videos_by_happy_horse_11_scripted`: Happy Horse 1.1, text/image reference, up to 9 reference images, 3-15s, supports `720p` or `1080p`.
- `generate_videos_by_veo31_fast`: Veo 3.1 Fast, fixed 8s, `720p` 160 points or `1080p` 200 points, supports `16:9` and `9:16`, up to 3 reference images.
- `generate_videos_by_veo31_pro`: Veo 3.1 Pro, fixed 8s `720p`, 500 points, supports `16:9` and `9:16`.
- `generate_videos_by_seedance_20`: Volcano Seedance 2.0 Pro, 4-15s, `480p` 210 points/sec, `720p` 450 points/sec.
- `generate_videos_by_seedance_20_fast`: Volcano Seedance 2.0 Fast, 4-15s, `480p` 170 points/sec, `720p` 370 points/sec.
- `generate_videos_by_vidu_q3`: Vidu Q3, image/video, 1-7 reference images, 3-16s, `540p` 105 points/sec, `720p` 210 points/sec, `1080p` 260 points/sec.
- `generate_lip_sync_by_hedra`, `generate_talking_video_by_hailuo_avatar`, and Sora/Hailuo video tools also appeared in the video tool set; inspect live tool details before use.

## Required Preflight

Before any real submission:

1. Confirm input image, first frame, storyboard, audio, and prompt are approved and belong to the current run.
2. Confirm login state or API authentication without exposing secrets.
3. Confirm quota/credits/cost and write the cost gate into the run checkpoint.
4. Confirm model, duration, aspect ratio, resolution, audio/voice options, and whether TMLab supports multiple reference images for the selected model.
5. Confirm output folders for provider manifest, clips, QA frames/contact sheet, evidence events, and artifact ledger.
6. Stop before paid submission unless the user explicitly authorized the specific generation run.

## Default Params

- Aspect: `9:16` for Douyin/TikTok/short commerce video unless shot plan says otherwise.
- Resolution: provider default or `720P` minimum; record visible/API readback.
- Duration: source-matched redraw/remake work. Do not force 15s if source segment is shorter.
- Audio: follow project policy. If using native voice/audio, record whether TMLab generated or preserved audio.
- Model: do not assume Seedance2. Use `/list_models`, `/list_tools`, and UI readback to choose and record the exact provider/model.

## Execution Path

```text
approved inputs
-> TMLab login/API preflight
-> quota/cost readback
-> upload approved assets only
-> set model/duration/aspect/resolution/audio
-> read back settings
-> submit only after authorization
-> poll task/history/API status
-> download real video
-> ffprobe/media probe
-> visual/content QA
-> evidence_events + artifact_ledger + checkpoint
```

## Canvas/CDP Rules

- Use Playwright/CDP selectors over coordinate clicks.
- After uploading, read back visible material list. If old materials remain, stop with `tmlab_reference_mismatch`.
- If UI only supports manual staging, stage prompt/settings/assets and stop before final Generate when user approval is required.
- Screenshots and page previews are evidence only; they are not production video artifacts.

## API Rules

- Do not call paid or real-generation endpoints until endpoint contract, account, quota, and cost are observed.
- Store request/response manifests with secrets redacted.
- Required manifest fields: API base, endpoint, task/run id, asset hashes, prompt hash, submitted params, cost readback, status transitions, output URL, local output path, SHA256, ffprobe result, QA status.
- If API auth, upload, submit, poll, or download fails, write a blocker and do not silently switch providers.

## QA Rules

For a downloaded TMLab video:

- File exists and has non-zero plausible size.
- `ffprobe` reads a video stream and duration is close to expected.
- Audio stream is present if native audio/voice was requested.
- Visual QA checks product/vehicle identity, reference-image fidelity, no fake text, no wrong logo/plate, no unexpected people/faces, no body/wheel/interior deformation, and no watermark unless explicitly accepted.
- Final status remains `downloaded_not_verified` or `qa_failed_quality_issue` until content QA passes.

## Blockers

Use explicit blocker codes:

- `tmlab_login_required`
- `tmlab_api_auth_missing`
- `tmlab_quota_unknown`
- `tmlab_quota_insufficient`
- `tmlab_model_unavailable`
- `tmlab_upload_failed`
- `tmlab_reference_mismatch`
- `tmlab_generation_failed`
- `tmlab_download_failed`
- `tmlab_media_probe_failed`
- `tmlab_quality_failed`
