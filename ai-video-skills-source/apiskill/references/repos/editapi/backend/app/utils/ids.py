"""Utility functions for ID generation and filename handling."""

import re
import uuid
from pathlib import Path
from typing import Optional


def generate_uuid() -> str:
    """Generate a new UUID string."""
    return str(uuid.uuid4())


def safe_filename(filename: str) -> str:
    """Create a safe filename by removing/replacing unsafe characters."""
    # Remove or replace unsafe characters
    safe = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # Remove leading/trailing dots and spaces
    safe = safe.strip('. ')
    # Ensure it's not empty
    if not safe:
        safe = "file"
    return safe


def get_file_extension(filename: str) -> str:
    """Extract file extension from filename."""
    return Path(filename).suffix.lower()


def is_video_file(filename: str) -> bool:
    """Check if file is a supported video format."""
    video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v'}
    return get_file_extension(filename) in video_extensions


def generate_temp_filename(extension: str) -> str:
    """Generate a temporary filename with extension."""
    return f"{generate_uuid()}.tmp{extension}"


def generate_final_filename(extension: str) -> str:
    """Generate a final filename with extension."""
    return f"{generate_uuid()}{extension}"
