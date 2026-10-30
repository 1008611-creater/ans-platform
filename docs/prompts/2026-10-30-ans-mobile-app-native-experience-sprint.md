# 《ANS 随身端》ANS MOBILE APP
## 手机端真 App 化体验重构 · 第一阶段冲刺方案（从「套壳网页」到「原生级随身 App」）

## 一、你的身份、标杆与这一阶段的目标
你是一名世界顶级的移动互联网产品制作人，同时具备移动端交互架构师（IA）、UI 视觉导演、Next.js 16 + React 19 + Tailwind 全栈工程、Three.js 移动端性能调优和自动化测试能力。

这一阶段只有一个目标：**用最短的时间，把 ANS 手机端从「点开只是跳进桌面网页的套壳窗口」重构成一个在 `390×844` 竖屏下拥有原生 App 顶底壳层、单手大拇指闯关流、单列沉浸作品卡与底部半屏小恐龙抽屉的真正随身 App，交给我用手机真机亲手试玩。**

**品质标杆**：以 **Apple App Store Today（单列大画幅沉浸卡片流）× Linear Mobile（瑞士网格紧凑顶底栏与原地分段切换）× Duolingo（置顶单手闯关主卡）** 的移动端完成度为目标。不是「用 CSS 把电脑网页挤进 390px 宽度」，而是从手机桌面点开 ANS 图标那一刻起，滑到底看不到网页版权 Footer、切模块不用连滚五屏、单手大拇指在屏幕下半区就能顺畅走完农客松报名领分与作品浏览。

这一阶段的三个关键词（按优先级排列，冲突时前者优先）：
- **真 App 壳与单手流**：手机视口（`< 768px`）下彻底隐藏网页 Footer，底部 6 栏 Tab 紧贴安全区，顶部栏只留当前页焦点与积分胶囊，分类筛选单行横滑不折行，主操作按钮全宽 `48px`（`h-12`）落在拇指热区。
- **农客松随身参赛通**：打开赛事页第一眼就是置顶「五步参赛闯关主卡 + 当前下一步全宽大按钮」，长页面改为手机端粘性横向分段切换（闯关 / 赛道 / 榜单 / 成果墙），3 秒内直达任何模块。
- **双端同源零回归**：电脑端（`≥ 768px`）保持完整网页工作台体验不变，仓库内现有单测断言（含 `MobileTabBar` 6 栏链接、`learning-navigation`、`agrihackathon-landing`、`header-logout`）100% 全绿通过。

这一阶段不能只是「给几个 div 加响应式 padding」，而应当是一次真正的移动 App 界面形态重塑：让手机端像原生工具 App，让电脑端继续当重度生产力网站。

不允许为了堆砌次要说明文字而牺牲手机首屏的呼吸感。宁可在手机端折叠次要规则段落，也要保证每一屏只有一个视觉主角、一个全宽主按钮。

## Skill 与工作流路由（固定字段，必填）
**工作流定位**：权威工作流 `ANS Mobile App Native Experience Workflow v1.0`，本阶段是第 2 步（第 1 步已完成 `/app` 安装包分发与 `ANS-Mobile-v1.2.apk` / `ANS-iOS-App.mobileconfig` 自动下载；本步产出「手机端 5 大核心界面真 App 化视图重构」；下一步是真机 Gate 2 终审与农客松正式宣发）。

| 格子 / 步骤 | 用哪个 Skill | 取它的什么思路 | 明确不取什么 |
|---|---|---|---|
| 入口定位与红线 | `ans-ui-ux-baseline` | 取五条核心铁律（零虚构状态、L0–L3 解释性文字分层、图文不重复、零 AI 黑话、两轮无上下文盲审） | 不改后端积分与数据库 schema |
| 视觉层级与卡片减法 | `oil-ui` | 取 `references/visual-language.md` 与 `references/layout-and-viewport.md` 的移动端首屏主角法则、单卡单主动作与窄屏防折行规范 | 不做三风格对比页 HTML（设计规范已在 `docs/mobile-app/ANS-MOBILE-APP-UI-DESIGN-v1.0.md` 定稿） |
| 响应式状态与组件组织 | `oil-frontend` | 取移动端/桌面端共享数据源但分离视图密度的组件组织方式，确保现有单测 DOM 角色与 `aria-*` 契约不破 | 不新建冗余状态管理库 |
| 复核 | `ans-ui-ux-baseline` | 取 `390×844` 手机竖屏实机截图与 DOM 出屏/遮挡/重言检查思路 | Gate 2 放行权归用户本人 |
| 明确不用 | `nb-science-*` / `ans-eternal-pet-3d-pipeline` | —— | 它们分别是小学科学实验与宠物 3D 打印管线，与本次 ANS 平台手机 App 界面重构无关 |

