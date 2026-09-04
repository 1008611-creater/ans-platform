"""Job status and result routes."""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_job_by_id
from app.db.crud import VideoVariantCRUD
from app.db.models import Job, JobStatus
from app.db.schemas import JobStatusOut
from app.services.storage import open_stream

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/status/{job_id}", response_model=JobStatusOut, summary="Get job status")
async def get_job_status(
    job: Job = Depends(get_job_by_id)
) -> JobStatusOut:
    """Get the status and progress of a job."""
    
    return JobStatusOut(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        error_message=job.error_message
    )


@router.get("/result/{job_id}", summary="Get job result")
async def get_job_result(
    job: Job = Depends(get_job_by_id)
) -> Response:
    """Get the result file from a completed job."""
    
    if job.status == JobStatus.PENDING:
        raise HTTPException(status_code=409, detail="Job is still pending")
    
    if job.status == JobStatus.STARTED:
        raise HTTPException(status_code=409, detail="Job is still running")
    
    if job.status == JobStatus.FAILURE:
        raise HTTPException(status_code=404, detail="Job failed")
    
    if job.status != JobStatus.SUCCESS:
        raise HTTPException(status_code=500, detail="Unknown job status")
    
    if not job.output_variant_id:
        raise HTTPException(status_code=404, detail="No output variant found")
    
    # Get output variant
    variant = VideoVariantCRUD.get_by_id(job.db, job.output_variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Output variant not found")
    
    # Stream the result file
    return open_stream(variant.stored_path)
