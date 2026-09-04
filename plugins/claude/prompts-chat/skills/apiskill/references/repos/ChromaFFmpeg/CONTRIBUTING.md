# Contributing to ChromaFFmpeg

Thanks for considering a contribution. This is a small, self-hosted FastAPI service — the bar
for contributing is low, but a few conventions keep it maintainable.

## Development setup

```bash
git clone https://github.com/leksautomate/ChromaFFmpeg.git
cd ChromaFFmpeg
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env             # set API_KEY; BASE_URL can stay as localhost
mkdir -p /data/outputs /data/folders   # or point OUTPUTS_DIR/FOLDERS_DIR at local paths in .env
```

`ffmpeg`/`ffprobe` must be on `PATH` to actually run processing endpoints locally (not required
to run the test suite — see below). On most systems: `apt install ffmpeg`, `brew install ffmpeg`,
or the [official builds](https://ffmpeg.org/download.html) on Windows.

Run the app:

```bash
uvicorn app.main:app --reload --port 9000
```

## Running tests

```bash
pytest tests/ -v
```

The suite runs against a `TestClient` with `OUTPUTS_DIR`/`FOLDERS_DIR` pointed at a temp
directory (see `tests/conftest.py`) — no Docker or real FFmpeg binary required. CI
(`.github/workflows/ci.yml`) runs the same command on every push and PR to `master`.

**Coverage gap, honestly stated:** the FFmpeg-executing routes (`/merge`, `/animate`, `/combine`,
`/image-to-video`, `/loop`, `/concat-transitions`) aren't covered yet — that needs a real
`ffmpeg` binary plus fixture media files in CI, which is more setup than the current suite has.
Auth, folder/file management, upload routing, and the `/metadata` URL-scheme validation are
covered. Extending coverage to the FFmpeg-executing routes would be a welcome contribution.

## Code style

There's no linter or formatter wired up currently — match the surrounding code (type hints where
the file already uses them, f-strings, `HTTPException(detail={"error": ...})` for the error
shape — see below).

## Adding a new endpoint

Follow the pattern used by every existing route in `app/routes/`:

1. New file in `app/routes/`, with `router = APIRouter(dependencies=[Depends(verify_api_key)])`
   at module scope (not per-endpoint `Depends`) unless the route is intentionally public like
   `/health`.
2. Register the router in `app/main.py` via `app.include_router(...)`.
3. If the endpoint accepts a remote URL, download it through `app.utils.downloader.download_file`
   (httpx-based) rather than handing user input straight to an `ffmpeg`/`ffprobe` subprocess —
   see `app/routes/metadata.py` for why that matters and how `-protocol_whitelist` is used where
   a raw URL genuinely has to reach ffprobe directly.
4. Processing endpoints: job dir via `make_job_dir()` → download inputs → run FFmpeg via
   `run_ffmpeg()`/`run_ffprobe()` → finalize with `resolve_output()` → `cleanup_job_dir()` on any
   exception. `app/routes/merge.py` is the clearest example of the full pattern.
5. Output filenames are always `secrets.token_hex(8) + ext` — never derive filenames from user
   input.
6. Raise errors as `HTTPException(status_code=..., detail={"error": "..."})` (a dict, not a bare
   string) to keep the global error shape consistent — see the exception handlers in
   `app/main.py`.
7. Update `README.md` (the feature table **and** the full endpoint section with a curl example)
   and the route's Swagger docstring. This repo treats the README as the canonical API
   reference, kept in sync with every endpoint — PRs that add/change an endpoint without
   updating it will get asked to.
8. Add at least a basic test in `tests/` for anything that doesn't require a real FFmpeg binary
   (validation, auth, routing logic) — see `tests/test_metadata_validation.py` for the shape of
   a regression test tied to a specific security fix.

## Security-relevant changes

If your PR touches URL fetching (`app/utils/downloader.py`), file/folder path handling
(`app/utils/folders.py`, `app/utils/cleanup.py`), or how a user-controlled value reaches an
FFmpeg/ffprobe subprocess, please read [SECURITY.md](SECURITY.md) and the trust-boundary section
of the [README](README.md#architecture--trust-boundaries) first — those boundaries are there on
purpose and changes to them get closer review.

## Pull requests

- Branch off `master`, keep the diff scoped to one change.
- Make sure `pytest tests/ -v` passes locally before opening the PR (CI will also run it).
- Describe *why* the change is needed, not just what changed — the commit history and README are
  meant to stay readable as a record of intent.
