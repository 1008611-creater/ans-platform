---
name: sd2-video-generation
description: name: sd2-video-generation
---

---
name: sd2-video-generation
description: Primary router and workflow for AI video generation with Seedance2 / SD2 on StoReel Canvas. Use whenever the user asks to generate, continue, extend, remake, batch, or finish AI videos; create image-to-video or reference-video clips; write SD2 video prompts; bind first frames, character references, product references, or previous video references; poll tasks, write results back to canvas, save local deliverables, or switch StoReel accounts when quota/points are exhausted.
---

# SD2 Video Generation

## Overview

Use this as the main Seedance2 / SD2 video-generation skill. It owns the end-to-end workflow: script and prompt writing, reference selection, StoReel Canvas node preparation, task submission, polling, project writeback, local archiving, and account rotation when quota is exhausted.

Keep Seedance2 calls inside StoReel Canvas unless the user explicitly replaces the channel. Do not use this skill for generic image generation unless the image is needed as a video first frame or reference asset.

## Routing

- Trigger this skill for AI video generation requests, including Chinese phrases that mean: make video, generate video, AI video, SD2, Seedance2, image-to-video, reference-to-video, first frame, continuation, extension, batch generation, finish all videos, switch account, quota exhausted.
- If the task is only logging into StoReel, opening a canvas, or inspecting a project without generating video, the lower-level `storeel-seedance2-canvas` skill can be used.
- If both skills apply, use this skill first as the orchestrator, then use `storeel-seedance2-canvas` for page-specific details.

## External Seedance2 Channels

Navos route note: when user asks for Navos or method 4, use `navos-seedance2-channel`.

If the user explicitly asks to use one of the learned external Seedance2 VIP channels, read `references/seedance2-vip-channel-index.md` first. Treat it as a safe channel inventory, not permission to use refund loops, trial farming, disposable-email mass registration, or platform-limit evasion.

## Core Workflow

1. Inspect the current project before changing anything. Fetch `/api/v1/projects/<projectId>` and summarize images, videos, `sourceIds`, model IDs, durations, statuses, and existing `mediaGenerationId`s.
2. Preserve successful video nodes. Never regenerate a successful clip unless the user asks for a remake.
3. Write or repair the video script first. A usable SD2 clip prompt must include: reference roles, continuity target, camera movement, subject action, product/detail locks, duration, ratio, style, and negative constraints.
4. Bind references explicitly:
   - First-frame or scene image first for composition.
   - Character/person reference second for identity and costume.
   - Product reference third for product structure.
   - Previous video reference first when making a continuation clip.
5. Create or update the canvas video node with `type: "video"`, `videoModel` set to Seedance2 VIP when available, `dynamicOptions`, `promptText`, `richPrompt`, and `generatedFrom.sourceIds`.
6. Submit one video generation task at a time unless the account clearly supports concurrency. Treat `AI_CONCURRENCY_LIMIT` / HTTP 429 as "wait and poll", not quota exhaustion.
7. Poll `/api/v1/ai/query?taskId=<id>` until `completed`, `failed`, or timeout. Do not submit duplicates while a task is pending.
8. On completion, write `src`, `thumbnail`, `status: "success"`, `duration`, `mediaGenerationId`, `versions`, and `currentVersionId` back to the project.
9. Save the MP4 and the prompt/script locally under the user's active project output folder. In this thread, use the existing `StoReel_Seedance2` result folder under the user's Pictures project directory.
10. Final-check the project via API and report task ID, video URL, local file path, and any unfinished tasks.

## Standard Settings

- Model: Seedance 2.0 VIP when available. Known StoReel template ID from this project: `d3aa8427-e2fa-4f4e-ae44-a3643f659df8`.
- Ratio: `9:16` unless the user requests another format.
- Resolution: `720p` unless the user requests higher quality and the account supports it.
- FPS: `24`.
- Duration: use the user's requested duration; otherwise keep the project/shot pattern. Do not silently shorten an 8s request to 5s.
- Voice: keep existing project convention unless the user asks for audio changes.

## Prompt Requirements

Use Chinese prompts by default for this user's StoReel workflow.

A complete SD2 prompt should follow this structure. The generated prompt content itself should be Chinese unless the user asks otherwise:

```text
@[previous video or first-frame image] @[character reference] @[product reference]
Use the previous video or first frame as the motion/first-frame/composition anchor.
Use the character reference to lock identity, hair, outfit, and expression.
Use the product reference to lock product structure, material, color, and key details.

[duration, ratio, single-shot or edit structure]
[camera start point and movement]
[subject action and how it continues from previous clip or first frame]
[how the product becomes the visual focus]
[environment, lighting, visual texture]
[negative constraints]
```

