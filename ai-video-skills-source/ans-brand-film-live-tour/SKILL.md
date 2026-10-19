---
name: ans-brand-film-live-tour
description: >
  ANS (AI Never Stops, https://ans.cauai.fun) 官网实机导览与产品发布宣传片复利管线 Skill（当前版本评分：60分及格基线，待深度迭代）。
  融合 mg-styles-15 (12-aurora-glass × 03-kinetic-type × 08-morph) + Screen Studio 级光学鼠标聚焦放大/平滑滚页 +
  预缓存 Three.js 3D 小恐龙 Agent 四步连贯互动 (连点3下放大 -> 抽鞭子 -> 喂零食 -> 3D衣橱换装) +
  Fish Audio Drama-3 口播与纯净单行字幕 100% 逐字对齐 + 瑞士风合格版 Lo-Fi BGM 自动闪避混音。
  凡迭代、优化或新制 ANS 官方网站宣传片、实机功能导览片（项目广场 / VibeHub / 3D Agent / 市场推流 / 社群组队 / 农客松 / CAUHub）时必须激活本 Skill。
---

# ANS (`AI Never Stops`) 官网实机导览宣传片复利管线 (`ans-brand-film-live-tour` · 60分基线版)

> [!WARNING]
> **当前成片真实评分记录：`60 分（仅达及格基线，仍存在较多问题待下一轮重点迭代！）`**
> - 严禁将当前 `121.96s` 版本当成完美终稿！当前版本仅完成了「业务模块覆盖 + 口播字幕逐字对齐 + 3D 小恐龙预缓存入片 + BGM 混音」的 **60 分及格基线**。
> - 在另一台电脑继续迭代时，AI 必须直面下方「章节二：当前 60 分成片存在的已知问题与下一轮重点优化清单」，在此基线上做实质性的视觉、镜头与节奏升级，而绝不可原封不动守成。

---

## 一、 已跑通并必须保留的 6 条 60 分基线铁律（不可回退项）

### 1. 纯净单行字幕 & 口播=字幕 100% 逐字完全一致
- **严禁字幕栏杂物**：字幕条（`drawVoiceoverSubtitleBar`）内 **只允许渲染当前那一句字幕文本本身**，严禁添加 `DRAMA-3` 徽章、严禁添加动态音波柱、严禁添加顶部 `▼` 装饰三角或句号。
- **100% 逐字同源**：`gen_audio.py` 中传给 `Fish Audio Drama-3`（`reference_id = "44c1d8be3ac24722b7f6dcbeafefeb5a"`）的 `tts` 字符串必须与画面渲染的 `text` 字符串 **100% 逐字相等**。
- **由语音真实时长决定视频总长**：不锁死 15 秒，由 `python3 demos/ans-brand-film/gen_audio.py` 测算每句语音真实秒数并生成 `clauses_timeline.json` 与 `timeline_data.js`。

### 2. 彻底剔除个人半成品/下架项目，聚焦真站 6 大高光板块
- **物理级黑名单过滤（严禁出现在任何截图或画布中）**：
  - 黑名单关键词：`['念念', 'niannian', '简历', '个人作品集', '小恐龙 3D', 'AI 科普短剧', 'VibePhoto', '知微影像', '无限画布', 'Image2', '视频定制', '商业视频']`。
  - 采集真站画面时必须调用 `capture_live_tour.mjs` 中的 `cleanBlockedCards(page)`，在截图前从 DOM 树中物理移除包含上述关键词的卡片并重排 Grid。
- **全片 8 章核心内容覆盖**：
  - **Ch 0（痛点与 Day 1 福利）**：打破「90% 的人刷 AI 只剩聊天记录和收藏夹吃灰」，亮出顶配旗舰模型（`GPT-6-Astra`、`大肥鱼 v4.1-1017`、`Opus 5.5`）与注册即送免费算力。
  - **Ch 1（项目广场 `/explore` 分类切换与下滑）**：展示 `Hello 算法`、`Build Your Own X`、`freeCodeCamp`、`Ollama`、`Hermes Agent`、`AppFlowy`、`AFFiNE`、`Stirling PDF` 等高星开源宝藏，实机演示向下平滑滚动并依次切换 **`全部` → `学习成长` → `GitHub 宝藏` → `效率与生活`**。
  - **Ch 2（`VibeHub` `/vibe-hub` 分类切换与下滑）**：实机切换 **`AI 54` → `前端 146` → `设计风格 24`**，向下平滑滚动浏览 `现代简约`、`苹果风 Apple HIG`、`Notion 风`、`Bento 便当格`、`玻璃拟态`、`瑞士排版`，并切入 `课程` 与 `练习`。
  - **Ch 3 & Ch 4（3D 小恐龙 Agent 预缓存连贯互动）**：
    1. 镜头聚焦右下角小恐龙 Agent，鼠标 **连点 3 下** 切入中央「灵龙近景互动台」；
    2. 点击 **`🪢 挥鞭催干活`** **连抽 3 下鞭子**（触发打工魂觉醒与 `100% ⚡ 超频` 敲代码状态）；
    3. 点击 **`🎲 盲盒投喂`** **连喂 3 次零食**（火鸡面、杨枝甘露、显卡饼干，好感度与灵感星豆拉满）；
    4. 打开 **`👗 3D 衣橱`** 切换 **`🧋 Tripo 喷射套装`** 与 **`👑 UR 满配神装`** 并 360° 旋转预览。
  - **Ch 5（ANS 市场 `/market` 上架与推流变现）**：聚焦 `发布我的项目或服务`，介绍 **平台官方主动推流曝光 + 完善交易环境 + 算力收益自动结算**。
  - **Ch 6（社群组队 `/teams` + 大赛农客松 `/competitions/agrihackathon` + 高校 `CAUHub` `/hubs`）**：
    - 社群交换真实需求、跨学科组队参赛做项目；
    - 大赛专区盘点黑客松与 AIGC 比赛，重点展示 ANS 主办的 **农客松**；
    - 高校 Hub 入驻重点聚焦首站入驻高校 **中国农业大学 `CAUHub`**。
  - **Ch 7（28 天 Flag 与官方品牌定格）**：每日有感改进或全员额度重置（`Full Reset`），收尾定格官方 `ANS` 负空间三角 Logo + 巨幅字标 + 真实薄荷绿小恐龙（`public/mascot/ans-mascot.png`）+ `ans.cauai.fun`。

### 3. 瑞士风 60 分合格版同款 Lo-Fi BGM + 自动闪避混音
- 底乐使用 `assets/sfx/lofi-study_fassounds.mp3`（与瑞士风 60 分合格版同源），口播发声期间自动包络闪避。

---

## 二、 当前 60 分成片存在的已知问题与下一轮重点优化方向（待在新电脑继续攻关）

1. **画中画外框冗余 & 网页有效可视面积偏小**：
   - 当前 Ch 1～Ch 6 在浏览器窗口左右两侧常驻了 `LEFT / RIGHT` 两块小毛玻璃 HUD 卡片，再加上顶部大标题与浏览器内浮动说明条，导致中间真正展示的网站画面被挤压、装饰框过多。
   - **优化方向**：大幅放大浏览器主视口（甚至在聚焦高潮段直接全屏化/无边框 3D 倾斜视口），砍掉左右两侧喧宾夺主的辅助小卡片和多余的浮动黑框，让观众视线 100% 集中在真实的网页操作本身。
2. **「长截图平移」与「真实网页高帧率交互」的质感差距**：
   - 当前 `/explore`、`VibeHub`、`/market` 等章节本质上是对静态 WebP 长图做 `drawImage` 滚动和透明度淡入淡出，卡片 Hover 态、按钮按下态、页面切换的真实 DOM 交互感仍然偏弱；3D 小恐龙仅靠 36 张离散截图切换，旋转与动作帧率不够丝滑。
   - **优化方向**：对关键交互片段（如点击分类 Tab、卡片 Hover 浮起、3D 小恐龙连点放大/挥鞭/喂食/360° 旋转衣橱）采用更高帧率（30fps/60fps 连续录制序列或真实 DOM/WebGL 实时合成），消除静态图切换的生硬感。
3. **镜头聚焦运动（Camera Rig）的节奏感与呼吸感不足**：
   - 当前镜头缩放 `zoom` 与焦点 `focusX/Y` 多采用简单的 `Math.sin` 往复或线性分段，缺少顶级商业科技片（如 Screen Studio / Apple Keynote / Linear）那种「鼠标先动 → 弹簧阻尼快速推近特写 → 停顿看清细节 → 丝滑拉远或切镜」的干脆利落感。
4. **时长（121.96 秒）偏长、单句信息密度与视觉转场花样偏单一**：
   - 连续 6 个章节（近 95 秒）都停留在同一个居中浏览器外框构图内，视觉构图缺乏章节间的打破与重组（如全屏特写、分屏对比、3D 倾斜透视漫游、快节奏高光混剪）。

---

## 三、 成片关联素材包清单与一键迭代命令

所有与当前 60 分成片直接关联的素材与脚本均位于 `demos/ans-brand-film/`：

| 路径 | 内容说明 |
| :--- | :--- |
| `demos/ans-brand-film/index.html` | 当前 60 分成片主渲染代码（2922 行，含 WebGL2 背景、浏览器运镜状态机与字幕渲染） |
| `demos/ans-brand-film/shaders.js` | WebGL2 极光流体背景与毛玻璃 Shader |
| `demos/ans-brand-film/gen_audio.py` | 17 句 `Fish Audio Drama-3` 语音 + `lofi-study_fassounds.mp3` 闪避混音与时间轴生成脚本 |
| `demos/ans-brand-film/capture_live_tour.mjs` | 真站页面黑名单过滤截图 + 3D 小恐龙 36 帧预缓存采集脚本 |
| `demos/ans-brand-film/clauses_timeline.json` & `timeline_data.js` | 17 句口播=字幕 100% 逐字对齐时间轴数据 |
| `demos/ans-brand-film/clauses_tts/` | 17 句已生成的 `Fish Audio Drama-3` 独立音频文件（`clause_00.mp3/.wav` .. `clause_16.mp3/.wav`） |
| `demos/ans-brand-film/assets/tour/` | 全套真站净化长图（`explore_*.webp`, `vibehub_*.webp`, `market_clean.webp`, `teams_clean.webp`, `competitions_main.webp`, `agrihackathon_main.webp`, `hubs_main.webp`）+ 3D 小恐龙 36 帧序列（`dino_00.webp`..`dino_35.webp`） |
| `demos/ans-brand-film/assets/sfx/lofi-study_fassounds.mp3` | 瑞士风 60 分合格版同款 Lo-Fi BGM |
| `demos/ans-brand-film/assets/mascot/ans-mascot.png` | 站内真实薄荷绿小恐龙原图 |
| `demos/ans-brand-film/out/audio.wav` | 121.96s 完整混音母带（`-15.0 LUFS / -1.5 dBTP`） |
| `demos/ans-brand-film/out/stills/t*.png` | 11 张 1080p 关键帧静帧图 |
| `demos/ans-brand-film/out/ans-brand-film-1080p.mp4` | 当前 60 分基线版 121.96s 1080p 30fps 成片 |
