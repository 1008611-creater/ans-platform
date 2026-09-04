"""Application startup and shutdown lifecycle management."""

from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.logging import setup_logging
from app.db.base import create_tables
from app.services.jobs import job_manager
from app.services.storage import ensure_directories


@asynccontextmanager
async def lifespan(app):
    """Manage application lifecycle."""
    # Startup
    setup_logging()
    ensure_directories()
    create_tables()
    
    yield
    
    # Shutdown
    job_manager.shutdown()
