---
name: skill-governance
description: name: skill-governance
---

---
name: skill-governance
description: Select, combine, score, and improve Codex skills across projects. Use when starting or resuming a project, choosing or auditing skills, recording skill performance, distilling verified repairs into reusable rules, or when the user asks to 沉淀方法论 / 自进化 / 更新全局 skill / 把第二遍修好的经验沉淀下来 / 不要只留在聊天里 / 把根因写回对应 Skill / 下次不要再犯 / 把修复变成可复用规则 / 第一遍没做好但第二遍找到了根因.
---

# Skill Governance

Use this skill as the lightweight control layer for Codex skills. Its job is to keep skill use intentional: choose the smallest useful set, apply skills in the right order, score real outcomes, and keep only high-value skills over time.

## Start-Up Triage

For a new project, long-running task, cross-thread handoff, or unclear skill choice:

1. Read the local project rules first: `AGENTS.md`, handoff docs, or the current task spec.
2. Bootstrap memory with `codex-agent-mem` when the work is long-running, cross-thread, project-changing, or content-production related.
3. Choose at most 3 task-critical skills for the current turn unless the user explicitly asks for a broader audit.
4. Prefer project-specific skills only when the task is domain-specific; otherwise prefer global champion skills.
5. Do not load champion lists or rubrics unless selection or evaluation is actually needed.

For a reusable startup prompt and checklist, read `references/project-start-template.md`.

For a routing decision, overlap audit, or skill cleanup pass, read `references/skill-router.md` first. Use `references/skill-routing-domains.json` for the governed 12 business domains, 8 cross-cutting control planes, domain entry strategies, and family-to-domain mapping. If several skills from the same domain could trigger, read `references/skill-families.md`. Use `references/skill-registry.json` as the current generated inventory and governance registry, but query it by skill name or structured JSON fields instead of loading the entire generated file into context. Keep `discovery_status` separate from `routing_status`: a discoverable Skill with `routing_status=unassessed` is available for explicit or unmistakably narrow work, but is not a default route. Read `references/retirement-audit-2026-06-13.md` only as a historical retirement snapshot.

## Selection Rules

Use `references/skill-localization.zh-CN.json` as the user-facing Chinese semantic layer. Keep `name` and `qualified_id` as stable machine identifiers; show `display_name_zh`, `description_zh`, and `aliases_zh` in Chinese-facing Harness and Obsidian output. Chinese aliases never override `routing_status`, project authority, permission gates, or explicit-only restrictions. Generated translations are a complete baseline, while frequently used routes should be promoted to curated localization entries after review.

Apply the routing chain in this order: project/Source of Truth -> requested artifact -> one business domain -> current phase -> one method route -> at most one distinct specialist -> one tool/provider route -> authorization gates -> verification/evidence. Do not flatten the detailed family catalog into top-level choices. For artifact-, source-, platform-, or intent-direct domains, dispatch directly using the domain contract instead of inventing another generic router Skill.

Treat every routed capability as an encapsulated transformation defined by `references/skill-routing-domains.json`:

```text
Input Packet -> Routing Decision -> Capability Execution -> Output Packet
```

Normalize the input into project authority, objective, target artifact, current state, constraints, and explicit authorizations. Return an output packet naming the actual artifact, route decision, real state change, direct evidence level, remaining gate, and provenance. A plan, prompt, candidate, local preview, or submitted provider task is not a completed artifact unless the selected domain contract explicitly names it as the requested output. Use the domain `completion_gate` before claiming completion and the `non_output` list to prevent early-stop reports.

Use this order:

1. **Mandatory user/project rules**: obey explicitly named skills and project `AGENTS.md`.
2. **Continuity**: use `codex-agent-mem` for non-trivial continuation or durable decisions.
3. **Research**: use `jina-search` when web search, page reading, or reference gathering is needed, unless the user requests another source.
4. **Workflow control**: use `agent-team-workflow` for medium-to-large work, three-window work, task specs, implementation handoffs, or independent review.
5. **Domain execution**: choose the narrowest skill matching the artifact, tool, platform, or content type.
6. **Verification**: choose browser, Playwright, PDF/DOCX render, or other verification skills when the output needs evidence.

If two skills overlap, choose the one with stronger task fit, fresher project evidence, lower context cost, and more deterministic outputs. Avoid using two skills that give the same kind of guidance unless their roles are clearly different.

