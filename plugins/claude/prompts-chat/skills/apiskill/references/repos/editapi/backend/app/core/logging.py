"""Structured logging configuration."""

import logging
import sys
from typing import Any, Dict

from app.core.config import settings


def setup_logging() -> None:
    """Configure structured logging for the application."""
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO if settings.app_env == "prod" else logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )
    
    # Set specific loggers
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance."""
    return logging.getLogger(name)


def log_ffmpeg_command(logger: logging.Logger, command: list[str], stderr: str = "") -> None:
    """Log FFmpeg command execution with optional stderr."""
    logger.info(f"FFmpeg command: {' '.join(command)}")
    if stderr:
        logger.error(f"FFmpeg stderr: {stderr}")


def log_job_progress(logger: logging.Logger, job_id: str, progress: int, message: str = "") -> None:
    """Log job progress updates."""
    logger.info(f"Job {job_id}: {progress}% - {message}")
