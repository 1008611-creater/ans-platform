# 五个动效来源的价值与使用边界

## MotionSites

- 官方入口：https://motionsites.ai/
- 核心价值：整站、Hero、3D、视频背景、滚动叙事与视觉氛围的案例发现；提供面向 Lovable、Bolt、Cursor、Claude 等工具的提示词。
- 最适合：先看“页面应该如何运动”和视觉节奏，再提炼成当前项目的动效合同。
- 获取方式：在官方站预览并复制本人可访问的官方提示词；记录具体案例 URL和访问类型。
- 使用方式：提取页面结构、视觉主角、触发方式、镜头/滚动节奏、素材需求和移动端降级，再用当前项目真实组件重建。
- 不适合：直接提供可靠的生产源码、证明性能、证明授权或替代真实浏览器验收。
- 授权边界：付费或登录内容需要用户购买/登录授权。不要使用声称收集 Pro 提示词的非官方 GitHub 搬运仓库；第三方仓库的 MIT 声明不能替代原始内容的权利证明。

## React Bits

- 官方入口：https://www.reactbits.dev/
- 官方仓库：https://github.com/DavidHDev/react-bits
- 核心价值：大量可定制的 React 动画文字、背景、交互和组件；通常提供 JS/TS、CSS/Tailwind 变体。
- 最适合：首屏标题、背景、光标、图片交互、卡片和局部实验性视觉。
- 获取方式：优先使用组件页提供的 shadcn/jsrepo 安装命令，或按项目技术变体手动复制源码。
- 使用方式：只复制选中组件；检查 props、依赖、客户端边界、尺寸、事件、RAF/Canvas/WebGL 清理；替换示例资产与颜色。
- 许可：MIT + Commons Clause。允许个人和商业应用内使用、修改和分发；不得出售、再许可或重新分发组件本身、组件包或移植版。保留版权和许可声明。
- 当前质量信号：官方仓库维护活跃，2026-08-05 查询约 44.8k Star。Star 只作为发现信号，不替代逐组件验收。

## Uiverse

- 官方入口：https://uiverse.io/
- 官方归档：https://github.com/uiverse-io/galaxy
- 核心价值：社区制作的 CSS/Tailwind 小型 UI 元素，包括按钮、输入、开关、加载器、卡片、提示和表单细节。
- 最适合：低成本微交互和单个控件的视觉加强。
- 获取方式：从官方页面复制 HTML/CSS/Tailwind；官方 GitHub `galaxy` 可作为源码与许可回读。
- 使用方式：改成当前项目的语义元素和组件 API，命名空间化 CSS，使用设计 Token，保留 focus/disabled/loading/error 状态。
- 许可：MIT；保留版权和许可声明。官方鼓励但不强制注明原作者与 Uiverse。
- 当前质量信号：官方归档 2026-08-05 查询约 11.9k Star；社区质量差异大，必须逐项检查。
- 不适合：决定整站视觉、页面结构、复杂滚动叙事或直接替换产品组件系统。

## Anime.js

- 官方入口：https://animejs.com/
- 官方文档：https://animejs.com/documentation/
- 官方仓库：https://github.com/juliangarnier/anime
- 核心价值：轻量、多用途 JavaScript 动画引擎，可编排 CSS、SVG、DOM 属性、JavaScript 对象、时间线、拖拽、Scope 和 Scroll Observer。
- 最适合：现成组件库无法覆盖的定制时间线、SVG 路径、精细交互和响应式动画逻辑。
- 获取方式：通过项目包管理器安装 `animejs`，按当前主版本的官方文档导入所需 API；不要复制旧版本博客代码。
- 使用方式：把效果封装进局部组件，记录 targets、时间线和清理 Owner；React 中使用 scope/生命周期清理，避免选择器跨组件污染。
- 许可：MIT；保留版权和许可声明。
- 当前质量信号：官方仓库 2026-08-05 查询约 71.8k Star，文档覆盖 React、SVG、WAAPI、Scope、Draggable 和 Scroll Observer。
- 不适合：项目已有 Framer Motion/GSAP 且现有效果可以由现有引擎完成；不要为一个按钮额外引入动画引擎。

## Aceternity UI

- 官方入口：https://ui.aceternity.com/
- 核心价值：面向 React、Next.js、Tailwind CSS 与 Framer Motion/Motion 的可复制组件、Hero、背景、Bento、视差、卡片、区块和模板。
- 最适合：营销首页和品牌页面的高完成度结构化动效组件。
- 获取方式：从具体官方组件页复制代码与依赖；Pro 资源只能在用户已购买并授权访问后使用。
- 使用方式：优先复制单个组件或区块，不复制整站身份；替换所有品牌、文案、图片、布局和 Token，检查 Motion 版本、客户端边界和依赖。
- Pro 许可：允许为自己或客户创建不限数量终端产品并修改；禁止重新分发源码、在市场出售组件/衍生模板或把资源本身作为产品。第三方组件按其独立许可执行。
- 免费组件：在使用前从具体组件页或随附文件回读许可与依赖，不把 Pro 总许可自动套到所有第三方代码。
- 不适合：后台密集操作界面、无需营销表现的普通表单，以及会因多层粒子/视差显著增加首屏成本的页面。

## 选择优先级

```text
整站方向 -> MotionSites
React 现成动画组件 -> React Bits
轻量 CSS 控件 -> Uiverse
定制动画引擎 -> Anime.js
Next.js 营销区块 -> Aceternity UI
```

同一个效果只选择一个主要源码 Owner。若 Aceternity/React Bits 已包含动画实现，不要再用 Anime.js 重写，除非现有实现不能满足并已证明需要替换。
