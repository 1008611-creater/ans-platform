---
name: runninghub-canvas-fallback
description: name: runninghub-canvas-fallback
---

---
name: runninghub-canvas-fallback
description: "Generate images with a three-channel fallback: use RunningHub first, then the OpenAI-compatible Canvas channel, then Ikun/Monkey Tools when needed. Use for Codex image-generation threads that need stable routing across RunningHub, 画布渠道, and Ikun."
---

# RunningHub + Canvas + Ikun Fallback

## 冠军入口

涉及 RunningHub 上传、提交、结算或网站回传时，先应用 [`runninghub-workflow-api`](../runninghub-workflow-api/SKILL.md)；本 Skill 只决定图片生成失败后的渠道切换。

## Core Rule

Use image channels in this order unless the user explicitly asks for a specific one:

1. **RunningHub channel first** — preferred for Image2/text-to-image jobs, especially 16:9 2K background/reference images.
2. **Canvas channel fallback** — use the Codex OpenAI-compatible config named `OpenAI` when RunningHub fails, times out, returns no downloadable file, or reports quota/upstream errors. Call this **画布渠道** in user-facing summaries.
3. **Ikun channel available** — use `ikun-image2` when RunningHub and 画布渠道 are not suitable, when image-to-image/edit mode is needed, or when the user says Ikun can be used.

For the user's current preference, **先 RunningHub；不行就 画布渠道；Ikun 也能用作补充/兜底**.

## Current Canvas Channel Config

Codex config location depends on which thread is running:

- WSL Codex: `/home/lsb/.codex/config.toml`
- Windows Codex: `C:\Users\lsb\.codex\config.toml`

Required settings:

```toml
model_provider = "OpenAI"
model = "gpt-5.5"
review_model = "gpt-5.4-mini"
model_reasoning_effort = "xhigh"
disable_response_storage = true
network_access = "enabled"
windows_wsl_setup_acknowledged = true
model_context_window = 258000
model_auto_compact_token_limit = 200000

[model_providers.OpenAI]
name = "OpenAI"
base_url = "https://api.65535.space/v1"
wire_api = "responses"
requires_openai_auth = true
```

Auth file:

- WSL Codex: `/home/lsb/.codex/auth.json`
- Windows Codex: `C:\Users\lsb\.codex\auth.json`

It must contain `OPENAI_API_KEY`. Never print the key, copy it into logs, or include it in generated artifacts.

## RunningHub Text-To-Image Pattern

RunningHub skill path on Windows/WSL mount:

```text
/mnt/c/Users/lsb/.codex/skills/runninghub-image2-text
```

Preferred command shape:

```bash
python3 scripts/runninghub_image2_text.py \
  --prompt-file <prompt.txt> \
  --aspect-ratio 16:9 \
  --resolution 2k \
  --wait \
  --timeout 900 \
  --poll-interval 8 \
  --request-timeout 120 \
  --download-dir <raw-output-dir>
```

Run it with working directory:

```text
/mnt/c/Users/lsb/.codex/skills/runninghub-image2-text
```

Treat the result as successful only when at least one downloaded image exists and the final copied file is larger than `100000` bytes.

## Canvas Channel Usage

The 画布渠道 is the Codex OpenAI-compatible provider configured in `~/.codex/config.toml`:

- provider: `OpenAI`
- model: `gpt-5.5`
- endpoint: `https://api.65535.space/v1`
- wire API: `responses`

Use it by launching/continuing Codex under that config or by instructing the current Codex thread to generate through the configured OpenAI provider. Keep network access enabled.

When using 画布渠道 for image work, preserve the same prompt and output requirements from the RunningHub attempt. If the task is a batch, record per item:

- filename
- prompt file path
- primary channel attempted
- fallback channel used or skipped
- status
- output file path
- error tail, with secrets redacted

## Ikun Channel Usage

Ikun skill path on Windows/WSL mount:

```text
/mnt/c/Users/lsb/.codex/skills/ikun-image2
```

Text-to-image command shape:

