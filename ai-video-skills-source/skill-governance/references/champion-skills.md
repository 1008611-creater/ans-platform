# Champion Skills

Use this reference when choosing a small set of skills for a task or reviewing the long-term champion list.

## Core Routing Set

This table mixes conditional mandatory routes, user-designated routes, and provisional defaults. Only entries marked `evidence_backed_champion` claim the local real-use promotion threshold. Current evidence counts live in `skill-registry.json`.

| Area | Route | Status | Use when | Notes |
| --- | --- | --- | --- | --- |
| Continuity | `codex-agent-mem` | `provisional_default` | Long-running projects, handoffs, durable decisions, blockers, completion checks | Prefer compact session/lane context, not broad project packs. |
| Web research | `jina-search` | `provisional_default` | Web search, page reading, reference gathering, prompt research | In projects with a Jina wrapper, use the wrapper. |
| Workflow separation | `agent-team-workflow` | `provisional_default` | Task spec, implementation handoff, independent review, issue loop | Do not force it for tiny tasks. |
| Skill creation | `skill-creator` | `mandatory` for Skill edits | Creating or updating Codex skills | Use validation scripts and post-coding review. |
| Hermes employee productization | `hermes-employee-product-router` | `user_designated` | Turning Hermes usage into effect dashboards/Xiaohongshu case candidates and delivering isolated customer instances through one-action provision plus QR authorization | Product/growth router only; server, bridge, Obsidian, Skill edits, credentials, pricing, publication, and external writes keep their narrower owners and confirmation gates. |
| Browser verification | `playwright`, Browser plugin | `provisional_default` | Local UI verification, screenshots, flows, frontend regressions | Prefer Browser plugin for explicit in-app browser requests. |
| Frontend quality | `frontend-design`, `impeccable` | `provisional_default` | Building, redesigning, polishing, or auditing UI | Use project-specific design skills when available. |
| Image2 generation | `image2-direct`, `gpt-image-2-style-library` | `provisional_default` | Direct generation and style/prompt selection | Use `ai-image-video-channel-router` only when an external channel must be selected. `ikun-image2` is unavailable legacy. |
| AI video method | `ai-video-fundamentals-skill` | `user_designated` | AI video ideation, story/shot audit, Image2 assets for video, Seedance2 planning, reroll strategy, or diagnosis | This priority comes from an explicit user decision, not from pretending the score sample is broader than it is. |
| AI director preproduction assets | `chaoge-assets-trial` | `user_designated` | A finalized script needs P0/P0A analysis, P1 creative baseline, realistic character masters/sheets, and key-prop masters | User-designated champion for this bounded vertical. It stops after key props; scenes, storyboards, video prompts, generation, and diagnosis return to `ai-video-fundamentals-skill`. |
| OpenAI products | `openai-docs` | `mandatory` for OpenAI product/API guidance | OpenAI API, model, prompt-upgrade, or product guidance | Use official OpenAI sources. |

## Candidate Benches

Do not auto-load the whole bench. Active candidates require real-use scoring before promotion. Archived and researched-only entries are recorded for provenance and must not be routed as installed Skills.

### Commercial Website And CRO

Source: `coreyhaines31/marketingskills`.

| Area | Candidate skills | Use when | Status |
| --- | --- | --- | --- |
| Product foundation | `product-marketing`, `customer-research` | Defining ICP, positioning, pain language, objections, JTBD, or reusable marketing context | Candidate; strong fit for commercial projects. |
| Site architecture | `site-architecture`, `programmatic-seo`, `free-tools` | Turning a site into a scalable acquisition/SEO/tool funnel | Candidate; use for monetizable website planning. |
| Conversion | `cro`, `pricing`, `paywalls`, `analytics` | Improving conversion paths, package/credit pricing, usage-limit upgrade screens, and metrics | Candidate; high fit for vertical SaaS/tool monetization. |
| Marketing copy | `copywriting` | Writing landing pages, feature pages, CTAs, and section copy | Candidate; pair with `ux-writing` for product UI text. |

### Product Copy And Interface Text

Source: `content-designer/ux-writing-skill`.

| Area | Candidate skills | Use when | Status |
| --- | --- | --- | --- |
| UX writing | `ux-writing` | Buttons, labels, empty states, errors, onboarding, accessibility copy, product voice/tone | Candidate; likely champion after one successful UI copy pass. |

### Interface Craft And Visual Quality

Sources: `wondelai/skills`, `boraoztunc/skills`, and `nextlevelbuilder/ui-ux-pro-max-skill`.

| Area | Candidate skills | Use when | Status |
| --- | --- | --- | --- |
| Design fundamentals | `refactoring-ui`, `web-typography`, `ux-heuristics` | Fixing hierarchy, spacing, typography, usability, and basic design-system consistency | Candidate; use for grounded audits. |
| Landing/portfolio anti-slop method | `design-taste-frontend` | Matching landing pages, portfolios, and redesigns; not dashboards or product UI | Active candidate; collect real-use evidence before promotion or trigger demotion. |
| Premium visual direction | `top-design` | Exploring high-end visual direction or brand experiences | Active candidate; constrain it with project taste rules. |
| Archived visual references | `ui-ux-pro-max`, `web-design-guidelines` | Explicit restoration or historical comparison only | Archived; not routable by default. |
| Micro-polish | `make-interfaces-feel-better` | Polishing hover states, animation, hit areas, borders, shadows, visual details | Active candidate; use near implementation/review. |

### Positioning And Sales Copy

Source: `wondelai/skills` and `boraoztunc/skills`.

| Area | Candidate skills | Use when | Status |
| --- | --- | --- | --- |
| Positioning | `obviously-awesome`, `jobs-to-be-done` | Clarifying category, switching forces, and value proposition | Active candidates; use before page copy. |
| Writing cleanup | `stop-slop` | Removing generic AI language from a draft | Active candidate; use after the domain draft exists. |
| Archived copy frameworks | `storybrand-messaging`, `hundred-million-offers`, `ogilvy-copywriting` | Explicit restoration or historical comparison only | Archived; not routable by default. |

### External Workflow Candidates

These are researched but not installed as local skills unless a project needs them.

| Workflow | Use when | Notes |
| --- | --- | --- |
| Figma MCP + Figma skills | The user has Figma frames or wants design-to-code with structured design context | Prefer for real design-system handoff; requires Figma setup/access. |
| `abi/screenshot-to-code` | Converting screenshots/mockups into first-pass HTML/React/Tailwind | Useful for prototypes; must refactor into existing components. |
| 21st.dev Magic MCP | Generating UI component variations from prompts | Requires service/API setup; evaluate before project adoption. |

## Project-Specific Patches

Project-local skills should win when they encode domain truth that global skills do not know.

Examples:

- `sanchuan-ops-frontend` for the Sanchuan fruit mall admin frontend.
- `daihuo-*` skills for ecommerce selling workflows.
- RunningHub or platform-specific skills when the task is tied to those APIs or platforms.

## Promotion Rule

Promote a project-specific pattern into a global champion only after:

1. It has helped in at least two different projects or three separate tasks.
2. Its trigger can be written clearly without catching unrelated work.
3. It reduces rework or verification misses.
4. It can stay concise through progressive disclosure.

## Demotion Rule

Demote or patch a champion when it repeatedly:

- Triggers when not needed.
- Loads too much context for the value returned.
- Duplicates another champion.
- Produces advice that is hard to verify.
- Encourages broad research when local evidence is enough.
