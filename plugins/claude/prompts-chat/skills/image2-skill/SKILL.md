---
name: image2-skill
description: name: image2-skill
---

---
name: image2-skill
description: Generate and verify static 4K Image2 assets through the Yunwu gpt-image-2-c text-to-image and reference-image edit channels. Use for character masters, character sheets, scenes, props, image generation, image editing, Image2, gpt-image-2-c, gpt-image-2, or any approved static asset after its upstream creative facts and prompt are ready.
---

# Image2 Skill

Use this Skill only for static assets. It is the authoritative execution channel after the project's asset champion has supplied a validated prompt; it does not replace story, asset, shotlist, or video ownership.

## Workflow

1. Read `references/channel-registry.md` and `references/channel-contract.md`. The only selectable channel is `yunwu`: use the account's verified model route. The current shared route is `gpt-image-2-c` for both text-to-image and reference-image edits; an API document's model name is only a candidate until a protected output receipt proves it.
2. Require a stable `asset_id`, an upstream-approved prompt file, requested dimensions, an output path, and a receipt path. Do not invent asset facts or repair a creative prompt here.
3. Run a dry run before every paid request. Confirm model, dimensions, prompt hash, output path, and `agent_vault_proxy` credential mode.
4. Submit exactly once after current user authorization or an active standing authorization for static image generation. Use the background launcher so the provider request can outlive a foreground terminal window; it records a queued runner state, and `image2_channel.py` writes `submission_started` before the outbound request. The request must run inside an Agent Vault session using the protected `yunwu-image` service. Never read, print, copy, or store a provider key, proxy token, cookie, or raw provider response.
5. Require a readable image, exact requested dimensions, and visual QA before marking an asset accepted. A candidate does not unlock downstream work. Record the earliest failed variable and do not automatically retry.

## Shared Agent Vault session

Use one shared, vault-scoped `codex-image2` proxy session so every Codex thread can call this Skill without depending on how Codex was launched:

1. In Agent Vault, keep the `yunwu-image` service limited to `yunwu.ai/v1/*` and the `codex-image2` agent limited to the `niannian-production` vault with proxy role.
2. Keep the `agent-vault` login only inside the user's protected WSL runtime; never put its session token in `auth.json`, this Skill, a project file, a prompt, receipt, or plaintext environment file.
3. Call `C:\Users\lsb\.codex\scripts\invoke-image2-with-agent-vault.ps1` for every preflight and submission. It runs `agent-vault run --vault niannian-production` in WSL and creates a short-lived child session for that one Python request.
4. Image2 calls must not depend on Codex inheriting a session, a local tunnel, or process environment variables. When the protected WSL login expires or is revoked, renew that single login; do not create per-thread tokens or fall back to provider keys.

The shared session removes repeated wiring; an active standing authorization may remove repeated prompts, but every actual image submission still requires the one-shot receipt and file/visual QA gates.

## Commands

Preflight:

```powershell
& "C:\Users\lsb\.codex\scripts\invoke-image2-with-agent-vault.ps1" `
  --channel yunwu --prompt-file ".\prompt.txt" --model "gpt-image-2-c" `
  --size "2160x3840" --asset-id "R01" --dry-run --receipt ".\receipt.json"
```

One authorized submission:

```powershell
& "C:\Users\lsb\.codex\scripts\invoke-image2-background.ps1" `
  --channel yunwu --prompt-file ".\prompt.txt" --model "gpt-image-2-c" `
  --size "2160x3840" --asset-id "R01" --submit --output ".\R01.png" --receipt ".\receipt.json"
```

Reference-image edit preflight:

```powershell
& "C:\Users\lsb\.codex\scripts\invoke-image2-with-agent-vault.ps1" `
  --channel yunwu --operation edit --prompt-file ".\character-sheet.txt" --model "gpt-image-2-c" `
  --reference-image ".\R01.png" --size "3840x2160" --asset-id "R01-SHEET" --dry-run --receipt ".\receipt.json"
```

One authorized reference-image submission:

```powershell
& "C:\Users\lsb\.codex\scripts\invoke-image2-background.ps1" `
  --channel yunwu --operation edit --prompt-file ".\character-sheet.txt" --model "gpt-image-2-c" `
  --reference-image ".\R01.png" --size "3840x2160" --asset-id "R01-SHEET" --submit --output ".\R01-sheet.png" --receipt ".\receipt.json"
```

The wrapper starts a protected Agent Vault child session only for the image command. Never put a provider key, proxy token, or raw provider response in a prompt, receipt, command, Skill file, or project record.

## Channel Boundaries

- `yunwu` text-to-image: `POST https://yunwu.ai/v1/images/generations` with JSON `model`, `prompt`, `n`, and `size`; current verified model route is `gpt-image-2-c`.
- `yunwu` reference-image edit: `POST https://yunwu.ai/v1/images/edits` with multipart `image`, `model=gpt-image-2-c`, `prompt`, `n=1`, and `size`. Accept 1 to 16 reference images, each no larger than 50MB. Valid dimensions have a maximum side of 3840, 16-pixel multiples, a ratio no wider than 3:1, and 655360 to 8294400 pixels; `3840x2160` is the verified 4K horizontal setting-board target.
- If an account groups models differently from the API document, select the model proven by a protected receipt, run a no-cost preflight, and submit a new candidate identifier once. Do not infer unsupported edits, variations, batch output, or quality parameters.

Do not claim a generated or edited asset is accepted until the provider has returned a readable image at the requested size and visual QA has passed.
