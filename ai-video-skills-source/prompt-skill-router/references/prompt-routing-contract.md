# AI Video Prompt Routing Contract

## Purpose

`prompt_routing_contract.v1` is the compiler contract between a selected AI-video specialist route and a later `video_task_spec.json`. It proves that a model-facing prompt was built from exact authority artifacts, assigned to non-overlapping method/execution/QA layers, and stopped at the correct pre-generation boundary.

It is not a source of story, redraw, product, or continuity facts. It is not a provider submission, cost authorization, media QA, Artifact Ledger, packaging, or delivery contract.

```text
specialist-route facts
-> prompt-routing contract
-> video_task_spec
-> allowed channel execution
-> media QA / ledger / delivery
```

## When To Create One

Create or materially revise a contract when a route creates a new Image2 asset prompt, true-first-frame prompt, storyboard prompt, video prompt, or handoff to `video_task_spec.json`.

Do not create one merely because a completed provider task is downloaded, inspected, packaged, or delivered. Do not use a new contract to rewrite an already accepted, unchanged locked prompt.

## Authority Precedence

Use this order without exceptions:

```text
current explicit user instruction and project rules
-> selected specialist route's accepted facts
-> confirmed / verified exact references
-> locked prompt-routing contract
-> downstream channel capability and policy
-> provider, media, ledger, and delivery evidence
```

Lower-precedence material cannot rewrite higher-precedence facts. File names, browser history, canvas history, previous Word packages, provider chat messages, screenshots, candidates, and rejected material are never authority inputs.

## Specialist Route Sources

| Production class | Required authority family | Never infer or substitute |
|---|---|---|
| `redraw` | Accepted Step02 facts, accepted Step04 compiled contract/reference plan, Step05-verified assets when required | Old Word prompts, candidate images, browser history, unaccepted source rows |
| `script_only` | N00-N07 canon, episode, designed shot, asset, and confirmation artifacts | Step01/Step02 source-video facts |
| `commerce_reference` | Confirmed product identity, approved reference scope, offer/claim constraints, accepted conversion shot facts | A short-drama timeline or invented product claims |
| `original_narrative` | Approved story/beat/shot facts, asset duties, continuity decisions | Candidate stills as proof of motion continuity |
| `confirmed_image_i2v` | User-confirmed or upstream-verified image, exact SHA, Chinese duty, upload eligibility | Names, visual resemblance, or old uploads |

## Required Contract Decisions

The only `compile_status` values are:

```text
blocked
prompt_candidate
prompt_locked
ready_for_video_task_spec
```

`prompt_locked` and `ready_for_video_task_spec` mean only that the prompt is eligible for the next authoring step. The contract must keep `downstream.provider_submit_allowed=false`. A channel can submit only from its own locked `video_task_spec.json` after current cost, login, quota, and submit authorization checks.

## Minimum Data Model

Start from `assets/prompt_routing_contract.template.json`. An actual contract must provide:

```text
identity: schema version, contract id, compilation status
route: production class, specialist source route, requested output scope
scope: series / episode / shot / video-group identifiers as applicable
authority bundle: role, exact absolute path, SHA256, authority state, source route
layers: one method layer, one execution layer, one QA layer with separate responsibilities
references: ref key, exact path/SHA, Chinese duty, confirmation, upload eligibility, edit lineage
locked prompt: exact path/SHA, format, required sections, source-binding hashes
compatibility: model, duration, aspect, resolution, reference count, audio need, allowed channels
downstream boundary: video task spec required and provider submission still false
blockers: code, Chinese detail, earliest broken contract, affected field, next action
```

All authority artifacts, prompts, active references, and downstream contract pointers use absolute paths and a SHA256. Relative paths, globs, `latest`, `current`, `newest`, browser-history aliases, and unsigned references are invalid.

## Three Layers

Record exactly one layer per responsibility:

