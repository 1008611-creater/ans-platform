"""File storage and streaming utilities."""

import os
import shutil
from pathlib import Path
from typing import Optional

from fastapi import UploadFile
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.errors import StorageError, SecurityError
from app.utils.ids import generate_final_filename, generate_temp_filename, get_file_extension


class StoredFile:
    """Represents a stored file with metadata."""
    
    def __init__(self, path: str, size_bytes: int, mime_type: str):
        self.path = path
        self.size_bytes = size_bytes
        self.mime_type = mime_type


def ensure_directories() -> None:
    """Ensure all required directories exist."""
    directories = [
        settings.uploads_dir,
        settings.processed_dir,
        settings.variants_dir,
    ]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)


def validate_asset_path(path: str) -> bool:
    """Validate that asset path is within allowed directories."""
    try:
        asset_path = Path(path).resolve()
        assets_dir = settings.assets_dir.resolve()
        data_dir = settings.media_root.resolve()
        
        # Check if path is within assets or data directories
        return (str(asset_path).startswith(str(assets_dir)) or 
                str(asset_path).startswith(str(data_dir)))
    except (OSError, ValueError):
        return False


def save_upload(file: UploadFile) -> StoredFile:
    """Save uploaded file to storage."""
    ensure_directories()
    
    # Generate safe filename
    extension = get_file_extension(file.filename or "")
    temp_filename = generate_temp_filename(extension)
    final_filename = generate_final_filename(extension)
    
    temp_path = settings.uploads_dir / temp_filename
    final_path = settings.uploads_dir / final_filename
    
    try:
        # Save to temporary file first
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file size
        size_bytes = temp_path.stat().st_size
        
        # Atomic rename
        temp_path.rename(final_path)
        
        return StoredFile(
            path=str(final_path),
            size_bytes=size_bytes,
            mime_type=file.content_type or "application/octet-stream"
        )
        
    except Exception as e:
        # Clean up temp file if it exists
        if temp_path.exists():
            temp_path.unlink()
        raise StorageError(f"Failed to save upload: {str(e)}")


def make_temp_and_final(category: str, extension: str) -> tuple[Path, Path]:
    """Create temporary and final file paths for processing."""
    ensure_directories()
    
    if category == "processed":
        base_dir = settings.processed_dir
    elif category == "variants":
        base_dir = settings.variants_dir
    else:
        raise ValueError(f"Invalid category: {category}")
    
    temp_filename = generate_temp_filename(extension)
    final_filename = generate_final_filename(extension)
    
    temp_path = base_dir / temp_filename
    final_path = base_dir / final_filename
    
    return temp_path, final_path


def commit_temp(temp_path: Path, final_path: Path) -> None:
    """Atomically rename temporary file to final path."""
    try:
        temp_path.rename(final_path)
    except Exception as e:
        raise StorageError(f"Failed to commit temporary file: {str(e)}")


def open_stream(path: str) -> StreamingResponse:
    """Open file for streaming response."""
    file_path = Path(path)
    
    if not file_path.exists():
        raise StorageError(f"File not found: {path}")
    
    def iter_file():
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):
                yield chunk
    
    return StreamingResponse(
        iter_file(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={file_path.name}"}
    )


def exists(path: str) -> bool:
    """Check if file exists."""
    return Path(path).exists()


def delete_file(path: str) -> None:
    """Delete file if it exists."""
    file_path = Path(path)
    if file_path.exists():
        file_path.unlink()
