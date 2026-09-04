import os
import secrets
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator

from app.auth import verify_api_key
from app.utils.cleanup import cleanup_job_dir, make_job_dir
from app.utils.downloader import download_file
from app.utils.ffmpeg import run_ffmpeg
from app.utils.folders import resolve_output

router = APIRouter(dependencies=[Depends(verify_api_key)])


class CombineRequest(BaseModel):
    type: Literal["video", "audio"]
    urls: list[str]
    reencode: bool = False
    folder: str | None = None

    @field_validator("urls")
    @classmethod
    def at_least_two(cls, v: list[str]) -> list[str]:
        if len(v) < 2:
            raise ValueError("At least 2 URLs are required")
        return v


@router.post("/combine", tags=["processing"], summary="Concatenate multiple video or audio files")
async def combine(req: CombineRequest):
    """
    Concatenate multiple video or audio files into a single output.

    Output is saved to the **`main`** folder by default. Override with `"folder"` in the request body.
    Folders are created automatically if they don't exist. Output filename is randomized.

    Set `reencode: true` for mixed-codec sources (slower but always compatible).
    Use `GET /folders/{name}/urls` to get the payload directly from a folder.

    **Combine videos — output goes to "main" folder by default:**
    ```bash
    curl -X POST http://localhost:9000/combine \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "type": "video",
        "urls": [
          "https://example.com/clip1.mp4",
          "https://example.com/clip2.mp4"
        ],
        "reencode": false
      }'
    ```

    **Re-encode for mixed sources:**
    ```bash
    curl -X POST http://localhost:9000/combine \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "type": "video",
        "urls": [
          "https://example.com/clip1.mp4",
          "https://example.com/clip2.mov"
        ],
        "reencode": true
      }'
    ```

    **Combine audio files:**
    ```bash
    curl -X POST http://localhost:9000/combine \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "type": "audio",
        "urls": [
          "https://example.com/part1.mp3",
          "https://example.com/part2.mp3"
        ],
        "reencode": false
      }'
    ```

    **Override output folder:**
    ```bash
    curl -X POST http://localhost:9000/combine \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "type": "video",
        "urls": [
          "https://example.com/clip1.mp4",
          "https://example.com/clip2.mp4"
        ],
        "reencode": false,
        "folder": "MyProject"
      }'
    ```
    """
    job_dir = make_job_dir()
    try:
        input_paths = []
        for i, url in enumerate(req.urls):
            path = await download_file(url, job_dir, f"file_{i}")
            input_paths.append(path)

        filelist_path = os.path.join(job_dir, "filelist.txt")
        with open(filelist_path, "w") as f:
            for p in input_paths:
                f.write(f"file '{p}'\n")

        ext = "mp4" if req.type == "video" else "mp3"
        output_filename = secrets.token_hex(8) + f".{ext}"
        output_path = os.path.join(job_dir, output_filename)

        codec_args = ["-c:v", "libx264", "-c:a", "aac", "-ar", "44100"] if req.reencode else ["-c", "copy"]

        await run_ffmpeg([
            "-y", "-f", "concat", "-safe", "0",
            "-i", filelist_path,
            *codec_args,
            output_path,
        ])

        effective_folder = req.folder if req.folder else "main"
        return resolve_output(job_dir, output_filename, effective_folder)
    except Exception:
        cleanup_job_dir(job_dir)
        raise
