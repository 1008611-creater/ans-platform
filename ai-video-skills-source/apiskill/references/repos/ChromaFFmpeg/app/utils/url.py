import os


def get_base_url() -> str:
    return os.environ.get("BASE_URL", "http://localhost:9000").rstrip("/")


def file_url(job_id: str, filename: str) -> str:
    return f"{get_base_url()}/files/{job_id}/{filename}"


def folder_url(folder: str, filename: str) -> str:
    return f"{get_base_url()}/store/{folder}/{filename}"
