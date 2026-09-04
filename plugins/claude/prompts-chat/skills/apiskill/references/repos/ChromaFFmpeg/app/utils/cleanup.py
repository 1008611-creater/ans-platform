import os
import shutil
import uuid

OUTPUTS_DIR = os.environ.get("OUTPUTS_DIR", "/data/outputs")


def make_job_dir() -> str:
    job_dir = os.path.join(OUTPUTS_DIR, str(uuid.uuid4()))
    os.makedirs(job_dir, exist_ok=True)
    return job_dir


def cleanup_job_dir(job_dir: str) -> None:
    """Remove a single job directory (used only on error)."""
    shutil.rmtree(job_dir, ignore_errors=True)


def purge_all_outputs() -> int:
    """Delete all job directories. Returns count of jobs removed."""
    if not os.path.isdir(OUTPUTS_DIR):
        return 0
    dirs = [e for e in os.scandir(OUTPUTS_DIR) if e.is_dir()]
    for entry in dirs:
        shutil.rmtree(entry.path, ignore_errors=True)
    return len(dirs)


def list_output_files() -> list[dict]:
    """Return a list of all stored output files with metadata."""
    files = []
    if not os.path.isdir(OUTPUTS_DIR):
        return files
    for job_entry in sorted(os.scandir(OUTPUTS_DIR), key=lambda e: e.stat().st_mtime, reverse=True):
        if not job_entry.is_dir():
            continue
        job_id = job_entry.name
        for file_entry in os.scandir(job_entry.path):
            if file_entry.is_file() and not file_entry.name.startswith("."):
                stat = file_entry.stat()
                files.append({
                    "job_id": job_id,
                    "filename": file_entry.name,
                    "size_bytes": stat.st_size,
                    "created_at": stat.st_mtime,
                })
    return files
