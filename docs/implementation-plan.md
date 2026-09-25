# ANS 实施计划

本计划按阶段推进，每个阶段有明确的退出条件。工程实施始终采用小切片，
只有面向用户的产品切换是「一次性」的。

状态含义：`已完成` 已通过自动化验证；`进行中` 部分落地；`待开始` 尚未动工。

## 阶段 0：恢复基线（已完成）

- 保护工作区既有未提交改动，重构过程不覆盖。
- 修复原有失败测试与 TypeScript 测试类型问题。
- 新增 `npm run typecheck`（含 `.next/types` 清理）。
- 记录数据库与部署现状。

退出条件：`lint`、`typecheck`、测试全部通过 —— 已满足，纳入 `npm run verify`。

## 阶段 1：产品和数据审计（已完成）

- 盘点 CAUHub 与 ANS 的成员、品牌和数据边界，确认独立产品定位。
- 明确校园邮箱 + 邀请码规则（`@cau.edu.cn` 免邀请码，其他邮箱需邀请码，最多 5 次）。
- 产出 [产品规格](./product-spec.md) 与 [工程约束](../CONSTRAINTS.md)。
- 确认 Prompt、模板、工作流三类内容关系与统一收藏模型。

## 阶段 2：架构和契约（已完成）

- 建立 `contracts` / `domain` / `server` 目录边界，见 [架构说明](./architecture.md)。
- 抽离工作流、模板、审核、运行、额度、收藏、凭证等领域服务。
- 统一 API 响应信封与错误码（`src/server/http/respond.ts`）。
- 引入 `requestId`、审计日志与权限检查。
- 记录关键 ADR：[0001 工作流 DAG](./adr/0001-workflow-dag.md)、
  [0002 工作流 AI 初审](./adr/0002-workflow-ai-review.md)。

## 阶段 3：身份与校园成员体系（已完成）

- 学校邮箱验证 + 邀请码注册（含并发消费与次数上限）。
- 匿名昵称公开身份（`src/lib/public-identity.ts`，回退「匿名同学」）。
- 登录、注册、密码重置。
- 角色与管理员权限校验在服务端执行。
- 预留 CAUHub 成员接口适配层（当前以独立成员表运行）。

## 阶段 4：发现与复用闭环（已完成）

- 首页与搜索/筛选重做。
- 主导航按闭环重排：提示词 · 模板 · 工作流 · 运行记录 · 我的收藏，
  低频入口按屏宽逐级收进「更多」，见 [架构说明](./architecture.md)。
- Prompt、模板、工作流统一内容卡片与详情页运行入口。
- 收藏、运行记录、复用入口（`ContentFavorite` 单表覆盖三类内容）。
- 记录基础行为指标（浏览、运行、收藏）。

## 阶段 5：创作与审核（已完成）

- Prompt 编辑器与模板 Schema、变量检测。
- 有限 DAG 工作流编辑器与提交前校验。
- AI 初审 + 人工复核：模板侧 `src/lib/template-review.ts`，
  工作流侧 `src/server/workflows/review.ts`。
- 版本、修订、驳回与审计记录。

## 阶段 6：运行引擎（已完成）

- 平台统一模型池（`RUN_BASE_URL` / `RUN_API_KEY`）。
- 用户自带 Key（AES-256-GCM 加密落库，列表只返回掩码）。
- 拓扑执行、节点级超时与重试、取消、失败退费。
- 额度扣减与账本（`QuotaLedger`）。
- 运行记录与中间节点状态持久化（`WorkflowNodeRun`）。

## 阶段 7：质量和生产化（已完成）

- 已落地：`npm run verify` 统一质量门（typecheck → typecheck（测试）→ lint →
  文档链接检查 → 分层边界 → 单元测试 → 依赖安全扫描 → build → 浏览器冒烟 →
  可访问性审计 → 性能预算）、结构化日志、`/api/health`、
  Docker 与 GitHub Actions、数据库迁移演练。
- `npm run verify` 自带构建期缺省变量，本地与 CI 均可零配置复现。
- 浏览器冒烟（`scripts/smoke-e2e.mjs`）在真实构建产物上跑核心路径，缺前置条件时
  按跳过处理，CI 用 `SMOKE_MODE=require` 转成失败，细节见 [验收标准](./acceptance.md)。
- 依赖安全扫描（`scripts/security-audit.mjs`）已固化进流水线：生产依赖 high/critical
  阻断，CI 用 `AUDIT_MODE=require` 禁止静默跳过，细节见 [验收标准](./acceptance.md)。
- 可访问性审计（`scripts/a11y-audit.mjs`）已固化进流水线：用 axe-core 扫描
  11 个页面（公开页 + 登录后页面 + 移动视口），`critical` / `serious` 违规为 0
  才放行；CI 用 `A11Y_MODE=require` 禁止静默跳过。
- 性能预算（`scripts/perf-budget.mjs`）已固化进流水线：在固定规模的探针数据上
  量关键读取 API 的 p95（≤ 500ms）、关键写入 API 的 p95（≤ 800ms）和核心页面
  LCP（≤ 2500ms）；CI 用 `PERF_MODE=require` 禁止静默跳过。
- 待补：发布窗口仍需单独执行生产库备份恢复演练。

## 阶段 8：一次性产品切换（待发布窗口执行）

工程侧前置条件已齐备（质量门、迁移演练、冒烟、回滚路径），
剩余动作需要在真实发布窗口执行：

1. 冻结新版本并完成生产备份与恢复演练。
2. 执行数据库迁移（`prisma migrate deploy`）。
3. 部署新镜像并跑核心流程冒烟。
4. 切换新界面，观察错误率、运行成功率和复用率。
5. 保留旧镜像与回滚路径。

切换清单见 [发布清单](./release-checklist.md)。

## 遗留事项

- 旧 `collections` 表已回填到 `content_favorites`，稳定后再单独删除。
- BYOK 依赖 `MODEL_CREDENTIAL_SECRET`；未配置时禁止保存用户 Key。
- 平台模型池依赖 `RUN_BASE_URL` / `RUN_API_KEY`；未配置时运行接口返回明确错误。
- 工作流 AI 初审依赖 `WORKFLOW_REVIEW_*`（回退 `TEMPLATE_REVIEW_*`）；
  未配置时降级为纯人工把关，且该降级是显式可审计的。
