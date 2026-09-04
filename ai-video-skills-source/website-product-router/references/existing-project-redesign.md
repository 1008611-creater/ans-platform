# Existing Project Redesign

Before changing an existing website, inspect the repo first.

## Required Inspection

- Framework, package manager, scripts, and routing convention.
- Existing design tokens, component library, icons, fonts, and layout patterns.
- Current deployment assumptions and environment variables.
- Tests, lint, build, and preview commands.
- User changes in git worktree.

## Implementation Rules

- Preserve repo-native patterns unless a change is necessary.
- Do not introduce a new component library for a small visual fix.
- Use current routes and data contracts.
- Scope redesign to requested pages and shared components actually touched.

## Verification

- Run the narrowest meaningful repo command first.
- Use Playwright screenshots when visual work changed.
- Record skipped checks plainly.
