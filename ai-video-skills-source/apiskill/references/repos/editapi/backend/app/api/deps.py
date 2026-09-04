"""API dependencies for database and pagination."""

from typing import Generator

from fastapi import Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.crud import VideoCRUD, VideoVariantCRUD, JobCRUD
from app.db.models import Video, VideoVariant, Job


def get_pagination(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page")
) -> tuple[int, int]:
    """Get pagination parameters."""
    return page, page_size


def get_video_by_id(video_id: str, db: Session = Depends(get_db)) -> Video:
    """Get video by ID or raise 404."""
    video = VideoCRUD.get_by_id(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


def get_variant_by_id(variant_id: str, db: Session = Depends(get_db)) -> VideoVariant:
    """Get variant by ID or raise 404."""
    variant = VideoVariantCRUD.get_by_id(db, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    return variant


def get_job_by_id(job_id: str, db: Session = Depends(get_db)) -> Job:
    """Get job by ID or raise 404."""
    job = JobCRUD.get_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
