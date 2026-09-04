---
name: image2-boundary-lab
description: name: image2-boundary-lab
---

---
name: image2-boundary-lab
description: name: image2-boundary-lab
---

---
name: image2-boundary-lab
description: Build a publishable GPT Image 2 / Image2 capability atlas, visual taxonomy, and repeatable prompt system. Use when the user wants to know what Image2 can make, classify output types, compare abilities, visualize stable and fragile zones, create replicable prompt recipes, score examples, or turn findings into posts, notes, galleries, and reusable prompt packs.
---

# Image2 Boundary Lab

## Overview

Use this skill to turn Image2 outputs into a capability map: what it can make, which types are worth publishing, which prompts are easy to replicate, and where the visible failure boundaries are. The goal is a practical atlas, not isolated prompt polishing.

## Output System

For broad capability mapping, produce four linked artifacts:

1. Capability taxonomy: output types grouped by use case, such as character, product, poster, text, UI, multi-reference, and video first frame.
2. Visual map: a table or dashboard showing stability, difficulty, commercial value, review risk, and recommended publishing angle.
3. Replication recipe: reference image role, prompt skeleton, variable controls, negative constraints, and scoring checklist.
4. Publish package: title, gallery structure, prompt excerpt, failure notes, and next-test teaser.

## Core Workflow

1. Define the boundary thesis
   - Write one sentence: "This test checks whether Image2 can [ability] under [constraint]."
   - Name the expected risk: identity drift, text errors, layout collapse, product deformation, style override, moderation block, or video first-frame ambiguity.

2. Build a small test grid
   - Keep one invariant prompt.
   - Change only one variable per row when possible.
   - Record model/channel, date, reference images, aspect ratio, resolution, and output count.

3. Write generation prompts
   - Put hard constraints first: reference role, identity/product/text preservation, output type, aspect ratio.
   - Then describe scene, composition, lighting, camera, style, and exclusions.
   - For image-to-image, explicitly bind reference roles: "Image 1 identity, Image 2 pose, Image 3 style".
   - Avoid conflicting requests such as "exact identity" plus heavy stylization, or "broadcast realism" plus brand-specific logos.

4. Score outputs
   - Score each result from 1 to 5:
     - 5: publishable as-is.
     - 4: strong, only minor retouch needed.
     - 3: usable insight, but not a hero result.
     - 2: clear failure with a useful lesson.
     - 1: blocked, unusable, or unrelated.
   - Use dimensions relevant to the test: identity, prompt adherence, composition, text accuracy, product preservation, commercial usability, and review risk.

5. Extract the boundary conclusion
   - Use careful language: "observed in this run", "stable under", "fragile when", "not recommended for".
   - Separate model capability from prompt quality and source-image quality.

6. Package for publishing
   - Include a hook, test setup, input/output layout, prompt excerpt, result table, failure notes, and practical takeaway.
   - Keep prompt excerpts clean enough for readers to reuse.

For category atlas work, start with the taxonomy first, then run 3 to 6 tests per category. Do not overfit the atlas to one lucky output.

## Common Experiment Axes

- Capability atlas: classify what kind of image is being made, why someone would reuse it, and how hard it is to reproduce.
- Character identity reference: test whether the same face survives changes in distance, angle, lighting, outfit, expression, and scene.
- Multi-reference binding: test whether Image2 respects separate roles for identity, pose, style, and background.
- Text rendering: test short Chinese, short English, mixed language, packaging labels, poster headlines, and dense typography.
- Product/commercial image: test product shape, label accuracy, material texture, lighting, background replacement, and hand interaction.
- Poster/layout: test hierarchy, negative space, text placement, subject overlap, and mobile readability.
- UI/mockup: test component structure, readable copy, realistic device screens, and visual consistency.
- Video first frame: test whether an image has clear action affordance, stable subject, simple background, and enough room for motion.
- Review boundary: test compliant wording and avoid attempts to bypass platform safety systems.

## Reference Files

- Read `references/capability-taxonomy.md` when building an Image2 ability map or dashboard.
- Read `references/experiment-templates.md` when building a test matrix or prompt pack.
- Read `references/publish-formats.md` when turning results into Xiaohongshu, article, or short-video copy.

## Guardrails

- Do not help bypass safety review. If a prompt is blocked, rewrite it into a compliant test and explain the likely trigger at a high level.
- For real people or identity references, assume the image must be user-supplied or consented. Avoid celebrity likeness claims and deceptive identity use.
- Do not overclaim. Boundary conclusions should be based on observed outputs, not universal claims.
- Keep a record of model/channel/date so future reruns can be compared fairly.
