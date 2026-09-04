# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ChromaFFmpeg is a self-hosted FFmpeg REST API with a built-in web UI (Alpine.js). Clients submit media URLs or upload binary files; the server processes them with FFmpeg/ffprobe subprocesses and returns a persistent URL. Stack: Python 3.11, FastAPI, FFmpeg, Docker.

## Running locally

There's no test suite, linter config, or build step — this is a straightforward FastAPI app.

```bash
pip install -r requirements.txt
cp .env.example .env       # set API_KEY, BASE_URL
mkdir -p /data/outputs /data/folders   # or set OUTPUTS_DIR/FOLDERS_DIR to local paths in .env
uvicorn app.main:app --reload --port 9000
```

Requires `ffmpeg`/`ffprobe` on PATH locally (the Dockerfile installs them via apt).

Docker (matches production deploy):

```bash
docker compose up --build -d
docker logs -f chromaffmpeg-chromaffmpeg-1
```

Manual smoke test after changes — hit the endpoint with curl (see README.md for full examples per route) or use the web UI at `http://localhost:9000`. Swagger UI is at `/docs`.

## Architecture

**Request flow (all processing endpoints follow this shape):**

1. Route handler in `app/routes/*.py` creates an isolated job directory via `make_job_dir()` (`app/utils/cleanup.py`) — a UUID dir under `OUTPUTS_DIR`.
2. Input URLs are fetched via `download_file()` (`app/utils/downloader.py`). If the URL points at this same server's own `/store/` or `/files/` output, it's copied directly from disk instead of going through HTTP — this is why `BASE_URL` must be set correctly, and it's what lets processing endpoints chain off each other's output.
3. FFmpeg/ffprobe run as subprocesses via `run_ffmpeg()` / `run_ffprobe()` / `probe_duration()` (`app/utils/ffmpeg.py`). Non-zero exit raises `HTTPException` with the FFmpeg stderr tail attached — this is the single source of FFmpeg error handling; don't reimplement subprocess calls in route files.
4. On any exception, the job directory is deleted via `cleanup_job_dir()` before re-raising (see the `try/except Exception: cleanup_job_dir(job_dir); raise` pattern in every route).
5. Output is finalized through `resolve_output()` (`app/utils/folders.py`), which returns either a `/files/{job_id}/` job URL (no `folder` given) or copies the file into `/data/folders/{folder}/` and returns a `/store/{folder}/` URL (folder auto-created, filename de-duplicated).

**Two storage areas, both Docker volumes, both unauthenticated at the URL level (the random filename is the access token):**
- `OUTPUTS_DIR` (`/data/outputs/{uuid}/`, served at `/files/`) — one-off job results, not auto-cleaned; purge via `DELETE /files`.
- `FOLDERS_DIR` (`/data/folders/{name}/`, served at `/store/`) — persistent named collections (`upload`, `audio`, `main` are built-in defaults; anything else is user-created on demand).

**Auth:** every route except `/health`, `/`, and the static/`/files`/`/store` mounts depends on `verify_api_key` (`app/auth.py`) via `APIRouter(dependencies=[Depends(verify_api_key)])` at the top of each route module — add new routers the same way rather than per-endpoint `Depends`.

**Error shape is global and consistent** — everything returns `{"detail": {"error": "...", "detail": "...optional raw stderr..."}}`. This is enforced by the `RequestValidationError` and catch-all `Exception` handlers registered in `app/main.py`; don't add competing exception handlers in route files, and raise `HTTPException(detail={"error": ...})` (dict, not string) to stay consistent.

**Adding a new processing endpoint:**
1. New file in `app/routes/`, `router = APIRouter(dependencies=[Depends(verify_api_key)])`, Pydantic request model with `folder: str | None = None` if it should support folder output.
2. Register the router in `app/main.py` (`app.include_router(...)`).
3. Follow the job-dir → download → ffmpeg → resolve_output → cleanup-on-error pattern from `app/routes/merge.py` or `app/routes/animate.py`.
4. Output filenames are always `secrets.token_hex(8) + ext` — never derive names from input filenames (collision/traversal risk).
5. Update the README (feature table + full endpoint section with curl examples) and the Swagger docstring on the route — this repo treats README.md as the canonical API reference and keeps it in sync with every endpoint.

**Frontend:** `static/index.html` + `static/app.js` is a single-page Alpine.js UI that calls the same JSON API directly from the browser, with the API key stored in `localStorage`. No build step/bundler — edit the files directly.
