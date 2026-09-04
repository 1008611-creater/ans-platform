# Prompt Skill Router Version Notes

## v0.4.1-user-designated-image2-route-20260814

Checkpoint goal: make the user's designated Image2 execution route the default for image requests.

Changed in this checkpoint:
- Added a user-designated Image2 override: `runninghub-image2-text` for new images and `runninghub-image2-image` for reference-guided edits.
- Kept `image2-storyboard-video` as the method layer for storyboard and film-production-board requests.
- Replaced generic Image2 execution alternatives in the default asset/image rows with the designated RunningHub Image2 routes.

Rollback:
- Prechange full-skill snapshot and hash manifest: `C:\Users\lsb\.codex\skill-version-archive\prompt-skill-router\v0.4.0-user-image2-route-20260814\SNAPSHOT_HASHES.md`

Production boundary:
- No provider submission, image generation, upload, paid execution, or delivery occurred during this Skill update.

## v0.5.0-method-system-20260711 (Candidate, Not Promoted)

Checkpoint goal: convert the user-provided tutorial library into a governed prompt-method system that improves AI-video prompt composition without turning tutorial advice into route facts, channel capability, provider authorization, or production truth.

Changed in this candidate checkpoint:
- Added Grade-C candidate method cards, conditional task-to-method mappings, an offline prompt linter, method-boundary profiles, and a failure recovery library.
- Added a hypothesis/executed-observation/comparison performance-event contract plus offline validator and summary tool. Hypotheses and synthetic fixtures are excluded from method-performance conclusions.
- Added local-validation evidence requirements before a Grade-C method card can support `ready_for_video_task_spec`; source grade remains C after any local evidence.
- Added Chinese method-system and performance-ledger references, plus structural validation coverage.

Promotion boundary:
- This is not a `current live version` change and does not authorize channel execution or Skill release promotion.
- A future owner may consider promotion only after independent review, evidence-backed authorized runs, same-input comparisons where needed, post-coding review, and governance authorization.

Rollback:
- Prechange full-skill snapshot and hash manifest: `C:\Users\lsb\.codex\skill-version-archive\prompt-skill-router\v0.5.0-method-system-20260711\snapshot_manifest.json`

Production boundary:
- No image/video generation, local raster edit, provider access, active job mutation, Artifact Ledger change, packaging, send, or delivery occurred.

## v0.4.0-ai-video-prompt-compiler-20260711

Checkpoint goal: promote the router from a prompt-method selector to the AI-video prompt compilation and release-gate layer without changing specialist-route facts, channel submission authority, active jobs, or production media.

Changed in this checkpoint:
- Added `prompt_routing_contract.v1`, its Chinese contract reference, a template, an offline SHA/path/authority validator, and synthetic positive/negative tests.
- Required AI-video work to pass `specialist facts -> prompt-routing contract -> video_task_spec -> channel` rather than drafting prompt prose directly into Image2 or a channel workflow.
- Bound all active authority artifacts, locked prompt bodies, and upload references to exact absolute paths and SHA256 values; rejected stale aliases, cross-route facts, candidates, evidence-only/local-edit references, unlocked prompts, disabled channels, and compiler-side submit authorization.
- Added the narrow `ai-video-production-router` handoff in both global and project mirrors. The parent remains classifier/dispatcher; the compiler remains control-plane only; `video_task_spec.json` remains the sole channel submission contract.
- Updated the UI metadata and structural quick validation for the new Skill version and contract files.

Rollback:
- Prechange full-skill snapshot and hash manifest: `C:\Users\lsb\.codex\skill-version-archive\prompt-skill-router\v0.4.0-ai-video-prompt-compiler\snapshot_manifest.json`
- Restore only after user approval or a clear production failure, then run the offline validator tests, `python scripts/quick_validate.py`, and post-coding review.

Production boundary:
- No provider login, upload, paid submission, image/video generation, local raster edit, active job status update, artifact-ledger mutation, packaging, or delivery occurred.

## v0.3.0-superi-course-ingestion-20260711

Checkpoint goal: ingest the user-designated 刺猬星球提示词教程 library into a source-graded, reusable script-only short-drama route without copying tutorial prompts as universal truth.

Changed in this checkpoint:
- Indexed and read 16 accessible tutorial lessons covering assets, scene continuity, sketch/storyboard roles, camera angle, focal length, lighting, layered motion, blocking, voice, long-video continuity, character design, styling, and Skill iteration.
- Added `references/superi-prompt-course-20260711.md` with source grade, reusable patterns, non-promotable provider claims, and lesson index.
- Added the script-only novel/screenplay route and asset-first N04 rules to `SKILL.md` and `champion-routes.md`.
- Added a strict two-section `Script-Only Narrative Video Contract` and QA checklist to `prompt-contracts.md`.
- Updated `source-bench.md` and `quick_validate.py` for this governed source.

Rollback:
- Prechange archive snapshot: `C:\Users\lsb\.codex\skill-version-archive\prompt-skill-router\v0.2.7-pre-superi-course-ingestion-20260711`
- Restore only after user approval or a clear production failure, then run `python scripts/quick_validate.py` and post-coding review.

Production boundary:
- No production image/video generation, provider submission, cost spend, package/send, registry promotion, or local raster editing was performed.
- Tutorial claims remain Grade C unless supported by current provider documentation or local production evidence.

## v0.2.1-research-ingestion-20260630

Checkpoint goal: make research ingestion, source grading, and benchmark-derived QA gates durable without touching any production run artifacts.

Changed in this checkpoint:
- Added explicit `A/B/C/D` source grading to `SKILL.md`, `research-ingestion.md`, and `source-bench.md`.
- Added `references/benchmark-gates.md` to convert GenEval/T2I-CompBench/VBench/ReAct/CoT research into local QA gates.
- Added a dated research ledger for primary sources used on 2026-06-30.
- Added `scripts/quick_validate.py` so future edits have a fast structural check.

Rollback:
- Prechange archive snapshot: `C:\Users\lsb\.codex\skill-version-archive\prompt-skill-router\v0.2.1-research-ingestion-20260630-bline-checkpoint-prechange`
- Restore from archive only after user approval or a clear production failure, then run `python scripts/quick_validate.py` and post-coding review.

Production boundary:
- No production run, ledger, manifest, provider log, or RH output path was modified.
- Benchmark sources were converted into QA gates only; no community prompt prose was imported.
