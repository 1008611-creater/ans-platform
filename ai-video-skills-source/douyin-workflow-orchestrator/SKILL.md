---
name: douyin-workflow-orchestrator
description: name: douyin-workflow-orchestrator
---

---
name: douyin-workflow-orchestrator
description: name: douyin-workflow-orchestrator
---

---
name: douyin-workflow-orchestrator
description: Coordinate an end-to-end Douyin content workflow from choosing a video or topic, planning production, preparing captions/covers, and operating the Creator Center upload page. Use when the user asks for a full Douyin publishing workflow, wants Codex to manage multiple Douyin skills, or says to select/make/upload/publish a Douyin video.
---

# Douyin Workflow Orchestrator

## Overview

Use this skill as the top-level controller for a Douyin publishing session. Keep the workflow moving, delegate each phase to the matching Douyin skill, and preserve clear approval gates before live account actions.

## Workflow

1. Intake the user's current goal and available material.
   - Ask only for missing blockers: target account/persona, video file path, product/service, audience, offer, deadline, and whether publishing can proceed.
   - If the user has already opened Douyin Creator Center, continue from the visible page state.
2. Select the strongest idea or source video.
   - Use `$douyin-video-selection` for raw material scoring, trend angle selection, and shortlist creation.
   - Use `$douyin-fruit-commerce-strategy` when the account/product is fruit commerce, orchard proof, fruit host videos, or fruit livestream selling.
3. Convert the chosen idea into a production plan.
   - Use `$douyin-video-production` for editing beats, captions/subtitles, asset needs, and export checks.
   - Use `$runninghub-fruit-commerce-video` when the video is produced with the user's RunningHub Wan2.2 Animate or LTX2.3 digital-human workflows.
4. Build the publishing package.
   - Use `$douyin-caption-cover` for title, description, hashtags, cover frame/text, and variants.
5. Operate the upload page.
   - Use `$douyin-publish-operator` for browser upload, field filling, compliance checks, and final review.

## Approval Gates

- Never click final publish, schedule, paid promotion, delete, or account-setting actions without explicit user confirmation at that moment.
- Let the user handle login, QR scan, phone verification, 2FA, CAPTCHA, and any sensitive account credential entry.
- If the workflow requires online trend or rule research, prefer `jina-search` when available. Use ordinary browsing only if the user explicitly asks or Jina is unavailable.

## Output Contract

Maintain a single session brief:

```markdown
目标账号/人设：
视频主题：
目标受众：
核心卖点/情绪：
选用视频/素材：
剪辑状态：
发布标题：
正文：
话题：
封面方案：
发布设置：
待用户确认：
```

Read `references/workflow-map.md` when the workflow has more than one unresolved phase or when another agent needs a handoff summary.