**读取纪律**：开工前先读 `docs/mobile-app/ANS-MOBILE-APP-PRD-v1.0.md`、`docs/mobile-app/ANS-MOBILE-APP-UI-DESIGN-v1.0.md` 以及 `.agents/skills/ans-ui-ux-baseline/SKILL.md`，按需查阅 `.agents/skills/oil-ui/references/layout-and-viewport.md`，不要整包吞无关 Skill；读完先用一两句话复述本阶段的思路骨架，再动手。
**取舍原则**：只取思路与路由；Skill 里的机械门禁默认不跑，只有直接决定最终结果或本提示词第八节列出的验证才跑。冲突时：用户当轮指令 > 本提示词红线 > Skill 内容。

## 二、现在已经有什么（先读，别重做）
仓库：`/Users/eeo/Downloads/ans/ans-release-master`，分支 `feat/agrihackathon-streamlined-flow-lsb`（最新提交 `4419598d`）。技术栈：Next.js 16.4.3 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Vitest。

已完成，直接复用：
1. **PRD 与 UI 设计规范（必读蓝图）**：
   - PRD：`docs/mobile-app/ANS-MOBILE-APP-PRD-v1.0.md`
   - UI 设计规范：`docs/mobile-app/ANS-MOBILE-APP-UI-DESIGN-v1.0.md`
2. **手机安装包与自动下载链路（已上线，不动）**：
   - `/app` 安装页（`src/app/app/page.tsx`、`src/components/mobile/mobile-app-installer.tsx`）
   - 原生安卓包 `public/downloads/ans-mobile.apk`（WebView UA 带 `ANSMobileApp/1.2.0`）与 iOS 描述文件 `public/downloads/ans-ios.mobileconfig`
   - 下载接口 `src/app/api/app/download/route.ts`
3. **全局壳层与底部六栏导航**：
   - `src/components/layout/site-frame.tsx`、`src/components/layout/header.tsx`、`src/components/layout/footer.tsx`、`src/components/layout/mobile-tab-bar.tsx`
   - 一级导航定义：`src/domain/navigation/primary.ts`（固定 6 项：`explore`, `hubs`, `community`, `competitions`, `market`, `workspace`）
4. **农客松五步主线与主会场组件**：
   - `src/components/competitions/agri-contestant-flow-bar.tsx`（五步导航条）
   - `src/app/competitions/agrihackathon/page.tsx`、`src/components/competitions/agri-competition-detail.tsx`、`src/components/competitions/agri-submissions.tsx`
5. **项目广场、个人工作台与 3D 小恐龙组件**：
   - 广场：`src/app/page.tsx`、`src/app/explore/page.tsx`、`src/components/catalog/project-card.tsx`
   - 工作台与积分：`src/app/workspace/page.tsx`、`src/app/workspace/credits/page.tsx`、`src/components/workspace/credits-center.tsx`
   - 小恐龙伴侣：`src/components/mascot/dino-guide.tsx`、`src/components/mascot/companion.css`
6. **现成无头测试**（验证只用这些，必要时扩充，不要另起炉灶）：
   - 类型检查：`PATH="/Users/eeo/.gemini/antigravity/bin:$PATH" ./node_modules/.bin/tsc --noEmit`
   - 布局与导航单测：`/Users/eeo/.gemini/antigravity/bin/node ./node_modules/vitest/vitest.mjs run src/__tests__/components/mobile-tab-bar.test.tsx src/__tests__/components/site-frame.test.tsx src/__tests__/components/header-logout.test.tsx src/__tests__/components/learning-navigation.test.tsx src/__tests__/lib/hubs-navigation.test.ts`
   - 农客松全套单测：`/Users/eeo/.gemini/antigravity/bin/node ./node_modules/vitest/vitest.mjs run src/__tests__/components/agrihackathon-landing.test.tsx src/__tests__/components/agri-competition-detail.test.tsx src/__tests__/components/agri-submissions.test.tsx`
   - 小恐龙与算力中心单测：`/Users/eeo/.gemini/antigravity/bin/node ./node_modules/vitest/vitest.mjs run src/__tests__/components/dino-guide-accessibility.test.tsx src/__tests__/components/dino-task-guide.test.tsx src/__tests__/components/compute-benefits.test.tsx`

