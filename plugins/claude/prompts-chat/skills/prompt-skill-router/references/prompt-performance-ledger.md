# Prompt Performance Ledger

## Purpose

The performance ledger records evidence about prompts and method cards after a later execution has actually produced auditable output. It is separate from prompt candidates and separate from the production Artifact Ledger.

```text
hypothesis: a method proposal, excluded from statistics
executed_observation: execution, output, and evaluation evidence exist
comparison: two or more evidence-backed observations plus same-input proof
invalidated: prior observation is no longer usable
```

## Evidence Rules

- Every event binds its prompt-routing contract to an absolute path and SHA256.
- `hypothesis` has `execution_evidence=null`, stays non-promotable, and is excluded by the summarizer.
- `executed_observation` requires exact execution, observed-output, and evaluation evidence paths/SHA256 values.
- `comparison` additionally requires baseline event IDs and a same-input proof.
- A single event, a tutorial lesson, a synthetic fixture, or an unverified provider task cannot establish a default method or winner.
- The ledger never changes a Skill, route, channel policy, job status, Artifact Ledger, or release registry.

## Validate And Summarize

```powershell
python scripts\validate_prompt_performance_event.py --event "<absolute event.json>"
python scripts\summarize_prompt_performance.py --ledger "<absolute events.jsonl>"
```

The summarizer reports valid observations by method card, QA outcome, and failure tags. It lists invalid/excluded events and reports only evidence-backed promotion candidates. Promotion remains a separate `skill-governance -> challenger -> same-input regression -> post-coding review -> authorization` process.
