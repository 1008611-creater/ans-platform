---
name: douyin-publish-operator
description: name: douyin-publish-operator
---

---
name: douyin-publish-operator
description: name: douyin-publish-operator
---

---
name: douyin-publish-operator
description: Operate Douyin Creator Center upload and publishing preparation with browser assistance, including opening the upload page, handling file upload, filling title/caption/tags/cover settings, checking platform prompts, and stopping for final user confirmation. Use when the user asks Codex to upload, prepare, schedule, or publish a Douyin video.
---

# Douyin Publish Operator

## Overview

Use this skill for the browser-facing part of Douyin publishing. Prepare the post as far as possible, then stop for explicit user confirmation before final publish or schedule.

## Browser Flow

1. Open `https://creator.douyin.com/creator-micro/content/upload` in the in-app browser when available.
2. If login, QR scan, phone verification, CAPTCHA, or credential entry appears, pause and ask the user to complete it.
3. Confirm the video file path exists before upload.
4. Upload the video and wait for platform processing.
5. Read current page prompts for file size, duration, aspect ratio, quality, and rule warnings. Treat page prompts as fresher than baked-in knowledge.
6. Fill title/caption/tags/cover/settings from the package supplied by `$douyin-caption-cover`.
7. Review all visible warnings and settings.
8. Ask the user for final confirmation before clicking publish, schedule, or any account-impacting button.

## Safety Rules

- Never publish, schedule, delete, bind accounts, change monetization, or buy promotion without explicit confirmation.
- Do not enter passwords, SMS codes, identity information, or payment details for the user.
- Do not bypass platform restrictions, watermark/copyright warnings, or moderation prompts.
- If a selector or page state is uncertain, take a screenshot or DOM snapshot before interacting.

## Handoff Output

Use `references/publish-checklist.md` and report:

```markdown
上传页面：
视频文件：
上传状态：
已填写：
平台提示/风险：
发布设置：
等待用户确认：
```
