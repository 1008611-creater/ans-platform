---
name: astorie-seedance2-channel
description: name: astorie-seedance2-channel
---

---
name: astorie-seedance2-channel
description: Operate an already authenticated AStorie project canvas for the NianNian all-purpose Smini channel. Use for locked Seedance 2.0 Mini text-to-video or one-image-to-video tasks, live price readback, one Generate submission, media download, and delivery evidence.
---

# AStorie All-Purpose Smini Channel

Use this only with a locked workbench task specification and an already authenticated browser/CDP session. Do not create accounts, extract cookies, copy credentials, bypass verification, or use undocumented provider APIs.

## Preflight

1. Read the locked task specification and verify its prompt hash, selected channel, model, reference hashes, duration, ratio, resolution, output paths, and cost gate.
2. Open the existing authenticated AStorie **project canvas**, not the standard `/dashboard/video-hub` unlock surface.
3. Open `Add Node`, search `Seedance 2.0 Mini`, and create the one video node for this task. Read visible login state, available balance, selected model, duration, ratio, resolution, and this task's visible charge.
4. Accept only `Seedance 2.0 Mini`, `720P`, and only `4s` through `15s`.
5. Use text-to-video when no reference is locked. Upload only the single selected image when a reference is locked. Do not infer multi-reference, video-reference, or audio-reference support.
6. Stop with a resumable blocker when login, verification, model availability, visible price, or task-specific price authorization is missing.

## Execute

1. Apply the locked prompt and parameters using DOM/CDP selectors, then read them back from the node.
2. Confirm the live charge is within the task's authorization. Click Generate exactly once and record the provider request ID or the visible history entry that uniquely identifies the task.
3. Poll the same node until its task indicator is `1 / 1` and a rendered player is present. Do not create a replacement job while it is running.
4. Use the node download action when it becomes available. If it remains disabled while the player is present, locate the page's currently rendered video asset and download that exact asset. Do not guess a provider URL or resubmit.
5. Write a ledger with the provider identity, parameter readback, charge/balance readback, local path, byte size, hash, and timestamps. Run media probe, upload the verified output to the configured delivery store, and prove the workbench playback/download route reads back the same delivered object.

Return `completed` only when download, media probe, ledger, delivery upload, and user-visible readback all exist. Return `running` only with a provider task identifier. See [observed capabilities](references/astorie-observed-capabilities.md) before changing provider assumptions.
