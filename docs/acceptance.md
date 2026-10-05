# ANS 验收标准与验证记录

> 当前产品基线见 [ANS 权威产品与架构总纲](./ANS平台方向与落地路线图.md)。本轮证据与历史记录分开；历史通过不能代替当前发布验收。

## 2026-10-05 本轮本地验证

状态：权威基线与首期主路径已实现；**生产构建、真实数据库联调、成果人工修改、三份成果的真实模型生成联调与四项发布门禁已在本地测试环境完成**。**真实生成已用本地中转 shim 打通，不等于生产网关验证；生产仍需真实 `RUN_BASE_URL` / `RUN_API_KEY`**。仍未上线，也未在生产环境验证。

- 最新全量测试：`npm run test -- --maxWorkers=2`，**101 个文件、1478 个用例全部通过**，退出码 0。默认高并发曾遇 Windows 内存分配失败，降低并发后通过；未跳过失败用例。
- 最新生产与测试类型检查：`npm run typecheck`、`npm run typecheck:tests` 均通过。
- 全仓 lint：0 error、211 warning；后续改动文件单独检查通过。存量警告未清零。
- 文档链接：95 个全部有效。分层检查：649 个源文件、六类约束全部通过，101 个历史 app 边界基线未扩大。`git diff --check` 通过。
- 新增覆盖：人工成果版本保存与来源保留、旧版本不覆盖、冲突拒绝、私密项目所有者权限、公开管理权限、事实证据字段保留、接口身份与异常映射、主导航与中英文文案、保存成功立即显示新稿、失败保留编辑内容。
- 本地开发预览：桌面 1440px、手机 390px/360px 首页；学习锚点、未登录创建项目跳转登录、手机菜单展开/收拢、中文/英文与浅色/深色检查。英文 360px 顶栏按钮裁切已修复并截图复核。检查使用仓库已有 Puppeteer 和系统 Chrome；未安装 Playwright。仅公共页面局部验收，**不是已登录的完整业务端到端通过**。
- 开发预览仍提示 next-intl 客户端时区回退、品牌图片尺寸警告；未将其记为零告警。预览服务已停止，未接生产数据库或模型。
- 生产构建已真实通过：`npm run build`（`prisma generate && next build --webpack`）退出码 0，webpack 编译、Next 独立 TypeScript 检查、138 个静态页面生成全部完成；`.next/BUILD_ID` = `DgRHWRFLleqx8PDjnhISg`。此前两次失败的真实原因是缺 `DATABASE_URL` 与沙箱阻止子进程，不是内存或代码；未修改 `next.config`、`tsconfig`、`package.json`，未跳过类型检查。
- 真实数据库联调（本机独立 PostgreSQL 18 实例，库名含 `e2e_test`，非生产库，迁移全部应用）：`scripts/e2e-acceptance.ts` **33/33 通过**，覆盖账号与额度、工作流环检测、提交/审核/AI 初审、额度扣减与失败退费唯一、运行落库、收藏复用、BYOK 明文不落库与越权拒绝、审计记录。脚本中两处过期的自我审核错误码断言已更正为产品实际返回的 `SELF_REVIEW_FORBIDDEN`（产品行为正确，属脚本期望值陈旧）。
- 成果人工修改的真实库验证：新版本号原子递增（1→2）、旧版本内容保留、事实快照哈希与来源沿用、过期版本返回 `VERSION_CONFLICT`、非所有者返回 `NOT_FOUND`、缺字段返回 `INVALID_INPUT`、归档后返回 `ARCHIVED`，且失败路径未产生多余版本。
- 真实模型联调（本地测试环境，经本地中转 shim，**不等于生产网关验证**）：**三份首期成果全部真实生成成功**——简历条目 12.2s、README 草稿 14.0s、一页项目介绍 8.3s，均 HTTP 201、版本号 1。做法：代码请求的白名单模型名（如 `openai/gpt-5.6-terra`）由只监听本机的中转改写为 McGrox 网关接受的 `deepseek-v4.1-flash` 后转发；密钥只在执行进程内存读取，未落盘、未进仓库、未发送到其他供应商。生成质量：三份都含「待确认」与「使用边界」（AI 草稿声明），未确认事实逐条标注「待确认——」，结果为「暂无」时未做推断，未出现虚构数字或排名。人工改版保存成功（版本 1→2），同版本号重复保存正确返回 `VERSION_CONFLICT`；导出返回 200 且为 `text/markdown; charset=utf-8`，含人工修改与使用边界。额度 200→194（每份 2 点，共 6 点），与 `PROJECT_WORKFLOW_COST_POINTS=2` 一致。数据库侧复核：三条运行记录均 `SUCCEEDED`（`costPoints=2`），三份版本 v1 分别关联对应运行号，人工改版 v2 无运行号（人工来源），扣费流水三条 -2、余额依次 198/196/194。**边界**：①该 shim 只在本机测试环境生效，生产仍需真实 `RUN_BASE_URL` / `RUN_API_KEY`；②模型名被中转改写，实际生成模型是 McGrox 的 `deepseek-v4.1-flash`，不是生产声明的模型；**2026-10-05 复测该模型已返回 404，此条历史证据不可再复现，仅作为当时链路打通的记录**；③用户登记的 McGrox 用途原为生图，本次用于文本属用途变化，**用户已于 2026-10-05 明确确认 McGrox 可作文本渠道**；④本机指向 `api.cauai.fun` 的文本入口此前返回 530（源站不可用），未换用其他供应商兜底。
- 模型网关白名单修正（2026-10-05 权威探测，**不是猜测**）：对生产文本网关 McGrox 的 `https://mcgrox.top/v1` 与 `https://www.mcgrox.top/v1` 两个域名分别读取 `/v1/models` 并逐个发起真实调用，两者行为一致。结果：白名单原 16 个模型中只有 `gpt-5.6-terra`、`gpt-5.6-sol`、`gpt-6-astra` 返回 200；其余 13 个 TR 国模（deepseek / glm / kimi / qwen / seed）与带 `openai/`、`zzzz/` 前缀的旧 ID 一律 404（`Model "..." is not supported by any configured account in this group`）；三个可用模型均支持 `reasoning_effort` 与流式返回。据此把 `src/lib/run-models.ts` 白名单收敛为这三个模型、`upstream` 去掉前缀，并同步修正受影响的测试断言与文档。用户已确认 McGrox 可作文本渠道。
- 发布门禁（真实构建产物 + 真实测试库 + 系统 Chrome）：浏览器冒烟 **26/26 通过**（桌面 11 页、移动 6 页、无横向溢出、底部三项主入口 + 账户、主导航收敛、抽屉可达）；无障碍 **11 个页面 axe 零违规**（critical/serious = 0）；性能预算全部达标（读 API p95 3–7ms、写 API p95 8–12ms、页面 LCP 36–156ms，均远低于预算）；依赖安全：生产依赖 0 漏洞，仅 ESLint 工具链的开发依赖 5 个 high 不进入运行时（按门禁设计告警不阻断）。
- 本轮同步修正了两处过期门禁断言（不是产品缺陷）：移动端底部导航按权威架构为三项主入口 + 账户（原断言写死 5 个链接），首页断言文案改为学习主线新标题。修正后 smoke 与 a11y 均真实通过。
- 未验证：生产环境部署与回滚、生产库备份恢复演练、生产网关下的生成质量与额度成本（本次生成经本地 shim、模型名被改写）、BYOK 在生产密钥配置下的保存、十人试用。没有提交、推送、PR、部署或生产数据写入。