## 场景化 Skill 快速上手卡

When the user asks to install, introduce, learn, or onboard a Skill or selected project, provide a concise scenario-based quickstart card instead of a repository summary alone. Use the Chinese title `场景化 Skill 快速上手卡` and include: one-line purpose, when to use, when not to use, the exact Skill identifier, the relevant section(s), one authoritative copyable prompt, value assessment, the smallest combination route with other Skills, real verification, and current limits. The value assessment must state a value level, the concrete user benefit, whether the Skill deserves a default route, and whether to keep, archive, or review it for removal. Omit CLI commands by default; include them only when the user explicitly asks for command-line usage. Keep the route actionable and use the form `当前证据 -> 技能中文名 -> 具体章节 -> 验证或交付`; do not emit this card for ordinary tasks that merely happen to trigger an existing Skill.

### 权威提示词模板：自动补全式场景卡

Use one authoritative prompt template for every scenario card. The prompt must name the Skill and its exact section(s), but it must remain project- and industry-agnostic. The user should be able to paste it without manually replacing project, page, stack, audience, or constraint placeholders.

The prompt must instruct Codex to:

1. Read the current conversation, attached files, screenshots, project files, existing design rules, and prior approved decisions before asking for context.
2. Automatically fill in facts that are discoverable from that context, and state reasonable inferences before proceeding.
3. Ask the user only when an unresolved choice materially changes the route or result. When asking, provide no more than three choices, mark the recommended choice, and state the consequence of each choice.
4. Continue directly when no decision-changing uncertainty remains; do not ask the user to fill fields that Codex can inspect or infer.
5. Complete the Skill's actual work and require real verification or delivery evidence, not only a plan, recommendation, or prompt.

Use this as the canonical prompt body, adapted only with the Skill identifier and exact section(s):

```text
请使用 Skill：`<skill-id>`。
请按照该 Skill 的【<exact-section>】执行。

请先结合当前对话、我提供的文件、截图、当前项目代码、已有设计规范和历史决策，自动判断当前项目、目标对象、目标用户、核心任务、技术栈、必须保留的内容和当前问题。

不要先要求我手动填写这些信息。能够从上下文确认的内容请直接采用；能够合理推断的内容请先说明判断并继续执行。

只有在存在多个同样合理、且会明显改变执行路线或最终结果的选择时，才向我提问。提问时最多给三个选项，标出推荐项，并说明每个选项的结果；没有关键不确定性时不要提问，直接执行。

请完成该 Skill 负责的实际工作，并在交付时说明：使用了哪个 Skill 和具体章节、从上下文自动判断了哪些信息、做了哪些处理、保留了哪些内容、如何进行真实验证，以及仍然存在的限制。
```

The card may add a short task-specific sentence after this canonical body, but it must not replace the body with a project-specific prompt. Do not include a project name, brand, or one-off example as the only prompt. This template supersedes ad hoc prompt examples for all future Skill clusters.

Treat maintained GitHub provenance and star count as a bounded preference signal. When task fit, project authority, permission boundaries, and evidence are otherwise equal, prefer the maintained higher-star upstream Skill over an internally authored Skill. Use logarithmic or bucketed star scoring with an observation timestamp; never let raw stars override exact domain fit, `AGENTS.md`, mandatory rules, user-designated routes, or project-local authority. Create an internal Skill only for a proprietary workflow, a project-specific control contract, or a verified gap with no adequate upstream option.

One explicit user verdict of `not_useful` with `avoid_default` must lower the Skill's next-route score immediately and request research for a maintained, higher-star GitHub alternative in the same domain. Do not auto-uninstall, auto-replace, or demote mandatory/user-designated Skills. Any replacement must pass same-input regression, independent review, post-coding review, governance promotion, and verified distribution readback.

For concrete phase-by-phase examples, read `references/selection-examples.md`.

For broad overlap, apply the router budget:

- Tiny task: 0-1 skill.
- Normal task: 1-2 skills.
- Substantial implementation, research, or content workflow: 2-3 skills.
- More than 3 skills only when the user explicitly asks for a broad audit or a multi-phase orchestrated workflow.

## Default Routes And Champions

Read `references/champion-skills.md` only when selecting skills for a project, onboarding a new thread, or reviewing whether the champion set should change.

