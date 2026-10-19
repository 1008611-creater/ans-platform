---
name: ans-hyperframes-launch-video
description: ANS (AI Never Stops) 16:9 产品宣发与 28天挑战视频制作基线 Skill（60分及格门禁版）。融合 hyperframes-creative (claude 暖白杂志瑞士网格) + hyperframes-animation (10大硬核动效规范) + product-launch-video + oil-ui 视觉图卡化规范 + Fish Audio Drama-3 逐句精算同步管线。凡制作 ANS 宣发视频、功能更新视频或 B站/视频号横屏演示片时必须激活本 Skill。
---

# ANS (AI Never Stops) HyperFrames 宣发视频制作基线 Skill

本 Skill 沉淀自 `day01_ans_oil_style_16x9.mp4` 实战验收通过版本（60分合格基线），彻底解决早期视频「黑底长文框字多无图、UI 抽搐丑陋、缺乏专业动效、音画不同步、右下角小恐龙白框」五大顽疾，作为后续 Day 02–Day 28 视频迭代的最低起跑线。

---

## 一、 视觉与 UI 铁律（Warm Editorial Swiss Grid · 去文字框化）

1. **严禁出现黑底/深色长文字表格或说明框**：
   - 全片画布统一采用 `hyperframes-creative/frame-presets/claude/FRAME.md` 暖白杂志瑞士网格配色：
     - 主纸张底色：`#FAF9F5`（Warm Cream Paper）+ `48px × 48px` 极细暖灰网格线
     - 次级卡片色：`#EFE9DE`（Warm Tile）与纯白 `#FFFFFF` 高光卡面
     - 主墨色：`#141413`（Editorial Ink）
     - 强调色：陶土珊瑚红 `#D97757` + ANS 品牌薄荷绿 `#10B981` / `#9BE0C5`
2. **75%+ 画面占比铁律（Visual-First Cards）**：
   - 任何信息卡、对比卡、流程卡，**内部必须有 75% 以上面积为高清实机视觉裁切图（`assets/visual_crops/`）、3D 舞台实拍或代码/图表可视化**。
   - 卡片文案严禁超过 **2～6 个大字号粗体短词**，且底部标签栏必须加 `white-space: nowrap` 严防单字折行。
   - 裁切网站卡片做画中画展示时，**只裁纯视觉插画层（如 `assets/live/cards/*.webp`）**，严禁把原网页卡片底部的标题栏裁进去再在外部容器重复写一遍标题。
3. **右下角小恐龙伴侣零白框铁律**：
   - 全程使用带 Alpha 透明通道的 `assets/dino_rgba/dino_00.png`..`dino_23.png` 序列帧 + `drop-shadow`，严禁套白色背景框；当主画面已经是 3D 小恐龙展厅或终章小恐龙主视觉时，自动隐藏右下角挂件避免双恐龙同屏打架。
4. **内容与品牌合规红线**：
   - `ANS` 唯一官方全称：**`AI Never Stops`**。
   - **严禁出现未成熟的 `念念 (Niannian)` 相关项目卡片**（构建前须从 `assets/live/cards/` 物理剔除）。
   - **3D 展厅与简历网站只保留纯 3D 小恐龙舞台**，严禁出现人物 3D 建模。
   - 宣发主线聊 **ANS 整体高维定位与三大根本优势**（① 标准化工程管线 + 多智能体协同；② VibeHub 内行审美去 AI 塑料味；③ 原生 3D 小恐龙零算力交互展厅 + 100% 真实样本切片验真交付），不琐碎罗列低维细节。

---

## 二、 必配 10 大 `hyperframes-animation` 核心动效清单

每支宣发视频必须在分镜中完整实装以下 10 项专业动效（严禁退化为静态 PPT 平移）：

