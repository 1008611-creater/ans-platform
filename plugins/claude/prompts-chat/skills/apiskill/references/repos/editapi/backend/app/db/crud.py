"""Database CRUD operations."""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.db.models import Job, JobStatus, JobType, Overlay, Video, VideoVariant, VariantKind


class VideoCRUD:
    """CRUD operations for videos."""
    
    @staticmethod
    def create(
        db: Session,
        original_filename: str,
        stored_path: str,
        size_bytes: int,
        mime_type: str,
        duration_sec: Optional[float] = None,
    ) -> Video:
        """Create a new video record."""
        video = Video(
            original_filename=original_filename,
            stored_path=stored_path,
            size_bytes=size_bytes,
            duration_sec=duration_sec,
            mime_type=mime_type,
        )
        db.add(video)
        db.commit()
        db.refresh(video)
        return video
    
    @staticmethod
    def get_by_id(db: Session, video_id: UUID) -> Optional[Video]:
        """Get video by ID."""
        return db.query(Video).filter(Video.id == video_id).first()
    
    @staticmethod
    def list_paginated(db: Session, page: int = 1, page_size: int = 20) -> tuple[List[Video], int]:
        """Get paginated list of videos."""
        offset = (page - 1) * page_size
        videos = db.query(Video).order_by(desc(Video.upload_time)).offset(offset).limit(page_size).all()
        total = db.query(Video).count()
        return videos, total


class VideoVariantCRUD:
    """CRUD operations for video variants."""
    
    @staticmethod
    def create(
        db: Session,
        video_id: UUID,
        kind: VariantKind,
        stored_path: str,
        size_bytes: int,
        duration_sec: float,
        quality: Optional[str] = None,
        source_variant_id: Optional[UUID] = None,
        config_json: Optional[dict] = None,
    ) -> VideoVariant:
        """Create a new video variant."""
        variant = VideoVariant(
            video_id=video_id,
            kind=kind,
            quality=quality,
            source_variant_id=source_variant_id,
            stored_path=stored_path,
            size_bytes=size_bytes,
            duration_sec=duration_sec,
            config_json=config_json,
        )
        db.add(variant)
        db.commit()
        db.refresh(variant)
        return variant
    
    @staticmethod
    def get_by_id(db: Session, variant_id: UUID) -> Optional[VideoVariant]:
        """Get variant by ID."""
        return db.query(VideoVariant).filter(VideoVariant.id == variant_id).first()
    
    @staticmethod
    def list_by_video(db: Session, video_id: UUID) -> List[VideoVariant]:
        """Get all variants for a video."""
        return db.query(VideoVariant).filter(VideoVariant.video_id == video_id).all()


class JobCRUD:
    """CRUD operations for jobs."""
    
    @staticmethod
    def create(
        db: Session,
        job_type: JobType,
        video_id: Optional[UUID] = None,
        input_variant_id: Optional[UUID] = None,
    ) -> Job:
        """Create a new job."""
        job = Job(
            type=job_type,
            video_id=video_id,
            input_variant_id=input_variant_id,
            status=JobStatus.PENDING,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job
    
    @staticmethod
    def get_by_id(db: Session, job_id: UUID) -> Optional[Job]:
        """Get job by ID."""
        return db.query(Job).filter(Job.id == job_id).first()
    
    @staticmethod
    def update_status(
        db: Session,
        job_id: UUID,
        status: JobStatus,
        progress: Optional[int] = None,
        error_message: Optional[str] = None,
        output_variant_id: Optional[UUID] = None,
    ) -> Optional[Job]:
        """Update job status and progress."""
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return None
        
        job.status = status
        if progress is not None:
            job.progress = progress
        if error_message is not None:
            job.error_message = error_message
        if output_variant_id is not None:
            job.output_variant_id = output_variant_id
        
        db.commit()
        db.refresh(job)
        return job
    
    @staticmethod
    def list_pending(db: Session) -> List[Job]:
        """Get all pending jobs."""
        return db.query(Job).filter(Job.status == JobStatus.PENDING).all()
    
    @staticmethod
    def list_started(db: Session) -> List[Job]:
        """Get all started jobs."""
        return db.query(Job).filter(Job.status == JobStatus.STARTED).all()


class OverlayCRUD:
    """CRUD operations for overlays."""
    
    @staticmethod
    def create(
        db: Session,
        video_id: UUID,
        overlay_type: str,
        payload_json: dict,
        variant_id: Optional[UUID] = None,
    ) -> Overlay:
        """Create a new overlay."""
        overlay = Overlay(
            video_id=video_id,
            variant_id=variant_id,
            type=overlay_type,
            payload_json=payload_json,
        )
        db.add(overlay)
        db.commit()
        db.refresh(overlay)
        return overlay
