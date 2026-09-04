---
name: niannian-ai-canvas
description: name: niannian-ai-canvas
---

---
name: niannian-ai-canvas
description: Build, evaluate, integrate, and quality-check an AI media infinite canvas for Niannian AI. Use when the task involves node-based image or video generation, storyboard canvases, RunningHub/TapNow/ComfyUI-like workflows, Mayi Canvas, Daxiong Canvas, media nodes, provider execution, canvas persistence, or visual workflow integration into ai.cauai.fun.
---

# Niannian AI Video Canvas

Use this skill for an AI media canvas, not a generic whiteboard. The canvas is a project-scoped control surface that connects text, characters, scenes, reference media, image generation, video generation, review, and delivery while the existing Niannian project, task, provider, and asset services remain authoritative.

## Source And Delivery Boundary

The original Nomi browser application and the retired self-built `#canvas` editor are different products. Before implementation, identify the exact Nomi repository or local source, commit, shipped `LICENSE`, runtime route, and project-data contract. The verified Nomi-derived website surface is `https://ai.cauai.fun/studio/`; `http://127.0.0.1:3001/#/studio` is a development preview only and Electron is not a website delivery path.

This skill owns canvas interaction and integration facts only. It does not own the main-site release, homepage, header, logo, workbench information architecture, server deployment, or project-data migration. Hand the candidate to `$niannian-commerce-release-integrity` for source identity, package composition, cache identity, browser proof, and online readback. Never reintroduce the retired self-built `#canvas` route merely because its nodes or API are easier to test.

## Operating Rules

- Preserve the approved Niannian product surface. Add the canvas as a project workbench view or bounded module; do not replace the home page or established production stages without same-context desktop and 390px validation.
- Keep one production owner. The canvas owns layout, node interaction, edges, viewport, and user intent; the existing backend owns projects, tasks, providers, credits, permissions, media files, and delivery state.
- Treat third-party canvas applications as evidence and prototypes until source, license, build, data model, and provider boundary are verified.
- Never put API keys, session cookies, signed media URLs, or private user data into a skill, reference file, canvas JSON fixture, or prompt.
- Do not execute an unknown downloaded binary. Inspect archives and text first, then run only an isolated, reversible preview.

## Website Isolation And Release

Treat `https://ai.cauai.fun/studio/` as the sole production canvas surface. Do not create, reactivate, or describe a separate self-built `#canvas` node editor as the NianNian canvas. A same-site workbench entry must open this route and pass the same browser verification; a local Nomi preview is never evidence of public delivery.

- Keep the Nomi-derived canvas core responsible only for canvas interaction: graph state, nodes, edges, viewport, undo/redo, layout, and canvas-document migration. Put NianNian project, user, permission, task, provider, media, and delivery integration in a NianNian adapter layer with canvas-specific server routes.
- Develop canvas changes in a separate source candidate. Do not edit served static assets, use a local preview as a production source, or mix a canvas feature with unrelated homepage, workbench, director-desk, or production-stage changes.
- Start every production candidate from the exact current `ai.cauai.fun` release. Create one new versioned release, replace only `/studio/**` plus explicitly required canvas-only backend files, and preserve all protected non-canvas files. Do not overlay assets from multiple historical releases.
- Treat an upstream Nomi sync as its own candidate and release. Record the exact repository, commit, and shipped `LICENSE`; do not infer commercial rights from a release name or a marketing page. Resolve any license discrepancy before publicly distributing a newly synced upstream version.
- Keep canvas documents project-scoped and versioned. Persist stable project, task, and asset references on the NianNian server; use browser-local state only as a recovery cache. Provide an explicit migration for every persisted schema change.
- Before promotion, verify the real browser path: open `/studio/`, load a project-bound canvas, edit nodes and edges, reload to confirm persistence, submit a real or clearly labeled dry-run task, observe task state on its node, and open the existing review or delivery surface from a result node.
- Perform regression proof against the same online baseline at desktop and 390px: `/studio/` works, and the homepage, workbench, director desk, and protected production surfaces retain their structure, resources, and interactions. Record the parent baseline, changed paths, artifact hashes, public readback, and rollback release before claiming deployment complete.

## Workflow

### 1. Establish the real target

Classify the request before choosing a library:

- Creative media canvas: free placement of images, videos, prompts, references, and chat results.
- Executable workflow canvas: typed ports, dependency edges, queue execution, partial reruns, and output propagation.
- Storyboard canvas: shots, characters, scenes, first/last frames, candidates, and review states.
- ComfyUI bridge: a user-facing graph that submits an underlying ComfyUI workflow.

For Niannian AI video production, default to a hybrid media/workflow canvas with storyboard semantics. Do not expose raw model internals unless the user explicitly asks for an expert mode.

### 2. Verify an existing canvas candidate

For every candidate, check the official source or distribution page and record only evidence that changes the decision:

1. Source repository or package and last meaningful update.
2. License file and whether it permits the intended commercial distribution.
3. Runtime and framework: vanilla JavaScript, React, Vue, desktop, or server-coupled.
4. Canvas model: nodes, edges, freeform media, groups, subgraphs, typed ports, viewport, undo/redo.
5. Persistence: local-only JSON/IndexedDB versus server project storage.
6. Execution boundary: direct browser API calls, local proxy, ComfyUI API, or replaceable service adapter.
7. Media behavior: upload, preview, video playback, result history, and asset references.

Do not infer an open-source license from a README badge, a video description, or a third-party article when the repository has no license file or metadata.

### 3. Use the Mayi public build as a reference experiment

The current public-build candidate is `麻衣画布 V3.4.8公开版`, dated 2026-07-30. Load the supplied Baidu or Quark link in an isolated download/preview area. Read `references/mayi-public-v3.4.8.md` for the current source links and evidence ledger.

