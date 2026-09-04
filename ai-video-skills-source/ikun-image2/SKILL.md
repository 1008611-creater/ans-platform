---
name: ikun-image2
description: name: ikun-image2
---

---
name: ikun-image2
description: name: ikun-image2
---

---
name: ikun-image2
description: Generate or edit raster images through the user's Ikun / Monkey Tools NewAPI OpenAI-compatible image channel. Use when Codex should create Image2 / GPT-Image-2 images, test the api.monkey-tools.cn channel, list available relay models, or run text-to-image and image-to-image jobs through this global skill.
---

# Ikun Image2

Use this skill to generate or edit images through the user's Ikun / Monkey Tools NewAPI OpenAI-compatible channel.

## Credentials

Read credentials in this order:

1. `IKUN_IMAGE2_API_KEY`
2. `MONKEY_TOOLS_API_KEY`
3. `NEWAPI_API_KEY`
4. `OPENAI_API_KEY`
5. Local skill config file: `config.env`

Never print API keys, screenshots of keys, raw authorization headers, or config file contents.

Default base URL:

```text
https://api.monkey-tools.cn
```

The script normalizes it to `/v1` automatically.

## Quick Start

Use the bundled script:

```powershell
python $env:USERPROFILE\.codex\skills\ikun-image2\scripts\generate_image.py --prompt "A premium ecommerce first-frame portrait, full-body model, clean studio lighting" --size 1024x1536 --out-dir .\outputs\ikun-image2
```

Dry-run without charging:

```powershell
python $env:USERPROFILE\.codex\skills\ikun-image2\scripts\generate_image.py --prompt "test prompt" --dry-run
```

List image-like models exposed by the relay:

```powershell
python $env:USERPROFILE\.codex\skills\ikun-image2\scripts\generate_image.py --list-models
```

Image-to-image / edits:

```powershell
python $env:USERPROFILE\.codex\skills\ikun-image2\scripts\generate_image.py --image "D:\path\reference.png" --prompt "Preserve the person and outfit, place them in a clean 9:16 dance studio first frame" --size 1024x1536 --out-dir .\outputs\ikun-image2-i2i
```

## Workflow

1. Decide whether the task is text-to-image or image-to-image.
2. For first-frame work, prefer `9:16` or `1024x1536`, full-body/half-full-body, clear face, readable outfit, no extra text, no watermark.
3. Run `--dry-run` before the first paid request or when changing model/endpoint.
4. Submit with `--out-dir` inside the project output folder.
5. Save prompt, response metadata, and generated image paths. The script redacts base64 image payloads in `response.json`.
6. If the default model fails, run `--list-models`, choose an image-like model ID, and retry with `--model`.

## Common Options

- `--model gpt-image-2`
- `--size 1024x1536`
- `--n 1`
- `--quality high`
- `--output-format png|jpeg|webp`
- `--response-format b64_json|url`
- `--extra '{"key":"value"}'` for relay-specific fields
- `--timeout 180`

## Safety Notes

- Treat this as a paid external API. Use `--dry-run` first.
- Do not store generated secrets in project docs.
- For identity-critical image-to-image work, start with one strongest reference image before mixing many references.
- If the relay changes face, dress, logo, or product identity repeatedly, treat it as a channel limitation and switch to a higher-fidelity route rather than endlessly retrying the same prompt.

