# Image2 Website Asset Route

Use this reference when a website uses Image2, RunningHub, PSD-style concepts, generated visual assets, Figma/Pixso exports, or screenshot-style UI references.

## Runtime Rule

Website runtime UI must be framework-first:

- real HTML/React/Vue/Astro/Framer components;
- real links, buttons, forms, menus, modals, cards, filters, tables, and navigation;
- generated images only inside bounded visual slots;
- responsive layout and text must remain real and inspectable;
- primary conversion and form paths must work without relying on image hotspots.

Do not ship full-page generated screenshots plus invisible links/hotspots as the primary website UI.

## Allowed Generated Asset Targets

- hero image or hero background;
- product image;
- section illustration;
- brand/venue/object visual;
- benefit icon or feature illustration;
- empty-state illustration;
- testimonial/customer visual;
- OG/social image;
- campaign/share poster.

## Forbidden Runtime Targets

- full-page screenshot UI;
- invisible hotspot navigation over generated pages;
- generated forms, pricing tables, legal copy, nav bars, dashboards, or admin screens replacing real controls;
- generated login, payment, upload, order, or account state without real runtime logic;
- copied third-party screenshots treated as owned production assets.

## Required Manifest Fields

```json
{
  "website": {
    "image_asset_policy": {
      "framework_first_ui": true,
      "fullscreen_screenshot_ui": false,
      "allowed_targets": ["hero", "section_art", "product_image", "brand_visual", "benefit_icon", "empty_state", "og_image", "share_poster"],
      "forbidden_targets": ["full_page_runtime_ui", "transparent_hotspot_navigation", "generated_navbar", "generated_form"]
    },
    "generated_assets": [
      {
        "target": "hero",
        "path": "public/assets/hero.png",
        "channel": "image2",
        "prompt_or_log": "logs/image2-hero.md",
        "used_in": "/"
      }
    ]
  }
}
```

## Verification Gate

Before claiming customer-demo quality:

1. Confirm `fullscreen_screenshot_ui` is `false`.
2. Confirm real UI remains usable if generated assets are missing.
3. Confirm generated images do not include fake nav/forms/payment/admin controls.
4. Capture desktop and mobile browser screenshots.
5. Record screenshot paths and asset paths in `PROJECT_MANIFEST.json`.