| Layer | Answers | Cannot do |
|---|---|---|
| Method | How accepted facts become visible, temporal, camera, sound, text, and constraint instructions | Create unsupported facts or select a provider task |
| Execution | Which approved asset/video/task-spec/channel workflow can later consume the prompt | Rewrite the locked prompt, substitute references, or infer authorization |
| QA | Which source-route gate and contract checks determine prompt handoff fitness | Declare media QA, ledger verification, delivery, or user acceptance |

The usual narrative method is `ai-video-fundamentals-skill`. The specialist route still owns the facts. `image2-storyboard-video` is used only when a storyboard was explicitly requested; it is never an automatic prerequisite for video.

## Prompt Lock Requirements

A prompt cannot become `prompt_locked` until it records:

1. canonical model-facing body at an exact path and SHA256;
2. source-artifact hash bindings;
3. required format sections;
4. positive concrete description, explicit text policy, output/aspect policy, and focused final `负面约束`;
5. any required specialist wrapper, such as redraw `【上传参考图职责】` plus `【视频提示词正文】`.

The compiler may normalize the form of accepted facts. It cannot introduce unsupported people, relationships, props, readable text, product claims, locations, camera events, dialogue, voice identity, or continuity claims.

## Active Reference Requirements

Every reference that a later video task may upload must have:

```text
exact path + SHA256
Chinese duty
user_confirmation=confirmed
upload_eligible=true
local_edit_applied=false
```

`candidate`, `diagnostic`, `evidence_only`, `rejected`, unknown ancestry, or locally edited references are blocked. The compiler does not repair, preprocess, composite, or transform images.

## Compatibility Gate

If a contract prepares a later video task, record compatible upstream-allowed channels and evaluate model, duration strategy, aspect ratio, resolution, required reference count/type, audio/voice requirements, and disabled-channel policy.

Never fix incompatibility by silently dropping a reference, reducing duration, changing to text-to-video, or swapping a channel. Tensor.Art and Echoon remain disabled unless the current user turn explicitly re-enables them through the downstream governed policy.

## Stable Blockers

| Code | Meaning | Correct next action |
|---|---|---|
| `missing_authoritative_source` | Required specialist fact is absent or unaccepted | Restore the route's upstream fact gate |
| `source_route_mismatch` | A contract mixes facts from different production-route families | Return to the selected specialist route; never adapt the foreign fact |
| `ambiguous_artifact_lineage` | Path is relative, stale, `latest`, or unsigned | Bind the current exact artifact and SHA |
| `reference_unconfirmed` | Reference duty, confirmation, or upload eligibility is missing | Obtain/record confirmation; do not upload |
| `reference_local_edit_or_evidence_only` | Reference is locally transformed or inspection-only | Regenerate through the approved route or retain as evidence only |
| `prompt_not_locked` | Canonical prompt, hash, bindings, or required sections are missing | Lock a candidate against authority evidence |
| `channel_incompatible` | Requested task exceeds allowed channel capability | Return to task design or obtain governed channel change |
| `channel_disabled` | Selected channel is prohibited by active policy | Stop; do not fallback silently |
| `missing_qa_rule` | Source or contract QA is absent | Name the right source-route and contract gate |
| `authorization_or_cost_not_granted` | A downstream execution authorization is absent | Keep the compiler contract non-submitting |
| `provider_policy` | Provider policy evidence blocks a later execution | Preserve evidence and follow the route-specific authorized recovery policy |

## Validation

Validate the exact contract before using it to author a downstream video task:

```powershell
python scripts\validate_prompt_routing_contract.py --contract "<absolute path>"
```

The command validates local files and SHA256 values by default and returns structured `PASS`/`FAIL` JSON with stable blocker codes. It performs no browser, provider, image, video, local-raster, job-state, ledger, packaging, or delivery action.

## Handoff

When validation passes with `ready_for_video_task_spec`:

```text
prompt-routing contract
-> specialist route writes locked video_task_spec.json
-> ai-video-channel-router preflight within allowed channels
-> current-run submit and cost authorization
-> provider output, media QA, ledger, and delivery
```

Do not claim a compilation pass as a generated, downloaded, QA-passed, verified, or delivered video.
