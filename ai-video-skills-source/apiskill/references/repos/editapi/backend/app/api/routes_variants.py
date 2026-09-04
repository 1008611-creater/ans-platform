"""Video variant management routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_pagination, get_video_by_id, get_variant_by_id
from app.db.crud import VideoVariantCRUD
from app.db.models import Video, VideoVariant
from app.db.schemas import JobIdOut, TranscodeIn, VariantListResponse, VideoVariantOut
from app.services.jobs import job_manager, JobType, handle_transcode_multi
from app.services.storage import open_stream

router = APIRouter(prefix="/variants", tags=["variants"])


@router.post("/transcode/{video_id}", response_model=JobIdOut, summary="Transcode video to multiple qualities")
async def transcode_video(
    video_id: str,
    request: TranscodeIn,
    video: Video = Depends(get_video_by_id),
    db: Session = Depends(get_db)
) -> JobIdOut:
    """Transcode video to multiple quality levels."""
    
    # Submit transcode job
    job_id = job_manager.submit(
        JobType.TRANSCODE_MULTI,
        {
            "video_id": video_id,
            "qualities": request.qualities
        },
        handle_transcode_multi,
        db
    )
    
    return JobIdOut(job_id=job_id)


@router.get("/videos/{video_id}/variants", response_model=VariantListResponse, summary="List video variants")
async def list_video_variants(
    video_id: str,
    video: Video = Depends(get_video_by_id),
    pagination: Annotated[tuple[int, int], Depends(get_pagination)] = (1, 20),
    db: Session = Depends(get_db)
) -> VariantListResponse:
    """Get all variants for a video."""
    
    page, page_size = pagination
    variants = VideoVariantCRUD.list_by_video(db, video_id)
    
    # Simple pagination for variants
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_variants = variants[start_idx:end_idx]
    
    has_next = end_idx < len(variants)
    has_prev = page > 1
    
    return VariantListResponse(
        items=[VideoVariantOut.model_validate(variant) for variant in paginated_variants],
        total=len(variants),
        page=page,
        page_size=page_size,
        has_next=has_next,
        has_prev=has_prev
    )


@router.get("/{variant_id}/download", summary="Download variant")
async def download_variant(
    variant: VideoVariant = Depends(get_variant_by_id)
) -> Response:
    """Download a video variant file."""
    
    return open_stream(variant.stored_path)
