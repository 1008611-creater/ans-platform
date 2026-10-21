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

## 3. 组件与接入（已挂载）

> **状态：已挂载上线**。挂载点 `src/app/layout.tsx`（`<MobileTabBar />` 之后），`/embed` 与 `/kids` 路由不渲染。
> 端到端验证（真实浏览器，2026-10-21）：
> - 2D：`[data-testid="mascot-sprite"]` 存在，`background-image` 指向 `/mascot/pixel/dino-atlas.png`，`animation-name: ans-dino-steps` 在跑；
> - 点击 `[data-testid="mascot-form-toggle"]` → `localStorage["ans.mascot.form"] = "3d"`，精灵消失、`[data-testid="mascot-cube"]` 出现；
> - 点击 `[data-testid="mascot-form-back"]` → 回到 `"2d"`，精灵恢复。
>
> 3D 形态当前是**线框占位**（明确标注「3D 形态 · 接入中」），真实 3D 渲染器按第 4 节契约接入即可替换。

| 文件 | 作用 |
|---|---|
| `src/lib/mascot/atlas.ts` | 纯逻辑：状态表、图集几何、形态/位置的事件名与工具函数（可测试、无副作用） |
| `src/lib/mascot/client-store.ts` | 客户端外部存储：localStorage + CustomEvent，供 `useSyncExternalStore` 订阅（避免 effect 内同步 setState、保证水合一致） |
| `src/components/mascot/pixel-dino-agent.tsx` | 2D 桌宠 / Agent 组件（client） |
| `src/__tests__/lib/mascot-atlas.test.ts` | 图集与形态切换的单元测试 |

接入方式（**文案由调用方提供，遵循 i18n 规范**）：

```tsx
import { PixelDinoAgent } from "@/components/mascot/pixel-dino-agent";
import { useTranslations } from "next-intl";

const t = useTranslations("mascot");

<PixelDinoAgent
  labels={{ aria: t("aria"), to3d: t("to3d"), to2d: t("to2d"), dismiss: t("dismiss") }}
/>;
```

> 组件内**不硬编码任何用户可见文案**；新增文案时在 `messages/*.json` 的 `mascot` 命名空间补 key（11 个语言都要补齐，运行 `node scripts/check-translations.js` 校验）。

---

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
