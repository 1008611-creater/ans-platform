# Website UI Quality Route

Use this reference when the user expects high-quality website UI, provides screenshots, asks for PSD-like quality, or complains the frontend looks rough.

## Production Rule

Build the UI as real components first. Use generated images only for bounded visual richness.

Good website UI comes from:

- clear first-viewport signal and primary action;
- hierarchy, spacing, typography, contrast, density, and rhythm;
- real responsive layout, not fixed screenshot slicing;
- reusable components with hover/focus/loading/empty/error states;
- real forms, navigation, cards, pricing, filters, dashboards, and admin controls;
- polished imagery, icons, social images, and campaign assets;
- desktop and mobile browser screenshots as evidence.

## Recommended Route

1. Extract pages and flows from references: home, product/service pages, pricing, case studies, form/checkout, dashboard/admin if needed.
2. Choose implementation route from `route-matrix.md`.
3. Build framework-first components in the selected stack.
4. Generate or select bounded assets only after layout slots are known.
5. Record assets in `website.generated_assets`.
6. Verify desktop/mobile with Playwright or browser screenshots.

## Quality Gate

Before `website_quality_gate` or `aesthetic_gate` passes, record:

- desktop and mobile screenshots;
- no critical overlap, clipping, blank first viewport, or hidden primary CTA;
- `website.image_asset_policy.framework_first_ui: true` when generated assets are used;
- `website.image_asset_policy.fullscreen_screenshot_ui: false`;
- a `verification_records` entry of type `website_quality_audit`, `desktop_screenshot`, `mobile_screenshot`, or `playwright_visual_check`.
