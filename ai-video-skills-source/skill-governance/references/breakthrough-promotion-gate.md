# Breakthrough Promotion Gate

Use this gate when the user explicitly calls a result a breakthrough, or when a change first restores a previously blocked execution chain such as authentication, model access, employee visibility, provider routing, delivery, or recovery.

The purpose is to make the next same task naturally follow the proven path. A breakthrough is not durable merely because a thread summary, screenshot, or one successful call exists.

## Required Evidence Packet

Record only non-secret facts:

```text
problem: the earliest broken contract
correct_path: canonical source -> route -> execution host -> downstream action -> receipt/QA
verified_path: exact steps that actually completed
success_event: the event and fields that prove completion
negative_evidence: forbidden or rejected paths that stayed unused
evidence_level: structural | integrated | real_delivery
rollback: reversible recovery path and retained backup, when applicable
remaining_gates: UI, pin, provider, cost, data, deployment, delivery, or durability gaps
```

Do not store passwords, keys, tokens, cookies, private keys, raw authorization headers, browser profiles, or sensitive payloads in the packet.

## Promotion Sequence

1. Reconstruct what should have happened end to end before describing the observed failure.
2. Verify the actual success event. Prefer terminal completion or receipt fields over process state, text output, or `idle`.
3. Identify the narrowest durable owner:
   - global cross-project rule -> global governance Skill;
   - project execution order or host boundary -> project `AGENTS.md`, project router Skill, route matrix, or validator;
   - machine-decidable invariant -> test, schema, linter, or gate;
   - volatile evidence and current status -> project ledger or master-control memory.
4. Preserve the proven order, required inputs, exact success criteria, prohibited fallbacks, side-effect boundaries, rollback, and evidence label.
5. Add a negative check for the failure that was fixed whenever it can be tested without real spend or production mutation.
6. If a shared-source owner is active, do not edit its files concurrently. Record the verified checkpoint and queue a compatible sync after the owner's current phase.
7. Run the relevant structural and integrated checks, then perform mandatory `post-coding-review` on the actual changed files and downstream path.
8. Sync the promoted rule to every execution host that consumes it and verify hashes or live readback before saying the route is installed there.

## Mac Codex Desktop App Employee Pattern

For a Mac Codex Desktop App employee model-channel repair, keep these responsibilities separate:

```text
Cockpit provider store
-> named Mac process environment variable
-> user-level Codex custom provider using env_key
-> Codex Desktop App restart after environment injection
-> reuse existing App thread IDs
-> read-only bootstrap turn
-> exact turn/completed + status=completed + error=null
-> thread/read and thread/list readback
-> user visual sidebar confirmation when UI visibility is claimed
```

Durable boundaries:

- The model channel used by the Codex employee is not the same thing as the project's media-generation Provider. A successful Codex model turn never authorizes Mimo, Image2, upload, generation, spend, deployment, or production-data changes.
- Receipts and route schemas must keep those networks separate: record the Codex employee connection under an `employee_model_channel` node (including non-secret requested/used evidence), while media execution uses distinct `media_provider_network_requested`, `media_provider_submit_requested`, upload, spend, and deploy fields. A generic `provider_network_requested=false` is ambiguous after a real Codex model turn and must not be used to imply both channels were offline.
- Keep the provider key on the owning Mac. Reference only the environment-variable name in Codex configuration and route documentation.
- Prefer `env_key` with the provider's normal `responses` wire contract and the correct authentication flag. Do not persist a real key in `config.toml`, prompts, project files, static headers, receipts, or chat.
- Do not use deprecated or insecure static bearer-token fields when the environment-key contract works.
- Do not recreate employee threads to repair authentication or visibility. Resume the existing IDs and inspect their current turns before dispatch.
- A model response, `idle`, or an assistant message is insufficient. The success event is the exact matching `turn/completed` notification with `status=completed` and `error=null`, followed by thread readback.
- `thread/list` proves app-server listing, not human-visible sidebar state or `pinned:true`. UI visibility requires supported App/UI evidence or explicit user confirmation; pin remains independent.
- A read-only bootstrap proves `integrated` employee/model readiness only. It is not `real_delivery` until an authorized project task follows the intended Skill route, performs the allowed downstream production, passes QA/retry, and returns evidence to the website or customer surface.

Recommended no-side-effect regression cases:

- valid environment-key provider -> matching bootstrap completion;
- stale OpenAI-login/static-token assembly -> rejected or superseded;
- missing environment variable -> typed authentication/configuration blocker;
- existing thread with active turn -> no duplicate dispatch;
- five existing thread IDs -> no recreation during channel repair;
- test-only receipt -> cannot unlock real downstream work;
- app-server listed but no UI confirmation -> visibility remains unverified;
- no provider/media/cost/deploy side effects during readiness training.

## Stop-Early Audit

Reject promotion as complete when any of the following is true:

- only a plan, config edit, ping, or synthetic fixture exists;
- the expected downstream receipt or completion event was never read back;
- an old or different thread/task was inspected instead of the exact current one;
- a secret was copied into a durable file to make the test pass;
- a hidden CLI worker is presented as a Desktop App employee;
- thread listing is presented as proof of sidebar visibility or pinning;
- integrated readiness is presented as real media/customer delivery;
- project route files remain stale and no owner-safe sync is queued.
