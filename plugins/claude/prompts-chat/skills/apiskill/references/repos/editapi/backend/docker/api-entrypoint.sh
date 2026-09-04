#!/usr/bin/env bash
set -euo pipefail
sleep 2
uv run alembic upgrade head
exec uv run uvicorn app.main:app --host ${APP_HOST:-0.0.0.0} --port ${APP_PORT:-8000} --proxy-headers
