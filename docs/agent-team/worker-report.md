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

## 2026-10-12 Billing catalog and audited PR integration

REQ-B01/B02/B03/B04/B05: approved commercial rules are saved in the commercial architecture, six versioned subscription SKUs, independent grant schedules and fixed CNY conversion (CNY 1 = 10 compute points). Membership sales remain blocked: the persisted batch lifecycle, purpose isolation, refunds, entitlements and verified procurement cost are incomplete. This change publishes an accurate plan preview; it does not issue memberships or revalue existing balances.

Production recharge-r2 and exam reservation source increments were verified against transferred hashes and integrated, preserving APIC units and the existing LDXP product mapping. PR30 developers and PR47 template discovery were adapted to the current main; current favorites, growth rewards and APIC estimates remain. PR29 is superseded by the existing localized metadata implementation. VibeHub public labels use AIGC Workbench.

Independent reviewer open_pr_audit executed 174 targeted tests, scoped lint and architecture boundaries. The exam writer contract matches the read-only reservation query. A full local run initially found three outdated voucher mock failures; the missing locale mock was added and business assertions retained. Final frozen Linux build and production evidence are still pending at this checkpoint. The companion/settings handoff is not included in this checkpoint. No production test accounts, memberships, orders or real payments were created.

## 2026-10-12 Companion/settings and admin clarity integration checkpoint

REQ-B08: the 11 source files and four renderer text files were individually hash-checked against the frozen handoff. A parent reduced-motion effect was restored from the pre-change implementation so system preference and unsupported environments retain the static mascot. The old task, logout, origin, frame and lifecycle checks were retained; the new interface/i18n and legitimate audio-stop messages were adapted. Forty-four companion/header regression tests pass, including default silence and explicit opt-in behavior. Admin clarity retains exam projection and original retry keys; seven safety/exam checks and scoped type/lint pass. These are local implementation checks, not final production acceptance.


## 2026-10-12 本轮正式发布结果

应用29dec185实际部署并通过候选/正式健康与页面验证、备份恢复及精确Linux检查。2683项通过、10跳过；history31/completion14/market13仅隔离验收。套餐展示已上线、会员售卖仍关闭；PR47/30合并，PR29替代关闭。真实HTTPS手机/桌面验收证据及未验边界见 production-release.md 本轮节与 ans-billing-release-20261012/browser-verification.json。冻结后f4172f18知识区增量尚未包含在本轮运行镜像；文档提交不改变已运行应用。

## 2026-10-12 知识区返回布局修复

REQ-V01..04可执行。正式f4172f18浏览器验收发现ISSUE-V01：知识区刷新后返回项目广场，共享RootLayout沿用服务端初始路径，主导航/页脚/恐龙缺失，滚动720实际仅384。新增客户端SiteFrame按usePathname决定站点框架，Header/Footer仍由服务端ReactNode slots传入，Providers持续保留；embed/kids裸布局范围沿用原逻辑。新增同一root跨区切换回归，无真实业务写入。

本地2文件10测试、3文件lint零错误零警告、完整typecheck及六类边界通过。独立审查源复核PASS，ISSUE-V01=FIXED_WAIT_RETEST；精确Linux构建、备份恢复和正式HTTPS返回/滚动证据待部署完成后填写。

## 2026-10-12 返回滚动晚布局补正（同一 ISSUE-V01）

2fac7f32已正式部署healthy，环境与mascot挂载逐项保留、44封面+24恐龙文件哈希一致，候选/正式各12路径200。主导航/main/footer/1恐龙iframe恢复；真实无菜单复验1512→1559仍偏47px，不能将此版滚动记成功。旧provider在3帧稳定即终止，后续布局锚定会移位。移除提前停止，保持原有限4秒settling窗口；wheel/pointer/touch/滚动键以及独立审查要求的Tab/Enter主动交互立即取消，保留cleanup及deadline。新增回归覆盖3帧后继续、晚47px移位、deadline结束、wheel/Tab/Enter优先。3文件11项通过，新增2文件lint零错误零警告，完整TypeScript通过。下一r2精确构建和实际返回仍待核验。

## 2026-10-12 知识区精简增量整合与来源审查

