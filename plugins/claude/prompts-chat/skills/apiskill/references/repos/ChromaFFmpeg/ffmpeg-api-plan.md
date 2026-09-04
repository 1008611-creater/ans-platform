# FFmpeg API — Full Build Plan
**Project Name:** ChromaFFmpeg API  
**Stack:** Python (FastAPI) + FFmpeg + Docker  
**Deploy:** Self-hosted VPS (same style as No Code Architects Toolkit)  
**Output:** All processing endpoints return raw binary (video/audio file)

---

## Architecture Overview

```
Client (curl / n8n / any HTTP tool)
        │
        ▼
  FastAPI Server (Python)
        │
        ├─ Downloads URLs → temp files
        ├─ Runs FFmpeg subprocess
        ├─ Streams binary back to client
        └─ Cleans up temp files
```

Everything is stateless. No database. No file storage. Just FFmpeg in, binary out.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Language | Python 3.11 | Fast to build, great FFmpeg subprocess control |
| Framework | FastAPI | Async, auto docs at `/docs`, binary streaming |
| Media Engine | FFmpeg (system) | Handles everything: merge, combine, animate, convert |
| Containerize | Docker + Docker Compose | Easy VPS deploy like NCAT |
| Auth | API Key header (`X-API-Key`) | Simple, works with curl |
| Temp files | `/tmp/ffmpeg_jobs/` | Auto-cleanup after every request |

---

## Project File Structure

```
chromaffmpeg/
├── app/
│   ├── main.py               # FastAPI app entry point
│   ├── routes/
│   │   ├── merge.py          # Feature 1: Audio + Video merge
│   │   ├── animate.py        # Feature 2: Ken Burns / Pan & Zoom
│   │   ├── combine.py        # Feature 3: Combine multiple videos/audios
│   │   ├── metadata.py       # Feature 4: Get duration/metadata
│   │   └── image_to_video.py # Feature 5: Image → Video
│   └── utils/
│       ├── downloader.py     # Download files from URLs to /tmp
│       ├── ffmpeg.py         # FFmpeg subprocess wrapper
│       └── cleanup.py        # Temp file cleanup helper
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env
```

---

## Feature 1 — Merge Audio + Video (Stretch Video to Match Audio)

**Endpoint:** `POST /merge`