**上一阶段暴露的问题**（来自用户真机实测反馈，这一阶段必须针对它彻底解决）：
- 用户下载并打开手机端 App 后一针见血指出：**「现在的 App 就是跳转到网站，完全没按照 App 的形式做适配」**。
- 具体病灶：手机端直接照搬了桌面网页的长滚页、多行折行筛选栏、网页版权 Footer、松散后台式工作台以及容易挡住窄屏内容的悬浮窗。本阶段必须按 `docs/mobile-app/ANS-MOBILE-APP-UI-DESIGN-v1.0.md` 做出真正的原生 App 视图层级与单手操作流。

## 三、完整体验与招牌时刻
同学在手机桌面点开 ANS 图标（或用 `390×844` 手机竖屏打开），应该能一口气体验：
**从手机桌面点开 ANS 独立图标 → 顶部是干净的 App 标题栏与实时算力积分胶囊，底部是贴合安全区的六栏原生导航，全屏无网页 Footer → 在「广场」单行横滑分类胶囊，像刷 App Store Today 一样单手滑看 16:9 高清作品大卡 → 点底部「赛事」进入农客松随身通，第一眼看到深海蓝置顶闯关主卡，大拇指点下全宽「第 1 步：报名领 20 积分」→ 点下方「五步闯关 / 三大赛道 / 实时榜单 / 公开成果墙」分段胶囊，不用上下狂滑就能原地切换看赛题和榜单 → 点右下角迷你小恐龙徽章，底部丝滑升起半屏 3D 小恐龙互动抽屉，单指转模型、点胶囊问赛题 → 点底部「我的」进入算力钱包黑卡与 2×2 宫格个人中心，随时查余额与战队。**

**招牌时刻**（这一阶段最重要的两处，决定用户点开 App 的第一印象，必须逐拍做扎实）：

### 招牌时刻一：点开「赛事」，单手大拇指 3 秒切换农客松闯关与赛道
1. 用户点底部导航栏「🏆 赛事」进入 `/competitions/agrihackathon`，画面顶部没有冗余网页横幅，第一眼就是一张 `#0A1633` 深海蓝圆角主卡：`STEP 01 → 05 参赛闯关主线`。
2. 卡片内五个步骤化作紧凑的进度节点，当前要做的那一步突出显示，下方紧跟一个 `48px` 高、占满卡片宽度的翡翠绿主按钮（如「去完成报名 / 领 20 积分」或「去提交参赛作品」），正好落在右手大拇指自然搭放的位置。
3. 主卡正下方是一条吸顶的 4 栏分段胶囊条（`[ 五步闯关 | 三大赛道 | 实时榜单 | 公开成果墙 ]`）。
4. 用户大拇指轻点「三大赛道」或「实时榜单」，下方内容区原地平滑切换（带 `active:scale-[0.98]` 按压反馈），不用在手机上上下拉扯几千像素找内容。

### 招牌时刻二：在「广场」单手刷作品卡，底部滑出 3D 小恐龙半屏抽屉
1. 用户切到「🧭 广场」（`/` 或 `/explore`），顶部分类筛选（「全部」「AIGC」「Web 应用」等）排成单行横向惯性滑动胶囊条，绝不折成三四行把作品挤出首屏。
2. 首屏直接呈现完整的 16:9 圆角作品大卡，每张卡只有高清封面、标题、作者标签与唯一主操作按钮，滑到底部紧贴 6 栏 Tab 栏，看不到任何网页 Footer。
3. 右下角高于底部 Tab 栏处停着一枚精巧的 `44×44px` 小恐龙圆章，完全不挡卡片按钮。
4. 用户点一下小恐龙圆章：屏幕底部以 iOS 抽屉阻尼曲线升起半屏面板（`rounded-t-3xl`），顶部带小横条，上半区是可单指触摸旋转的 3D 小恐龙舞台，下半区是 3 个快捷问题胶囊与输入框；再点关闭或遮罩，抽屉顺滑收起。

整条路必须是连续的。每一屏都有清楚的主焦点，任何窄屏页面都不能出现横向滚动条或被挡住点不到的按钮。

