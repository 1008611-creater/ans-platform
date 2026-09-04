---
name: kuaishou-video-maker
description: name: kuaishou-video-maker
---

---
name: kuaishou-video-maker
description: name: kuaishou-video-maker
---

---
name: kuaishou-video-maker
description: Convert a selected Kuaishou topic or raw material into a short-video production plan. Use when Codex needs to write hooks, scripts, voiceover, shot lists, editing instructions, image/video generation prompts, subtitles, QA checks, or a final cut checklist before publishing on Kuaishou.
---

# Kuaishou Video Maker

## Purpose

Turn an approved topic into a Kuaishou-ready vertical video plan. Keep the result practical enough that the user or another AI video tool can produce it immediately.

## Production Workflow

1. **Define the promise**
   - Write the one-sentence viewer promise.
   - Decide whether the video is informational, proof/demo, entertainment, commerce, account-building, or conversion-focused.

2. **Build the structure**
   - Opening 0-3 seconds: strong visual or text hook.
   - Body: 2-4 beats, each with one point and one visual.
   - Ending: follow, comment, save, click, or soft conversion.

3. **Create production assets**
   - Script: spoken lines or on-screen text.
   - Shot list: shot, visual source, duration, motion, caption.
   - Edit notes: pace, crop, zoom, transitions, music/sound direction.
   - Subtitle notes: line breaks, emphasis words, and forbidden clutter.
   - Generation prompts when needed; use existing video/image skills if the task is AI-generated media.

4. **Quality gate**
   - Check that the first frame explains what the video is about.
   - Confirm the hook is visible without audio.
   - Remove unsupported claims, unverifiable before/after claims, and misleading scarcity.
   - Keep short videos focused; one video should not carry three unrelated promises.

5. **Hand off**
   - If the video is finished, hand off to `$kuaishou-publish-packager`.
   - If production is blocked, list exactly which asset is missing.

## Output Shape

```text
视频定位:
时长:
开头3秒:
脚本:
分镜:
剪辑说明:
字幕:
素材清单:
质检:
下一步:
```

## References

- Read `references/video-templates.md` when the user asks for script variants, commerce video, explainer video, or remake structure.
