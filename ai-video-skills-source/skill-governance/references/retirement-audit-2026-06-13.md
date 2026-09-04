# Skill Retirement Audit - 2026-06-13

> Historical snapshot. The counts and active/archived statements below describe 2026-06-13 and were superseded by the generated `skill-registry.json` on 2026-07-16. Preserve this file as audit evidence; do not use it as the current routing source.

Scope: visible local skills under `C:\Users\lsb\.codex\skills`, `C:\Users\lsb\.agents\skills`, and the current Browser plugin skill. Broad plugin backup folders were observed but should not be used for routing.

Inventory summary:

- 107 active `SKILL.md` entries in the normal visible roots after trigger demotion archival.
- 107 unique skill names after renaming `.codex\skills\pdf` to `.codex\skills\pdf-render-review` and archiving 10 broad overlap skills.
- Active duplicate names: none.
- Backup duplicate noise: broad scans of `.codex\plugins\cache\openai-bundled` also find older `control-in-app-browser` backup copies.

## Keep As Champions

These should stay in the default high-quality route:

- `skill-governance`
- `codex-agent-mem`
- `agent-team-workflow`
- `skill-creator`
- `jina-search`
- `openai-docs`
- Browser plugin / `control-in-app-browser`
- `playwright`
- `frontend-design`
- `impeccable`
- `ai-video-fundamentals-skill` - top-priority champion for AI video, Image2 assets for video, Seedance2 planning/diagnosis, and mining prior failure/fix lessons from threads and the local Obsidian vault.
- `image2-direct`
- `gpt-image-2-style-library`
- `ikun-image2`

## Keep As Primary Specialists

These are useful but should trigger only on clear domain or artifact matches:

- Marketing/commercial: `product-marketing`, `customer-research`, `copywriting`, `cro`, `analytics`, `pricing`, `paywalls`, `site-architecture`, `programmatic-seo`, `free-tools`
- Files/data: `xlsx`, `csv-pipeline`, `docx`, `image-ocr`, `json-canvas`
- Knowledge/cloud docs: `obsidian-cli`, `obsidian-markdown`, `obsidian-bases`, `obsidian-showcase-vault`, `feishu-inout`
- Browser/automation: `playwright-interactive`, `screenshot`
- Image generation channels: `hermes-canvas-image2`, `runninghub-image2-text`, `runninghub-image2-image`
- AI video/film: `director-story-audit`, `seedance2-a-contest-orchestrator`, `seedance2-narrative-shot-workflow`, `seedance2-commerce-video`, `echoon-seedance2-film-workflow`, `image2-narrative-firstframe`, `ip-video-topic-selection`, `tk-subtitles`, `dynamic-watermark-removal`
- Platform operations: `douyin-workflow-orchestrator`, `kuaishou-content-pipeline`, `xiaohongshu-ops`, `xhs-traffic-aesthetic-guard`, `goofish-publish-item`, `goofish-reply-buyer`, `goofish-risk-guard`, `goofish-shop-diagnosis`, `xianyu-ai-demand-radar`, `xianyu-product-publisher`
- Figma: `figma-use`, `figma`, `figma-implement-design`, `figma-generate-design`, `figma-generate-library`, `figma-create-new-file`, `figma-create-design-system-rules`
- Security: `security-best-practices`, `security-threat-model`

## Merge Or Demote

High-priority cleanup candidates:

- `pdf` + `pdf-render-review`: resolved. Keep `.agents\skills\pdf` as the primary comprehensive PDF route. Keep `.codex\skills\pdf-render-review` as the supporting visual render/layout QA route only.
- `doc` + `docx`: keep both only if `doc` remains a concise render/layout helper and `docx` remains the advanced tracked-change/document editing route.
- `xlsx` + `excel-processor`: prefer `xlsx`; demote `excel-processor` to archive unless its simple Python-template workflow proves useful.
- `cro` + `cro-methodology` + `page-cro`: keep `cro` as the primary conversion skill, reserve `cro-methodology` for A/B-test and experiment design, and merge/archive `page-cro`.
- `frontend-design` + `frontend-skill`: prefer `frontend-design`; archive `frontend-skill`.
- `frontend-design` + `design-taste-frontend` + `gpt-taste` + `ui-ux-pro-max`: keep `frontend-design` and `impeccable` in the default route; make the others explicit-only or project-specific.
- `top-design`: keep as explicit premium/brand-experience route, not default frontend routing.
- `web-design-guidelines`: keep as lightweight explicit checklist; do not route ahead of `frontend-design`, `refactoring-ui`, or `ux-heuristics`.
- `feishu-inout` + `feishu-docx`: use `feishu-inout` as the primary Feishu route; keep `feishu-docx` only for doc/export-specific workflows.
- `jina-search` + `web-scraper`: prefer `jina-search` for search/page reading; use `web-scraper` only for dynamic crawling or structured extraction.

