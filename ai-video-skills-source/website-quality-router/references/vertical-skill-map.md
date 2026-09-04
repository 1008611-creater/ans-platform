# Vertical Skill Map

Use this table to keep website quality work narrow and authoritative. Pick one primary skill per active vertical; add a complement only when it covers a different job.

| Vertical | Primary Skill | Optional Complement | Top Ecosystem Pattern | Use When | Reject |
| --- | --- | --- | --- | --- | --- |
| Website route stack | `website-product-router` | `frontend-product-design-router` | Vercel/Next.js, Framer, Astro, Vite route fit | Framer/Next.js/static/existing repo/Figma-to-code/shadcn choice | Choosing a new framework before inspecting an existing repo |
| Existing project redesign | `redesign-existing-projects` | `website-product-router` | repo-first migration and browser evidence | User gives existing site/app wants it upgraded | Rebuilding from scratch without evidence |
| Anti-slop aesthetic | `design-taste-frontend` | `top-design` | DESIGN.md memory, frontend-design-principles | Page feels generic, AI-made, templated, low-end | Generic purple SaaS gradients, decorative blobs, repeated soft cards |
| Visual hierarchy | `refactoring-ui` | `web-typography` | hierarchy, spacing, contrast, density checks | Spacing, contrast, density, typography, card hierarchy, component polish | Treating content rewrite as a design fix |
| UX/task flow | `ux-heuristics` | `ux-writing` | task path, states, error recovery | Users are confused, steps unclear, states missing, forms hard to complete | Only making it prettier |
| Source design workflow | `frontend-product-design-router` | `figma-use`, `figma-implement-design` | Figma MCP structured design context | User has Figma/Pixso/Motiff/Framer/code source truth question | Implementing screenshot guesses when source exists |
| shadcn/ui boundary | `website-product-router` | `refactoring-ui` | shadcn/ui component ownership, not theme shortcut | SaaS/dashboard/admin/form-heavy app UI | Using shadcn as brand identity for marketing pages |
| SEO/public metadata | `website-product-router` | `programmatic-seo` | Next.js metadata, sitemap, robots, schema-dts, next-sitemap | Public launch, metadata, robots, sitemap, scalable SEO pages | Calling SEO done without inspecting URL evidence |
| Accessibility | `ux-heuristics` | `playwright` | axe-core, pa11y, keyboard/focus/contrast audits | Public site, form, dashboard, modal, upload, checkout, navigation | Visual-only review without keyboard and automated a11y check where feasible |
| Performance/Core Web Vitals | `website-product-router` | `playwright` | Lighthouse, Lighthouse CI, web-vitals, bundle budgets | Public site feels slow, launch readiness, SEO-sensitive page | Only checking local build success |
| Analytics/event taxonomy | `analytics` | `cro` | PostHog/Plausible/Matomo event plans and destination checks | Need measure funnels, uploads, forms, CTA clicks, activation | Adding tags without event names, destinations, and firing evidence |
| CRO/experimentation | `cro` | `analytics` | GrowthBook/PostHog experiments, hypothesis to metric | Landing page, lead form, checkout, activation funnel | Pretty redesign without measurement or conversion path |
| Observability/error monitoring | `website-product-router` | `security-best-practices` | Sentry JS/Next.js SDK, release/source-map discipline | Production web app, forms, auth, payments, dashboard | Launching app logic without runtime error visibility |
| Forms and data validation | `ux-heuristics` | `security-best-practices` | react-hook-form, Zod, server validation | Lead forms, uploads, onboarding, admin CRUD, payment inputs | Client-only validation or hidden failure states |
| Internationalization/localization | `ux-writing` | `website-product-router` | next-intl, locale routing, translated metadata | Multi-language public site or region-specific funnel | Hard-coded strings and untranslated SEO/social metadata |
| Security/privacy basics | `security-best-practices` | `website-product-router` | OWASP cheat sheets, CSP, env leakage, cookie/consent checks | Forms, auth, user data, analytics, embedded scripts, deploy envs | Treating visual launch as security ready |
| Content/CMS/assets | `site-architecture` | `website-product-router` | Astro/content collections, CMS/source ownership, optimized images/video | Content-heavy sites, blogs, portfolios, media libraries | Manual one-off content that cannot be updated |
| Component visual regression | `refactoring-ui` | `playwright` | Storybook/Chromatic-style isolated component checks | Design system, repeated UI, shadcn-heavy app, dashboard states | Manual page screenshots only when component reuse is the risk |
| Browser verification | `playwright` | Browser plugin | Playwright desktop/mobile screenshots, console checks, interactions | Need proof visible change works in browser | Manifest-only or static code review only |
| CI/CD and deployment readiness | `website-product-router` | `playwright` | build/lint/typecheck/test/preview, Lighthouse CI, reachable URL | Build preview, domain, HTTPS, SEO/social metadata, forms, analytics | Claiming launched without reachable URL evidence |

## Routing Budget

- Tiny check: 1 vertical, 1 skill.
- Normal improvement: 2-3 verticals, 2-3 primary skills.
- Full audit: all relevant verticals, grouped into findings and phased fixes.
- Implementation turn: prefer fewer verticals and ship visible improvements with verification.
