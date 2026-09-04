---
name: website-product-router
description: name: website-product-router
---

---
name: website-product-router
description: "Website-specialized production router for Framer, Next.js, static sites, existing-site redesign, Figma-to-code, source-repo reuse, Image2 bounded assets, shadcn/ui boundaries, database/backend/admin, SEO, accessibility, performance, analytics, CRO, Playwright verification, deployment checks, website-quality-router handoff. Use when users ask build, redesign, launch, verify, iterate website, landing page, portfolio, SaaS site, dashboard, docs site, or web app."
---

# Website Product Router

Use after `web-miniapp-product-router` classifies a project as website-family. For new commercial websites, broad redesigns, or sites that have grown through isolated page work, first use `commercial-website-program-router` to establish the business/content/architecture/design-system gates. This skill then owns the hard website production route and prevents plan-only output from being reported as shipped work.

## Default Decision

- Framer: fastest public marketing, portfolio, event, and campaign sites when hosted visual editing matters more than source-code ownership.
- Next.js: production websites and web apps needing code ownership, auth, data, APIs, custom components, SEO control, testing, and long-term engineering.
- Static site: simple content-heavy public sites with low interactivity; use Astro, Vite, static HTML, or 11ty according to repo context.
- Existing repo: inspect the current stack before redesigning or adding pages; do not impose a new framework without evidence.
- Figma-to-code: use when editable design source exists and fidelity matters; route through Figma workflow plus browser verification.
- shadcn/ui: useful for SaaS, dashboards, admin, forms, and dense app UI; not a default visual identity for expressive marketing or portfolio sites.
- Website quality problems: route through `website-quality-router`. Each vertical gets one champion skill, not a pile of overlapping skills.

## Required References

- `commercial-website-program-router`: program-level gates for discovery, brand/content, information architecture, design system, operations, and controlled launch. Consume its approved handoff when the project is commercial or broad in scope; do not repeat its strategy work inside an implementation task.
- `web-motion-champion`: mandatory authority for discovering, selecting, licensing, adapting, implementing, and verifying website motion from MotionSites, React Bits, Uiverse, Anime.js, and Aceternity UI. It owns the motion contract and source-use evidence; this router owns the production stack and end-to-end delivery route.
- `references/github-skill-application.md`: collected GitHub/official ecosystem patterns become concrete website production rules.
- `references/source-repo-reuse.md`: how to prove a template/repo/top source was actually applied.
- `references/image2-website-asset-route.md`: Image2/visual asset boundary for websites.
- `references/ui-quality-route.md`: high-quality website UI route and evidence.
- `references/backend-database-admin-route.md`: database, backend, auth, forms, upload, and admin route.
- `references/auth-compatibility-release-gate.md`: mandatory auth, migrated-account, verification-code, legacy-UI compatibility, cross-platform container, preview, promotion, and rollback gate.
- `references/route-matrix.md`: choose Framer, Next.js, static, existing repo, Figma-to-code, or app/admin route.
- `references/nextjs-production.md`: Next.js/App Router production expectations.
- `references/framer-production.md`: Framer delivery boundaries.
- `references/static-site-production.md`: static site route.
- `references/existing-project-redesign.md`: existing repo audit and safe change rules.
- `references/figma-to-website.md`: Figma source-of-truth handling.
- `references/shadcn-ui-boundaries.md`: shadcn/ui is component infrastructure, not brand direction.
- `references/seo-launch-checklist.md`: SEO/social launch checks.
- `references/analytics-cro-checklist.md`: conversion and measurement.
- `references/deployment-checklist.md`: domain, deployment, env, launch proof.
- `references/playwright-website-verification.md`: desktop/mobile browser evidence.

## Source Use Rule

- Do not merely cite GitHub, official docs, templates, or top skills.
- A source is "used" only when it changes a routing rule, manifest field, scaffold artifact, validation gate, implementation artifact, or verification record.
- Record applied sources in `source_repositories` and `source_application_records`.
- If a source stays reference-only, say so explicitly and do not count it as applied.

## Website Image2 / Visual Asset Boundary

- Runtime UI must be framework-first: real HTML/React/Vue/Astro/Framer components, real buttons, forms, links, navigation, modals, menus, product cards, dashboards, and admin controls.
- Image2/RunningHub/Figma/Pixso/PSD-style output may be used only for bounded assets: hero imagery, section art, product images, brand illustrations, icons, empty states, OG/social images, and campaign posters.
- Do not ship a full-page generated screenshot plus invisible links/hotspots as a production website.
- Do not bake live navigation, forms, pricing, legal copy, dashboard state, login/payment/upload states, or admin controls into generated images unless the same state exists as real UI.
- Record `website.image_asset_policy`, `website.generated_assets`, and browser evidence when generated assets are used.

## Output Contract

```text
Website route:
Source truth:
Source repos applied:
Implementation path:
UI/asset route:
Backend/data/admin route:
Quality route:
Required artifacts:
Verification:
Not verified:
Next action:
```

## Hard Rules

- Before material website motion, scroll, animated media, Canvas, or 3D work, use `web-motion-champion` to discover or consume a source-backed motion contract. Do not choose effects from popularity or aesthetics alone, use unofficial leaked source, stack multiple animation/scroll owners, or claim a copied component is verified implementation.
- Do not claim launched without reachable URL, screenshot verification, SEO/social metadata check, and any requested analytics/form destination check.
- Do not claim implemented from Figma/Framer/Image2 concept alone.
- Do not ship full-page generated screenshot UI with invisible links/hotspots as production web UI.
- Do not claim GitHub/top sources were used without `source_application_records` or concrete artifacts.
- Do not mark database/admin/backend ready without schema/resources, env/secrets plan, and smoke evidence.
- Do not mark auth ready from configured variables, a green homepage, or structural API presence. Apply `references/auth-compatibility-release-gate.md` and verify the deployed browser asset, canonical API route, migrated-password contract, Linux candidate, session readback, and rollback evidence.
- Do not use shadcn/ui as a visual shortcut for brand-led websites.
- Do not skip mobile verification for public websites.
- Do not mark manifest gates `pass` unless evidence is recorded in `verification_records`.
- Existing projects must be inspected before choosing an implementation route.
- Do not stack multiple overlapping design/UX/frontend skills for one website issue; use `website-quality-router` to pick the champion vertical skill.
- After editing skill workflow files, scripts, or generated workflow files, run `post-coding-review`.