main并行新增1f5b224d知识区文案/下一步/本机保存提示，已合并babb4c41并保留滚动aa379e54。范围23知识应用文件 +2滚动源码/回归 +2资料。独立审查发现精简误删来源，已保留紧凑footer来源及2原链接、VibeHub课程/基础路径和ANS原创行标记；没有恢复冗文。zh/en322键与ICU对齐，持久设置隔离harness核对保存失败内存退化、重试、空值、跨tab更新/clear；无业务API写入。完整本地类型、源lint和11导航回归通过。源审查PASS，ISSUE-V01待最终精确Linux/HTTPS滚动关闭。r2因main前进、r3因来源复核而停止，均未切生产；首修2fac7f32已上线布局恢复，晚47px滚动失败记录保留。最终发布只包含本节冻结源，未完成恐龙Agent/赠额入口不插入。


## 2026-10-12: Knowledge return and cover sizing implementation completion

REQ-V01..03: final25580 integrates client frame restoration, bounded scroll recovery, true8:5 cover reservation and normally merged concurrent footer simplification. Live5aae showed a late72px offset and was not called a pass; the cover ratio was subsequently fixed without lowering acceptance. Exact Linux gates and candidate/production12route checks pass. Final desktop1440 and mobile2284 remain identical after6seconds and another5seconds; incomplete and decoded cover rects match.44covers/24companion files, environment/mounts/migrations are preserved. Full evidence and failed attempts are described in production-release.md.

AC-V04 authenticated favorite persistence was not repeated; oldf417 evidence does not verify25580. Membership purchases remain disabled. No real payment, redemption, member grant, model/TTS execution. Running application revision is25580; documentation commits are not a new deployed app. Independent acceptance is limited to this knowledge/cover/return and publication scope, not completion of all ANS commerce features.


## 2026-10-12 Hub 可运行工作流市场离线安全回归

REQ-H03/H04 可执行。workflow-market 实施角色最后限定范围为安全检查：5 个新增文件 65 项，连原 service/runner/review/worker/market/API 共 11 文件 174/174 通过；新增文件 lint 零错误零警告，完整 typecheck 通过。实际服务API、冻结版本绑定、人工审核、actor/same-origin、ack、canonical input/幂等、锁先于扣费、owner-only history、durable worker confirmation 和固定 renderer 输出均有隔离检查。真实 handler/executor 注入离线模型响应，不调供应商、不写生产、不收费。详见 ans-hubs-release-20261012/workflow-market-test-worker.md/json；这是实施自测，独立复验、真实隔离DB计费并发及正式部署仍待主控。


## 2026-10-12 HR05 / HR07 / HR08 / HR09 增量自测

本轮新增 19 项（真实 MarketWorkflowRun 组件 9 项、服务安全 10 项）。重新运行六个安全文件 84/84 通过；两个新增/修改检查文件 lint 0 错误、0 警告；完整应用 tsconfig.typecheck.json 通过，exit 0。此前 11 文件 174/174 为先前基线，本轮未重复运行，不合并数量虚报当前全量结果。

HR07 使用真实 MarketWorkflowRun、MarketAccountBoundary 和请求 hook，只隔离低层网关：市场/direct reviewed recipe 两入口刷新丢回执复用原确认 key、只存 SHA256 摘要和 key、actor/endpoint/version/input 隔离、未确认与必填空缺不提交、digest 并发只发一次 POST、账号切换 abort 且迟到旧响应不清恢复槽。HR08 市场与 service 两层缺失/空白变量均无 create/debit。HR05 稀疏原始元信息用实际执行说明生成合法 pending listing；并发重复上传恢复同记录且只提交一次。另覆盖数据库唯一键冲突恢复原 run、不再次扣费；HR09 固定 recipe 旧 service 入口拒绝绕过确认。

证据：ans-hubs-release-20261012/market-workflow-incremental-safety-tests.json、market-workflow-incremental-tests-lint.json、workflow-market-test-worker.json（包含当前源哈希）。只改测试与交接报告；无 commit/push/deploy、无生产写入、无模型收费调用。此为实施自测，仍需独立审查；上线由根主控统一执行。


## 2026-10-12 Hub / workflow release freeze checkpoint
REQ-H01..H06: six primary navigation targets, four truthful Hub directories, actor-bound project/workflow/knowledge favorites and public works/services profiles; legacy public prompt UI retired with same-origin redirects, historical records and shared APIs retained. Fixed resume recipe renders real validated personal facts through existing website code. Upload binds reviewed immutable workflow versions to market review; both recipe and market runs require actor, acknowledged input, version and retry-key checks before debit. Generic forms now abort on account changes and retain only hashed-input retry keys across reload. No production seeds or paid model/TTS/payment transactions were performed.

