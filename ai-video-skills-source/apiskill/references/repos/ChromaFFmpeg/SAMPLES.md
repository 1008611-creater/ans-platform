# ChromaFFmpeg — Sample Requests

Complete curl examples and sample responses for every endpoint.
Replace `your-secret-key` and `http://localhost:9000` with your actual API key and server URL.

---

## Table of Contents

- [POST /merge](#post-merge)
- [POST /animate](#post-animate)
- [POST /combine](#post-combine)
- [POST /image-to-video](#post-image-to-video)
- [POST /loop](#post-loop)
- [POST /concat-transitions](#post-concat-transitions)
- [POST /metadata](#post-metadata)
- [POST /upload](#post-upload)
- [GET /folders](#get-folders)
- [POST /folders](#post-folders)
- [GET /folders/{name}](#get-foldersname)
- [GET /folders/{name}/urls](#get-foldersnameurl)
- [DELETE /folders/{name}](#delete-foldersname)
- [DELETE /folders/{name}/{filename}](#delete-foldersnamefilename)
- [GET /files](#get-files)
- [DELETE /files](#delete-files)
- [DELETE /files/{job_id}](#delete-filesjob_id)
- [GET /health](#get-health)

---

## POST /merge

Merge a video and audio file. The `strategy` field controls how a length mismatch is resolved.

### Strategy: trim_or_slow (default)

Trims video if it is longer than audio; slows video down if audio is longer.

```bash
curl -X POST http://localhost:9000/merge \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "video_url": "https://example.com/clip.mp4",
    "audio_url": "https://example.com/track.mp3",
    "strategy": "trim_or_slow"
  }'
```

**Response:**
```json
{
  "url": "http://localhost:9000/files/3f2a1b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c/output.mp4",
  "filename": "output.mp4",
  "job_id": "3f2a1b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c"
}
```

---

### Strategy: speed_match

Stretches or compresses video speed to exactly match audio duration.

```bash
curl -X POST http://localhost:9000/merge \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "video_url": "https://example.com/clip.mp4",
    "audio_url": "https://example.com/track.mp3",
    "strategy": "speed_match"
  }'
```

---

### Strategy: trim

Cuts output at whichever stream ends first — no speed change.

```bash
curl -X POST http://localhost:9000/merge \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "video_url": "https://example.com/clip.mp4",
    "audio_url": "https://example.com/track.mp3",
    "strategy": "trim"
  }'
```

---

### With folder output

Save the merged file directly into a named folder (must exist beforehand).

```bash
curl -X POST http://localhost:9000/merge \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "video_url": "https://example.com/clip.mp4",
    "audio_url": "https://example.com/track.mp3",
    "strategy": "trim_or_slow",
    "folder": "MyProject"
  }'
```

**Response (folder):**
```json
{
  "url": "http://localhost:9000/store/MyProject/output.mp4",
  "filename": "output.mp4",
  "folder": "MyProject"
}
```

---

### Response with warning (duration unknown)

When duration cannot be detected for one or both files, the server falls back to `-shortest` and adds a warning.

```json
{
  "url": "http://localhost:9000/files/3f2a1b4c/output.mp4",
  "filename": "output.mp4",
  "job_id": "3f2a1b4c",
  "warning": "Could not detect one or both media durations. video=unknown, audio=12.50s. Fell back to 'Trim to Shortest' — output ends when either stream ends."
}
```

---

## POST /animate

Apply a Ken Burns, zoom, or pan animation effect to an image or video.

### Zoom in on an image

```bash
curl -X POST http://localhost:9000/animate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "media_url": "https://example.com/photo.jpg",
    "media_type": "image",
    "animation": "zoom_in",
    "duration": 6,
    "fps": 25,
    "resolution": "1920x1080"
  }'
```

**Response:**
```json
{
  "url": "http://localhost:9000/files/abc12345-0000-0000-0000-000000000001/output.mp4",
  "filename": "output.mp4",
  "job_id": "abc12345-0000-0000-0000-000000000001"
}
```

---

### Zoom out on a video

```bash
curl -X POST http://localhost:9000/animate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "media_url": "https://example.com/clip.mp4",
    "media_type": "video",
    "animation": "zoom_out",
    "duration": 8,
    "fps": 30,
    "resolution": "1280x720"
  }'
```

---

### Pan zoom (Ken Burns effect) saved to a folder

```bash
curl -X POST http://localhost:9000/animate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "media_url": "https://example.com/photo.png",
    "media_type": "image",
    "animation": "pan_zoom",
    "duration": 10,
    "fps": 25,
    "resolution": "1920x1080",
    "folder": "Renders"
  }'
```

**Available animations:** `zoom_in` · `zoom_out` · `pan_left` · `pan_right` · `pan_zoom`

---

## POST /combine

Concatenate multiple video or audio files into one output file.

### Combine videos (stream copy — fast)

All clips must share the same codec, resolution, and frame rate when `reencode` is `false`.

```bash
curl -X POST http://localhost:9000/combine \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "type": "video",
    "urls": [
      "https://example.com/clip1.mp4",
      "https://example.com/clip2.mp4",
      "https://example.com/clip3.mp4"
    ],
    "reencode": false
  }'
```

**Response:**
```json
{
  "url": "http://localhost:9000/files/abc12345-0000-0000-0000-000000000002/output.mp4",
  "filename": "output.mp4",
  "job_id": "abc12345-0000-0000-0000-000000000002"
}
```

---

### Combine audio files

```bash
curl -X POST http://localhost:9000/combine \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "type": "audio",
    "urls": [
      "https://example.com/part1.mp3",
      "https://example.com/part2.mp3"
    ],
    "reencode": false
  }'
```

**Response:**
```json
{
  "url": "http://localhost:9000/files/abc12345-0000-0000-0000-000000000003/output.mp3",
  "filename": "output.mp3",
  "job_id": "abc12345-0000-0000-0000-000000000003"
}
```

---

### Combine mixed-codec sources (re-encode)

Use `"reencode": true` when clips have different codecs, resolutions, or frame rates.

```bash
curl -X POST http://localhost:9000/combine \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "type": "video",
    "urls": [
      "https://example.com/clip1.mp4",
      "https://example.com/clip2.mov",
      "https://example.com/clip3.avi"
    ],
    "reencode": true
  }'
```

---

### Combine into a named folder

```bash
curl -X POST http://localhost:9000/combine \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "type": "video",
    "urls": [
      "https://example.com/clip1.mp4",
      "https://example.com/clip2.mp4"
    ],
    "reencode": false,
    "folder": "FinalCuts"
  }'
```

---

## POST /image-to-video

Convert a static image to an MP4 video with optional animation.

### Static image (no animation)

```bash
curl -X POST http://localhost:9000/image-to-video \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "image_url": "https://example.com/photo.png",
    "duration": 8,
    "animation": "none",
    "fps": 25,
    "resolution": "1920x1080"
  }'
```

**Response:**
```json
{
  "url": "http://localhost:9000/files/abc12345-0000-0000-0000-000000000004/output.mp4",
  "filename": "output.mp4",
  "job_id": "abc12345-0000-0000-0000-000000000004"
}
```

---

### Ken Burns effect (pan_zoom)

```bash
curl -X POST http://localhost:9000/image-to-video \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "image_url": "https://example.com/landscape.jpg",
    "duration": 10,
    "animation": "pan_zoom",
    "fps": 25,
    "resolution": "1920x1080"
  }'
```

---

### Zoom in, saved to a folder

```bash
curl -X POST http://localhost:9000/image-to-video \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "image_url": "https://example.com/photo.jpg",
    "duration": 6,
    "animation": "zoom_in",
    "fps": 25,
    "resolution": "1280x720",
    "folder": "Slides"
  }'
```

**Available animations:** `none` · `zoom_in` · `zoom_out` · `pan_left` · `pan_right` · `pan_zoom`

---

## POST /loop

Repeat a video clip N times using stream copy — near-instant, no re-encoding.

### Loop a clip 4 times

```bash
curl -X POST http://localhost:9000/loop \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "video_url": "https://example.com/intro.mp4",
    "loop_count": 4
  }'
```

**Response:**
```json
{
  "url": "http://localhost:9000/files/abc12345-0000-0000-0000-000000000005/output.mp4",
  "filename": "output.mp4",
  "job_id": "abc12345-0000-0000-0000-000000000005"
}
```

---

### Loop into a named folder

```bash
curl -X POST http://localhost:9000/loop \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "video_url": "https://example.com/intro.mp4",
    "loop_count": 10,
    "folder": "Backgrounds"
  }'
```

`loop_count` must be between **2** and **50**.

---

## POST /concat-transitions

Concatenate video clips with smooth FFmpeg xfade transitions between them.

### Fade transition between three clips

```bash
curl -X POST http://localhost:9000/concat-transitions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "urls": [
      "https://example.com/scene1.mp4",
      "https://example.com/scene2.mp4",
      "https://example.com/scene3.mp4"
    ],
    "transition": "fade",
    "transition_duration": 1.0
  }'
```

**Response:**
```json
{
  "url": "http://localhost:9000/files/abc12345-0000-0000-0000-000000000006/output.mp4",
  "filename": "output.mp4",
  "job_id": "abc12345-0000-0000-0000-000000000006"
}
```

---

### Wipe left with a quick transition

```bash
curl -X POST http://localhost:9000/concat-transitions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "urls": [
      "https://example.com/clip1.mp4",
      "https://example.com/clip2.mp4"
    ],
    "transition": "wipeleft",
    "transition_duration": 0.5
  }'
```

---

### Circle open transition saved to a folder

```bash
curl -X POST http://localhost:9000/concat-transitions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "urls": [
      "https://example.com/clip1.mp4",
      "https://example.com/clip2.mp4",
      "https://example.com/clip3.mp4"
    ],
    "transition": "circleopen",
    "transition_duration": 0.8,
    "folder": "FinalEdit"
  }'
```

**Available transitions:**
`fade` · `fadeblack` · `fadewhite` · `dissolve` · `pixelize` · `wipeleft` · `wiperight` · `wipeup` · `wipedown` · `slideleft` · `slideright` · `smoothleft` · `smoothright` · `radial` · `circleopen` · `circleclose`

> All clips must share the same resolution and frame rate. Duration must be detectable for every clip (required to calculate xfade offsets).

---

## POST /metadata

Inspect duration, format, resolution, fps, bitrate, and stream counts for any media URL.

```bash
curl -X POST http://localhost:9000/metadata \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{"url": "https://example.com/video.mp4"}'
```

**Response:**
```json
{
  "duration_seconds": 47.32,
  "duration_formatted": "0:00:47",
  "format": "mov,mp4,m4a,3gp,3g2,mj2",
  "size_bytes": 4823042,
  "video_streams": 1,
  "audio_streams": 1,
  "width": 1920,
  "height": 1080,
  "fps": 25.0,
  "bitrate_kbps": 2048
}
```

### Audio-only file

```bash
curl -X POST http://localhost:9000/metadata \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{"url": "https://example.com/track.mp3"}'
```

**Response:**
```json
{
  "duration_seconds": 213.4,
  "duration_formatted": "0:03:33",
  "format": "mp3",
  "size_bytes": 8456192,
  "video_streams": 0,
  "audio_streams": 1,
  "width": null,
  "height": null,
  "fps": null,
  "bitrate_kbps": 320
}
```

---

## POST /upload

Upload any binary file and receive a persistent URL. Accepts multipart form data.
Maximum file size: **500 MB**.

### Upload to general storage

```bash
curl -X POST http://localhost:9000/upload \
  -H "X-API-Key: your-secret-key" \
  -F "file=@/path/to/video.mp4"
```

**Response:**
```json
{
  "url": "http://localhost:9000/files/abc12345-0000-0000-0000-000000000007/video.mp4",
  "filename": "video.mp4",
  "job_id": "abc12345-0000-0000-0000-000000000007",
  "size_bytes": 4823042
}
```

---

### Upload into a named folder

The folder is created automatically if it does not exist.

```bash
curl -X POST http://localhost:9000/upload \
  -H "X-API-Key: your-secret-key" \
  -F "file=@/path/to/photo.jpg" \
  -F "folder=my-project"
```

**Response:**
```json
{
  "url": "http://localhost:9000/store/my-project/photo.jpg",
  "filename": "photo.jpg",
  "folder": "my-project",
  "size_bytes": 204800
}
```

---

### Upload an audio file into a folder

```bash
curl -X POST http://localhost:9000/upload \
  -H "X-API-Key: your-secret-key" \
  -F "file=@/path/to/voiceover.mp3" \
  -F "folder=audio-assets"
```

**Response:**
```json
{
  "url": "http://localhost:9000/store/audio-assets/voiceover.mp3",
  "filename": "voiceover.mp3",
  "folder": "audio-assets",
  "size_bytes": 1048576
}
```

> If a file with the same name already exists in the folder, a numeric suffix is appended automatically (`photo_1.jpg`, `photo_2.jpg`, …).

---

## GET /folders

List all named folders with file counts and total sizes.

```bash
curl http://localhost:9000/folders \
  -H "X-API-Key: your-secret-key"
```

**Response:**
```json
{
  "folders": [
    { "name": "my-project",   "file_count": 3, "total_size_bytes": 1048576 },
    { "name": "audio-assets", "file_count": 7, "total_size_bytes": 8388608 },
    { "name": "FinalEdit",    "file_count": 1, "total_size_bytes": 4823042 }
  ],
  "count": 3
}
```

---

## POST /folders

Create a named folder explicitly.

```bash
curl -X POST http://localhost:9000/folders \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{"name": "my-project"}'
```

**Response:**
```json
{ "name": "my-project", "created": true }
```

> Folder names are sanitized to alphanumeric characters, hyphens, and underscores (max 64 chars). Folders are also created implicitly when you pass `folder=name` in `POST /upload`.

---

## GET /folders/{name}

List all files inside a specific folder.

```bash
curl http://localhost:9000/folders/my-project \
  -H "X-API-Key: your-secret-key"
```

**Response:**
```json
{
  "folder": "my-project",
  "files": [
    {
      "filename": "photo.jpg",
      "url": "http://localhost:9000/store/my-project/photo.jpg",
      "size_bytes": 204800,
      "created_at": "2026-03-13T12:00:00"
    },
    {
      "filename": "clip.mp4",
      "url": "http://localhost:9000/store/my-project/clip.mp4",
      "size_bytes": 4823042,
      "created_at": "2026-03-13T12:05:00"
    }
  ],
  "count": 2,
  "total_size_bytes": 5027842
}
```

---

## GET /folders/{name}/urls

Get all file URLs in a folder as a ready-to-use body for `POST /combine`.

**Query parameters:**
- `type` — `video` (default) or `audio`
- `reencode` — `true` or `false` (default `false`)

```bash
curl "http://localhost:9000/folders/my-project/urls?type=video&reencode=false" \
  -H "X-API-Key: your-secret-key"
```

**Response:**
```json
{
  "type": "video",
  "urls": [
    "http://localhost:9000/store/my-project/clip1.mp4",
    "http://localhost:9000/store/my-project/clip2.mp4"
  ],
  "reencode": false,
  "count": 2
}
```

Pipe directly into `/combine`:

```bash
BODY=$(curl -s "http://localhost:9000/folders/my-project/urls?type=video&reencode=false" \
  -H "X-API-Key: your-secret-key")

curl -X POST http://localhost:9000/combine \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d "$BODY"
```

---

## DELETE /folders/{name}

Delete a folder and all files inside it permanently.

```bash
curl -X DELETE http://localhost:9000/folders/my-project \
  -H "X-API-Key: your-secret-key"
```

**Response:**
```json
{ "deleted": "my-project" }
```

---

## DELETE /folders/{name}/{filename}

Delete a single file from a folder without removing the folder itself.

```bash
curl -X DELETE http://localhost:9000/folders/my-project/photo.jpg \
  -H "X-API-Key: your-secret-key"
```

**Response:**
```json
{ "deleted": "photo.jpg", "folder": "my-project" }
```

---

## GET /files

List all stored job output files across all processing jobs.

```bash
curl http://localhost:9000/files \
  -H "X-API-Key: your-secret-key"
```

**Response:**
```json
{
  "files": [
    {
      "job_id": "3f2a1b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
      "filename": "output.mp4",
      "url": "http://localhost:9000/files/3f2a1b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c/output.mp4",
      "size_bytes": 4823042,
      "created_at": "2026-03-13T12:00:00"
    },
    {
      "job_id": "abc12345-0000-0000-0000-000000000001",
      "filename": "output.mp4",
      "url": "http://localhost:9000/files/abc12345-0000-0000-0000-000000000001/output.mp4",
      "size_bytes": 2411521,
      "created_at": "2026-03-13T11:55:00"
    }
  ],
  "count": 2,
  "total_size_bytes": 7234563
}
```

---

## DELETE /files

Purge all stored job output files in one request.

```bash
curl -X DELETE http://localhost:9000/files \
  -H "X-API-Key: your-secret-key"
```

**Response:**
```json
{ "deleted_jobs": 12, "message": "Purged 12 job(s)" }
```

---

## DELETE /files/{job_id}

Delete a single job's output directory.

```bash
curl -X DELETE "http://localhost:9000/files/3f2a1b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c" \
  -H "X-API-Key: your-secret-key"
```

**Response:**
```json
{ "deleted": "3f2a1b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c" }
```

---

## GET /health

Health check — no authentication required.

```bash
curl http://localhost:9000/health
```

**Response:**
```json
{ "status": "ok" }
```

---

## Error Responses

All errors use a consistent shape:

```json
{
  "detail": {
    "error": "FFmpeg processing failed",
    "detail": "...raw FFmpeg stderr output..."
  }
}
```

| HTTP Status | Meaning |
|---|---|
| `400` | Bad request — invalid input or unreachable URL |
| `401` | Missing or invalid `X-API-Key` |
| `404` | File or folder not found |
| `413` | Upload exceeds 500 MB limit |
| `422` | Request body validation failed |
| `500` | FFmpeg or server-side processing error |

---

## Folder Output Pattern

All processing endpoints (`/merge`, `/animate`, `/combine`, `/image-to-video`, `/loop`, `/concat-transitions`) accept an optional `"folder"` field.

**Without folder** (default — job storage):
```json
{
  "url": "http://localhost:9000/files/{job_id}/output.mp4",
  "filename": "output.mp4",
  "job_id": "{job_id}"
}
```

**With folder** (named folder storage):
```json
{
  "url": "http://localhost:9000/store/{folder}/output.mp4",
  "filename": "output.mp4",
  "folder": "{folder}"
}
```

The folder **must already exist** before processing endpoints can write to it (create with `POST /folders`). Folders are created automatically only by `POST /upload`.
