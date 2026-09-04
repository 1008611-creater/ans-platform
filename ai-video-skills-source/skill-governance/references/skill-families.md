# Skill Families

Use this map after `skill-router.md` when a task could trigger several similar skills. The goal is to pick one primary route per family, then add supporting skills only for distinct phases.

Every family in this document belongs to exactly one top-level business domain in `skill-routing-domains.json`. Families remain the fine-grained conflict map; they are not separate top-level entry points. When adding or renaming a family, update the domain contract and run `scripts/validate_skill_routing_domains.py` before rebuilding the registry.

## Core Routing

| Family | Primary route | Supporting route | Explicit-only or merge pressure |
| --- | --- | --- | --- |
| Governance | `skill-governance` | `skill-creator`, `skill-installer`, `plugin-creator` | Use creator/installer/plugin skills only for those exact maintenance tasks. |
| Continuity | `codex-agent-mem` | local `AGENTS.md`, handoff docs | If memory MCP is unavailable, continue from local docs and record decisions in governance references. |
| Workflow separation | `agent-team-workflow` | independent review or issue-loop checks | Do not force it for tiny tasks. |
| Multi-step execution efficiency and route choice | `master-control-router` | `jina-search`, `gui-control-router`, one narrow domain Skill | Use for repeated rework, contradictory gates, or material tool uncertainty; one primary route and one fallback only. |
| Web research | `jina-search` | `web-scraper`, `wechat-article-extractor` | Use `web-scraper` for dynamic crawling/structured extraction; use WeChat extractor only for mp.weixin.qq.com or Jina failure. |
| OpenAI | `openai-docs` | official OpenAI pages only | Do not route generic web search ahead of official docs. |
| Browser verification | Browser plugin, `playwright` | `playwright-interactive`, `screenshot` | Browser plugin wins for explicit in-app browser/local target requests; `screenshot` is OS-level fallback. |
| Live GUI operation and control-surface selection | `gui-control-router` | Browser plugin, `cdp-extension-router`, `playwright-interactive`, discovered Windows UIA/Computer Use MCP | Router selects one primary control layer; do not stack screenshot/coordinate automation ahead of semantic routes. |

## Frontend And Product UI

| Use case | Primary route | Supporting route | Explicit-only or merge pressure |
| --- | --- | --- | --- |
| Build or improve production UI | `frontend-design` | `impeccable` | `frontend-skill` is archived behind `frontend-design`. |
| Premium critique or polish | `impeccable` | `make-interfaces-feel-better` | `design-taste-frontend` is an active candidate limited to matching landing-page, portfolio, and redesign work. `gpt-taste` and `ui-ux-pro-max` remain archived. |
| Existing UI redesign | `redesign-existing-projects` | `frontend-design`, `playwright` | Keep scoped to existing projects. |
| Visual hierarchy and layout repair | `refactoring-ui` | `web-typography` | Do not load `top-design` for ordinary SaaS/admin UI. |
| Usability review | `ux-heuristics` | `refactoring-ui` | `web-design-guidelines` is archived; restore only when the exact guideline checklist is required. |
| UI copy | `ux-writing` | `stop-slop` | Keep separate from marketing copy. |
| Immersive/Awwwards style | `top-design` | `web-typography`, `playwright` | Explicit premium/portfolio/brand-experience route only. |

## Website And Product Delivery

| Use case | Primary route | Supporting route | Routing boundary |
| --- | --- | --- | --- |
| Website versus WeChat mini-program classification | `web-miniapp-product-router` | `commercial-website-program-router` for substantial commercial program gates | The top-level router classifies and delegates. It does not implement, publish, or deploy. |
| Substantial commercial website program | `commercial-website-program-router` | `site-architecture`, `frontend-product-design-router`, `website-product-router` | Use for discovery through controlled-launch gates. It hands actual website production to the website route. |
| Website-family implementation | `website-product-router` | `web-motion-champion`, `website-quality-router`, `playwright` | Use after website classification. The user-designated motion champion owns five-source discovery, source adaptation and motion verification; the production router owns stack and delivery. |
| WeChat mini-program implementation | `miniapp-product-router` | `frontend-product-design-router` | Use only after top-level classification. Preview/upload/review/release remain explicit external-state actions. |
| Website quality diagnosis | `website-quality-router` | one chosen vertical such as `cro`, `analytics`, `refactoring-ui`, or `web-typography` | Do not stack broad design, UX, CRO, and frontend Skills. Require browser evidence before claiming visible improvement. |
| Figma read/write workflow | `figma-use` before any `use_figma` tool call | `figma`, `figma-generate-design`, `figma-implement-design` | Creating files, screens, libraries, or rules is explicit-only. Design-to-code is a separate code implementation phase. |