Local final regression: 2808 passed, 10 skipped, zero failed; an earlier broad run found one existing Hypit focus timing failure, then its isolated 9 checks and final full suite passed without modifying Hypit. Application and test types passed; lint zero errors with 351 retained warnings; six boundary checks passed after removing 27 retired entries from the baseline (no new exemptions). Independent HR01..09 issues closed with actual source/regression evidence.

Release gates still pending at freeze: exact Linux build, fresh application-schema snapshot restore and additive PROJECT enum rehearsal, migration, precise image, official HTTPS desktop/mobile evidence. Source packaging explicitly keeps all three root licenses, original covers and separately mounted mascot assets. No member subscription sales or actual vendor billing acceptance is implied.


## 2026-10-12 Hub production deployment completion

REQ-H01..H06 frozen application 71ab389593b536fad57c8fece92940376d0be04b was fast-forwarded to main and deployed at 2026-10-12T07:06:53Z. Image c5fb1c7d67f27ad311217c41ce5fb0f6a54202f440de5d097bccdf78d65ad32a is healthy, exact environment and mounts retained, 74 successful migrations including the rehearsed additive PROJECT enum. Original 44 GitGlow covers, 24 mascot files and 3 licenses match hashes. Linux frozen checks and build/image/backup/deploy exits all zero. First migration-launch EACCES failure is retained; temporary migration launcher now directly uses existing image CLI as root, not npx package acquisition.

Actual HTTPS 18 pages and five retired redirects passed. Authenticated browser checked six desktop/mobile destinations, account menu order, real prior Tooltip favorite, public profile existing7XP/1checkin/Lv1, four truthful Hub content groups, English switching and Chinese restoration, VibePlan disabled purchase and fixed ¥1=10 credit rate, five existing Liandong recharge amounts. Width1304/1289 and mobile390/375 have no horizontal overflow; viewport reset. Evidence is in C:/Users/lsb/.workbuddy/ans-hubs-release-20261012. No production data fixtures or paid generation/payment/redemption/check-in/equip were executed. Published community workflows are actually empty, so new market recipe runtime production output/billing is not claimed from offline coverage. Independent final release review remains separately reported.


## 2026-10-12 R9 companion local integration

Received the frozen 20-file R9 package; agent.patch SHA-256 fe09e4aa634cc7afa494357cb023682c5e8430f0fe81ef10237601242f63ec3c matches and git apply --check passed against the current shared worktree. Applied only companion/model/gateway files; existing Hub/platform workflow edits were retained. Includes half-screen bounded/resizable remembered panel, default-muted header speaker, real model selector immediately left of send, and no spent/reserved/balance numbers in the conversation. The package also contains an authenticated metered read-only Agent, so this is not merely a CSS change.

Integration corrected /@username route hints rejected by the candidate schema, with query-string/traversal regressions; added verified /hubs, /community and /market tool destinations while preserving /vibe-hub as a valid knowledge resource. Explicit metered consent now says conversations are billed by selected-model usage and provides the existing billing link without printing balance/spend figures.

Current 7 targeted files / 106 offline checks passed; scoped lint zero errors and one retained pathname-effect warning. Own complete application TypeScript process terminated with two concurrent platform-recipes literal-parameter mismatches (favorites/service.ts:118 and workflows/service.ts:359), zero companion diagnostics; this is not claimed as an application typecheck pass. Root is running unified types. No live model, TTS, business data, production write, commit, push or deployment performed by this integration role. Exact source hashes and scope are in C:/Users/lsb/.workbuddy/ans-hubs-release-20261012/dino-r9-integration.json. Independent review, Linux release gates and actual desktop/mobile HTTPS acceptance remain with the release owner.


## 2026-10-12 platform recipe follow-up implementation

REQ-R01..R06: registered fixed-code resume recipe, exact provenance and current owner authority, immutable recipe and market version, public safe projections, real Hub-to-recipe/market links, favorites fallback, managed run source/scope/transaction checks, official publication excludes growth awards. Ordinary member review and legacy project paths retained. Fixed CNY1=10 points copy and truthful unified actual-usage billing; advanced node structure collapsed. R9 integration recorded above.

