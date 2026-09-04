# StoReel SD2 API Notes

## Project API

Use the bearer token from StoReel localStorage:

```text
localStorage["storeel_v2_token"]
```

Fetch project:

```http
GET /api/v1/projects/<projectId>
Authorization: Bearer <token>
```

Save project:

```http
PUT /api/v1/projects/<projectId>
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "<original title>",
  "canvasData": { ... }
}
```

Always include the original project title in PUT requests.

## Video Node Shape

Typical video node:

```json
{
  "id": "video-...",
  "type": "video",
  "src": "",
  "thumbnail": "",
  "duration": 0,
  "status": "pending",
  "position": {"x": 0, "y": 0},
  "size": {"width": 360, "height": 640},
  "schemaVersion": 3,
  "videoModel": "d3aa8427-e2fa-4f4e-ae44-a3643f659df8",
  "dynamicOptions": {
    "duration": "5s",
    "fps": 24,
    "guidance_scale": 7.5,
    "motion_strength": 0.5,
    "negative_prompt": "",
    "ratio": "9:16",
    "resolution": "720p",
    "seed": 0,
    "style_preset": "",
    "voice": "<preserve existing project value>"
  },
  "promptText": "...",
  "richPrompt": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "..."}]}]},
  "generatedFrom": {
    "type": "image-to-video",
    "sourceIds": ["image-first-frame", "image-character", "image-product"]
  }
}
```

For continuation clips, use `generatedFrom.type: "reference-video"` and include previous video ID plus image reference IDs in `sourceIds`.

## Generation API

Submit generation:

```http
POST /api/v1/ai/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "taskType": "TASK_TYPE_VIDEO",
  "templateId": "<videoModel>",
  "prompt": "<promptText>",
  "projectId": "<projectId>",
  "options": {
    "duration": "8s",
    "ratio": "9:16",
    "resolution": "720p",
    "fps": 24,
    "_targetNodeId": "<videoNodeId>"
  },
  "assetUrls": {
    "referenceImages": ["https://...png"],
    "referenceVideos": ["https://...mp4"]
  }
}
```

Use `referenceImages` for first-frame, character, and product image references. Use `referenceVideos` for continuation from a previous clip.

## Polling

```http
GET /api/v1/ai/query?taskId=<taskId>
Authorization: Bearer <token>
```

Interpret:

- `pending`: wait and poll again.
- `completed` with `videos[0].url`: write result back.
- `failed` or `error`: stop, report error, and do not resubmit blindly.

## Writeback On Success

Update the node:

```json
{
  "src": "<videoUrl>",
  "thumbnail": "<videoUrl>",
  "status": "success",
  "duration": 8,
  "mediaGenerationId": "<taskId>",
  "versions": [
    {
      "id": "version-...",
      "status": "success",
      "src": "<videoUrl>",
      "thumbnail": "<videoUrl>",
      "promptText": "<prompt>",
      "modelId": "<videoModel>",
      "params": {"duration": "8s"},
      "attachments": [{"nodeId": "...", "type": "image"}],
      "taskId": "<taskId>",
      "createdAt": 1780000000000
    }
  ],
  "currentVersionId": "version-..."
}
```

Preserve existing successful versions unless replacing a specific task ID.

## Account Rotation

Prefer waiting over switching for concurrency. Switch only on clear quota/points exhaustion.

When switching accounts:

1. Keep a local copy of prompts, reference URLs, and generated video URLs.
2. Clear auth state or open a fresh browser context.
3. Log in with the next account email and password from the current task context or environment variables.
4. Reopen the project. If inaccessible, create a new free-canvas project and recreate the current shot node with the same reference URLs.
