# Motion Selection Matrix

Use this reference after the page goal and visual hierarchy are known. Select the smallest combination that creates the intended information sequence.

## Selection Order

1. Name the trigger: load, enter viewport, scrub, hover, click, drag, route transition, or media time.
2. Name the medium: DOM/CSS, text, SVG, image, video, Canvas, or WebGL.
3. Check assets, target devices, and loading/performance budget.
4. Choose an implementation and a fallback before development.

## Effect Families

| Need | Preferred route | Needs | Mobile/reduced-motion rule |
|---|---|---|---|
| Establish reading order | GSAP Core + Timeline, `opacity` and `transform` | Real DOM structure | Keep short; show final content without motion when reduced |
| Reveal section on scroll | ScrollTrigger viewport reveal | Stable section geometry | Use one-time reveal or no motion on low-motion route |
| Editorial hero title | SplitText line/word mask + Timeline | Loaded font, stable line wrapping | Prefer words/lines; never require character animation to read |
| Explain a product/story chapter | Pin/sticky media + ScrollTrigger | Chapter content and bounded scroll distance | Change to ordinary vertical blocks or native horizontal scroll |
| Gallery/portfolio continuity | Flip + CSS/GSAP; optionally one smooth-scroll owner | Shared element identity and image source | Keep direct navigation and no mouse-only controls |
| SVG logo/path/route | DrawSVG, MorphSVG, MotionPath | Clean paths, correct `viewBox` | Render a complete static SVG fallback |
| State change/filter/detail | Flip | Same semantic element before/after | Do not hide state from keyboard/screen reader users |
| Drag/rotation/card deck | Draggable/Inertia/Observer | Clear boundaries, snap points, touch route | Supply buttons or native swipe/scroll alternative |
| Video narrative | HTML5 video + GSAP reveal/time sync | Short encoded video, poster, timestamps | Poster/static image or ordinary playback controls |
| Precise scroll media | Canvas sequence or video `currentTime` scrub | Frame sequence or seek-friendly clip, loader | Replace with selected stills/video; do not block reading |
| Product/space 3D | Three.js/R3F + GSAP + ScrollTrigger | GLB/GLTF, PBR textures, HDRI/light plan, poster | Poster/video fallback; lower DPR, textures and shadows |
| Multi-page continuity | Barba.js or Swup + GSAP | Stable container and teardown lifecycle | Preserve URL, focus, scroll restore and no-JS navigation |

## Recommended Combinations

| Website type | Default combination | Keep the emphasis on |
|---|---|---|
| Enterprise, course, SaaS, data | GSAP Core + small ScrollTrigger reveals | Clarity, speed, one CTA, functional feedback |
| Public landing page | Timeline hero + selected reveals + limited media | Offer comprehension and conversion |
| Brand story/culture | ScrollTrigger chapters, limited pinning, image/theme transitions, SVG route | Narrative order, not non-stop spectacle |
| Product launch | Video or 3D hero only when assets support it; sticky feature explanation | Evidence, product details, purchase action |
| Portfolio/creative studio | SplitText, image hover preview, Flip, optional Lenis | Case browsing and clear navigation |
| Commerce | Product gallery, image detail, selection state with Flip, optional 360 view | Choice, trust, purchase, touch usability |
| Heavy 3D/game/entertainment | Three.js/R3F plus a deliberate loading and fallback path | Actual interaction/space, not decorative load |

## Conflict Rules

- One scroll owner per root: `ScrollSmoother` or `Lenis`, never both.
- Long pinning plus video plus WebGL is a measured exception, not a default composition.
- Do not apply intense motion to prose, every card, every button, and every image at once.
- Use Canvas/PixiJS rather than hundreds of animated DOM nodes for genuinely dense 2D objects.
- Use `transform` and `opacity` for high-frequency UI motion. Restrict broad `blur`, `backdrop-filter`, SVG filters, and blend modes.
- Recreate responsive ScrollTrigger paths with `gsap.matchMedia()`; refresh only after fonts and relevant media finish loading.

## Asset Readiness

- Images: use WebP/AVIF when suitable; leave crop margin for parallax/scale; prepare mobile crops.
- Layered visual: separate background, subject, foreground, and shadow; do not expect a flat image to support depth parallax.
- SVG: clean paths, correct `viewBox`, restrained node count, normalized paths before morphing.
- Video: short H.264 MP4 baseline, optional WebM, muted loop policy, poster, first/last frame, mobile low-bitrate alternative.
- Sequence: stable dimensions and ordered filenames; preload only critical frames; define a non-sequence fallback.
- 3D: GLB preferred, named meshes, sensible origin/scale/axis, PBR maps, light/HDRI strategy, loading poster, lower-cost mobile form.
- Fonts: licensed web/variable font, preload critical files, wait for fonts before line-based text animation.

## Verification Checklist

- Test desktop pointer, touch, keyboard focus, low-motion preference, slow network/media fallback, and route cleanup.
- Inspect first paint and late font/media reflow.
- Check that animated content remains readable and reachable without the animation.
- Stop/release offscreen video, heavy loops, triggers, textures, materials, and renderers.
- Use browser performance tools to identify script, layout, paint, decode, or GPU pressure before changing libraries.
