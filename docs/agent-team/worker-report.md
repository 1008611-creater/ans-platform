# P0 发布候选实施记录 · 2026-09-10

## 实现

- 共享 PasswordInput 修复三个密码控件，真实 input 承载 label/ref/aria；按钮固定定位、背景和点击区，保留密码管理，抑制原生 reveal。
- 重置新增 PostgreSQL advisory lock、请求冷却与限次、猜码锁定、邮箱绑定 HMAC、旧码兼容；消费和更新同事务，成功使同邮箱其他重置码失效。未改密码长度校验、未改 schema、未加依赖。
- 补充密码重置和登录组件测试、注册组件交互测试，以及三项真实 PostgreSQL 重置场景。
- 读取原始交接 ZIP，纠正此前“注册测试不存在”“构建失败是历史问题”的错误结论；生产数据库迁移状态不能由旧文档推断。
- 修正文档 config GET、模板编辑 PATCH、审核 PASS/BLOCKED/UNAVAILABLE 契约，加入生产备份/恢复/回滚门禁。

## 根线程验证

| 命令或操作 | 结果 |
|---|---|
| `npm run lint` | 退出 0；0 errors、231 warnings |
| auth/password-reset 文件与新增测试的定向 `npx eslint` | 通过 |
| `npx vitest run`（JSON 报告） | 1070 tests：1032 通过、38 失败；9 个失败文件 |
| 登录/注册/密码重置/社区 API/模板 API/模板审核/模板 UI 定向 Vitest | 8 文件，150 tests 通过 |
| `npx vitest run --config tests/ans-p0p1.vitest.config.mts`（当时为 `.ts`，后因 Vite 8 配置加载器改扩展名） | 12 场景 PASS、0 FAIL、1 SKIP；外层 Vitest 1 test 通过 |
| 设置 DATABASE_URL 与 DIRECT_URL 为 `postgresql://postgres:postgres@127.0.0.1:55437/ans_integration?schema=public` 后 `npm run build` | 最终构建退出 0 |
| `git diff --check` | 通过 |

全量失败位于 admin-categories、admin-prompts、admin-tags、admin-users、mcp-handler、prompts-id、prompts、search、user-api-key。38 个失败与本轮修复前运行及交接基线一致；未修改这些测试来降低标准。全量不是全绿。

隔离库新增重置场景真实观测 2 个 advisory lock 等待者、双请求仅一次成功；8 个并发错误码请求触发限制；用户更新失败令验证码消费回滚。Profile 昵称锁因完整认证上下文按既有设计跳过，不将其记为通过。

## 浏览器证据

- 使用 Codex 浏览器；DOM/Playwright 读取超时后，改用同一浏览器文档支持的 screenshot + cua。
- 本地 `127.0.0.1:3017/login`：眼睛常显、测试字符串显示/隐藏、点空白后保留、刷新默认隐藏，截图确认。
- 本地 `/register`：密码和确认密码均完成上述检查，截图确认。本地缺邮件/人机配置显示注册服务未配置，未提交注册或发送邮件。
- 生产 `/register` 和 `/login` 已截图：当前看不到自定义眼睛；注册页面显示人机验证出错。不能作为发布通过证据。
- 生产 `/api/health` 在 2026-09-10T00:24:02Z 返回 status=healthy、database=connected。

## 生产阻塞与阶段状态

默认 known_hosts 指纹已与 SSH 服务端核对一致；旧别名使用过期专用记录。两把本地候选部署密钥均被拒绝，未使用未知密码、未关闭主机校验。已请用户提供授权凭据位置，尚未获得。

因此服务器 HEAD、容器、运行镜像、变量 configured/missing、迁移状态尚未读取；未 pg_dump、未迁移、未构建生产镜像、未重启。P0 生产未验收，P1 只有本地测试证据，P2–P4 不越过阶段门禁启动。原始交接提到公益/中文/匿名及 P4 独立 Flow/Ops；收费仍仅是最新路线的候选，不能擅自启用。

日志位于 gitignore 的 `.workbuddy/`：`build-final-20260910.log`、`lint-final-20260910.log`、`full-tests-final-20260910.json`、`target-final-20260910.log`、`integration-final-20260910.log`。原始日志不进仓库。

## ANS 重构轮次记录 · 2026-09-21

