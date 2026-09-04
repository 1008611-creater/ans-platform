---
name: image2-direct
description: name: image2-direct
---

---
name: image2-direct
description: name: image2-direct
---

---
name: image2-direct
description: Generate raster images through Codex's built-in direct image generation tool, especially when the user asks for "image2", "GPT Plus/ChatGPT web-style direct image generation", "网页端那样直接出图", anime IP character explorations, prompt variants, or quick visual concept batches without RunningHub or an external API key.
---

# Image2 Direct

## Overview

Use Codex's built-in `image_gen` tool for direct image generation, similar to a ChatGPT-style visual draft workflow. This skill is a workflow wrapper: it shapes prompts, organizes variants, and keeps outputs useful for iteration; it does not automate a ChatGPT Plus web account or bypass web UI limits.

## Boundaries

- Use the built-in `image_gen` tool by default. It does not require `OPENAI_API_KEY`, `RUNNINGHUB_API_KEY`, or browser automation.
- Do not claim access to a user's ChatGPT Plus free image quota as a programmable backend.
- Do not simulate web login, scrape private ChatGPT sessions, or use unofficial account automation.
- Do not use RunningHub for this skill. If the user explicitly asks for RunningHub, switch to the relevant RunningHub skill instead and honor its channel constraints.
- If the built-in image tool is unavailable in the current environment, explain that this skill can only provide prompt preparation and workflow structure here.

## Workflow

1. Clarify whether the request is preview-only or should be saved into the current project.
2. Preserve the user's creative direction. Strengthen ambiguity with guiding language instead of over-specifying fixed content.
3. For batches, create one focused prompt per variant. Use separate `image_gen` calls rather than asking one call for unrelated concepts.
4. For IP exploration, vary only one or two axes per image, such as hair silhouette, costume symbols, props, palette, facial impression, or mascot readability.
5. If the user asks for 4K, include explicit production intent in the prompt: `4K-ready`, `high-resolution character key visual`, `portrait-oriented`, or another format-specific phrase. Do not invent unsupported tool parameters.
6. Generate directly with `image_gen`.
7. For project-bound assets, move or copy final selected images into a workspace output folder when local files are available; otherwise render them inline and keep prompt files in the project for repeatability.
8. Report concise paths and the prompt set after generation, unless the active image tool policy says not to speak after generation.

## Prompt Style

Prefer:
- "lean toward", "suggest", "with hints of", "explore", "implied", "recognizable silhouette", "repeatable visual motif", "long-term IP symbol potential"
- "anime character key visual", "二次元角色立绘", "VTuber-ready design language", "clean cel-shaded rendering", "expressive but not over-designed"
- "distinct hair silhouette", "memorable costume signs", "small symbolic accessories", "brandable shape language"

Avoid:
- Overly photorealistic wording unless the user asks for it.
- Fixed lore details that collapse exploration too early.
- Too many unrelated props, logos, text labels, or exact garment descriptions in one prompt.
- Claims that the output is commercially final when the user is still exploring.

## IP Exploration Template

Use this scaffold for anime/IP character batches:

```text
Use case: stylized-concept
Asset type: anime IP character exploration, 4K-ready key visual
Primary request: <one-line creative goal>
Character direction: <core personality, age impression, energy, brand role>
Exploration focus: <hair silhouette | costume symbols | props | balanced IP readability>
Visual language: suggestive anime design, clean cel-shaded rendering, recognizable silhouette, memorable but flexible motifs
Brand/IP signals: <2-4 recurring motifs, described as hints rather than fixed objects>
Composition: full-body or three-quarter character design view, clear readable pose, generous negative space
Color mood: <palette direction>
Constraints: avoid photorealism, avoid over-detailed cosplay, avoid hard text/logos unless requested, avoid copying existing characters
```

## Batch Naming

For project work, create a dated folder such as:

```text
outputs/<project-or-character>-image2-direct-YYYYMMDD/
  prompts/
  images/
  logs/
```

Name prompts and images with stable variant numbers:

```text
01-hair-silhouette
02-costume-symbols
03-props-mascot
04-balanced-ip
```

Keep the final prompt text with the output folder so the user can compare versions and rerun promising directions later.