| 编号 | 动效规则来源 (`hyperframes-animation/rules/`) | 视觉表现与关键实现参数 |
| :--- | :--- | :--- |
| **01** | `split-tilt-cards.md` | **3D 书页倾斜对比卡**：父容器 `perspective: 1600px`，左卡（反面痛点）`rotateY(11deg)`，右卡（ANS 方案）`rotateY(-11deg)`，配合反相正弦悬浮 (`y: ±8px, sine.inOut`) |
| **02** | `kinetic-beat-slam.md` | **重音节拍砸入标题**：开场与转折大标题 `scale: 1.35 -> 1.0` + `blur(14px) -> blur(0px)` (`power4.out`) |
| **03** | `css-marker-patterns.md` | **手绘标记四件套**：① 荧光笔扫抹 (`scaleX(0->1) skewX(-4deg)`)；② 红叉涂抹盖章 (`Sketchout` 双斜线划掉反例卡片 + 印章弹出)；③ 手绘红圈 (`mh-circle-ring`)；④ 终章按钮 360° 12 线放射礼花 (`rotate(var(--angle)) translateY(-95px -> -115px) scaleY(0->1)`) |
| **04** | `3d-page-scroll.md` | **3D 倾斜视窗平滑滚页**：`perspective(1400px) rotateY(-9deg) rotateX(5deg)` 浏览器卡片内嵌高清长网页截图，沿 Y 轴执行 `power3.out` 丝滑滚动 |
| **05** | `center-outward-expansion.md` + `svg-path-draw.md` | **中心向外星图爆发 + SVG 自绘连线**：中央小恐龙核心弹出，4 张高清视觉图卡从中心 `(0,0)` 向四角 `expo.out` 爆发，同时 SVG 贝塞尔连线通过 `stroke-dasharray / stroke-dashoffset` 实时自绘连通 |
| **06** | `depth-of-field-blur.md` | **光学景深切换聚焦 (Rack Focus)**：背景画廊通过 CSS 变量 `--dof: 0px -> 12px` 退入光学虚化并压暗，前景英雄卡片在 Z 轴弹簧弹出 (`back.out(1.4)`) |
| **07** | `counting-dynamic-scale.md` | **字号随数值同步膨胀计数**：核心指标（`80%`、`300+`、`24套`）锁定 `font-variant-numeric: tabular-nums`，在数值递增同时 `fontSize` 从 `48px` 动态放大至 `102px`，配合 SVG 圆环进度条绘制 |
| **08** | `ai-tracking-box.md` | **AI 实时视觉追踪框**：3D 小恐龙舞台挂载明黄色 `#FACC15` 四角 L 型追踪框 (`🦕 ANS_DINO_3D · WebGL 60FPS · 99%`)，通过确定性正弦函数实时微调位置、宽高与置信度百分比 |
| **09** | `physics-press-reaction.md` | **物理弹簧按压与波纹**：矢量光标飞入目标按钮，光标与按钮同步下压至 `scale: 0.90` (`power2.in`)，触发薄荷绿波纹扩散后以 `back.out(2.0)` 弹簧回弹 |
| **10** | `cut-catalog.md` | **速度匹配无缝转场**：幕间切换严禁硬切，前幕末帧加速 (`scale: 1.24, blur(16px), power3.in`) 与后幕首帧减速 (`scale: 0.78 -> 1.0, expo.out`) 实现 `Zoom-Through` 或横向 `Cut the Curve` 动量接力 |

---

## 三、 逐句精算音频与单行字幕铁律（Frame-Exact Clause Sync）

1. **先跑逐句 TTS + 真实时长测算 (`scripts/synthesize_exact_clauses.py`)**：
   - 将全片口播拆分为 16 个高维语义分句，记录每一句的真实起止秒数写入 `clauses_timeline.json`。
   - 混音管线自动叠加 Lo-Fi 暖感 BGM（人声激活段自动闪避压低 `-6dB`）与关键动作音效（`pop-clean.wav`、`whoosh-soft.wav`、`ui-click-soft.wav`、`chime-single.wav`），并经 `loudnorm=I=-15:TP=-1.5:LRA=9` 标准化输出 `_oil_mixed_audio.m4a`。
2. **单行居中胶囊字幕 (`#sub-bar`)**：
   - 字幕栏必须设置 `white-space: nowrap; max-width: 1680px; padding: 12px 42px 16px;`，确保任何一句口播字幕都**严格单行居中显示，绝不出现末尾 2～3 个字孤零零折到第二行**。
   - 核心关键词自动着色（明黄 `#FACC15` 与薄荷绿 `#9BE0C5`），底部附带当前分句实时进度条。

---

## 四、 确定性多进程渲染与两步验真管线 (`scripts/`)

本 Skill 内置三套可直接复用的生产脚本（位于 `scripts/` 目录）：

1. **`scripts/synthesize_exact_clauses.py`**：生成分句语音、混音 `_oil_mixed_audio.m4a` 与精确时间轴 `clauses_timeline.json`。
2. **`scripts/build_hyperframes_stage.py`**：读取 `clauses_timeline.json`，编译生成 1920×1080 单文件确定性 GSAP 舞台 `hyperframes_stage/index.html`（暴露 `window.__seekTo(sec)`）。
3. **`scripts/render_hyperframes_video.py`**：
   - **第一步（7 秒快速抽帧审计）**：运行 `python3 render_hyperframes_video.py --preview-only`，直接从无头 Chromium 截取 12 张关键帧并拼成 `day01_oil_style_preview_sheet.png`。**必须肉眼检查 12 张大图确认零文字折行、零裁切残影后，才准进入全量渲染。**
   - **第二步（6 进程并发全量渲染）**：自动注入 `@remotion/compositor-darwin-arm64` 的 `PATH` 与 `DYLD_LIBRARY_PATH`，启动 6 个 Chromium + FFmpeg 管道并发渲染全部帧并合成最终 MP4。
