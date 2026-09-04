# Edit API

FastAPI backend for video processing. Upload videos, trim, overlay image/video, watermark, transcode. Jobs run in the background and persist to Postgres. Everything is containerized.

## What it does

- Uploads videos and stores metadata
- Trims by time range
- Overlays: text, image, video (positioning with expressions like `(W-w)/2`)
- Watermark endpoint (image, full duration)
- Transcodes to 1080p/720p/480p
- Background jobs with progress and error reporting
- OpenAPI docs

## Paths and storage

- Uploads: `backend/data/uploads`
- Variants (trim/overlay/watermark): `backend/data/variants`
- Transcodes: `backend/data/processed`
- Assets (read-only in container): host `backend/assets` → container `/app/assets`

Case-sensitive paths. Use absolute container paths like `/app/assets/image.png`.

## Run with Docker

```bash
cd backend
cp env.example .env
docker compose up --build
```

Services
- API: http://localhost:8000 (docs at `/docs`)
- Postgres: localhost:5432
- Adminer (DB UI): http://localhost:8080 (System: PostgreSQL, Server: db, User/Pass: videos, DB: videos)

## Local dev (optional)

```bash
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

## API quick refs

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

Overlay (image/video)
```bash
curl -X POST http://localhost:8000/overlays \
  -H 'Content-Type: application/json' \
  -d '{
    "video_id": "uuid",
    "overlays": [
      {"type":"image","image_path":"/app/assets/image.png","x":"(W-w)/2","y":"20","start":0,"end":null,"opacity":0.85},
      {"type":"video","video_path":"/app/assets/video.mov","x":"(W-w)/2","y":"H-h-20","start":0,"end":4}
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
    "watermark": {"image_path":"/app/assets/image.png","x":"W-w-20","y":"H-h-20","opacity":0.35}
  }'
```

Job status
```bash
curl http://localhost:8000/jobs/status/{job_id}
```

## Notes that matter

- Assets must be inside `/app/assets` in the container; use correct case
- Video overlay: you can omit `scale` and ship pre-sized overlay assets
- Expressions: `W/H` are main video dims, `w/h` are overlay dims
- DB is the source of truth for job status (`PENDING/STARTED/SUCCESS/FAILURE`)

## Structure
```
backend/
  app/            # API, services, db, core
  alembic/        # migrations
  assets/         # mounted to /app/assets (ro)
  data/           # uploads, variants, processed
  docker/         # scripts
  docker-compose.yml
```

## Config
- See `env.example`. Defaults work for local Docker.

## Troubleshooting
- Path errors: check the exact container path and filename case
- FFmpeg failures: inspect `docker compose logs api` around the job time
- Adminer cannot connect: ensure Server=`db`, creds from `.env`
