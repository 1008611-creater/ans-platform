import os
import json
from pathlib import Path

os.environ["DOLA_API_KEYS"] = "test-key"
os.environ["DATABASE_URL"] = "sqlite:///./test-dola.db"
os.environ["STORAGE_ROOT"] = "./test-data"

from fastapi.testclient import TestClient
from app.database import Base, engine
from app.main import app


def test_create_prepared_job(monkeypatch, tmp_path: Path):
    monkeypatch.setattr("app.main.enqueue_job", lambda _: None)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as client:
        response = client.post(
            "/v1/jobs",
            headers={"X-API-Key": "test-key"},
            data={"prompt": "test prompt", "submit": "false"},
            files={"image": ("frame.png", b"png-bytes", "image/png")},
        )
    assert response.status_code == 202
    payload = response.json()
    assert payload["status"] == "queued"
    assert payload["status_url"].endswith(payload["job_id"])


def test_submit_requires_explicit_authorization(monkeypatch):
    monkeypatch.setattr("app.main.enqueue_job", lambda _: None)
    with TestClient(app) as client:
        response = client.post("/v1/jobs", headers={"X-API-Key": "test-key"}, data={"prompt": "test", "submit": "true"})
    assert response.status_code == 403


def test_create_prompt_only_job(monkeypatch):
    monkeypatch.setattr("app.main.enqueue_job", lambda _: None)
    with TestClient(app) as client:
        response = client.post(
            "/v1/jobs",
            headers={"X-API-Key": "test-key"},
            data={"prompt": "prompt only", "submit": "false"},
        )
    assert response.status_code == 202


def test_manifest_uses_fixed_constraints_and_workflow(monkeypatch):
    monkeypatch.setattr("app.main.enqueue_job", lambda _: None)
    with TestClient(app) as client:
        response = client.post(
            "/v1/jobs",
            headers={"X-API-Key": "test-key"},
            data={"prompt": "only this request", "submit": "false", "account_slot": "2", "aspect_ratio": "9:16"},
        )
    assert response.status_code == 202
    job_id = response.json()["job_id"]
    manifest = json.loads((Path("test-data") / "jobs" / job_id / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["workflow"] == {"model": "seedance2.5", "duration_seconds": 30, "aspect_ratio": "9:16"}
    assert manifest["account_slot"] == 2
    assert manifest["prompt"].endswith("【用户提示词】\nonly this request")
    assert "生成模型固定为：seedance2.5" in manifest["prompt"]
