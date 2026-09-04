# Video Processing Backend — Setup Guide

This repository contains a FastAPI backend for video processing. It runs with Docker (API + Postgres), handles uploads, trimming, overlays (text/image/video), watermark, and transcoding. Jobs run in the background.

## Requirements
- Docker Desktop
- Optional: `uv` for local development

## Run with Docker
```bash
cd /Users/sarthak/Developer/video-editor/backend
cp env.example .env
docker compose up --build
```

Endpoints
- API: http://localhost:8000 (OpenAPI docs at `/docs`)
- DB UI (Adminer): http://localhost:8080
  - System: PostgreSQL
  - Server: db
  - Username: videos
  - Password: videos
  - Database: videos

## Storage layout
- Uploads: `backend/data/uploads`
- Variants (trim/overlay/watermark): `backend/data/variants`
- Transcodes: `backend/data/processed`
- Assets (mounted read-only): host `backend/assets` → container `/app/assets`

Use absolute container paths in requests. Paths are case-sensitive.

## Local development (optional)
```bash
cd /Users/sarthak/Developer/video-editor/backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

## Minimal API usage
Upload
```bash
curl -X POST http://localhost:8000/videos/upload \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@video.mp4'
```

Trim
```bash
curl -X POST http://localhost:8000/trim \
  -H 'Content-Type: application/json' \
  -d '{"video_id":"uuid","start":"00:00:05","end":"00:00:15"}'
```

Overlay (image + optional video)
```bash
curl -X POST http://localhost:8000/overlays \
  -H 'Content-Type: application/json' \
  -d '{
    "video_id": "uuid",
    "overlays": [
      {"type":"image","image_path":"/app/assets/overlay/Overlay.png","x":"(W-w)/2","y":"20","start":0,"end":null,"opacity":0.85},
      {"type":"video","video_path":"/app/assets/overlay/B-roll-1.mp4","x":"(W-w)/2","y":"H-h-20","start":0,"end":4}
    ],
    "watermark": null
  }'
```

Watermark (full duration)
```bash
curl -X POST http://localhost:8000/overlays/watermark \
  -H 'Content-Type: application/json' \
  -d '{
    "video_id": "uuid",
    "watermark": {"image_path":"/app/assets/overlay/Overlay.png","x":"W-w-20","y":"H-h-20","opacity":0.35}
  }'
```

Job status
```bash
curl http://localhost:8000/jobs/status/{job_id}
```

## Notes
- Use container paths for assets: `/app/assets/...` (case-sensitive)
- Expressions for overlay positioning: `W/H` = main video dims, `w/h` = overlay dims
- Jobs: `PENDING`, `STARTED`, `SUCCESS`, `FAILURE`. Check logs for FFmpeg errors: `docker compose logs api`

## Structure
```
backend/
  app/
  alembic/
  assets/
  data/
  docker/
  docker-compose.yml
```