## 四、产品与工程权威红线（任何时候都不能破）
1. **品牌唯一全称铁律**：`ANS` 的唯一官方全称是 **`AI Never Stops`**，严禁在任何代码、文案或注释中写错。
2. **一级导航 6 项契约不动**：`PRIMARY_NAVIGATION` 与 `MobileTabBar` 的 6 个链接（`["/explore", "/hubs", "/community", "/competitions", "/market", "/workspace"]`）及 `aria-current="page"` 逻辑严禁增删改序。
3. **单测 DOM 契约全兼容**：现有的 `learning-navigation.test.tsx`、`agrihackathon-landing.test.tsx`、`agri-competition-detail.test.tsx`、`header-logout.test.tsx`、`dino-guide-accessibility.test.tsx` 必须在不删改原有业务断言的前提下 100% 通过（提示：手机端分段隐藏/折叠可通过 CSS 响应式类或保持 SSR/测试态节点可访问性来实现，切勿破坏既有测试查询的 `getByRole`/`getByText` 契约！）。
4. **零虚构数据与零 AI 黑话**：严禁伪造在线人数、下载量或跑马灯；严禁出现 `赋能`、`矩阵`、`闭环`、`底座`、`心智`、`四段式`、`主理人`、`Pi Agent` 等禁用词。
5. **移动端表单防自动放大与防溢出**：`< 768px` 视口下输入框字号不小于 `16px`（`text-base sm:text-sm`），任何页面 `document.documentElement.scrollWidth <= window.innerWidth`（0 横向溢出）。
6. 没有证据的结论一律写「未验证」。

## 五、手机竖屏视口与真机运行要求
**所有手机 App 体验验收一律以 `390×844`（iPhone 竖屏）与 `360×800`（Android 竖屏）、`isMobile: true`、`hasTouch: true` 为准**，同时兼顾 `1280×800` 电脑端网页工作台不退化。

手机竖屏的硬性要求：
- **去网页感**：`< 768px` 下隐藏全局网页 `Footer`（`hidden md:block`），主内容区底部预留 `pb-[calc(4.5rem+env(safe-area-inset-bottom))]` 安全间距。
- **触控热区**：所有导航项、分类胶囊、分段按钮、返回键、主 CTA 高度与宽度均 `≥ 44px`。
- **首屏不折行**：顶栏、分类胶囊条、分段控制器在 `360px`～`390px` 宽度下严禁异常折行或文字重叠。

## 六、这一阶段要做的事（按顺序，做完一格验一格）

1. **第 1 格：App 专属壳层与安全区顶底栏改造（`Header` + `Footer` + `MobileTabBar` + `globals.css`）**
   - **做什么**：
     - 在 `src/components/layout/footer.tsx` 中让网页版权页脚在手机端隐藏（`hidden md:block`），消除滑到底露出网页尾巴的问题。
     - 优化 `src/components/layout/header.tsx` 与 `src/components/layout/mobile-tab-bar.tsx` 在 `< 768px` 下的原生 App 质感：顶部栏保持 `h-12` 紧凑毛玻璃，已登录用户在手机顶栏直接可见紧凑算力积分入口（点击去 `/workspace/credits`）；底部 `MobileTabBar` 强化选中态胶囊指示与 `active:scale-95` 触感反馈，适配 `env(safe-area-inset-bottom)`。
     - 在 `src/app/globals.css` 中补充移动端 App 工具类（如 `.no-scrollbar` 隐藏横向胶囊滚动条、移动端安全区底部内边距与 `overflow-x: clip` 防横向抖动）。
   - **做完的样子**：`390×844` 下顶底栏固定稳固、无网页 Footer、无横向溢出，`header-logout.test.tsx`、`mobile-tab-bar.test.tsx`、`site-frame.test.tsx` 全绿。

2. **第 2 格：项目广场（`/` 与 `/explore`）手机端单行胶囊与沉浸大卡流改造**
   - **做什么**：
     - 改造 `src/app/page.tsx`、`src/app/explore/page.tsx` 与 `src/components/catalog/project-card.tsx` 的移动端布局：将分类筛选栏在手机端改为单行横向惯性滑动胶囊条（`flex overflow-x-auto whitespace-nowrap gap-2 no-scrollbar`），不再折成多行占满首屏。
     - 手机端项目卡片采用 App Store Today 风格单列全宽大圆角卡片（`rounded-2xl`），突出 16:9 封面、标题与唯一主按钮，收敛手机端多余次要小字。
   - **做完的样子**：`390×844` 首屏不用滚动就能直接看到完整的第一张项目大卡封面与分类胶囊条，`learning-navigation.test.tsx` 全绿。