## Marketing, CRO, And Monetization

| Use case | Primary route | Supporting route | Explicit-only or merge pressure |
| --- | --- | --- | --- |
| Marketing context and positioning | `product-marketing` | `customer-research`, `obviously-awesome` | Use positioning skills before page copy. |
| Customer insight | `customer-research` | `jobs-to-be-done` | Use JTBD only when switching forces or job framing matter. |
| Website copy | `copywriting` | `stop-slop` | `storybrand-messaging` and `ogilvy-copywriting` are archived framework routes; restore only when explicitly requested. |
| Conversion improvement | `cro` | `cro-methodology`, `analytics` | `page-cro` is archived behind `cro`. |
| Experiments and measurement | `analytics` | `cro-methodology` | Keep A/B methodology separate from implementation tracking. |
| Pricing and packaging | `pricing` | `paywalls` | `hundred-million-offers` is archived; restore only for explicit Grand Slam Offer work. |
| Site and SEO structure | `site-architecture` | `programmatic-seo`, `free-tools` | Use only for acquisition architecture, not normal UI work. |

## Files, Data, And Knowledge Bases

| Artifact | Primary route | Supporting route | Explicit-only or merge pressure |
| --- | --- | --- | --- |
| Spreadsheets | `xlsx` | `csv-pipeline` | `excel-processor` is archived behind `xlsx`. |
| CSV/JSON pipelines | `csv-pipeline` | `xlsx` | Use `xlsx` only when spreadsheet formatting/formulas matter. |
| PDF | provisional local `pdf` from `.agents` | `pdf-render-review`; qualified plugin candidate `pdf:pdf` | Preserve the prior local route only as a continuity default, not an evidence-backed quality winner. Select one implementation per task and score real extraction, generation, form, and visual-review outcomes before promoting either divergent route. Never edit managed plugin cache. |
| DOCX | `docx` | `doc` | Use `docx` for advanced edits/tracked changes; `doc` for concise layout/render checks. |
| OCR | `image-ocr` | `pdf` | Use OCR only when source text is image-based. |
| JSON Canvas | `json-canvas` | Obsidian skills | Keep separate from generic Markdown work. |
| Obsidian | `obsidian-cli` | `obsidian-markdown`, `obsidian-bases`, `obsidian-showcase-vault` | Use the narrow Obsidian skill matching CLI, Markdown, Bases, or showcase maintenance. |
| Feishu/Lark | `feishu-inout` | `feishu-docx` | `feishu-docx` is narrower cloud-doc/export support. |

## Cross-System Operations

| Use case | Primary route | Supporting route | Routing boundary |
| --- | --- | --- |
| Local DOCX work | `docx` | `doc`, candidate plugin `documents` | Local file editing does not imply cloud document writes; render/review when layout fidelity matters. |
| Local spreadsheets and tabular data | `xlsx` | `csv-pipeline`, candidate plugin `Spreadsheets` | Keep workbook formatting/formula work separate from CSV/JSON transformation. |
| Obsidian knowledge base | `obsidian-cli` | `obsidian-markdown`, `obsidian-bases`, `obsidian-showcase-vault` | Choose the narrow artifact/CLI phase; do not treat a note edit as cross-project control. |
| Feishu/Lark cloud operations | explicit `feishu-inout` or `feishu-docx` | local document skills first when cloud work is not requested | Reading, writing, drive changes, messages, calendar, and group changes are external operations. Do not infer cloud writes from a local file request. |
| Remote servers, cross-device bridges, Hermes, or WeChat delivery | explicit `server-fleet-ssh-router`, `win-mac-codex-bridge`, `hermes-codex-bridge`, or `wechat-redraw-word-sender` | `master-control-router` for read-only cross-project coordination | Explicitly identify the host/device/recipient and the intended action. A handoff, status request, or planning result is not remote execution or message delivery. |