Do not treat every default route as evidence-backed. The registry distinguishes `mandatory`, `user_designated`, `provisional_default`, and `evidence_backed_champion` status.

Current default routes:

- Continuity: `codex-agent-mem`
- Web research: `jina-search`
- Three-window engineering: `agent-team-workflow`
- Skill creation: `skill-creator`
- Hermes AI employee productization: `hermes-employee-product-router` (user-designated)
- Frontend quality: `frontend-design`, `impeccable`
- Browser verification: `playwright`, Browser plugin
- AI video and Image2-for-video method: `ai-video-fundamentals-skill` (user-designated)
- Final-script director analysis, realistic character, and key-prop assets: `chaoge-assets-trial` (user-designated champion for this bounded preproduction vertical)
- Standalone Image2 work: `image2-direct`, `gpt-image-2-style-library`; use `ai-image-video-channel-router` when an external channel must be selected
- OpenAI docs: `openai-docs` only for OpenAI product/API questions

`ikun-image2` is an unavailable legacy route as of the 2026-07-16 audit. Do not route to it or silently reinterpret it as another provider.

## Scoring Loop

After a Skill materially affects a real task, append a structured evidence record when the result will matter later. Historical Markdown summaries are not real-use evidence and must not be used alone for promotion.

Use `scripts/score_skill_use.py` to create a standard record:

```powershell
$python = 'C:\Users\lsb\anaconda3\python.exe'
& $python C:\Users\lsb\.codex\skills\skill-governance\scripts\score_skill_use.py `
  --skill jina-search `
  --project seedance2 `
  --task "Image2 case-library research" `
  --route-role supporting --outcome completed --verification-level integrated `
  --user-feedback pending --external-effects external_read `
  --trigger 2 --rework 2 --context 2 --evidence 2 --noise 1 `
  --notes "Useful, but Jina key pool showed exhausted-key retries." `
  --ledger C:\Users\lsb\.codex\skills\skill-governance\references\skill-use-ledger.jsonl
```

Validate the append-only ledger with `scripts/validate_skill_evidence_ledger.py` before promoting, restricting, merging, or archiving from its counts. Store durable task context in the relevant project memory without credentials, temporary URLs, or provider task IDs. Read `references/skill-evidence-ledger.md` for the schema and promotion boundary.

Read `references/evaluation-rubric.md` when a score is not obvious or when comparing overlapping skills.

## Iteration Cadence

Every 10 meaningful skill uses, or monthly during active work:

1. Keep skills with repeated high usefulness and low context cost.
2. Patch skills whose trigger text is too broad, too narrow, or misleading.
3. Merge or demote overlapping skills that cause duplicate guidance.
4. Promote project-specific patterns to global references only after they help in more than one project.
5. Keep detailed evidence in memory or project docs, not in `SKILL.md`.

Use `scripts/inventory_skills.ps1` to refresh the local inventory before a monthly router review. Generate the durable registry with:

```powershell
& C:\Users\lsb\.codex\skills\skill-governance\scripts\inventory_skills.ps1 `
  -Format json -View registry `
  -RegistryPath C:\Users\lsb\.codex\skills\skill-governance\references\skill-registry.json
```

The active inventory must resolve enabled plugins from Codex configuration. A raw recursive plugin-cache scan is a separate diagnostic and must not be presented as the active catalog.

## Obsidian Route Map

Use `scripts/export_obsidian_skill_map.py` when the user asks for an Obsidian Skill map or a continuously synchronized routing view. The Codex registry, overrides, family map, router, and JSONL evidence ledger remain authoritative; the Markdown dashboard, JSON Canvas, Bases routing console, semantic change log, and per-Skill detail cards are generated read-only views. Skill names must link to the generated detail card, which includes the full current Skill content plus filterable routing/evidence properties and source-file, evidence, registry, and synchronization timestamps. Record only meaningful routing or evidence changes in the generated change log; do not treat pure timestamp regeneration as a change.

Run the exporter after rebuilding the registry or changing evidence/routing state. It writes atomically and skips unchanged source hashes:

```powershell
& C:\Users\lsb\anaconda3\python.exe C:\Users\lsb\.codex\skills\skill-governance\scripts\export_obsidian_skill_map.py `
  --vault "C:\Users\lsb\Documents\Obsidian Vault"
