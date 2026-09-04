"""Configuration management for the video processing backend."""

import os
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App configuration
    app_env: Literal["dev", "prod"] = Field(default="dev", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")
    
    # Database configuration
    db_host: str = Field(default="localhost", alias="DB_HOST")
    db_port: int = Field(default=5432, alias="DB_PORT")
    db_name: str = Field(default="videos", alias="DB_NAME")
    db_user: str = Field(default="videos", alias="DB_USER")
    db_password: str = Field(default="videos", alias="DB_PASSWORD")
    
    # Media configuration
    media_root: Path = Field(default=Path("/data"), alias="MEDIA_ROOT")
    font_dir: Path = Field(default=Path("/fonts"), alias="FONT_DIR")
    
    # FFmpeg configuration
    ffmpeg_bin: str = Field(default="ffmpeg", alias="FFMPEG_BIN")
    ffprobe_bin: str = Field(default="ffprobe", alias="FFPROBE_BIN")
    
    # API configuration
    api_root_path: str = Field(default="", alias="API_ROOT_PATH")
    
    @property
    def database_url(self) -> str:
        """Construct the database URL."""
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    
    @property
    def uploads_dir(self) -> Path:
        """Get the uploads directory path."""
        return self.media_root / "uploads"
    
    @property
    def processed_dir(self) -> Path:
        """Get the processed directory path."""
        return self.media_root / "processed"
    
    @property
    def variants_dir(self) -> Path:
        """Get the variants directory path."""
        return self.media_root / "variants"
    
    @property
    def assets_dir(self) -> Path:
        """Get the assets directory path."""
        return Path("/app/assets")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
