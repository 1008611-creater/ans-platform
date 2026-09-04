# RunningHub Canvas Media Conventions

## Input distinction

The outer-page `上传` action imports a workflow JSON. It is not a media upload action and may clear the active canvas. Bind local media through a visible input action on the intended canvas node or the canvas's supported media drawer.

## Source and binding

Use one final local source per declared node. Keep a local SHA-256 and confirm that the node itself shows the resulting filename or preview. A local picker selection, a browser-side hidden input, a thumbnail elsewhere on the page, or a previous task result does not prove a node binding.

## Completion record

Keep only workflow ID, node ID, role, local absolute path, SHA-256, visible canvas filename, and timestamp in the job-local record. Never store account keys, cookies, signed URLs, or a full browser session in this skill or manifest.
