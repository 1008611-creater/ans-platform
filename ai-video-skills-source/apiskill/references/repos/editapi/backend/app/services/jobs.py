"""Background job management system."""

from pathlib import Path
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Dict, Optional
from uuid import UUID

from sqlalchemy.orm import Session
from app.db.base import SessionLocal

from app.core.config import settings
from app.core.errors import JobError
from app.core.logging import get_logger, log_job_progress
from app.db.crud import JobCRUD
from app.db.models import Job, JobStatus, JobType, VideoVariant, VariantKind, VariantQuality
from app.services.ffmpeg import probe, trim, overlay, transcode_multi
from app.services.storage import make_temp_and_final, commit_temp, delete_file
from app.utils.timecodes import parse_timecode, validate_time_range


logger = get_logger(__name__)


class JobContext:
    """Context for job execution with progress reporting."""
    
    def __init__(self, job_id: UUID, db: Session):
        self.job_id = job_id
        self.db = db
        self._output_variant_id: Optional[UUID] = None
    
    def report_progress(self, progress: int) -> None:
        """Report job progress."""
        log_job_progress(logger, str(self.job_id), progress)
        JobCRUD.update_status(self.db, self.job_id, JobStatus.STARTED, progress)
    
    def set_output_variant(self, variant_id: UUID) -> None:
        """Set the output variant ID."""
        self._output_variant_id = variant_id
        JobCRUD.update_status(
            self.db, self.job_id, JobStatus.STARTED, 
            output_variant_id=variant_id
        )
    
    def fail(self, message: str) -> None:
        """Mark job as failed."""
        JobCRUD.update_status(
            self.db, self.job_id, JobStatus.FAILURE, 
            error_message=message
        )
        raise JobError(message)


class JobManager:
    """Manages background job execution."""
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=2)
        self.futures: Dict[UUID, threading.Future] = {}
        self._lock = threading.Lock()
    
    def submit(self, job_type: JobType, payload: Dict, handler: Callable, db: Session) -> UUID:
        """Submit a new job for execution."""
        # Create job record
        job = JobCRUD.create(db, job_type, payload.get("video_id"), payload.get("input_variant_id"))
        
        # Submit to executor
        future = self.executor.submit(self._execute_job, job.id, job_type, payload, handler, db)
        
        with self._lock:
            self.futures[job.id] = future
        
        return job.id
    
    def _execute_job(self, job_id: UUID, job_type: JobType, payload: Dict, handler: Callable, db: Session) -> None:
        """Execute a job with proper error handling."""
        # Use a fresh DB session per background thread (request session is not thread-safe)
        thread_db: Session = SessionLocal()
        try:
            JobCRUD.update_status(thread_db, job_id, JobStatus.STARTED, 0)

            context = JobContext(job_id, thread_db)
            handler(context, payload)

            JobCRUD.update_status(thread_db, job_id, JobStatus.SUCCESS, 100)
            log_job_progress(logger, str(job_id), 100, "Completed successfully")

        except Exception as e:
            JobCRUD.update_status(thread_db, job_id, JobStatus.FAILURE, error_message=str(e))
            log_job_progress(logger, str(job_id), 0, f"Failed: {e}")
        finally:
            thread_db.close()
            with self._lock:
                self.futures.pop(job_id, None)
    
    def shutdown(self) -> None:
        """Shutdown the job manager."""
        self.executor.shutdown(wait=False)


# Global job manager instance
job_manager = JobManager()


# Job handlers
def handle_trim(ctx: JobContext, payload: Dict) -> None:
    """Handle video trimming job."""
    from app.db.crud import VideoCRUD, VideoVariantCRUD
    
    video_id = payload["video_id"]
    start = payload["start"]
    end = payload["end"]
    source_variant_id = payload.get("source_variant_id")
    
    ctx.report_progress(10)
    
    # Get video or source variant
    if source_variant_id:
        source_variant = VideoVariantCRUD.get_by_id(ctx.db, source_variant_id)
        if not source_variant:
            ctx.fail("Source variant not found")
        input_path = source_variant.stored_path
        duration = float(source_variant.duration_sec)
    else:
        video = VideoCRUD.get_by_id(ctx.db, video_id)
        if not video:
            ctx.fail("Video not found")
        input_path = video.stored_path
        duration = float(video.duration_sec or 0)
    
    ctx.report_progress(20)
    
    # Validate time range
    try:
        start_sec, end_sec = validate_time_range(start, end, duration)
    except ValueError as e:
        ctx.fail(str(e))
    
    ctx.report_progress(30)
    
    # Create output paths
    temp_path, final_path = make_temp_and_final("variants", ".mp4")
    
    try:
        # Trim video
        trim(input_path, start_sec, end_sec, str(temp_path))
        ctx.report_progress(70)
        
        # Commit file
        commit_temp(temp_path, final_path)
        ctx.report_progress(80)
        
        # Get file size
        size_bytes = final_path.stat().st_size
        
        # Create variant record
        variant = VideoVariantCRUD.create(
            ctx.db,
            video_id=video_id,
            kind=VariantKind.TRIM,
            quality=VariantQuality.SOURCE,
            stored_path=str(final_path),
            size_bytes=size_bytes,
            duration_sec=end_sec - start_sec,
            source_variant_id=source_variant_id,
            config_json={"start": start_sec, "end": end_sec}
        )
        
        ctx.set_output_variant(variant.id)
        ctx.report_progress(100)
        
    except Exception as e:
        # Clean up temp file
        if temp_path.exists():
            delete_file(str(temp_path))
        raise


