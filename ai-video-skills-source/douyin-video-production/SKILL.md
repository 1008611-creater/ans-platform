---
name: douyin-video-production
description: name: douyin-video-production
---

---
name: douyin-video-production
description: name: douyin-video-production
---

---
name: douyin-video-production
description: Turn a selected Douyin topic, raw footage, or draft video into a practical production and editing plan with hook, beat sheet, subtitles, asset list, quality checks, and export guidance. Use when the user needs to make, revise, polish, or brief a Douyin short video before upload.
---

# Douyin Video Production

## Overview

Use this skill after an idea or source video is selected. Produce an editing-ready plan that a human editor, Jianying/CapCut workflow, or AI video tool can follow.

## Production Flow

1. Define the core promise in one sentence.
2. Write the first-three-second hook.
3. Build a beat sheet with timestamps or scene order.
4. Specify captions, on-screen text, B-roll, sound/music mood, and visual emphasis.
5. Identify missing shots, voiceover, product proof, or screenshots.
6. Provide export and upload-readiness checks.

If the user asks to generate an AI video, use available video-generation skills such as `$pexoai-agent`, `$cinematic-video-prompt`, or domain-specific video prompt skills when they match the request. Keep this skill responsible for the Douyin production brief and review criteria.

## Editing Principles

- Put the strongest visible result before context.
- Remove slow setup unless it creates curiosity.
- Use subtitles for all important speech or claims.
- Keep each screen text line short enough for mobile reading.
- Use one CTA style: comment, follow, private message, buy, or save; do not stack all of them.
- Match music, pacing, and transitions to the account persona rather than generic hype.

## Output Contract

Use `references/production-brief-template.md` for the final brief. End with:

```markdown
可以直接制作：
还缺素材：
发布前必须复核：
下一步交给：
```
