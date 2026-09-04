import logging
import os
import re
import shutil

from fastapi import HTTPException

logger = logging.getLogger(__name__)

FOLDERS_DIR = os.environ.get("FOLDERS_DIR", "/data/folders")


def sanitize_name(name: str) -> str:
    """Strip to alphanumeric, hyphens, underscores. Max 64 chars."""
    safe = re.sub(r"[^a-zA-Z0-9_\-]", "_", name.strip())
    return safe[:64]


def get_folder_path(name: str) -> str:
    return os.path.join(FOLDERS_DIR, sanitize_name(name))


def create_folder(name: str) -> str:
    safe = sanitize_name(name)
    os.makedirs(os.path.join(FOLDERS_DIR, safe), exist_ok=True)
    return safe


def list_folders() -> list[dict]:
    if not os.path.isdir(FOLDERS_DIR):
        return []
    result = []
    for entry in sorted(os.scandir(FOLDERS_DIR), key=lambda e: e.name):
        if not entry.is_dir():
            continue
        files = [f for f in os.scandir(entry.path) if f.is_file() and not f.name.startswith(".")]
        result.append({
            "name": entry.name,
            "file_count": len(files),
            "total_size_bytes": sum(f.stat().st_size for f in files),
        })
    return result


def list_folder_files(name: str) -> list[dict]:
    path = get_folder_path(name)
    if not os.path.isdir(path):
        return []
    files = []
    for entry in sorted(os.scandir(path), key=lambda e: e.stat().st_mtime, reverse=True):
        if entry.is_file() and not entry.name.startswith("."):
            stat = entry.stat()
            files.append({
                "filename": entry.name,
                "size_bytes": stat.st_size,
                "created_at": stat.st_mtime,
            })
    return files


def delete_folder(name: str) -> bool:
    path = get_folder_path(name)
    if not os.path.isdir(path):
        return False
    shutil.rmtree(path, ignore_errors=True)
    return True


def unique_filename(folder_path: str, filename: str) -> str:
    """Return a filename that does not already exist in folder_path."""
    dest = os.path.join(folder_path, filename)
    if not os.path.exists(dest):
        return filename
    base, ext = os.path.splitext(filename)
    counter = 1
    while os.path.exists(os.path.join(folder_path, f"{base}_{counter}{ext}")):
        counter += 1
    return f"{base}_{counter}{ext}"


def resolve_output(job_dir: str, filename: str, folder: str | None) -> dict:
    """
    Build the response dict for a processed output file.

    If *folder* is provided the output is copied into that named folder and a
    /store/ URL is returned.  If the folder does not exist a 404 is raised.
    Otherwise the standard /files/{job_id}/ URL is returned.
    """
    from app.utils.url import file_url, folder_url  # local import avoids circular dep

    job_id = os.path.basename(job_dir)

    if not folder:
        return {"url": file_url(job_id, filename), "filename": filename, "job_id": job_id}

    safe = sanitize_name(folder)
    folder_path = get_folder_path(safe)
    os.makedirs(folder_path, exist_ok=True)

    unique = unique_filename(folder_path, filename)
    src = os.path.join(job_dir, filename)
    dst = os.path.join(folder_path, unique)
    try:
        shutil.copy2(src, dst)
    except OSError as e:
        logger.error("resolve_output: failed to copy '%s' → '%s': %s", src, dst, e)
        raise HTTPException(
            status_code=500,
            detail={"error": f"Failed to save output to folder '{safe}': {e.strerror}"},
        )
    return {"url": folder_url(safe, unique), "filename": unique, "folder": safe}
