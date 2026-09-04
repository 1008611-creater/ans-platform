# Prompt Method System

## Purpose

This system turns the user-provided tutorial library into small candidate methods that can be selected, linted, tested, and later evaluated against real evidence. It does not turn a tutorial into production truth.

```text
Grade-C tutorial source
-> candidate method card
-> conditional task-method map
-> prompt-routing contract and offline lint
-> later authorized execution outside this system
-> executed performance evidence
-> same-input comparison and governed promotion decision
```

## Source And Authority Boundary

The tutorial source remains `Grade C` permanently. Its cards are `candidate`, `default_enabled=false`, and `requires_local_validation=true`.

Authority precedence remains:

```text
current user instruction and project rules
-> specialist-route accepted facts
-> confirmed exact references and locked prompt contract
-> method cards, maps, linter, and recovery advice
-> current job-local channel capability and policy
-> provider/media/ledger/delivery evidence
```

Method cards organize facts into visible instructions. They cannot create facts, change an accepted source route, select a provider, grant cost or submit authorization, or declare delivery.

## Six Assets

| Asset | Role | Never does |
|---|---|---|
| `prompt_method_cards.v1.json` | Atomic directing methods such as space, camera, light, action, emotion, text, continuity, and product evidence | Claims a tutorial guarantee or provider capability |
| `ai_video_task_method_map.v1.json` | Conditional task-type method combinations and expected anchors | Replaces a specialist route or inserts a storyboard implicitly |
| `prompt_lint_rules.v1.json` + linter | Offline contract/prompt completeness checks | Rewrites a prompt, generates an asset, or submits video |
| `model_channel_method_profiles.v1.json` | Method-boundary profiles | Defines current channel availability, cost, quota, or upload limits |
| `prompt_failure_recovery.v1.json` | Earliest-contract diagnosis and non-executing recovery guidance | Patches images locally, switches channels, or reruns automatically |
| performance-event template and ledger tools | Evidence-only learning records | Treats hypotheses as observed results or promotes a Skill |

## Method Card Lifecycle

```text
candidate
-> local validation evidence attached to a prompt-routing contract
-> executed observation with real QA or user feedback
-> same-input comparison
-> owner/governance decision
```

The tutorial source stays Grade C at every stage. Local evidence proves only the locally tested behavior and must keep its own exact paths and SHA256 values.

## Prompt Lint Workflow

1. Select the specialist route and build the authority bundle.
2. Write `prompt_routing_contract.json`; keep `provider_submit_allowed=false`.
3. Select a mapped `task_type`, method-card IDs, validation evidence for every C-source card, a method profile, and known failure tags.
4. Lock the prompt and run:

```powershell
python scripts\lint_prompt_routing_contract.py --contract "<absolute prompt_routing_contract.json>"
```

5. A PASS only means the prompt handoff is structurally fit. The selected route still owns `video_task_spec.json`; the channel still owns preflight/submit/download; media/ledger/delivery stay downstream.

Use `--strict` when warnings such as unsupported abstract style wording should block an internal review.

## Failure Recovery

Use the failure library to return to the earliest broken contract. A recovery result is advice only:

```text
source fact failure -> restore specialist-route facts
route/contract failure -> rebind exact authority and prompt hashes
prompt method failure -> create a candidate rewrite with the same facts
channel policy or authorization failure -> stop at downstream execution boundary
media QA failure -> record evidence and return to the approved upstream contract
```

No recovery card authorizes local image editing, silent channel fallback, reference deletion, changing accepted facts, automatic reroll, or provider submission.