Local final checks: application typecheck passed; six boundary checks passed; full lint 0 errors/351 existing warnings; 223 test files with2931 passed/10 skipped/0 failed. Evidence C:/Users/lsb/.workbuddy/ans-hubs-release-20261012/followup-tests-final.json and followup-lint.json. Initial full run Hub fixture missing platform mock failed once, replaced with registered/invalid/withdrawn-version behavior checks and rerun. Independent source review PASS records actual checks separately. No production registration, generation, personal input, model/TTS charge, account/order/XP write performed at this source freeze. Exact frozen Linux build, fresh backup, real official supply publication, preserved runtime and browser acceptance remain release work.


### Platform registration real PostgreSQL compatibility correction

First release attempt695e41cb completed frozen Linux build/image and fresh118-table/74-migration restore, but failed before registering any workflow/listing and before production switch. Actual read-only PG diagnosis reproduced Prisma P2010 for $queryRaw SELECT pg_advisory_xact_lock (void decoding). Replaced only this registration lock with $executeRaw; the same actual PG transaction succeeded and released without business writes.80 targeted registration/runtime checks genuinely passed after the fix; no synthetic production record or model request was used. Preserve R1 failed deployment evidence and build a separate R2 immutable revision/image before retry.


### Platform registration bounded transaction budget correction (R2 follow-up)

R2 registration failed before production switch; existing workflow/listing remained absent. The original publisher masked its detailed error, so its original Prisma code is not asserted. The preparation role independently executed a read-only 13-query comparison on the real Session pooler: the default 5000ms transaction failed at query13 with P2028 after4883ms; the same sequence with maxWait15000/timeout30000 completed in5500ms. Source/provenance hashes, active ADMIN MARKETPLACE_MANAGE owner, locks and schema independently passed. Evidence: /srv/ans-releases/ans-platform-recipe-r9-r2-20261012/readonly-timeout-comparison.json (local copy maintained by release preparation).

Changed only the explicit platform registration transaction to finite maxWait15000/timeout30000; advisory lock, owner lock, uniqueness/conflict checks, immutable source and registration audit remain in the same atomic transaction. No global timeout change. The deployment CLI now reports only stable platform error codes or a bounded Prisma Pdddd code; ORM messages/metadata remain suppressed. Offline registration/runtime81 checks passed, including first registration and idempotent transaction-option assertions and diagnostic redaction. Targeted lint passed; complete application and test typechecks both exited0. No real registration, model call or server modification executed by this role. ISSUE-HR13 awaits independent re-review and actual frozen-release registration before closure.

## 2026-10-12 R3 实际登记与生产上线完成

应用冻结 `1c1d4db1897dd738812963562a33d6f329bf56cb` 已进入 main 并正式部署，image a6694acb / BUILD_ID Y3jvHQM_xL96PNVZdEQQ5，deploy.exit0、healthy/database connected。官方 resume-website-v1 真实workflow immutablev1与市场卡已登记并读回，XP7→7；普通成员审核、来源/代码/版本/事务重验保留。R1锁void兼容和R2有限事务预算修复经过实际PostgreSQL诊断及R3成功发布，独立reviewer依据实证关闭HR13。

Linux223文件2932通过/10跳过，类型/边界/lint/生产build通过；118表fresh隔离恢复和71静态文件hash一致；74迁移零新增DDL。生产桌面/390手机六导航、账号收藏算力、四Hub、真实workflow/market表单、空输入disabled、折叠高级结构、R9静音/模型同排/一iframe/无横向溢出通过。所有浏览器操作只读，不提交资料或生成。收费模型/TTS、支付/兑换、完整订阅履约及市场结算未验收，整体goal仍active。证据在 ans-platform-recipe-r9-r3-20261012/browser-verification.json、local-safe-evidence-manifest.json及实际截图；正式详录见 production-release.md 本日R3节。
## 2026-10-12 农客松安全修复（本地复验完成，部署待执行）

REQ-AU01：任务列表在一次批量分享授权重验后读取最终数据库时间，过滤读取期间到期或撤销的分享；本人任务保留，分页沿原扫描边界推进，serverNow 与截止状态均使用最终时间。独立 reviewer 的实际源码复现由旧版返回一条改为零条，相关六文件 68 项通过。

REQ-AU02：普通赛事提交/审核在显式绑定、任一持久化工作区或阶段历史下拒绝旧入口。新增独立 migration 20261012213000_agri_legacy_workspace_boundary 仅收紧旧 guard 对 disabled 工作区的保护；保留纯 REGISTERED、额度元数据、普通赛事、OLD/NEW 归属及 NOWAIT 锁序。原 migration 与业务数据未修改。独立三文件 58 项、受限本机 PostgreSQL 75 项 migration 和八项直接 SQL mutation 拒绝通过，验收 fixture 回滚后零行。ENV-only 认领目前由应用保护，SQL 按持久化 workspace/history 认领。

