"""Database models for the video processing backend."""

import enum
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class VariantKind(str, enum.Enum):
    """Video variant types."""
    TRIM = "trim"
    OVERLAY = "overlay"
    WATERMARK = "watermark"
    TRANSCODE = "transcode"


class VariantQuality(str, enum.Enum):
    """Video quality levels."""
    SOURCE = "source"
    P1080 = "1080p"
    P720 = "720p"
    P480 = "480p"


class JobType(str, enum.Enum):
    """Background job types."""
    UPLOAD_PROBE = "upload_probe"
    TRIM = "trim"
    OVERLAY = "overlay"
    WATERMARK = "watermark"
    TRANSCODE_MULTI = "transcode_multi"


class JobStatus(str, enum.Enum):
    """Job status values."""
    PENDING = "PENDING"
    STARTED = "STARTED"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"


class OverlayType(str, enum.Enum):
    """Overlay types."""
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    WATERMARK = "watermark"


class Video(Base):
    """Original uploaded video files."""
    
    __tablename__ = "videos"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    original_filename = Column(Text, nullable=False)
    stored_path = Column(Text, nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    duration_sec = Column(Numeric(10, 3), nullable=True)
    mime_type = Column(Text, nullable=False)
    upload_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    variants = relationship("VideoVariant", back_populates="video", cascade="all, delete-orphan")
    overlays = relationship("Overlay", back_populates="video", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="video", cascade="all, delete-orphan")


class VideoVariant(Base):
    """Processed video variants."""
    
    __tablename__ = "video_variants"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    video_id = Column(PostgresUUID(as_uuid=True), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    kind = Column(
        Enum(
            VariantKind,
            name="variantkind",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
            create_type=False,
        ),
        nullable=False,
    )
    quality = Column(
        Enum(
            VariantQuality,
            name="variantquality",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
            create_type=False,
        ),
        nullable=True,
    )
    source_variant_id = Column(PostgresUUID(as_uuid=True), ForeignKey("video_variants.id"), nullable=True)
    stored_path = Column(Text, nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    duration_sec = Column(Numeric(10, 3), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    config_json = Column(JSON, nullable=True)
    
    # Relationships
    video = relationship("Video", back_populates="variants")
    source_variant = relationship("VideoVariant", remote_side=[id])
    overlays = relationship("Overlay", back_populates="variant", cascade="all, delete-orphan")
    input_jobs = relationship("Job", foreign_keys="Job.input_variant_id", back_populates="input_variant")
    output_jobs = relationship("Job", foreign_keys="Job.output_variant_id", back_populates="output_variant")


class Overlay(Base):
    """Overlay specifications."""
    
    __tablename__ = "overlays"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    video_id = Column(PostgresUUID(as_uuid=True), ForeignKey("videos.id"), nullable=False)
    variant_id = Column(PostgresUUID(as_uuid=True), ForeignKey("video_variants.id"), nullable=True)
    type = Column(
        Enum(
            OverlayType,
            name="overlaytype",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
            create_type=False,
        ),
        nullable=False,
    )
    payload_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    video = relationship("Video", back_populates="overlays")
    variant = relationship("VideoVariant", back_populates="overlays")


class Job(Base):
    """Background job tracking."""
    
    __tablename__ = "jobs"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    video_id = Column(PostgresUUID(as_uuid=True), ForeignKey("videos.id"), nullable=True)
    input_variant_id = Column(PostgresUUID(as_uuid=True), ForeignKey("video_variants.id"), nullable=True)
    output_variant_id = Column(PostgresUUID(as_uuid=True), ForeignKey("video_variants.id"), nullable=True)
    # Persist enum VALUE strings (e.g., "trim"), not the Python Enum NAMES (e.g., "TRIM")
    type = Column(
        Enum(
            JobType,
            name="jobtype",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
            create_type=False,
        ),
        nullable=False,
    )
    status = Column(Enum(JobStatus), nullable=False, default=JobStatus.PENDING)
    progress = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    video = relationship("Video", back_populates="jobs")
    input_variant = relationship("VideoVariant", foreign_keys=[input_variant_id], back_populates="input_jobs")
    output_variant = relationship("VideoVariant", foreign_keys=[output_variant_id], back_populates="output_jobs")