## Image2 And Image Generation

| Use case | Primary route | Supporting route | Explicit-only or merge pressure |
| --- | --- | --- | --- |
| Built-in direct image generation/editing | `image2-direct` | system `imagegen` instructions | User-requested standalone image generation still follows the direct image tool rules. If the image is a video asset, first frame, role/product consistency anchor, or Seedance2 input, use `ai-video-fundamentals-skill` as the quality layer first. |
| Style or prompt library | `gpt-image-2-style-library` | `ciwei-prompt-method` | Use only when visual style selection matters. |
| RunningHub Image2 | `runninghub-image2-text`, `runninghub-image2-image` | `runninghub-canvas-fallback` | Use only when RunningHub or low-price channel is requested. |
| Hermes Canvas | `hermes-canvas-image2` | `runninghub-canvas-fallback` | Use only for canvas.lsb0713.online workflows. |
| Narrative first frames | `ai-video-fundamentals-skill` | `image2-narrative-firstframe`, channel-specific Image2 skills | The champion skill wins for quality, consistency, and diagnosis; image skills handle execution channel details. |
| Capability research | `image2-boundary-lab` | `jina-search` | Explicit research/taxonomy route. |

| Prompt method and image execution | `prompt-skill-router` | `gpt-image-2-style-library`, `ciwei-prompt-method`, `prompt-engineering` | Compile/validate prompt facts before selecting any concrete generation route. A prompt contract does not authorize a provider submission. |
| Remote Image2/provider execution | explicit named provider route such as `gpt-image`, `krill-image2`, `runninghub-image2-*`, `hermes-canvas-image2`, or `oocimage2skill` | channel router only when model/channel selection is explicitly requested | Upload, generation, polling, download, and cloud-canvas writes are external operations. Preserve task-spec, image-asset, cost, and user authorization gates. |

## Product Marketing And Monetization

| Use case | Primary route | Supporting route | Routing boundary |
| --- | --- | --- |
| Product marketing foundation | `product-marketing` | `customer-research`, `jobs-to-be-done` | Establish factual audience/product context before downstream marketing work when it is missing. |
| Positioning | `obviously-awesome` | `customer-research`, `jobs-to-be-done` | Competitive/category positioning is distinct from page copy. |
| Pricing and packaging | `pricing` | `paywalls` | Price/package strategy precedes in-product upgrade UX. |
| Persuasive page/product copy | `copywriting` | `stop-slop` | Copy uses confirmed facts and positioning; it does not invent product proof or choose pricing. |
| Programmatic SEO or free marketing tools | `programmatic-seo` / `free-tools` only for their explicit scopes | `website-product-router`, `analytics` | Do not invoke for ordinary landing-page copy or one-off website work. |

`ikun-image2` is an unavailable legacy route, not an active Image2 family member. If a user explicitly requests Ikun, report that no current implementation is registered and verify a successor separately instead of guessing.

## AI Video And Film

