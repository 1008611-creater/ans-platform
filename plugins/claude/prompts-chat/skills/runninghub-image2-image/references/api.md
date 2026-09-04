# RunningHub Image2 Image Low-Price API Notes

Endpoint policy: use the low-price channel only. Do not use official or standard model endpoints for Image2 generation unless the user explicitly changes this policy later.

Primary endpoints used by the skill:

- Low-price image-to-image: `POST /openapi/v2/rhart-image-g-2/image-to-image`
- Query task: `POST /openapi/v2/query`
- Local media upload: `POST /openapi/v2/media/upload/binary`

Default base URL is `https://www.runninghub.cn`. Use `--base-url https://www.runninghub.ai` if the `.cn` host is unavailable.

The v2 endpoint expects public URLs in `imageUrls`; local `file://` paths are not valid. For local files, upload them first with the media upload endpoint and use the returned `download_url`.

Typical payload:

```json
{
  "prompt": "image prompt",
  "imageUrls": ["https://example.com/reference.png"],
  "aspectRatio": "9:16",
  "resolution": "4k"
}
```

Authentication:

```text
Authorization: Bearer <RUNNINGHUB_API_KEY>
```

Legacy low-price AI app API detail URL kept for reference:

```text
https://www.runninghub.cn/call-api/api-detail/2046503667076751361
```

Docs used when creating this skill:

- https://www.runninghub.ai/docs/runninghub-api/image-to-image/channel-low-price
