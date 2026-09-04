"""Custom exception classes for the video processing backend."""

from typing import Any, Dict, Optional


class VideoProcessingError(Exception):
    """Base exception for video processing errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(VideoProcessingError):
    """Raised when input validation fails."""
    pass


class StorageError(VideoProcessingError):
    """Raised when file storage operations fail."""
    pass


class FFmpegError(VideoProcessingError):
    """Raised when FFmpeg operations fail."""
    pass


class JobError(VideoProcessingError):
    """Raised when job processing fails."""
    pass


class NotFoundError(VideoProcessingError):
    """Raised when a requested resource is not found."""
    pass


class SecurityError(VideoProcessingError):
    """Raised when security constraints are violated."""
    pass
