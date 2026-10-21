# 吉祥物双形态：2D 像素 ⇄ 3D 立体

> 一句话：**同一个 IP，两种形态。** 2D 像素形态用于表情包、序列帧、网站桌宠/Agent；3D 立体形态保留原有立体渲染。两者通过统一开关自由切换。

---

## 1. 形态职责

| 形态 | 用途 | 资产 |
|---|---|---|
| **2D 像素**（本次新增） | 网站桌宠 / Agent 形象、表情包动图、视频素材、序列帧动画 | `public/mascot/pixel/dino-atlas.png`（8×8，1x/2x）+ `manifest.json` |
| **3D 立体**（原有） | 立体渲染、空间感展示 | 原有资源不动 |

**退场**：早期那张「伪 3D」渲染图**不再出现在任何对外素材**中，已归档到 `assets/_archive/fake3d/`。产品仓库内的 3D 形象资源不受影响。

---

## 2. 2D 精灵图集规范

| 项 | 值 |
|---|---|
| 文件 | `public/mascot/pixel/dino-atlas.png`（1024×1024）/ `dino-atlas@2x.png`（2048×2048） |
| 布局 | **8 列 × 8 行**，每格 128px（@2x 为 256px） |
| 行 → 状态 | 0 idle · 1 walk · 2 run · 3 work · 4 emote · 5 react · 6 action · 7 meme |
| 每行帧数 | 8 |
| 缩放 | 必须 `image-rendering: pixelated` + NEAREST（像素画禁止插值） |

桌宠显示原理：固定 `background-position-y` 到目标行，用 CSS `steps(8)` 横向走帧；帧时长取该行的 `durationMs`。

---

## 3. 接入方式（已实现）

**双形态做进线上权威 Agent 本身，不新增浮层**：`src/components/mascot/dino-avatar.tsx` 按 `ans.mascot.form` 决定渲染哪一态。

| 形态 | 实现 | 代价 |
|---|---|---|
| `3d`（默认） | 原行为：静态立绘 + WebGL iframe（`/mascot/3d/index.html`，约 9MB 懒加载） | 不变 |
| `2d` | 本地精灵图集 `/mascot/pixel/dino-atlas.png` 逐帧动画（`steps(8)`） | **不加载 3D iframe**，省约 9MB |

切换入口在伴侣面板头部（`[data-testid="mascot-form-toggle"]`，文案走 `mascot` 命名空间，17 语言已补齐）。
**默认值 = `3d`**：未显式选择时行为与权威基线完全一致（`A-AGENT-01` 不被破坏）。

### 端到端验证（真实浏览器，2026-10-21）

```
清空 localStorage（默认）：pixel=false, guide=true        ← 默认不回归
form="2d"：pixel=true, iframe=false, bg=url(.../dino-atlas.png), anim=ans-dino-pixel-steps
form="3d"：pixel=false, guide=true
```

> 未验证项：面板需数据库/会话才能打开，本机无 `DATABASE_URL`，因此**面板内那个切换按钮的点击链路未在本地端到端验证**（仅通过 tsc / eslint / 代码路径确认）。


## 4. 形态切换契约（2D ⇄ 3D 共用）

| 机制 | 值 |
|---|---|
| 存储 | `localStorage["ans.mascot.form"]` = `"2d"` 或 `"3d"` |
| 事件 | `window.dispatchEvent(new CustomEvent("ans:mascot-form", { detail: { form } }))` |
| 3D 侧接入 | 监听 `ans:mascot-form`；`form === "3d"` 时挂载 3D 渲染，`form === "2d"` 时卸载。2D 侧在 `form === "3d"` 时返回 `null`，两边互斥、不会同时出现。 |

---

## 5. 页面 / Agent 驱动接口

| 事件 | 作用 |
|---|---|
| `ans:dino-say` + `detail.text` | 让它说一句话（气泡，4.2 秒后自动消失） |
| `ans:dino-state` + `detail.state` | 切换动作：idle / walk / run / work / emote / react / action / meme |

典型用法：Agent 开始跑任务 → `work`；任务成功 → `action`（欢呼）；报错 → `meme`（冒烟/石化）；等待中 → `meme`（加载中）。

---

## 6. 无障碍与性能

- `prefers-reduced-motion: reduce` 时停止逐帧动画；
- 精灵图为静态 PNG + CSS 动画，**无逐帧 JS**，不引入任何新依赖；
- 桌宠可拖动，位置存 `localStorage["ans.mascot.position"]`；点击触发随机表情，拖拽不触发表情。

---

## 7. 重新生成素材

```powershell
python docs/bilibili-ans-launch/tools/make_stickers.py   # 重建图集 + GIF 表情包 + 总览
```

产出：`public/mascot/pixel/`（图集 + manifest）、`docs/bilibili-ans-launch/assets/dino-stickers/`（50 个 GIF）。
