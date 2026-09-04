# API patterns

## Job lifecycle

```text
POST /v1/jobs
  -> authenticate and validate
  -> persist uploads
  -> insert PostgreSQL job
  -> enqueue Celery manifest
  -> 202 {job_id}

worker
  -> claim job
  -> run Playwright adapter
  -> persist output
  -> commit terminal state
  -> webhook or polling sees output_url
```

The queue message should contain `job_id`, `workflow`, `input_object_keys`, `prompt`, and an idempotency token. It should not contain file bytes, API keys, cookies, or provider credentials.

## Suggested data model

`jobs`: `id`, `client_id`, `workflow`, `status`, `progress`, `idempotency_key`, `input_manifest`, `output_key`, `error_code`, `error_message_safe`, `created_at`, `started_at`, `finished_at`.

`job_events`: `job_id`, `stage`, `message_safe`, `attempt`, `created_at`. Keep provider logs in protected storage and expose only safe summaries.

## Storage layout

```text
jobs/{job_id}/inputs/image.ext
jobs/{job_id}/inputs/audio.ext
jobs/{job_id}/inputs/video.ext
jobs/{job_id}/output/output.mp4
jobs/{job_id}/evidence/step-*.png
```

Use MinIO locally and S3-compatible storage in production. Return signed download URLs rather than exposing the bucket publicly.

## Failure policy

Retry transient network, browser startup, and provider wait failures with bounded exponential backoff. Do not retry invalid input, authentication, policy, or deterministic selector failures automatically. Preserve the earliest failing stage and the job's last known browser state.

## Local reference map

- `web2api`: recipe model, browser pool, token-protected HTTP routes.
- `desafio-01`: FastAPI-to-Playwright flow, auth, isolated contexts, Docker.
- `sample-browser-order-automation-agentcore`: queue, progress, worker orchestration, object storage architecture.
- `editapi`: media upload metadata, persistent jobs, Postgres, video processing and output states.
- `ChromaFFmpeg`: API-key header, media folders, output URL and download behavior.
