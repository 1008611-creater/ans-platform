# ChromaFFmpeg

A self-hosted FFmpeg API with a built-in web UI. Submit media URLs or upload binary files, process them server-side with FFmpeg, and get back a persistent URL — no CLI required.

**Stack:** Python 3.11 · FastAPI · FFmpeg · Alpine.js · Docker

> **Need a VPS to deploy this on?** [Spin one up here](https://www.anrdoezrs.net/click-101758174-12454592?sid=github) — this is a referral link that helps support the project at no extra cost to you.

---

## Features

| Endpoint | What it does | Output |
|---|---|---|
| `POST /merge` | Merge video + audio with volume control and length strategy | URL → MP4 |
| `POST /animate` | Apply Ken Burns, zoom, or pan effects to image or video | URL → MP4 |
| `POST /combine` | Concatenate multiple videos or audio files | URL → MP4 / MP3 |
| `POST /image-to-video` | Convert a static image to MP4 with optional animation | URL → MP4 |
| `POST /loop` | Repeat a video clip N times (stream copy, no re-encode) | URL → MP4 |
| `POST /concat-transitions` | Concatenate clips with xfade transitions between them | URL → MP4 |
| `POST /metadata` | Get duration, resolution, fps, bitrate, stream info from a URL | JSON |
| `POST /metadata/upload` | Get metadata by uploading a binary file directly | JSON |
| `POST /upload` | Upload any binary file and get back a persistent URL | JSON |
| `GET /folders` | List all named folders | JSON |
| `POST /folders` | Create a named folder | JSON |
| `GET /folders/{name}` | List files inside a folder | JSON |
| `DELETE /folders/{name}` | Delete a folder and all its files | JSON |
| `GET /folders/{name}/urls` | Get all file URLs in a folder as a /combine body | JSON |
| `DELETE /folders/{name}/{filename}` | Delete a single file from a folder | JSON |
| `GET /files` | List all job output files | JSON |
| `DELETE /files` | Purge all job output files | JSON |
| `DELETE /files/{job_id}` | Delete a single job's output | JSON |
| `GET /health` | Health check | JSON |

---

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/leksautomate/ChromaFFmpeg.git
cd ChromaFFmpeg
cp .env.example .env
```

Edit `.env`:

```
API_KEY=your-secret-key-here
BASE_URL=http://your-vps-ip:9000
```

### 2. Run with Docker

```bash
mkdir -p /data/outputs /data/folders
docker compose up --build -d
```

The API and UI are live at `http://your-vps-ip:9000`

---

## Updating the code on your VPS

SSH into your server. First find where the repo lives if you're unsure:

```bash
find / -name "docker-compose.yml" -not -path "*/proc/*" 2>/dev/null
```

Then `cd` into that directory and run:

```bash
# Pull latest
git pull origin master

# Stop container and wipe build cache
docker compose down
docker system prune -af

# Rebuild and start fresh
docker compose up --build -d

# Watch logs
docker logs -f chromaffmpeg-chromaffmpeg-1
```

Your `.env` and `/data/` volumes are untouched — `docker system prune -af` only removes images and build cache, not volumes.

---

## Web UI

Open `http://your-vps-ip:9000` in your browser. Enter your API key in the sidebar — it is saved to `localStorage`.

**Processing:**

- **Merge** — paste a video URL and audio URL, choose a length strategy, control volumes for both the added audio and the video's original audio
- **Animate** — apply Ken Burns zoom or pan animation to an image or video
- **Combine** — concatenate multiple files into one (optional re-encode for mixed codecs)
- **Image to Video** — convert a static image to MP4 with optional animation
- **Loop** — repeat a video clip N times
- **Transitions** — concatenate clips with animated xfade transitions
- **Metadata** — inspect any media URL

**Storage:**

- **Upload** — drag-and-drop or browse to upload any binary file; audio files go to the `audio` folder automatically, all others go to `upload`; optionally override with a custom folder name
- **Folders** — browse named folders (`upload`, `audio`, `main`, or custom), preview files inline, copy URLs, download, or delete
- **Storage** — browse all job output files, click any file to preview inline, copy URL, download, or purge

All result panels include an inline media preview, a copyable URL, and a download button. If an error occurs, a **▼ Show FFmpeg log** toggle reveals the raw FFmpeg stderr for diagnosis.

---

## Default Folders

Several endpoints automatically route output to named folders when no `folder` is specified:

| Endpoint | Default folder | Notes |
|---|---|---|
| `POST /upload` (audio file) | `audio` | `.mp3 .wav .m4a .ogg .aac .flac .opus .wma` |
| `POST /upload` (any other file) | `upload` | Video, image, or unknown type |
| `POST /combine` | `main` | Override with `"folder"` in the request body |
| `POST /merge` | *(no default — returns job URL)* | Set `"folder"` to save to a named folder |
| Other processing endpoints | *(no default — returns job URL)* | Set `"folder"` to save to a named folder |

All folders are **created automatically** if they don't exist. You never need to pre-create a folder before using it.

---

## API Reference

All endpoints require the header:

```
X-API-Key: your-secret-key
```

Interactive docs (Swagger UI): `http://your-vps-ip:9000/docs`

Processing endpoints return a `/store/` URL when a folder is used, or a `/files/` URL otherwise:

**With folder:**
```json
{
  "url": "http://your-vps-ip:9000/store/MyProject/a3f8b2c1.mp4",
  "filename": "a3f8b2c1.mp4",
  "folder": "MyProject"
}
```

**Without folder (job storage):**
```json
{
  "url": "http://your-vps-ip:9000/files/uuid/a3f8b2c1.mp4",
  "filename": "a3f8b2c1.mp4",
  "job_id": "uuid"
}
```

Output filenames are always **randomized** (8-character hex token + extension) to avoid collisions.

Some endpoints include an optional `"warning"` field when a fallback was applied (see `/merge`).

---

### POST /merge

Merges a video and audio file. Controls length mismatch strategy and independent volume for each audio source.

**Request body:**

| Field | Type | Default | Description |
|---|---|---|---|
| `video_url` | string | required | URL of the video file |
| `audio_url` | string | required | URL of the audio file to add |
| `strategy` | string | `"speed_match"` | How to handle length mismatch (see table below) |
| `audio_volume` | float | `1.0` | Volume multiplier for the added audio (`0.5` = half, `2.0` = double, max `4.0`) |
| `video_audio_volume` | float | `0.0` | Volume of the video's original audio to mix in (`0.0` = ignore, `0.3` = 30%) |
| `folder` | string | none | Save output to this named folder (auto-created if missing) |

**`strategy` values:**

| Value | Video longer than audio | Audio longer than video |
|---|---|---|
| `trim_or_slow` *(default)* | Trim video to audio length — stream copy, fast | Slow video down to fill the audio duration |
| `speed_match` | Speed up video to match audio | Slow video down to match audio |
| `trim` | Cut at whichever stream ends first | Cut at whichever stream ends first |

**Volume behaviour:**
- `audio_volume=1.0, video_audio_volume=0.0` (defaults) — replaces video audio entirely with the added audio at original volume
- `audio_volume=1.5` — boosts the added audio by 50%
- `video_audio_volume=0.2` — keeps the video's original audio at 20% and mixes it with the added audio
- When any volume param is non-default, audio is re-encoded to AAC

**Duration detection fallback:** If duration cannot be determined for either file, `trim` (`-shortest`) is applied automatically and a `"warning"` field is added to the response.

**curl:**

```bash
# Basic merge — replace video audio with added audio
curl -X POST http://localhost:9000/merge \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "video_url": "https://example.com/video.mp4",
    "audio_url": "https://example.com/audio.mp3",
    "strategy": "trim_or_slow"
  }'

# Boost added audio, keep quiet background from video
curl -X POST http://localhost:9000/merge \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "video_url": "https://example.com/video.mp4",
    "audio_url": "https://example.com/audio.mp3",
    "strategy": "trim_or_slow",
    "audio_volume": 1.5,
    "video_audio_volume": 0.2
  }'

# Silence the video audio completely, use added audio at half volume
curl -X POST http://localhost:9000/merge \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "video_url": "https://example.com/video.mp4",
    "audio_url": "https://example.com/audio.mp3",
    "strategy": "trim_or_slow",
    "audio_volume": 0.5
  }'

# speed_match — stretch or compress video speed to fit audio exactly
curl -X POST http://localhost:9000/merge \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "video_url": "https://example.com/video.mp4",
    "audio_url": "https://example.com/audio.mp3",
    "strategy": "speed_match"
  }'

# Save output to a named folder (auto-created if it doesn't exist)
curl -X POST http://localhost:9000/merge \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "video_url": "https://example.com/video.mp4",
    "audio_url": "https://example.com/audio.mp3",
    "strategy": "trim_or_slow",
    "folder": "roman"
  }'
```

**Response (with folder):**
```json
{
  "url": "http://your-vps-ip:9000/store/roman/a3f8b2c1.mp4",
  "filename": "a3f8b2c1.mp4",
  "folder": "roman"
}
```

---

### POST /animate

Applies a cinematic animation effect to an image or video.

**Request body:**

```json
{
  "media_url": "https://example.com/photo.jpg",
  "media_type": "image",
  "animation": "zoom_in",
  "duration": 6,
  "fps": 25,
  "resolution": "1920x1080",
  "folder": "MyProject"
}
```

`folder` is optional — see [folder output](#folder-output) below.

**`animation` values:** `zoom_in` · `zoom_out` · `pan_left` · `pan_right` · `pan_zoom`

**`media_type` values:** `image` · `video`

**curl:**

```bash
# Animate an image
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

# Save output to a named folder
curl -X POST http://localhost:9000/animate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "media_url": "https://example.com/photo.jpg",
    "media_type": "image",
    "animation": "pan_zoom",
    "duration": 8,
    "fps": 25,
    "resolution": "1920x1080",
    "folder": "MyProject"
  }'
```

---

### POST /combine

Concatenates multiple video or audio files into a single output.

Output goes to the **`main`** folder by default. Override with `"folder"` in the request body.

**Request body:**

```json
{
  "type": "video",
  "urls": [
    "https://example.com/clip1.mp4",
    "https://example.com/clip2.mp4"
  ],
  "reencode": false,
  "folder": "MyProject"
}
```

Set `"type": "audio"` for MP3 output. Set `"reencode": true` for mixed-codec sources — slower but always compatible.

**curl:**

```bash
# Combine videos — output goes to "main" folder by default
curl -X POST http://localhost:9000/combine \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "type": "video",
    "urls": ["https://example.com/clip1.mp4", "https://example.com/clip2.mp4"],
    "reencode": false
  }'

# Combine audio files
curl -X POST http://localhost:9000/combine \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "type": "audio",
    "urls": ["https://example.com/part1.mp3", "https://example.com/part2.mp3"],
    "reencode": false
  }'

# Re-encode for mixed sources
curl -X POST http://localhost:9000/combine \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "type": "video",
    "urls": ["https://example.com/clip1.mp4", "https://example.com/clip2.mov"],
    "reencode": true
  }'

# Override output folder
curl -X POST http://localhost:9000/combine \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "type": "video",
    "urls": ["https://example.com/clip1.mp4", "https://example.com/clip2.mp4"],
    "reencode": false,
    "folder": "MyProject"
  }'
```

**Response:**
```json
{
  "url": "http://your-vps-ip:9000/store/main/a3f8b2c1.mp4",
  "filename": "a3f8b2c1.mp4",
  "folder": "main"
}
```

---

### POST /image-to-video

Converts a static image to an MP4 video.

**Request body:**

```json
{
  "image_url": "https://example.com/photo.png",
  "duration": 8,
  "animation": "none",
  "fps": 25,
  "resolution": "1920x1080",
  "folder": "MyProject"
}
```

`folder` is optional — see [folder output](#folder-output) below.

**`animation` values:** `none` · `zoom_in` · `zoom_out` · `pan_left` · `pan_right` · `pan_zoom`

**curl:**

```bash
# Static image — no animation
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

# Ken Burns effect
curl -X POST http://localhost:9000/image-to-video \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "image_url": "https://example.com/photo.png",
    "duration": 8,
    "animation": "pan_zoom",
    "fps": 25,
    "resolution": "1920x1080"
  }'

# Save output to a named folder
curl -X POST http://localhost:9000/image-to-video \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "image_url": "https://example.com/photo.png",
    "duration": 8,
    "animation": "zoom_in",
    "fps": 25,
    "resolution": "1920x1080",
    "folder": "MyProject"
  }'
```

---

### POST /loop

Repeats a video clip N times by stream-copying — no re-encoding, near-instant.

**Request body:**

```json
{
  "video_url": "https://example.com/clip.mp4",
  "loop_count": 3,
  "folder": "MyProject"
}
```

`loop_count` must be between 2 and 50. `folder` is optional — see [folder output](#folder-output) below.

**curl:**

```bash
curl -X POST http://localhost:9000/loop \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "video_url": "https://example.com/clip.mp4",
    "loop_count": 4
  }'

# Save looped output to a named folder
curl -X POST http://localhost:9000/loop \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "video_url": "https://example.com/clip.mp4",
    "loop_count": 4,
    "folder": "MyProject"
  }'
```

---

### POST /concat-transitions

Concatenates video clips with smooth FFmpeg xfade transitions between them.

**Request body:**

```json
{
  "urls": [
    "https://example.com/clip1.mp4",
    "https://example.com/clip2.mp4",
    "https://example.com/clip3.mp4"
  ],
  "transition": "fade",
  "transition_duration": 1.0,
  "folder": "MyProject"
}
```

`folder` is optional — see [folder output](#folder-output) below.

**`transition` values:** `fade` · `fadeblack` · `fadewhite` · `dissolve` · `pixelize` · `wipeleft` · `wiperight` · `wipeup` · `wipedown` · `slideleft` · `slideright` · `smoothleft` · `smoothright` · `radial` · `circleopen` · `circleclose`

**Requirements:**
- All clips must share the same resolution and frame rate
- Duration must be detectable for all clips — required to calculate xfade offsets
- If all clips have audio, `acrossfade` transitions are applied to audio automatically; if any clip lacks audio the output is video-only

**curl:**

```bash
# Fade transition between three clips
curl -X POST http://localhost:9000/concat-transitions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "urls": [
      "https://example.com/clip1.mp4",
      "https://example.com/clip2.mp4",
      "https://example.com/clip3.mp4"
    ],
    "transition": "fade",
    "transition_duration": 1.0
  }'

# Wipe left with a shorter transition
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

# Save output to a named folder
curl -X POST http://localhost:9000/concat-transitions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "urls": [
      "https://example.com/clip1.mp4",
      "https://example.com/clip2.mp4",
      "https://example.com/clip3.mp4"
    ],
    "transition": "fade",
    "transition_duration": 1.0,
    "folder": "MyProject"
  }'
```

---

### Folder output

All processing endpoints accept an optional `"folder"` field. `/combine` defaults to `"main"` when omitted; all others return a `/files/` job URL when no folder is specified.

When `folder` is set (or defaulted):
- The output is copied into `/data/folders/{folder}/` (served at `/store/{folder}/`)
- The response returns a `/store/` URL and a `"folder"` key
- The folder is **created automatically** if it does not exist
- Folder names are sanitized — only alphanumeric, hyphens, underscores (max 64 chars)
- Output filenames are **randomized** — collisions are impossible

**Response shape (with folder):**
```json
{
  "url": "http://your-vps-ip:9000/store/MyProject/a3f8b2c1.mp4",
  "filename": "a3f8b2c1.mp4",
  "folder": "MyProject"
}
```

**Response shape (without folder — job storage):**
```json
{
  "url": "http://your-vps-ip:9000/files/uuid/a3f8b2c1.mp4",
  "filename": "a3f8b2c1.mp4",
  "job_id": "uuid"
}
```

---

### POST /metadata

Returns duration, format, resolution, fps, bitrate, and stream counts for any media URL.

**Request body:**

```json
{ "url": "https://example.com/video.mp4" }
```

**curl:**

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
  "format": "mov",
  "size_bytes": 4823042,
  "video_streams": 1,
  "audio_streams": 1,
  "width": 1920,
  "height": 1080,
  "fps": 25.0,
  "bitrate_kbps": 2048
}
```

---

### POST /metadata/upload

Upload a binary file directly and get its metadata — no need to host the file first. The file is deleted from the server immediately after probing.

**curl:**

```bash
curl -X POST http://localhost:9000/metadata/upload \
  -H "X-API-Key: your-secret-key" \
  -F "file=@/path/to/video.mp4"
```

**Response:** same shape as `POST /metadata`.

---

### POST /upload

Converts any binary file (video, audio, image, or anything else) into a persistent URL. Accepts multipart form data.

Files are always stored in a named folder. The default folder is chosen automatically by file type:

| File type | Default folder |
|---|---|
| `.mp3 .wav .m4a .ogg .aac .flac .opus .wma` | `audio` |
| Everything else (video, image, etc.) | `upload` |

Pass `folder=name` to override the default. The folder is created automatically if it does not exist. Filenames are **randomized** (e.g. `a3f8b2c1.mp3`) — no collisions.

**curl:**

```bash
# Upload a video — goes to "upload" folder automatically
curl -X POST http://localhost:9000/upload \
  -H "X-API-Key: your-secret-key" \
  -F "file=@/path/to/video.mp4"

# Upload an audio file — goes to "audio" folder automatically
curl -X POST http://localhost:9000/upload \
  -H "X-API-Key: your-secret-key" \
  -F "file=@/path/to/track.mp3"

# Override folder explicitly
curl -X POST http://localhost:9000/upload \
  -H "X-API-Key: your-secret-key" \
  -F "file=@/path/to/photo.jpg" \
  -F "folder=my-project"
```

**Response:**

```json
{
  "url": "http://your-vps-ip:9000/store/audio/a3f8b2c1.mp3",
  "filename": "a3f8b2c1.mp3",
  "folder": "audio",
  "size_bytes": 4823042
}
```

Maximum file size: **500 MB**.

---

### GET /folders

List all named folders with file counts and total sizes.

**curl:**

```bash
curl http://localhost:9000/folders \
  -H "X-API-Key: your-secret-key"
```

**Response:**

```json
{
  "folders": [
    { "name": "audio",  "file_count": 5, "total_size_bytes": 2097152 },
    { "name": "main",   "file_count": 3, "total_size_bytes": 1048576 },
    { "name": "upload", "file_count": 2, "total_size_bytes": 524288 }
  ],
  "count": 3
}
```

---

### POST /folders

Create a named folder.

**curl:**

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

Folder names are sanitized — only alphanumeric characters, hyphens, and underscores are kept (max 64 chars). Folders are also created automatically by upload and all processing endpoints when needed.

---

### GET /folders/{name}

List all files inside a folder.

**curl:**

```bash
curl http://localhost:9000/folders/audio \
  -H "X-API-Key: your-secret-key"
```

**Response:**

```json
{
  "folder": "audio",
  "files": [
    {
      "filename": "a3f8b2c1.mp3",
      "url": "http://your-vps-ip:9000/store/audio/a3f8b2c1.mp3",
      "size_bytes": 204800,
      "created_at": "2026-03-14T12:00:00"
    }
  ],
  "count": 1,
  "total_size_bytes": 204800
}
```

---

### GET /folders/{name}/urls

Returns all file URLs in a folder formatted as a ready-to-use body for `POST /combine`.

**Query parameters:**
- `type`: Either `video` (default) or `audio`.
- `reencode`: Boolean. Set `true` if you plan to combine files with different codecs.

**curl:**

```bash
curl "http://localhost:9000/folders/main/urls?type=video&reencode=false" \
  -H "X-API-Key: your-secret-key"
```

**Response:**

```json
{
  "type": "video",
  "urls": [
    "http://your-vps-ip:9000/store/main/a3f8b2c1.mp4",
    "http://your-vps-ip:9000/store/main/b4c9d2e5.mp4"
  ],
  "reencode": false,
  "count": 2
}
```

---

### DELETE /folders/{name}

Delete a folder and all files inside it permanently.

**curl:**

```bash
curl -X DELETE http://localhost:9000/folders/my-project \
  -H "X-API-Key: your-secret-key"
```

**Response:**

```json
{ "deleted": "my-project" }
```

---

### DELETE /folders/{name}/{filename}

Delete a single file from a folder.

**curl:**

```bash
curl -X DELETE http://localhost:9000/folders/audio/a3f8b2c1.mp3 \
  -H "X-API-Key: your-secret-key"
```

**Response:**

```json
{ "deleted": "a3f8b2c1.mp3", "folder": "audio" }
```

---

### GET /files

List all stored job output files.

**curl:**

```bash
curl http://localhost:9000/files \
  -H "X-API-Key: your-secret-key"
```

**Response:**

```json
{
  "files": [
    {
      "job_id": "uuid",
      "filename": "a3f8b2c1.mp4",
      "url": "http://your-vps-ip:9000/files/uuid/a3f8b2c1.mp4",
      "size_bytes": 4823042,
      "created_at": "2026-03-14T12:00:00"
    }
  ],
  "count": 1,
  "total_size_bytes": 4823042
}
```

---

### DELETE /files

Purge all stored job output files.

**curl:**

```bash
curl -X DELETE http://localhost:9000/files \
  -H "X-API-Key: your-secret-key"
```

**Response:**

```json
{ "deleted_jobs": 12, "message": "Purged 12 job(s)" }
```

---

### DELETE /files/{job_id}

Delete a single job's output directory.

**curl:**

```bash
curl -X DELETE http://localhost:9000/files/uuid \
  -H "X-API-Key: your-secret-key"
```

**Response:**

```json
{ "deleted": "uuid" }
```

---

### GET /health

```bash
curl http://localhost:9000/health
```

```json
{ "status": "ok" }
```

---

## Error Handling

All errors return a JSON body with a consistent shape:

```json
{
  "detail": {
    "error": "FFmpeg processing failed",
    "detail": "...raw FFmpeg stderr output..."
  }
}
```

The web UI surfaces the `error` message directly. A **▼ Show FFmpeg log** toggle reveals the full stderr so you can diagnose the root cause without touching the server.

**Common FFmpeg errors and fixes:**

| Error | Cause | Fix |
|---|---|---|
| `No such file or directory` | Input URL unreachable or wrong path | Verify the URL is publicly accessible |
| `Invalid data found when processing input` | Corrupted or unsupported container | Re-download or convert the source file |
| `height not divisible by 2` | Odd pixel dimensions | Add `-vf scale=trunc(iw/2)*2:trunc(ih/2)*2` |
| `Encoder libx264 not found` | FFmpeg binary missing codec | Use the full FFmpeg Docker image |
| `Output file is empty` | Silent failure — usually a filter error | Expand the FFmpeg log in the UI |
| xfade `Could not determine duration` | Clip has no duration metadata | Pre-process with `/metadata` to verify, or re-encode the source |
| `HTTP 413` on `/upload` | File exceeds 500 MB limit | Compress or split the file first |
| `File not found on server` | `/store/` or `/files/` URL points to a deleted file | Re-upload the file and use the new URL |

All FFmpeg and ffprobe errors are logged server-side (Python `logging`) with the full command line and stderr tail for every failed job.

---

## Storage

There are two independent storage areas:

| Area | Path (container) | Served at | Purpose |
|---|---|---|---|
| Job outputs | `/data/outputs/{uuid}/` | `/files/{uuid}/{filename}` | Results from processing endpoints (no folder set) |
| Named folders | `/data/folders/{name}/` | `/store/{name}/{filename}` | Uploads and processing outputs routed to a folder |

**Built-in named folders** (created automatically on first use):

| Folder | Used by |
|---|---|
| `audio` | Audio file uploads (`.mp3`, `.wav`, `.m4a`, etc.) |
| `upload` | Non-audio file uploads (video, image, etc.) |
| `main` | `/combine` output (default) |

Both storage areas are Docker volumes that persist across container restarts. Neither path requires authentication to read — the URL itself acts as the access token. Add a reverse proxy with authentication if you need access control.

When a processing endpoint uses a `/store/` URL as input (e.g. feeding a merge output back into another merge), the server reads the file directly from disk — no HTTP round-trip needed.

Create both directories on the host before starting:

```bash
mkdir -p /data/outputs /data/folders
```

---

## Configuration

| Variable | Description | Default |
|---|---|---|
| `API_KEY` | Required. Secret key sent in `X-API-Key` header | — |
| `BASE_URL` | Public base URL embedded in returned file URLs | `http://localhost:9000` |
| `OUTPUTS_DIR` | Directory for job output files inside the container | `/data/outputs` |
| `FOLDERS_DIR` | Directory for named folder files inside the container | `/data/folders` |
| `MAX_DOWNLOAD_BYTES` | Max size for a remote URL fetched by a processing endpoint | `2147483648` (2 GiB) |
| `ALLOW_PRIVATE_NETWORK_URLS` | Set `true` to allow fetching from private/internal addresses | `false` |

---

## Architecture & Trust Boundaries

A request that touches remote media crosses several trust boundaries. This section documents
them explicitly for anyone reviewing the security posture of a self-hosted deployment; see
[SECURITY.md](SECURITY.md) for how to report an issue with any of them.

**1. Auth boundary — `X-API-Key`.** Every route except `/health`, `/`, and the `/files`,
`/store`, `/static` mounts requires the header (`app/auth.py`, checked with
`secrets.compare_digest`). It's a single shared secret with no per-client scoping — anyone
holding it can process, list, and permanently delete everything the service has stored.

**2. Remote-URL fetch boundary — SSRF surface.** `POST /merge`, `/animate`, `/combine`,
`/image-to-video`, `/loop`, and `/concat-transitions` all accept URLs and fetch them via
`app/utils/downloader.py`. Before connecting (and again on every redirect hop, since redirects
are followed manually rather than via httpx's `follow_redirects=True`), the target hostname is
resolved and rejected if it points at a private, loopback, link-local, multicast, or reserved
address — this covers cloud metadata endpoints (`169.254.169.254`) as well as RFC1918 ranges.
Downloads are also capped at `MAX_DOWNLOAD_BYTES` (default 2 GiB, configurable), enforced during
streaming rather than trusting the `Content-Length` header, with the partial file removed on
failure. Set `ALLOW_PRIVATE_NETWORK_URLS=true` if you intentionally point this at an internal
media server. **Residual risk:** the hostname is resolved once via `socket.getaddrinfo` and then
connected to separately by httpx — a DNS answer that changes between those two steps (DNS
rebinding) isn't caught. Pinning the resolved IP for the actual connection would close that; it
hasn't been done here.

**3. Direct-ffprobe boundary — `POST /metadata`.** Unlike every other route, `/metadata` hands
its `url` field straight to the `ffprobe` subprocess instead of going through the downloader,
because it's only probing metadata, not producing output. That means FFmpeg's own protocol layer
(`file:`, `concat:`, `subfile:`, `pipe:`, etc.) would otherwise be reachable directly through this
one field. It's mitigated by rejecting any non-`http(s)` scheme at the Pydantic layer and setting
`-protocol_whitelist http,https,tcp,tls` on the ffprobe invocation (`app/routes/metadata.py`), so
a fetched playlist/manifest can't reference local files either. `POST /metadata/upload` doesn't
have this problem — it always probes a file this server just wrote to disk.

**4. Same-origin short-circuit.** When a supplied URL points back at this server's own `/files/`
or `/store/` path, `download_file()` copies the file directly from disk instead of making an HTTP
request (`app/utils/downloader.py: _local_path_for_url`). This is a deliberate perf/reliability
optimization (avoids Docker loopback networking issues) — but it means a self-referencing URL is
trusted as-is, with no re-validation of what's already on disk.

**5. Subprocess boundary — FFmpeg/ffprobe.** Every processing and metadata endpoint eventually
runs `ffmpeg`/`ffprobe` against attacker-influenced bytes (`app/utils/ffmpeg.py`). Parser
vulnerabilities in FFmpeg itself are FFmpeg's attack surface, not this project's, but they're real
if you're processing media from untrusted sources — keep the FFmpeg build in the Docker image
current.

**6. Output/storage boundary.** `/files/*` and `/store/*` are unauthenticated `StaticFiles`
mounts (`app/main.py`) — the random 8-hex-char filename in the URL *is* the access token, not the
`X-API-Key` header. There's no TTL or auto-expiry; output accumulates until purged via the
`DELETE` endpoints. See [Storage](#storage) above for the two areas this covers.

---

## Project Structure

```
ChromaFFmpeg/
├── app/
│   ├── main.py               # FastAPI app, router registration, static mounts
│   ├── auth.py               # API key header verification
│   ├── routes/
│   │   ├── merge.py          # Merge video + audio (volume control, strategy)
│   │   ├── animate.py        # Ken Burns / zoom / pan effects
│   │   ├── combine.py        # Concatenate multiple files (default folder: main)
│   │   ├── image_to_video.py # Image → MP4 with optional animation
│   │   ├── loop.py           # Repeat a clip N times via concat demuxer
│   │   ├── transitions.py    # xfade + acrossfade transitions
│   │   ├── metadata.py       # ffprobe media info
│   │   ├── upload.py         # Binary upload → persistent URL (smart default folders)
│   │   ├── folders.py        # Named folder CRUD
│   │   └── files.py          # List / purge job outputs
│   └── utils/
│       ├── downloader.py     # HTTP download + direct disk copy for self-referencing URLs
│       ├── ffmpeg.py         # FFmpeg/ffprobe subprocess wrappers + duration probing
│       ├── cleanup.py        # Job directory management
│       ├── folders.py        # Folder utilities (sanitize, create, list, delete)
│       └── url.py            # file_url() and folder_url() helpers
├── static/
│   ├── index.html            # Web UI (Alpine.js)
│   └── app.js                # Frontend state and API calls
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## Notes

- Output files and uploaded files are **never deleted automatically** — purge via the UI or the DELETE endpoints
- `/files/` and `/store/` routes are **unauthenticated** — the URL acts as the access token; add a reverse proxy with auth if needed
- All output filenames are **randomized** (8-character hex + extension) — collisions are impossible
- Folders are **created automatically** — you never need to pre-create a folder before using it
- When a processing endpoint downloads a `/store/` or `/files/` URL from this server, it reads the file directly from disk (no HTTP round-trip) — this avoids Docker networking issues and is faster
- `/merge` with `audio_volume` or `video_audio_volume` re-encodes audio to AAC; without volume params it stream-copies audio (faster, lossless)
- The `zoompan` filter (`/animate`, `/image-to-video`) is CPU-intensive — a 6 s 1080p animation can take 30–90 s depending on hardware
- `/combine` with `reencode: false` requires all inputs to share the same codec, resolution, and sample rate; use `reencode: true` for mixed sources
- `/concat-transitions` requires all clips to share the same resolution and fps — the xfade filter errors if dimensions differ
- `/loop` uses the concat demuxer with stream copy — output is generated near-instantly regardless of loop count
- `/merge` duration probing tries the container header first, then falls back to stream-level headers; if both fail the response includes a `"warning"` and uses `-shortest` as a safe fallback
- `/upload` chunks file reads at 1 MB and enforces a 500 MB hard limit
