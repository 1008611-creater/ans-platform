# Champion Routes

Use this file to select a prompt route quickly. Prefer local skill evidence over generic internet formulas.

## Xiaohongshu Notes

Route:
`xiaohongshu-ops -> gpt-image-2-style-library or ciwei-prompt-method -> xhs-note-creator/local overlay -> xhs-traffic-aesthetic-guard`

Use when the output is a Xiaohongshu note, cover, carousel, topic, competitor imitation, or publishing package.

Key rules:
- First solve account, audience, topic, hook, and platform-native structure.
- Use Image2 only for backgrounds or visual anchors when Chinese text must be precise.
- Add Chinese text with local HTML/CSS/compositing.
- Cover solves click; card 2 solves save; card 3 solves proof.
- Reject PPT deck aesthetics, fake screenshots, fake documents, and AI-sounding visible copy.

## Realistic Image2

Route:
`gpt-image-2-style-library -> ciwei-prompt-method if the scene is vague -> image2 channel -> visual audit`

Use when the user asks for realistic photos, product stills, scenes, posters, cards, or image prompts.

Key rules:
- Select the nearest style-library template first.
- Convert abstract adjectives into visible evidence: camera distance, lens, light direction, surface texture, environment, imperfections.
- For realism, prefer no readable text inside generation unless the task is specifically text rendering.
- If platform use matters, load the platform guard after the image prompt.

## Realistic Character Boards

Route:
`prompt-skill-router -> gpt-image-2-style-library if style selection helps -> runninghub-image2-text/gpt-image-2/configured image channel -> character-board QA`

Use when the user asks for character images, protagonist/actor feel, male/female lead references, 16:9 character boards, or reusable role designs.

Key rules:
- Convert "明星感", "更好看", "更高级", and "更真实" into visible face, skin, grooming, clothing, pose, light, lens, and layout choices.
- Keep ethnicity and localization positive and concrete. If the user forbids Chinese elements, specify the target local visual range and visible local context.
- For character boards, avoid accidental second people, backs, foreground shoulders, random body parts, and generated text labels unless explicitly accepted.
- Put negative constraints at the end as one focused block.
- Keep winning prompt versions traceable when the output is part of a production run.

## Mexico Short-Drama Asset Prompts

Route:
`mx-shortdrama-04-asset-prompts for source prompt work -> mx-shortdrama-05-asset-images for execution planning -> configured image provider -> artifact ledger + F-style visual QA`

Use when the task is Chinese short-drama redraw to Mexico, Step04 asset prompt repair, Step05 asset image generation, support assets, props, phone UI, locations, or character refs.

Key rules:
- Use accepted handoff or accepted registry as source of truth; do not scan dirty latest folders.
- Do not silently rewrite upstream Step04 source prompts during Step05 execution. Create run-local prompt candidates unless the user asks for upstream edits.
- Keep asset type/use/canonical type aligned before execution.
- Treat generated/downloaded/qa_failed/verified as ledger states, not chat memory.
- Provider reruns require explicit approval when the run policy requires it.

## Storyboards / Visual Planning Boards

Route:
`image2-storyboard-video -> Image2 channel if approved -> storyboard QA -> matching video prompts`

Use when the user says 故事板, 分镜板, story board, storyboard, 电影制作板, 视觉规划表, or asks to convert story into storyboard images.

Key rules:
- Use one 16:9 production board with 8-9 numbered story frames, references, prop locks, environment/camera route, lighting/emotion/audio/cinematography notes.
- If the user asks for video prompts, provide the matching prompts in the conversation.
- Do not substitute generic first-frame or shot-list workflows as the primary route.

## Image2 Capability / Prompt Packs

Route:
`image2-boundary-lab -> gpt-image-2-style-library -> image2 channel`

Use when the user asks what Image2 can do, wants prompt packs, repeatable recipes, failure boundaries, or publishable capability maps.

Key rules:
- Test one variable at a time.
- Record model/channel/date/reference roles/aspect ratio.
- Score outputs before claiming a prompt is stable.

## AI Video / First Frames

Route:
`ai-video-fundamentals-skill -> image2-narrative-firstframe or image2 channel -> seedance2 execution skill -> video quality checklist`

