---
name: niannian-logo-authority
description: name: niannian-logo-authority
---

---
name: niannian-logo-authority
description: Use for any 念念 AI website, app, favicon, header, navigation, brand, or logo work. Provides the single user-approved authoritative logo asset and prevents substituting favicon, pink candidates, or deprecated logo variants.
---

# 念念 AI 权威 Logo

## 唯一权威资产

Use `assets/niannian-ai-authority-gold.svg` as the default 念念 AI Logo.

This is the approved gold-center mark:

- white outer 念字 structure;
- thin black outline for contrast;
- gold center axis (`#d7b36a`);
- transparent SVG viewBox `96 96`.

Do not use these as the product Logo unless the user explicitly asks for them:

- `favicon.svg` pink circular icon;
- `niannian-ai-mark-transparent.svg` pink-axis line mark;
- `niannian-ai-fused-monogram-v6-brand-pink.png` pink-axis candidate;
- any generated or newly designed replacement.

## Website integration

Copy the bundled asset into the app's public/static asset directory and reference it with a version query when cache invalidation is needed. Keep `object-fit: contain`, transparent background, and no forced circular crop, gradient, or rounded container. Verify the real rendered header or navigation, not only HTTP status or source text.

## Validation

Before delivery, confirm the loaded asset contains the gold center color `#d7b36a`, does not contain the old pink center `#ff2f7d`, and inspect the real page at desktop and narrow width. Never report a Logo change as complete based only on a successful build.
