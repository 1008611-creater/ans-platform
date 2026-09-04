---
name: web-visual-motion-planner
description: name: web-visual-motion-planner
---

---
name: web-visual-motion-planner
description: 规划、审计和指导网站的视觉层级、GSAP 动效、互动、素材、性能和开发交接。用户提到网页视觉、网页动效、GSAP、ScrollTrigger、滚动叙事、Hero 动画、网站风格、动效方案、页面转场、3D/视频网页、动效很乱/很丑/很卡、或需要把网站需求交给开发时使用。本 Skill 是网站视觉与动效决策的权威来源；实际代码交给 website-product-router 和对应前端实现技能。
---

# Website Visual And Motion Planner

## Role

Treat this Skill as the authority for **what the site should communicate, what should move, why it moves, what assets it needs, and how it must degrade**. It owns the visual/motion contract, not the framework choice, secrets, deployment, or a claim that code is shipped.

Use it before material website visual or motion changes. For a direct implementation request, create the minimum viable contract first, then hand implementation to `website-product-router` plus the stack-specific frontend skill. Do not turn a planning gate into an excuse to stop when the user has already supplied enough direction and asked for a build.

Read [motion-selection-matrix.md](references/motion-selection-matrix.md) for motion selection, forbidden combinations, assets, and platform choices. Read [website-experience-contract.md](references/website-experience-contract.md) when preparing a design brief, an implementation handoff, or a motion audit.

## Non-Negotiable Principles

1. Start from the page goal, user action, content hierarchy, available assets, and performance budget. Never start with “which effect looks coolest”.
2. Give each viewport one visual protagonist and one dominant action. Titles, people, products, backgrounds, and decoration must not compete equally.
3. Assign motion a job: reveal reading order, explain a change, show system feedback, preserve spatial continuity, or create a deliberate emotional beat. Decorative motion is optional and must be removable.
4. Select a trigger before an effect: load, viewport entry, scroll-scrub, hover, click, drag, route transition, or media time. Then select a rendering medium: DOM/CSS, SVG, image, video, Canvas, or WebGL.
5. Use the fewest technologies that meet the goal. A tool stack is a lifecycle commitment, not a moodboard.
6. Design desktop and mobile as related but not identical experiences. Hover, custom cursor, magnetism, long pinning, dense particles, large blur, high-resolution 3D, and concurrent video require deliberate mobile degradation.
7. Respect `prefers-reduced-motion`, keyboard use, focus order, touch behavior, readable contrast, and interruptibility. No critical information may require animation to become available.
8. Preserve confirmed brand, source content, asset identity, legal copy, and user decisions. Mark unconfirmed choices explicitly instead of silently inventing them.

## Operating Flow

### 1. Classify And Gather Only What Is Missing

Determine project type, audience, business goal, primary CTA, page scope, platform/stack, existing source repo, visual assets, desired motion intensity, target devices, and performance constraints.

Extract already-provided facts first. Ask no more than the smallest set of questions needed to make a safe choice. Give one recommended direction and at most two real alternatives when a decision is open.

### 2. Create The Experience Contract

Before material visual/motion work, record:

- primary user action and success criterion;
- page map and per-section information priority;
- visual direction, typography, palette, material, composition, and media role;
- motion budget: light, guided, immersive, or interactive;
- explicit trigger, technique, timing, easing, interruptibility, and mobile/reduced-motion fallback for every non-trivial effect;
- asset registry: available, user-supplied, AI-generable, specialist/purchased, or missing;
- implementation/verification ownership and unresolved decisions.

Use the contract template in [website-experience-contract.md](references/website-experience-contract.md). For low-risk, already-directed builds, write a compact version in the task artifacts rather than blocking on a formal approval ritual.

### 3. Choose Motion By Function And Complexity

Use [motion-selection-matrix.md](references/motion-selection-matrix.md) to map the intended effect to a trigger, medium, GSAP/plugin/tool choice, asset prerequisite, mobile fallback, and QA risks.

Default complexity tiers:

- **A, light:** opacity/transform/color, local hover, short CTA feedback, basic viewport reveal. Prefer CSS or GSAP Core/Timeline.
- **B, structured:** SplitText, ScrollTrigger pin/scrub, horizontal gallery, SVG, Flip, drag, short video. Require lifecycle and asset planning.
- **C, heavy:** video scrub, sequence/Canvas, multi-page transition, Three.js/WebGL, shader work. Require a hard performance budget, loading state, real media, and a meaningful mobile fallback.

Do not recommend C-tier motion only to make a page feel premium. Use it only when it carries product evidence, narrative, spatial understanding, or brand value that light motion cannot supply.

### 4. Define The Implementation Handoff

For each effect, supply the fields in the reference contract: purpose, trigger, initial state, motion path, end state, duration/easing, layering, assets, implementation technique, cleanup ownership, desktop/mobile/reduced-motion behavior, and failure conditions.

Route implementation by responsibility:

- website/repo/stack/deployment: `website-product-router`;
- actual UI construction: `frontend-design` or the established local design system;
- design or interaction defect audit: `website-quality-router`;
- animation details: GSAP Core/Timeline/ScrollTrigger first, then only the documented specialized tool;
- WebGL/Three.js: use the relevant 3D implementation route, with a non-WebGL fallback.

Never create a generated full-page screenshot with invisible hotspots as the product website. Generate visual assets only as bounded media; all controls and content states remain real UI.

### 5. Verify The Built Experience

Implementation is not complete until desktop and mobile paths are inspected in a real browser. Verify:

- no layout shift or clipped content during entrance/reflow;
- motion starts only at the intended trigger and can be interrupted/reversed where interaction requires it;
- no duplicate ScrollTrigger/listener/WebGL resources after navigation or rerender;
- content and CTA remain legible before, during, and after motion;
- keyboard, touch, reduced-motion, and media fallback behavior work;
- image/video/3D loading has a poster or placeholder and never leaves a blank primary area;
- performance is reasonable on representative mobile/desktop routes.

Record verified and unverified claims separately. Do not call a concept board, static screenshot, GSAP snippet, or desktop-only recording a complete website.

## Prescriptive Decisions

- Use GSAP Timeline for related entrance/exit sequences; do not scatter unrelated timers.
- Use ScrollTrigger when scroll reveals information in a meaningful order. Prefer simple viewport reveals for ordinary content pages.
- Choose **one** smooth-scroll owner: ScrollSmoother **or** Lenis. Never both on the same scroll container.
- Use SplitText for short titles, chapter labels, or editorial lines. Do not animate long body copy character-by-character.
- Use Flip for a real shared element changing DOM state. Do not fake an unrelated scale animation as a shared-element transition.
- Use video scrub only with short, seek-friendly clips, poster frames, and tested mobile fallback. Use Canvas/sequences only where precise frame control outweighs download cost.
- Use SVG animation only with clean paths and a correct `viewBox`. Use Three.js only when actual model/space behavior is central and assets plus fallback exist.
- In React/Next, scope animations with `useGSAP`/context, clean triggers on unmount, and rebuild responsive paths with `gsap.matchMedia()`.
- Keep functional UI feedback fast, reversible, and modest. Do not make form states, menus, dialogs, or important navigation depend on hover-only or long cinematic animation.

## Hard Avoids

- Do not stack Lenis and ScrollSmoother over one scroll root.
- Do not combine repeated long pin sections with large concurrent video and a 3D canvas without measured justification.
- Do not animate every title by character, every image with parallax, and every button with magnetism.
- Do not run large DOM particle sets with broad blur/filter and blend modes at the same time.
- Do not leave old ScrollTriggers, event listeners, video decoders, textures, materials, or renderers after a route change.
- Do not expose internal channel names, speculative scores, implementation explanations, or keyboard-shortcut tutorials as visible product copy.

## Output Shape

Use the smallest useful format, but always state:

```text
Experience goal:
Visual direction:
Information hierarchy:
Motion budget and why:
Section/effect plan:
Asset plan:
Platform and fallback plan:
Implementation handoff:
Verification plan:
Open decisions:
```

For audits, lead with the highest-impact visual/motion failures and their exact repair owner. For implementation requests, pass the contract to the implementation skill and continue through a working build, browser verification, and post-coding review.
