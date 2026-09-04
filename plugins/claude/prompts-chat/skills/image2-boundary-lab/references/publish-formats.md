# Publish Formats

## Xiaohongshu Post

Title patterns:

- `Image2能力边界测试｜人物参考图到底能保留到什么程度`
- `这次不是晒图，是测Image2的稳定区`
- `同一张参考图换6个场景，Image2哪里稳哪里漂`

Structure:

1. Hook: one sentence explaining why the test matters.
2. Test setup: model/channel/date, reference type, output count, aspect ratio.
3. What stayed fixed: identity, product, text, layout, or style.
4. What changed: scene, lighting, camera, pose, text density.
5. Result ranking: best, usable, failed.
6. Failure notes: identity drift, text missing, product deformation, moderation risk.
7. Reusable prompt excerpt.
8. Boundary conclusion.

Caption skeleton:

```text
这次不是晒图，是测边界。

我用同一张[参考图/产品图]做了[数量]组 Image2 测试，只改一个变量：[变量]。

观察下来：
1. 最稳的是：[条件]
2. 最容易漂的是：[条件]
3. 最值得继续做作品的是：[方向]

可复用提示词核心：
[短提示词]

结论：在这次测试里，Image2 对[能力]比较稳定，但遇到[风险条件]会明显变差。后面我会继续拆[下一条边界]。
```

## Long Article

Recommended sections:

- TL;DR: 3 bullet findings.
- Why this boundary matters.
- Setup: model, channel, date, references, parameters.
- Test matrix.
- Output gallery notes.
- Failure taxonomy.
- Prompt recipe.
- What to test next.

Boundary wording:

- Stable: `在[条件]下，本轮输出基本稳定。`
- Fragile: `一旦加入[变量]，结果开始出现[问题]。`
- Not recommended: `如果目标是[高要求场景]，暂时不建议直接使用。`
- Needs retouch: `可作为初稿，但需要人工修[问题]。`

## Short Video Script

60-second structure:

- 0-3s: Hook, show best and worst side by side.
- 3-10s: Explain the one boundary being tested.
- 10-30s: Show 3 strong outputs with one-line notes.
- 30-45s: Show 2 failures and explain why they matter.
- 45-55s: Show the prompt core.
- 55-60s: Final conclusion and next test teaser.

Voiceover skeleton:

```text
今天不讲玄学，我只测一个问题：[边界问题]。
我固定了[不变项]，只改变[变量]。
结果最稳的是这个，因为[原因]。
但到这个场景就开始翻车：[失败点]。
所以我的结论是：Image2 在[条件]下可以直接做作品，在[条件]下更适合先当草图。
```
