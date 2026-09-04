---
name: douyin-video-selection
description: name: douyin-video-selection
---

---
name: douyin-video-selection
description: name: douyin-video-selection
---

---
name: douyin-video-selection
description: Select and prioritize Douyin video ideas, source videos, product angles, hooks, and reusable footage from user materials or market research. Use when the user asks which video to make, which draft to publish, how to choose a topic, how to score raw clips, or how to find a Douyin content angle before production.
---

# Douyin Video Selection

## Overview

Use this skill to decide what is worth making or publishing before spending editing time. Favor clips with a clear first-three-second hook, one emotional/job-to-be-done promise, and enough visual proof to support the copy.

## Intake

Collect or infer:

- Account persona and commercial goal.
- Target viewer and pain point.
- Available footage, draft videos, links, screenshots, or notes.
- Product/service/offer constraints.
- Platform risk areas: medical, finance, exaggerated income claims, copyrighted assets, minors, sensitive identity, or unsafe behavior.

If the user asks for market or trend research, use `jina-search` first when available. Keep research focused: one query per angle, prioritize official or high-signal pages, and return the reasoning rather than large copied text.

## Selection Method

1. List each candidate video or idea in one line.
2. Score with `references/selection-rubric.md`.
3. Pick one primary candidate and one backup.
4. Convert the winner into a production brief:

```markdown
选中素材：
推荐角度：
前三秒钩子：
观众痛点：
视频证明点：
剪辑方向：
风险/缺口：
下一步交给：
```

## Decision Rules

- Prefer specific scenes over abstract talking points.
- Prefer proof visible in the footage over claims that require explanation.
- Prefer one promise per video; split extra promises into future videos.
- Reject clips whose best caption would misrepresent what the viewer will see.
- If no candidate is strong enough, propose the minimum reshoot or missing asset list.