本轮按 `docs/implementation-plan.md` 完成阶段 0–7，并交付可运行的产品与一键门禁。

### 交付内容

- 产品与工程文档：`PROJECT_CONTEXT.md`、`CONSTRAINTS.md`、`docs/INDEX.md`、
  `product-spec.md`、`architecture.md`、`acceptance.md`、`implementation-plan.md`、
  `release-checklist.md`、`docs/adr/`（有限 DAG、AI 初审 + 人工复核）。
- 分层骨架：`src/contracts/`（Zod 契约与共享类型）、`src/domain/workflows/`（纯函数
  图校验、变量推导、执行器）、`src/server/`（auth 之外的领域服务、额度、凭证、
  工作流运行时、统一响应与审计）。
- 有限 DAG 工作流：拓扑排序、环检测、节点类型与输入输出校验、节点级超时与重试、
  中间状态持久化、取消与失败恢复。
- 身份与校园成员体系：学校邮箱验证、邀请码并发安全消费、匿名昵称、密码重置、
  角色与管理员权限，并为未来 CAUHub 成员接口预留适配层。
- 发现与复用闭环：首页、搜索筛选、统一内容卡片与详情页、统一运行入口、
  收藏与运行记录。
- 创作与审核：Prompt 编辑器、模板 Schema 与变量检测、工作流编辑器、
  AI 初审 + 人工复核、版本与修订审计。
- 运行引擎：平台模型池与用户自带 Key 双轨、额度扣减、日志脱敏、取消与重试。
- 质量门：`npm run verify`（11 步）、浏览器冒烟、可访问性审计、性能预算、
  依赖安全扫描、分层边界检查。

### 本轮验证

| 项目 | 结果 |
|---|---|
| `npm run verify` | 11 步全部通过，退出码 0 |
| `npm run typecheck` / `typecheck:tests` | 通过，无类型错误 |
| `npm run lint` | 0 errors / 232 warnings（历史存量警告，未在本轮清理） |
| `npm run test:unit` | 77 个测试文件、1195 个用例全部通过 |
| `npm run docs:check` | 全部相对链接有效 |
| `npm run check:boundaries` | 五类分层约束全部通过（扫描 541 个文件） |
| `npm run audit:security` | 生产依赖与含开发依赖均为 0 漏洞 |
| `npm run build` | 构建成功，131 个静态页面生成完成 |
| `npm run smoke` | 26 项检查通过（桌面 + 移动视口） |
| `npm run a11y` | 11 个页面扫描，critical/serious 违规为 0 |
| `npm run perf` | 读取 5 项、写入 2 项、页面 4 项全部在预算内 |

### 分层边界强制手段

- `scripts/check-boundaries.mjs` 做五类检查：客户端组件不得到达数据库/服务端模块
  （传递闭包）、`src/components` 不得到达数据库、`contracts`/`domain`/`server`
  各自只允许向下依赖。
- `eslint.config.mjs` 增加对应的 `no-restricted-imports` 规则；`src/app` 暂豁免
  （84 个历史文件直接访问 Prisma，属渐进迁移存量）。
- 两套检查都做过「非空转」验证：临时注入的越界探针全部被捕获，清理后恢复通过。
- 客户端组件 214 个中唯一一处真实越界（`community-panel.tsx`）已修复，
  共享类型下沉到 `src/contracts/community.ts` 并加了编译期漂移守卫。

### 已知限制

- BYOK 依赖 `MODEL_CREDENTIAL_SECRET`，未配置时禁止保存用户 Key。
- 平台模型池需要 `RUN_BASE_URL` / `RUN_API_KEY`；AI 初审需要 `WORKFLOW_REVIEW_*`
  （回退 `TEMPLATE_REVIEW_*`），未配置时降级为纯人工把关。
- 旧 `collections` 表已回填到 `content_favorites`，但暂未删除。
- 生产库备份恢复演练仍需在发布窗口单独执行。
- 浏览器冒烟默认只覆盖未登录公开页与凭据登录后的 4 个页面，不覆盖注册（Turnstile）
  和工作流实际执行。
- 性能门禁跑在本机单进程 `next start` 上，数字是回归基线而非生产 SLA。
- `src/app` 下仍有 84 个文件直接访问 Prisma，分层 lint 规则对其暂豁免。