```

Do not manually promote, archive, or rename Skills only inside Obsidian; make the governance change in the authoritative Codex files and regenerate the view.

After changing domain membership, entry/default routes, capability input/output contracts, or registry generation, run `scripts/validate_skill_routing_domains.py`. It must prove exactly 12 domains, 8 control planes, a complete shared capability envelope, one input/output/completion/non-output contract per domain, complete family coverage, one domain and one domain role for every registry Skill, and no cross-domain route references.

## 自进化沉淀规则

真实工作里一旦出现可复用的质量提升方法，就把它沉淀成小而准的 skill 更新，不要只停留在一次性提醒。

1. 每次重大问题收口后都要问：这个问题下次怎样自然不会再发生？把答案沉淀到三类位置之一：跨系统有效的全局 skill、只对当前项目有效的项目 skill、机器能判断的工具/质量检查。
2. 从证据里提炼有效做法：看了什么输入、采取了什么动作、产出哪里变好、用什么检查证明变好。
3. 优先写“应该怎么做”：输入证据、操作顺序、合格产物、质量门、交接边界。再用很短的末尾检查写“不要怎么做”。
4. 只修改最小必要的可复用 skill 或参考文件，让下一次同类任务自然走对；能机器检查的规则，优先同步到检查脚本或质量门，而不是只写文字提醒。
5. 从 active skill 正文里移除旧版本流水账、单次事故路径、过期尝试、已淘汰渠道细节；长历史放项目文档或记忆。
6. 用户读的内容优先使用用户偏好的中文词汇；命令、文件名、接口字段、API 名称才保留精确英文。
7. 任何 skill 修改后，都要跑 post-coding review，并做足够验证，确认路由和执行边界没有漂移。
8. 当反馈涉及多步骤返工、规则互相拦截、无效门槛、低效工具路线或外部能力信息差时，晋级到 `master-control-router` 的执行效率合同；专业 Skill 保留领域质量权威，主控负责冲突消解、能力发现和端到端推进。

## 修复后复利晋级

当用户明确要求把一次“第一遍未做好、第二遍已找到根因并验证修好”的经验沉淀下来时，读取并完整执行 `references/repair-compounding-promotion.md`。

当同一任务或失败路径进入第二次修复时，即使用户没有再次说“沉淀”或“自进化”，也创建 `references/repair-evolution-record.md` 定义的轻量记录。它只选择一个主要根因和一个晋级等级；记录本身不授权新增全局依赖、Provider 调用、部署、迁移或其他受保护副作用。

固定路由：

```text
skill-governance
-> 复核前后差异、真实证据和验证等级
-> 选择 no_promotion | project | domain | global | machine_gate
-> 定位最窄的现有项目/领域 owner
-> 只有实际创建或修改 Skill 时才使用 skill-creator
-> 修改完成后运行 quick_validate 和 post-coding-review
```

本 Skill 只负责晋级判断、owner 路由和治理边界，不取代网站、AI 视频、图片、文档或自动化的专业 Skill。没有充分证据时必须选择 `no_promotion`；人工触发沉淀不授权重新生产、Provider 消费、部署、DNS、数据删除或其他外部副作用。

## 突破性进展晋级门

当用户明确把一次结果称为“突破性进展”，或一次修复首次打通了此前不可用的执行主链时，不得只写总结或记忆。先按 `references/breakthrough-promotion-gate.md` 完成晋级：复核真实路径和证据等级，把稳定做法写进最窄的权威 Skill/项目路由，能机器判断的边界同步成测试或验证器，并把一次性环境事实与长期规则分开。

晋级至少要求：

- 实际成功路径、失败路径和回滚边界均被复核；
- Skill 路由说明下一次应读取什么、按什么顺序执行、什么结果才算成功；
- 凭据、费用、Provider、数据、部署和 UI 可见性等边界不能被成功摘要模糊；
- 项目 owner 正在写共享文件时，只先更新全局治理规则并排队项目同步，不得并发覆盖；
- Skill、路由、脚本、测试或流水线变更完成后运行 `post-coding-review`，并明确 `structural`、`integrated` 与 `real_delivery` 的最高已证等级。

## Guardrails

- Do not treat more skills as better. Selection quality beats volume.
- Do not load large reference files just to be thorough.
- Do not rewrite existing skills during a project task unless the user asked for skill maintenance.
- Do not store secrets, cookies, tokens, credentials, or private account details in skill notes.
- Do not let global governance override project rules, system/developer instructions, or user preferences.
