from datetime import datetime
from pydantic import BaseModel


class JobResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    status_url: str
    output_url: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    created_at: datetime | None = None
    finished_at: datetime | None = None
