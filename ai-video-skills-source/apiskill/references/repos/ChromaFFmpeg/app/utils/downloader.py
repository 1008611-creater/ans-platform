import asyncio
import ipaddress
import logging
import os
import shutil
import socket
from urllib.parse import urljoin, urlparse

import aiofiles
import httpx
from fastapi import HTTPException

from app.utils.url import get_base_url

logger = logging.getLogger(__name__)

CONTENT_TYPE_EXT = {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",
    "video/webm": ".webm",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

# Remote URLs are fetched from wherever this server happens to be network-reachable —
# so by default we refuse to connect to private/loopback/link-local addresses (this
# also covers cloud metadata endpoints like 169.254.169.254, which is link-local).
# Set ALLOW_PRIVATE_NETWORK_URLS=true to disable this for deployments that
# intentionally point at an internal media server.
ALLOW_PRIVATE_NETWORK_URLS = os.environ.get("ALLOW_PRIVATE_NETWORK_URLS", "").lower() == "true"

MAX_DOWNLOAD_BYTES = int(os.environ.get("MAX_DOWNLOAD_BYTES", 2 * 1024 * 1024 * 1024))  # 2 GiB
MAX_REDIRECTS = 5


def _ext_from_url(url: str) -> str:
    path = urlparse(url).path
    _, ext = os.path.splitext(path)
    return ext.lower() if ext else ""


def _local_path_for_url(url: str) -> str | None:
    """
    If *url* refers to a file served by this server, return its local filesystem
    path so we can copy it directly without an HTTP round-trip.

    Handles:
      /store/{folder}/{filename}  → FOLDERS_DIR/{folder}/{filename}
      /files/{job_id}/{filename}  → OUTPUTS_DIR/{job_id}/{filename}
    """
    base = get_base_url().rstrip("/")
    if not url.startswith(base + "/"):
        return None

    # Lazy import to avoid circular dependency
    from app.utils.cleanup import OUTPUTS_DIR
    from app.utils.folders import FOLDERS_DIR

    rel = url[len(base):].lstrip("/")   # e.g. "store/upload/file.mp3"
    parts = rel.split("/")

    if len(parts) == 3 and parts[0] == "store":
        return os.path.join(FOLDERS_DIR, parts[1], parts[2])

    if len(parts) == 3 and parts[0] == "files":
        return os.path.join(OUTPUTS_DIR, parts[1], parts[2])

    return None


def _is_private_or_reserved(ip_str: str) -> bool:
    ip = ipaddress.ip_address(ip_str)
    return (
        ip.is_private or ip.is_loopback or ip.is_link_local
        or ip.is_multicast or ip.is_reserved or ip.is_unspecified
    )


async def _assert_url_is_fetchable(url: str) -> None:
    """
    Raise HTTPException if *url* isn't a plain http(s) URL resolving to a public
    address. Called before the initial request and again on every redirect hop,
    so a redirect can't be used to bypass the check (TOCTOU/DNS-rebinding between
    this check and the actual connection is a known residual risk — see README's
    Architecture & Trust Boundaries section).
    """
    if ALLOW_PRIVATE_NETWORK_URLS:
        return

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail={"error": f"Unsupported URL scheme: {parsed.scheme or url}"})
    if not parsed.hostname:
        raise HTTPException(status_code=400, detail={"error": f"URL has no hostname: {url}"})

    try:
        addrinfo = await asyncio.to_thread(socket.getaddrinfo, parsed.hostname, None)
    except socket.gaierror as e:
        raise HTTPException(status_code=400, detail={"error": f"Could not resolve host '{parsed.hostname}': {e}"})

    for info in addrinfo:
        ip_str = info[4][0]
        if _is_private_or_reserved(ip_str):
            logger.warning("Refusing to fetch '%s' - resolves to private/reserved address %s", url, ip_str)
            raise HTTPException(
                status_code=400,
                detail={"error": f"Refusing to fetch from a private/internal address ({parsed.hostname} -> {ip_str})"},
            )


async def download_file(url: str, dest_dir: str, filename_stem: str = "input") -> str:
    ext = _ext_from_url(url)
    dest_path = os.path.join(dest_dir, filename_stem + (ext or ".tmp"))

    # ── Fast path: file lives on this server — copy from disk directly ────────
    local = _local_path_for_url(url)
    if local:
        if not os.path.isfile(local):
            raise HTTPException(
                status_code=400,
                detail={"error": f"File not found on server: {url}"},
            )
        shutil.copy2(local, dest_path)
        return dest_path

    # ── Remote download ───────────────────────────────────────────────────────
    # Redirects are followed manually (not via httpx's follow_redirects=True) so
    # every hop is re-validated against the private-address check below — a
    # public URL that 302s to an internal address would otherwise bypass it.
    current_url = url
    try:
        async with httpx.AsyncClient(timeout=120, follow_redirects=False) as client:
            for _ in range(MAX_REDIRECTS + 1):
                await _assert_url_is_fetchable(current_url)

                async with client.stream("GET", current_url) as response:
                    if response.is_redirect:
                        location = response.headers.get("location")
                        if not location:
                            raise HTTPException(status_code=400, detail={"error": "Redirect response had no Location header"})
                        current_url = urljoin(current_url, location)
                        continue

                    response.raise_for_status()

                    if not ext:
                        content_type = response.headers.get("content-type", "").split(";")[0].strip()
                        inferred_ext = CONTENT_TYPE_EXT.get(content_type, ".tmp")
                        dest_path = os.path.join(dest_dir, filename_stem + inferred_ext)

                    content_length = response.headers.get("content-length")
                    if content_length is not None and int(content_length) > MAX_DOWNLOAD_BYTES:
                        raise HTTPException(
                            status_code=413,
                            detail={"error": f"Remote file exceeds the {MAX_DOWNLOAD_BYTES // (1024 * 1024)} MB download limit"},
                        )

                    size = 0
                    async with aiofiles.open(dest_path, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size=65536):
                            size += len(chunk)
                            if size > MAX_DOWNLOAD_BYTES:
                                raise HTTPException(
                                    status_code=413,
                                    detail={"error": f"Remote file exceeds the {MAX_DOWNLOAD_BYTES // (1024 * 1024)} MB download limit"},
                                )
                            await f.write(chunk)
                    return dest_path
            else:
                raise HTTPException(status_code=400, detail={"error": f"Too many redirects (> {MAX_REDIRECTS}) fetching {url}"})
    except HTTPException:
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail={"error": f"Failed to download {url}: HTTP {e.response.status_code}"})
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail={"error": f"Failed to download {url}: {str(e)}"})
