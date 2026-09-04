---
name: apiskill
description: name: apiskill
---

---
name: apiskill
description: Build and package media-processing APIs that accept images, prompts, audio, and video, enqueue long-running jobs, run Playwright browser automation, and return durable output-video URLs. Use for API wrappers around web applications, RPA workflows, video-generation pipelines, uploads, API-key authentication, job status, callbacks, Docker deployment, or future tasks that need reusable FastAPI + Redis/Celery + Playwright + MinIO/S3 + PostgreSQL patterns.
---

# API automation skill

Use this skill to turn a repeatable browser-operated media workflow into a deployable HTTP API. Treat the local repositories under `references/repos` as implementation references, not as facts that override the current task.

## Required architecture

Keep request handling separate from browser execution:

1. `FastAPI` validates `X-API-Key`, multipart fields, MIME types, size limits, and idempotency keys.
2. Store every input in local durable storage or `MinIO/S3` under a job-scoped prefix before queueing. Queue only references and metadata, never open upload handles.
3. Persist the job in `PostgreSQL` with `queued`, `running`, `succeeded`, `failed`, and `cancelled` states.
4. Enqueue a small JSON job manifest in `Redis` through `Celery` (or an explicitly chosen equivalent).
5. A worker creates an isolated Playwright `BrowserContext`, runs the site-specific workflow, captures step evidence, and writes the output video to durable storage.
6. Update progress and terminal error details without exposing credentials, cookies, raw provider responses, or local filesystem paths.
7. Return an output URL, preferably a short-lived signed URL, or call a user-provided webhook after the status is committed.

## Default HTTP contract

Use these routes unless the user gives a compatible contract:

- `POST /v1/jobs`: `multipart/form-data` with `prompt`, optional `image`, `audio`, `video`, and workflow options. Return `202` and `{job_id,status,status_url}`.
- `GET /v1/jobs/{job_id}`: return status, progress, timestamps, error code, and output URL when complete.
- `POST /v1/jobs/{job_id}/cancel`: request cancellation when the worker can honor it.
- `GET /healthz`: public liveness only; keep readiness and dependency details protected.

Use `X-API-Key` or `Authorization: Bearer`; do not place secrets in query strings. Compare keys safely, store only hashes or fingerprints, and load secrets from environment/secret storage.

## Playwright workflow rules

- Prefer a first-party application API discovered from browser network traffic when it is stable and authorized; use UI automation only for the steps that require it.
- Never share a browser context, profile, upload directory, or login state between jobs unless the user explicitly requires a serialized account session.
- Define selectors, upload roles, wait conditions, retry limits, and terminal-success evidence in the workflow adapter.
- Keep the workflow idempotent: retries must not create duplicate jobs or overwrite a successful result.
- If the target is a native desktop application rather than a web page, use a desktop adapter. When it is an Electron/Chromium client and the user authorizes a debug launch, Playwright may attach through a loopback CDP endpoint; otherwise return an explicit unavailable state instead of pretending Playwright can control it.

## Media and queue rules

- Validate extension and detected media type; enforce per-file and total request limits.
- Use a job-specific temporary directory and clean it only after the result is persisted.
- Do not use FastAPI in-process background tasks for browser/video jobs; use a real worker queue.
- Set one browser job per worker by default, then scale workers horizontally after measuring memory and account/session limits.
- Record the earliest failed stage (`upload`, `submit`, `wait`, `download`, `persist`) and preserve failed artifacts for diagnosis.

## Implementation workflow

1. Read `references/api-patterns.md` and select the smallest viable storage and queue deployment.
2. Read only the relevant repository under `references/repos` for the requested capability.
3. Define the job manifest and state machine before writing the route or Playwright adapter.
4. Implement API, worker, storage, and persistence as separate modules; provide Docker Compose for local reproducibility.
5. Test authentication, upload limits, duplicate/idempotent requests, worker failure, retry behavior, output readability, and signed URL expiry.
6. Run `scripts/sync_repos.ps1` only when refreshing the reference repositories; never overwrite a user workflow without inspecting its diff.

## Local references

See `references/repo-manifest.md` for the five cloned repositories and their intended use. Do not copy secrets or `.env` values from any reference repository.

## Reusable desktop baseline

`assets/dola-desktop-api` is the working baseline for a local Electron media client: FastAPI routes, Celery/Redis queue, PostgreSQL state, durable output download, and a CDP-attached Playwright adapter. It defaults to preparation-only and requires a second, explicit authorization header before any provider submission. Reuse its job contract and replace only the provider-specific worker for future desktop or web upstreams.
