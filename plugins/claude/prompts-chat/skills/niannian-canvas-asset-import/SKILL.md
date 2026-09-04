---
name: niannian-canvas-asset-import
description: name: niannian-canvas-asset-import
---

---
name: niannian-canvas-asset-import
description: Import one approved local image, video, or audio asset into the current Niannian AI production canvas without browser file chooser or clipboard automation. Use when an approved asset must become a durable project asset and a node in a default canvas group, especially after browser upload, cross-drive, or clipboard transport failures.
---

# Niannian Canvas Asset Import

Use the bundled `scripts/import_canvas_asset_via_ssh.js`. It sends one approved local file through the protected production host path, which validates project ownership, registers the asset, writes a durable Nomi canvas node, and returns the persisted asset/node receipt. Do not use a browser file chooser, clipboard, cookies, local storage, or provider credentials.

## Required Inputs

- Locked `project_id`, canonical root, and current production canvas project id.
- One approved asset with an `asset_manifest` record and current authorization for this external upload.
- One media kind: `reference_image`, `reference_video`, or `reference_audio`.
- One default canvas role: `character`, `scene`, `prop`, `audio`, or `shot`.

Never upload candidates, contact sheets, previews, Word files, unapproved frames, or another project's assets.

## Submit

Run the bundled script with Node:

```powershell
node C:\Users\lsb\.codex\skills\niannian-canvas-asset-import\scripts\import_canvas_asset_via_ssh.js `
  --file <absolute-file> `
  --project-id <canvas-project-id> `
  --project-kind redraw `
  --kind reference_image `
  --role character `
  --title <display-title>
```

The production endpoint is reachable only from the production host loopback interface. The script validates the returned `CAS-...` asset id, project id, and durable canvas node before reporting success. Repeating the same approved asset reuses the existing asset and node; it does not create a duplicate.

## Verify And Record

1. Accept only a receipt with one `CAS-...` id, returned download/thumbnail routes usable in the project's authenticated UI, a matching node `result.assetId`, and a node `categoryId` plus `meta.assetRole` that exactly match the requested role.
2. Record the receipt in the project's existing evidence objects. Update `asset_manifest` only through the owning asset champion.
3. Do not create video tasks or accept generated clips in this skill.

## Failure Rules

- Stop at the first failure. Do not retry another asset, switch channels, or fall back to `coverFile`.
- If the importer returns an invalid project, media, size, group, role, or node receipt, retain the failure reason and do not claim an upload. Do not advance when a reused legacy node retains another group.
- If the node write fails after a newly registered asset, the service compensates by removing that new asset. Confirm the returned receipt before advancing.
- This skill owns transport evidence only; creative acceptance and downstream use remain with the assigned production champion.