def handle_overlay(ctx: JobContext, payload: Dict) -> None:
    """Handle overlay processing job."""
    from app.db.crud import VideoCRUD, VideoVariantCRUD, OverlayCRUD
    
    video_id = payload["video_id"]
    overlays = payload.get("overlays", [])
    watermark = payload.get("watermark")
    source_variant_id = payload.get("source_variant_id")
    
    ctx.report_progress(10)
    
    # Get video or source variant
    if source_variant_id:
        source_variant = VideoVariantCRUD.get_by_id(ctx.db, source_variant_id)
        if not source_variant:
            ctx.fail("Source variant not found")
        input_path = source_variant.stored_path
    else:
        video = VideoCRUD.get_by_id(ctx.db, video_id)
        if not video:
            ctx.fail("Video not found")
        input_path = video.stored_path
    
    ctx.report_progress(20)
    
    # Create output paths
    temp_path, final_path = make_temp_and_final("variants", ".mp4")
    
    try:
        # Apply overlays
        overlay(input_path, overlays, watermark, str(temp_path))
        ctx.report_progress(70)
        
        # Commit file
        commit_temp(temp_path, final_path)
        ctx.report_progress(80)
        
        # Get file info
        size_bytes = final_path.stat().st_size
        video_info = probe(str(final_path))
        
        # Choose variant kind
        variant_kind = VariantKind.WATERMARK if (not overlays and watermark) else VariantKind.OVERLAY

        # Create variant record
        variant = VideoVariantCRUD.create(
            ctx.db,
            video_id=video_id,
            kind=variant_kind,
            quality=VariantQuality.SOURCE,
            stored_path=str(final_path),
            size_bytes=size_bytes,
            duration_sec=video_info["duration_sec"],
            source_variant_id=source_variant_id,
            config_json={"overlays": overlays, "watermark": watermark}
        )
        
        # Create overlay records
        for overlay_spec in overlays:
            OverlayCRUD.create(
                ctx.db,
                video_id=video_id,
                variant_id=variant.id,
                overlay_type=overlay_spec["type"],
                payload_json=overlay_spec
            )
        
        ctx.set_output_variant(variant.id)
        ctx.report_progress(100)
        
    except Exception as e:
        # Clean up temp file
        if temp_path.exists():
            delete_file(str(temp_path))
        raise


def handle_transcode_multi(ctx: JobContext, payload: Dict) -> None:
    """Handle multi-quality transcoding job."""
    from app.db.crud import VideoCRUD, VideoVariantCRUD
    
    video_id = payload["video_id"]
    qualities = payload.get("qualities", ["1080p", "720p", "480p"])
    
    ctx.report_progress(10)
    
    # Get video
    video = VideoCRUD.get_by_id(ctx.db, video_id)
    if not video:
        ctx.fail("Video not found")
    
    input_path = video.stored_path
    ctx.report_progress(20)
    
    # Map quality strings to heights
    quality_map = {"1080p": 1080, "720p": 720, "480p": 480}
    heights = [quality_map[q] for q in qualities if q in quality_map]
    
    try:
        # Transcode to multiple qualities
        results = transcode_multi(input_path, heights)
        ctx.report_progress(80)
        
        # Create variant records
        for height, output_path in results.items():
            size_bytes = Path(output_path).stat().st_size
            video_info = probe(output_path)
            
            quality_str = f"{height}p"
            VideoVariantCRUD.create(
                ctx.db,
                video_id=video_id,
                kind=VariantKind.TRANSCODE,
                quality=quality_str,
                stored_path=output_path,
                size_bytes=size_bytes,
                duration_sec=video_info["duration_sec"],
                config_json={"quality": quality_str}
            )
        
        ctx.report_progress(100)
        
    except Exception as e:
        # Clean up any created files
        for output_path in results.values():
            if Path(output_path).exists():
                delete_file(output_path)
        raise
