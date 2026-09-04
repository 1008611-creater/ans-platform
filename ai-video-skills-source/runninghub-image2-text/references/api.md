# RunningHub Image2 Text Low-Price API Notes

Endpoint policy: use the low-price channel only. Do not use official or standard model endpoints for Image2 generation unless the user explicitly changes this policy later.

Primary endpoints used by the skill:

- Low-price text-to-image: `POST /openapi/v2/rhart-image-g-2/text-to-image`
- Query task: `POST /openapi/v2/query`

Default base URL is `https://www.runninghub.cn`. Use `--base-url https://www.runninghub.ai` if the `.cn` host is unavailable.

Typical payload:

```json
{
  "prompt": "image prompt",
  "aspectRatio": "9:16",
  "resolution": "4k"
}
```

Authentication:

```text
Authorization: Bearer <RUNNINGHUB_API_KEY>
```

Docs used when creating this skill:

- https://www.runninghub.ai/docs/runninghub-api/text-to-image/channel-low-price
