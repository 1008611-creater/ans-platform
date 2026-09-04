import logging
import os
import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from app.auth import verify_api_key
from app.utils.cleanup import cleanup_job_dir, make_job_dir
from app.utils.downloader import download_file
from app.utils.ffmpeg import run_ffmpeg
from app.utils.folders import resolve_output

router = APIRouter(dependencies=[Depends(verify_api_key)])

AnimationType = Literal["zoom_in", "zoom_out", "pan_left", "pan_right", "pan_zoom"]


def get_animation_filter(
    animation: str,
    duration: float,
    fps: int,
    resolution: str = "1920x1080",
) -> str:
    if not re.match(r"^\d+x\d+$", resolution):
        raise HTTPException(status_code=400, detail={"error": f"Invalid resolution format: {resolution}"})

    total_frames = int(duration * fps)

    filters = {
        "zoom_in": (
            f"scale=8000:-1,"
            f"zoompan=z='min(zoom+0.0015,1.5)'"
            f":x='iw/2-(iw/zoom/2)'"
            f":y='ih/2-(ih/zoom/2)'"
            f":d={total_frames}:s={resolution}:fps={fps}"
        ),
        "zoom_out": (
            f"scale=8000:-1,"
            f"zoompan=z='if(eq(on,1),1.5,max(zoom-0.0015,1.0))'"
            f":x='iw/2-(iw/zoom/2)'"
            f":y='ih/2-(ih/zoom/2)'"
            f":d={total_frames}:s={resolution}:fps={fps}"
        ),
        "pan_left": (
            f"scale=8000:-1,"
            f"zoompan=z='1.2'"
            f":x='trunc(iw/2-(iw/zoom/2))+on/{fps}*10'"
            f":y='ih/2-(ih/zoom/2)'"
            f":d={total_frames}:s={resolution}:fps={fps}"
        ),
        "pan_right": (
            f"scale=8000:-1,"
            f"zoompan=z='1.2'"
            f":x='trunc(iw-(iw/zoom)-on/{fps}*10)'"
            f":y='ih/2-(ih/zoom/2)'"
            f":d={total_frames}:s={resolution}:fps={fps}"
        ),
        "pan_zoom": (
            f"scale=8000:-1,"
            f"zoompan=z='min(zoom+0.0015,1.5)'"
            f":x='trunc(iw/2-(iw/zoom/2)+on*0.5)'"
            f":y='ih/2-(ih/zoom/2)'"
            f":d={total_frames}:s={resolution}:fps={fps}"
        ),
    }

    return filters[animation]


class AnimateRequest(BaseModel):
    media_url: str
    media_type: Literal["image", "video"] = "image"
    animation: AnimationType = "zoom_in"
    duration: float = 6.0
    fps: int = 25
    resolution: str = "1920x1080"
    folder: str | None = None


@router.post("/animate", tags=["processing"], summary="Apply Ken Burns / zoom / pan animation")
async def animate(req: AnimateRequest):
    """
    Apply a cinematic animation effect to an image or video.

    **`animation` values:** `zoom_in` · `zoom_out` · `pan_left` · `pan_right` · `pan_zoom`

    **`media_type` values:** `image` · `video`

    **Animate an image with zoom-in:**
    ```bash
    curl -X POST http://localhost:9000/animate \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "media_url": "https://example.com/photo.jpg",
        "media_type": "image",
        "animation": "zoom_in",
        "duration": 6,
        "fps": 25,
        "resolution": "1920x1080"
      }'
    ```

    **Ken Burns (pan_zoom) into a named folder (auto-created if it doesn't exist):**
    ```bash
    curl -X POST http://localhost:9000/animate \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
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

    > ⚠️ The `zoompan` filter is CPU-intensive; a 6s 1080p animation can take 30–90s.
    """
    job_dir = make_job_dir()
    try:
        input_path = await download_file(req.media_url, job_dir, "input")
        output_path = os.path.join(job_dir, "output.mp4")
        vf = get_animation_filter(req.animation, req.duration, req.fps, req.resolution)

        if req.media_type == "image":
            await run_ffmpeg([
                "-y", "-loop", "1", "-i", input_path,
                "-vf", vf,
                "-t", str(req.duration),
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                output_path,
            ])
        else:
            await run_ffmpeg([
                "-y", "-i", input_path,
                "-vf", vf,
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                output_path,
            ])

        return resolve_output(job_dir, "output.mp4", req.folder)
    except HTTPException:
        cleanup_job_dir(job_dir)
        raise
    except Exception:
        cleanup_job_dir(job_dir)
        raise
