# Next.js Production

Use Next.js for code-owned public sites, SaaS/product websites, docs, dashboards, and web apps.

## Required Decisions

- App Router or existing repo route convention.
- Package manager and run/build commands.
- Styling system and component library.
- Data/auth/API needs.
- Deployment provider.

## Required Public-Site Checks

- `metadata` title and description.
- Canonical or route-level URL plan.
- Open Graph image or explicit not-done note.
- `sitemap` and `robots` when public launch matters.
- Structured data/schema only when accurate and useful.
- Accessibility path: keyboard focus, labels, alt text, axe/pa11y when feasible.
- Performance budget: LCP, INP, CLS, JS/image weight, dynamic imports where relevant.
- Observability for app logic: error monitoring, release/environment, source-map/debug path.
- Forms: client state plus schema/server validation and useful error states.
- i18n when relevant: locale routes and localized metadata/social tags.
- 404/not-found handling when route set is non-trivial.

## Verification

- Install/build command appropriate to repo.
- Lint/test when available and relevant.
- Browser smoke via Playwright for desktop and mobile.
- Console error check.
- Form, navigation, and primary CTA check.
- Lighthouse/web-vitals or explicit not-done reason for public launch.
- Record screenshots and exact preview URL in manifest.
