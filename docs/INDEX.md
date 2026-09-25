# ANS 文档索引

- [产品规格](./product-spec.md)
- [架构说明](./architecture.md)
- [验收标准](./acceptance.md)
- [实施计划](./implementation-plan.md)
- [发布清单](./release-checklist.md)
- [工程约束](../CONSTRAINTS.md)
- [项目上下文](../PROJECT_CONTEXT.md)

## 架构决策记录（ADR）

- [ADR 0001：工作流采用有限 DAG](./adr/0001-workflow-dag.md)
- [ADR 0002：工作流采用「AI 初审 + 人工复核」双层把关](./adr/0002-workflow-ai-review.md)

架构和数据模型的重大变化记录在 `docs/adr/`。

## 验证与门禁

- [验收标准](./acceptance.md) 记录质量门构成、本轮验证证据与尚未纳入门禁的项目。
- [发布清单](./release-checklist.md) 是发布窗口的逐项勾选表。
- 一键门禁：`npm run verify`（typecheck → typecheck（测试）→ lint → 文档检查 →
  分层边界 → 单元测试 → 依赖安全扫描 → build → 浏览器冒烟 → 可访问性审计 →
  性能预算，共 11 步）。
- 分层边界检查可单独执行：`npm run check:boundaries`（客户端边界、组件数据边界、
  app 数据边界、contracts/domain/server 纯度共六类约束，全部通过才放行；
  app 数据边界的历史存量登记在 `scripts/boundaries-app-baseline.json`，只能变小）。
- 依赖安全扫描可单独执行：`npm run audit:security`（生产依赖 high/critical 阻断，
  离线时默认跳过，CI 用 `AUDIT_MODE=require` 转成失败）。
- 浏览器冒烟可单独执行：`npm run smoke`（缺少浏览器或数据库时自动跳过，
  强制模式见 [验收标准](./acceptance.md)）。
- 可访问性审计可单独执行：`npm run a11y`（axe-core 扫描 11 个页面，
  `critical` / `serious` 为 0 才放行，CI 用 `A11Y_MODE=require`）。
- 性能预算可单独执行：`npm run perf`（关键读取 API p95 ≤ 500ms、关键写入 API
  p95 ≤ 800ms、核心页面 LCP ≤ 2500ms，CI 用 `PERF_MODE=require`）。

## 既有阶段规范

- [P0 账号地基规范](./P0-账号地基规范.md)
- [P1 模板集群规范](./P1-模板集群规范.md)
- [分阶段交付任务](./agent-team/task-spec.md)
