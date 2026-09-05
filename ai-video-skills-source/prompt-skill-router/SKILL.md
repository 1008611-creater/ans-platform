---
name: prompt-skill-router
description: name: prompt-skill-router
---

---
name: prompt-skill-router
description: name: prompt-skill-router
---

---
name: prompt-skill-router
description: Route prompt-heavy tasks to the strongest local skill stack before drafting, revising, approving, or executing prompts. For AI video, compile authoritative route facts into a verified prompt-routing contract before Image2, first-frame, storyboard, video-task-spec, or channel work. Use for image/video prompts, character boards, storyboards, short-drama assets, first frames, commerce video, prompt QA, failure diagnosis, reusable prompt templates, or choosing a prompt method.
---

# Prompt Skill Router

Use this skill as the control layer before writing, revising, approving, or executing prompts. Do not create one universal mega-prompt. Choose the smallest high-quality skill stack for the current domain, then force a concrete prompt contract and a quality gate.

For AI video, this is the prompt compiler and release gate between a specialist route's accepted facts and the downstream `video_task_spec.json`. It does not invent facts, submit a provider task, or replace channel/media/delivery QA.

## Versioning And Rollback

Current live version: `v0.4.0-ai-video-prompt-compiler`.

Candidate method-system version: `v0.5.0-method-system-20260711` (not an automatic release promotion).

Archive root: `C:\Users\lsb\.codex\skill-version-archive\prompt-skill-router`.

Before making material changes to this skill, create a full-file snapshot under a new archive version folder, then record hashes for `SKILL.md`, `agents/openai.yaml`, and every file in `references/`.

Rollback rule:
- Roll back only to a named archive version after user approval or a clear production failure.
- Restore files from the archive snapshot, not from chat memory.
- After rollback, run `quick_validate.py` on the live skill and do a post-coding review.
- Record whether the rollback was full or partial.

## External Research Ingestion

Prompt quality core capability. Use GitHub, papers, official docs, benchmark channels improve this skill through controlled evidence loop.

Research ingestion rule:
- Prefer primary sources: official provider docs, original papers, official GitHub repos, benchmark project pages.
- Extract reusable principles, failure modes, evaluation dimensions, prompt contracts; do not copy community prompts directly into production prompts.
- Convert every imported pattern into local router language: route, source truth, prompt contract, execution boundary, QA gate.
- Promote pattern into `SKILL.md` only after strong primary-source backing or local production evidence. Keep detailed source notes in `references/`.
- If source changes model-specific behavior, treat channel-specific until validated by current local Image2/RunningHub/Seedance outputs.

Source grading rule:
- Grade each source before use: `A` primary/current, `B` primary but indirect or dated, `C` curated/community, `D` weak trend signal.
- Only `A` or `B` evidence can change router defaults. `C` sources can seed examples or TODOs. `D` sources cannot enter production rules.
- When sources conflict, prefer current official docs for active provider behavior, then original benchmark/paper methodology, then local production evidence.

Benchmark conversion rule:
- Benchmark dimensions are QA gates, not prompt prose. Convert them into observable checks such as object count, attribute binding, spatial relation, temporal consistency, motion smoothness, and text-rendering risk.
- Use small local task sets before calling a benchmark pattern durable: 3-5 cases for a narrow image route, 2-3 connected shots for a video/storyboard route, or one real production failure plus rerun evidence.
- Record benchmark-derived gates in `references/benchmark-gates.md` or a dated research note before promoting a short operational rule into this file.

## Non-Negotiable Rules

