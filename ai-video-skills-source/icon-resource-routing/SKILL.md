---
name: icon-resource-routing
description: name: icon-resource-routing
---

---
name: icon-resource-routing
description: Choose verified icon resources for product UI and web experiences. Use when a task needs AI/LLM brand logos, model/provider selectors, integration directories, 3D visual icons, empty states, feature cards, or marketing illustrations, especially in AI, creator, content-production, and commerce products.
---

# Icon Resource Routing

Select the resource by its semantic role. Keep standard UI controls separate from brand marks and decorative 3D assets.

## Resource Decision

1. Use `@lobehub/icons` for the recognizable logo of an AI model, AI provider, AI application, or integration. It is the default for model pickers, provider lists, connected-service states, integration directories, and AI capability disclosures.
2. Use Thiings only when a page needs a low-frequency 3D object to communicate a feature, empty state, tutorial step, result state, or marketing concept. It is appropriate for a hero-adjacent visual, a feature card, or an empty state, not for repeated controls.
3. Use the project standard icon library, normally Lucide, for commands and navigation: save, delete, upload, playback, settings, navigation, status, and table actions. Do not replace these controls with Thiings images or brand marks.

## Lobe Icons

- Source: `https://icons.lobehub.com/`; package: `@lobehub/icons`.
- Prefer a named React or React Native import in component code. For static pages, use the maintained SVG, PNG, or WebP package/CDN variant and pin the package version for a release.
- Preserve the mark's recognizability, provide an accessible text label where the logo conveys meaning, and use a logo only to identify the actual service or compatibility.
- The repository is MIT-licensed, but third-party marks remain subject to their owners' trademark rules. Do not imply an endorsement, partnership, certification, or official affiliation.

## Thiings

- Source: `https://www.thiings.co/things`; catalog: 10,000+ AI-generated 3D icons.
- Use one visual role per screen and size image delivery deliberately. Avoid placing multiple 3D assets in dense operational tables, toolbars, navigation, or a fixed production-workbench region.
- Free individual downloads are for personal, non-commercial use and require visible attribution. Commercial projects require a suitable license: Indie is $49 lifetime for businesses below $200k annual revenue; Business is $199 lifetime below $2M; Enterprise applies above $2M annual revenue or 50+ employees. No tier permits standalone asset resale or redistribution.
- Before downloading or incorporating a paid asset, confirm that the project already has a compatible Thiings license or obtain the user's authorization to purchase. Do not treat a free preview as commercial clearance.

## Project Mapping

- AI products: use Lobe Icons for model selection, provider configuration, AI integration cards, connector directories, and "connected to" states.
- Creator, short-video, and AI commerce products: use Thiings for workflow entry cards, empty states, onboarding steps, benefit cards, and promotional/editorial modules. Use Lobe Icons when those same products name an AI model or provider.
- Production workbenches and management dashboards: preserve information density. Use standard UI icons for tools; introduce Thiings only when the existing layout has a genuine empty state or a bounded feature visual and verify it does not displace the core workspace.
- Short-drama asset production: do not substitute Thiings for character references, scene masters, first frames, or generated video assets. Those remain owned by the relevant production and image-generation routes.

## Verification

Verify the selected asset is semantically correct, licensed for the intended release, legible at its rendered size, and accessible with a text label or alternative text when it carries information. For an approved website surface, compare the real page at desktop and 390px widths after insertion; keep the prior composition when an added visual harms workspace density, hierarchy, or responsive overflow.
