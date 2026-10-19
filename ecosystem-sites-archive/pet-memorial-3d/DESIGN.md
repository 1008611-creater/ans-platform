# DESIGN.md

本文件记录当前实现的视觉系统。设计方向与来源边界见 [docs/design-dna.md](docs/design-dna.md)。

## Color

纸与墨两色体系，加一个强调色。所有值定义在 `src/styles/tokens.css`，组件里不出现裸色值。

| 角色 | Token | 值 | 用途 |
|---|---|---|---|
| 墨 | `--ink` | `#0b0b0c` | 页面底色 |
| 骨白 | `--bone` | `#f2ede4` | 文字、菜单面板 |
| 朱砂 | `--accent` | `#ff4a2b` | 当前态、悬停态、焦点环 |

约束：

- 不用纯黑与纯白，中性色统一向暖色相偏移。
- 朱砂是唯一强调色，总覆盖面积控制在 5% 以内，只出现在当前态、悬停态与焦点环。
- 深色底上不做大面积色块，需要「第二张纸」时用骨白面板承担。

## Typography

三个角色，全部自托管，全部为 SIL Open Font License 1.1：

| 角色 | Token | 字体 | 用途 |
|---|---|---|---|
| 无衬线 | `--font-sans` | Inter Tight Variable | 正文与标题主体 |
| 衬线斜体 | `--font-serif` | Instrument Serif Italic | 单点强调：中文姓名、英文项目名 |
| 等宽 | `--font-mono` | JetBrains Mono Variable | 序号、类目、日期、按钮标签 |

阶梯（`src/styles/tokens.css`）：

- `--t-h1: clamp(2.25rem, 7.2vw + 0.4rem, 6.5rem)`，下限压到 2.25rem 是为了 320px 屏幕上 8 个汉字能排下。
- 正文行宽上限 65 到 75 字符。
- 深色底上的浅色文字额外增加行高，补偿浅色字显轻的问题。

## Layout

- `--beam: 1180px`，1600px 以上放宽到 1320px。
- `--margin: clamp(16px, 3.2vw, 34px)`。
- 层级只用 1px 发丝线分隔，不靠卡片阴影堆叠。
- 固定 chrome 覆盖在内容之上，不随滚动消失。

## Motion

只使用 motion 一个引擎。缓动定义在 `src/styles/tokens.css`：

| Token | 值 | 用途 |
|---|---|---|
| `--ease-expo-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | 面板、遮罩、页面前进 |
| `--ease-quad` | `cubic-bezier(0.45, 0, 0.55, 1)` | 颜色与透明度 |
| `--ease-back` | `cubic-bezier(0.34, 1.4, 0.5, 1)` | 小元件归位 |

约束：

- 只动画 `transform`、`opacity`、`clip-path`、`filter`，不动画布局属性。
- 不用 bounce 或 elastic 作为主缓动。
- `prefers-reduced-motion: reduce` 时停掉全部装饰性运动。
- 动效不遮挡任何主操作入口。

## Components

| 组件 | 文件 | 职责 |
|---|---|---|
| 入场门 | `src/components/EntryGate.tsx` | 首页唯一入口，带声音或静音进入 |
| 螺旋画廊 | `src/components/SpiralGallery.tsx` | 首页默认视图，DOM 变换加透视投影 |
| 巨型索引 | `src/components/IndexList.tsx` | 首页第二视图，巨型文字条目 |
| 菜单面板 | `src/components/MenuPanel.tsx` | 整屏骨白面板 |
| 固定 chrome | `src/components/SiteChrome.tsx` | 姓名、视图切换、菜单、旋转徽章、静音键 |
| 自绘光标 | `src/components/Cursor.tsx` | 圆点加滞后光环，可点元素上放大并转朱砂 |

## Content

- 站点文案与案例数据：`src/content/site.ts`
- 简历数据：`src/content/resume.ts`

两个文件里不放推测、示例或占位数据。没有真实来源的字段一律留空。