| Use case | Primary route | Supporting route | Explicit-only or merge pressure |
| --- | --- | --- | --- |
| Short-drama redraw and Mexico localization | `mx-shortdrama-00-router` | numbered `mx-shortdrama-*` phase skills; `image2-storyboard-video` is mandatory primary storyboard workflow whenever storyboard language is present | Router owns redraw source hygiene and accepted-artifact selection. The global storyboard rule outranks family defaults; do not let redraw routing substitute for `image2-storyboard-video` on storyboard requests. |
| Finalized-script director analysis and asset preproduction | `chaoge-assets-trial` | current Image 2 tool or external-platform prompts | User-designated champion for P0/P0A, P1, realistic character masters/sheets, and key-prop masters only. Return scenes, storyboards, video prompts, generation, and diagnosis to `ai-video-fundamentals-skill`. |
| General AI video quality | `ai-video-fundamentals-skill` | `ai-video-production-router`, `ai-film-champion-method`, `ai-video-firstframe-workflow` | The user-designated method layer wins for creative/quality judgment. The production router then selects exactly one specialist path; neither route authorizes a provider submission. |
| Model/channel selection and provider execution | explicit `ai-image-video-channel-router` / `ai-video-channel-router`, then one named provider adapter | one provider-specific channel Skill only after the channel is selected | Channel discovery, login, quota, upload, submission, download, and delivery are external-state phases. A locked task specification and distinct user/cost authorization remain required; never fan out to several adapters as fallbacks. |
| Storyboard planning | `image2-storyboard-video` when storyboard intent is explicit | `storyboard-director`, `ai-video-storyboard` | For short-drama redraw, retain `mx-shortdrama-00-router` for accepted source material, then use the storyboard route only as a downstream phase. |
| Story/director audit | `director-story-audit` | `ai-film-champion-method` | Use before Image2/Seedance2 production. |
| Seedance2 narrative shots | `seedance2-narrative-shot-workflow` | `echoon-seedance2-film-workflow` | Echoon skill wins only for app.echoon.top execution. |
| Contest orchestration | `seedance2-a-contest-orchestrator` | `relic-collector-ip-system` | Use only for full contest/IP workflows. |
| Commerce video | `ai-video-fundamentals-skill` | `seedance2-commerce-video`, `realistic-commerce-video-replication`, `runninghub-fruit-commerce-video` | Champion skill owns product lock, first-frame quality, physical action, VO/post, and diagnosis; platform/channel skills execute narrow workflows. |
| Topic selection | `ip-video-topic-selection` | `mx-shell-zombie-scavenger-research` | Mx-Shell research is supporting, not default. |
| Captions/subtitles | `tk-subtitles` | AI video champion | Use for actual caption generation or revision. |
| Watermark removal | `dynamic-watermark-removal` | verification tools | Only for authorized user-owned or licensed media. |

## Platform Operations

| Platform | Primary route | Supporting route | Explicit-only or merge pressure |
| --- | --- | --- | --- |
| Douyin | explicit `douyin-workflow-orchestrator` or `douyin-publish-operator` for upload/publish execution | `douyin-video-selection`, `douyin-video-production`, `douyin-caption-cover`, `douyin-fruit-commerce-strategy` | Planning, production, and packaging stay separate from upload/publish. Only add the execution route after an explicit user request; child skills run by phase, not all at once. |
| Kuaishou | explicit `kuaishou-content-pipeline` or `kuaishou-publisher` for upload/publish execution | `kuaishou-video-scout`, `kuaishou-video-maker`, `kuaishou-publish-packager` | Planning, production, and packaging stay separate from upload/publish. Preserve the publisher's final confirmation gate. |
| Xiaohongshu | explicit `xiaohongshu-ops` or `xhs-note-creator` for platform operation/publication | `xhs-traffic-aesthetic-guard` | Drafting and review do not authorize publication. Run the guardrail before an explicitly requested image-note publish flow. |
| Goofish/Xianyu | explicit `goofish-publish-item`, `goofish-reply-buyer`, or `xianyu-product-publisher` for external writes | `goofish-risk-guard`, `goofish-shop-diagnosis`, `xianyu-ai-demand-radar` | Use `goofish-risk-guard` before risky listing/reply changes. Diagnosis and demand research do not authorize a listing or message send. |
| X/Twitter | `post-to-x` | browser verification | Explicit posting route only. |

## Figma

| Use case | Primary route | Supporting route | Explicit-only or merge pressure |
| --- | --- | --- | --- |
| Any Figma MCP tool call | `figma-use` | `figma` | `figma-use` is mandatory before every `use_figma` call. |
| Design to code | `figma-implement-design` | `frontend-design`, `playwright` | Use project components and verify visually. |
| Generate design | `figma-generate-design` | `figma-create-new-file` | Use only when creating or translating design work. |
| Design system/library | `figma-generate-library` | `figma-create-design-system-rules` | Keep scoped to library/rules tasks. |

## Security

| Use case | Primary route | Supporting route | Explicit-only or merge pressure |
| --- | --- | --- | --- |
| Secure coding guidance | `security-best-practices` | repo tests/static checks | Trigger only on explicit security requests. |
| Threat model | `security-threat-model` | `agent-team-workflow` for larger reviews | Trigger only on explicit threat-model requests. |
