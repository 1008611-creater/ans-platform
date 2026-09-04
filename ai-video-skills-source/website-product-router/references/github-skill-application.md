# GitHub Skill Application

Use this reference to ensure collected top GitHub and official ecosystem patterns become production behavior, not a source list.

## Application Principle

A source is applied only when it changes at least one concrete artifact:

- route or stack decision;
- component/design-system decision;
- manifest field;
- scaffolded directory or file;
- validation rule or gate;
- implementation artifact;
- browser, deployment, SEO, analytics, form, API, admin, or performance verification record.

If none changed, the source was only referenced.

## Required Proof Fields

Record selected sources in `PROJECT_MANIFEST.json`:

```json
{
  "source_repositories": [
    {
      "name": "vercel/next.js",
      "url": "https://github.com/vercel/next.js",
      "locked_ref": "",
      "used_for": ["nextjs_app_router", "metadata", "deployment"],
      "status": "reference",
      "local_path": ""
    }
  ],
  "source_application_records": [
    {
      "source": "vercel/next.js",
      "applied_as": "routing_rule",
      "changed": ["route.implementation_route", "seo", "deployment"],
      "evidence": "docs/verification/nextjs-route.md"
    }
  ]
}
```

Set `quality_gates.source_application_gate` to `pass` only when these records exist and the selected source changed a real artifact.

## Applied Sources

| Source | Production rule in router | Where it lands |
| --- | --- | --- |
| `VoltAgent/awesome-design-md` | Long-lived website work keeps durable design memory instead of relying on chat memory. | `DESIGN.md`, project manifest, scaffold templates. |
| `VoltAgent/awesome-agent-skills` | Split router concerns into specialist skills instead of one swollen universal workflow. | `web-miniapp-product-router` -> `website-product-router` -> `website-quality-router`. |
| `vercel-labs/agent-skills` | Web work ends with concrete build, preview, deploy, SEO, metadata, and verification evidence. | Manifest gates, scaffold scripts, generated artifacts, verification records. |
| `joshuadavidthomas/frontend-design-principles` | Design quality is judged through hierarchy, spacing, typography, responsive behavior, non-generic craft, and interaction usefulness. | `website-quality-router`, `ui-quality-route.md`, aesthetic gate, Playwright visual checks. |
| Figma MCP / Dev Mode ecosystem | Figma context is input for implementation, not proof. Final code must be verified in browser screenshots. | `figma-to-website.md`, `frontend-product-design-router`, `playwright-website-verification.md`. |
| `vercel/next.js` | Next.js app sites need App Router conventions, metadata, server/client boundaries, build checks, and deployment evidence. | `nextjs-production.md`, `route.implementation_route`, SEO/deployment gates. |
| `withastro/astro`, Vite, 11ty ecosystem | Static/content-heavy sites should avoid heavy app stacks when low interactivity fits. | `static-site-production.md`, content route, build artifacts. |
| shadcn/ui ecosystem | shadcn/ui is component infrastructure for SaaS/app/admin flows, not a generic brand style. | `shadcn-ui-boundaries.md`, `website.component_system`. |
| Playwright ecosystem | Visual/runnable proof requires desktop/mobile browser screenshots, console checks, and primary interaction checks. | `playwright-website-verification.md`, `artifacts.screenshots`, `playwright_visual_gate`. |
| Lighthouse / web-vitals ecosystem | Launch and SEO-sensitive sites need performance budgets beyond build success. | `performance_gate`, `website.performance_budget`. |
| axe-core / pa11y ecosystem | Accessibility is a first-class gate for public and form-heavy sites. | `accessibility_gate`, keyboard/focus/contrast evidence. |
| `storybookjs/storybook`, Chromatic ecosystem | Component systems and dashboards need isolated component state or visual-regression evidence when component reuse is risk. | `component_regression_gate`, `website.component_system`. |
| `posthog/posthog`, `plausible/analytics`, `matomo-org/matomo` | Analytics needs event taxonomy, destination, and firing proof; provider installation alone is not enough. | `analytics_gate`, `analytics.events`, verification records. |
| `growthbook/growthbook` | CRO experiments need hypothesis, variants, success metric, and guardrail, not just page copy changes. | `experimentation_gate`, `website.experimentation`. |
| `getsentry/sentry-javascript` | Production app logic needs runtime error visibility, releases/environments, and source-map/debug strategy. | `observability_gate`, `website.error_monitoring`. |
| `react-hook-form/react-hook-form`, `colinhacks/zod` | Forms need ergonomic client state plus schema/server validation and error-state evidence. | `forms_gate`, `website.forms`. |
| `amannn/next-intl`, i18next/Lingui ecosystem | International sites need locale routing plus translated UI metadata and social tags. | `i18n_gate`, `website.i18n`. |
| `OWASP/CheatSheetSeries` | Website launch checks need security/privacy basics: CSP, secrets/envs, cookies/consent, user input, third-party scripts. | `security_gate`, `website.security`, deployment checklist. |
| `payloadcms/payload`, `tinacms/tinacms`, Sanity ecosystem | Content-heavy sites need content ownership/update path and asset strategy. | `content_gate`, `website.content`. |
| Supabase/Firebase/Prisma/Postgres ecosystem | Data-backed websites need schema/resources, env vars, auth boundary, and server-owned mutations. | `website.database`, `website.backend_api`, `backend-database-admin-route.md`. |

## Concrete Use Rules

- Record concrete outcomes in `PROJECT_MANIFEST.json`: route, stack, source repos, artifacts, gates, verification records.
- Source-driven claims need `source_application_records`.
- If a source is a template/base repo, lock the ref and record replacement of demo brand/content/domain/secrets.
- Do not report a source as applied from reading alone.
