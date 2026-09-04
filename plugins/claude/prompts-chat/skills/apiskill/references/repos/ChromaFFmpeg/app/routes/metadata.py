import json
import logging
import os
from datetime import timedelta
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, field_validator

from app.auth import verify_api_key
from app.utils.cleanup import cleanup_job_dir, make_job_dir
from app.utils.ffmpeg import run_ffprobe

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(verify_api_key)])

# ffprobe is handed this URL directly (not via the httpx downloader), so its own
# protocol layer would otherwise happily open file:, concat:, subfile:, etc.
# Restricting both the input scheme and ffprobe's protocol_whitelist closes that off.
FFPROBE_URL_PROTOCOLS = "http,https,tcp,tls"


class MetadataRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def _require_http_scheme(cls, v: str) -> str:
        if urlparse(v).scheme.lower() not in ("http", "https"):
            raise ValueError("url must be an http:// or https:// URL")
        return v


def _parse_ffprobe_output(output: str, source: str) -> dict:
    try:
        data = json.loads(output)
    except json.JSONDecodeError as e:
        logger.error("ffprobe returned invalid JSON for %s: %s", source, e)
        raise HTTPException(status_code=500, detail={"error": "ffprobe returned invalid output"})

    fmt = data.get("format", {})
    streams = data.get("streams", [])

    video_streams = [s for s in streams if s.get("codec_type") == "video"]
    audio_streams = [s for s in streams if s.get("codec_type") == "audio"]
    first_video = video_streams[0] if video_streams else {}

    fps_raw = first_video.get("r_frame_rate", "0/1")
    try:
        num, den = fps_raw.split("/")
        fps = round(int(num) / int(den), 3) if int(den) != 0 else 0.0
    except Exception:
        fps = 0.0

    try:
        duration = float(fmt.get("duration", 0) or 0)
        size_bytes = int(fmt.get("size", 0) or 0)
        bitrate_kbps = round(int(fmt.get("bit_rate", 0) or 0) / 1000)
    except (TypeError, ValueError) as e:
        logger.error("Failed to parse numeric metadata fields for %s: %s", source, e)
        raise HTTPException(status_code=500, detail={"error": "Failed to parse media metadata"})

    return {
        "duration_seconds": round(duration, 3),
        "duration_formatted": str(timedelta(seconds=int(duration))),
        "format": fmt.get("format_name", "").split(",")[0],
        "size_bytes": size_bytes,
        "video_streams": len(video_streams),
        "audio_streams": len(audio_streams),
        "width": first_video.get("width"),
        "height": first_video.get("height"),
        "fps": fps,
        "bitrate_kbps": bitrate_kbps,
    }


@router.post("/metadata", tags=["media"], summary="Get media metadata from a URL")
async def get_metadata(req: MetadataRequest):
    """
    Returns duration, format, resolution, fps, bitrate, and stream counts for any media URL.

    To probe a local file by uploading it directly, use `POST /metadata/upload` instead.

    ```bash
    curl -X POST http://localhost:9000/metadata \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{"url": "https://example.com/video.mp4"}'
    ```
    """
    output = await run_ffprobe([
        "-v", "quiet",
        "-protocol_whitelist", FFPROBE_URL_PROTOCOLS,
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        req.url,
    ])
    return _parse_ffprobe_output(output, req.url)


@router.post("/metadata/upload", tags=["media"], summary="Get media metadata from an uploaded binary file")
async def get_metadata_upload(file: UploadFile = File(...)):
    """
    Upload a binary file and get its metadata — duration, format, resolution, fps, bitrate, and stream counts.

    Useful when you have a local file and don't want to upload it to storage first.
    The file is deleted immediately after probing.

    **curl:**
    ```bash
    curl -X POST http://localhost:9000/metadata/upload \\
      -H "X-API-Key: your-secret-key" \\
      -F "file=@/path/to/video.mp4"
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
    """
    job_dir = make_job_dir()
    try:
        raw_name = os.path.basename(file.filename or "upload") or "upload"
        dest_path = os.path.join(job_dir, raw_name)

        content = await file.read()
        with open(dest_path, "wb") as f:
            f.write(content)

        output = await run_ffprobe([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            dest_path,
        ])
        return _parse_ffprobe_output(output, raw_name)
    except HTTPException:
        raise
    except Exception:
        raise
    finally:
        cleanup_job_dir(job_dir)
