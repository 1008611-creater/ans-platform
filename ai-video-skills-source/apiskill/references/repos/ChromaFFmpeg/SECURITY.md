# Security Policy

ChromaFFmpeg is a self-hosted service that downloads and processes attacker-influenced media
(if you don't fully trust everyone with your API key). Security reports are welcome and taken
seriously.

## Supported Versions

There are no tagged releases yet — only the latest commit on `master` is supported. If you're
running an older checkout, update to the latest `master` before reporting an issue, since it
may already be fixed.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security reports.

Use [GitHub's private vulnerability reporting](https://github.com/leksautomate/ChromaFFmpeg/security/advisories/new)
for this repository (Security tab → "Report a vulnerability"). If that isn't available on the
repo, open a normal issue asking for a private contact channel and no other details — a
maintainer will follow up.

Please include:
- The endpoint / file / commit affected
- Steps to reproduce, or a minimal proof of concept
- The impact you believe it has (e.g. SSRF, local file read, resource exhaustion, auth bypass)

There's no formal SLA (this is a small, solo-maintained project), but reports are triaged on a
best-effort basis and credited in the fix commit/release notes unless you ask not to be.

## Scope

In scope: the FastAPI application (`app/`), the web UI (`static/`), the Dockerfile, and the
deployment scripts (`deploy.sh`, `server-setup.sh`).

## Design decisions that are *not* vulnerabilities

These are intentional trade-offs, documented in the [README](README.md#architecture--trust-boundaries):

- `/files/*` and `/store/*` are **unauthenticated static file mounts** — the random filename in
  the URL is the access token, not the `X-API-Key` header. Anyone with a URL can read that file.
  Put a reverse proxy in front if you need stricter access control.
- There is a **single shared API key** for all mutating/processing endpoints — no per-client
  scoping, no rate limiting. Anyone holding the key can purge all stored output and folders.
- FFmpeg/ffprobe run as subprocesses against attacker-reachable input. Parser bugs in FFmpeg
  itself are FFmpeg's attack surface, not this project's — but if you find a way to reach an
  FFmpeg protocol handler (`file:`, `concat:`, `subfile:`, etc.) through an input this API is
  supposed to restrict to plain HTTP(S), **that** is in scope (see `POST /metadata`'s
  `protocol_whitelist` handling in `app/routes/metadata.py` for the current mitigation).

If you're unsure whether something is a "real" finding or one of the above, report it anyway —
worst case we point at this file.
