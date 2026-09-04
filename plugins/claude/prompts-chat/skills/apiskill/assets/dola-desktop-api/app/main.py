from contextlib import asynccontextmanager
import hashlib
import hmac
import json
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from fastapi.security import APIKeyHeader
from sqlalchemy import select

from .config import get_settings
from .database import Job, SessionLocal, init_database
from .prompting import build_provider_prompt
from .schemas import JobResponse
from .tasks import enqueue_job


settings = get_settings()
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
SUPPORTED_ASPECT_RATIOS = {"16:9", "9:16", "1:1", "4:3", "3:4"}
MAX_INPUTS = {"image": 30, "audio": 10, "video": 10}


def require_api_key(received: str | None = Depends(api_key_header)) -> None:
    if not settings.api_keys or not received or not any(hmac.compare_digest(received, expected) for expected in settings.api_keys):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_database()
    yield


app = FastAPI(title="Dola Desktop API", version="0.1.0", lifespan=lifespan)


def job_response(job: Job) -> JobResponse:
    return JobResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        status_url=f"/v1/jobs/{job.id}",
        output_url=f"/v1/jobs/{job.id}/download" if job.output_path else None,
        error_code=job.error_code,
        error_message=job.error_message,
        created_at=job.created_at,
        finished_at=job.finished_at,
    )


async def persist_uploads(job_dir: Path, category: str, uploads: list[UploadFile] | None) -> list[dict[str, str | int]]:
    result: list[dict[str, str | int]] = []
    for index, upload in enumerate(uploads or []):
        if not upload.filename:
            continue
        kind = (upload.content_type or "").split("/", 1)[0]
        if kind != category:
            raise HTTPException(status_code=415, detail=f"{upload.filename} is not an {category} file")
        suffix = Path(upload.filename).suffix.lower() or ".bin"
        target = job_dir / "inputs" / f"{category}-{index}{suffix}"
        target.parent.mkdir(parents=True, exist_ok=True)
        total = 0
        digest = hashlib.sha256()
        with target.open("wb") as destination:
            while chunk := await upload.read(1024 * 1024):
                total += len(chunk)
                if total > settings.max_upload_bytes:
                    destination.close()
                    target.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail=f"{upload.filename} exceeds the upload size limit")
                digest.update(chunk)
                destination.write(chunk)
        result.append({"kind": category, "path": str(target), "sha256": digest.hexdigest(), "bytes": total})
    return result


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "upstream": "dola-desktop"}


@app.post("/v1/jobs", status_code=status.HTTP_202_ACCEPTED, response_model=JobResponse, dependencies=[Depends(require_api_key)])
async def create_job(
    prompt: str = Form(..., min_length=1, max_length=12000),
    submit: bool = Form(False),
    account_slot: int = Form(1, ge=1),
    aspect_ratio: str = Form("16:9"),
    image: list[UploadFile] | None = File(None),
    audio: list[UploadFile] | None = File(None),
    video: list[UploadFile] | None = File(None),
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
    generation_authorization: str | None = Header(None, alias="X-Generation-Authorization"),
) -> JobResponse:
    if submit and generation_authorization != "submit":
        raise HTTPException(status_code=403, detail="Set X-Generation-Authorization: submit to authorize a Dola generation.")
    if aspect_ratio not in SUPPORTED_ASPECT_RATIOS:
        raise HTTPException(status_code=422, detail="Unsupported aspect_ratio")
    for category, uploads in {"image": image, "audio": audio, "video": video}.items():
        if len(uploads or []) > MAX_INPUTS[category]:
            raise HTTPException(status_code=422, detail=f"Too many {category} files")

    with SessionLocal() as db:
        if idempotency_key:
            existing = db.scalar(select(Job).where(Job.idempotency_key == idempotency_key))
            if existing:
                return job_response(existing)

    job_id = str(uuid4())
    job_dir = settings.storage_root / "jobs" / job_id
    job_dir.mkdir(parents=True, exist_ok=False)
    inputs = []
    inputs.extend(await persist_uploads(job_dir, "image", image))
    inputs.extend(await persist_uploads(job_dir, "audio", audio))
    inputs.extend(await persist_uploads(job_dir, "video", video))
    manifest = {
        "job_id": job_id,
        "prompt": build_provider_prompt(prompt, aspect_ratio),
        "submit": submit,
        "inputs": inputs,
        "account_slot": account_slot,
        "workflow": {"model": "seedance2.5", "duration_seconds": 30, "aspect_ratio": aspect_ratio},
        "cdp_endpoint": settings.cdp_endpoint,
        "page_url_fragment": settings.dola_page_url_fragment,
        "poll_seconds": settings.dola_poll_seconds,
    }
    manifest_path = job_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")

    with SessionLocal.begin() as db:
        job = Job(id=job_id, idempotency_key=idempotency_key, status="queued", progress=0, manifest_path=str(manifest_path))
        db.add(job)
    enqueue_job(job_id)
    return job_response(job)


@app.get("/v1/jobs/{job_id}", response_model=JobResponse, dependencies=[Depends(require_api_key)])
def get_job(job_id: str) -> JobResponse:
    with SessionLocal() as db:
        job = db.get(Job, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job_response(job)


@app.get("/v1/jobs/{job_id}/download", dependencies=[Depends(require_api_key)])
def download_job_output(job_id: str) -> FileResponse:
    with SessionLocal() as db:
        job = db.get(Job, job_id)
        if not job or job.status != "succeeded" or not job.output_path:
            raise HTTPException(status_code=404, detail="Output not found")
        output_path = Path(job.output_path).resolve()
    jobs_root = (settings.storage_root / "jobs").resolve()
    if jobs_root not in output_path.parents or not output_path.is_file():
        raise HTTPException(status_code=404, detail="Output not found")
    return FileResponse(output_path, media_type="video/mp4", filename=f"{job_id}.mp4")


@app.post("/v1/jobs/{job_id}/cancel", response_model=JobResponse, dependencies=[Depends(require_api_key)])
def cancel_job(job_id: str) -> JobResponse:
    with SessionLocal.begin() as db:
        job = db.get(Job, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if job.status not in {"queued", "prepared"}:
            raise HTTPException(status_code=409, detail="Only queued or prepared jobs can be cancelled.")
        job.status = "cancelled"
        job.progress = 100
        return job_response(job)
