---
name: codex-agent-mem
description: name: codex-agent-mem
---

---
name: codex-agent-mem
description: name: codex-agent-mem
---

---
name: codex-agent-mem
description: Use when Codex should use or maintain the local codex-agent-mem MCP memory layer for project continuity, thread bootstrap, scope guardrails, durable decisions, open-work checks, completion checks, snapshots, policies, or when the user mentions codex-agent-mem, memory, 记忆层, 上下文包, continuity, mem_context_pack, mem_open_work, or wants the workflow applied to every thread.
---

# Codex Agent Mem

Use the local `codex-agent-mem` MCP server as a continuity layer. It stores compact project memory in local SQLite and helps prevent scope drift and premature "done" claims.

Memory is helper context, not authority. System, developer, user, repo, and `AGENTS.md` instructions still win. Do not store secrets, credentials, cookies, private keys, or full sensitive payloads in memory notes.

## Thread Start

For any non-trivial task, long-running project, three-window workflow, code/config change, content production run, or cross-thread continuation:

1. Call `mem_bootstrap_context` with `project_key`, current cwd/repo path, and a short task hint.
2. If it returns `lane_needs_session_selection`, call `mem_session_list`, select the relevant session, then call `mem_context_pack` with that `session_id`.
3. If it warns about broad scope or ambiguity, avoid a project-wide pack. Use `mem_scope_resolve`, `mem_scope_guard`, or `mem_project_brief` until the scope is clear.
4. Keep the returned context compact. Pull exact observations with `mem_get` or `mem_search` only when needed.

Recommended start:

```text
mem_bootstrap_context(project_key="<repo-or-workspace>", current_cwd="<cwd>", repo_path="<repo>", hint="<task>", budget="auto")
```

## During Work

- Use `mem_search` for prior decisions, constraints, blockers, or reusable workflows.
- Use `mem_note_create` for durable decisions, stable SOPs, verified paths, and cross-thread guardrails.
- Use `mem_recent_changes` when resuming after interruption or context compaction.
- Use `mem_health` if memory seems duplicated, stale, or contradictory.
- Use snapshots before large memory or project-rule changes when the MCP server is writable.

Good memory notes are short and operational:

```text
Decision: For digital-human videos, generate and approve TTS audio before LatentSync video synthesis.
Path: D:\codex-work\gg\ai-live-studio\docs\image2-demo-digital-human-handoff.md
```

## Before Completion

Before claiming a substantial task is complete:

1. Call `mem_open_work`.
2. Call `mem_completion_check`.
3. If there are pending items, blockers, missing DoD evidence, or a closure mismatch, say what remains instead of saying done.
4. If checks pass or only irrelevant smoke-test entries remain, give a concise completion summary with verification evidence.

## Three-Window Use

- Window A: bootstrap memory, read scope guardrails, and write numbered requirements or candidate cards. Do not produce final media.
- Window B: read the spec and relevant context pack, implement only confirmed scope, and create durable memory notes for reusable decisions.
- Window C: use `mem_open_work` and `mem_completion_check` as part of independent verification. Do not fix while reviewing.

## Local Fallback

If the MCP tools are not visible:

- Run `scripts/check-codex-agent-mem.ps1` to verify install/config.
- Run `scripts/bootstrap-snippet.ps1` to regenerate a Codex config snippet.
- Continue from `AGENTS.md`, Obsidian, and local project docs without pretending memory was read.

See `references/setup-and-thread-policy.md` for local paths and configuration details.