**What it does:**  
Takes a video URL and audio URL. If the audio is longer than the video, it slows the video down (using FFmpeg's `setpts` filter) so the video ends exactly when the audio ends. Output is an MP4 binary.

**Request Body (JSON):**
```json
{
  "video_url": "https://example.com/video.mp4",
  "audio_url": "https://example.com/audio.mp3"
}
```

**curl Example:**
```bash
curl -X POST https://your-vps.com/merge \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"video_url": "https://example.com/video.mp4", "audio_url": "https://example.com/audio.mp3"}' \
  --output merged_output.mp4
```

**FFmpeg Logic:**
```
1. Download video → /tmp/job_xxx/video.mp4
2. Download audio → /tmp/job_xxx/audio.mp3
3. Probe both durations (ffprobe)
4. Calculate speed factor = video_duration / audio_duration
   (e.g. video=8s, audio=10s → factor = 0.8 → slow video to 80% speed)
5. Run FFmpeg:
   ffmpeg -i video.mp4 -i audio.mp3
     -filter:v "setpts=(1/SPEED_FACTOR)*PTS"
     -c:a copy
     -shortest output.mp4
6. Stream output.mp4 as binary response
```

**Response:** Binary MP4 file stream  
**Content-Type:** `video/mp4`

---

## Feature 2 — Ken Burns / Pan & Zoom Animation

**Endpoint:** `POST /animate`

**What it does:**  
Takes an image OR a video URL and applies a cinematic animation effect: pan left, pan right, zoom in, zoom out, or combined pan+zoom. Outputs an MP4.

**Request Body (JSON):**
```json
{
  "media_url": "https://example.com/image.jpg",
  "media_type": "image",
  "animation": "zoom_in",
  "duration": 6,
  "fps": 25
}
```

**Supported `animation` values:**
| Value | Effect |
|---|---|
| `zoom_in` | Slowly zooms into center |
| `zoom_out` | Starts zoomed in, pulls back |
| `pan_left` | Camera moves left to right |
| `pan_right` | Camera moves right to left |
| `pan_zoom` | Pan + zoom combined (Ken Burns) |

**curl Example:**
```bash
curl -X POST https://your-vps.com/animate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "media_url": "https://example.com/photo.jpg",
    "media_type": "image",
    "animation": "pan_zoom",
    "duration": 6,
    "fps": 25
  }' \
  --output animated.mp4
```

**FFmpeg Logic (zoom_in example):**
```
ffmpeg -loop 1 -i image.jpg -vf
  "scale=8000:-1,
   zoompan=z='min(zoom+0.0015,1.5)':
           x='iw/2-(iw/zoom/2)':
           y='ih/2-(ih/zoom/2)':
           d=150:s=1920x1080:fps=25"
  -t 6 -c:v libx264 -pix_fmt yuv420p output.mp4
```

**Response:** Binary MP4 file stream  
**Content-Type:** `video/mp4`

---

## Feature 3 — Combine Multiple Videos or Audios into One

**Endpoint:** `POST /combine`

**What it does:**  
Takes a list of MP4 or MP3 URLs and concatenates them all into one single output file. Returns the combined file as binary.

**Request Body (JSON):**
```json
{
  "type": "video",
  "urls": [
    "https://example.com/clip1.mp4",
    "https://example.com/clip2.mp4",
    "https://example.com/clip3.mp4"
  ]
}
```

Set `"type": "audio"` to combine MP3 files instead.

**curl Example (combining videos):**
```bash
curl -X POST https://your-vps.com/combine \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "type": "video",
    "urls": [
      "https://example.com/clip1.mp4",
      "https://example.com/clip2.mp4"
    ]
  }' \
  --output combined.mp4
```

**curl Example (combining audios):**
```bash
curl -X POST https://your-vps.com/combine \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "type": "audio",
    "urls": [
      "https://example.com/part1.mp3",
      "https://example.com/part2.mp3"
    ]
  }' \
  --output combined.mp3
```

**FFmpeg Logic:**
```
1. Download all files → /tmp/job_xxx/file_0.mp4, file_1.mp4 ...
2. Create concat list file:
   file '/tmp/job_xxx/file_0.mp4'
   file '/tmp/job_xxx/file_1.mp4'
3. Run FFmpeg:
   ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4
4. Stream binary output
```

**Response:** Binary MP4 or MP3 file stream

---

## Feature 4 — Get Media Duration / Metadata

**Endpoint:** `POST /metadata`

**What it does:**  
Takes a URL to any video or audio file and returns its duration in seconds plus basic metadata. No FFmpeg processing — just an ffprobe call.

**Request Body (JSON):**
```json
{
  "url": "https://example.com/video.mp4"
}
```

**curl Example:**
```bash
curl -X POST https://your-vps.com/metadata \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"url": "https://example.com/audio.mp3"}'
```

**Response (JSON):**
```json
{
  "duration_seconds": 47.32,
  "duration_formatted": "00:00:47",
  "format": "mp4",
  "size_bytes": 4823042,
  "video_streams": 1,
  "audio_streams": 1,
  "width": 1920,
  "height": 1080,
  "fps": 25.0,
  "bitrate_kbps": 2048
}
```

**ffprobe Command Used:**
```bash
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
```

**Response:** JSON (not binary)  
**Content-Type:** `application/json`

---

## Feature 5 — Image to Video (with Animation)

**Endpoint:** `POST /image-to-video`

**What it does:**  
Converts a static image into an MP4 video of a specified duration, with an optional animation effect applied (same animation types as Feature 2).

**Request Body (JSON):**
```json
{
  "image_url": "https://example.com/photo.jpg",
  "duration": 8,
  "animation": "zoom_in",
  "fps": 25,
  "resolution": "1920x1080"
}
```

**Supported `animation` values:** `zoom_in`, `zoom_out`, `pan_left`, `pan_right`, `pan_zoom`, `none`

**curl Example:**
```bash
curl -X POST https://your-vps.com/image-to-video \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "image_url": "https://example.com/photo.png",
    "duration": 8,
    "animation": "zoom_in",
    "fps": 25,
    "resolution": "1920x1080"
  }' \
  --output image_video.mp4
```

**FFmpeg Logic (no animation):**
```
ffmpeg -loop 1 -i photo.jpg -t 8 -c:v libx264 -pix_fmt yuv420p
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,
       pad=1920:1080:(ow-iw)/2:(oh-ih)/2"
  output.mp4
```

With animation: same as Feature 2 zoompan filter applied on top.

**Response:** Binary MP4 file stream  
**Content-Type:** `video/mp4`

---

## Authentication

All endpoints require the header:
```
X-API-Key: your-secret-key
```

Set the key in `.env`:
```
API_KEY=your-secret-key-here
```

If the key is wrong or missing, the API returns `401 Unauthorized`.

---

## Docker Setup (VPS Deploy)

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

**docker-compose.yml:**
```yaml
version: "3.8"
services:
  chromaffmpeg:
    build: .
    ports:
      - "8080:8080"
    env_file:
      - .env
    volumes:
      - /tmp/ffmpeg_jobs:/tmp/ffmpeg_jobs
    restart: unless-stopped
```

**Deploy on VPS:**
```bash
git clone https://github.com/you/chromaffmpeg.git
cd chromaffmpeg
cp .env.example .env
# edit .env with your API key
docker compose up -d
```

Your API is now live at `http://your-vps-ip:8080`  
Auto-docs available at `http://your-vps-ip:8080/docs`

---

## Error Response Format

All errors return JSON:
```json
{
  "error": "Description of what went wrong",
  "detail": "FFmpeg stderr or Python traceback (optional)"
}
```

Common HTTP codes:
- `400` — Bad input (missing URL, unsupported format)
- `401` — Invalid or missing API key
- `422` — Validation error (wrong field types)
- `500` — FFmpeg processing failed

---

## requirements.txt

```
fastapi==0.111.0
uvicorn==0.29.0
httpx==0.27.0
python-dotenv==1.0.1
aiofiles==23.2.1
```

---

## Build Order (Recommended)

| Step | What to Build |
|---|---|
| 1 | Project scaffold + Docker + auth middleware |
| 2 | `/metadata` endpoint (simplest — ffprobe only, no output file) |
| 3 | `/merge` endpoint (core feature) |
| 4 | `/image-to-video` endpoint (no animation first, then add animation) |
| 5 | `/animate` endpoint (Ken Burns filter) |
| 6 | `/combine` endpoint (concat filter) |
| 7 | Error handling + cleanup + logging |
| 8 | Deploy to VPS with Docker Compose |

---

## Summary — All Endpoints at a Glance

| Method | Endpoint | Input | Output |
|---|---|---|---|
| POST | `/merge` | video_url + audio_url | Binary MP4 |
| POST | `/animate` | media_url + animation type | Binary MP4 |
| POST | `/combine` | list of URLs + type | Binary MP4 or MP3 |
| POST | `/metadata` | any media URL | JSON metadata |
| POST | `/image-to-video` | image_url + duration + animation | Binary MP4 |
| GET | `/health` | — | `{"status": "ok"}` |
| GET | `/docs` | — | Auto Swagger UI |