```bash
python3 scripts/generate_image.py \
  --prompt-file <prompt.txt> \
  --size 1536x1024 \
  --out-dir <ikun-output-dir> \
  --timeout 300
```

Image-to-image/edit command shape:

```bash
python3 scripts/generate_image.py \
  --image <reference-image> \
  --prompt-file <prompt.txt> \
  --size 1024x1536 \
  --out-dir <ikun-output-dir> \
  --timeout 300
```

Run it with working directory:

```text
/mnt/c/Users/lsb/.codex/skills/ikun-image2
```

Ikun reads credentials from environment variables or its local `config.env`. Do not print `config.env`, API keys, request authorization headers, or raw secrets.

Use Ikun when:

- The task needs image-to-image/edit mode and RunningHub text-to-image is not enough.
- RunningHub and 画布渠道 both fail or are unsuitable.
- The user explicitly says Ikun is available/allowed.
- A smaller paid fallback is acceptable and the output can be verified locally.

## Fallback Triggers

Switch from RunningHub to 画布渠道 when any of these happens:

- RunningHub command exits non-zero.
- The command times out.
- JSON result has no `downloaded` files.
- Output file is missing or smaller than `100000` bytes.
- Error mentions quota, insufficient balance, upstream failure, 403/429/5xx, or task failure.
- Repeating the same prompt would only burn time without changing inputs.

Switch from 画布渠道 to Ikun when:

- The 画布渠道 request fails or cannot produce a usable image.
- The job requires image-to-image/edit behavior that the current 画布 workflow cannot perform reliably.
- The user prioritizes getting a usable image over keeping to the first two channels.

Do not retry any paid channel endlessly. One clean attempt per channel per prompt is enough unless the error is clearly transient and cheap to retry.

## Batch Workflow

1. Build or read a manifest of jobs.
2. Skip existing final images when the file exists and size is greater than `100000` bytes.
3. Write one prompt file per target output for reproducibility.
4. Try RunningHub first and copy the first downloaded image to the final filename.
5. If RunningHub fails by the fallback rules, run the same job with 画布渠道.
6. If 画布渠道 fails or is unsuitable, run Ikun and copy the generated image to the final filename.
7. Save a JSON result log beside the manifest with all attempted channels.
8. Verify counts, file sizes, and image dimensions at the end.

## Result Log Fields

For each item, record:

- `filename`
- `prompt_file`
- `channels_attempted`
- `selected_channel`
- `status`
- `final_path`
- `bytes`
- `dimensions` when available
- `error_tail` with secrets redacted

## User-Facing Reporting

Summaries should be concrete and short:

- `RunningHub 成功：N 张`
- `画布渠道补齐：N 张`
- `Ikun 补齐：N 张`
- `失败：N 张，原因：...`
- `输出目录：...`

Never say images were generated unless files exist locally or the remote API returned a verified downloadable URL.

## Common Pitfalls

- Do not store API keys in this skill or in prompts.
- Do not replace a failed output with a made-up path or placeholder file.
- Do not keep spending RunningHub attempts after a clear quota/upstream error.
- Do not forget that Windows Codex threads usually read `C:\Users\lsb\.codex`, while WSL tools read `/home/lsb/.codex` unless explicitly pointed at `/mnt/c/Users/lsb/.codex`.
- Do not treat a small HTML/error download as a generated image; verify file size and preferably image dimensions.
- Do not expose Ikun `config.env` contents; only report whether credentials were found.

## Verification Checklist

- [ ] `config.toml` points at `model_provider = "OpenAI"` and `base_url = "https://api.65535.space/v1"`.
- [ ] `auth.json` contains an `OPENAI_API_KEY` without printing it.
- [ ] RunningHub attempt was made before fallback unless user specified otherwise.
- [ ] 画布渠道 fallback reason is recorded.
- [ ] Ikun use is recorded when it is used as second fallback or image-to-image route.
- [ ] Final image files exist and are larger than `100000` bytes.
- [ ] Batch result JSON records all channels and errors with secrets redacted.
