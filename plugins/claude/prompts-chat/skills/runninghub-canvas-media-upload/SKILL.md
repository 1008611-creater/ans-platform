---
name: runninghub-canvas-media-upload
description: name: runninghub-canvas-media-upload
---

---
name: runninghub-canvas-media-upload
description: Bind local image, video, and audio files to the correct RunningHub ComfyUI canvas nodes and verify their real use. Use for RunningHub workflow media uploads, multi-image reference workflows, image/video/audio node mapping, canvas-side upload recovery, and pre-run asset checks.
---

# RunningHub Canvas Media Upload

## 冠军入口

先应用 [`runninghub-workflow-api`](../runninghub-workflow-api/SKILL.md) 的素材上传、Key 和结算规则；本 Skill 只验证实时画布里的节点绑定与预览。

Use this skill only for a live RunningHub canvas. Treat the canvas, not a guessed API request, as the source of truth for the uploaded media and its node binding.

## Prepare Once

1. Read the workflow's required input nodes, expected media kinds, and the user's intended slot order. Do not infer slot order from a preview, a Word document, or filenames alone.
2. Create a job-local manifest with the supplied script. It rejects missing files and duplicate node IDs before anything is uploaded.
3. Upload only final original assets. Do not upload Word previews, original-video frames, identity masters, storyboards, superseded downloads, or an asset from another production group.

```powershell
C:\Users\lsb\anaconda3\python.exe <skill-dir>\scripts\prepare_upload_manifest.py `
  --workflow-id <workflow-id> --mapping-file <mapping.json> --out <job-dir>\canvas_upload_manifest.json
```

`mapping.json` is an array with `node_id`, `role`, and `path`. Optional `expected_kind` is `image`, `video`, or `audio`.

Read [references/runninghub-canvas-conventions.md](references/runninghub-canvas-conventions.md) before the first upload on a workflow family or after RunningHub changes its UI.

## Bind Media

1. Open the intended RunningHub workflow and inspect the visible canvas before touching any control. The outer-page `上传` control imports a workflow JSON and can clear the canvas; never use it for media.
2. Work one node at a time in manifest order. Select the visible media control on the target `Load Image`, `Load Video`, or `Load Audio` node, then trigger its native file picker. Use the browser file chooser only when a visible canvas action opened it; do not click a hidden generic input as a substitute for a node binding.
3. Choose exactly one manifest path. Wait for the node preview or visible filename to update before proceeding to the next node. If a node already contains the same filename and SHA in the current job, leave it intact.
4. For a multi-reference workflow, preserve the declared slot order. Never reorder inputs just because two images depict similar people or scenes.
5. After all slots are bound, save the canvas. Record the visible filename returned by each node alongside the local path and SHA in the job manifest.

## Verify Before Run

Confirm all of the following from the visible canvas:

- Each required node has a non-placeholder filename and appropriate preview.
- The number of bound assets exactly matches the workflow contract.
- Each node's visual content matches its declared role; do not accept a similar-looking character or a stale preview.
- Prompt text, frame ratio, duration, and instance mode are the intended values for this one production group.

If any slot is wrong, replace only that slot and recheck it. Do not rebuild the workflow, run it, publish an API, or switch credentials to compensate for an upload mistake.

## Failure Recovery

- If the only visible `上传` command warns that the workflow will be cleared, cancel it. It is a workflow import command, not a media uploader.
- If a node's media list shows only old placeholders, locate the node's visible upload/choose action or supported canvas media drawer. A hidden page-level input with no associated visible action is not proof of a valid node upload.
- If the file chooser does not open, inspect the canvas state after the attempted action, then use another visible node-level route. Do not retry the same hidden-input click loop.
- If a completed upload has no updated preview or filename, mark that slot unbound and stop before generation. Never claim a local file was consumed merely because it was selected in an OS picker.

## H3 Multi-Image Rule

For MiniMax H3, use this skill before the H3 run. Upload the exact final assets referenced by the validated production group, keep no more than nine references, and use the channel whose number of image slots matches the actual count. A canvas upload is not a video run, API publication, or paid generation authorization.