Use when the user asks for AI video, first frames, Seedance2 prompts, shot planning, reroll diagnosis, storyboards, or video asset cards.

Key rules:
- Decide video type and the failure-critical variable first.
- Use three-block video prompts: base setup, atmosphere/visual quality, frame content.
- Build asset cards for stable people/products/props.
- Treat generations as a material pool; diagnose whether to change asset, first frame, prompt, or edit.

## Commerce Short Video

Route:
`realistic-commerce-video-replication or platform orchestrator -> video/image execution -> platform packager`

Use when the goal is Douyin/Kuaishou/TikTok commerce, product proof, realistic selling, or product-led short video.

Key rules:
- Hook by pain, proof, or product use in the first seconds.
- Show physical interaction and product outcome.
- Avoid glossy ad scenes unless the product category demands it.

## Marketing Copy

Route:
`copywriting -> product-marketing if context exists -> stop-slop -> cro if conversion-critical`

Use when writing landing pages, offers, headlines, CTAs, product descriptions, sales pages, or persuasive copy.

Key rules:
- Start with audience, problem, offer, proof, objection, and primary action.
- Prefer specific outcomes over vague value words.
- Remove generic AI cadence before final.

## Design / UI

Route:
`frontend-design or impeccable -> refactoring-ui/web-typography if needed -> playwright/screenshot verification`

Use when creating or improving interfaces, dashboards, websites, Figma-to-code work, or product UI.

Key rules:
- Match the product domain and user workflow.
- Avoid generic AI landing pages when the user asked for an app/tool.
- Verify layout in real viewports.

## Frontend Ideal Image / Web Concept Aesthetic Route

Route: `prompt-skill-router -> top-design + impeccable + frontend-design -> Frontend Ideal Image Concept Contract -> Image2 concept channel -> aesthetic gate`

Use when user asks for 前端理想图, 网站理想图, UI 概念图, 网页产品概念图, app/web mockup image, or asks Image2/RH to generate visual references for a future website before code implementation.

Key rules:
- Treat this as product/interaction art direction, not generic UI mockup generation.
- First define the product's signature moment: what screenshot would make the user say "this is the system".
- Pick a concrete aesthetic register before prompting: production cockpit, editorial command center, visual operating system, premium creator tool, gallery-grade control room, or another domain-specific structure. Do not default to dark SaaS dashboards.
- Route through `top-design` for signature/composition, `impeccable` for anti-slop/product fit, and `frontend-design` for interface craft.
- The concept image prompt must name one memorable spatial idea: pipeline canvas, split-screen workbench, node engine, batch wall, timeline, map, cockpit, command palette, or another domain-specific structure.
- Avoid repeated rounded cards, generic sidebars, purple-blue gradients, dashboard widgets without workflow meaning, fake futuristic panels, tiny unreadable text, and "AI SaaS" stock layouts.
- For tools used by non-experts, hide complexity behind one primary action, but show the system intelligence visually through queues, routing, comparison, diagnosis, and version memory.
- If the output image looks like a template dashboard after squinting, fail the aesthetic gate and rewrite before spending more provider calls.
- Do not treat generated UI text as final copy. Exact UI copy must be implemented locally in frontend code later.

## Research / High-Stakes Content

Route:
`jina-search or web research -> domain skill -> source-grounded output`

Use when facts may have changed, the topic is legal/medical/financial, or the user needs sources.

Key rules:
- Browse current sources before drafting.
- Separate verified facts from content angle.
- Do not invent case details, statistics, court results, or platform policy.

## Script-Only Novel / Screenplay To AI Short Drama

Route:
`mx-shortdrama-00-router -> mx-shortdrama-script-only-production -> ai-video-fundamentals-skill -> Image2/Seedance execution only after gates`

Use when the source is a novel, Word/PDF script, outline, synopsis, or dialogue draft and there is no authoritative reference video.

