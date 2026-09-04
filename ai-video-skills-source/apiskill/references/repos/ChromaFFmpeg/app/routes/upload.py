import logging
import os
import secrets

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.auth import verify_api_key
from app.utils.folders import (
    create_folder, get_folder_path,
)
from app.utils.url import folder_url

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(verify_api_key)])

MAX_BYTES = 500 * 1024 * 1024  # 500 MB

AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".aac", ".flac", ".opus", ".wma"}


def _default_folder(filename: str) -> str:
    """Return 'audio' for audio files, 'upload' for everything else."""
    _, ext = os.path.splitext(filename)
    return "audio" if ext.lower() in AUDIO_EXTENSIONS else "upload"


def _random_filename(original: str) -> str:
    """Generate a random hex filename preserving the original extension."""
    _, ext = os.path.splitext(os.path.basename(original or "upload"))
    return secrets.token_hex(8) + (ext.lower() if ext else "")


async def _write_upload(file: UploadFile, dest_path: str) -> int:
    """Stream *file* to *dest_path* in 1 MB chunks. Returns bytes written.
    Cleans up the partial file and raises HTTPException on limit or OS error."""
    size = 0
    try:
        with open(dest_path, "wb") as out:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_BYTES:
                    out.close()
                    os.remove(dest_path)
                    raise HTTPException(
                        status_code=413,
                        detail={"error": "File exceeds 500 MB limit"},
                    )
                out.write(chunk)
    except HTTPException:
        raise
    except OSError as e:
        logger.error("Failed to write upload to %s: %s", dest_path, e)
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise HTTPException(status_code=500, detail={"error": f"Failed to save file: {e.strerror}"})
    return size


@router.post("/upload", tags=["storage"], summary="Upload a binary file and get a persistent URL")
async def upload_file(
    file: UploadFile = File(...),
    folder: str | None = Form(default=None),
):
    """
    Convert any binary file (video, audio, image, etc.) into a persistent URL.

    Accepts multipart form data. Files are always stored in a named folder.
    The default folder is chosen automatically by file type:

    - **Audio** (`.mp3 .wav .m4a .ogg .aac .flac .opus .wma`) → `audio` folder
    - **Everything else** (video, image, …) → `upload` folder

    Pass `folder=name` to override. Folders are created automatically if they don't exist.
    Filenames are **randomized** (8-character hex + original extension). Maximum file size: **500 MB**.

    **Upload a video — goes to "upload" folder automatically:**
    ```bash
    curl -X POST http://localhost:9000/upload \\
      -H "X-API-Key: your-secret-key" \\
      -F "file=@/path/to/video.mp4"
    ```

    **Upload an audio file — goes to "audio" folder automatically:**
    ```bash
    curl -X POST http://localhost:9000/upload \\
      -H "X-API-Key: your-secret-key" \\
      -F "file=@/path/to/track.mp3"
    ```

    **Override folder explicitly:**
    ```bash
    curl -X POST http://localhost:9000/upload \\
      -H "X-API-Key: your-secret-key" \\
      -F "file=@/path/to/photo.jpg" \\
      -F "folder=my-project"
    ```
    """
    raw_name = file.filename or "upload"
    target_folder = folder if folder else _default_folder(raw_name)

    try:
        safe_folder = create_folder(target_folder)
    except OSError as e:
        logger.error("Failed to create/access folder '%s': %s", target_folder, e)
        raise HTTPException(status_code=500, detail={"error": f"Could not access folder: {e.strerror}"})

    folder_path = get_folder_path(safe_folder)
    filename = _random_filename(raw_name)
    # Extremely unlikely collision, but guard anyway
    while os.path.exists(os.path.join(folder_path, filename)):
        filename = _random_filename(raw_name)
    dest_path = os.path.join(folder_path, filename)
    size = await _write_upload(file, dest_path)
    logger.info("Upload saved to folder '%s' as '%s' (%d bytes)", safe_folder, filename, size)
    return {
        "url": folder_url(safe_folder, filename),
        "filename": filename,
        "folder": safe_folder,
        "size_bytes": size,
    }
