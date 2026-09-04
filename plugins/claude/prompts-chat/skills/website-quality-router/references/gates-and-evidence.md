# Gates And Evidence

Use these gates when auditing or improving a website-family project. A gate can be `pass` only when evidence exists in the current run or `PROJECT_MANIFEST.json`.

| Gate | Minimum Evidence |
| --- | --- |
| `website_quality_gate` | Active verticals, selected skills, findings or changed files, and verification record |
| `aesthetic_gate` | Desktop and mobile screenshots plus anti-slop notes |
| `visual_hierarchy_gate` | Before/after or inspected screenshot notes covering hierarchy, spacing, typography, density, and component states |
| `ux_flow_gate` | Primary user task path checked, including labels, CTAs, empty/loading/error states where relevant |
| `responsive_gate` | Desktop and mobile viewport checks; no critical overlap, clipping, or hidden primary action |
| `function_gate` | Navigation, CTA, form/upload/action path works, or explicit `not_applicable` reason |
| `seo_gate` | Title, description, canonical, robots/sitemap, OG/social metadata, schema checked for public pages |
| `accessibility_gate` | Keyboard path, focus order, visible labels, contrast notes, and axe-core/pa11y result when feasible |
| `performance_gate` | Lighthouse/Core Web Vitals or budget check covering LCP, INP, CLS, JS/image weight where feasible |
| `analytics_gate` | Provider, event taxonomy, destinations, and firing path checked when analytics matter |
| `cro_gate` | Offer clarity, CTA, trust, friction, objections, and measurement checked |
| `experimentation_gate` | Hypothesis, variant, success metric, guardrail metric, and owner or explicit not-applicable reason |
| `observability_gate` | Error monitoring provider, release/environment, source maps or equivalent debug path checked for production apps |
| `forms_gate` | Client and server validation, useful error states, spam/abuse guard, destination persistence checked |
| `i18n_gate` | Locale routes, translated UI, metadata/social tags, language switch behavior checked |
| `security_gate` | OWASP-style review of headers/CSP, secrets/env exposure, cookies/consent, user input, third-party scripts |
| `content_gate` | Content source ownership, CMS/static content update path, images/video loading and alt/media strategy |
| `component_regression_gate` | Storybook/component isolation or visual regression evidence for reused component systems |
| `ci_gate` | Build, lint, typecheck, tests, preview deploy command/status recorded |
| `deployment_gate` | For a new site: preview or production URL reachable, HTTPS/domain/envs checked, rollback or not-done items recorded. For an existing live site: verified online baseline, single-scope candidate, baseline/candidate desktop + 390px comparison, complete package identity, and online HTML/assets readback after promotion. |
| `playwright_visual_gate` | Playwright/browser screenshots, console/runtime check, and interaction note |

## Verification Record Types

Prefer clear record types in `PROJECT_MANIFEST.json`:

- `website_quality_audit`
- `desktop_screenshot`
- `mobile_screenshot`
- `playwright_visual_check`
- `primary_flow_check`
- `seo_metadata_check`
- `accessibility_audit`
- `axe_check`
- `pa11y_check`
- `lighthouse_audit`
- `core_web_vitals_check`
- `performance_budget_check`
- `analytics_event_check`
- `cro_review`
- `experiment_check`
- `monitoring_check`
- `sentry_check`
- `form_validation_check`
- `i18n_check`
- `security_review`
- `content_asset_check`
- `storybook_check`
- `visual_regression_check`
- `ci_check`
- `deployment_check`
- `reachable_url_check`
- `online_baseline_capture`
- `candidate_scope_check`
- `baseline_candidate_comparison`
- `online_release_readback`

## Fail Fast

- If a gate is marked `pass` without matching record evidence, downgrade it to `pending` or `fail`.
- If a vertical cannot be verified because the site is not runnable, record `not_done` instead of claiming completion.
- If a check is intentionally irrelevant, use `not_applicable` with a reason in `verification_records` or `not_done`.
- If a local candidate cannot be traced to an active online baseline, do not use it for an existing-site release; capture the baseline first.
