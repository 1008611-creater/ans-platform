---
name: ai-video-skill-route-index
description: name: ai-video-skill-route-index
---

---
name: ai-video-skill-route-index
description: 统一索引、审计和校验 AI 视频 Skill 路由。用于查询当前有效 Skill、冠军链路、上下游边界、使用证据、路由冲突、导出同步状态，或在修改 AI 视频路由前验证登记表。
---

# AI Video Skill Route Index

Use this Skill as the route registry, not as a content-production workflow. It does not write scripts, generate assets, or submit providers.

## Source of Truth

Read [references/route-registry.json](references/route-registry.json) before reporting or changing the AI video route. It owns each registered Skill's phase, trigger, output, direct-route status, champion-contract status, and known route warnings.

## Workflow

1. Run `scripts/validate_route_registry.py` before changing the router, champion handoff, project `AGENTS.md`, or export package. The validator also requires every official champion to retain a judgment card with trigger-specific value, required work, acceptance output, and common misuse; for open-ended original short dramas it blocks any route that regresses to asking the user for a one-line core premise before presenting complete candidates.
2. Select one active `direct_route` entry for a request, then add only the downstream entries declared in its record.
3. Treat `contract_only` entries as unavailable to the current total router until the registry warning is resolved.
4. Render the human-readable index with `scripts/render_knowledge_index.py <output-path>` after a registry change.

## Boundaries

- Do not silently promote a `contract_only` Skill into a direct route.
- Do not treat a file modification time as a production-use record; use the registry's `usage_records` only.
- Do not claim a known warning is resolved until the validator reports no warning for it.

## Resources

- [references/route-registry.json](references/route-registry.json): machine-readable route inventory and evidence summary.
- `scripts/validate_route_registry.py`: resolves paths, direct routes, category membership, and declared warnings.
- `scripts/render_knowledge_index.py`: produces the knowledge-base Markdown index.
