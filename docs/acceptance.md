# ANS 验收标准与验证记录

## 基线门

- `npm run lint` 通过。
- `npm run typecheck` 通过（生产源码和路由）。
- `npm run typecheck:tests` 通过（`src/__tests__` 与测试配置；`next build` 的
  TypeScript 阶段口径相同，这一步让它提前独立暴露）。
- `npm test -- --run` 通过。
- `npm run build` 通过。
- 文档相对链接可达（`npm run docs:check`）。
- 分层边界检查通过（`npm run check:boundaries`，含客户端边界与组件数据边界的
  传递闭包分析；六类约束全部通过，其中 app 数据边界以
  `scripts/boundaries-app-baseline.json` 棘轮台账为准，台账只能变小）。
- 依赖安全扫描通过（`npm run audit:security`，生产依赖不得有 high/critical 漏洞）。
- 浏览器核心流程冒烟通过（`npm run smoke`，在真实构建产物上跑）。
- 可访问性审计通过（`npm run a11y`，axe-core 扫描 11 个页面，
  `critical` / `serious` 违规为 0）。
- 性能预算达标（`npm run perf`，关键读取 API p95 ≤ 500ms、
  关键写入 API p95 ≤ 800ms、核心页面 LCP ≤ 2500ms）。
- 以上各项由 `npm run verify` 串联执行，作为唯一发布前门禁。

## 业务门

- 学生可完成注册、登录、发现、运行、收藏和再次复用。
- 创作者可创建 Prompt、模板和工作流。
- 工作流环检测、非法节点和资源上限校验有效。
- 审核、发布、驳回、修订和运行均有审计记录。
- 私有内容、管理员接口和用户 Key 不发生越权或泄漏。

## 发布门

- 数据库备份可恢复。
- 迁移经过预演。
- 健康检查和核心用户流程冒烟通过。
- 旧镜像和回滚步骤可执行。

## 本轮验证记录

### 自动化测试

- 工作流领域与运行时：`workflow-service`、`workflow-review`、`workflow-graph`、
  `workflow-executor`、`workflow-runner`、`workflow-variables` 全部通过。
- 工作流 API 路由：`workflow-routes`、`workflow-validate` 全部通过。
- 收藏、凭证加解密：`favorites`、`credential-crypto` 全部通过。
- 全量单元测试：**77 个测试文件、1195 个用例全部通过**，无失败用例。
- `npm run verify`（typecheck → typecheck（测试）→ lint → 文档检查 → 分层边界 →
  单元测试 → 依赖安全扫描 → build → 浏览器冒烟 → 可访问性审计 → 性能预算）
  整体通过，退出码 0（共 11 步）。
- 文档检查覆盖全部相对链接（当前 36 个），全部指向真实文件。
- `npx tsc -p tsconfig.json --noEmit`（含 `src/__tests__` 与测试配置）无错误；
  `next build` 的 `Running TypeScript` 阶段与之口径一致。

### 依赖安全扫描

`scripts/security-audit.mjs` 包装 `npm audit --json`，并接入 `npm run verify`
（11 步中的第 7 步，位于单元测试之后、build 之前）：

- 生产依赖（`--omit=dev`）出现 **high / critical** 漏洞 => 门禁失败，阻断发布。
- 仅开发依赖出现漏洞 => 打印告警但不阻断（开发链路不进入运行时）。
- 审计服务不可达（离线、代理不可用）=> 默认跳过；CI 用 `AUDIT_MODE=require`
  把跳过转成失败，避免扫描被静默忽略。npm 审计接口偶发超时时自动退避重试至多 5 次。
- 当前结果：生产依赖与含开发依赖均为 **0 漏洞**。

复现命令：

```bash
npm run audit:security
```

本轮为清零漏洞完成了依赖升级：`next` 16.1.7 → 16.3.5（修 critical）、
`sharp` 0.33.5 → 0.35.4、`vitest` 系列 2.1.9 → 4.1.11、`@vitejs/plugin-react`
4.7.0 → 5.2.0、`puppeteer` 24.37.1 → 25.11.0，并在 `package.json` 增加
`overrides`（`deepmerge-ts`、`dompurify`）收敛传递依赖。初始状态为 61 个漏洞
（5 critical / 20 high），现已清零。

### 浏览器核心流程冒烟

`scripts/smoke-e2e.mjs` 在真实构建产物（`next start`）上跑核心路径，并已接入
`npm run verify` 作为 11 步中的第 9 步。它在独立冒烟库 `ans_smoke` 上实测通过：

- 覆盖 11 项页面检查：首页、提示词广场、模板广场、工作流广场、登录页、注册页、
  注册未配置提示、登录、我的收藏、运行记录、账户设置，全部通过。
- 页面异常采集包含未捕获异常、控制台 error 与 5xx 响应；第三方噪声有显式白名单。
- 账号为幂等写入，且只在「本机地址 + 库名含 smoke/test/verify 等关键字」时才写入，
  避免把已知密码的测试账号种进生产库或日常开发库。
- 缺少浏览器、缺少构建产物、数据库不可达或缺少新表时按「跳过」处理（退出码 0），
  因此本地没有 Docker 也能跑完整门禁；CI 用 `SMOKE_MODE=require` 把跳过转成失败。

复现命令（Windows PowerShell）：

```powershell
$env:SMOKE_DATABASE_URL='postgresql://<user>:<password>@127.0.0.1:55437/ans_smoke'
$env:SMOKE_MODE='require'
npm run smoke
```

### 真实数据库端到端验收

在独立 PostgreSQL 演练库上运行 `scripts/e2e-acceptance.ts`，结果 **33/33 通过**，
覆盖：

1. 账号创建、额度初始化与越权拦截。
2. 工作流环检测、未提交不能发布、不能自审。
3. 提交审核写入 `PENDING` 与 `WORKFLOW_SUBMITTED` 审计。
4. 提交即写入 AI 初审结论（未配置时为 `UNAVAILABLE / NOT_CONFIGURED`）。
5. `BLOCKED` 结论下人工发布被拒绝（`REVIEW_REQUIRED` / 409）。
6. `PASS` 结论下可发布，并写入 `reviewNote` / `reviewedAt`。
7. 管理员不能复审自己创建的内容；重新发起初审会刷新结论。
8. 额度扣减、额度不足拦截、失败退费唯一。
9. 运行节点逐条落库、重复执行被拦截、取消路径。
10. 收藏幂等、未发布内容不可收藏、复用与运行记录。
11. BYOK 不落明文、列表只返回掩码、跨用户越权被拒绝。

### 数据库迁移

- `prisma migrate deploy` 在空库上应用全部 35 个迁移成功。
- `prisma migrate diff --from-schema-datasource ... --exit-code` 报告
  `No difference detected.`，即迁移与 schema 无漂移。
- `prisma migrate status` 报告 `Database schema is up to date!`。

### 尚未纳入门禁

- 浏览器冒烟默认只覆盖公开页面与登录后的少数页面，不覆盖注册（依赖 Turnstile
  人机验证）和工作流的真实模型调用；这两条仍需在发布窗口人工验证。
- 生产库的备份恢复演练仍需在发布窗口单独执行。
- `ans_integration` 演练库需单独 provision（harness 要求免密信任认证），
  真实集成场景才能在该库上复跑。
- 性能门禁跑在本机单进程 `next start` 上，读数是**回归基线**而非生产 SLA：
  它能发现「某次改动让接口慢了一个数量级」，但生产还叠了容器配额、网络延迟、
  多副本竞争和真实数据量，绝对值必须在目标环境另测。
