# Setup And Thread Policy

## Local Installation

- Package: `codex-agent-mem`
- Version verified: `1.0.2`
- Source: `https://github.com/MarceloCaporale/codex-agent-mem`
- pipx venv: `C:\Users\lsb\pipx\venvs\codex-agent-mem`
- Python: `C:\Users\lsb\pipx\venvs\codex-agent-mem\Scripts\python.exe`
- SQLite DB: `C:\Users\lsb\.codex_agent_mem\codex_agent_mem.db`
- Codex config: `C:\Users\lsb\.codex\config.toml`

## Codex Config Expectations

The config should contain:

- Top-level `notify` calling `codex_agent_mem.codex_notify`.
- `[mcp_servers."codex-agent-mem"]`.
- `--idle-timeout-seconds` set to `1800` for Codex Desktop stability.
- `--profile full`.
- `--response-mode compact`.
- `--db-path C:\Users\lsb\.codex_agent_mem\codex_agent_mem.db`.

## Validation Commands

```powershell
$env:USERPROFILE\.codex\skills\codex-agent-mem\scripts\check-codex-agent-mem.ps1 -ProjectKey D:\codex-work\ip
$env:USERPROFILE\.codex\skills\codex-agent-mem\scripts\bootstrap-snippet.ps1
```

## Thread Policy

Use memory on every substantial thread:

1. Bootstrap context before planning.
2. Keep scope guarded during work.
3. Record stable decisions as short notes.
4. Check open work and completion before final claims.

Do not use memory for secrets, credential storage, or as a replacement for primary evidence.

## Project-Specific Routing

For `D:\codex-work\ip`, read the project routing files when memory scope is broad or a new thread only says "continue":

```text
D:\codex-work\ip\docs\agent-team\context-memory-routing.md
D:\codex-work\ip\docs\agent-team\thread-history-20260522.md
D:\codex-work\ip\docs\agent-team\long-term-plan.md
```

