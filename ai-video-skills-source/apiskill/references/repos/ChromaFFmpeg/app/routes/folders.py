import logging
import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth import verify_api_key
from app.utils.folders import (
    create_folder, delete_folder, get_folder_path,
    list_folder_files, list_folders, sanitize_name,
)
from app.utils.url import folder_url

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(verify_api_key)])


class CreateFolderRequest(BaseModel):
    name: str


@router.get("/folders", tags=["storage"], summary="List all folders")
async def get_folders():
    """
    List all named folders with file counts and total sizes.

    ```bash
    curl http://localhost:9000/folders \\
      -H "X-API-Key: your-secret-key"
    ```
    """
    folders = list_folders()
    return {"folders": folders, "count": len(folders)}


@router.post("/folders", tags=["storage"], summary="Create a folder")
async def create_folder_endpoint(req: CreateFolderRequest):
    """
    Create a named folder for organizing files.

    Folder names are sanitized — only alphanumeric characters, hyphens, and underscores
    are kept (max 64 chars).

    > **Note:** You rarely need to call this manually. Folders are created automatically
    > by `POST /upload` and all processing endpoints (`/merge`, `/combine`, etc.)
    > whenever a folder name is used for the first time.
    > Built-in auto-folders: `audio` (audio uploads), `upload` (other uploads), `main` (combine output).

    ```bash
    curl -X POST http://localhost:9000/folders \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d '{"name": "my-project"}'
    ```
    """
    if not req.name.strip():
        raise HTTPException(status_code=400, detail={"error": "Folder name cannot be empty"})
    try:
        name = create_folder(req.name)
    except OSError as e:
        logger.error("Failed to create folder '%s': %s", req.name, e)
        raise HTTPException(status_code=500, detail={"error": f"Could not create folder: {e.strerror}"})
    return {"name": name, "created": True}


@router.get("/folders/{name}/urls", tags=["storage"], summary="Get folder URLs as a /combine payload")
async def get_folder_urls(
    name: str,
    type: str = Query("video", description="'video' or 'audio'"),
    reencode: bool = Query(False, description="Pass true for mixed-codec sources"),
):
    """
    Return all file URLs in a folder formatted as a ready-to-POST `/combine` body.

    **Query parameters:**
    - `type`: `video` (default) or `audio`
    - `reencode`: `true` for mixed-codec sources

    ```bash
    curl "http://localhost:9000/folders/my-project/urls?type=video&reencode=false" \\
      -H "X-API-Key: your-secret-key"
    ```

    The response can be piped directly into `POST /combine`:
    ```bash
    curl -X POST http://localhost:9000/combine \\
      -H "Content-Type: application/json" \\
      -H "X-API-Key: your-secret-key" \\
      -d "$(curl -s 'http://localhost:9000/folders/my-project/urls?type=video' -H 'X-API-Key: your-secret-key' | python3 -c 'import sys,json; d=json.load(sys.stdin); print(json.dumps({\"type\":d[\"type\"],\"urls\":d[\"urls\"],\"reencode\":d[\"reencode\"]}))')"
    ```
    """
    if type not in ("video", "audio"):
        raise HTTPException(status_code=400, detail={"error": "type must be 'video' or 'audio'"})
    safe = sanitize_name(name)
    if not os.path.isdir(get_folder_path(safe)):
        raise HTTPException(status_code=404, detail={"error": "Folder not found"})
    try:
        files = list_folder_files(safe)
    except OSError as e:
        logger.error("Failed to list folder '%s': %s", safe, e)
        raise HTTPException(status_code=500, detail={"error": "Failed to read folder contents"})
    urls = [folder_url(safe, f["filename"]) for f in files]
    return {
        "type": type,
        "urls": urls,
        "reencode": reencode,
        "count": len(urls),
    }


@router.get("/folders/{name}", tags=["storage"], summary="List files in a folder")
async def get_folder(name: str):
    """
    List all files inside a named folder, with URLs, sizes, and timestamps.

    ```bash
    curl http://localhost:9000/folders/my-project \\
      -H "X-API-Key: your-secret-key"
    ```
    """
    safe = sanitize_name(name)
    if not os.path.isdir(get_folder_path(safe)):
        raise HTTPException(status_code=404, detail={"error": "Folder not found"})
    try:
        files = list_folder_files(safe)
    except OSError as e:
        logger.error("Failed to list folder '%s': %s", safe, e)
        raise HTTPException(status_code=500, detail={"error": "Failed to read folder contents"})
    result = [
        {
            **{k: v for k, v in f.items() if k != "created_at"},
            "url": folder_url(safe, f["filename"]),
            "created_at": datetime.fromtimestamp(f["created_at"]).isoformat(),
        }
        for f in files
    ]
    return {
        "folder": safe,
        "files": result,
        "count": len(result),
        "total_size_bytes": sum(f["size_bytes"] for f in files),
    }


@router.delete("/folders/{name}", tags=["storage"], summary="Delete a folder")
async def delete_folder_endpoint(name: str):
    """
    Delete a folder and all files inside it permanently.

    ```bash
    curl -X DELETE http://localhost:9000/folders/my-project \\
      -H "X-API-Key: your-secret-key"
    ```
    """
    safe = sanitize_name(name)
    if not os.path.isdir(get_folder_path(safe)):
        raise HTTPException(status_code=404, detail={"error": "Folder not found"})
    try:
        delete_folder(safe)
    except OSError as e:
        logger.error("Failed to delete folder '%s': %s", safe, e)
        raise HTTPException(status_code=500, detail={"error": "Failed to delete folder"})
    return {"deleted": safe}


@router.delete("/folders/{name}/{filename}", tags=["storage"], summary="Delete a file from a folder")
async def delete_folder_file(name: str, filename: str):
    """
    Delete a single file from a named folder.

    ```bash
    curl -X DELETE http://localhost:9000/folders/my-project/photo.jpg \\
      -H "X-API-Key: your-secret-key"
    ```
    """
    safe = sanitize_name(name)
    safe_file = os.path.basename(filename)
    if not safe_file or safe_file in (".", ".."):
        raise HTTPException(status_code=400, detail={"error": "Invalid filename"})
    path = os.path.join(get_folder_path(safe), safe_file)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail={"error": "File not found"})
    try:
        os.remove(path)
    except OSError as e:
        logger.error("Failed to delete file '%s' from folder '%s': %s", safe_file, safe, e)
        raise HTTPException(status_code=500, detail={"error": "Failed to delete file"})
    return {"deleted": safe_file, "folder": safe}