3. **第 3 格：农客松主会场与子页（`/competitions/agrihackathon`）手机随身参赛通改造**
   - **做什么**：
     - 优化 `src/components/competitions/agri-contestant-flow-bar.tsx`、`/competitions/agrihackathon/page.tsx` 与 `src/components/competitions/agri-competition-detail.tsx` 的移动端呈现：
       - 首屏置顶深海蓝「五步参赛闯关主卡」，在手机端突出当前步骤与 `h-12` 全宽主行动按钮。
       - 在手机端（`< 768px`）提供粘性横向分段导航条（`[ 五步闯关 | 三大赛道 | 实时榜单 | 公开成果墙 ]`），点击可平滑切换/定位到对应区块，并在手机端折叠冗长的次要背景说明，同时确保 DOM 节点对现有 Vitest 单测完全可见、不破坏任何测试断言。
     - 优化手机端参赛报名与作品提交页（`src/components/competitions/agri-submissions.tsx`）的输入框触控高度（`min-h-11 text-base sm:text-sm`）与底部提交按钮热区。
   - **做完的样子**：`390×844` 打开农客松主会场，首屏就是五步闯关主卡与全宽主按钮，分段胶囊单行不折行，`agrihackathon-landing.test.tsx`、`agri-competition-detail.test.tsx`、`agri-submissions.test.tsx` 全绿。

4. **第 4 格：个人中心与算力钱包（`/workspace` & `/workspace/credits`）手机 App 钱包卡片化**
   - **做什么**：
     - 改造 `src/app/workspace/page.tsx` 与 `src/components/workspace/credits-center.tsx` 在 `< 768px` 下的排布：顶部呈现 `#0A1633` 随身算力钱包黑卡（展示账户、当前积分大数字、一键领农客松赠点/查明细胶囊），下方呈现紧凑的 2×2 快捷宫格（我的项目、我的战队、我的收藏、模型广场），并对仅适合电脑大屏的重度嵌入工具提供清晰的「一键复制电脑端链接」手机友好提示。
   - **做完的样子**：`390×844` 下个人工作台与算力中心像原生金融/工具 App 的「我的」页面，层级清晰，`compute-benefits.test.tsx`、`compute-history-page.test.tsx`、`workspace-navigation.test.tsx` 全绿。

5. **第 5 格：3D 小恐龙伴侣（`DinoGuide`）手机端底部半屏互动抽屉化**
   - **做什么**：
     - 优化 `src/components/mascot/dino-guide.tsx` 与 `src/components/mascot/companion.css` 在移动端（`< 768px`）的布局：
       - 收起态在手机端缩为右下角高于底部 Tab 栏的精巧圆章，不遮挡页面底部主按钮。
       - 展开态在手机端呈现为贴合底部的圆角半屏抽屉（`rounded-t-3xl` Bottom Sheet 样式，带顶部拖拽横条视觉指示），3D 舞台与快捷问题胶囊紧凑排布在半屏内，避免撑爆窄屏。
   - **做完的样子**：手机端小恐龙收起不挡路、展开像原生底部半屏抽屉，`dino-guide-accessibility.test.tsx`、`dino-task-guide.test.tsx`、`companion-dock-in-panel.test.tsx` 全绿。

6. **第 6 格：`390×844` 手机竖屏全链路实机走查与交我试玩**
   - **做什么**：
     - 启动本地服务，在 `390×844` 手机竖屏视口下对 `/`（广场）、`/competitions/agrihackathon`（农客松）、`/workspace/credits`（算力钱包）、`/app`（安装中心）以及展开态小恐龙抽屉逐一截图并自查，确保 0 横向滚动条、0 文字重叠、0 按钮遮挡。
     - 跑通第八节全部验证命令，提交到本地分支，给我本地预览与真机试玩路线。

## 七、审美、文案与交互手感
**要做到**：
1. **一眼认得出是手机 App**：微冷灰/深海蓝底衬托 `rounded-2xl` 饱满圆角卡片，卡片内留白克制，单手大拇指热区（屏幕中下部）放最重要的大按钮。
2. **图文不重复、同页不复读**：有 16:9 封面的卡片只留标题、标签与唯一主按钮；积分汇率、规则说明在同一页面只出现一次。
3. **文案干脆利落**：按钮动词开头（「立即报名领 20 积分」「上传参赛作品」「复制电脑端链接」），零说明书式废话。

