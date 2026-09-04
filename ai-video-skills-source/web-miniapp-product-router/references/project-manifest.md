# Project Manifest

Use `PROJECT_MANIFEST.json` to track project route and status. Keep it small enough to maintain, but hard enough that another thread can resume production without guessing the latest artifact.

## When Required

- Multi-step website or mini program project.
- Separate strategy, design, implementation, verification, launch, and iteration phases.
- User will come back later and expect continuity.
- Generated artifacts need exact latest/current selection.
- GitHub/official sources are used and must be proven, not merely cited.

## Core Schema Areas

- `route`: top router, website router, quality router, design router, implementation route, source of truth.
- `source_repositories`: GitHub/official/source repos selected, locked, and intended use.
- `source_application_records`: proof that a source changed a route, field, scaffold, implementation, or verification artifact.
- `website`: website kind/runtime plus quality verticals, conversion path, accessibility, performance, generated assets, forms, i18n, security, content/CMS, database, backend API, admin, component system, CI.
- `miniapp`: appid, stack, component system, pages, tabbar, subpackages, legal domains, backend API, WeChat Pay, cloud database, admin, privacy, generated assets, preview/upload/review state.
- `deployment`: provider, preview/production URL, domain, build command, output directory, env vars.
- `seo`: title, description, canonical, OG image, sitemap, robots, schema.
- `analytics`: provider, measurement id, events, event taxonomy, verified flag.
- `artifacts`: design file, code root, screenshots, latest verified artifact, hashes.
- `verification_records`: evidence records. Gates pass only from records, not intent.
- `quality_gates`: production readiness gates.
- `not_done`: explicit deferred or blocked checks.

## Website Quality Manifest Rules

- If `project_type` is `website`, `h5`, `web_app`, `dashboard`, `portfolio`, or `landing_page`, set `route.website_router` to `website-product-router`.
- If visible website quality work is requested, set `route.quality_router` to `website-quality-router` and record active website verticals in `website.quality_verticals`.
- `website_quality_gate` can pass only when `verification_records` includes website quality audit or browser/screenshot evidence.
- `playwright_visual_gate` can pass only when desktop/mobile screenshots or a Playwright visual check are recorded.
- `responsive_gate` should have both desktop and mobile evidence unless explicitly `not_applicable`.
- Do not mark aesthetic, visual hierarchy, UX flow, CRO, SEO, analytics, accessibility, performance, observability, forms, i18n, security, content, component regression, CI, deployment gates `pass` from intent alone.
- A gate can be `not_applicable` only with a reason in `verification_records` or `not_done`.

- Website runtime UI must be framework-first. If generated visuals are used, record `website.image_asset_policy.framework_first_ui: true`, `website.image_asset_policy.fullscreen_screenshot_ui: false`, and list each bounded image in `website.generated_assets`.
- Website generated assets may land in hero, section art, product image, brand visual, benefit icon, empty state, OG image, or share poster slots. Do not ship a full-page generated screenshot with invisible hotspots as production UI.
- Database-backed websites must record `website.database.provider`, `url_env`, `tables`, migrations/security notes, and pass `database_gate` only with schema/security evidence.
- Backend/API work must record `website.backend_api` routes, auth boundary, upload/payment endpoints when relevant, and pass `backend_api_gate` only with API smoke evidence.
- Admin work must record `website.admin.required`, route or URL, and smoke evidence before `admin_gate` can pass.

## Mini Program Manifest Rules

- If `project_type` is `mini_program`, `route.specialist_router` should be `miniapp-product-router`.
- If `project_type` is `mini_program`, `route.implementation_route` must be `wechat_native`, `taro`, or `uni_app`.
- `miniapp.stack` must match implementation route.
- `miniapp.component_system` should record native components, WeUI, TDesign, Vant Weapp, NutUI, or stack-native components.
- `miniapp.pages` must include the main package page path.
- `miniapp.tabbar_pages` must be a subset of `miniapp.pages`.
- `miniapp.subpackages` must record root and page list when subpackages are used.
- `miniapp.image2_asset_policy.framework_first_ui` must be true when generated visual assets are used.
- `miniapp.image2_asset_policy.fullscreen_screenshot_ui` must be false.
- `miniapp.generated_assets` must list generated assets with target/path/channel/log when used.
- Cloud database work must record provider/env, collections, cloud functions, and security/permission notes.
- Admin work must record admin route or URL and smoke test evidence.
- Payment work must record backend order creation, payment notify URL, merchant ID, and test plan.
- Upload work must record upload domain, backend upload endpoint, cloud storage, or object storage target.
- Launch work must record DevTools/real-device/experience-version/upload evidence.
- Web `preview_url` does not prove mini program readiness.

## Source Application Rules

- `source_application_gate` can pass only when `source_application_records` exists.
- `source_repositories.status: applied` should include `locked_ref` and `used_for`.
- `guchengwuyue/yshop-drink` or any other template/base repo must be locked before reuse and must not ship demo brand/AppID/domain/secrets.

## General Rules

- Update manifest at phase boundaries, not after tiny edits.
- Never mark `launched` unless launch path was actually verified.
- Never mark gates `pass` from visual impression alone.
- If latest-file selection matters, store exact artifact paths in `artifacts`.
- Append meaningful route changes to `decision_history`.
