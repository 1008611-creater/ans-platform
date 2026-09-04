# Skill Evidence Ledger

`skill-use-ledger.jsonl` is the append-only source for real-use routing evidence. Do not backfill it from old summaries unless the original task outcome, verification level, and authority boundary are known.

Each row records one Skill's role in one real task. It must contain the selected route role, score dimensions, outcome, highest verification level, user feedback state, external-effect class, and optional durable local evidence references. Do not record URLs, task IDs, credentials, tokens, cookies, passwords, or provider payloads.

Use the scorer after a Skill materially affects a real task:

```powershell
$python = 'C:\Users\lsb\anaconda3\python.exe'
& $python C:\Users\lsb\.codex\skills\skill-governance\scripts\score_skill_use.py `
  --project <project> --skill <skill> --task <short-task-class> `
  --route-role primary --outcome completed --verification-level integrated `
  --user-feedback pending --external-effects local_only `
  --trigger 2 --rework 1 --context 2 --evidence 2 --noise 2 `
  --ledger C:\Users\lsb\.codex\skills\skill-governance\references\skill-use-ledger.jsonl
```

Validate before using ledger counts to promote, restrict, merge, or archive a Skill:

```powershell
& $python C:\Users\lsb\.codex\skills\skill-governance\scripts\validate_skill_evidence_ledger.py `
  C:\Users\lsb\.codex\skills\skill-governance\references\skill-use-ledger.jsonl
```

Promotion requires repeated real-use evidence, not one high score. Treat blocked, partial, or negative-feedback rows as diagnostic evidence; never delete them to improve an average.
