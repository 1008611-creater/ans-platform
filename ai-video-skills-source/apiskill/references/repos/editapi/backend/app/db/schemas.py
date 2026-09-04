"""Pydantic schemas for API request/response models."""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class VideoOut(BaseModel):
    """Video metadata response."""
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    original_filename: str
    stored_path: str
    size_bytes: int
    duration_sec: Optional[float] = None
    mime_type: str
    upload_time: datetime


class VideoVariantOut(BaseModel):
    """Video variant response."""
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    kind: Literal["trim", "overlay", "watermark", "transcode"]
    quality: Optional[Literal["source", "1080p", "720p", "480p"]] = None
    source_variant_id: Optional[UUID] = None
    stored_path: str
    size_bytes: int
    duration_sec: float
    created_at: datetime
    config_json: Optional[Dict[str, Any]] = None


class TrimIn(BaseModel):
    """Trim video request."""
    video_id: UUID
    start: Union[float, str]
    end: Union[float, str]
    source_variant_id: Optional[UUID] = None


class OverlayText(BaseModel):
    """Text overlay specification."""
    type: Literal["text"] = "text"
    text: str
    font: Optional[str] = None
    font_size: Optional[int] = 32
    color: Optional[str] = "white"
    x: Union[int, str] = 20
    y: Union[int, str] = 20
    start: float = 0
    end: Optional[float] = None


class OverlayImage(BaseModel):
    """Image overlay specification."""
    type: Literal["image"] = "image"
    image_path: str
    x: Union[int, str] = 20
    y: Union[int, str] = 20
    start: float = 0
    end: Optional[float] = None
    opacity: Optional[float] = None


class OverlayVideo(BaseModel):
    """Video overlay specification."""
    type: Literal["video"] = "video"
    video_path: str
    x: Union[int, str] = 20
    y: Union[int, str] = 20
    start: float = 0
    end: Optional[float] = None
    scale: Optional[float] = 1.0


class Watermark(BaseModel):
    """Watermark specification."""
    image_path: str
    x: Union[int, str] = "W-w-20"
    y: Union[int, str] = "H-h-20"
    opacity: float = 0.5


class OverlaysIn(BaseModel):
    """Overlay processing request."""
    video_id: UUID
    source_variant_id: Optional[UUID] = None
    overlays: List[Union[OverlayText, OverlayImage, OverlayVideo]] = Field(default_factory=list)
    watermark: Optional[Watermark] = None


class WatermarkIn(BaseModel):
    """Watermark-only processing request (full duration)."""
    video_id: UUID
    source_variant_id: Optional[UUID] = None
    watermark: Watermark


class TranscodeIn(BaseModel):
    """Transcode request."""
    qualities: List[Literal["1080p", "720p", "480p"]] = ["1080p", "720p", "480p"]


class JobIdOut(BaseModel):
    """Job ID response."""
    job_id: UUID


class JobStatusOut(BaseModel):
    """Job status response."""
    job_id: UUID
    status: Literal["PENDING", "STARTED", "SUCCESS", "FAILURE"]
    progress: int
    error_message: Optional[str] = None


class PaginatedResponse(BaseModel):
    """Paginated response wrapper."""
    items: List[Any]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool


class VideoListResponse(PaginatedResponse):
    """Paginated video list response."""
    items: List[VideoOut]


class VariantListResponse(PaginatedResponse):
    """Paginated variant list response."""
    items: List[VideoVariantOut]