- Route first, then write. Never draft an image/video/short-drama prompt before selecting the domain skill, execution skill if any, and QA gate.
- Default all user-facing prompts, negative constraints, camera instructions, and video generation instructions to Chinese. Keep English only for provider field names, fixed API parameters, or user-requested English.
- Use positive visual description first. Put negative constraints in one final block named `负面约束` or `避免项`.
- Keep negative constraints focused: 5-10 known failure modes, not a wall of "do not".
- Convert abstract praise into visible variables. `明星感`, `高级`, `真实`, `电影感`, `性感`, `贵气`, `本土化` must become concrete choices for face, skin, age range, grooming, clothing, pose, camera, lens, light, material, environment, gesture, and expression.
- Do not rely on celebrity comparisons such as "像某某". If a reference is needed, translate it into visible traits instead.
- Do not ask image models to generate long precise readable Chinese/Spanish/English text, legal documents, chat logs, bank records, official forms, or dense UI copy unless the task explicitly accepts high text-rendering risk. Prefer clean visual space plus local overlay.
- For paid/provider execution, output a prompt candidate first and require the run's approval policy before generation.
- When the user complains an output is fake, generic, low-quality, not realistic, not local enough, or not attractive enough, diagnose route/source/contract failure before tweaking adjectives.

## User-Designated Image2 Channel Override

When the user says they need an image, drawing, image asset, material image, character image, scene image, prop image, or similar wording, treat the user's designated Image2 channel as the default execution route. Do not silently substitute the built-in image generator, a generic image tool, or an unrelated provider.

- No input/reference image: use `mikoto-gpt-image-2` for `gpt-image-2` text-to-image generation through `https://api.mikoto.vip/v1/images/generations`.
- Existing reference image, restyling, identity preservation, or image editing: mark `blocked_missing_edit_contract`; Mikoto has no verified image-to-image contract, so do not silently use text-to-image or the retired RunningHub Image2 endpoint.
- Storyboard, film production board, or Image2 storyboard task: use `image2-storyboard-video` as the method layer, then execute through the applicable Image2 channel above.
- Keep prompts in Chinese by default, preserve the selected channel's prompt and parameter contract, and do not expose credentials.
- Before a paid/provider call, report the selected channel, model, resolution, and any visible cost gate. If the selected channel is unavailable, report the blocker and the configured alternatives; do not switch silently.
- The user-designated Image2 route overrides generic image-generation defaults unless the user explicitly chooses another provider or channel.

## Routing Workflow

1. Classify the output domain:
   - short-drama asset prompt, realistic image, character board, storyboard, first frame, AI video, commerce video, social content, marketing copy, product/design, coding/agent work, research/synthesis, or file/document work.
2. Identify risk:
   - paid generation, source-of-truth sensitivity, text-in-image risk, character consistency risk, cultural/localization risk, legal/factual risk, or delivery/package risk.
3. Pick one method layer, one execution layer if needed, and one quality gate.
4. Read each chosen skill's `SKILL.md` completely before acting. Read referenced files only when the current phase needs them.
5. State the route briefly before producing prompts:
   - `Route: method -> execution -> quality gate`
   - `Why: one sentence`
   - `Do not use: risky or low-quality patterns for this task`
6. Write the prompt using positive concrete blocks first, then text policy, output/aspect policy, and a final negative block.
7. Run the quality gate. If it fails, revise before showing the final result.

## AI Video Prompt Compiler And Release Gate

For AI video, use this mandatory order:

```text
AI-video parent classification
-> selected specialist route and its authority facts
-> prompt-skill-router compilation gate
-> locked prompt-routing contract
-> video_task_spec.json
-> allowed channel preflight / real submission
-> downloaded media / QA / ledger / delivery
```

The parent route selects the truth source. This Skill only normalizes that truth into model-facing prompt sections and blocks incomplete handoffs. The compiler is required before a new or materially revised Image2 asset prompt, true-first-frame prompt, storyboard prompt, or video prompt becomes eligible for a `video_task_spec.json`.

Do not recompile an already accepted, unchanged locked prompt merely to inspect status, download a provider result, perform media QA, or package delivery.

### Authority Envelope

Before writing or locking an AI-video prompt, assemble a route envelope with:

```text
production_class: redraw | script_only | commerce_reference | original_narrative | confirmed_image_i2v
source_route: selected specialist Skill and authority contract
scope: series / episode / shot / video group
authority_bundle: exact path + SHA256 + role + accepted/confirmed/verified state
requested_output: asset | first_frame | storyboard | video_prompt | video_task_spec_handoff
```

