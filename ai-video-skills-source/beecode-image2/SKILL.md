---
name: beecode-image2
description: name: beecode-image2
---

---
name: beecode-image2
description: name: beecode-image2
---

---
name: beecode-image2
description: Generate raster images through the BeeCode OpenAI-compatible relay at beecode.cc using Image2 / GPT-Image-2. Use when the user asks to create images with BeeCode, a Zhongzhuanzhan/API relay, image2, GPT-Image-2, OpenAI-compatible image generation, or this skill by name.
---

# BeeCode Image2

## Quick Start

Use the bundled script for all image generation:

```powershell
python $env:USERPROFILE\.codex\skills\beecode-image2\scripts\generate_image.py --prompt "A clean product render of a translucent teal glass bottle on white" --size 1024x1024
```

The script reads credentials from environment variables first, then from the skill's local config file. Do not print API keys in chat or logs.

## Workflow

1. Turn the user's request into a direct image prompt. Preserve important creative constraints and add only useful production details such as composition, style, palette, and output intent.
2. Run `scripts/generate_image.py` with `--prompt`, `--prompt-file`, or both. Use `--out-dir` when the user wants files in a specific project folder.
3. If the model name fails, run `--list-models` and retry with `--model <id>`.
4. Return the generated file paths and the main prompt used. Avoid exposing the API key or full raw response.

## Common Commands

Generate one image:

```powershell
python $env:USERPROFILE\.codex\skills\beecode-image2\scripts\generate_image.py --prompt "<prompt>"
```

Generate from a reference image, using image-to-image/edit mode:

```powershell
python $env:USERPROFILE\.codex\skills\beecode-image2\scripts\generate_image.py --image "<path-to-reference-image>" --prompt "<edit prompt>" --size 1024x1024
```

Generate variants:

```powershell
python $env:USERPROFILE\.codex\skills\beecode-image2\scripts\generate_image.py --prompt "<prompt>" --n 2 --size 1024x1024
```

Save into the current project:

```powershell
python $env:USERPROFILE\.codex\skills\beecode-image2\scripts\generate_image.py --prompt "<prompt>" --out-dir .\outputs\beecode-image2
```

Check endpoint and payload without creating an image:

```powershell
python $env:USERPROFILE\.codex\skills\beecode-image2\scripts\generate_image.py --prompt "<prompt>" --dry-run
```

List relay models:

```powershell
python $env:USERPROFILE\.codex\skills\beecode-image2\scripts\generate_image.py --list-models
```

## Defaults

- Base URL: `https://beecode.cc`, normalized to `https://beecode.cc/v1`
- Model: `gpt-image-2`
- Size: `1024x1024`
- Output: `outputs/beecode-image2-YYYYMMDD-HHMMSS/`
- Response handling: saves `b64_json`, `image_base64`, `base64`, or image URLs returned by OpenAI-compatible image endpoints.
- Image-to-image: when `--image` is supplied, the script sends a multipart request to `/images/edits`.

## Prompt Notes

Prefer concise, specific visual direction. Include:

- subject and setting
- composition and camera/framing
- medium or style
- lighting and palette
- constraints such as no text, no logo, transparent background, or product-only render

For batches, vary one clear axis per run instead of mixing unrelated ideas in one prompt.

