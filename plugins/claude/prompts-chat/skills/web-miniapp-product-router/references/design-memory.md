# Design Memory

Use this when a website, mini program, H5, app, or frontend project will be reused or iterated. The output is a project-local `DESIGN.md` that becomes the design memory for future work.

## Purpose

`DESIGN.md` prevents repeated aesthetic drift. It records what the project should feel like, what must not happen, and how UI decisions map to implementation.

## When Required

- User complains about bland, generic, low-end, or template-like design.
- Project will have multiple pages/screens.
- Project will be handed from design to implementation.
- Project uses Image2/Figma/Framer concepts before code.
- Project will have future iterations.

## Minimum Sections

```markdown
# DESIGN.md

## Product Context
- Product:
- Target user:
- Primary action:
- Platform:

## Visual Thesis
- Direction:
- Signature first-screen moment:
- Emotional keywords:
- Avoid:

## Typography
- Display:
- Body:
- Scale:
- Line break rules:

## Color And Atmosphere
- Background:
- Text:
- Accent:
- Surfaces:
- Contrast notes:

## Layout Rules
- Grid:
- Density:
- Spacing:
- Responsive behavior:

## Components
- Navigation:
- Buttons:
- Cards/panels:
- Forms:
- Lists/tables:
- Empty/loading/error states:

## Motion And Interaction
- Page load:
- Hover/focus:
- Scroll:
- Reduced motion:

## Assets
- Logo:
- Images:
- Icons:
- Generated concept images:

## Quality Gate
- Screenshot checks:
- Mobile checks:
- Accessibility checks:
- Anti-generic checks:
```

## Rules

- Keep `DESIGN.md` short enough to be used, not admired.
- Translate Image2/Figma visuals into tokens, components, layout rules, and states.
- Update `DESIGN.md` after the user approves a better direction.
- Do not overwrite user-approved aesthetic decisions without explicit reason.