The experiment must answer:

- Does the package launch as a web app, a desktop app, or a single HTML file?
- Does it expose the desired media-node interaction: prompt, image, video, first/last frame, reference, preview, progress, and rerun?
- Can a canvas be exported/imported as structured JSON rather than only local opaque state?
- Which calls are browser-local and which can be replaced with Niannian APIs?
- What parts are reusable as interaction evidence, and what parts are coupled to its own providers or local proxy?
- What license or redistribution notice is actually present in the package?

Keep the extracted package outside the production repository unless the user explicitly asks for a source import. Do not copy its branding, credentials, provider session logic, or bundled third-party material into Niannian AI.

### 4. Design the Niannian canvas contract

Use project-scoped references instead of duplicating domain records:

```ts
type CanvasDocument = {
  version: 1
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  viewport: { x: number; y: number; zoom: number }
}

type CanvasNode = {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    projectId: string
    entityType: string
    entityId?: string
    taskId?: string
    assetIds?: string[]
    status?: string
    title?: string
  }
}
```

Use edge kinds such as `depends_on`, `derived_from`, `reference`, `approved_to`, and `variant_of`. Store asset IDs and task IDs, not video bytes or expiring URLs. Persist the document on the server with revision or optimistic concurrency; local storage may be a recovery cache only.

### 5. Integrate execution through Niannian

For each generation node:

1. Validate required inputs and typed media ports in the client.
2. Submit a Niannian task, never a provider secret from the browser.
3. Attach the returned task ID to the node.
4. Update `queued`, `running`, `succeeded`, `failed`, or `cancelled` from the existing task state route or event stream.
5. Attach durable asset IDs when output delivery is complete.
6. Allow opening the existing shot review or asset detail surface from the node.

For a multimodal generation node, keep the canvas capacity separate from provider readiness. The UI may expose the model's maximum typed slots, but submit only non-empty, project-authorized asset references required by one verified server-side channel. Omit every empty slot entirely—never send `0`, empty strings, placeholder URLs, or synthetic media. If the connected image/audio/video combination has no verified channel, reject it with a clear recoverable status; do not silently drop references or route it through a different model.

For billable canvas generation, use the Niannian server's `credits` ledger as the
only user-facing currency. Keep the provider as a server-side implementation
detail and never expose its key, URL, authorization header, or raw credential to
the browser. Follow this state order:

1. Create a generation intent without changing the user's balance.
2. Confirm the server-owned model readiness and credit price, then reserve the
   exact amount with an idempotency key bound to the project and task.
3. Keep the reservation while the provider task is accepted and running.
4. Settle the reservation only after the durable output asset is stored and
   attached to the task; release it on a definite failure.
5. Keep an unknown or timed-out provider outcome pending for reconciliation;
   do not retry it in a way that can create a second reservation or charge.

Do not create a canvas-only wallet, second billing queue, browser-side credit
mutation route, or provider proxy. The existing Niannian account, task, asset,
permission, and billing contracts remain authoritative.

For a browser-visible provider model status, do not infer readiness from a key
being present or a provider's model-list response alone. Keep credentials
server-side, make one minimal real request for each newly enabled model, and
verify that the response contains the promised durable output type before the
catalog reports `ready`. Record only model identity, outcome, and non-secret
verification evidence; do not retain credentials, provider response bodies, or
generated test media.

Use the existing provider/task/asset contracts wherever they already exist. Do not create a second queue, second task state machine, or second media storage system just for the canvas.

### 6. Validate the changed path

The minimum proof for a canvas change is:

- create a project-bound canvas;
- add a text or reference-media node;
- connect it to an image or video generation node;
- submit through the real Niannian task route or a clearly labeled dry run;
- observe task status return to the node;
- reload and confirm node positions, edges, viewport, task ID, and asset IDs persist;
- open the existing review/delivery surface from the result node;
- check the same state at normal desktop width and 390px without horizontal overflow.

For a bounded iframe or embedded workbench integration, validate the host boundary in the same pass: provide a parent-owned exit control that remains visible at 390px when the child keeps a desktop-oriented layout; use release-versioned CSS and JavaScript URLs and confirm the browser loaded the current versions; and keep the message contract limited to stable project references and presentation state, never secrets, cookies, signed URLs, or private project data. Treat source checks and HTTP 200 responses as insufficient until the real browser path proves the visible exit, loaded integration, and changed interaction.

Report what used the real route and what remained a mock or unverified experiment.

## Candidate Guidance

- Mayi/Tapnow-style app: best visual and interaction reference for a rapid prototype; the public author repository is `zhengxinlan1995-code/Tapnow-Studio--` and is GPL-3.0, so verify distribution obligations and replace local/provider coupling before production.
- Daxiong Canvas: the confirmed public repository `heyu1084916812/daxiong-canvas-plugins` is an empty, no-license self-use plugin repository; use Daxiong material as ComfyUI workflow/node evidence unless a complete authorized source package is provided.
- PinCanvas: a useful MIT-licensed starting point for a commercial React implementation; replace IndexedDB-only persistence and provider calls.
- TwitCanva: a strong Apache-2.0 product reference with media generation, storyboard, asset library, and typed connections; treat it as a full application, not a drop-in component.
- ComfyUI: use as an execution engine or expert workflow bridge; do not expose its raw graph to ordinary Niannian users by default.
- LiteGraph.js: use when preserving a vanilla JavaScript site matters more than ready-made media UI; expect to build most product behavior.
- tldraw: do not treat as a free production base; its production use requires a tldraw license key.

## Reference Navigation

- Read `references/mayi-public-v3.4.8.md` when trying or evaluating the supplied Mayi package.
- Add a second reference only when it contains durable, verified project knowledge that would otherwise be rediscovered.
