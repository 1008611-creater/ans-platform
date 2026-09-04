import os
import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import verify_api_key
from app.routes.animate import get_animation_filter
from app.utils.cleanup import cleanup_job_dir, make_job_dir
from app.utils.downloader import download_file
from app.utils.ffmpeg import run_ffmpeg
from app.utils.folders import resolve_output

router = APIRouter(dependencies=[Depends(verify_api_key)])

AnimationOption = Literal["zoom_in", "zoom_out", "pan_left", "pan_right", "pan_zoom", "none"]


class ImageToVideoRequest(BaseModel):
    image_url: str
    duration: float = 8.0
    animation: AnimationOption = "none"
    fps: int = 25
    resolution: str = "1920x1080"
    folder: str | None = None


@router.post("/image-to-video", tags=["processing"], summary="Convert a static image to MP4")
async def image_to_video(req: ImageToVideoRequest):
    """
    Convert a static image to an MP4 video, with optional Ken Burns animation.

    **`animation` values:** `none` · `zoom_in` · `zoom_out` · `pan_left` · `pan_right` · `pan_zoom`

    **Static image — no animation:**
    ```bash
    curl -X POST http://localhost:9000/image-to-video \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "image_url": "https://example.com/photo.png",
        "duration": 8,
        "animation": "none",
        "fps": 25,
        "resolution": "1920x1080"
      }'
    ```

    **Ken Burns effect:**
    ```bash
    curl -X POST http://localhost:9000/image-to-video \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "image_url": "https://example.com/photo.png",
        "duration": 8,
        "animation": "pan_zoom",
        "fps": 25,
        "resolution": "1920x1080"
      }'
    ```

    **Save to a named folder (auto-created if it doesn't exist):**
    ```bash
    curl -X POST http://localhost:9000/image-to-video \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "image_url": "https://example.com/photo.png",
        "duration": 8,
        "animation": "zoom_in",
        "fps": 25,
        "resolution": "1920x1080",
        "folder": "MyProject"
      }'
    ```
    """
    if not re.match(r"^\d+x\d+$", req.resolution):
        raise HTTPException(status_code=400, detail={"error": f"Invalid resolution format: {req.resolution}"})

    w, h = req.resolution.split("x")

    job_dir = make_job_dir()
    try:
        input_path = await download_file(req.image_url, job_dir, "image")
        output_path = os.path.join(job_dir, "output.mp4")

        if req.animation == "none":
            await run_ffmpeg([
                "-y", "-loop", "1", "-i", input_path,
                "-t", str(req.duration),
                "-vf", (
                    f"scale={w}:{h}:force_original_aspect_ratio=decrease,"
                    f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2"
                ),
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                output_path,
            ])
        else:
            vf = get_animation_filter(req.animation, req.duration, req.fps, req.resolution)
            await run_ffmpeg([
                "-y", "-loop", "1", "-i", input_path,
                "-vf", vf,
                "-t", str(req.duration),
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