For shoe/product videos, explicitly lock:

- Product silhouette and construction.
- Color accents and hardware.
- Logo/metal position if visible.
- Reflection/contact with ground when relevant.
- "Do not turn into a generic product" negative instruction.

## Continuation Clips

When the user asks to continue or extend a clip:

- Use the previous video as `referenceVideos` when possible.
- Also include the nearest first-frame/scene image and the character/product reference images as `referenceImages`.
- Start the Chinese prompt with the meaning of: continue from the last action of the previous clip; no jump cut; do not change scene; do not change character.
- Use the previous clip's direction, camera height, lighting, and action as continuity anchors.
- Add a new video node near the previous node and connect edges from the previous video and relevant references.

## Account Rotation

Do not store plaintext passwords in this skill or any generated skill file. Use credentials supplied in the current conversation or local environment variables.

Known next fallback email for this user:

```text
1453637677@qq.com
```

Password source priority:

1. Current user message or active thread context.
2. Environment variable `STOREEL_SD2_PASSWORD`.
3. Environment variable `STOREEL_SD2_ACCOUNTS_JSON` as an array of objects with `email` and `password` fields.
4. Ask the user for the next account/password if no safe credential source is available.

Switch accounts only when the current account is actually out of usable quota/points or blocked from generation. Do not switch for normal pending queues or concurrency limits.

Signals that justify switching:

- `INSUFFICIENT_POINTS`, `NO_POINTS`, `QUOTA_EXCEEDED`, `CREDIT`, `BALANCE`, `VIP_REQUIRED`, or equivalent Chinese quota/points errors.
- HTTP 402 or 403 with a quota/points/paywall reason.
- A generation endpoint response that clearly says the account cannot generate more videos.

Signals that do not justify switching:

- `AI_CONCURRENCY_LIMIT` or HTTP 429: wait for current task to finish.
- `pending`: keep polling.
- Network timeouts: retry the query/generation request.

When switching:

1. Save the current project state and local output paths.
2. Log out or clear StoReel token/localStorage, then log in with the next account.
3. Try opening the same project URL. If inaccessible, create a new free-canvas project and recreate only the needed references/nodes for the next clip.
4. Continue with the same prompt, references, and local archive naming.
5. Report which account email was used, but never print the password.

## Local Deliverables

Save generated videos and scripts under the user's active project output folder. For this thread, that folder is the existing StoReel Seedance2 result folder under `C:\Users\lsb\Pictures`.

Use descriptive names:

```text
S02_continuation_8s_product_sculpture_<taskId>.mp4
S02_continuation_8s_script.md
```

## References

Read `references/storeel-api-notes.md` when implementing or debugging direct StoReel API calls, task polling, node writeback, or account rotation.

## Current Account / New Account Provenance Gate
- If the user says a clip must be generated on a new account, first 15s video, current account, or newly logged-in canvas, do not use existing videos from older projects/accounts. Treat old-account videos as reference or rejected material only.
- Each generated clip used downstream must carry provenance: provider/channel, account proof masked enough to avoid credentials, project/canvas URL, task ID or mediaGenerationId, generation timestamp, model, duration, resolution, sourceIds/reference IDs, local file path, and sha256.
- A downloaded MP4 is not acceptable solely because it appears in the browser or was found in performance/media URLs. It must match the current requested account/project/task and the intended shot.
- If provenance is missing or mismatched, set status to `blocked_wrong_or_unproven_account` and continue generating on the correct account instead of delivering the stale clip.

## Voice/Subtitles Output Gate
- When the user requires Seedance2/provider-synchronized voice/audio, the audio/dialogue must come from the provider generation task or the provider-native audio workflow. Do not add local TTS, synthetic narration, music, or post voiceover and call it Seedance2 output.
- When the user says subtitles are not needed or must not be post-added, do not burn subtitles into MP4. Keep subtitle/script files separate only if useful for planning.
- Do not use post captions or local audio to compensate for a silent model output. If synced audio is required and the provider cannot generate it, mark the clip blocked with the specific audio capability issue.
- "No fake text" is not the same as "no text at all": verified real UI text, explicitly requested post-edit title/CTA, or source-true brand text may be allowed. Random generated letters, fake prices, fake specs, fake dealership names, or fake plate numbers must fail QA.
- For car-commerce clips that ask for realistic handheld review value, a faceless hand or phone-held camera motion is allowed when requested. A talking-head presenter, digital avatar, visible host face, or unrelated person remains disallowed for no-host/no-face deliveries.