Use only the selected route's authority family:

- `redraw`: accepted Step02 facts, accepted Step04 compiled contract/reference plan, and Step05-verified assets when the group needs them.
- `script_only`: N-series canon, episode, designed-shot, asset, and confirmation artifacts. Do not require or invent Step01/Step02 facts.
- `commerce_reference`: confirmed product identity, approved reference scope, offer/claim constraints, and accepted shot or conversion facts.
- `original_narrative`: approved story/beat/shot facts, asset duties, and continuity decisions from the selected narrative route.
- `confirmed_image_i2v`: user-confirmed or upstream-verified image path/SHA, Chinese duty, confirmation, and upload eligibility.

Do not use old Word files, `latest` paths, browser history, canvas history, provider messages, candidate images, evidence-only crops, rejected fragments, or file names as authority.

### Three-Layer Selection

Record exactly one non-overlapping owner for each layer:

```text
method layer: how prompt facts become visual/action/audio instructions
execution layer: which approved image/video/task-spec/channel workflow consumes them
QA layer: source-route quality gate plus prompt-contract completeness checks
```

For most narrative video, `ai-video-fundamentals-skill` is the method layer. Specialist routes still own their facts: `mx-shortdrama-*`, script-only, commercial, and original-narrative routes cannot be replaced by a generic prompt method. Storyboard work remains explicit-only through `image2-storyboard-video`.

### Compile States And Blocking

Write a versioned `prompt_routing_contract.json` in the current run sandbox or job-local `contracts/` directory. Its only valid decisions are:

```text
blocked
prompt_candidate
prompt_locked
ready_for_video_task_spec
```

`prompt_locked` and `ready_for_video_task_spec` mean prompt handoff only. They never grant provider submission, cost authorization, ledger verification, delivery, or user-visible acceptance.

Before `ready_for_video_task_spec`, require:

- authority bundle with exact absolute paths, SHA256 values, role, route, and accepted/confirmed/verified state;
- one locked prompt body with exact path, SHA256, source-binding hashes, required sections, text policy, output/aspect policy, and focused `负面约束`;
- every active upload reference to have a Chinese duty, `user_confirmation=confirmed`, `upload_eligible=true`, and `local_edit_applied=false`;
- named method, execution, and QA layers; and
- channel compatibility and policy evidence when a future video task is requested.

Use stable blocker categories, for example:

```text
missing_authoritative_source
ambiguous_artifact_lineage
reference_unconfirmed
reference_local_edit_or_evidence_only
prompt_not_locked
channel_incompatible
channel_disabled
missing_qa_rule
authorization_or_cost_not_granted
provider_policy
```

Each blocker must name the earliest broken contract, affected field/artifact, Chinese detail, and a non-executing next action. Do not hide a blocker inside a generic success boolean or solve it by dropping a required reference, reducing duration, changing to text-to-video, or silently switching channels.

### Contract Validation And Handoff

Read `references/prompt-routing-contract.md` before compiling an AI-video prompt. Start from `assets/prompt_routing_contract.template.json` and validate the exact contract before it is consumed:

```powershell
python scripts\validate_prompt_routing_contract.py --contract "<exact prompt_routing_contract.json>"
```

The validator checks lineage, prompt locking, reference confirmation, channel compatibility/policy metadata, and compiler boundaries. It is offline and cannot submit providers, generate media, edit images, mutate a job, write an artifact ledger, package, or send files.

Only after this contract is `ready_for_video_task_spec` may the selected route author the existing `video_task_spec.json`. The video task spec independently owns cost/submit authorization, output paths, provider task IDs, downloads, media QA, ledger, and delivery.

## AI Video Method System

Use the method system when an AI-video prompt needs a reusable directing method, task-specific prompt lint, model/channel method boundary, failure diagnosis, or evidence-backed improvement. Read `references/prompt-method-system.md` first.

