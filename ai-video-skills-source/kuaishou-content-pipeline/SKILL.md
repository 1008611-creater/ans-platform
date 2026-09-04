---
name: kuaishou-content-pipeline
description: name: kuaishou-content-pipeline
---

---
name: kuaishou-content-pipeline
description: name: kuaishou-content-pipeline
---

---
name: kuaishou-content-pipeline
description: End-to-end Kuaishou short-video operations workflow. Use when Codex needs to coordinate the full domestic Kuaishou process from topic/material selection, video planning or production, cover/title/caption packaging, browser/proxy preparation, upload, publish confirmation, and post-publish iteration.
---

# Kuaishou Content Pipeline

## Purpose

Run the whole Kuaishou content chain as an operator, not as isolated copywriting. Keep every stage tied to the account goal, the available material, and the publish deadline.

## Workflow

1. **Intake**
   - Capture account positioning, target viewer, product/service if any, publish goal, available video/materials, deadline, and whether final publish is approved.
   - If the user has no final video, route to `$kuaishou-video-scout` first.
   - If the user has a selected topic but no finished edit, route to `$kuaishou-video-maker`.
   - If the user has a finished video, route to `$kuaishou-publish-packager`.
   - If browser upload is needed, route to `$kuaishou-publisher`.

2. **Select**
   - Produce a short candidate list with score, audience hook, source material, risk, and required edits.
   - Pick one primary video and one backup.

3. **Make**
   - Turn the selected idea into a vertical-video plan: opening hook, shot list, voice/text script, edit notes, asset list, and QA checks.
   - Prefer existing user material. Only request generation or external research when the missing asset blocks production.

4. **Package**
   - Generate title options, cover text, caption, topic tags, first comment if useful, and publish settings.
   - Keep the title/cover promise aligned with the actual video. Avoid bait that the video cannot satisfy.

5. **Publish**
   - Prepare the browser and Kuaishou creator platform.
   - Upload, fill fields, set cover, and stop before the irreversible publish action unless the user has explicitly approved publishing this specific post.

6. **Record**
   - Save the final title, caption, cover text, tags, video filename, publish time, and URL or post ID when available.
   - Note what to measure next: 2-hour hold, completion rate, comments, follows, saves, and reposts.

## Decision Rules

- Prefer `DIRECT` or a domestic route for Kuaishou domains when the browser fails through overseas proxy nodes.
- Use the in-app Browser for visible local or browser tasks when it works; use a normal system browser/Playwright only when Kuaishou blocks the in-app browser.
- Use `jina-search` for web research by default when current trends, examples, or platform references are needed.
- Use existing specialized video or image skills when applicable, such as commerce-video prompt skills, image generation skills, or browser automation skills.
- Never click final publish without explicit user confirmation for that exact video and copy.

## Output Shape

Return a compact operation sheet:

```text
目标:
选题:
视频制作:
封面:
标题:
正文:
话题:
发布设置:
待用户确认:
发布后记录:
```

## References

- Read `references/checklist.md` when running a full multi-step publish operation or when the user asks for a repeatable SOP.
