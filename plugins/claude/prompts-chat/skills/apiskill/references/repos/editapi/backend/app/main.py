"""Main FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes_jobs, routes_overlays, routes_trim, routes_variants, routes_videos
from app.core.config import settings
from app.lifecycle.startup import lifespan

# Create FastAPI app
app = FastAPI(
    title="Video Processing Backend",
    description="Backend API for video processing with trimming, overlays, and transcoding",
    version="0.1.0",
    lifespan=lifespan,
    root_path=settings.api_root_path
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(routes_videos.router)
app.include_router(routes_trim.router)
app.include_router(routes_overlays.router)
app.include_router(routes_jobs.router)
app.include_router(routes_variants.router)


@app.get("/", summary="Health check")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}
