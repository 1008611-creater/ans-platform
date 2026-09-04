"""Video upload and listing routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_pagination
from app.core.errors import ValidationError
from app.db.crud import VideoCRUD
from app.db.schemas import VideoListResponse, VideoOut
from app.services.ffmpeg import probe
from app.services.jobs import job_manager, JobType
from app.services.storage import save_upload
from app.utils.ids import is_video_file

router = APIRouter(prefix="/videos", tags=["videos"])


@router.post("/upload", response_model=VideoOut, summary="Upload video file")
async def upload_video(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
) -> VideoOut:
    """Upload a video file and probe its metadata."""
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    if not is_video_file(file.filename):
        raise HTTPException(status_code=400, detail="Unsupported video format")
    
    try:
        # Save uploaded file
        stored_file = save_upload(file)
        
        # Probe video metadata
        video_info = probe(stored_file.path)
        
        # Create video record
        video = VideoCRUD.create(
            db,
            original_filename=file.filename,
            stored_path=stored_file.path,
            size_bytes=stored_file.size_bytes,
            mime_type=stored_file.mime_type,
            duration_sec=video_info["duration_sec"]
        )
        
        return VideoOut.model_validate(video)
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("", response_model=VideoListResponse, summary="List videos")
async def list_videos(
    pagination: Annotated[tuple[int, int], Depends(get_pagination)],
    db: Session = Depends(get_db)
) -> VideoListResponse:
    """Get paginated list of uploaded videos."""
    
    page, page_size = pagination
    videos, total = VideoCRUD.list_paginated(db, page, page_size)
    
    has_next = (page * page_size) < total
    has_prev = page > 1
    
    return VideoListResponse(
        items=[VideoOut.model_validate(video) for video in videos],
        total=total,
        page=page,
        page_size=page_size,
        has_next=has_next,
        has_prev=has_prev
    )
