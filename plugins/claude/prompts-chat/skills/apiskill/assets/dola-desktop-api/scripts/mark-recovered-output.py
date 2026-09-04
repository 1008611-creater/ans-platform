from datetime import datetime, timezone
from pathlib import Path
import sys

from app.database import Job, SessionLocal


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: mark-recovered-output.py <job_id> <output_file>")
    job_id, output_arg = sys.argv[1:]
    output_file = Path(output_arg).resolve()
    if not output_file.is_file() or output_file.stat().st_size == 0:
        raise SystemExit("Output file is missing or empty")

    with SessionLocal.begin() as db:
        job = db.get(Job, job_id)
        if not job:
            raise SystemExit("Job not found")
        job.output_path = str(output_file)
        job.status = "succeeded"
        job.progress = 100
        job.error_code = None
        job.error_message = None
        job.finished_at = datetime.now(timezone.utc)


if __name__ == "__main__":
    main()
