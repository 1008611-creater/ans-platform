---
name: kuaishou-video-scout
description: name: kuaishou-video-scout
---

---
name: kuaishou-video-scout
description: name: kuaishou-video-scout
---

---
name: kuaishou-video-scout
description: Select and prioritize Kuaishou video topics, source clips, remake candidates, and publish opportunities. Use when the user needs help choosing which video to make or post, comparing existing footage, mining ideas, evaluating trend fit, or building a Kuaishou content queue before production.
---

# Kuaishou Video Scout

## Purpose

Choose the video worth making now. Optimize for fast production, clear viewer benefit, and platform fit.

## Intake

Collect or infer:

- Account positioning and target audience
- Monetization goal or conversion path
- Available footage, screenshots, product images, scripts, links, or competitor examples
- Constraints: deadline, editing capacity, risk tolerance, required language, and whether web research is allowed

## Selection Workflow

1. **Inventory material**
   - List each candidate asset with format, duration, visual strength, uniqueness, and missing pieces.
   - Mark assets that can publish today versus assets requiring a new edit.

2. **Score ideas**
   - Score each candidate from 1-5 on:
     - Hook strength
     - Audience pain/desire
     - Proof or visual clarity
     - Production speed
     - Compliance risk
     - Fit with account positioning
   - Prefer fast, concrete, low-risk ideas over vague high-effort concepts.

3. **Pick primary and backup**
   - Select one primary idea and one backup.
   - Explain the winning reason in one sentence.
   - State the first 3 seconds hook before moving into production.

4. **Hand off**
   - If the selected idea needs a script or edit plan, hand off to `$kuaishou-video-maker`.
   - If a finished video already exists, hand off to `$kuaishou-publish-packager`.

## Research Rules

- For web search or page reading, use `jina-search` by default.
- Look for recent platform trends, user comments, competitor hooks, and recurring objections.
- Do not copy competitor copy or footage; extract structure, angle, and viewer promise.

## Output Shape

```text
候选清单:
1. ...

评分:
选中:
备选:
开头3秒:
所需素材:
下一步:
```

## References

- Read `references/scoring.md` when comparing more than three candidates or when the user asks for a content queue.
