---
name: website-quality-router
description: name: website-quality-router
---

---
name: website-quality-router
description: Website quality vertical router for auditing and improving real websites, landing pages, web apps, dashboards, portfolios, existing sites. Use when users ask to find/fix website aesthetic, frontend, UX, SEO, accessibility, performance, analytics, CRO, responsive, Playwright verification, launch-readiness, "no visible change" problems; routes each vertical to one champion skill plus at most one complement and requires browser evidence.
---

# Website Quality Router

Use after `website-product-router` selects a website-family route, or directly when the user complains about website quality. This skill prevents vague "use many skills" behavior: classify problem verticals, choose the smallest authoritative skill stack, make visible changes, and verify in a real browser.

## Workflow

1. Establish evidence: distinguish the active online version, any user-approved surface, and the local candidate before inspecting repo/path, runnable URL, current desktop/mobile screenshots, page goal, and target user action.
2. Select verticals: choose at most 3 active verticals in one turn unless the user explicitly asks for a full audit.
3. Route each vertical: use one primary champion skill and at most one complement from `references/vertical-skill-map.md`.
4. Produce concrete findings or edits: every finding maps to visible UI, content, metadata, tracking, runtime behavior, or a verification artifact.
5. Verify with Playwright/browser checks when a runnable site exists; record screenshots and evidence in `PROJECT_MANIFEST.json` when the project has one.
6. After code, skill, script, or workflow edits, run `post-coding-review` before reporting completion.

## Vertical Routing

- Route/stack decision: `website-product-router` primary; `frontend-product-design-router` complement only for source-of-truth/tool choice.
- Existing project redesign: `redesign-existing-projects` primary; `website-product-router` complement for route boundaries.
- Aesthetic/anti-slop: `design-taste-frontend` primary; `top-design` only for immersive brand/expression work.
- Visual hierarchy/component polish: `refactoring-ui` primary; `web-typography` only when type system is the bottleneck.
- UX/task flow: `ux-heuristics` primary; `ux-writing` only for labels, errors, empty states, or microcopy.
- SEO/launch metadata: keep `website-quality-router` as the quality owner and use `website-metadata-share-audit` as the single explicit candidate vertical for canonical, robots/noindex, Open Graph, share previews, and public/private indexing boundaries. Use `programmatic-seo` only for scalable page systems or content clusters. Until real URL evidence supports promotion, do not invoke the metadata candidate implicitly or stack it with another SEO vertical.
- Accessibility: `ux-heuristics` primary; `playwright` complement for browser keyboard and automated a11y evidence where feasible.
- Performance/Core Web Vitals: `website-product-router` primary; `playwright` complement for Lighthouse/browser evidence.
- Analytics: `analytics` primary; `cro` complement only when conversion interpretation is part of the task.
- CRO/experimentation: `cro` primary; `analytics` complement when event firing or experiment measurement matters.
- Observability/security/forms: use the narrow specialist (`security-best-practices`, `ux-heuristics`, or `website-product-router`) according to the evidence needed.
- Browser verification: `playwright` primary; Browser plugin only for in-app browser/local visual confirmation.
- Existing-site candidate/release: this skill owns the baseline-to-candidate discipline below; `playwright` complements reachable URL, visual, console, and interaction evidence.

## Quality Gates

Use `references/gates-and-evidence.md` before marking website quality pass. Passing a gate requires evidence, not confidence:

- Core visible gates: `website_quality_gate`, `aesthetic_gate`, `visual_hierarchy_gate`, `ux_flow_gate`, `responsive_gate`, `function_gate`, `playwright_visual_gate`.
- Public launch gates: `seo_gate`, `accessibility_gate`, `performance_gate`, `security_gate`, `deployment_gate`, `ci_gate`.
- Growth/product gates: `analytics_gate`, `cro_gate`, `experimentation_gate`, `observability_gate`.
- Production surface gates: `forms_gate`, `i18n_gate`, `content_gate`, `component_regression_gate`.

## Existing-Site Candidate Discipline

Apply this route when changing a live existing website, especially after a user-approved surface exists or a local preview/source may have diverged from production.

1. Capture or verify a read-only online baseline from the active deployment. Record the release URL or label, retrieval time, relevant asset hashes, and the same project/data state that will be used for comparison. An arbitrary local workspace or preview server is not an online baseline.
2. Keep four states separate: online baseline, approved snapshot, one bounded candidate, and archive. A candidate declares its parent baseline, page/function scope, allowed files, and protected approved surfaces. Never layer several old candidates into one preview.
3. Verify the candidate against that baseline with the same data at desktop and 390px. Check the requested interaction and every protected surface affected by shared CSS, JavaScript, routing, or cache changes.
4. For a requested visual or interaction redesign, provide the candidate for user review before production promotion. Fix regressions in the candidate; do not publish a speculative replacement of an approved surface.
5. Publish one complete, versioned package from the accepted candidate. Do not live-patch unrelated files from different releases. Read back online HTML and versioned assets after switching, verify their hashes identify the published package, then save that package as the next online baseline.

Use only the parts proportional to the change. Do not introduce staging fleets, canaries, feature flags, or approval ceremonies merely for a small website edit unless current evidence or the user requires them.

## Output Contract

```text
Quality route:
Source evidence:
Active verticals:
Primary skills:
Findings or changes:
Verification:
Not verified:
Next action:
```

## Hard Rules

- Do not call several overlapping design skills for the same vertical; pick a champion skill and explain a complement only if it adds a distinct role.
- For a UI critique, require a reproducible browser observation or exact source/DOM evidence for every finding. Do not turn aesthetic preference into a defect; keep the result to the three highest-signal findings, or explicitly report that no supported finding was observed.
- Do not report website improvement from manifest edits alone; the user must be able to see a difference or see concrete evidence why no code change was needed.
- Do not mark gates `pass` without verification records and screenshot/browser evidence where applicable.
- Do not skip mobile review for public websites, landing pages, portfolios, dashboards, or web apps.
- Do not label a local preview as production, an online mirror, or an approved version without exact baseline evidence. If the active online version cannot be identified, stop before creating a candidate instead of reusing an arbitrary legacy workspace.
- Do not publish an existing-site candidate as a collection of file overlays. The released HTML, CSS, JavaScript, and referenced assets must all identify one complete versioned package.
- Do not use Image2/Figma/Framer concepts as proof of implemented frontend quality.
- Do not spend paid or external generation/deployment capability unless the user explicitly approves that action.
