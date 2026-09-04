from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess

from celery import Celery
import httpx

from .config import get_settings
from .database import Job, SessionLocal
from .storage import persist_video_output


settings = get_settings()
celery_app = Celery("dola_desktop_api", broker=settings.celery_broker_url, backend=settings.celery_result_backend)


def _update(job: Job, *, status: str, progress: int, error_code: str | None = None, error_message: str | None = None) -> None:
    job.status = status
    job.progress = progress
    job.error_code = error_code
    job.error_message = error_message
    if status == "running":
        job.started_at = datetime.now(timezone.utc)
    if status in {"prepared", "succeeded", "failed", "cancelled"}:
        job.finished_at = datetime.now(timezone.utc)


@celery_app.task(name="dola.execute_job", bind=True, acks_late=True)
def execute_job(self, job_id: str) -> None:
    with SessionLocal.begin() as db:
        job = db.get(Job, job_id)
        if not job or job.status == "cancelled":
            return
        _update(job, status="running", progress=10)
        manifest_path = Path(job.manifest_path)

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not manifest["submit"]:
        with SessionLocal.begin() as db:
            job = db.get(Job, job_id)
            if job and job.status != "cancelled":
                _update(job, status="prepared", progress=100)
        return

    worker = Path(__file__).resolve().parents[1] / "worker" / "dola-cdp-worker.mjs"
    command = [settings.node_executable, str(worker), "--manifest", str(manifest_path)]
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=settings.dola_poll_seconds + 60, check=False)
        payload = json.loads(result.stdout.strip() or "{}")
    except subprocess.TimeoutExpired:
        payload = {"ok": False, "error_code": "DOLA_TIMEOUT", "error_message": "Dola task did not complete before the configured timeout."}
    except json.JSONDecodeError:
        payload = {"ok": False, "error_code": "DOLA_WORKER_PROTOCOL", "error_message": "Dola worker did not return a valid result."}

    with SessionLocal.begin() as db:
        job = db.get(Job, job_id)
        if not job or job.status == "cancelled":
            return
        if payload.get("ok"):
            try:
                output_path = persist_video_output(payload["output_url"], manifest_path.parent / "output")
            except (KeyError, OSError, ValueError, httpx.HTTPError) as error:
                _update(job, status="failed", progress=100, error_code="OUTPUT_PERSIST_FAILED", error_message=str(error))
                return
            job.output_path = str(output_path)
            job.provider_task_id = payload.get("provider_task_id")
            _update(job, status="succeeded", progress=100)
        else:
            _update(job, status="failed", progress=100, error_code=payload.get("error_code", "DOLA_WORKER_FAILED"), error_message=payload.get("error_message", "Dola worker failed."))


def enqueue_job(job_id: str) -> None:
    execute_job.delay(job_id)
