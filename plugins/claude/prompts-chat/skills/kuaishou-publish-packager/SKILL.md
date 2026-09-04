---
name: kuaishou-publish-packager
description: name: kuaishou-publish-packager
---

---
name: kuaishou-publish-packager
description: name: kuaishou-publish-packager
---

---
name: kuaishou-publish-packager
description: Package a finished video for Kuaishou publishing. Use when Codex needs to create or improve titles, captions, hashtags, cover text, cover-frame selection, first comments, publish timing, category/account fit, and final pre-upload copy for Kuaishou short videos.
---

# Kuaishou Publish Packager

## Purpose

Prepare the finished video so it is clickable, truthful, and easy to publish. The packaging must match the actual video content.

## Packaging Workflow

1. **Read the video**
   - Use the provided video, transcript, screenshots, or user summary.
   - Identify the strongest visual frame, core promise, audience, and conversion target.

2. **Create title options**
   - Produce 5-8 title options.
   - Mix direct benefit, curiosity, problem/solution, proof, and question formats.
   - Keep titles natural for Kuaishou and avoid exaggerated claims.

3. **Create cover plan**
   - Choose cover frame criteria: face/product/result/problem/action moment.
   - Write 2-4 short cover-text options.
   - Keep cover text readable on mobile; prefer 4-10 Chinese characters per line.

4. **Write caption and tags**
   - Caption should expand the hook, add context, and ask for one simple action.
   - Use tags that match the real topic. Avoid stuffing unrelated hot tags.
   - Include location, product name, or audience keyword only when relevant.

5. **Publish settings**
   - Recommend visibility, timing, whether to allow comments, and whether to pin or add a first comment.
   - Prepare an upload sheet for `$kuaishou-publisher`.

## Output Shape

```text
推荐标题:
备选标题:
封面帧:
封面字:
正文:
话题:
第一条评论:
发布时间:
发布设置:
风险检查:
```

## References

- Read `references/copy-patterns.md` when creating variants or optimizing weak copy.
