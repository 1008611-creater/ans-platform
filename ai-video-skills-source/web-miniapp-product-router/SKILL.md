---
name: web-miniapp-product-router
description: name: web-miniapp-product-router
---

---
name: web-miniapp-product-router
description: "Top-level router for website and WeChat mini program product projects: intake, positioning, architecture, DESIGN.md, PROJECT_MANIFEST.json, design routing, website quality routing, implementation routing, launch, analytics, iteration. Use when users ask 做网站, 做小程序, 网站小程序总路由, 网站项目, 小程序项目, miniapp, landing page, SaaS site, portfolio, web app, or need end-to-end production workflow."
---

# Web Miniapp Product Router

Route website and WeChat mini program work before execution. Keep this as the top-level control layer: decide project type, create durable memory, route website production through `website-product-router`, route website quality through `website-quality-router`, route visual design through `frontend-product-design-router`, route WeChat mini program production through `miniapp-product-router`, and validate status before reporting progress.

## Default Stack

- Product positioning: `product-marketing`, `obviously-awesome`, `customer-research` when offer or audience is unclear.
- Site/page structure: `site-architecture`.
- Website route: `website-product-router` for Framer, Next.js, static sites, existing-site redesign, Figma-to-code, SEO, accessibility, performance, analytics, CRO, Playwright verification, and deployment checks.
- Website quality route: `website-quality-router` for aesthetic/frontend/UX/SEO/accessibility/performance/analytics/CRO/responsive/browser-verification vertical routing.
- Design route: `frontend-product-design-router`.
- Mini program route: `miniapp-product-router` for WeChat runtime, stack choice, cloud database, backend/admin, login, payment, upload, tabBar, subpackages, DevTools, preview, upload, and release review.
- Visual craft specialists: `frontend-design`, `top-design`, or another narrow craft skill only when the current phase requires it.

## Durable Memory

Create durable memory only for projects that will be reused, handed off, launched, or iterated:

- `DESIGN.md` for product facts, brand direction, UI decisions, rejected paths, latest visual artifact.
- `PROJECT_MANIFEST.json` for route, stack, artifacts, source repos, gates, verification records, and not-done items.

## Source Application

- Use `references/skill-discovery.md` when the user asks whether top GitHub skills/sources are really used.
- A source is not "used" because it is listed. It must change a route, field, scaffold artifact, validation gate, implementation artifact, or verification record.
- Record applied sources in `source_repositories` and `source_application_records`.

## Website Image2 / Asset Boundary

- If website-family project mentions Image2, RunningHub, PSD-style screens, Figma/Pixso exports, screenshot-style UI, or visual references, route through `website-product-router` `references/image2-website-asset-route.md`.
- Website runtime UI must be framework-first: real HTML/React/Vue/Astro/Framer components with real navigation, forms, cards, pricing, dashboards, admin controls, and browser verification.
- Generated visual assets are allowed only in bounded slots such as hero, section art, product image, brand visual, benefit icon, empty state, OG image, or share poster.
- Do not accept full-page generated website screenshots plus transparent hotspots as production website UI.

## Mini Program Image2 Boundary

- If `project_type` is `mini_program` and the user mentions Image2, RunningHub, PSD-style screens, Figma/Pixso exports, screenshot-style UI, or a visual reference, route to `miniapp-product-router` and `references/image2-miniapp-asset-route.md`.
- Do not treat Image2 ideal images as final mini program runtime specs.
- Do not accept full-screen screenshot UI plus transparent hotspots as a production mini program path.
- In mini programs, generated visual assets must become bounded assets inside framework-first WXML/WXSS or stack-native components.

## Output Contract

For a new project:

```text
Project type:
Best route:
First artifact:
Design subroute:
Implementation route:
Durable memory:
Source proof:
Quality gate:
Next action:
```

For execution:

```text
Route:
Skills used:
Quality verticals:
Files/artifacts:
Verification:
Not done:
```

## Hard Rules

- Chinese display name: `网站小程序总路由`; skill name: `web-miniapp-product-router`.
- `website-product-router` is required for website-family production work.
- `website-quality-router` is required when the user asks for visible website quality improvement, aesthetic/frontend/UX issue finding, CRO/SEO/analytics/accessibility/performance quality, or complains previous changes had no visible value.
- `frontend-product-design-router` is required for design, tool, Figma/Framer/Pixso/Motiff/Image2, and aesthetic decisions.
- `miniapp-product-router` is required for production WeChat mini program work.
- Do not skip idea work and go directly to coding when product goal, target user, or platform is unclear.
- Do not treat Image2 ideal images as final design specs.
- Do not claim mini program completion from a web prototype or browser preview.
- For recurring projects, update `DESIGN.md` and `PROJECT_MANIFEST.json`; do not rely on chat memory.
- Do not mark manifest gates `pass` unless validation evidence exists.
- Do not claim top GitHub sources were used without source application records or concrete artifacts.
- Do not report website quality improvement as a broad skill list; route through `website-quality-router` and name active verticals.
- After editing skill workflow files, run `post-coding-review` before reporting completion.