Key rules:
- Text is canon, not observed footage. Build N01 canon facts, N02 episode structure, and N03 designed shot fact cards before N04 prompts.
- Separate responsibility: canon ledger owns facts; shot cards own designed camera/blocking/continuity; asset board owns identity/space/prop appearance; video prompt owns visible motion over time.
- Establish reusable assets before long video prose: identity and wardrobe boards, scene-space master and angles, plot-critical props, then true first-frame candidates where required.
- Use the action stack `body path -> secondary physical response -> micro-reaction -> environment/light change -> sound cue`; one primary action per short shot.
- Pair angle with shot scale, focal-length behavior, spatial layers, and dramatic purpose. Pair light with a motivated source, direction, target, contrast, fill, and emotional function.
- Design dialogue performance as voice structure, not one emotion adjective: age feel, timbre, pace, baseline emotion, breath/pause, stress, sentence ending, and time-ordered change.
- For longer scenes, plan segment boundaries at a completed beat or create a deliberate overlap/action handoff. Do not assume a last-frame screenshot carries motion inertia.
- Storyboard remains explicit-only under workspace rules. When requested, route through `image2-storyboard-video` and follow its copyable prompt shape.
- Generated references remain candidates until exact path/hash/duty confirmation. Provider submit, cost, package, send, and registry promotion remain separately gated.

Quality gate:
- Canon contradiction check.
- Character/wardrobe/scene/prop responsibility check.
- Shot camera/blocking/hand/prop/center/continuity check.
- Motion-layer and one-primary-action check.
- Camera-purpose and motivated-light check.
- Dialogue speaker/voice-progression check.
- Segment-boundary continuity check.
- Reference confirmation and execution authorization check.

## Display / Profile Lifestyle Images 展示面图

Route:
`prompt-skill-router -> Display Image Two-Reference Contract -> runninghub-image2-image low-price channel -> human identity/template review`

Use when the user asks for 男生展示面, 女生展示面, 展示面图, 社交展示图, lifestyle/profile photos, or wants to replace a person in many template photos with one customer identity.

Key rules:
- Default to the two-reference strategy proven by `customer01_back10_two_ref_v5_20260702`: Reference A is the customer master identity collage; Reference B is the single template image.
- Reference A only controls identity, face structure, skin tone, age feel, hairstyle direction, and personal temperament.
- Reference B only controls body pose, clothing, scene, composition, camera distance, lighting, aspect ratio, and photo texture.
- Every production prompt must include an aesthetic correction layer after template preservation. Identity replacement alone is not enough for display images.
- Aesthetic correction controls clean facial key light, catchlight, flattering camera angle, natural head-body proportion, open shoulder-neck line, relaxed posture, and good-looking lifestyle presentation.
- Aesthetic correction must be single-template directed. Do not use one identical prompt for pet-store interaction, night-view wine glass, outdoor sportswear, restaurant table, and bar templates. Each template needs a diagnosis of scene, light, camera, pose, proportion risk, and a concrete director instruction for that image.
- In batch execution, identical prompt hashes across visually different templates are a red flag and should fail prompt QA before provider execution.
- If the face is similar but the image looks less attractive, diagnose it as aesthetic-control failure: dirty facial shadow, side-light crushed features, black eye sockets, overhead light, face too small/sideways, head too large, short neck, collapsed shoulders, stiff body, or poor body proportion.
- For dark bars, night views, restaurants, sports scenes, ski scenes, strong side light, top light, backlight, high-angle table shots, and low-angle selfies, keep the template atmosphere but explicitly require the customer's face to stay cleanly lit and proportionally flattering.
- Do not mix multiple raw customer photos plus a template as equal references for production runs; that caused identity/template competition and partial face-replacement failure.
- For male customers, preserve the customer's own short-hair direction and make only a light natural attractiveness upgrade; avoid generic handsome stranger, Korean-idol drift, and template male face residue.
- For female customers, preserve the customer's own face structure, hair length/style/color, and age feel; avoid generic influencer face, over-beauty-filtering, and template female face residue.
- If some images succeed and others fail, diagnose reference-role confusion before adding adjectives. High-risk templates include sunglasses, low light, side face, tiny face, strong template hairstyle, bars, seaside glare, ski/sports scenes, and complex atmosphere.
- Prefer one medium-risk test image before burning a full batch; after a win, batch similar templates with the same reference order.
- Record run id, prompt path/hash, imageUrls order `[customer_master_ref, template]`, taskId, result log, downloaded file, final sync path, and manual review status.
