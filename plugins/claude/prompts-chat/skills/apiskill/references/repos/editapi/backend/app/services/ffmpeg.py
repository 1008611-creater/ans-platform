"""FFmpeg operations for video processing."""

import json
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

from app.core.config import settings
from app.core.errors import FFmpegError
from app.core.logging import get_logger, log_ffmpeg_command

logger = get_logger(__name__)


def probe(path: str) -> Dict[str, float]:
    """Probe video file and return duration and size."""
    cmd = [
        settings.ffprobe_bin,
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "format=duration,size",
        "-of", "json",
        path
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
        
        format_info = data.get("format", {})
        duration = float(format_info.get("duration", 0))
        size = int(format_info.get("size", 0))
        
        return {
            "duration_sec": duration,
            "size_bytes": size
        }
        
    except subprocess.CalledProcessError as e:
        log_ffmpeg_command(logger, cmd, e.stderr)
        raise FFmpegError(f"FFprobe failed: {e.stderr}")
    except json.JSONDecodeError as e:
        raise FFmpegError(f"Failed to parse FFprobe output: {e}")
    except Exception as e:
        raise FFmpegError(f"FFprobe error: {e}")


def trim(input_path: str, start: float, end: float, output_path: str) -> None:
    """Trim video to specified time range."""
    cmd = [
        settings.ffmpeg_bin,
        "-y",  # Overwrite output
        "-i", input_path,
        "-ss", str(start),
        "-to", str(end),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-c:a", "aac",
        "-b:a", "128k",
        output_path
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        log_ffmpeg_command(logger, cmd)
        
    except subprocess.CalledProcessError as e:
        log_ffmpeg_command(logger, cmd, e.stderr)
        raise FFmpegError(f"Trim failed: {e.stderr}")
    except Exception as e:
        raise FFmpegError(f"Trim error: {e}")


def overlay(input_path: str, overlays: List[Dict], watermark: Optional[Dict], output_path: str) -> None:
    """Apply overlays and watermark to video."""
    from app.services.filters import build_filter_complex
    
    # Build filter complex
    filter_complex, extra_inputs, final_label = build_filter_complex(overlays, watermark)
    
    # Base command
    cmd = [settings.ffmpeg_bin, "-y", "-i", input_path]
    
    # Add extra inputs for images/videos
    for extra_input in extra_inputs:
        cmd.extend(["-i", extra_input])
    
    # Add filter complex
    if filter_complex:
        cmd.extend(["-filter_complex", filter_complex])
        # Ensure we map the final video label explicitly
        cmd.extend(["-map", f"[{final_label}]"])
    else:
        # No overlays; keep original video
        cmd.extend(["-map", "0:v"]) 
    
    # Map audio and set shortest
    cmd.extend(["-map", "0:a?", "-shortest"])
    
    # Output settings
    cmd.extend([
        "-c:v", "libx264",
        "-crf", "20",
        "-preset", "veryfast",
        "-c:a", "copy",
        output_path
    ])
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        log_ffmpeg_command(logger, cmd)
        
    except subprocess.CalledProcessError as e:
        log_ffmpeg_command(logger, cmd, e.stderr)
        raise FFmpegError(f"Overlay failed: {e.stderr}")
    except Exception as e:
        raise FFmpegError(f"Overlay error: {e}")


def transcode_multi(input_path: str, heights: List[int] = [1080, 720, 480]) -> Dict[int, str]:
    """Transcode video to multiple quality levels."""
    from pathlib import Path
    
    input_file = Path(input_path)
    base_name = input_file.stem
    # Write transcode outputs to variants directory
    output_dir = settings.processed_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    
    results = {}
    crf_map = {1080: 20, 720: 22, 480: 24}
    
    for height in heights:
        output_path = output_dir / f"{base_name}_{height}p.mp4"
        
        cmd = [
            settings.ffmpeg_bin,
            "-y",
            "-i", input_path,
            "-vf", f"scale=-2:{height}",
            "-c:v", "libx264",
            "-crf", str(crf_map.get(height, 24)),
            "-preset", "veryfast",
            "-c:a", "aac",
            "-b:a", "128k",
            str(output_path)
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            log_ffmpeg_command(logger, cmd)
            results[height] = str(output_path)
            
        except subprocess.CalledProcessError as e:
            log_ffmpeg_command(logger, cmd, e.stderr)
            raise FFmpegError(f"Transcode {height}p failed: {e.stderr}")
        except Exception as e:
            raise FFmpegError(f"Transcode {height}p error: {e}")
    
    return results
