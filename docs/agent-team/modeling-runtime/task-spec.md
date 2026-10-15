# Independent model-worker runtime (2026-10-15)

## Goal and scope

The user authorized fixed-code automatic modeling without AI or Codex approvals during normal operation. Base: main 153309dd. Retain PostgreSQL queue, 10 ANS points, leases, owner authorization, native GLB delivery and storage. No new framework/dependency, database or authentication changes. Four-view generation remains disabled.

- REQ-001: Linux private credential files, retaining Windows DPAPI. Never log credentials or commit private configuration.
- REQ-002: Distinguish transient HTTP/network errors from an explicitly failed supplier task. Resume known task IDs; never repeat paid submission.
- REQ-003: Isolate corrupt/stale journals. Persist intent/task IDs, retry limits and backoff. Manual-review records must not starve the queue.
- REQ-004: Run independently on the always-on server with restart, health status, private persistent journals and read-only code. No public control port or arbitrary-command interface.
- REQ-005: Verify generation, persistence and download within authorized testing bounds. Preserve the Windows rollback service.

## Rules

- RULE-BIZ-001: At most one POST /api/task for a new job. An unknown submission response requires review, never a guessed retry.
- RULE-DATA-001: Existing account, charge, refund, input and lease semantics stay unchanged.
- RULE-AUTH-001: Only this project's worker is migrated. Do not restart the website/database/other projects or stop local port3096 service.
- NON-001: Editor feature parity, new image tests, price changes and enabling four views are outside this change.

## Acceptance

- AC-001 / REQ-001: Validate credential path/type/permissions/size/content; safe errors; Windows fallback preserved.
- AC-002 / REQ-002: Mock 429/503/disconnect followed by success, one paid submission; distinguish explicit terminal failed and unknown submission.
- AC-003 / REQ-003: Corrupt JSON,404,wrong worker and manual review do not block other jobs; known task resumes after process restart. Disk failure must not suppress server ACK. Recovery errors remain degraded.
- AC-004 / REQ-004: Focused tests, full lint and independent review. Commit/PR/review/main before deploying precise worker source. Validate restart only with an empty paid queue.
- AC-005 / REQ-005: Correlate supplier task, ANS job and valid model/hash; clearly distinguish mocks and live paid acceptance. One paid test requires the pending explicit user answer.

## Deployment and rollback

Use a pinned existing Node image and exact reviewed main source for a standalone container. Preserve application configuration and database. Confirm no active model job before disabling the old Windows production worker; retain its DPAPI config/task and local3096 service. On failure stop the new worker and enable/start the original production task. No force push or destructive cleanup.
