import logging
import os
import shutil
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.auth import verify_api_key
from app.utils.cleanup import OUTPUTS_DIR, list_output_files, purge_all_outputs
from app.utils.url import file_url

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(verify_api_key)])


@router.get("/files", tags=["storage"], summary="List all job output files")
async def list_files():
    """
    List all stored job output files with URLs, sizes, and timestamps.

    ```bash
    curl http://localhost:9000/files \\
      -H "X-API-Key: your-secret-key"
    ```
    """
    entries = list_output_files()
    result = []
    for e in entries:
        result.append({
            "job_id": e["job_id"],
            "filename": e["filename"],
            "url": file_url(e["job_id"], e["filename"]),
            "size_bytes": e["size_bytes"],
            "created_at": datetime.fromtimestamp(e["created_at"]).isoformat(),
        })
    total_bytes = sum(e["size_bytes"] for e in entries)
    return {"files": result, "count": len(result), "total_size_bytes": total_bytes}


@router.delete("/files", tags=["storage"], summary="Purge all job output files")
async def purge_files():
    """
    Permanently delete all stored job output files.

    ```bash
    curl -X DELETE http://localhost:9000/files \\
      -H "X-API-Key: your-secret-key"
    ```
    """
    count = purge_all_outputs()
    return {"deleted_jobs": count, "message": f"Purged {count} job(s)"}


@router.delete("/files/{job_id}", tags=["storage"], summary="Delete a single job output")
async def delete_job(job_id: str):
    """
    Delete a single job's output directory by its job ID.

    ```bash
    curl -X DELETE http://localhost:9000/files/{job_id} \\
      -H "X-API-Key: your-secret-key"
    ```
    """
    # Reject paths that try to escape the outputs directory
    if "/" in job_id or "\\" in job_id or job_id in (".", ".."):
        raise HTTPException(status_code=400, detail={"error": "Invalid job_id"})

    job_dir = os.path.join(OUTPUTS_DIR, job_id)
    if not os.path.isdir(job_dir):
        raise HTTPException(status_code=404, detail={"error": "Job not found"})

    try:
        shutil.rmtree(job_dir)
    except OSError as e:
        logger.error("Failed to delete job dir %s: %s", job_dir, e)
        raise HTTPException(status_code=500, detail={"error": "Failed to delete job"})

    return {"deleted": job_id}
