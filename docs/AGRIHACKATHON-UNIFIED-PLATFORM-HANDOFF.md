# 农客松一体化赛事平台（AgriHackathon All-in-One Hub）后端与深层机制交接规范（Codex Handoff）

> **当前状态**：前端文案收敛、五步一站式参赛闭环（`读规则 → 拿算力 → 报名传作品 → 上作品墙拉 Star → 入围汇报与最终排名`）、作品墙实时排名角标与距上一名差额提示、一键复制拉 Star 口令等功能已在 [`src/app/competitions/agrihackathon/page.tsx`](../src/app/competitions/agrihackathon/page.tsx) 与 [`src/components/competitions/agri-wall.tsx`](../src/components/competitions/agri-wall.tsx) 落地。
> 本轮已依据用户明确授权完成四项开发及隔离数据库验证。默认勾选同步公开、即时有效 Star 和阶段计分口径以本轮确认要求为准；本地实现、PR 审查和生产上线为不同状态，生产迁移与部署未执行。

## 2026-10-16 实施与验收记录

四项闭环已实现，待 PR 审查后按发布流程上线。以下为实际实现规则，后文保留原需求说明。

- **算力**：管理员在规则管理页配置每队额度并确认发布，未配置不发放。报名自动尝试发放，队长可在阶段工作台补领。同届同队只发一次；赛事钱包与个人余额分开，赛事余额不足不转扣个人余额。关闭、冻结、离队不可新消费，原交易仍可幂等退款。赛事周期未确认时保留有效报名，暂不发包。
- **提交上墙**：初赛、决赛及获准补正默认同步，事务内创建或更新免费作品墙版本并绑定提交版本。只公开项目标题、提交摘要及明确提供的稳定链接，不公开作品正文、补充材料或成员名单。取消同步仍保存提交，不撤回此前公开内容。投票开始后首次绑定跳过并提示，提交仍成功；已有绑定可更新。未上墙或已撤回的作品不进入正式评奖候选。
- **Star**：开放期一次明确操作同时写入有效票。此前已 Star 但未计票的用户再次点击会保留 Star 并计票；自队和无效账号不计票，封榜结果不随后续取消改写。公开分享页为 /competitions/agrihackathon/wall/[slug]，提供封面、战队和有效票数的社交元信息；社交平台缓存刷新不由应用保证。
- **评分与双榜**：管理入口位于公开审核页，先指定初赛 3 人、决赛 7 人的独立评委。五维权重为 30/25/20/15/10；初赛专业均分占 80%，封榜有效票归一化占 20%（全零票为 0）；决赛去掉最高和最低总分后取其余五人均值。精确分数比较保持数学同分，由主办明确裁决，不能低分越过高分。评分绑定冻结版本且不可覆盖。确认榜单保存不可变快照，初赛确认同事务更新决赛资格；可撤回后重新确认，历史保留。独立人气奖可展示未进决赛的获奖队，不虚构决赛名次。

[数据库迁移](../prisma/migrations/20261016090000_agri_unified_closure/migration.sql) 新增三类记录及提交回执的 wallSync 字段，保留原数据。仅在本地专用 PostgreSQL 测试库完整应用迁移，五项真实流程验证通过：发包扣退、拒队、自动上墙、单步计票与封榜、初决赛评分与撤回。集成验证配置为 vitest.agri-integration.config.mts，须显式启用 ANS_AGRI_UNIFIED_VERIFY 并使用测试中限定的本地专用库；默认全量测试不写库。数据均为合成样本，未调用收费模型或生产服务。

生产迁移、合并和部署不在本轮授权范围。上线前需核对真实生产版本、备份、迁移与回滚入口。新增表为历史流水，运行后不以删表回滚；功能停用可关闭赛事工作区，代码回退须保留已写入记录，并单独审查实际兼容性。

---

## 任务 1：战队报名成功自动发放「参赛算力包」（Compute Credit Grant）

### 背景与痛点
目前页面已打通前往算力中心（`/workspace/credits`）的入口，但参赛队伍完成报名后，尚无自动绑定到赛事与战队的专属算力包发放流水，选手需要手动找主办方领券或与普通注册积分混用。

### 工程实现要求
1. **服务层位置**：
   - [`src/server/competitions/agrihackathon/submissions.ts`](../src/server/competitions/agrihackathon/submissions.ts)
   - [`src/server/competitions/service.ts`](../src/server/competitions/service.ts)
2. **核心逻辑**：
   - 当战队在本届农客松完成有效报名（创建 `TeamCompetition` 记录并确认参赛资格）或队长首次点击「领取参赛算力」时，在数据库事务内幂等写入一条绑定 `(competitionId, teamCompetitionId)` 的算力发放流水（`AGRIHACKATHON_TEAM_GRANT`）。
   - 提供查询接口返回当前战队在农客松周期内的**专属算力额度、已消耗算力与剩余额度**，供参赛工作台与主会场状态卡实时展示。
3. **验收标准**：
   - 同一战队重复触发不重复发券（唯一键或幂等锁保证）。
   - 非本届有效参赛队伍不可冒领赛事算力包。

---

## 任务 2：阶段提交（Submission）与作品墙（AgriWall）一键同步上架

