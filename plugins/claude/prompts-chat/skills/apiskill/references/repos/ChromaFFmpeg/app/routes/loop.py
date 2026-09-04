import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import verify_api_key
from app.utils.cleanup import cleanup_job_dir, make_job_dir
from app.utils.downloader import download_file
from app.utils.ffmpeg import run_ffmpeg
from app.utils.folders import resolve_output

router = APIRouter(dependencies=[Depends(verify_api_key)])


class LoopRequest(BaseModel):
    video_url: str
    loop_count: int = 3
    folder: str | None = None


@router.post("/loop", tags=["processing"], summary="Repeat a video clip N times")
async def loop_video(req: LoopRequest):
    """
    Repeat a video clip N times using stream copy — no re-encoding, near-instant output.

    `loop_count` must be between 2 and 50.

    ```bash
    curl -X POST http://localhost:9000/loop \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "video_url": "https://example.com/clip.mp4",
        "loop_count": 4
      }'
    ```

    **Save looped output to a named folder (auto-created if it doesn't exist):**
    ```bash
    curl -X POST http://localhost:9000/loop \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "video_url": "https://example.com/clip.mp4",
        "loop_count": 4,
        "folder": "MyProject"
      }'
    ```
    """
    if req.loop_count < 2:
        raise HTTPException(status_code=400, detail={"error": "loop_count must be at least 2"})
    if req.loop_count > 50:
        raise HTTPException(status_code=400, detail={"error": "loop_count cannot exceed 50"})

    job_dir = make_job_dir()
    try:
        input_path = await download_file(req.video_url, job_dir, "input")

        filelist_path = os.path.join(job_dir, "filelist.txt")
        with open(filelist_path, "w") as f:
            for _ in range(req.loop_count):
                f.write(f"file '{input_path}'\n")

        output_path = os.path.join(job_dir, "output.mp4")
        await run_ffmpeg([
            "-y", "-f", "concat", "-safe", "0",
            "-i", filelist_path,
            "-c", "copy",
            output_path,
        ])

        return resolve_output(job_dir, "output.mp4", req.folder)
    except HTTPException:
        cleanup_job_dir(job_dir)
        raise
    except Exception:
        cleanup_job_dir(job_dir)
        raise
