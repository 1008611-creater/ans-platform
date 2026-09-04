---
name: runninghub-image2-image
description: name: runninghub-image2-image
---

---
name: runninghub-image2-image
description: Generate or edit images from one or more reference image URLs with the RunningHub Image G 2.0 / GPT-Image-2 low-price image-to-image channel only. Use when Codex should submit, poll, and download RunningHub Image2 low-price image-to-image jobs using RUNNINGHUB_API_KEY for restyling, product image edits, IP character refinement, or reference-guided ad visuals.
---

## 冠军入口

先应用 [`runninghub-workflow-api`](../runninghub-workflow-api/SKILL.md) 的上传、消费级 Key、幂等、结算和网站回传规则；本 Skill 只维护 Image G 图生图的输入与输出契约。

## 硬性提示词语言规则

- 本 skill 产出的所有提示词、负向词、镜头生成指令、图像/视频模型 prompt，默认必须用中文撰写。
- 只有用户明确要求英文，或目标平台/API 的固定字段、参数名、模型保留词必须使用英文时，才保留英文；场景、动作、构图、质感、限制条件仍用中文。
- 不要先写英文提示词再附中文翻译；直接输出中文提示词。

# RunningHub Image2 Image

Use this skill to call RunningHub Image G 2.0 image-to-image low-price channel only.

## Credentials

Read `RUNNINGHUB_API_KEY` from the current environment or from a `.env` file in the current working directory or one of its parents.

The helper scripts prefer the nearest project `.env` value for `RUNNINGHUB_API_KEY` over a stale process/global environment value. This avoids accidentally submitting with an old key.

Never place the API key in prompts, generated docs, screenshots, or final answers.

## Endpoint Policy

Only use the low-price channel. Do not use official or standard model endpoints for Image2 generation unless the user explicitly changes this policy in a later request.

## Prompt Language Policy

For Chinese livestream, e-commerce, portrait, IP character, and product-ad image work, write prompts in Chinese by default unless the user explicitly requests another language. Prefer concise, guiding language that tells Image2 the intended role, composition, constraints, and visual direction. Do not over-describe every object or texture when reference images already provide strong visual information; let Image2 use the references for identity, design judgment, and realism.

Do not put production notes such as `用途：` in the model-facing prompt. Keep purpose in filenames or project notes. Do not add a standalone `限制：` block; fold negative constraints naturally into visual quality and scene description.

## Default Clean Quality Suffix

For premium Image2 assets, scenes, first frames, story/reference images, and reference-guided edits, append this at the end of the prompt unless the user explicitly asks for grainy film, dirty texture, lo-fi, glitch, or rough documentary texture:

```text
超高细节，徕卡画质，保持所有元素材质；smooth shading, soft lighting, controlled details, minimal texture, high clarity, refined edges, smooth gradients --- no noise, grain, artifacts, high frequency detail, dirty texture, oversharpen, blotchy, chaotic details.
```

If the image still looks noisy or chaotic, reduce the prompt to one main scene, one camera angle, fewer characters, no text, no labels, no collage, and no storyboard layout before retrying. In image-to-image work, keep the suffix after the reference-role instructions so the model preserves reference identity and then cleans the rendering.

## Resolution Policy

When using this skill to generate images, default to `2k` resolution unless the user explicitly asks for `1k` or `4k`. Dry-runs, submitted jobs, and helper-script commands should all use `2k` by default.

```text
POST /openapi/v2/rhart-image-g-2/image-to-image
```

The task result query endpoint is:

```text
POST /openapi/v2/query
```

Local reference upload endpoint:

```text
POST /openapi/v2/media/upload/binary
```

The helper script supports `--image-file` and `--image-files-file`; it uploads local files first, then inserts the returned `download_url` values into `imageUrls`.

The low-price AI app API detail previously used for reference is:

```text
https://www.runninghub.cn/call-api/api-detail/2046503667076751361
```

## Scripts

The v2 endpoint expects public image URLs in `imageUrls`. If the user provides a local file path, first upload it through RunningHub media upload and use the returned `download_url`; do not pass `file://` paths.

Dry-run first:

```powershell
C:\Users\lsb\anaconda3\python.exe C:\Users\lsb\.codex\skills\runninghub-image2-image\scripts\runninghub_image2_image.py --prompt-file .\prompt.txt --image-url "https://example.com/reference.png" --aspect-ratio 9:16 --dry-run
```

Dry-run with local references validates paths, hashes and the stage contract locally. It deliberately does not upload media or create signed URLs:

```powershell
C:\Users\lsb\anaconda3\python.exe C:\Users\lsb\.codex\skills\runninghub-image2-image\scripts\runninghub_image2_image.py --prompt-file .\prompt.txt --image-file "C:\path\template.png" --image-file "C:\path\product.jpg" --aspect-ratio 9:16 --dry-run
```

Submit and wait:

```powershell
C:\Users\lsb\anaconda3\python.exe C:\Users\lsb\.codex\skills\runninghub-image2-image\scripts\runninghub_image2_image.py --prompt-file .\prompt.txt --image-url "https://example.com/reference.png" --aspect-ratio 9:16 --wait --download-dir .\outputs
```