本机完整应用类型、六类边界通过；提交前 full lint 0 errors / 351 warnings。测试完整类型已由任务实施员工验证通过。两个问题由独立 reviewer 按本地源码/隔离验收范围关闭（HR14、HR15），正式运行仍须精确父版、备份恢复、迁移演练和上线后复验。先取得刚上线市场的精确源码提交与 parent，避免覆盖其新增供应、Star、积分支付与 SDK 功能。没有生产造数据或执行真实付费模型/订单；不宣称完整会员或农客松全部验收完成。

安全证据：C:/Users/lsb/.workbuddy/ans-agri-current-audit-20261012/legacy-fix-independent-review.json、legacy-guard-isolated-postgres.json、full-lint-current.log、typecheck-current.log；HR14 独立证据在 ans-vibehub-followup-audit-20261012/agri-task-list-expiry-fix-review.json。

### 2026-10-12 当前六导航质量门纠正

PR54 首轮 Linux CI 已通过 225 文件、2948 测试（10 skipped）及构建，实际 browser smoke 失败于旧版四 Tab 和旧 /workflows 抽屉期待。真实产品是六导航。REQ-AU04 的候选验证现明确独立六路径顺序与两条退役跳转（/prompts→/explore、/templates→/hubs），公共/登录后内容分别检查，并增加 authenticated community/workspace 手机 axe。保留原异常/5xx/横溢出、axe critical/serious 零、require fixture 与 500/800/2500 性能预算；旧共享 API 的读取/写入兼容检查不删除。

候选曾误把 templates 指向 explore、把私有 community 放公共内容扫描；独立审查发现后已纠正。三个脚本语法与 source 独立复验通过，脚本实际 no-ignore lint 零 errors，完整 lint 0 errors / 351 warnings。HR16 为 FIXED_SOURCE_PENDING_CI，尚不能称新 CI 通过。未在终端操纵本机浏览器，后续由真实 CI 和许可浏览器证据验证。

### Current marketplace and performance gate integration

Integrated exactly71 reviewed live marketR3 files (43added/28modified) from sourceSHA60bb4f849a47b2705f086ac8700dd1f1e830632ed9aaafaf1a6ab52c7017249b; retained local safety fixes and release docs, excluded unpublished TTS. One test EOF blank line was removed for diff-format compliance only. Application types passed,18files216targeted regressions passed, complete lint0errors351existingwarnings. Evidence: integrated-types.log/integrated-targeted-tests.log/integrated-final-lint.log.

Actual44c8 CI passed smoke and23-page axe, but favorite writesHTTP409 failed because the probe lacked the expected-account header. Updated probe reads actual preview cookie session.user.id and sends that actor header on paired POST/DELETE of an existing PUBLISHED nonofficial WORKFLOW. Retained500/800/2500budgets, sample counts and real201creation requirement. Independent source review passed; latestCI remains pending. Production authorization is unchanged; no production fixtures were written.

Backup verifier adds only the exact reviewed guard SQL allowlist; preserved PROJECT branch, rejected unknown/combined/tampered pending migrations. Added guard function definition/metadata and all trigger attestation, rolled-back parser witness and preservation of restored rows/constraints/indexes/historical migration records.34offline fault-injection checks and syntax passed. Actual fresh backup/isolated restoration/migration rehearsal still pending.

### R10 companion UI inclusion

Applied exactly14 reviewed R10 client/UI/message/test paths from patchSHA4331c4d9b2d428013035c3a24d9aac7ca21173efb866e2f9ef3ae9bf29d3c736, matched delivery LF bytes. Independent source reviewer PASS: safeMarkdown and explicit links, per-account remount/abort/generation late-response isolation, quote/confirm/expiry boundaries retained, submitted-ticket status-only recovery, in-memory mode drafts/history, localStorage only model enum and size. Root integrated5files35tests pass, applicationtypes exit0, completeESLint exit0/353warnings. Delivery's8files83tests and desktop/390zh/320en isolated component UI evidence remain separate worker evidence; entity phone keyboard and actual charged model/TTS not verified. No database/dependencies/service billing/3Dasset changes. Runtime publication still pending.
