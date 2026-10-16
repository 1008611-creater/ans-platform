# 农客松一体化赛事平台（AgriHackathon All-in-One Hub）后端与深层机制交接规范（Codex Handoff）

> **当前状态**：前端文案收敛、五步一站式参赛闭环（`读规则 → 拿算力 → 报名传作品 → 上作品墙拉 Star → 入围汇报与最终排名`）、作品墙实时排名角标与距上一名差额提示、一键复制拉 Star 口令等功能已在 [`src/app/competitions/agrihackathon/page.tsx`](../src/app/competitions/agrihackathon/page.tsx) 与 [`src/components/competitions/agri-wall.tsx`](../src/components/competitions/agri-wall.tsx) 落地。
> 本文档面向 **GPT-6.1-sol (Codex)**，定义需要改动数据库事务、服务端状态机与 API 契约的 **4 项深层工程闭环任务**。

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