Recover existing tasks without creating new generations:

```powershell
C:\Users\lsb\anaconda3\python.exe C:\Users\lsb\.codex\skills\runninghub-image2-image\scripts\runninghub_query_tasks.py --task-id "2050211533166088194" --download-dir .\outputs\recovered
```

Useful options:

- `--prompt "..."` or `--prompt-file path`.
- `--image-url URL`; repeat it for multiple references.
- `--image-urls-file path` with one URL per line.
- `--image-file path`; repeat it for local references. The script uploads each local file to RunningHub media and uses the returned `download_url`.
- `--image-files-file path` with one local reference image path per line.
- `--aspect-ratio 9:16`, `1:1`, `16:9`, etc.
- `--resolution 1k|2k|4k`; default is `2k`.
- `--base-url https://www.runninghub.cn` default; switch to `.ai` if needed.
- `--dry-run` prints a local simulated payload without charging or uploading local media.

## Failure Recovery Rules

Network errors can happen after RunningHub has already accepted a task. An SSL EOF, connection reset, timeout, or local download failure does not prove that the generation failed.

When a submit/wait call errors after a non-dry-run attempt:

1. Do not blindly submit the same prompt again.
2. Check RunningHub call records for any new task IDs created around that time.
3. Use `runninghub_query_tasks.py` to query and download those task IDs.
4. Retry generation only after confirming no task was created or after the user explicitly wants another variant.

`QUEUED`, `RUNNING`, empty `failedReason: {}`, and a response that merely contains the field name `failedReason` are not failure states. Treat them as in-progress and keep polling or recover by task id. Only explicit provider failed/error/rejected/cancelled status, non-empty error code/message, non-empty failedReason, or configured fail-fast code should stop polling.

If RunningHub returns error `1014`, check key source first. A stale global `RUNNINGHUB_API_KEY` can override the intended project key in ad hoc commands. The helper scripts now prefer the nearest `.env`, but manually written commands should still avoid setting a conflicting `$env:RUNNINGHUB_API_KEY`.

If RunningHub returns error `1007` saying `tools` does not include `image_generation`: treat as RH backend/route validation failure when the dry-run or submit log already proves `payload.tools` contains `image_generation`. Do not keep polling or repeatedly resubmit. Stop immediately, preserve the taskId and submit log, then switch to local post-processing or another image channel unless user explicitly asks to retry RH.

For speed-sensitive production, use the helper's default fail-fast behavior for `1007`; do not wait the full timeout after a provider-side failed status is visible.

## RH Production Script Safety

For any RH Image2 production run that creates or modifies a Python runner script:

1. Do not patch multi-line Python with PowerShell `-replace`, escaped `\n`, or string-built script surgery. Use `apply_patch` for small edits, or regenerate the whole script from a reviewed source.
2. Before any real `submit`, `query`, or `download` call, run:

```powershell
C:\Users\lsb\anaconda3\python.exe -m py_compile <runner_script.py>
```

3. If `py_compile` fails, stop before provider execution. Fix the runner first; do not call RH while the local runner is syntactically invalid.
4. Use explicit Anaconda Python for production commands:

```powershell
C:\Users\lsb\anaconda3\python.exe <script.py>
```

5. Keep a local execution log showing the compile check result before provider submission.

## Workflow

1. Decide whether the reference image is strong enough for image-to-image. Weak logo-only references usually belong in text-to-image prompt exploration.
2. Use public reference image URLs, or local references through `--image-file` so the script uploads them to RunningHub media first.
3. Run `--dry-run`; it performs only local contract validation and never uploads media or submits an image task.
4. Submit with `--wait --download-dir`.
5. If the submit or wait phase errors, recover existing task IDs before retrying.
6. 使用 `--wait --download-dir` 完成下载时，执行器会在下载目录写入 `asset_download_receipt.json`：包含 `task_id`、资产阶段、实际提示词及 SHA、精确本地路径、文件 SHA-256、字节数、宽高和文件 QA；Harness 必须消费该回执，不能以任务成功或下载链接替代。

## 人物角色设定卡阶段合同（S-011）

当当前资产是短剧最终人物角色设定卡时，必须调用脚本的 `--asset-stage character_sheet`，并且只上传一个已通过 QA 的身份母图：`--image-file <identity-master>`、`--parent-sha256 <sha>`、`--parent-upload-receipt <non-secret-receipt.json>` 缺一不可。脚本先在本地验证母图路径、SHA 和回执，再允许上传或付费提交；dry-run 必须显示同一母图的本地路径、SHA 和本地 `dry-run://` 占位参考，不上传媒体；正式结果必须用 `--result-json` 保存实际上传/提交/下载回执。缺少母图、SHA 或回执时脚本必须在任何上传及付费提交前失败。单人母图、原片帧、Word 预览和故事板图不能伪装为最终角色卡参考。

