# ANS 架构说明

## 目标边界

```text
app → components → contracts/domain
app/api → contracts → domain → server
server → db / auth / integrations / observability
```

业务规则不放在页面和 Route Handler 中；Prisma、凭证和外部服务只允许从 `server` 访问。

## 领域模块

- `identity`：注册、登录、昵称、邀请码和权限。
- `content`：Prompt、版本、分类、标签和来源。
- `templates`：Schema、变量、审核和发布。
- `workflows`：DAG 校验、版本和执行计划。
- `runs`：运行记录、额度、重试和错误。
- `community`：收藏、评论、投票和通知。
- `governance`：举报、审核和审计。

## 工作流执行原则

服务端先验证 DAG，再用拓扑排序生成执行计划。每个节点有类型、输入输出、超时和重试限制。执行状态必须持久化，失败时按节点策略重试或终止，不能静默丢失中间结果。

## 目录边界

```text
src/
  app/         路由与页面适配
  components/  UI 组件
  contracts/   Zod 输入/输出契约
  domain/      identity / content / templates / workflows / runs / community / governance
  server/      auth / db / quota / integrations / observability
  lib/         通用工具
```

已落地的服务入口：`src/server/workflows/`（service、runner、review）、`src/server/favorites/`、
`src/server/quota/`、`src/server/credentials/`、`src/server/integrations/`（模型客户端与凭证加解密）、
`src/server/http/respond.ts`（统一响应信封）。

## 分层边界的强制手段

上面的依赖方向不是靠约定维持的，而是由两道工具检查强制：

- `scripts/check-boundaries.mjs`（`npm run check:boundaries`，已接入 `npm run verify`）
  做**传递闭包**分析，检查六类约束：

  | 检查 | 约束 |
  | --- | --- |
  | 客户端边界 | `"use client"` 文件不得（直接或间接）依赖 `@/server`、`@/lib/db`、`@prisma/*`、`next/headers` |
  | 组件数据边界 | `src/components` 下任何文件不得（直接或间接）到达数据库；服务端组件应改走 `@/server` 服务 |
  | app 数据边界 | `src/app` 下文件不得（直接或间接）到达数据库；存量由 `scripts/boundaries-app-baseline.json` 台账登记，台账只能变小 |
  | contracts 纯净 | 只允许 `zod` 与同层相对导入 |
  | domain 纯净 | 只允许 `@/contracts` 与同层相对导入 |
  | server 纯净 | 不得反向依赖 `@/components`、`@/app` |

- `eslint.config.mjs` 里的 `no-restricted-imports` 分层规则，在编辑器里即时提示
  **直接**越界。脚本能看到间接越界而 ESLint 看不到，ESLint 能即时提示而脚本要等门禁，
  因此两道都需要。

`src/app` 的数据边界采用**棘轮台账**而非整片豁免：

- 基线 `scripts/boundaries-app-baseline.json` 记录当前仍直接触达数据库的 app 文件，
  由 `node scripts/check-boundaries.mjs --write-app-baseline` 生成。
- 基线外出现新的越界 => 门禁失败；基线里的文件被改干净却没收紧台账 => 同样失败，
  因此清单只能变小、不能回退。
- `eslint.config.mjs` 读取同一份台账：对整个 `src/app` 禁止直接 import `@/lib/db`，
  再对台账内文件关闭该规则。编辑器与 `npm run verify` 共用同一事实来源，
  新增越界在编辑时就会标红，历史存量不会被一次性引爆。

闭包分析在三类「已认可的鉴权基建」处停止向下追踪：`lib/auth/index.ts`、
`lib/admin-permissions.ts`、`lib/template-access.ts`。它们读会话或权限是设计如此，
继续往下追会把整片 app 都算成越界，反而掩盖真正的业务查询。

脚本内置**空扫描保护**：若没扫到任何源文件或任何客户端组件，直接按失败处理，
避免「看起来全绿、其实什么都没查」的假绿。

`@/server` 是受认可的数据访问边界：服务端组件调用它是目标写法，因此
「组件数据边界」检查在到达 `@/server` 时停止向下追踪。

## 统一响应信封

所有 API 返回 `{ ok: true, data, requestId }` 或 `{ ok: false, error: { code, message }, requestId }`。
业务错误通过带 `code` / `status` 的领域错误抛出，由 `respondWithError` 统一映射；
未识别的异常一律映射为 500 且不泄漏原始消息。

## 主导航与信息架构

主导航按核心循环排列，三类内容对象各有一个一级入口：

```text
提示词 · 模板 · 工作流 · 运行记录 · 我的收藏
```

已登录用户额外看到「我的工作流」；技能、Taste、分类、标签、Promptmasters、团队与比赛等
低频入口按屏宽逐级收进「更多」菜单，避免主路径被稀释。收藏页 `ContentFavorite`
一次展示三类内容，构成「发现 → 运行 → 收藏 → 复用」的回流点。

