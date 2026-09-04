# Source Utilization

Use this file when external prompt bases should improve the prompt instead of merely being listed.

## When To Pull External Bases

Pull external prompt bases when:
- the user asks for the best or highest-quality prompt workflow;
- the prompt will become a reusable skill, template, prompt pack, or production asset;
- the first output failed because it looked fake, generic, noisy, or platform-native quality was poor;
- a visual style, model capability, or platform convention may have changed;
- the prompt must cover an unfamiliar domain.

Do not pull external bases for tiny one-off edits unless the prompt quality is the task.

## Source Roles

### YouMind-OpenLab `awesome-gpt-image-2`

Use as a broad Image2 case bank.

Best for:
- finding successful visual directions;
- comparing many concrete outputs;
- extracting subject, composition, layout, material, lighting, and constraint patterns;
- discovering what current GPT Image 2 users are actually producing.

Do not use it as:
- a direct route controller;
- proof that a prompt is stable without running or scoring outputs;
- a source for platform-native Xiaohongshu strategy.

Extraction method:
1. Find 3-5 close cases by output type.
2. Extract visible success variables, not just wording.
3. Translate cases into the local prompt contract.
4. Add negative constraints for known failure points.

### freestylefly `awesome-gpt-image-2`

Use as the structured image template base behind `gpt-image-2-style-library`.

Best for:
- template category selection;
- visual style and scene tags;
- common pitfalls;
- repeatable prompt shapes for product, poster, UI, infographic, photo, character, scene, history, and document outputs.

Do not use it as:
- a content strategy layer;
- a replacement for platform or legal/factual review;
- a reason to generate precise Chinese text inside image models.

Extraction method:
1. Select the nearest template.
2. Use template guidance and pitfalls.
3. Fill the prompt contract with concrete scene and quality details.
4. Hand off platform text to local overlay when text accuracy matters.

### DAIR.AI Prompt Engineering Guide

Use as the general reasoning and prompt-engineering base.

Best for:
- decomposition;
- few-shot examples;
- structured outputs;
- evaluation loops;
- retrieval/source-grounded tasks;
- agent and tool-use prompt design.

Do not use it as:
- a visual aesthetics source;
- a substitute for domain expertise;
- a reason to expose private chain-of-thought or verbose reasoning in final outputs.

Extraction method:
1. Identify the task type: classification, generation, extraction, tool use, evaluation, or multi-step workflow.
2. Choose a simple technique: role/context, examples, schema, checklist, eval rubric, or retrieval.
3. Keep the final user-facing prompt short enough to execute.

### `f/prompts.chat`

Use as a community role and task prompt example bank.

Best for:
- role framing;
- seeing common task structures;
- finding edge-case checklist ideas.

Do not use it as:
- an authoritative quality source;
- a direct copy source;
- the default for professional, legal, financial, medical, or platform-native content.

Extraction method:
1. Borrow only the useful role or checklist pattern.
2. Rewrite into the local prompt contract.
3. Remove generic "act as" padding.
4. Add task-specific evidence and quality gates.

## Synthesis Loop

For production prompts:

1. Route the task to the local champion skill stack.
2. Pull the best-fit external base only if it adds a distinct advantage.
3. Extract patterns, not prose.
4. Convert extracted patterns into a local prompt contract.
5. Add negative constraints from the user's prior failures and the selected skill's guardrails.
6. Define the quality gate before generation.
7. After output, score and record any reusable lesson.

## Promotion Rule

Only promote an external pattern into a local skill when it has:
- repeated usefulness across at least two tasks, or one high-value task;
- clear failure modes;
- a concise reusable contract;
- no conflict with existing higher-priority local skills.
