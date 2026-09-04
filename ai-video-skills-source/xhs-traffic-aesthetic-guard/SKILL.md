---
name: xhs-traffic-aesthetic-guard
description: name: xhs-traffic-aesthetic-guard
---

---
name: xhs-traffic-aesthetic-guard
description: Guardrail for Xiaohongshu traffic-first image notes. Use when creating, reviewing, or revising Xiaohongshu covers, image cards, note copy, or image2 prompts where click-through, platform-native feel, and anti-AI aesthetic quality matter. Trigger this before publishing any Xiaohongshu image note, especially when the draft risks turning into PPT-style info cards, AI-flavored self-explaining text, public boundary disclaimers, or mismatched counts that do not match the visual content.
---

## 硬性提示词语言规则

- 本 skill 产出的所有提示词、负向词、镜头生成指令、图像/视频模型 prompt，默认必须用中文撰写。
- 只有用户明确要求英文，或目标平台/API 的固定字段、参数名、模型保留词必须使用英文时，才保留英文；场景、动作、构图、质感、限制条件仍用中文。
- 不要先写英文提示词再附中文翻译；直接输出中文提示词。

# XHS Traffic Aesthetic Guard

Use this skill before showing Xiaohongshu image-note drafts to the user.

Its job is simple:

1. Kill AI-flavored wording.
2. Kill PPT-card layouts.
3. Kill public-facing disclaimer cards.
4. Catch count mismatches and fake structure.
5. Force platform-native, traffic-first judgment.

## Workflow

### 1. Check the role of each image

For Xiaohongshu traffic-first image notes, enforce this default structure:

- Image 1: click
- Image 2: save
- Image 3: result or proof

Do not add a fourth "boundary" image unless the user explicitly asks for a compliance card and accepts the traffic tradeoff.

Zero-view/startup recovery exception:

- A 5-image sequence is allowed when the goal is account relabeling or low-distribution recovery.
- The only allowed roles are: click, conflict, checklist, half-filled proof, one-keyword comment.
- Image 4 must be a handled or half-filled example, not an empty table.
- Image 5 must contain one low-pressure comment keyword, not multiple CTAs.
- Boundary/privacy/compliance explanations still stay out of public image cards.

### 2. Scan for banned wording

If the image text contains any sentence that explains the designer's intent, cut it.

Immediate rejects:

- any sentence that explains the layout's own role
- any sentence that says what an image is "responsible for"
- any sentence that sounds like an AI annotating its own design

Read `references/failure-cases.md` for the exact banned Chinese examples.

The image must sound like a real creator talking to a real viewer, not like an AI annotating its own layout.

### 3. Scan for public-disclaimer leakage

If the draft puts boundary disclaimers on public cards, reject and move them to private reply or pre-sale explanation.

Read `references/failure-cases.md` for the exact banned Chinese examples.

These lines reduce click and save intent when exposed too early.

### 4. Check count integrity

If the draft says a fixed count such as:

- 8 items
- 4 columns
- 3 steps

then the visual content must match exactly.

If the count and the layout differ, reject the draft without compromise.

### 5. Check platform-native feel

Reject if the note looks like:

- a training slide
- a consulting service brochure
- a product spec sheet
- a brand presentation

Prefer:

- news-title-board cover
- desk or document realism
- obvious viewer mistake or risk
- short phrases a real person would write

When the draft is too abstract, over-designed, or too much like a service deck,
read `references/positive-patterns.md` and pull it back toward real desk, paper,
phone, printout, sticky-note, or handled-document realism.

### 6. Use the phrase test

For each visible line, ask:

`Would a real Xiaohongshu creator write this exact line on the image?`

If the answer is no, cut it.

Good:

- short, human, direct, native-feeling image text
- a province or audience marker
- one mistake and one action

Bad:

- design-intent narration
- tutorial-sounding image text
- product-manager or customer-service voice on the image

## Hard Rules

### Rule 1: First image only solves click

The cover should contain:

- audience or province
- one wrong move
- one action

Nothing else is required.

### Rule 2: Second image only solves save

Use:

- short checklist words
- short mistake list
- short before/after sequence

Do not use long explanation paragraphs.

### Rule 3: Third image only solves proof

Show:

- result
- deliverable
- visual proof

Do not explain the system or the designer's reasoning.

### Rule 3.5: Recovery carousels must not become mini decks

When using the 5-image recovery structure, reject if images 2-5 become a slide deck of long explanations.

Allowed:

- one conflict line
- one 3-5 item checklist
- one half-filled table or document
- one comment keyword

Rejected:

- role labels like `第二张只负责收藏`
- public disclaimer cards
- six or more cards of service explanation
- empty tables presented as proof

### Rule 4: Prefer handled-document realism

Prefer proof that looks touched by a real person:

- printed sheets
- red-pen marks
- laptop edge
- phone question
- sticky-note reminder
- filled or half-filled table

Do not default to clean floating UI cards when the user needs trust and save intent.

### Rule 4.5: Product notes test visual directions before expanding the carousel

When a product, outfit, or physical result needs a first visual direction—or the user asks to compare effects—use the same real reference material to make four small, distinct trials before writing the full carousel:

1. **动态穿搭/使用场景**: let the product move naturally in a real setting; use it to test the click cover.
2. **材质或细节种草**: bring the product's texture, structure, and use details close; use it to test save intent.
3. **店主或使用者实拍**: let a phone, hand, desk, or shop edge appear only as a foreground cue; use it to test trust and real-work feeling.
4. **自然对比**: place the product itself as a small foreground clue and the worn/used result as the main visual; use it to test whether the viewer can see the difference without a card layout.

Across all four trials, keep the real product, outfit, or use result as at least 70% of the frame. Give each image one direct, short Chinese title and no explanatory small text, subtitle, UI stack, floating screenshot, price, sales, or invented performance data. Select the visual direction with the clearest product, strongest first glance, and most native creator feel before expanding it into the full note. Do not use rigid split screens, grids, or multiple card blocks merely to show comparison.

### Rule 5: Use native Chinese, not polished AI Chinese

Visible text should feel like something a real creator would actually put on the image.

Good sources of phrasing:

- one wrong move
- one action
- one field checklist
- one comment keyword

If the Chinese text may come out wrong or too synthetic inside image generation,
prefer local overlay or HTML/CSS typesetting.

## Failure Memory

Read [references/failure-cases.md](references/failure-cases.md) when revising a draft that already feels AI-generated, brochure-like, or over-explained.

Read [references/positive-patterns.md](references/positive-patterns.md) when you need a stronger visual direction, not just a blocker list.

## Output Contract

When this skill is used during review, return:

1. `Pass` or `Reject`
2. Top 3 reasons only
3. Exact visible text that must be cut
4. A tighter replacement direction in one short block

Do not soften the judgment.