**截图标准**：在 `390×844` 竖屏下截取「广场首屏」「农客松首屏」「农客松赛道切换态」「算力钱包首屏」「小恐龙底部半屏抽屉展开态」五张关键图存 `build/shots/mobile-app-*.png`（验完后不入 git），五张并排放在一起，必须像同一款成熟上架的原生移动 App。

**拒绝**：
- 手机端滑到底还挂着网页版权 `Footer`。
- 分类胶囊或分段按钮在 `390px` 宽下折成三四行、文字竖排或挤压变形。
- 手机首屏被大段背景介绍文字占满，看不到主操作按钮。
- 小恐龙浮窗把页面主提交按钮挡得死死的点不到。

## 八、验证与验收
- 写完每一格，跑与该格直接相关的测试，全过才进入下一格：
  - 类型检查：`PATH="/Users/eeo/.gemini/antigravity/bin:$PATH" ./node_modules/.bin/tsc --noEmit`
  - 壳层与导航测试：`/Users/eeo/.gemini/antigravity/bin/node ./node_modules/vitest/vitest.mjs run src/__tests__/components/mobile-tab-bar.test.tsx src/__tests__/components/site-frame.test.tsx src/__tests__/components/header-logout.test.tsx src/__tests__/components/learning-navigation.test.tsx src/__tests__/lib/hubs-navigation.test.ts src/__tests__/components/mobile-app-installer.test.tsx src/__tests__/api/app-download-route.test.ts`
  - 农客松测试：`/Users/eeo/.gemini/antigravity/bin/node ./node_modules/vitest/vitest.mjs run src/__tests__/components/agrihackathon-landing.test.tsx src/__tests__/components/agri-competition-detail.test.tsx src/__tests__/components/agri-submissions.test.tsx`
  - 工作台与小恐龙测试：`/Users/eeo/.gemini/antigravity/bin/node ./node_modules/vitest/vitest.mjs run src/__tests__/components/dino-guide-accessibility.test.tsx src/__tests__/components/dino-task-guide.test.tsx src/__tests__/components/companion-dock-in-panel.test.tsx src/__tests__/components/compute-benefits.test.tsx src/__tests__/components/compute-history-page.test.tsx`
- 找新问题：全部格子完成后，派无上下文 subagent 对照 `docs/mobile-app/ANS-MOBILE-APP-UI-DESIGN-v1.0.md` 与第四节红线做独立盲审，出清单修干净。
- 关键画面截图自己看过才算验证过，不要把「测试通过」当成「好看」。
- **Gate 2（实机终审）只能由我本人判定。** 你只能写「已交付试玩，等你终审」。

## 九、约束与自主权
**约束**：
- 每一格提交到本地当前分支，提交信息清晰规范。
- **不要擅自推送生产环境（`haika-1757`）**，等我本地或真机预览点头确认后，回复「推 / 上线」再部署到线上。
- 不提交 `node_modules/`、`.next/`、`build/shots/`、密钥和本机绝对路径。
- 只做必须做且杠杆高的事，不重复造轮子；严格复用现有 API、数据库模型与 i18n 字典，不改后端数据表结构。

**自主权**：红线和约束之内，具体 Tailwind 响应式类名、移动端分段切换状态组织、卡片间距微调由你自己决定，不必逐项问我。遇到桌面端单测断言与移动端极简视图冲突时，优先保证单测 DOM 可访问性契约不断（例如用响应式样式控制视觉呈现），并在汇报里写明你的处理方式。

## 十、最终交付与汇报
最后用中文汇报，先给结论：
1. 做了什么：每一格一句话。
2. 测试结果：每个测试命令 ALL PASS 或具体哪条不过。
3. commit 号。
4. 试玩方式：本机启动与手机预览命令，以及 1 分钟手机试玩路线。
5. 还剩什么，包括所有「未验证」的点，以及离第一节品质标杆还差什么。
6. Skill 使用账：每个 Skill 实际用在哪一步、产出了什么结论或改动；没用上的不要写，门禁没跑要明说没跑以及为什么。

**最高优先级**：**真 App 壳与单手流 > 农客松随身参赛通 > 双端同源零回归**。不允许为了省事保留桌面网页的长滚页和网页 Footer。宁可在手机端把次要长文字收进折叠详情，也要保证打开 App 的每一屏都干脆、顺手、像真正的原生移动应用。

**最终目标：** 同学在手机桌面点开 ANS 图标那一刻，不再觉得自己只是打开了一个缩小的电脑网页，而是拥有了一个单手就能报农客松、刷作品卡、看积分、撸 3D 小恐龙的随身口袋 App。
