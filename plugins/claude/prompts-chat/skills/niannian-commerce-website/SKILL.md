---
name: niannian-commerce-website
description: name: niannian-commerce-website
---

---
name: niannian-commerce-website
description: "Build, repair, and evolve the Niannian AI websites around their real user paths. Use for ai.cauai.fun main-site workbench, studio, Nomi canvas, projects, brand, and approved surfaces; use for dh.cauai.fun login, TZB, projects, materials, templates, six-step workbench, video delivery, pricing, and billing. Keep the two product boundaries separate."
---

# 念念网站产品边界

Treat the selected Niannian domain as a production workflow, not a collection of pages. `ai.cauai.fun` is the main Niannian AI website; `dh.cauai.fun` is the separate commerce workflow. The user-visible result is a normal user reaching the requested website surface without unexpected logout, broken media, duplicate charges, or a regressed approved workflow.

## Product Boundary

### Main site: `ai.cauai.fun`

Use the canonical source `E:\codex\aisp\aidaihuo\niannian-ai-canonical-local` and the Haika production path. The approved homepage, shared header, workbench, production stages, and brand assets are protected surfaces. The Nomi-derived browser canvas is the `/studio/` product surface; do not replace it with the retired self-built `#canvas` editor, a localhost route, or Electron. The main site has its own projects, APIs, assets, and release packages.

When a main-site change is requested, route only the named surface. Start from the exact online baseline, preserve all user-approved surfaces, and compare the same project at desktop and 390px before promotion. Generic visual redesign is exploratory only until the user explicitly approves it; it cannot rewrite an approved page.

For Step04 delivery, `ready_pre_video` or a nonzero task count is not proof of a closed production package. Read the exact project `employee_returns/step04` files, match `project_id` and `source_sha256`, reconcile asset/first-frame/storyboard counts, and compare every referenced file hash before any video task is created. Until that closure readback passes, keep `videoTasksCreated=0` and report the project as stopped before video.

### Commerce site: `dh.cauai.fun`

Apply the commerce contract below only when the target domain is `https://dh.cauai.fun` and the requested product is the Niannian commerce workflow. Before reading, changing, building, or publishing, prove that the selected source root belongs to that deployed domain.

Do not use `ai.cauai.fun`, `sd2.cauai.fun`, `niannian-ai-canonical-local`, or `niannian-ai-web` as a substitute source, preview, baseline, or deployment target for this commerce product. They are separate products. If the target is not `dh.cauai.fun`, stop this commerce branch and use the main-site branch above or another product-specific route.

## Product Contract

Keep these paths coherent whenever a change touches them:

1. Login -> TZB balance -> project creation -> material upload.
2. Template selection or personal template -> matching `MOTION` media is bound to the project.
3. Six-step workbench -> person, product, reference video, background, first frame, final video.
4. Assistant -> references and edits are explicit; provider submission and charges happen only after the approved confirmation boundary.
5. Result -> playable video, durable download, task state, price, and billing agree.

Preserve the existing backend as owner of users, permissions, TZB, projects, tasks, providers, media records, object storage, and billing. The frontend owns only presentation, interaction, and request orchestration.

## Route Work Correctly

- For every change to a live surface, invoke `$niannian-commerce-release-integrity` first. It owns source identity, candidate isolation, release composition, cache identity, browser evidence, and rollback proof.
- For `edit.cauai.fun`, route the editor feature, brand, AI-provider, export, and deployment work to `$niannian-zhijian`. Keep it separate from the main-site canvas and do not replace the editor with a custom wrapper page.
- Use `website-product-router` for framework, page, backend, or deployment choices not specific to this product.
- Use `website-quality-router` for a bounded visual, responsive, performance, accessibility, or interaction problem. Select one champion vertical, not several overlapping design skills.
- Use `niannian-ai-canvas` only for a node/canvas production surface. Do not turn the normal six-step workbench into a second workflow engine.

For the main site, `$niannian-commerce-website` is the product-boundary owner and `$niannian-commerce-release-integrity` is the release owner. Do not route a main-site UI request directly to `design-taste-frontend`, `top-design`, or `redesign-existing-projects`; those are exploratory/supporting routes and cannot select the source, baseline, or release.

## Implement in User Order

1. Identify the affected path, its protected approved surfaces, and whether it can touch money, provider submission, private media, or authentication.
2. Inspect existing contracts and real data before changing UI. `READY` database status is not proof that an object exists or can decode.
3. Make the smallest change that completes the requested path. Keep display-only copy, event dispatch, and state transitions separate so removing guidance cannot remove an action.
4. Verify the changed path in a real browser using the same project and account state. Test desktop and 390px whenever layout, shared CSS, JavaScript, routing, or media changes.
5. Report the usable result, the exact user entry point, and any path not verified. Do not treat a build, HTTP 200, static assertion, or provider task ID as delivery.

## Product Invariants

- Bind a template's own media ID, never a shared default, and verify the opened project shows that media.
- On a transient auth, media, or network failure, retain established session state. Clear private client state only after explicit logout or a confirmed `401`.
- Use one client runtime as the owner of each page region. Do not let legacy SSR/client handlers and a compatibility runtime rewrite the same DOM.
- Use durable media IDs in projects and task records. Resolve protected playback URLs at display time; do not persist expiring signed URLs as project truth.
- Reject impossible user actions before a paid/provider boundary. Do not generate, upload, recharge, or change a wallet merely to make a verification path appear complete.

## Completion

Call a commerce change complete only when the requested path works from its actual user entry point and all protected surfaces remain coherent. When a live release is involved, completion additionally requires the release-integrity skill's online readback.
