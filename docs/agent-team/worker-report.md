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


## 2026-10-11 当前整合审计实施（尚未上线）

REQ-I01：市场页面/草稿/公开购买绑定渲染账号，mutation 前验证真实session和x-ans-actor；换号卸载、请求abort及迟到返回拒绝。下单不确定结果固定首次完整command，商品version刷新不更换恢复内容。
REQ-I02：支付持久lease、冻结商户和订单号/金额/期限，未知响应先query；明确不存在才同号下单，未支付保留原参数；过期关单后再次确认CLOSED才本地取消，已支付竞态先记账。供应商最新Native路径白名单扩展至精确 /bizpayurl/up。收款仍未配置。
REQ-I03：模型明确未执行且退款完成的RELEASED可创建独立安全attempt，保留所有费用及上游拒绝证明；管理员免单不可当未执行重放，RUNNING/UNCERTAIN/SETTLED或payload/parent冲突禁止重试。
REQ-I04/I05：公开五维评分/全领域赛道/视频模式同步中英文；任务负责人、精确Demo引用、固定档案v2责任链与现场处理历史，旧v1读取兼容。新增唯一迁移20261011183000_agri_completion_provenance，不造生产数据。
额外独立审查缺口：补现金退款运营队列，以及正常DISPUTED待审批列表/审批入口；区分批准义务、派发请求与供应商确认退款；页面读取不发起供应商操作，所有真实资金按钮有明确确认文案。

实际本地检查：完整含测试类型退出0；197文件2584通过/10既有跳过；完整lint0错误/383既有warning，分层六类通过。首次全量市场route缺actor fixture导致2项409失败，已补正确actor和旧actor拒绝验证，后全量通过。退款UI首次精确文本匹配失败（实际与渠道同一段），改为包含匹配后18项全部通过；未更改业务为迁就断言。
农客松独立PG17：旧72schema下v1档案seed→唯一新迁移→旧canonical bytes/hash完全一致，12业务+2fresh Node持久读回成功。首轮检查器大小写、移出迁移后的checker路径失败保留；没有把失败结果算通过。迁移SHA256=a3f9a5ab4bcbac57ae128b7fe7ccd25be2263a1a8466eef420c7d393b38490eb。证据C:/Users/lsb/.workbuddy/ans-agri-completion-evidence-20261011/。

限制：上述为实施及本地/隔离证据，不代表生产发布、五轮完整审计或真钱交易成功。新v2写入后旧reader不能读v2；回滚应保留兼容reader，不能删除迁移或还原生产库。真实赛事尚未绑定，当前没有新v2生产写入；部署前后再次核验此条件。main最新品牌和Hypit成果全部保留。

## 2026-10-11 UI / Hypit / 链动积分档位统一整合（本地阶段）

任务REQ-UI01..05及REQ-P01..05可执行；已保留原产品与业务边界。合入UI交接（共享标题、工作流横排、工作台工具、手机分类横滚）并保留Hypit；整合Hypit三张官方海报原字节及官方流式示例、输入指引，独立审查发现播放/关闭丢焦点后补ref恢复与44px关闭控件。新增五档100/500/1000/2000/5000积分、¥10/50/100/200/500；只允许准确核对过的单独商品映射，未上市禁购，保留10分原商品。后台仅新增快捷选择，原生成权限/兑换原子单次入账/换号保护不变。VibePlan周/月/季独立页面展示准备中，无虚构价格权益；审查发现嵌套main与inactive面板后修复。充值方向已按用户更新为链动小铺卡密，不再要求直接微信/支付宝接入。

本地完整lint退出0、0errors / 382存量warnings；充值4文件30项、独立6文件34项、Hypit8项及完整test TypeScript通过，证据分别保存本机handoff目录。精确Linux检查、隔离DB、备份恢复、main提交及线上桌面手机仍由后续实际证据证明。旧市场verifier已修源而非overlay。schema/packages/migrations无新改动。真实库存准备已在生产用现有唯一卡密创建者管理员生成5批×20张，不是测试卡，无兑换/积分入账；明文仅服务器0700/0600私有目录，未打印或放Git。店铺商品发布与库存导入等待浏览器操作规则要求的当前步骤确认，生成库存不代表已出售或真实收款。

发布磁盘清理已真实执行：删除已逐引用核对的6个过期停止ANS容器及15旧ANS镜像标签，保留运行当前镜像和最近3回档镜像、其他应用和所有volume；数据盘可用从3.2GB到12GB。证据服务器b9发布目录ui-next-retention-cleanup/result.json，未清除旧审计/备份文件。