The user-provided tutorial library is a permanent Grade-C method source. Its method cards are candidates, not defaults and not provider facts. A Grade-C card can help assemble or review a Prompt only when the contract also records independent local validation evidence for that card. The tutorial never gains a higher source grade merely because it inspired a successful local result.

```text
accepted specialist-route facts
-> conditional task-to-method map
-> candidate method cards
-> locked prompt-routing contract
-> offline linter
-> downstream video_task_spec only after prompt handoff passes
-> later evidence-backed performance event outside the generation gate
```

Use these assets by responsibility:

```text
assets/prompt_method_cards.v1.json
  atomic camera, space, lighting, action, emotion, text, continuity, and product methods

assets/ai_video_task_method_map.v1.json
  conditional task-type combinations; storyboard remains explicit-only

assets/prompt_lint_rules.v1.json
  structural prompt/contract rules and stable blockers

assets/model_channel_method_profiles.v1.json
  method boundaries only; never a current channel-capability registry

assets/prompt_failure_recovery.v1.json
  earliest-contract recovery advice with no execution authority

assets/prompt_performance_event.template.json
  later hypothesis/observation/comparison evidence, never prompt-candidate self praise
```

For a new or materially rewritten AI-video prompt, add `scope.task_type`, `method_card_ids`, `method_validation_evidence`, `known_failure_tags`, and `compatibility.method_profile_id` to its prompt-routing contract. Then run:

```powershell
python scripts\lint_prompt_routing_contract.py --contract "<absolute prompt_routing_contract.json>"
```

The linter is offline. It validates task-map fit, method-card source limits, local evidence for C-source cards, authority roles, prompt sections, observable anchors, text risk, profile boundaries, and recovery tags. It cannot edit a Prompt, generate media, submit a provider, change a job, write an Artifact Ledger, or turn `provider_submit_allowed` on.

After a later authorized production run, record only evidence-backed observations using `references/prompt-performance-ledger.md`. Synthetic hypotheses are useful for experiments but are excluded from aggregate performance claims and cannot promote a Skill.

Read `references/champion-routes.md` when selecting the route. Read `references/prompt-contracts.md` when writing the final prompt shape. Read `references/research-ingestion.md` when improving this skill from GitHub, papers, official docs, or benchmarks. Read `references/source-bench.md` when comparing external prompt libraries.
Read `references/source-utilization.md` when using external prompt bases such as YouMind, freestylefly, DAIR, or ANS.
Read `references/benchmark-gates.md` when turning GenEval/T2I-CompBench/VBench-style research into QA checks.
Read `references/prompt-quality-rubric.md` before calling a prompt "best", "high quality", reusable, or production-ready.
Read `references/prompt-routing-contract.md` whenever an AI-video prompt is newly authored, materially rewritten, locked, or handed to `video_task_spec.json`.
Read `references/prompt-method-system.md` before selecting a method card, running the AI-video linter, or diagnosing a recurring visual failure. Read `references/prompt-performance-ledger.md` only after later authorized execution produces real evidence.
Read `references/superi-prompt-course-20260711.md` for the indexed 刺猬星球提示词教程 patterns. It is a Grade C tutorial source: use its reusable directing patterns and failure checks, but never let it override current provider documentation, accepted project facts, local safety rules, or paid-execution gates. The local source vault is `C:\Users\lsb\Documents\刺猬星球提示词资料库`; an unavailable or stale path is a knowledge-quality defect, not permission to invent lessons.

## Default Champions

Use these defaults unless a narrower user-named skill or project rule wins.

