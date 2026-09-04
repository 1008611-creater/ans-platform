from dataclasses import dataclass
from pathlib import Path
import os


@dataclass(frozen=True)
class Settings:
    api_keys: tuple[str, ...]
    database_url: str
    celery_broker_url: str
    celery_result_backend: str
    storage_root: Path
    max_upload_bytes: int
    cdp_endpoint: str
    node_executable: str
    dola_page_url_fragment: str
    dola_poll_seconds: int


def get_settings() -> Settings:
    keys = tuple(key.strip() for key in os.getenv("DOLA_API_KEYS", "").split(",") if key.strip())
    return Settings(
        api_keys=keys,
        database_url=os.getenv("DATABASE_URL", "sqlite:///./data/dola.db"),
        celery_broker_url=os.getenv("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0"),
        celery_result_backend=os.getenv("CELERY_RESULT_BACKEND", "redis://127.0.0.1:6379/1"),
        storage_root=Path(os.getenv("STORAGE_ROOT", "./data")).resolve(),
        max_upload_bytes=int(os.getenv("MAX_UPLOAD_BYTES", str(1024 * 1024 * 1024))),
        cdp_endpoint=os.getenv("DOLA_CDP_ENDPOINT", "http://127.0.0.1:9222"),
        node_executable=os.getenv("DOLA_NODE_EXECUTABLE", "node"),
        dola_page_url_fragment=os.getenv("DOLA_PAGE_URL_FRAGMENT", "dola.com"),
        dola_poll_seconds=int(os.getenv("DOLA_POLL_SECONDS", "900")),
    )
