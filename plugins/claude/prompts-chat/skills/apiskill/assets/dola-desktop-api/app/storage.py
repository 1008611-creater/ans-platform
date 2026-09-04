from pathlib import Path
from urllib.parse import urlparse

import httpx


def persist_video_output(output_url: str, output_dir: Path) -> Path:
    """Download an upstream video into the job-owned output directory."""
    parsed = urlparse(output_url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Dola returned a non-HTTP output URL")

    output_dir.mkdir(parents=True, exist_ok=True)
    target = output_dir / "output.mp4"
    with httpx.stream("GET", output_url, follow_redirects=True, timeout=120) as response:
        response.raise_for_status()
        content_type = response.headers.get("content-type", "").lower()
        if content_type and not content_type.startswith("video/") and "octet-stream" not in content_type:
            raise ValueError("Upstream output was not a video response")
        with target.open("wb") as destination:
            for chunk in response.iter_bytes(1024 * 1024):
                destination.write(chunk)
    if target.stat().st_size == 0:
        target.unlink(missing_ok=True)
        raise ValueError("Upstream output was empty")
    return target
