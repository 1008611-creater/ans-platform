"""
Shared pytest fixtures.

Env vars are set *before* importing anything under app/, because
app.utils.cleanup.OUTPUTS_DIR and app.utils.folders.FOLDERS_DIR are read
from the environment at module import time, not per-request.
"""
import os
import tempfile

_TMP_ROOT = tempfile.mkdtemp(prefix="chromaffmpeg-tests-")
os.environ.setdefault("API_KEY", "test-api-key")
os.environ.setdefault("BASE_URL", "http://testserver")
os.environ.setdefault("OUTPUTS_DIR", os.path.join(_TMP_ROOT, "outputs"))
os.environ.setdefault("FOLDERS_DIR", os.path.join(_TMP_ROOT, "folders"))

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def auth_headers():
    return {"X-API-Key": os.environ["API_KEY"]}