AI video routing boundary:
- 用户说“作图 / 需要图片 / 做素材图”时，默认进入用户指定的 Mikoto `gpt-image-2` 渠道：无参考图用 `mikoto-gpt-image-2`；有参考图、身份继承或改图时，在 Mikoto 未提供验证合同前阻断并报告缺口，不回退到已失效的 RunningHub Image2。
- AI 视频 / Seedance2 / Image2 转视频 / 运镜 / 首帧转视频 / 镜头提示词 / 抽卡诊断 / 视频质量诊断 -> 先用 `ai-video-fundamentals-skill` 做方法层，再进入执行 skill。
- 故事板不是 AI 视频的默认步骤。只有用户明确要 `故事板`、`分镜板`、`电影制作板`、`视觉规划表`、`storyboard`、`story board`、visual planning board，或故事片段转故事板图片时，才用 `image2-storyboard-video`。
- 用户同时要 AI 视频方案和故事板 -> `ai-video-fundamentals-skill` 负责视频方法；`image2-storyboard-video` 负责故事板资产和配套视频提示词。
- 短剧转绘 / remake / 墨西哥本土化 / 原片时间轴 / 资产提示词 / 首帧转绘 -> 先走 `mx-shortdrama-*`；故事板只作为下游可选步骤。
- 小说/剧本/对白稿转 AI 短剧且没有参考视频 -> `ai-video-fundamentals-skill -> ai-video-novel-to-script -> ai-video-asset-prompts -> ai-video-asset-production -> sd2.5skill`。先做改编事实账本、总纲、分集大纲、场次细纲和资产清单；不得伪造 Step01/Step02 原片事实，也不得调用转绘路由。
- Script-only N04 must be asset-first: character identity/wardrobe, scene space master, plot-critical props, optional storyboard, and true first-frame duties are separated before model-facing video prompts. A long prompt cannot replace missing assets.
- For narrative motion, translate story action into: body movement and path -> secondary physical response (hair/clothing/prop) -> micro-reaction -> light/environment change -> sound cue when supported. Keep one primary action per short shot.
- Camera instructions pair angle with shot scale, focal-length behavior, foreground/midground/background relation, and dramatic purpose. Do not use `电影感` as a substitute for camera placement.
- Lighting instructions state source, direction, target, contrast, shadow retention, fill/catchlight, and emotional purpose. Do not use `高级光影` as a substitute for light logic.
- Dialogue/voice instructions state age feel, timbre, pace, emotional baseline, breath/pause, stress, and sentence-ending behavior. Multi-line dialogue follows time-ordered emotional change.
- Long-form continuity prefers preplanned segment boundaries and overlap/action handoff. A still end frame anchors appearance only; it does not prove motion continuity.

| Domain | Method Layer | Execution Layer | Quality Gate |
|---|---|---|---|
| Xiaohongshu image notes | `xiaohongshu-ops` | `xhs-note-creator` or local HTML/CSS overlay | `xhs-traffic-aesthetic-guard` |
| Mexico short-drama asset prompts | `mx-shortdrama-00-router` | its Step04 route | source contract + localization gate |
| Mexico short-drama asset images | `mx-shortdrama-00-router` | its Step05 route + Image2 channel | artifact ledger + visual QA |
| Realistic character boards | this router + `ciwei-prompt-method` + `gpt-image-2-style-library` if style selection helps | `mikoto-gpt-image-2` for no-reference boards; reference-preserving boards block | character-board QA; no accidental text |
| Realistic Image2 stills | `gpt-image-2-style-library` + `ciwei-prompt-method` if needed | `mikoto-gpt-image-2` for new images; edits block until verified contract | visual audit; avoid generated readable text |
| Image2 capability testing | `image2-boundary-lab` | Image2 channel | score outputs and extract repeatable recipe |
| Storyboards / visual planning boards | `image2-storyboard-video` | Image2 channel if approved | storyboard contract + video prompt match |
| AI video / Seedance2 | `ai-video-fundamentals-skill` | `sd2.5skill`, `seedance2-narrative-shot-workflow` or channel skill | video checklist / reroll diagnosis |
| Commerce short video | `realistic-commerce-video-replication` or platform orchestrator | Douyin/Kuaishou/Seedance execution skill | hook, proof, realism, conversion gate |
| Marketing copy | `copywriting` | none unless publishing | `stop-slop`, `cro` if conversion critical |
| Frontend/product design | `frontend-design` or `impeccable` | repo/frontend tools | Playwright/screenshot verification |
| Frontend/web ideal-image prompts | `top-design` + `impeccable` + `frontend-design` + `Frontend Ideal Image Concept Contract` | Image2 concept channel only after approval | aesthetic gate before provider; reject generic SaaS mockups |
| Prompt methodology | `ciwei-prompt-method` | relevant execution skill | misunderstanding audit |
| Coding/agent prompts | `agent-team-workflow` or task-specific engineering skill | shell/browser/tooling | tests and code review stance |
| High-stakes factual content | web/source research first | domain/file skill | cite sources and avoid unsupported claims |