## 内容与收藏模型

- Prompt、模板、工作流都通过不可变版本发布；公开页面只读取被钉住的发布版本。
- 工作流用 `publishedVersion` 指向公开定义，运行记录始终指向当时执行的版本。
- 收藏统一走 `ContentFavorite`（`@@unique([userId, targetType, targetId])`）一张表覆盖三类内容，
  通过 `targetType` 区分；`assertTargetVisible` 只允许收藏可公开访问的对象。
- 旧 `collections` 表已由迁移回填到 `content_favorites`，对应 API 已删除；
  旧表暂时保留，稳定后再单独删除。

## 审核与发布

工作流采用 AI 初审 + 人工复核双层把关，详见 [ADR 0002](./adr/0002-workflow-ai-review.md)。
初审结论落在 `reviewScore`，人工理由落在 `reviewNote` / `reviewedAt`；
AI 服务故障时保持待审，不会静默放开审核。

## 运行参数与 BYOK

`POST /api/workflows/runs/[id]/execute` 接受 `{ modelKey?, credentialId? }`，未知字段直接拒绝。
模型选择优先级：节点 `config` > 本次运行参数 > 平台默认（`RUN_BASE_URL` / `RUN_API_KEY`）。
用户自带 Key 用 AES-256-GCM 加密后落库（`v1:iv:authTag:ciphertext`），
密钥派生自 `MODEL_CREDENTIAL_SECRET`（回退 `AUTH_SECRET` / `NEXTAUTH_SECRET`），
列表接口只返回掩码，明文只在创建响应中短暂返回。

## 输入变量发现

节点 `config.variables` 显式声明优先，`{{input.xxx}}` 占位符作为补充来源；
两者合并去重后用于运行表单和必填校验（`src/domain/workflows/variables.ts`）。

## 数据库与迁移

- 迁移文件中的列名必须用双引号包住 camelCase，与 Prisma Client 生成的标识符一致，
  否则 `migrate diff` 会报告漂移。
- `npm run typecheck` 前必须清理 `.next/types`（`scripts/clean-next-types.mjs`），
  否则上一轮生成的类型会与当前路由不一致。
- 迁移演练结果见 [验收标准](./acceptance.md)。

## 平台方向与演进边界

长期产品方向及分阶段验收见[ANS 平台方向与落地路线图](./ANS平台方向与落地路线图.md)。架构演进继续采用模块化单体，先完善领域边界、授权一致性和执行可靠性；只有在运行负载、团队边界或独立部署需求有数据支持后才拆分服务。

目标领域逐步扩展为 `identity`、`projects`、`content`、`templates`、`workflows`、`runs`、`artifacts`、`teams`、`competitions`、`community`、`governance` 和 `billing`。这是一张目标地图，不表示这些域都已实现或都属于当前版本。优先复用现有 Prompt、Template、Workflow、Run 和收藏模型，新增领域须通过独立产品阶段与迁移评审。

### 工作流、运行与 Agent 执行

- 发布工作流采用不可变版本；运行记录绑定定义版本与输入快照，节点状态和中间产物可恢复、可追溯。
- 执行器经服务端端口接入，平台负责鉴权、配额、超时、重试、幂等、取消、日志脱敏和结果持久化。外部 Harness/Agent 由 ADR 评估后接入，不在领域层绑定具体供应商。
- 工具能力采用显式注册与最小授权；默认禁止任意代码执行和无边界网络访问。用户凭证不直接暴露给模型或不受信任的 Agent 工具。
- AI 分类、评审和内容生成均是建议或草稿；人工确认、治理状态和发布快照是单独状态，不可由模型调用隐式改变。

### 学生项目与成果的信任边界

项目、事实、生成草稿、人工确认记录及 Artifact 版本分别建模。每条事实记录来源与确认状态；成果记录其使用的项目事实、工作流版本和运行。私密默认值由服务端执行，覆盖页面、API、搜索、导出、下载、异步任务和外部集成。公开必须由用户针对明确的 Artifact 版本主动授权；撤回、删除、审核和访问均留审计记录。

团队与赛事、公开作品社区、创作者激励、付费权益属于后续域。引入之前先确定角色权限、成果归属、授权撤回、内容治理和运营责任，避免把不同业务状态塞进 `User` 或现有收藏表。

### 外部接口与客户端

Web 是当前产品事实源，先保证响应式体验。未来 MCP、CLI、移动客户端复用版本化 contracts 和应用用例，不直接访问 Prisma/数据库；集成需支持最小作用域、限流、配额、密钥撤销及审计。接口稳定与实际需求出现之前，不为“多端/生态”提前拆服务。
