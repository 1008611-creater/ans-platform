import os
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator

from app.auth import verify_api_key
from app.utils.cleanup import cleanup_job_dir, make_job_dir
from app.utils.downloader import download_file
from app.utils.ffmpeg import probe_duration, probe_has_audio, run_ffmpeg
from app.utils.folders import resolve_output

router = APIRouter(dependencies=[Depends(verify_api_key)])

TransitionType = Literal[
    "fade", "fadeblack", "fadewhite",
    "dissolve", "pixelize",
    "wipeleft", "wiperight", "wipeup", "wipedown",
    "slideleft", "slideright",
    "smoothleft", "smoothright",
    "radial", "circleopen", "circleclose",
]


class TransitionsRequest(BaseModel):
    urls: list[str]
    transition: TransitionType = "fade"
    transition_duration: float = 1.0
    folder: str | None = None

    @field_validator("urls")
    @classmethod
    def at_least_two(cls, v: list[str]) -> list[str]:
        if len(v) < 2:
            raise ValueError("At least 2 URLs are required")
        return v


@router.post("/concat-transitions", tags=["processing"], summary="Concatenate clips with xfade transitions")
async def concat_transitions(req: TransitionsRequest):
    """
    Concatenate video clips with smooth FFmpeg xfade transitions between them.

    **Requirements:**
    - All clips must share the same resolution and frame rate
    - Duration must be detectable for all clips
    - If all clips have audio, `acrossfade` is applied automatically

    **`transition` values:** `fade` · `fadeblack` · `fadewhite` · `dissolve` · `pixelize` ·
    `wipeleft` · `wiperight` · `wipeup` · `wipedown` · `slideleft` · `slideright` ·
    `smoothleft` · `smoothright` · `radial` · `circleopen` · `circleclose`

    **Fade transition between three clips:**
    ```bash
    curl -X POST http://localhost:9000/concat-transitions \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "urls": [
          "https://example.com/clip1.mp4",
          "https://example.com/clip2.mp4",
          "https://example.com/clip3.mp4"
        ],
        "transition": "fade",
        "transition_duration": 1.0
      }'
    ```

    **Wipe left with shorter transition:**
    ```bash
    curl -X POST http://localhost:9000/concat-transitions \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "urls": [
          "https://example.com/clip1.mp4",
          "https://example.com/clip2.mp4"
        ],
        "transition": "wipeleft",
        "transition_duration": 0.5
      }'
    ```

    **Save to a named folder (auto-created if it doesn't exist):**
    ```bash
    curl -X POST http://localhost:9000/concat-transitions \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "urls": [
          "https://example.com/clip1.mp4",
          "https://example.com/clip2.mp4",
          "https://example.com/clip3.mp4"
        ],
        "transition": "fade",
        "transition_duration": 1.0,
        "folder": "MyProject"
      }'
    ```
    """
    job_dir = make_job_dir()
    try:
        input_paths = []
        for i, url in enumerate(req.urls):
            path = await download_file(url, job_dir, f"clip_{i}")
            input_paths.append(path)

        n = len(input_paths)
        td = req.transition_duration

        raw_durations = [await probe_duration(p) for p in input_paths]
        if any(d is None for d in raw_durations):
            from fastapi import HTTPException
            raise HTTPException(status_code=422, detail={
                "error": "Could not determine duration for one or more clips. "
                         "xfade requires known durations to calculate transition offsets."
            })
        durations: list[float] = raw_durations  # type: ignore[assignment]
        has_audio = all([await probe_has_audio(p) for p in input_paths])

        # Build video xfade chain: [prev][i:v]xfade=...
        filter_parts = []
        current_v = "[0:v]"
        for i in range(1, n):
            offset = sum(durations[:i]) - td * i
            offset = max(0.01, offset)
            out_v = f"[v{i}]" if i < n - 1 else "[vout]"
            filter_parts.append(
                f"{current_v}[{i}:v]xfade=transition={req.transition}"
                f":duration={td:.3f}:offset={offset:.3f}{out_v}"
            )
            current_v = f"[v{i}]"

        # Build audio acrossfade chain if all clips have audio
        if has_audio:
            current_a = "[0:a]"
            for i in range(1, n):
                out_a = f"[a{i}]" if i < n - 1 else "[aout]"
                filter_parts.append(
                    f"{current_a}[{i}:a]acrossfade=d={td:.3f}{out_a}"
                )
                current_a = f"[a{i}]"

        filter_complex = "; ".join(filter_parts)
        input_args = []
        for p in input_paths:
            input_args.extend(["-i", p])

        map_args = ["-map", "[vout]"]
        audio_codec = ["-an"]
        if has_audio:
            map_args += ["-map", "[aout]"]
            audio_codec = ["-c:a", "aac"]

        output_path = os.path.join(job_dir, "output.mp4")
        await run_ffmpeg([
            "-y",
            *input_args,
            "-filter_complex", filter_complex,
            *map_args,
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            *audio_codec,
            output_path,
        ])

        return resolve_output(job_dir, "output.mp4", req.folder)
    except Exception:
        cleanup_job_dir(job_dir)
        raise
