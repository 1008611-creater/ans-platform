# Playwright Website Verification

Use before reporting visual website completion when a runnable site exists.

## Minimum Screens

- Desktop: 1440 x 900 or repo-standard desktop viewport.
- Mobile: 390 x 844 or repo-standard mobile viewport.

## Checks

- Page loads without blank screen.
- First viewport content is framed correctly.
- Text does not overlap or overflow controls.
- Navigation and primary CTA work.
- Forms render and submit path is known.
- Images, video, canvas, and fonts load.
- Console has no relevant runtime errors.
- Responsive layout does not hide critical content.
- Keyboard focus path reaches navigation, primary CTA, and form controls where relevant.
- Automated accessibility check with axe-core/pa11y when available, or explicit not-done reason.
- Lighthouse/performance check when launch readiness or SEO is in scope.

Store screenshot paths in `PROJECT_MANIFEST.json` when the project is reusable.
