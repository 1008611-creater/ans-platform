# ANS VibeHub — host-aligned knowledge system

Scope: `/vibe-hub` and its children. Existing ANS host tokens and components are authoritative; these rules do not redesign other ANS routes.

## Intent and domain

Audience: ANS members moving from an idea or unfamiliar term toward their own project. Their next action is to clarify requirements, prepare real inputs and open an appropriate project/workflow.
Domain: references, terminology, agent briefs, private project facts, editable artifacts, evidence and handoff. Color world: host paper/background, ink/foreground, secondary text, subtle page boundaries, indigo actions and the existing green ANS dinosaur. One focal point per screen: the home invitation, a directory heading, or the guide title.
Signature: a knowledge-to-work handoff. It appears in the three-step notebook, ANS practice rows, term-specific practice links, copyable briefs and real ANS destinations. Use editorial rows instead of a repetitive promo grid; real content counts instead of invented adoption numbers; a shared host theme instead of a second palette selector.

## Tokens and layout

- Inherit host `--primary`, `--primary-foreground`, `--background`, `--foreground`, `--card`, `--border`, `--muted`, `--muted-foreground` and `--font-sans`. Bridge source-demo variables inside `.ans-knowledge`; do not change host values.
- Shared `next-themes` state. Legacy VibeHub color selections are not a separate host theme.
- Depth: quiet surface/border distinction. No floating decorative shadows or glowing accents. One brand accent for actions; teaching examples may illustrate other visual styles.
- 4px spacing base: 8/12/16/20/24/32/40/48/64. Page width 1240px; wide gutter 24px, mobile 16px. Prose width 760px. No negative layout escapes.
- Home split: 1.45:1 at desktop, single-column at 760px. Guide: 240px outline plus prose, stacked on mobile.
- Type: host sans family. Caption 11–12px, supporting 13–14px, prose 15–16px, section 23–30px, guide 30–46px, home 32–60px. Weight and space carry hierarchy. Balanced headings and readable line height.
- Header: 44px controls; same-location return. Second row search. Desktop main entries plus Radix Sheet for complete navigation; mobile moves language choice into the Sheet. No hover-only critical action.
- Buttons: existing Button primitive, 44px minimum height, 20px horizontal padding, pill form consistent with ANS calls to action. Primary and outline get explicit local variant styling because source CSS is unlayered.
- Practice row: number / domain icon / title + summary / arrow; icon suppressed on small screens. Never fabricate completion or account progress.
- Guide: outcome and audience, three substantive sections, editable brief, related terms, real routes, relevant capability boundaries.

## Motion

LottieFiles guidance supplies timing and emotional intent; no Lottie runtime or downloaded animation is required for these interactions. Design Motion Principles supplies the frequency gate. Primary lens: Emil for frequent tool actions, Jakub for subtle shipped polish. The only playful accent is the existing mascot's small hover response.
Quick 120ms, standard 180ms, mascot 280ms; curve cubic-bezier(.2,0,0,1). No scrolling entrance cascades, continuous mascot loops or keyboard-triggered movement. Small press feedback and directional arrows communicate response. `prefers-reduced-motion` disables motion, including the Sheet, without hiding content. Apply the same discipline to new controls.

## Content and source boundaries

Six bilingual ANS practices live in `src/domain/vibehub/ans-practices.ts`. Links must resolve to current routes or verified local term slugs. Public project references, private projects and executable workflows are different concepts. Guides do not assert provider readiness, current competition rules, prices, user metrics or completed tasks.
Retain upstream terminology, courses, practice, provenance and attribution. Upstream changelog dates are explicitly labeled as upstream, separate from ANS deployment records. Search can show matching ANS guidance alongside terminology.

## Methods used (task-pinned sources)

- Interface Design — `Dammyjay93/interface-design`, `2f9be3206855bcb2d1d0af262c8bae25cba6658d`, primary interface method.
- UI UX Pro Max — `nextlevelbuilder/ui-ux-pro-max-skill`, `67803eac81607188194aea9842a723b89326d90d`, interaction/reference lookup. Generic palette/type suggestions were evaluated against the host and were not adopted.
- LottieFiles Motion Design — `LottieFiles/motion-design-skill`, `f9a8a041b85185ee4881b3471d3415e939aac772`, motion method.
- Design Motion Principles — `kylezantos/design-motion-principles`, `4a9ca879f24a361f4dca4174fe2da0f67b5ddee3`, restrained interaction method.

These repositories were read from task-owned checkouts; this does not claim global installation, runtime reload or endorsement by their authors.
