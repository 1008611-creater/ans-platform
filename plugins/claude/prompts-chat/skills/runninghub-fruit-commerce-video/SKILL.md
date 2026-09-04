---
name: runninghub-fruit-commerce-video
description: name: runninghub-fruit-commerce-video
---

---
name: runninghub-fruit-commerce-video
description: Generate fruit commerce videos with the user's RunningHub custom workflows, especially Wan2.2 Animate action transfer workflow 2056752570487623681 and LTX2.3 ecommerce digital human workflow 2057025848015937537. Use when the user mentions RunningHub, 动作迁移, 数字人口播, LTX2.3高清超自然电商数字人, Wan2.2 Animate动作迁移V8, fruit sales videos, 美女主播吃水果跳舞, 果园产地, 果农, or wants Codex to run and summarize these video workflows into reusable skills.
---

## 冠军入口

先应用 [`runninghub-workflow-api`](../runninghub-workflow-api/SKILL.md) 的上传、消费级 Key、幂等、结算和回传规则；本 Skill 只维护水果电商工作流与中文创作约束。

## 硬性提示词语言规则

- 本 skill 产出的所有提示词、负向词、镜头生成指令、图像/视频模型 prompt，默认必须用中文撰写。
- 只有用户明确要求英文，或目标平台/API 的固定字段、参数名、模型保留词必须使用英文时，才保留英文；场景、动作、构图、质感、限制条件仍用中文。
- 不要先写英文提示词再附中文翻译；直接输出中文提示词。

# RunningHub Fruit Commerce Video

## Overview

Use this skill to run the user's two RunningHub video workflows for Douyin fruit commerce production:

- `Wan2.2 Animate动作迁移V8`: action/motion transfer for a fruit host or dancer.
- `LTX2.3高清超自然电商数字人`: digital-human oral sales videos with image and audio input.

Use `$douyin-fruit-commerce-strategy` first when the account angle or content column is unclear.

## Workflow Choice

- Use `wan-animate` when the user has a host image and a reference action/dance video.
- Use `ltx-digital-human` when the user has a host/scene image and a voice/audio file for lip-sync style speaking.
- For orchard/farmer proof clips, prefer real footage if available; use generated digital human only for bridge scenes, product explanation, or scripted sales pitch.

## Required Inputs

`wan-animate`:

- Reference person or character image.
- Motion reference video, ideally short and clean.
- Fruit/product context and intended scene.
- Aspect ratio, default `9:16`.

`ltx-digital-human`:

- First image / identity-scene image.
- Audio file for speech.
- Global identity/scene prompt.
- Local action prompt segments and segment lengths.

## Running

Use `scripts/runninghub_fruit_video.py`.

Dry run examples:

```powershell
python C:\Users\lsb\.codex\skills\runninghub-fruit-commerce-video\scripts\runninghub_fruit_video.py inspect --workflow ltx
python C:\Users\lsb\.codex\skills\runninghub-fruit-commerce-video\scripts\runninghub_fruit_video.py inspect --workflow wan
```

Submit examples:

```powershell
python C:\Users\lsb\.codex\skills\runninghub-fruit-commerce-video\scripts\runninghub_fruit_video.py run-ltx --image .\host.png --audio .\speech.mp3 --identity-prompt-file .\identity.txt --motion-prompts-file .\segments.txt --segment-lengths "120,120,120" --wait --download-dir .\outputs
python C:\Users\lsb\.codex\skills\runninghub-fruit-commerce-video\scripts\runninghub_fruit_video.py run-wan --image .\host.png --video .\dance.mp4 --positive-prompt "best quality, fruit livestream host" --wait --download-dir .\outputs
```

The script reads `RUNNINGHUB_API_KEY` from the environment or a nearby `.env`.

## Prompting Rules

Use `references/fruit-video-patterns.md` for content structures. Use `references/workflow-node-map.md` for node IDs.

Default creative direction:

- Keep fruit visible in the first two seconds.
- Do not let the host outshine the fruit for the whole clip.
- Use small believable movements: bite, cut, hand fruit to camera, dance step while holding fruit, point to basket, glance at orchard/box.
- Avoid exaggerated nutrition, guaranteed income, medical, or false origin claims.

## Skill Capture Rule

After every real RunningHub run, update `references/run-log.md` with:

- Workflow used.
- Inputs and node overrides.
- Result URLs and local downloads.
- What worked or failed.
- Prompt/parameter changes to keep for next time.

If a repeated pattern appears three times, add it to `references/fruit-video-patterns.md`.
