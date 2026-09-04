# Skill Discovery Source Application

Use reference when choosing or extending website/miniapp production route. Source list is not a trophy case; every selected source must become a routing rule, artifact, field, gate, or verification record.

## Local Skill Route Map

| Local skill | Use when | Required output |
| --- | --- | --- |
| `product-marketing`, `obviously-awesome`, `customer-research` | Offer, audience, positioning, customer value is unclear. | Positioning notes in `DESIGN.md` or `PROJECT_MANIFEST.json`. |
| `site-architecture` | Page/app structure unclear. | Sitemap, route map, feature map. |
| `website-product-router` | Website-family implementation. | Website stack choice, implementation artifacts, deployment/verification evidence. |
| `website-quality-router` | Visible website quality, CRO, SEO, accessibility, performance, analytics, responsive browser issues. | Named quality verticals evidence. |
| `miniapp-product-router` | WeChat mini program production. | Stack/component choice, cloud/backend/admin route, `miniapp` manifest fields, DevTools/real-device/release evidence. |
| `frontend-product-design-router` | Figma/Framer/Pixso/Motiff/Image2 aesthetic design decisions. | Design route, design source, quality gate. |
| `frontend-design`, `top-design`, `impeccable`, `refactoring-ui`, `web-typography` | Premium visual craft current bottleneck. | Concrete visual implementation changes review evidence. |
| `figma-use`, `figma-generate-design`, `figma-implement-design`, `figma-create-design-system-rules` | Figma-specific workflow. | Figma read/write evidence implementation handoff. |
| `playwright`, Browser plugin | Browser/runtime verification. | Screenshots, handoff notes. |
| `cro`, `analytics` | Conversion measurement. | Event taxonomy, funnel, analytics setup audit. |
| `ux-heuristics`, `ux-writing` | Usability interface copy. | UX findings copy changes tied workflows. |
| `security-best-practices` | Security/privacy review. | Risks, mitigations, or config checks. |

## Top Sources And How To Use Them

| Source | Use method | Lands in |
| --- | --- | --- |
| `VoltAgent/awesome-design-md` | Start or update durable design memory. Record product facts, visual direction, constraints, rejected paths, and latest evidence. | `DESIGN.md`, manifest `route.design_source_of_truth`, handoff notes. |
| `VoltAgent/awesome-agent-skills` | Split large workflows into narrow specialist skills with progressive disclosure. Do not load every reference; route smallest skill owns current phase. | Top router delegates website, miniapp, design, quality, launch. |
| `vercel-labs/agent-skills` | Every skill use must end in concrete artifacts and verification, not plan-only output. | Manifest gates, scaffold scripts, generated artifacts, verification records. |
| `joshuadavidthomas/frontend-design-principles` | Judge UI by hierarchy, spacing, typography, states, content density, and interaction usefulness before calling it good. | Aesthetic gate, frontend/design review, component implementation changes. |
| `figma/mcp-server-guide` and Figma MCP ecosystem | Treat design files as context, not runtime proof. Implement in target stack and verify there. | Figma/Pixso/Motiff route in design router; runtime proof in website/miniapp router. |
| `vercel/next.js` | Use for code-owned sites needing auth, data, API routes, SEO metadata, deployment checks, or admin. Verify build and browser runtime. | `website.runtime`, `route.implementation_route`, `website.backend_api`, SEO/deployment gates. |
| `withastro/astro`, Vite, 11ty ecosystem | Use static/content route when interactivity is low and content performance matters. Avoid unnecessary app stacks. | `route.implementation_route: static_site`, build artifacts, deployment evidence. |
| shadcn/ui ecosystem | Use as component infrastructure for SaaS, dashboards, admin, forms; not as a brand or visual direction shortcut. | `website.component_system`, admin/forms implementation, component regression evidence. |
| Supabase/Firebase/Prisma/Postgres ecosystem | Use for data-backed websites with schema, env vars, auth boundary, and server-owned mutations. | `website.database`, `website.backend_api`, `database_gate`, `backend_api_gate`. |
| `react-hook-form/react-hook-form`, `colinhacks/zod` | Use forms with client state plus schema/server validation and error-state evidence. | `website.forms`, `forms_gate`, form validation records. |
| `getsentry/sentry-javascript` | Use production app observability with release/env/source-map strategy. | `website.error_monitoring`, `observability_gate`. |
| `OWASP/CheatSheetSeries` | Use website launch security/privacy basics: CSP, env leaks, cookies/consent, inputs, third-party scripts. | `website.security`, `security_gate`, deployment checklist. |
| `payloadcms/payload`, `tinacms/tinacms`, Sanity ecosystem | Use content-heavy websites where non-developers need update path and asset strategy. | `website.content`, `content_gate`, CMS evidence. |
| Image2/RunningHub/Figma/Pixso visual asset route | Use generated visuals only as bounded website assets, never full-page screenshot UI plus hotspots. | `website.image_asset_policy`, `website.generated_assets`, browser screenshot evidence. |
| WeChat Mini Program official docs | Mini program completion depends on WeChat runtime config, native APIs, privacy, domains, DevTools, upload, review. | `miniapp-product-router`, `project.config.json`, `app.json`, capability checklist, release gates. |
| `NervJS/taro` | Use when cross-end React/Vue reuse is real requirement. Build WeChat output before DevTools verification. | `miniapp.stack: taro`, Taro config, WeChat build output path. |
| `dcloudio/uni-app` | Use when Vue/China ecosystem coverage and HBuilderX/uni conventions fit team. Verify generated `mp-weixin` output. | `miniapp.stack: uni_app`, uni config, WeChat build output path. |
| `tencent/tdesign-miniprogram` | Use enterprise, operational, forms, lists, filters, Tencent-style miniapp UI. | Component decision, form/list implementation. |
| `Tencent/weui`, `Tencent/weui-wxss` | Use official WeChat-feeling service, account, form, confirmation flows. | Component decision, simple WeChat-native UX. |
| `youzan/vant-weapp` | Use consumer commerce: product cards, SKU sheets, popups, actions, cart/order/member flows. | Component decision, retail UI implementation. |
| `jdf2e/nutui` | Use Taro or JD-style commerce density. | Taro component decision. |
| `guchengwuyue/yshop-drink` | Use commerce base/reference when ordering, SKU, member, coupon, balance, payment, backend, admin are needed. Lock repo/ref; replace brand/content/style/AppID/domain; verify backend/admin/miniapp paths. | `source_repositories`, `source_application_records`, backend/admin/miniapp artifacts, seed data, API smoke evidence. |

## Application Gate

Before saying top source was used, at least one of these must exist:

- stack component decision;
- manifest field;
- scaffolded directory/file;
- validation rule or quality gate;
- implementation artifact;
- DevTools, browser, real-device, deployment, upload, review, or API verification record.

If none changed, source was only referenced, not applied.

## Required Manifest Proof

Use fields source application:

- `source_repositories`: locked source repos and intended use.
- `source_application_records`: concrete changed artifacts evidence.
- `quality_gates.source_application_gate`: can pass only when source records exist.