首帧与故事板提交必须分别显式传 `--asset-stage first_frame` 与 `--asset-stage storyboard`；它们的参考图只可来自 Harness 导出的最终资产精确原图路径/SHA，不能从 Word、母图库、原片人物帧或历史下载目录取图。

## 展示面图片系统参考法

When user asks for 男生展示面、女生展示面、客户展示面、展示面替换、头像/朋友圈展示图:

1. Use image-to-image, not text-to-image, unless the user explicitly changes channel.
2. Use exactly two roles by default:
- 参考图A：客户脸部裁切总参考图，只负责身份、人脸结构、五官比例、肤色、年龄感、发型方向。
- 参考图B：模板图，只负责身体、姿势、服装、场景、构图、镜头距离、光线、画幅、照片质感。
3. Keep `imageUrls` order A then B. Dry-run must prove both URLs are present before paid submit.
4. Prompt must say A does not provide clothes, shoulders, background, lighting, color tone, body pose, props, or camera angle. This prevents customer-reference clothing/background contamination.
5. Do not mix multiple customer original photos plus template as equal references in production. Create one customer face-crop/master reference first.
5a. If a useful side-profile photo exists, crop it tightly and combine it with the front-face crop into one A1 identity master reference. Do not upload raw side-profile scene photo as another equal reference.
6. Do not pile long negative prompts. Use base template plus per-template slots: identity anchor, template anchor, light beautification, one or two aesthetic fixes, at most three avoid items.
7. If clothes or background from A appear in output, fix the face-crop reference and prompt role binding before retrying.
8. If face is wrong after verified two-reference payload, stop treating it as a simple prompt issue and escalate channel/compositing choice.

Special height/body-ratio customers use three roles:
- 参考图A1：客户脸部裁切总参考图，只负责身份、人脸结构、五官比例、肤色、年龄感、发型方向。
- 参考图A2：客户全身比例参考图，应裁掉多余背景、文字、logo 和强色块；只负责身高、腿长、肩宽、头身比和整体体型比例。
- 参考图B：模板图，只负责身体姿势、服装、场景、构图、镜头距离、光线、画幅、照片质感。
- Keep `imageUrls` order A1, A2, B. Dry-run must prove all URLs are present before paid submit.
- Prompt must say A2 does not provide clothes, graduation gown, background, text, color tone, lighting, pose, or props.
- For customer02, height is 193cm; preserve tall body ratio, long legs, natural head-to-body proportion, and avoid making him shorter or ordinary-proportioned.
For this reusable system, closeout must distinguish local execution success from human aesthetic pass. `downloaded` means files exist and manifests parse; it does not mean the image is aesthetically accepted by the user.

### 展示面高效执行模式

For reusable 男生/女生展示面 production, do not run as a slow one-off:

1. Preheat before submit: reuse the fixed customer face-crop/master reference and any still-valid uploaded customer-reference URL; upload per-run template images with evidence.
2. Use explicit `C:\Users\lsb\anaconda3\python.exe`; run `py_compile` on any production runner before provider calls.
3. Default batch policy: submit all currently intended assets in the batch when the user asks for speed, batch generation, or says not to set an upper limit. Do not impose an artificial 2-3 asset cap. Only throttle first when there is a real provider rate-limit, account/quota/cost, or quality-control risk; state that reason before throttling.
4. Persist every `taskId` immediately after submit, before polling. Report `taskId` early when the user is waiting.
5. Poll/download independently per asset. Sync each finished image to `C:\Users\lsb\Pictures\男生展示面\成片\客户X` as soon as it is downloaded instead of waiting for the whole batch.
6. Only retry once when RunningHub explicitly returns provider failure such as content-safety rejection. For EOF, timeout, or local download interruption, query existing `taskId` first and do not blindly resubmit.
7. Post-coding-review/evidence closeout remains mandatory, but already downloaded preview images should be shown to the user before long closeout work.

## Verified Image-to-Image Rule

When the user is troubleshooting whether image-to-image was truly used, prove it before submitting: run `--dry-run` and verify the payload contains the intended `imageUrls`. Do not treat a text prompt that merely says "use the uploaded image" as verified image-to-image. For identity-sensitive edits, start with one strongest main reference image instead of mixing many references, because extra references can cause the model to redesign the face, clothing, logo, or scene.

## Identity-Critical Stop Rule

If a low-price image-to-image result changes the person's face, hairstyle, name badge, or brand logo after the reference URLs were verified, do not keep retrying the same low-price channel by default. Treat it as a channel-fidelity problem, not just a prompt problem. For exact identity/logo work, stop and propose one of two routes: (1) user explicitly authorizes the official-stable Image G 2 image-to-image endpoint, which RunningHub documents as the higher-fidelity channel, or (2) use a local compositing/post-processing workflow that preserves the original face and pastes the original logo asset exactly.

## Logo Fidelity Note

Image2 may redraw text and logos imperfectly. If the user needs a logo to remain exactly unchanged, use the logo as an image-to-image reference for composition, then prefer a post-processing step that pastes the original logo asset back onto the generated character's badge, tag, apron, or prop. Do not rely on prompt text alone to preserve exact Chinese/English logo lettering.
