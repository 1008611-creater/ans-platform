# ANS VibeHub — host-aligned knowledge system

Scope: `/vibe-hub` and its children. Existing ANS host tokens and components are authoritative; these rules do not redesign other ANS routes.

## Intent and domain

Audience: ANS members moving from an idea or unfamiliar term toward their own project. Their next action is to clarify requirements, prepare real inputs and open an appropriate project/workflow.
Domain: references, terminology, agent briefs, private project facts, editable artifacts, evidence and handoff. Color world: host paper/background, ink/foreground, secondary text, subtle page boundaries, indigo actions and the existing green ANS dinosaur. One focal point per screen: the home invitation, a directory heading, or the guide title.
Signature: a knowledge-to-work handoff. It appears in the GitGlow VibeHub content gallery, ANS practice rows, term-specific practice links, copyable briefs and real ANS destinations. Use editorial rows instead of a repetitive promo grid; real content counts instead of invented adoption numbers; a shared host theme instead of a second palette selector.

## Tokens and layout

- Inherit host `--primary`, `--primary-foreground`, `--background`, `--foreground`, `--card`, `--border`, `--muted`, `--muted-foreground` and `--font-sans`. Bridge source-demo variables inside `.ans-knowledge`; do not change host values.
- Shared `next-themes` state. Legacy VibeHub color selections are not a separate host theme.
- Depth: quiet surface/border distinction. Project preview covers use a light physical-card shadow; no glowing accents. One brand accent for actions; teaching examples may illustrate other visual styles.
- 4px spacing base: 8/12/16/20/24/32/40/48/64. Page width 1240px; wide gutter 24px, mobile 16px. Prose width 760px. No negative layout escapes.
- Home split: 1.45:1 at desktop, single-column at 760px. Guide: 240px outline plus prose, stacked on mobile.
- Type: host sans family. Caption 11–12px, supporting 13–14px, prose 15–16px, section 23–30px, guide 30–46px, home 32–60px. Weight and space carry hierarchy. Balanced headings and readable line height.
- Header: 44px controls; same-location return. Second row search. Desktop main entries plus Radix Sheet for complete navigation; mobile moves language choice into the Sheet. No hover-only critical action.
- Buttons: existing Button primitive, 44px minimum height, 20px horizontal padding, pill form consistent with ANS calls to action. Primary and outline get explicit local variant styling because source CSS is unlayered.
- Practice row: number / domain icon / title + summary / arrow; icon suppressed on small screens. Never fabricate completion or account progress.
- Guide: outcome and audience, three substantive sections, editable brief, related terms, real routes, relevant capability boundaries.

## Motion

LottieFiles guidance supplies timing and emotional intent; no Lottie runtime or downloaded animation is required for these interactions. Design Motion Principles supplies the frequency gate. Primary lens: Emil for frequent tool actions, Jakub for subtle shipped polish. The home project previews have a small paper-card hover response; images are captures of real VibeHub content.
Quick 120ms, standard 180ms, cover lift 220ms, image scale 280ms; curve cubic-bezier(.2,0,0,1). The three cover slots enter once over 360ms with 0/60/120ms offsets; no scrolling entrance cascades or continuous loops. Hover lifts by 6px and straightens the cover; keyboard focus uses a clear outline and a smaller 4px lift. Touch stays static. Reduced-motion removes all cover transforms, transitions and entrance animations. Small press feedback and directional arrows communicate response. `prefers-reduced-motion` disables motion, including the Sheet, without hiding content. Apply the same discipline to new controls.

## Content and source boundaries

Six bilingual ANS practices live in `src/domain/vibehub/ans-practices.ts`. Links must resolve to current routes or verified local term slugs. Public project references, private projects and executable workflows are different concepts. Guides do not assert provider readiness, current competition rules, prices, user metrics or completed tasks.
Retain upstream terminology, courses, practice, provenance and attribution. The ANS change-notes page records ANS content and interface changes with their actual implementation date; it does not inherit upstream release history or claim deployment. Source courses and supplementary paths keep explicit attribution. Search can show matching ANS guidance alongside terminology.

## Methods used (task-pinned sources)

- Interface Design — `Dammyjay93/interface-design`, `2f9be3206855bcb2d1d0af262c8bae25cba6658d`, primary interface method.
- UI UX Pro Max — `nextlevelbuilder/ui-ux-pro-max-skill`, `67803eac81607188194aea9842a723b89326d90d`, interaction/reference lookup. Generic palette/type suggestions were evaluated against the host and were not adopted.
- LottieFiles Motion Design — `LottieFiles/motion-design-skill`, `f9a8a041b85185ee4881b3471d3415e939aac772`, motion method.
- Design Motion Principles — `kylezantos/design-motion-principles`, `4a9ca879f24a361f4dca4174fe2da0f67b5ddee3`, restrained interaction method.

These repositories were read from task-owned checkouts; this does not claim global installation, runtime reload or endorsement by their authors.

## Home cover composition

Summarize ANS VibeHub itself: term atlas / original ANS practices / interactive quizzes. Use actual local page captures under `public/vibe-hub/covers`, not other ANS projects. Adapt GitGlow MinimalSlate, AngledCanvas and FloatingLayers to live responsive HTML/CSS covers, preserving its MIT notice. Headlines are localized HTML; images are decorative page evidence. Counts come from the term catalog and ANS_PRACTICES. Links stay inside VibeHub and preserve `lang`. One lead cover above two smaller offset covers; calm paper, charcoal and pale green cover surfaces sit within the existing host theme. No fabricated activity or user metrics. Keep homepage copy to the invitation, one sentence, actions and content titles; summaries remain in the full practice directory.

## ANS learning and collaboration continuation

Three bilingual original paths connect facts, actions, inspectable deliverables and real destinations. Completion is manually marked and saved only on the current device. The Agent brief builder edits four user-owned fields, keeps a device draft and provides a real copy action; it never sends the brief or executes generation. Course discovery is an ANS editorial introduction to retained source chapters. The learning-lab layout demo displays actual term and practice counts, not invented adoption or ratings. New directory rows use quiet borders and an arrow response; checkbox, typing and progress updates remain instant. Source details use native disclosure. Every new route and interaction supports narrow screens, the shared theme, both content languages and reduced motion.