下一步只做上述联调与发布验收，不扩功能。须在授权的测试环境验证；发布前完整门禁通过并获得本次部署授权。

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

- 目标用户可从方法示例进入自己的私密项目，填写并确认五项事实。
- 简历条目、README、一页介绍可逐份生成；生成前可见额度成本，失败有明确提示。
- 用户可核对草稿、人工修改、保存新版本、查看旧版本并下载最新已保存成果；人工保存不调用模型或扣点。
- 并发保存不覆盖他人/其他页面产生的新版本；失败时编辑框保留内容。刷新/关闭页面有编辑提醒，但当前不拦截站内导航，不宣称草稿完整防丢失。
- 团队成员不得访问非本人私密事实；公开管理默认折叠，申请指定版本须明确勾选授权。
- 10 人真实试用目标与记录按权威总纲执行，生成数量不等于学习完成或成果可用。
- 工作流环检测、非法节点和资源上限校验有效。
- 审核、发布、驳回、修订和运行均有审计记录。
- 私有内容、管理员接口和用户 Key 不发生越权或泄漏。

## 发布门

- 数据库备份可恢复。
- 迁移经过预演。
- 健康检查和核心用户流程冒烟通过。
- 旧镜像和回滚步骤可执行。

## 历史验证记录（非 2026-10-05 本轮证据）

> 以下保留原有工程记录，包括其中的“本轮”“当前”说法，均指当时版本。本次未重新证明完整 verify、真实库或生产构建通过，不得引用这些历史结论给当前版本放行。

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

- `prisma migrate deploy` 在空库上应用全部 45 个迁移成功。
- `prisma migrate diff --from-schema-datasource ... --exit-code` 报告
  `No difference detected.`，即迁移与 schema 无漂移。
- `prisma migrate status` 报告 `Database schema is up to date!`。

### 尚未纳入门禁

- 浏览器冒烟默认只覆盖公开页面与登录后的少数页面，不覆盖注册（依赖 Turnstile
  人机验证）；注册与生产网关下的真实模型调用仍需在发布窗口人工验证（本地测试环境已用本地中转 shim 打通生成链路）。
- 生产库的备份恢复演练仍需在发布窗口单独执行。
- `ans_integration` 演练库需单独 provision（harness 要求免密信任认证），
  真实集成场景才能在该库上复跑。
- 性能门禁跑在本机单进程 `next start` 上，读数是**回归基线**而非生产 SLA：
  它能发现「某次改动让接口慢了一个数量级」，但生产还叠了容器配额、网络延迟、
  多副本竞争和真实数据量，绝对值必须在目标环境另测。
