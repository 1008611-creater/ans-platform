import asyncio
import logging

from fastapi import HTTPException

logger = logging.getLogger(__name__)


async def run_ffmpeg(args: list[str]) -> None:
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        stderr_text = stderr.decode(errors="replace")
        logger.error("FFmpeg exited %d | cmd: ffmpeg %s | stderr: %s",
                     proc.returncode, " ".join(args), stderr_text[-3000:])
        raise HTTPException(
            status_code=500,
            detail={
                "error": "FFmpeg processing failed",
                "detail": stderr_text[-3000:],
            },
        )


async def run_ffprobe(args: list[str]) -> str:
    proc = await asyncio.create_subprocess_exec(
        "ffprobe", *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        stderr_text = stderr.decode(errors="replace")
        logger.error("ffprobe exited %d | cmd: ffprobe %s | stderr: %s",
                     proc.returncode, " ".join(args), stderr_text)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "ffprobe failed",
                "detail": stderr_text,
            },
        )
    return stdout.decode()


async def probe_duration(file_path: str) -> float | None:
    """
    Returns duration in seconds, or None if it cannot be determined.
    Tries format-level duration first, then falls back to stream-level duration.
    """
    # Pass 1: container/format header (fast, works for most files)
    try:
        output = await run_ffprobe([
            "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "csv=p=0",
            file_path,
        ])
        val = float(output.strip())
        if val > 0:
            return val
    except Exception:
        pass

    # Pass 2: individual stream headers (works when container metadata is missing)
    try:
        output = await run_ffprobe([
            "-v", "quiet",
            "-show_entries", "stream=duration",
            "-of", "csv=p=0",
            file_path,
        ])
        for line in output.strip().splitlines():
            try:
                val = float(line.strip())
                if val > 0:
                    logger.info("probe_duration: format header empty, used stream duration for %s", file_path)
                    return val
            except ValueError:
                continue
    except Exception:
        pass

    logger.warning("probe_duration: could not determine duration for %s", file_path)
    return None


async def probe_has_audio(file_path: str) -> bool:
    try:
        output = await run_ffprobe([
            "-v", "quiet",
            "-show_streams",
            "-select_streams", "a:0",
            "-of", "csv=p=0",
            file_path,
        ])
        return bool(output.strip())
    except Exception:
        return False