## Orchestrator-First Groups

These groups should not all auto-load together:

- Douyin: default to `douyin-workflow-orchestrator`; load `douyin-video-selection`, `douyin-video-production`, `douyin-caption-cover`, `douyin-publish-operator`, or `douyin-fruit-commerce-strategy` by phase.
- Kuaishou: default to `kuaishou-content-pipeline`; load scout/maker/packager/publisher skills by phase.
- Xiaohongshu: default to `xiaohongshu-ops`; use `xhs-note-creator` for note assets and `xhs-traffic-aesthetic-guard` before image-note publishing.
- Goofish/Xianyu: use exact task skills; run `goofish-risk-guard` before risky listing/reply changes.
- Figma: run `figma-use` before any Figma MCP tool call, then choose the narrow Figma task skill.
- AI video: `ai-video-fundamentals-skill` is the quality layer; add Seedance2/Echoon/RunningHub skills only for execution channel specifics.

## Archive Candidates

Archive means "do not default-route"; it does not mean immediate deletion.

Moved out of active discovery roots on 2026-06-13:

- `frontend-skill`
- `excel-processor`
- `page-cro`
- `ui-ux-pro-max`
- `design-taste-frontend`
- `gpt-taste`
- `web-design-guidelines`
- `storybrand-messaging`
- `hundred-million-offers`
- `ogilvy-copywriting`

Archived location: `C:\Users\lsb\.codex\skills-archive\2026-06-13-trigger-demotions`.

Kept installed but explicit-only or narrow for now:

- `mx-shell-zombie-scavenger-research`
- `ciwei-prompt-method`
- `post-to-x`
- `email-drafter`

Keep these accessible when explicitly named, when the project is built around their method, or when the primary route fails.

## Applied Trigger Demotions

2026-06-13 update: the following broad or overlapping skills had their frontmatter descriptions narrowed so they no longer default-route over champion or primary skills:

- `frontend-skill` -> explicit-only behind `frontend-design`.
- `excel-processor` -> legacy fallback behind `xlsx`; old `compatibility` frontmatter moved under `metadata`.
- `page-cro` -> explicit-only behind `cro` and `cro-methodology`.
- `ui-ux-pro-max` -> explicit-only taxonomy/catalog behind `frontend-design`, `impeccable`, and narrower UI skills.
- `design-taste-frontend` -> explicit-only behind `frontend-design` and `impeccable`.
- `gpt-taste` -> explicit-only advanced motion/UI method behind `frontend-design`, `impeccable`, and `top-design`.
- `web-design-guidelines` -> explicit-only late checklist; old `argument-hint` frontmatter moved under `metadata`.
- `storybrand-messaging` -> explicit-only StoryBrand framework behind product marketing and copywriting routes.
- `hundred-million-offers` -> explicit-only Grand Slam Offer framework behind pricing, paywalls, product marketing, and CRO routes.
- `ogilvy-copywriting` -> explicit-only Ogilvy framework behind copywriting and product marketing routes.

2026-06-13 follow-up: after validation, moved the 10 broad overlap skills above to `C:\Users\lsb\.codex\skills-archive\2026-06-13-trigger-demotions` so they are no longer in active discovery. `mx-shell-zombie-scavenger-research`, `ciwei-prompt-method`, `post-to-x`, and `email-drafter` remain installed because they either support AI-video research sources or provide unique execution behavior.

## Applied Duplicate Resolution

2026-06-13 update: resolved the active duplicate `pdf` name by renaming `.codex\skills\pdf` to `.codex\skills\pdf-render-review` and changing its frontmatter name to `pdf-render-review`. Routing is now:

- `pdf`: primary route for PDF extraction, generation, merging, splitting, forms, and document-scale manipulation.
- `pdf-render-review`: supporting route for rendering PDFs to page images and visually checking layout, typography, spacing, tables, page breaks, and glyph defects before delivery.

## Next Cleanup Pass

1. Score real uses for `frontend-design`, `impeccable`, `xlsx`, `docx`, `cro`, and `ai-video-fundamentals-skill`.
2. Review remaining explicit-only installed skills: `mx-shell-zombie-scavenger-research`, `ciwei-prompt-method`, `post-to-x`, and `email-drafter`.
3. Remove only skills that remain unused after archive demotion and have a proven replacement.
