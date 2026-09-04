---
name: ip-video-topic-selection
description: name: ip-video-topic-selection
---

---
name: ip-video-topic-selection
description: name: ip-video-topic-selection
---

---
name: ip-video-topic-selection
description: Use when selecting, reselecting, scoring, or explaining topics for the user's long-term AI information-gap IP and digital-human videos, especially when evaluating GitHub/open-source AI projects, AI tools,热点,候选选题卡,视频方向, or whether a topic is worth producing before Window B.
---

# IP Video Topic Selection

Use this skill before producing digital-human videos for the user's long-term AI IP. The goal is to avoid making videos just because a GitHub repo is hot, and instead choose topics that have viewer pain, visible proof, user-fit, and commercial follow-through.

## Default Workflow

1. Treat every link, repo,公众号文章, B站视频, YouTube video, Product Hunt page, X/TG/Discord signal, or 闲鱼 listing as a signal, not final truth.
2. Prefer `jina-search` for web discovery/reading. Use official upstream sources, GitHub API, product docs, and primary pages for factual claims.
3. Score each candidate with the 100-point rubric below.
4. Reject or downgrade topics that cannot be visually proven in a short video.
5. Output a candidate card under `D:\codex-work\ip\output\demand_radar\candidate-XXX-*.md`.
6. Do not move to Window B production until the user confirms the selected candidate or explicitly asks to proceed.

## 100-Point Rubric

```text
观众痛点强度: /20
可视化证明: /20
上游热度与新鲜度: /15
用户资产贴合: /15
信息差/商业化: /10
前三秒钩子: /10
生产可行性: /5
合规与夸大风险: /5
score: /100
```

Scoring guidance:

- Viewer pain: the target viewer should know within 3 seconds why the topic matters.
- Visual proof: the video should show real product behavior, before/after, data, workflow, result pages, screen recording, generated assets, or comparisons.
- Upstream heat: include current official/GitHub/product/community evidence, not only middle-layer articles.
- User fit: prefer topics connected to the user's current skills: Codex, Obsidian, memory layer, Jina research, Image2, Seedance/Wan video models, digital-human production, browser automation, and publishing workflows.
- Commercial follow-through: prefer topics that can become tutorials, service packages,闲鱼 listings, consulting, or future videos.
- Risk: subtract for income promises, privacy, unauthorized scraping, platform ToS issues, misleading demos, license uncertainty, or overclaiming benchmarks.

## Hard Downgrades

- Only GitHub stars, no viewer pain: max 60.
- No visual proof and relies on spoken explanation only: max 65.
- Can only be made as static Image2 slide rotation: max 60 and do not enter public video production.
- Cannot state a clear first-3-second hook: max 70.
- Project quality, license, privacy, or claims are not checked: do not produce a public version.

## Candidate Card Sections

Use the project format:

```text
选题编号:
热点问题:
一句话判断:
上游证据:
中游传播信号:
下游需求信号:
用户知识库连接:
用户资产连接:
适合讲给谁:
口播核心观点:
视频脚本角度:
闲鱼机会:
新评分:
风险边界:
下一步搜索:
下一步制作:
```

## Production Implications

When a candidate passes, include a visual plan:

- Real evidence screen recording for proof.
- Image2 assets for valuable explanatory diagrams, comparisons, or conceptual frames.
- Seedance2/Wan2.2/other video models only when continuous motion, abstract processes, or cinematic support are needed.
- Digital-human layout plan with enough on-screen presence.
- Subtitles as comprehension design, not default captions.

If the topic is good but the repo/tool is not attractive enough, reframe it as:

- a trend comparison,
- a user workflow case study,
- a "what this teaches us" judgment video,
- or a supporting evidence segment inside a stronger topic.