### 背景与痛点
当前参赛者需要在两个独立入口操作：
1. 在 [`src/components/competitions/agri-submissions.tsx`](../src/components/competitions/agri-submissions.tsx) 提交初赛/决赛作品版本（`artifactVersionId`）；
2. 再去 `/explore/submit?event=agrihackathon` 经过平台交易市场表单发布免费商品，最后回到 [`src/components/competitions/agri-wall.tsx`](../src/components/competitions/agri-wall.tsx) 手动绑定并勾选同意。

### 工程实现要求
1. **服务层与契约位置**：
   - [`src/contracts/agri-submissions.ts`](../src/contracts/agri-submissions.ts)
   - [`src/server/competitions/agrihackathon/submissions.ts`](../src/server/competitions/agrihackathon/submissions.ts)
   - [`src/server/competitions/agrihackathon/wall.ts`](../src/server/competitions/agrihackathon/wall.ts)
2. **核心逻辑**：
   - 在初赛/决赛阶段提交表单中增加可勾选开关：`syncToAgriWall: boolean`（默认勾选「同步公开至农客松作品墙参与人气 Star 评选」）。
   - 当 `syncToAgriWall === true` 时，服务端在同一事务内自动创建或更新对应的免费作品墙条目（`category = "competition"`, `subcategory = "agri-wall"`, `priceMinor = 0`）并完成 `AgriWallEntry` 绑定与版本同步，无需队长再去 `/explore/submit` 填第二遍表单。
3. **验收标准**：
   - 若投票已开启（`round.state !== "NOT_OPEN"`），未绑定过的战队仅保存阶段提交并提示作品墙绑定已锁定；已绑定过的战队自动同步最新提交版本。

---

## 任务 3：作品墙点 Star 即时计入有效参赛票（消除二次确认流失）

### 背景与痛点
当前 [`src/server/competitions/agrihackathon/wall.ts`](../src/server/competitions/agrihackathon/wall.ts) 与 [`src/components/competitions/agri-wall.tsx`](../src/components/competitions/agri-wall.tsx) 中，用户在投票期之前点过 Star 的作品，在投票开启后不会自动计票，还需要再次进入作品墙点击「将我的 Star 计入本届农客松投票」（`PUT /api/market/listings/[id]/star`），导致社交裂变拉票转化率折损。

### 工程实现要求
1. **服务层位置**：
   - [`src/server/competitions/agrihackathon/wall.ts`](../src/server/competitions/agrihackathon/wall.ts)
2. **核心逻辑**：
   - 在投票窗口 `OPEN` 期间，任何符合条件（已登录、非本队成员）的用户在作品墙卡片或作品详情页点击 Star，直接原子写入/更新有效投票时间戳，一步完成「点 Star + 计入赛事有效人气票」。
   - 提供公开动态 OG 海报或短链重定向路由（如 `/competitions/agrihackathon/wall/[slug]`），支持微信/社交卡片直接预览作品封面、战队名与当前实时有效 Star 数。

---

## 任务 4：初赛 10 强 Finalist 入围榜与决赛终审总排名（80% 专业 + 20% 大众）聚合公示

### 背景与痛点
当前公开展示页 [`src/components/competitions/agri-publications.tsx`](../src/components/competitions/agri-publications.tsx) 与 [`src/server/competitions/agrihackathon/publications.ts`](../src/server/competitions/agrihackathon/publications.ts) 仅按发布记录展示已发布作品卡片，缺乏赛事高潮阶段最核心的**「初赛 10 强 Finalist 晋级名单」**与**「Demo Day 终审获奖总榜」**结构化视图。

### 工程实现要求
1. **服务层与组件位置**：
   - [`src/contracts/agri-publications.ts`](../src/contracts/agri-publications.ts)
   - [`src/server/competitions/agrihackathon/publications.ts`](../src/server/competitions/agrihackathon/publications.ts)
   - [`src/server/competitions/agrihackathon/reviews.ts`](../src/server/competitions/agrihackathon/reviews.ts)
   - [`src/components/competitions/agri-publications.tsx`](../src/components/competitions/agri-publications.tsx)
2. **核心逻辑**：
   - **初赛综合分自动折算**：在 [`src/server/competitions/agrihackathon/reviews.ts`](../src/server/competitions/agrihackathon/reviews.ts) 中汇总 3 位评委的五维打分均值（占 80%）与作品墙封榜有效 Star 归一化得分（占 20%，$\text{PublicScore} = 100 \times \frac{\text{validStars}}{\max(\text{validStars})}$），生成初赛综合排名候选集供主办方确认 10 强 Finalist。
   - **决赛去极值均分**：汇总 7 位决赛评委打分，自动去掉 1 个最高分与 1 个最低分后取剩余 5 位均值，生成一等奖（¥1,500）、二等奖（¥1,000）、三等奖（¥800）及最佳技术实现奖、最佳创意奖、最佳人气奖榜单。
   - **公开展示页双榜视图**：在 `AgriShowcase` 顶部渲染「初赛 10 强 Finalist 路演名单」与「Demo Day 终审荣誉殿堂」，并支持一键跳转查看各获奖作品的在线 Demo、GitHub 开源仓库与作品墙详情。
