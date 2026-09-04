---
name: krill-image2
description: name: krill-image2
---

---
name: krill-image2
description: Execute Krill Image2Image generation only when a task explicitly requests Krill or the active project explicitly selects Krill. Do not use this skill for a generic gpt-image-2 request, a generic reference-image edit, or an unspecified Image2 channel.
---

# Krill Image2

Use this as the Step05 image execution channel. Preserve the accepted Step04 prompt body exactly; only pass it to the provider. Do not use it to author prompts or locally patch a generated image.

## Run

Require one local PNG, JPEG, or WebP reference image and a prompt. Run:

```powershell
& "$env:USERPROFILE\\.codex\\skills\\krill-image2\\scripts\\krill_image2.ps1" `
  --reference "C:\\path\\to\\reference.png" `
  --prompt-file "C:\\path\\to\\accepted-step04-prompt.txt" `
  --output "C:\\path\\to\\output.png" `
  --size "2048x1152"
```

The channel reads `KRILL_BASE_URL` and `KRILL_API_KEY` from the active environment. It uploads the reference to `/images/edits` as multipart form data using `gpt-image-2`, saves the returned PNG, and writes `<output>.manifest.json` with paths, model, prompt SHA-256, output SHA-256, and API timestamp. The manifest never contains credentials. Use the PowerShell runner because it is the verified multipart transport for the current Krill edge.

Always select the channel explicitly. `krill` is resolved from `KRILL_BASE_URL` and `KRILL_API_KEY`; `meinianda` is an additional configured channel. Do not infer either channel from the model name. Its credential is read from the protected local file `C:\Users\lsb\.codex\secrets\krill-image2.channels.json`; the channel uses the OpenAI-compatible `/v1/images/edits` path, and credentials are never written to manifests or logs.

`yunfei-1k` is a separate Image2 channel for 1K edits only. Select it explicitly with `-Channel yunfei-1k`; it accepts only `-Model gpt-image-2 -Size 1024x1024`. The runner enforces both restrictions before making a network request. Its credential is stored only in the protected local channel file and is never written to manifests or logs.

`yunfei-hd` is the high-resolution Image2 channel for 2K/4K edits. Select it explicitly with `-Channel yunfei-hd`; it accepts `-Model gpt-image-2 -Size 2048x1152` (2K) or `3840x2160` (4K). Use `yunfei-hd` for authoritative desktop interface targets and page redraws that need more than 1K; use `yunfei-1k` for square 1024x1024 experiments. The runner enforces the size restriction before making a network request, and its credential is stored only in the protected local channel file.

Always pass `-Channel` and `-Size` explicitly. Use `2048x1152` for 16:9 assets (verified in the current channel), `1024x1024` for 1:1 prop cards, and `1152x2048` for 9:16. Krill rejects a longest edge over `3840` and requires both dimensions to be divisible by `16`, so do not request `4096x4096` or `1080x1920`.

## Verify

Confirm that the output exists, is nonempty, has a supported image signature, and is visually consistent with the reference responsibility and prompt. Save the exact output path and SHA-256 in the job manifest. On a provider error, preserve its HTTP status and concise response body in the task log, then ask the user only if changing the selected channel is necessary.
