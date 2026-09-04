"""Overlay processing routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.errors import SecurityError
from app.db.crud import VideoCRUD, VideoVariantCRUD
from app.db.schemas import JobIdOut, OverlaysIn, WatermarkIn
from app.services.jobs import job_manager, JobType, handle_overlay
from app.services.storage import validate_asset_path

router = APIRouter(prefix="/overlays", tags=["overlays"])


@router.post("", response_model=JobIdOut, summary="Apply overlays and watermark")
async def apply_overlays(
    request: OverlaysIn,
    db: Session = Depends(get_db)
) -> JobIdOut:
    """Apply text, image, video overlays and watermark to video."""
    
    # Get video or source variant
    if request.source_variant_id:
        source_variant = VideoVariantCRUD.get_by_id(db, request.source_variant_id)
        if not source_variant:
            raise HTTPException(status_code=404, detail="Source variant not found")
    else:
        video = VideoCRUD.get_by_id(db, request.video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
    
    # Validate asset paths
    for overlay in request.overlays:
        if overlay.type in ["image", "video"]:
            asset_path = getattr(overlay, "image_path", None) or getattr(overlay, "video_path", None)
            if asset_path and not validate_asset_path(asset_path):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid asset path: {asset_path}"
                )
    
    if request.watermark and not validate_asset_path(request.watermark.image_path):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid watermark path: {request.watermark.image_path}"
        )
    
    # Submit overlay job
    job_id = job_manager.submit(
        JobType.OVERLAY,
        {
            "video_id": request.video_id,
            "source_variant_id": request.source_variant_id,
            "overlays": [overlay.model_dump() for overlay in request.overlays],
            "watermark": request.watermark.model_dump() if request.watermark else None
        },
        handle_overlay,
        db
    )
    
    return JobIdOut(job_id=job_id)


@router.post("/watermark", response_model=JobIdOut, summary="Apply full-duration image watermark")
async def apply_watermark(
    request: WatermarkIn,
    db: Session = Depends(get_db)
) -> JobIdOut:
    """Apply an image watermark for the full duration of the video."""

    # Validate video or variant
    if request.source_variant_id:
        source_variant = VideoVariantCRUD.get_by_id(db, request.source_variant_id)
        if not source_variant:
            raise HTTPException(status_code=404, detail="Source variant not found")
    else:
        video = VideoCRUD.get_by_id(db, request.video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")

    # Validate watermark asset path
    if not validate_asset_path(request.watermark.image_path):
        raise HTTPException(status_code=400, detail=f"Invalid watermark path: {request.watermark.image_path}")

    # Submit job with no overlays and given watermark
    job_id = job_manager.submit(
        JobType.OVERLAY,
        {
            "video_id": request.video_id,
            "source_variant_id": request.source_variant_id,
            "overlays": [],
            "watermark": request.watermark.model_dump()
        },
        handle_overlay,
        db
    )

    return JobIdOut(job_id=job_id)
