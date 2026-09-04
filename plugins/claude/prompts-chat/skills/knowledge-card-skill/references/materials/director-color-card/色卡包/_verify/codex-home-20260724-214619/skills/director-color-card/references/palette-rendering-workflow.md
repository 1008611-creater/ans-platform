# 电影截图色卡渲染工作流

## 目录

- 输入模式
- 导演模式素材标准
- 场景图片模式
- 命令
- 输出五件套
- 自检

## 输入模式

### 导演名

先从 `director-index.md` 定位导演和代表电影。最终卡必须包含 4–5 部电影，每部 4–6 张真实截图；每一部都要在清单中登记来源 URL。不得用图像生成模型制作“电影截图”。

来源优先级：用户提供素材 > 官方预告片、发行方、制片公司或电影节公开素材 > 其他来源明确且可核实的公开页面。截图只用于用户的视觉分析与内部制作参考，不在 Skill 中长期打包。

将素材写入 JSON 清单，格式见 `assets/director-manifest-example.json`。当截图、影片年份或来源无法核实时，停止最终渲染并列出缺口；可以加 `--preview` 做排版预览，但必须明确标注不是最终卡。

### 场景图片

接受 1–3 张用户上传或本地场景图。直接从原图取色，不重绘、不改图、不调用图片生成模型。每张图单独提取 8–10 色，不混淆来源。

## 命令

运行前找到可用 Python；Codex 桌面环境优先使用工作区依赖中的 Python。

### 场景图生成色卡

```powershell
python scripts/build_palette_card.py scene "D:\素材\scene-01.png" --output-dir "D:\输出\scene-01" --title "场景综合色彩分析卡" --colors 8
```

### 导演真实截图生成色卡

```powershell
python scripts/build_palette_card.py director --manifest "D:\项目\director-manifest.json" --output-dir "D:\输出\hou-hsiao-hsien" --template auto --colors 8
```

### 截图不足时仅做预览

```powershell
python scripts/build_palette_card.py director --manifest "D:\项目\director-manifest.json" --output-dir "D:\输出\preview" --template dark --preview
```

### 独立复检

```powershell
python scripts/verify_palette_card.py "D:\输出\hou-hsiao-hsien"
```

## 输出五件套

- `palette-card.png`：最终视觉色卡。
- `palette-card.html`：可编辑、可复查的 HTML 版本，图片内嵌。
- `palette-data.json`：截图、色值、占比、模板和色块坐标。
- `color-prompt.md`：Seedance 2.0 可复制色彩执行 Prompt。
- `sources.md`：影片截图或本地场景图来源。

导演模式还会生成 `frames/`，只保存当前任务使用的真实截图副本。

## 自检

自动检查必须全部通过：PNG 尺寸正确、五件套齐全、HEX 为六位大写、色块中心像素与 JSON 一致、来源不为空；最终导演卡还必须满足 4–5 部电影且每部 4–6 张截图。

肉眼检查：截图不能是连续重复画面；应覆盖人物、环境、室内外、光源、服装、道具和材质；标题、片名、年份、HEX 不溢出；综合色块排序能解释电影，而不是只按明暗机械排列。