## Hard Rules

- Do not treat `gpt-image-2-style-library` as a full-chain content strategy skill. It is a visual template and style selector.
- Do not ask image models to generate long Chinese text, fake legal documents, bank records, chat screenshots, logos, exact forms, or precise account data unless the task explicitly accepts artifact risk. Prefer clean no-text visuals plus local overlay.
- Do not stack many overlapping skills. Use 1-3 skills with distinct roles.
- Do not use Bilibili-style single formulas as default truth unless they have been converted into a tested local skill or repeatable reference.
- For platform-native social content, route through the platform skill before the image prompt skill.
- AI 视频相关提示词先走 `ai-video-fundamentals-skill`，再进入 Image2、Seedance 或其他执行 skill。
- AI 视频新 Prompt 或重大重写必须在专业路线事实确认后写 `prompt_routing_contract.json`；没有通过编译/放行，不得进入 Image2、首帧、故事板、`video_task_spec.json` 或真实渠道。
- `prompt_routing_contract.json` 不是视频提交合同。它必须保持 `provider_submit_allowed=false`；只有下游锁定的 `video_task_spec.json` 及当前任务成本/提交授权才能进入真实渠道。
- 刺猬星球及其他 Grade-C 教程只能提供候选方法、失败假设和 QA 维度；不得变成无证据默认、渠道能力、项目事实、用户确认、成本/提交授权或交付证明。
- 任务映射只提出条件化方法组合。故事板仍是用户明确请求时才可加入，方法卡也不得跨越所选 specialist route 的事实家族。
- C 级方法卡进入 `ready_for_video_task_spec` 前必须有该卡的独立本地验证证据，使用精确绝对路径、SHA256 和 `locally_validated` 状态；教程来源本身仍保持 C。
- 表现账本中的 `hypothesis`、合成 fixture、单个样本或未证明比较不得用于“方法更好”“默认规则”或 Skill 升级结论。
- 故事板路由是显式路由：只有 storyboard、story board、分镜板、故事板、电影制作板、视觉规划表、visual planning board 或故事片段转故事板图片请求，才走 `image2-storyboard-video`。
- For Mexico short-drama redraw work, route through the `mx-shortdrama-*` skill that matches the step before using a generic prompt method.
- For legal, medical, financial, or public factual claims, verify current facts before turning them into persuasive content.
- A prompt is not "high quality" until it passes route fit, source fit, specificity, constraint, execution, and quality-gate checks.
- When the user complains about fake, noisy, generic, AI-looking, or low-quality output, treat it as a routing failure first, not just a wording failure.
- For a reusable short-drama character identity reference, default to `character_board_full_set` under the full `Realistic Character Board Contract`: a 16:9 horizontal, complete identity set with full-body silhouette, face/three-quarter/profile checks, wardrobe, accessory, and expression continuity. Do not silently replace this with a vertical three-quarter or half-body single portrait.
- A vertical single-character image is a distinct asset type, `shot_specific_identity_plate`. It is allowed only when the accepted shot facts explicitly require it; it cannot replace a full character board as the only continuity authority.
- If a character image looks plastic or generic, diagnose missing visible evidence before adding quality adjectives: concrete face structure, age texture, hair irregularity, garment wear/folds, motivated light direction, light ratio, color temperature, focal behavior, and intentional camera distance. Do not use `smooth shading`, `minimal texture`, or broad denoising language in a realistic human character-board prompt.

## Prompt Rewrite Workflow

Use this when improving an existing prompt or diagnosing a failed image/video:

1. Identify the source of truth: accepted script, asset registry, prompt manifest, ledger, QA report, reference image, or user instruction.
2. Classify failure source: source mismatch, prompt ambiguity, execution randomness, model limitation, aspect/type mismatch, generated-text risk, or QA policy mismatch.
3. Preserve upstream source unless the user explicitly asks to edit it. Create a versioned prompt candidate for production systems.
4. Rewrite with positive concrete blocks:
   - purpose and asset type;
   - subject identity;
   - visible traits and materials;
   - composition/layout;
   - camera/lens/light;
   - text policy;
   - output/aspect;
   - final negative block.
5. Keep changes traceable: prompt version id, source prompt hash if available, candidate path/manifest if this is a run.
6. Do not execute paid/provider generation until approval is in scope.

## Image And Video Prompt Shape

Default image prompt shape:

```text
【资产用途】
【主体身份】
【可见外貌/物体细节】
【服装/道具/环境】
【构图与版式】
【摄影机、镜头、光线、质感】
【文字策略】
【画幅与输出】
【负面约束】
```

For script-only narrative short drama, use the stricter contract in `references/prompt-contracts.md` named `Script-Only Narrative Video Contract`. Preserve any project-required wrapper such as `【上传参考图职责】` + `【视频提示词正文】`; reference duties stay outside the model-facing action prose.

Default video prompt shape:

```text
【基础设定】
【角色/道具/场景锚点】
【动作与时间调度】
【镜头运动】
【光线与质感】
【声音】
【负面约束】
```

For character boards, use `Realistic Character Board Contract` in `references/prompt-contracts.md`.

## Output Contract

When asked to choose a prompt workflow, return:

```text
Route:
Method:
Execution:
Quality gate:
Why this route:
Avoid:
Next action:
```

When asked to produce a prompt, return:

```text
Selected route:
Prompt:
Negative constraints:
Post-processing:
Quality checklist:
```

When asked to diagnose or improve a prompt, return:

```text
Route:
Failure diagnosis:
Rewritten prompt candidate:
Negative constraints:
Why this is stronger:
QA checklist:
Approval/execution boundary:
```

If the task is content production, save reusable failures or winning patterns into the relevant vault or project knowledge base when the user has asked for ongoing accumulation.

## Display Image System Note

男生展示面、女生展示面、展示面图、社交展示图、profile/lifestyle customer replacement images，统一走 `references/champion-routes.md` 的 `Display / Profile Lifestyle Images 展示面图`，并使用 `references/prompt-contracts.md` 的 `Display Image Two-Reference Contract 展示面图`。

默认执行渠道：用户批准真实执行后，使用 `runninghub-image2-image` low-price image-to-image。默认参考图顺序固定为 `[customer_master_ref, template]`：
- `customer_master_ref` 只管身份、人脸、发型方向、年龄感和真实个人气质。
- `template` 只管姿势、服装、场景、构图、镜头距离、光线、画幅和照片质感。

展示面提示词采用“基础模板 + 槽位填充”，不要靠长篇负面约束堆效果。基础模板必须先写正向目标，再填少量变量：
- `{客户身份锚点}`：4-6 个稳定身份特征，例如脸型、下颌线、眼型、鼻梁、唇厚、肤色、年龄感、发型方向。
- `{模板画面锚点}`：场景、姿势、服装、构图、镜头距离、光线、画幅、照片质感。
- `{轻微优化幅度}`：男生轻微变帅、女生轻微变美，保持本人，不变陌生人。
- `{本图审美主修}`：每张模板只选 1-2 个真实问题，如脸部欠曝、俯拍压脸、肩颈塌、比例短、表情僵、互动不自然。
- `{避免项}`：最多 3 条，只写当前图最容易失败的点。

生产批量展示面时，不允许一批不同模板复用完全相同 prompt。每张图必须先写单图诊断，再填入基础模板；如果不同模板产生相同 prompt hash，视为 prompt-design failure。结果“脸像但不好看”时，优先修 `{本图审美主修}`，不是增加大段负面词。
