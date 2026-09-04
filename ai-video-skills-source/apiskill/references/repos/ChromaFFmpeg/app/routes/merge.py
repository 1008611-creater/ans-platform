import logging
import os
import secrets
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

from app.auth import verify_api_key
from app.utils.cleanup import cleanup_job_dir, make_job_dir
from app.utils.downloader import download_file
from app.utils.ffmpeg import probe_duration, run_ffmpeg
from app.utils.folders import resolve_output

router = APIRouter(dependencies=[Depends(verify_api_key)])


class MergeRequest(BaseModel):
    video_url: str
    audio_url: str
    strategy: Literal["speed_match", "trim_or_slow", "trim"] = "speed_match"
    folder: str | None = None
    audio_volume: float = Field(default=1.0, ge=0.0, le=4.0,
        description="Volume multiplier for the added audio file (1.0 = original, 0.5 = half, 2.0 = double)")
    video_audio_volume: float = Field(default=0.0, ge=0.0, le=4.0,
        description="Volume of the video's original audio to mix in (0.0 = mute/ignore, 0.3 = 30%)")


def _audio_fc_and_maps(audio_volume: float, video_audio_volume: float):
    """
    Returns (filter_complex_audio_segment | None, audio_map_args, needs_audio_encode).

    If video_audio_volume > 0, the video's original audio is mixed with the
    added audio using amix. Otherwise only the added audio is used.
    """
    if video_audio_volume > 0:
        fc = (
            f"[0:a]volume={video_audio_volume:.4f}[va];"
            f"[1:a]volume={audio_volume:.4f}[aa];"
            f"[va][aa]amix=inputs=2:duration=first[aout]"
        )
        return fc, ["-map", "[aout]"], True
    elif audio_volume != 1.0:
        return f"[1:a]volume={audio_volume:.4f}[aout]", ["-map", "[aout]"], True
    else:
        return None, ["-map", "1:a:0"], False


@router.post("/merge", tags=["processing"], summary="Merge video and audio")
async def merge_audio_video(req: MergeRequest):
    """
    Merge a video file and an audio file. The `strategy` controls how length mismatches are handled.

    | strategy | video > audio | audio > video |
    |---|---|---|
    | `trim_or_slow` (default) | Trim video to audio length | Slow video to fill audio |
    | `speed_match` | Speed/slow video to match audio exactly | Speed/slow video to match audio |
    | `trim` | Cut at the shorter stream | Cut at the shorter stream |

    **Volume control:**
    - `audio_volume`: multiplier for the added audio (default `1.0`). Use `0.5` for half, `2.0` for double.
    - `video_audio_volume`: volume of the video's original audio to mix in (default `0.0` = ignore).
      Set to e.g. `0.2` to keep a quiet background track from the video while the added audio plays.

    **Basic merge:**
    ```bash
    curl -X POST http://localhost:9000/merge \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "video_url": "https://example.com/video.mp4",
        "audio_url": "https://example.com/audio.mp3",
        "strategy": "trim_or_slow"
      }'
    ```

    **Lower video audio and boost added audio:**
    ```bash
    curl -X POST http://localhost:9000/merge \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "video_url": "https://example.com/video.mp4",
        "audio_url": "https://example.com/audio.mp3",
        "strategy": "trim_or_slow",
        "audio_volume": 1.5,
        "video_audio_volume": 0.2
      }'
    ```

    **Save output to a named folder (auto-created if it doesn't exist):**
    ```bash
    curl -X POST http://localhost:9000/merge \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{
        "video_url": "https://example.com/video.mp4",
        "audio_url": "https://example.com/audio.mp3",
        "strategy": "trim_or_slow",
        "folder": "roman"
      }'
    ```

    Output filename is always **randomized** (e.g. `a3f8b2c1.mp4`).
    When `audio_volume` or `video_audio_volume` differ from their defaults, audio is re-encoded to AAC.
    """
    job_dir = make_job_dir()
    try:
        video_path = await download_file(req.video_url, job_dir, "video")
        audio_path = await download_file(req.audio_url, job_dir, "audio")

        video_dur = await probe_duration(video_path)
        audio_dur = await probe_duration(audio_path)

        output_filename = secrets.token_hex(8) + ".mp4"
        output_path = os.path.join(job_dir, output_filename)
        warning: str | None = None

        audio_fc, audio_maps, needs_audio_encode = _audio_fc_and_maps(
            req.audio_volume, req.video_audio_volume
        )
        audio_codec = ["-c:a", "aac"] if needs_audio_encode else ["-c:a", "copy"]

        durations_known = video_dur is not None and audio_dur is not None

        # ── Helper: build command for stream-copy-video cases ─────────────
        def _stream_copy_cmd(*extra) -> list[str]:
            cmd = ["-y", "-i", video_path, "-i", audio_path]
            if audio_fc:
                cmd += ["-filter_complex", audio_fc]
            cmd += ["-map", "0:v:0", *audio_maps, "-c:v", "copy", *audio_codec]
            cmd += list(extra)
            cmd += [output_path]
            return cmd

        # ── Helper: build command for setpts-video cases ───────────────────
        def _setpts_cmd(pts_expr: str, *extra) -> list[str]:
            video_part = f"[0:v]setpts={pts_expr}*PTS[vout]"
            if audio_fc:
                full_fc = f"{video_part};{audio_fc}"
                v_map = ["-map", "[vout]"]
            else:
                full_fc = video_part
                v_map = ["-map", "[vout]"]
            cmd = ["-y", "-i", video_path, "-i", audio_path,
                   "-filter_complex", full_fc,
                   *v_map, *audio_maps, *audio_codec]
            cmd += list(extra)
            cmd += [output_path]
            return cmd

        if not durations_known:
            warning = (
                "Could not detect one or both media durations. "
                f"video={'unknown' if video_dur is None else f'{video_dur:.2f}s'}, "
                f"audio={'unknown' if audio_dur is None else f'{audio_dur:.2f}s'}. "
                "Fell back to 'Trim to Shortest' — output ends when either stream ends."
            )
            await run_ffmpeg(_stream_copy_cmd("-shortest"))

        elif req.strategy == "trim":
            await run_ffmpeg(_stream_copy_cmd("-shortest"))

        elif req.strategy == "trim_or_slow":
            if video_dur > audio_dur:
                await run_ffmpeg(_stream_copy_cmd("-t", f"{audio_dur:.6f}"))
            elif audio_dur > video_dur:
                pts_expr = f"{audio_dur / video_dur:.6f}"
                await run_ffmpeg(_setpts_cmd(pts_expr, "-shortest"))
            else:
                await run_ffmpeg(_stream_copy_cmd())

        else:  # speed_match
            speed_factor = video_dur / audio_dur
            pts_expr = f"{1.0 / speed_factor:.6f}"
            await run_ffmpeg(_setpts_cmd(pts_expr, "-shortest"))

        result = resolve_output(job_dir, output_filename, req.folder)
        if warning:
            result["warning"] = warning
        return result

    except Exception:
        cleanup_job_dir(job_dir)
        raise
