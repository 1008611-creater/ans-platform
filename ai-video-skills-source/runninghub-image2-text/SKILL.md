---
name: runninghub-image2-text
description: name: runninghub-image2-text
---

---
name: runninghub-image2-text
description: Generate images from text prompts with the RunningHub Image G 2.0 / GPT-Image-2 low-price text-to-image channel only. Use when Codex should submit, poll, and download RunningHub Image2 low-price text-to-image jobs using RUNNINGHUB_API_KEY for ad stills, IP character concepts, e-commerce visuals, posters, or prompt iteration.
---

## 冠军入口

先应用 [`runninghub-workflow-api`](../runninghub-workflow-api/SKILL.md) 的消费级 Key、幂等、结算和网站回传规则；本 Skill 只维护 Image G 文生图的输入与输出契约。

## 硬性提示词语言规则

- 本 skill 产出的所有提示词、负向词、镜头生成指令、图像/视频模型 prompt，默认必须用中文撰写。
- 只有用户明确要求英文，或目标平台/API 的固定字段、参数名、模型保留词必须使用英文时，才保留英文；场景、动作、构图、质感、限制条件仍用中文。
- 不要先写英文提示词再附中文翻译；直接输出中文提示词。

# RunningHub Image2 Text

Use this skill to call RunningHub Image G 2.0 text-to-image low-price channel only.

## Credentials

Read `RUNNINGHUB_API_KEY` from the current environment or from a `.env` file in the current working directory or one of its parents.

Never place the API key in prompts, generated docs, screenshots, or final answers.

## Endpoint Policy

Only use the low-price channel. Do not use official or standard model endpoints for Image2 generation unless the user explicitly changes this policy in a later request.

```text
POST /openapi/v2/rhart-image-g-2/text-to-image
```

The task result query endpoint is:

```text
POST /openapi/v2/query
```

## Script

On Windows, do not assume the shell command `python` exists or points to the
runtime that has the required libraries. Resolve the Codex bundled Python (or
an explicitly configured `CODEX_WORKSPACE_PYTHON`) first, then invoke its
absolute path. Do not mutate the user's global PATH as a production workaround.

Dry-run first to inspect the payload:

```powershell
python C:\Users\lsb\.codex\skills\runninghub-image2-text\scripts\runninghub_image2_text.py --prompt-file .\prompt.txt --aspect-ratio 9:16 --dry-run
```

Submit and wait for results:

```powershell
python C:\Users\lsb\.codex\skills\runninghub-image2-text\scripts\runninghub_image2_text.py --prompt-file .\prompt.txt --aspect-ratio 9:16 --resolution 2k --wait --download-dir .\outputs
```

Recover a task that has already been submitted, without a second paid request:

```powershell
<resolved-python> C:\Users\lsb\.codex\skills\runninghub-image2-text\scripts\runninghub_image2_text.py --resume-task-id <taskId> --wait --download-dir .\outputs --result-json .\provider_result.json
```

`--result-json` is a durable, non-secret receipt containing the submission or
resume task ID, final query response, result URLs, and downloaded local files.
If a submit receipt exists, the next action must be resume/query/download; it
must not make a new submission.

Useful options:

- `--prompt "..."` or `--prompt-file path`.
- `--aspect-ratio 9:16`, `1:1`, `16:9`, etc.
- `--resolution 1k|2k|4k`; default is `2k`.
- `--base-url https://www.runninghub.cn` default; switch to `.ai` if needed.
- `--dry-run` prints request payload without charging.

## Workflow

1. Prepare a single, complete prompt. Keep ad text as post-production text unless the exact text rendering is the goal.
2. Do not put production notes such as `用途：` in the model-facing prompt. Keep purpose in filenames or project notes.
3. Do not add a standalone `限制：` block. Fold negative constraints naturally into visual quality and scene description.
4. Select a quality suffix by asset type. Do not append a generic smoothing suffix to a human character board, narrative cast reference, or close character still: it suppresses the skin, hair, fabric, and small asymmetries that make a person believable. For those assets, use the human-realism suffix below and make the prompt itself state concrete light, camera, wardrobe, and identity evidence.
5. Run `--dry-run`.
6. Submit with `--wait --download-dir --result-json <job-local-result.json>`.
7. 使用 `--wait --download-dir` 完成下载时，执行器会在下载目录自动写入 `asset_download_receipt.json`：包含任务 ID、资产阶段、实际提示词及 SHA、精确本地路径、文件 SHA-256、字节数、宽高和文件 QA。Harness 必须将该回执登记到资产生命周期，不能仅记录任务成功、URL 或文件名。
8. Before declaring a result ready, open the downloaded image and verify its dimensions. A successful task ID alone is not a deliverable.

## 身份母图阶段合同（S-011）

短剧角色的文字生图母图必须显式传 `--asset-stage identity_master`，并只登记为 job-local 中间身份资产。它不能写入最终 `asset_registry`、Word 正式资产预览、首帧、故事板或视频参考。最终 16:9 多宫格角色设定卡必须改用 `$runninghub-image2-image`，上传已通过的母图、传入该母图 SHA 和上传回执，再经角色卡 QA 后才可成为最终人物资产。

## Asset-Type Quality Suffixes

### Clean Prop / Scene Suffix

Append this only for clean non-human props, locations, product stills, or image elements that actually need a controlled clean surface:

```text
超高细节，徕卡画质，保持所有元素材质；smooth shading, soft lighting, controlled details, minimal texture, high clarity, refined edges, smooth gradients --- no noise, grain, artifacts, high frequency detail, dirty texture, oversharpen, blotchy, chaotic details.
```

### Human-Realism Suffix

Use this instead for realistic character boards, narrative character references, and character-first-frame stills. It must be paired with the prompt's visible identity, wardrobe, camera, and motivated-light facts:

```text
真实影视选角资料的摄影质感：保留自然皮肤纹理、细小毛孔、轻微肤色不均、发际线与碎发，衣物保留真实受力褶皱和材质反射；光线方向、亮暗关系和色温符合场景，不做磨皮、塑料皮肤、过度锐化、网红滤镜或美容广告式精修。
```

### Character-Board Scope Guard

- Reusable short-drama identity authority defaults to a complete `character_board_full_set` in 16:9 horizontal format. A vertical three-quarter or half-body portrait is `shot_specific_identity_plate` and may only supplement the complete board.
- Do not silently change a complete character board into a single vertical portrait to reduce anatomy risk. If a single shot is needed, generate it after the full board is accepted and keep the two artifacts separately labeled.
- When a character output looks artificial, diagnose the exact missing variable: identity structure, wardrobe/material, camera distance, light direction/ratio/color temperature, pose/weight, hand anatomy, or skin/hair detail. Do not compensate by adding `smooth shading`, `minimal texture`, `perfect skin`, or a broad denoising block.

If the image still looks noisy or chaotic, reduce the prompt to one main scene, one camera angle, fewer characters, no text, no labels, no collage, and no storyboard layout before retrying.
