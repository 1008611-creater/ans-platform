# Project Start Template

Use this template when a new project, new thread, or major task starts and you want to apply skill governance without loading unnecessary context.

## Startup Checklist

1. Read the local `AGENTS.md` or equivalent project rules.
2. Read the primary handoff doc or task spec if it exists.
3. Inspect `git status --short` to see whether the worktree is clean or noisy.
4. Bootstrap compact memory with `codex-agent-mem` for non-trivial work.
5. Choose no more than 3 skills for the current turn.
6. Delay verification skills until verification is actually needed.
7. After meaningful skill use, write a short score record.

## Copyable Prompt

```text
Use skill-governance at C:\Users\lsb\.codex\skills\skill-governance for this task.

Project: <project-name>
Primary task: <task>

Before doing the work:
1. Read the local AGENTS.md or equivalent rules.
2. Read the current handoff/spec if it exists.
3. Inspect git status --short.
4. Use codex-agent-mem for compact continuity if the task is non-trivial.
5. Choose at most 3 necessary skills for this turn and explain why each one is needed.
6. Prefer project-local skills only if they encode domain truth the global champions do not have.
7. After the skill materially affects the work, create a standard score record.
```

## Default Selection Pattern

Use this default unless the task strongly suggests something else:

- Continuity: `codex-agent-mem`
- Workflow control: `agent-team-workflow` for medium-to-large work
- One execution or research skill chosen from the actual task

Examples:

- Web research task: add `jina-search`
- Frontend change: add `frontend-design` or `impeccable`
- Browser verification phase: swap in `playwright`
- Image2 prompt or generation work: add `image2-direct` or `gpt-image-2-style-library`; add `ai-image-video-channel-router` only when an external channel must be selected

## When Not To Use More Skills

Do not keep adding skills because they look relevant. Stop when:

- the current 2-3 skills already cover continuity, workflow, and the active domain need;
- the next candidate skill would mostly duplicate guidance;
- the next candidate skill would only be needed later in the task.
