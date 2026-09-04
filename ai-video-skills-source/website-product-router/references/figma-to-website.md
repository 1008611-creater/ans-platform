# Figma To Website

Use when Figma is the editable source of truth and implementation fidelity matters.

## Required Inputs

- Figma file or frame URLs.
- Target pages and breakpoints.
- Typography, color, spacing, and component tokens.
- Asset export plan.
- Interaction states and responsive behavior.

## Implementation Rules

- Use `figma-use` before Figma MCP operations.
- Use `figma-implement-design` for code translation.
- Treat MCP/layer data as context, not proof.
- Verify final browser screenshots against the design intent.

## Not Done Until

- Implemented route exists.
- Desktop and mobile screenshots exist.
- Major visual mismatches are fixed or documented.
