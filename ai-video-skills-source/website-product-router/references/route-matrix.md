# Website Route Matrix

| Need | Best Route | Avoid |
| --- | --- | --- |
| Live marketing page today, non-technical editing | Framer | Figma-first process unless handoff is needed |
| Code-owned production website or app | Next.js | Framer when app logic or custom backend is required |
| Content-heavy simple site | Static site / Astro / Vite / 11ty | Heavy app stack without need |
| Existing project redesign | Existing repo route | New scaffold before repository inspection |
| Design-source fidelity | Figma-to-code | Screenshot guessing without layer/token inspection |
| SaaS dashboard dense app UI | Next.js + shadcn/ui where repo-compatible | Marketing-template composition |
| Conversion campaign | Framer or Next.js + CRO/analytics | Pretty page without event/form verification |
| Multi-language public site | Next.js/Astro with i18n plan | Hard-coded copy and untranslated metadata |
| Content-managed site | Existing CMS/source route or static content collections | Manual content edits that cannot be maintained |
| Form/upload/onboarding-heavy flow | Code-owned route with validation/security plan | Static page with unverified destination |
| Performance-sensitive public launch | Route with performance budget and Lighthouse/web-vitals evidence | Build success as launch proof |
| Visible website quality audit or no-visible-change complaint | `website-quality-router` vertical routing | Calling many overlapping design/frontend/UX skills without browser evidence |

## Required Route Decision

Record in `PROJECT_MANIFEST.json`:

- `route.implementation_route`
- `route.quality_router` when visible website quality work is requested
- `website.quality_verticals`
- `website.website_kind`
- `website.runtime`
- `website.source_of_truth`
- `website.primary_conversion`
- `website.performance_budget`
- `deployment.provider` and preview/production URL when known
- `seo` metadata fields for public pages
- `analytics.events` when measurement matters
- `not_done` for intentionally deferred verification
