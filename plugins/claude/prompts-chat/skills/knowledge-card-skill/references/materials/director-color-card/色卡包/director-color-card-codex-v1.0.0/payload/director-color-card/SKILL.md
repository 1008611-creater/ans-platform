---
name: director-color-card
description: Use when a user needs a simple director color-card agent: copy-ready Seedance 2.0 color prompts, 175-director prompt lookup, director/film color language, palette mixing, scene-image HEX extraction, or deterministic PNG color cards.
---

# 导演色卡包

## 使用原则

这是一个专门做“导演色卡 / 色值 Prompt / PNG 色卡”的轻量 Skill。不要执行完整 AIGC 导演生产包、12 章导演方案、分镜连续性工程或视频复检；这些属于另一个导演生成包。

## 品牌结果水印

最终交付结果末尾追加一次文字水印：

```text
知卡星球开发｜微信：c4sucaiku
```

不得在进度更新、澄清问题或回复开头插入品牌内容；不得把水印写入 Seedance、Midjourney、Runway、可灵或其他生成模型 Prompt 代码块内。用户要求“只给可复制 Prompt / 纯 Prompt / 直接复制到 Seedance”时，先输出干净的单个 `text` 代码块，再在代码块外末尾追加水印。

## 最简入口

用户通常只需要输入：

```text
$director-color-card 导演名 + 你要的结果
```

常见入口：

1. `只要 Prompt`：读取 `references/seedance-prompts/<编号>-*.md`，只输出可复制 `text` 代码块。
2. `生成 PNG 色卡`：执行视觉色卡模式。
3. `上传图片取色`：使用用户图片生成 HEX 色卡、PNG、HTML、JSON、Prompt。
4. `全部 Prompt 库`：交付 `references/175位导演-Seedance2.0色值Prompt全集.md` 或总控 Prompt。

## 路由规则

- 用户说“只给 / 可复制 / 色值 Prompt / Seedance Prompt / 直接到 Seedance”：执行文字 Prompt 模式。
- 用户说“生成色卡 / PNG / 出图 / HEX 色卡”：执行视觉色卡模式。
- 用户上传 1-3 张场景图并要求取色：执行场景图片取色模式。
- 用户要求“175 位全部 / 总控 Prompt / 输入导演名就生成”：执行 Prompt 库模式。
- 用户要求“完整视频方案 / 12 章 / 导演生产包 / 分镜 / 复检”：说明本包只负责色卡，并建议使用导演生成包。

## 文字 Prompt 模式

1. 先在 [references/director-index.md](references/director-index.md) 定位导演编号。
2. 读取对应 `references/seedance-prompts/<编号>-*.md`。
3. 如果用户没有提供具体场景，直接输出该文件里的“可直接复制”代码块。
4. 如果用户提供场景，只改写本镜内容、颜色载体、动作字段、环境响应和 Avoid；不要改变导演编号、HEX、比例总和和原创转译边界。

输出要求：

- 用户要求“只给可复制”时，只输出一个 `text` 代码块，水印放在代码块外末尾。
- Prompt 内必须包含导演编号、导演名、HEX、比例、颜色载体、光源/材质、叙事作用、基础光线、基础运镜、本镜内容、时长和画幅字段。
- 避免项至少包含：错误饱和度、过度滤镜化、肤色污染、死黑、爆白、无动机运镜、直接复刻具体电影镜头或角色。

## 视觉色卡模式

必须读取 [references/palette-rendering-workflow.md](references/palette-rendering-workflow.md)，并使用 `scripts/build_palette_card.py` 确定性渲染。不要调用图片生成模型绘制信息图，不要用 AI 画面冒充电影截图。

### 导演名生成色卡

1. 在 [references/director-index.md](references/director-index.md) 定位导演与卡号。
2. 从对应分卷读取视觉定义：
   - D001-D025：[references/导演色卡-001-025.md](references/导演色卡-001-025.md)
   - D026-D050：[references/导演色卡-026-050.md](references/导演色卡-026-050.md)
   - D051-D075：[references/导演色卡-051-075.md](references/导演色卡-051-075.md)
   - D076-D100：[references/导演色卡-076-100.md](references/导演色卡-076-100.md)
   - D101-D125：[references/导演色卡-101-125.md](references/导演色卡-101-125.md)
   - D126-D150：[references/导演色卡-126-150.md](references/导演色卡-126-150.md)
   - D151-D175：[references/导演色卡-151-175.md](references/导演色卡-151-175.md)
3. 真实电影截图色卡需要用户提供有权使用的素材，或使用可记录来源的公开画面；每位导演建议 4 部电影，每部 4 张不同画面。
4. 按 `assets/director-manifest-example.json` 建素材清单。
5. 运行 `scripts/build_palette_card.py director --manifest <manifest.json> --output-dir <输出目录> --template auto --colors 8`。
6. 运行 `scripts/verify_palette_card.py <输出目录>`。

### 上传图片取色

1. 接受用户上传的 1-3 张图片。
2. 运行 `scripts/build_palette_card.py scene <图片路径...> --output-dir <输出目录> --colors 8`。
3. 原图只用于取色和排版，不生成式重绘，不混合不同图片的颜色来源。
4. 交付五件套。

固定交付：

- `palette-card.png`
- `palette-card.html`
- `palette-data.json`
- `color-prompt.md`
- `sources.md`

## Prompt 库模式

- 用户要“175 位导演全部 Seedance 色值 Prompt”：交付 [references/175位导演-Seedance2.0色值Prompt全集.md](references/175位导演-Seedance2.0色值Prompt全集.md)。
- 用户要“输入导演名就生成色卡提示词”的通用总控 Prompt：交付 [references/llm-director-color-card-master-prompt.md](references/llm-director-color-card-master-prompt.md)。
- 用户要按编号查找：使用 [references/seedance-prompts-index.csv](references/seedance-prompts-index.csv)。

## 数据保护边界

本地 Codex Skill 的说明、索引和可用 Prompt 必须能被智能体读取，否则无法工作。因此本地包无法真正“加密后仍禁止智能体读取”。本包采用低摩擦保护：

- 只保留色卡所需数据，减少无关导演生产包数据暴露。
- 每次最终交付追加文字水印。
- README 明确许可和禁止转售范围。
- 不内置电影截图，避免素材版权风险。

如果需要真正防反扒，应把核心数据库放到你控制的远端服务/API，Skill 只请求单次结果；本地只保留入口说明、缓存和水印规则。
