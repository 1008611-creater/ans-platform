"""Video trimming routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.errors import ValidationError
from app.db.crud import VideoCRUD, VideoVariantCRUD
from app.db.schemas import JobIdOut, TrimIn
from app.services.jobs import job_manager, JobType, handle_trim
from app.utils.timecodes import parse_timecode

router = APIRouter(prefix="/trim", tags=["trim"])


@router.post("", response_model=JobIdOut, summary="Trim video")
async def trim_video(
    request: TrimIn,
    db: Session = Depends(get_db)
) -> JobIdOut:
    """Trim video to specified time range."""
    
    # Get video or source variant
    if request.source_variant_id:
        source_variant = VideoVariantCRUD.get_by_id(db, request.source_variant_id)
        if not source_variant:
            raise HTTPException(status_code=404, detail="Source variant not found")
        duration = float(source_variant.duration_sec)
    else:
        video = VideoCRUD.get_by_id(db, request.video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        duration = float(video.duration_sec or 0)
    
    # Validate time range
    try:
        start_sec = parse_timecode(request.start)
        end_sec = parse_timecode(request.end)
        
        if start_sec >= end_sec:
            raise ValidationError("Start time must be less than end time")
        
        if start_sec < 0 or end_sec > duration:
            raise ValidationError("Time range must be within video duration")
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid time format: {e}")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Submit trim job
    job_id = job_manager.submit(
        JobType.TRIM,
        {
            "video_id": request.video_id,
            "start": request.start,
            "end": request.end,
            "source_variant_id": request.source_variant_id
        },
        handle_trim,
        db
    )
    
    return JobIdOut(job_id=job_id)
