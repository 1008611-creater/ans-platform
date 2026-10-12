# ANS 分阶段交付任务

## 2026-10-12 套餐、固定换算与待合并PR发布（当前）

任务等级XL。用户明确授权将已确认商业方案上线，并审计其他当前PR后合并部署。主控统一发布，保留其他聊天已经授权的真实生产增量。价格及经营基线见ANS商业化与计费架构.md。方案批准不证明成本/权益/退款/交易结算就绪；不能只公布价格后冒充完整售卖。

- REQ-B01 / AC-B01：六档VibePlan/Pro周月季价格、积分、期限与发放规则共用版本化目录；¥1=10积分固定且与上游USD计量分开；无会员积分现金兑换承诺。中文英文界面准确显示已确认价格、含额、周期及实际可用状态，未知条件不虚构。
- REQ-B02 / AC-B02：服务端可可信判断套餐售卖就绪；用户身份/卡密/权益/批次/用途不能由客户端授予。原五档充值及历史余额保持。售卖不具备全部门禁时不能生成购买入口或发放正式会员，说明具体缺口。
- REQ-B03 / AC-B03：实施V1目录与会员生命周期的必要后端；若能完成批次/用途/到期/退款及权益全部实现则开放对应商品，否则准确记录未完成并保持关闭。禁止在生产造会员、余额、订单或试用卡密。历史积分市场需审查会员赠额套利。
- REQ-B04 / AC-B04：界面沿用ANS设计、清楚对比免费/Plan/Pro；不把目标权益冒充已可用。不加新支付渠道，不自动续费，已有成果导出保留。390与1280宽无横溢出，键盘周期切换、状态及现有充值入口真实核验。
- REQ-B05 / AC-B05：盘点当前所有开放PR（初次#47/#30/#29）与main尚未部署变更，逐一核对实际diff、旧基线冲突及生产兼容；审计后合并有效改动，不用旧文件整体覆盖新实现。记录重复/过期/阻断及处理，不把旧CI通过当当前审计。
- REQ-B06 / AC-B06：整合当前生产credits experience r2及前端新交付，与main冻结源合并。Linux构建、fresh一致备份恢复、隔离门禁、精确镜像及正式HTTPS验收通过后部署；保留3D恐龙及44封面、私有环境、73既有迁移与已上线功能。父容器/镜像变化必须刷新核对，不能强推或跳门禁。
- REQ-B07 / AC-B07：独立审查与问题闭环，精确区分代码合并、正式部署、真实会员售卖/支付/退款及未验证；本次发布不是长期全目标完成。

RULE-BIZ-B01：价格19/49/129与49/129/329；积分100/300/900与300/800/2400。充值倍率不可活动变更。季度三批0/30/60天；周赠额14天，月/季每批60天。单会员体系，工具权益与算力分开。成本需真实采购账单，不当上游额度为人民币成本。
RULE-AUTH-B01：源于session的身份及后台权限；旧账号请求/迟到回执不能污染新账号。不打印或存Git密钥/卡密；无新的生产试验数据。
RULE-DATA-B01：已有历史卡密/余额/订单不重算；新增迁移需fresh恢复演练。数据库Schema增量已在用户本次完整实施授权内，不能reset/db push生产。
NON-B01：不替代外部未确认成本或提供商分账能力，不接微信/支付宝，不通过写假数据证明收费。

分工：根主控负责集成、真实生产补丁及发布；实施角色负责套餐UI/后端；PR审查角色只审计原PR；最终独立复验由审查角色执行。先完成可审查结果再请求确有需要的外部操作。
## 2026-10-11 整合审计补充（当前执行，优先于历史范围）

任务等级 XL；用户要求全部计划落地、合并 main、精确源码正式部署并完成五轮真实审计；已授权本轮协作、提交、合并、上线。微信与支付宝商户后台均存在，但配置、产品权限和真实收退款未验证。保留 GitGlow 44 封面、个人成长、卡密、VibeHub及 Hypit 增量。

- REQ-I01 / AC-I01：市场私有页面与操作绑定渲染账号；会话换号即卸载旧内容及草稿；服务器在业务写入前拒绝旧账号头。迟到响应不得导航或恢复付款二维码；覆盖旧买家切到同单卖家、未登录及加载状态。
- REQ-I02 / AC-I02：现金请求丢失后通过供应商可信状态恢复原号，并发只发起一次；区分未支付、不存在、已付款及关闭；超期关闭后明确结束旧单，禁止盲目造新支付号或冒充退款到账。
- REQ-I03 / AC-I03：供应商明确未执行并已释放预占的模型节点可同输入安全重试；RUNNING/UNCERTAIN/SETTLED不可重复执行；不同输入同key拒绝，费用与attempt历史保留。
- REQ-I04 / AC-I04：公开赛道遵循 People/Discovery/Action 全领域定位，初赛五维30/25/20/15/10完整显示，Demo文案与视频/混合模式一致；未知日期不推断为正式窗口。
- REQ-I05 / AC-I05：timetable显示真实负责人、支持精确Demo检查引用；固定技术档案保留检查人、负责人、处理人、事件操作人和现场处理记录，兼容原固定档案，不能静默降低权限。
- REQ-I06 / AC-I06：冻结最终提交与完整清单；核验真实父镜像、fresh备份恢复、迁移、串行Linux构建，运行镜像与main一致，health/核心页面/封面/Hypit证据真实；本地提交不算上线。
- REQ-I07 / AC-I07：五轮审计记录发现、修复、独立复验及剩余缺口；未验证收款、退款、分账、真实赛事身份与日期保持未完成，不以关闭开关算完整交付。

RULE-AUTH-I01：服务端从session取真实身份，再与期望actor比对；请求头不授予权限。RULE-DATA-I01：不造生产账户、项目、订单、XP；隔离库不能记作生产验收。RULE-PAY-I01：密钥仅在内存和生产受限配置，不进聊天、日志、参数、Git；用户登录时逐步引导。


## 2026-10-05 学习版发布补充（当前执行范围）

本节覆盖下文历史任务中不再适用的定位、部署目录和共库假设。任务等级 L；产品范围以 `docs/ANS平台方向与落地路线图.md` 为准。用户本轮已明确授权上线，并要求保留其他线程的改动、确认 McGrox 也是文本渠道。

- REQ-L01 / AC-L01：部署已确认的学习路径、私密项目、草稿生成、人工追加版本与下载；首页三项主入口正确，已合入主干的比赛总入口保留在更多菜单。远端已提交改动不得丢弃，旧工作树未提交改动不强行打包。
- REQ-L02 / AC-L02：文本运行使用 McGrox 和三个已经真实测试的模型 ID；密钥仅由服务器配置读取，不打印、不进仓库。价格尚未知须明确记录，既有用户凭证的加密材料不得在本次发布中无迁移轮换。
- REQ-L03 / AC-L03：合并后版本通过完整 11 步 verify；独立检查合并冲突解决和新增入口，缺少证据不算通过。
- REQ-L04 / AC-L04：真实部署目录为 `/srv/ans-platform-authoritative-main`，生产库为托管 PostgreSQL。备份须权限受限、保存校验和，并在无宿主端口的独立临时数据库完成应用表恢复验证；目录列表可读不等于恢复成功。核对迁移名和校验和，不运行重置或生产回填。
- REQ-L05 / AC-L05：发布锁定确切提交，记录旧镜像、提交、运行配置和回滚方法；构建仍用 `compose.yml`，运行用 `docker-compose.yml`。运行镜像须与通过检查的目标对齐，健康检查及域名页面须实际核验。
- REQ-L06 / AC-L06：真实生成、人工保存新版本、下载仅使用明确标记的发布测试项目，不动用户内容、不自动公开。邮箱注册及人机验证只有真实完成才记为通过；未验证部分如实交接。
- NON-L01：不新建产品模块、不改支付或认证规则、不新加迁移；不改其他线程工作树、不强推、不绕过登录或 CAPTCHA。
- RULE-L01：部署入口自动执行 `prisma migrate deploy`。备份/迁移预检未通过不得重建线上容器；仅构建镜像不表示已经上线。

分工：根代理负责发布和事实记录；验证代理只运行检查；独立审查代理只核验改动与证据，不改实现。沿用已有 worker-report、review-report、acceptance 记录，不另建一套产品权威文件。

## 目标与约束

- REQ-001：按 P0 → P1 → P2 → P3 → P4 门禁推进；代码、测试、生产证据分别记录，不能凭旧文档勾选推断生产状态。
- REQ-002：P0 登录、注册密码、确认密码使用常显可访问控件；显示/隐藏和失焦不丢按钮；密码管理与密码校验不变。
- REQ-003：验证注册、密码重置、匿名身份、签到、邀请码与权限；修复重置无限尝试与非原子消费问题。
- REQ-004：生产发布前核验 SSH 身份、HEAD、容器、变量 configured/missing、迁移；先 pg_dump 并在隔离库验证恢复再运行迁移。
- REQ-005：通过本地与生产门禁后推进下一阶段；P4 候选能力以真实 P2/P3 数据决定，不预先实现收费。
- RULE-DATA-001：ANS 与旧站共库；不删除生产数据，不重置，不打印或修改凭据；保留备份和未跟踪文件。补丁必须先保存再处理服务器改动。
- RULE-DEPLOY-001：构建 `docker compose -f compose.yml build app`；运行 `docker compose -f docker-compose.yml up -d app`；镜像仅 `ans-platform:latest`。入口会执行迁移，重建容器也必须在数据库备份门禁之后。
- NON-001：不覆盖 AGENTS.md、用户改动或配置；不强推历史。缺访问凭据不绕过认证。

## 分工

- 根线程：交接资料、生产访问、发布流程、完整 diff、最终验证和验收。
- p0_worker（Luna）：密码控件及组件测试。
- reset_worker（Luna）：密码重置两个 API、独立服务及测试。
- p1_explorer（Luna，只读）：P1 与后续阶段真实差距。
- 新上下文 reviewer（只读）：最终结论 ship / fix-first / rethink；有问题修复后重新审查。

## 验收

- AC-001 / REQ-002：三个输入框有正确 label 关联，点击两次恢复 password，失焦仍有按钮，刷新默认隐藏，autocomplete 保留；组件测试和真实浏览器验证。
- AC-002 / REQ-003：重置冷却、尝试限制、过期/重复消费、配送失败清理、事务失败不消耗验证码有测试；注册/社区/身份/P1 定向测试通过。
- AC-003 / REQ-001：执行 `npm run lint`、全量 Vitest、隔离 DB 集成与带测试 DATABASE_URL/DIRECT_URL 的 `npm run build`，记录准确数量和历史失败，不降低门禁。
- AC-004 / REQ-004：SSH 读到真实版本/状态，备份可恢复，迁移状态核验，生产目标 commit 对齐；/api/health 与浏览器核心路径均通过。
- AC-005 / REQ-005：P0/P1 未验收时不将 P2–P4 标为交付；外部条件阻塞写明证据与恢复步骤。

## 原始资料

已读取仓库 AGENTS.md、P0/P1 规范及 `E:/WORKBUDDY/2026-08-27-06-01-25/ANS-handoff-20260907.zip` 内 00/01/02/03/05/06 文档。旧交接资料只作历史证据，当前状态以重跑结果为准。


## Authorized UI handoff integration, 2026-10-11

REQ-UI01 / AC-UI01: integrate only the authorized 16-file `ui-only.patch` handoff into current 5bf0d371 application code, keeping current Hypit card, market/account/permission fixes, current event provenance and actual 44 GitGlow assets. No package, authentication, pricing, schema, role or business payload change. Conflict in OfficialWorkflows must retain Hypit with compact semantics. Read-only source audit compares business sections to pre-merge source; exact compiled candidate must contain both workflow links.
REQ-UI02 / AC-UI02: shared heading hierarchy, desktop title/actions alignment, featured AIGC workflow row, workspace tools, mobile horizontal project-category scrolling, spacing and lightweight interactions. Core desktop/mobile pages must render real source/content, remain within actual viewport, expose form labels and correct links. Authenticated workspace/community/project/team pages need checks after merger; old candidate screenshots do not prove current release. Reduced-motion and keyboard focus remain usable.
REQ-UI03 / AC-UI03: repair obsolete market integration verifier in the real source; keep loopback verify-database guard before imports, explicit disabled-WeChat request fields, immutable isolated historical CASH fixtures, signed simulated provider with zero real funds. Candidate DB run must directly use committed script, without prior verifier overlay.
REQ-UI04 / AC-UI04: exact-source Linux type/lint/boundary/related tests/build, unique image/source binding, preserved rollback and restored production snapshot before switching. No schema changes and no new migrations expected. Current main application parent is integrated-b9ab5ffe/image617f660a; do not deploy the older UI candidate image. Preserve original 3D mascot bind mount.
REQ-UI05 / AC-UI05: independent review before publishing, source verification and actual main merge, then actual container/health/HTTPS desktop-mobile verification; retain failed attempts and state unfinished real merchant payment, model billing and formal event configuration separately.

Root integrates UI and releases; market_verifier_repair owns only verifier; market_completion_audit independently reviews integrated code; agri_completion_audit separately maps complete event requirements to current evidence. Existing task/worker/review/release files are retained as history.

## 链动小铺充值与 VibePlan 方向更新，2026-10-11

本节按用户最新决定覆盖直接微信/支付宝商户接入要求。REQ-P01 / AC-P01：顾客充值只沿用链动小铺购买 ANS 卡密 → ANS 手动兑换的已上线链路，绝不启用供应商商户钱包充值；停止直接微信/支付宝商户登录及配置要求。已公开现售10积分/¥1商品为 https://wzyp.cn/item/zkm211 ，单次兑换、账户换号边界不变。
REQ-P02 / AC-P02：积分中心新增100/500/1000/2000/5000积分五档；按已确认¥1=10积分显示面值¥10/50/100/200/500，并明示渠道手续费以收银台为准。只有核对过实际商品的确切URL才能出现购买入口；未上架的档位明确待上架，不能将10积分商品冒充高档位。保留10积分商品作为现售入口。
REQ-P03 / AC-P03：运营卡密生成界面支持五档快捷选择，生成仍需要真实管理员权限，明文保存/导出提醒和跨账号保护保留，不擅自造生产兑换卡。真实商户上架须登录后按准确商品及授权流程操作并读回规格/库存，不把本地档位代码称为已上架。
REQ-P04 / AC-P04：VibePlan作为独立套餐界面及后续重中之重，周卡/月卡/季卡的方向已确认；价格、每期额度、结转、权益、续费方式未知，不凭空设置收费和订阅。当前提供清晰的独立页面入口及准备中状态，与一次性积分卡区分；继续下一阶段设计与真实权益闭环，不声称订阅已上线可购。
REQ-P05 / AC-P05：保持当前真实业务/44封面/小恐龙/Hypit/UI整合；新增界面可访问、响应式、中英文同键，定向代码验证和实际正式页面验收，最终main与运行镜像精确绑定。

## REQ-B08 / AC-B08: Companion and admin UI final integration

Include the separately authorized companion/settings handoff in this unified release: default voice off, no fake LLM or autonomous execution, same-origin/current-frame messages, account-session separation, stored presentation preferences and reduced-motion static fallback. Preserve the deployed GLB/rig assets while updating only the four reviewed renderer text files. AC-B08: strict existing task/logout/frame lifecycle checks pass; default silence and opt-in behavior pass; immutable asset mount preserves unrelated files; actual mobile/desktop production pages show a single companion and no horizontal overflow.

Include the reviewed admin credit clarity increment: no default account selection, visible restricted-account state, explicit TOP_UP evidence/confirmation, accurate voucher classification. No new accounting writes or schema. Require exact source build, fresh consistent backup/restore, isolated service regressions and real production health/read-only page checks before final acceptance.


## 2026-10-12 知识区后续增量正式审计（L）

用户“继续”授权承接此前未上线批次。只读发现并行发布已将f4172f18864f5fe9403736f87c9b612ec4e682c9切到正式站，故本轮审计实际发布与线上交互，不重复切换。

REQ-V01 / AC-V01：独立检查29dec185..f4172f18的25个文件；链接、双语、来源、学习路径、历史内容与返回导航不能虚构或破坏既有内容；源审计给具体证据。
REQ-V02 / AC-V02：正式容器revision/source/image与部署记录一致；原环境和mascot挂载保留，固定10倍充值及会员禁售不变；核对backup恢复、73迁移零新增及代码检查真实退出。
REQ-V03 / AC-V03：真实HTTPS1280/390、中英、至少首页/课程/学习路径/改进记录/实践/Skill，验证新封面、导航/返回、页面无横向溢出；保留截图与实际读出结果。
REQ-V04 / AC-V04：已有登录收藏只读验收持久化，继续核对套餐和积分页真实入口；不创建假业务、不购买、兑换、生成或真实TTS、不覆盖并行发布。
NON-V01：不以本轮静态与浏览器审计冒充会员权益、交易收费、全部农客松或跨设备功能验收。
独立审查只写本轮evidence目录中的review.md/json，不改代码；主控汇总现有review-report并发布文档。当前生产已有backup/deploy gate0，失败构建记录保留并区分修复后成功。

## 2026-10-12: ANS Hub navigation and runnable workflow marketplace (XL)

User authority: six primary destinations only: project square (/explore), Hub and workflows (/hubs), community growth (/community), event activities (/competitions), market (/market), workspace (/workspace). Account menu retains profile/settings/admin/language, followed by My favorites (/collection) and Compute center (/workspace/credits). Remove public legacy prompt-product UI, not private data or shared authentication/accounting code. Preserve prior published covers, mascot, credentials, member sales gates and all genuine business history.

REQ-H01 / AC-H01: desktop and mobile use the same six-entry navigation; no More/legacy links or developer shortcut. Hub active state includes /hubs, /workflows and /vibe-hub. Account menu favorites and compute links use guarded workspace navigation and correct session. Logout protections/reduced motion remain.
REQ-H02 / AC-H02: /hubs is the first destination of Hub navigation, a useful browsable/searchable directory; /hubs/[slug] groups actual workflows, projects and knowledge. Initial real platform categories: CAUHub (ANS x China Agricultural University, only actually university-specific contents), ANS VibeHub (existing knowledge), AIGC Hub, Full-stack Development Hub. Do not invent other universities, users, memberships, counts, certificates or workflows. University organizations must support future expansion in domain structure, with no false claim that universities already joined. Empty category content is honest.
REQ-H03 / AC-H03: workflows remain independent reusable, versioned executable recipes with fixed code, personal input, explicit run confirmation, real output and existing cost/refund/recovery. Hub membership is explicit, not keyword guessing. Existing personal resume/portfolio renderer is a real first recipe; do not rewrite website code using each LLM call.
REQ-H04 / AC-H04: an owner can upload a reviewed published executable workflow to market in one action; create a version-bound listing through existing moderation rules. Market runnable entries expose input, output and real compute cost; run uses existing quota/run/worker/recovery/ownership authorization. Never allow another owner's draft/private workflow, client-supplied price or unapproved version, arbitrary code execution, automatic debit from navigation, double charges, or bypass membership purpose gates. Do not confuse cash purchase with run compute. Preserve existing service/resource listings/orders/cash/points paths. No new provider or real test payments.
REQ-H05 / AC-H05: public prompt/templates/developer/skills/taste/categories/tags/book/feed/discover/old about/docs/promptmasters/kids/builder/presentation landing UIs retire, with clear same-origin destinations (project square or relevant hub) for old deep links. Keep auth/reset/profile/settings/admin/terms/privacy/support and genuine workflow/project/team/competition/order detail/runtime/API infrastructure. Remove legacy primary/profile/favorites/sitemap/landing links. Favorites must support actual project/workflow/knowledge favorites, retain old records without deleting them, avoid presenting retired prompt targets as active.
REQ-H06 / AC-H06: save this newly confirmed product architecture in the existing authority document, keep upstream source LICENSE-MIT/CC0 provenance accurately separate from ANS product identity; rewrite obsolete README/AGENTS overview to current product without claiming legal independence from copied code. Actual retained code remains subject to applicable notices.
RULE-H01: CNY1=10compute points, existing LDXP5 real products and VibePlan disabled sales remain. No production fake data, real purchase/redemption/model/TTS during verification. No deletion of private/user data, no destructive schema cleanup. Prefer additive metadata compatible with existing DB schema.
RULE-H02: work in C:/Users/lsb/.workbuddy/apps/worktrees/ans-production-main-sync; initially origin/main1eecd9de. No agent commits/push/deployment unless root specifically instructs. Root integrates and releases. Preserve concurrent work, no force push. Production publication follows prior explicit authorization, exact frozen source/image and live parent gate, consistent backup restore, original env/mounts and rollback.
RULE-H03: scope partitions: navigation/hub UI worker owns header/mobile navigation, hub directory/detail components and domain hub registry (coordinate registry fields with workflow worker), product navigation module. Workflow marketplace worker owns executable binding/contracts/backend/creator+market workflow UI and relevant targeted regressions. Root owns old route retirement/favorites/architecture/translations integration/deployment. Reviewer is independent, does not edit application code; issue-based rework.
NON-H01: no claims of full university onboarding, full membership sale, creator cash settlement, autonomous Agent or all ANS commerce completion.
Validation: exact types/boundaries/lint/build, necessary authorization/billing binding regressions, real desktop/mobile navigation and existing authenticated menu if available, legacy URLs, hub counts/empty states, frozen source/image/database health after deployment. Billing and runtime execution must use isolated providers/database, never manufacture production tasks or outcomes.


## 2026-10-12 follow-up: a real platform recipe in Hub and market (XL)

User explicitly reauthorizes implementation, main merge and production deployment for the whole six-navigation/Hub/fixed-code-market loop. REQ-R01: retain the already-live finite navigation and account menu, preserve source licenses and original business data. REQ-R02: publish the genuine existing resume renderer as a platform-managed immutable executable recipe, not a synthetic user project/demo. REQ-R03: full-stack Hub links to that current real workflow; the public workflow offers an owner-only one-click market submission, and the platform's real listing exposes personal-input confirmation, billing, output history and HTML preview/download. REQ-R04: platform-owned code recipes have an explicit registry and source/version/hash attestation; ordinary author manual/AI review rules remain unchanged, no invented AI PASS or alternate reviewer account. Retired/private/unreviewed/version-changed sources must fail closed before fee/run. REQ-R05: this release registers only the actual source-reviewed recipe under the real existing owner account; no new users, dummy personal input, XP fixture, order or test generation/payment. No automatic model execution on navigation/provisioning. REQ-R06: fixed ¥1=10 and existing Liandong only; membership sale stays closed.

AC-R01: real desktop/mobile six targets and correct account menu persist. AC-R02: exact registry officialId/slug/owner-admin/v1/source hash/audit/graph are enforced; arbitrary old official workflow cannot run without a project or enter market. AC-R03: record registration + real market create/submission/official review are idempotent and auditable; source unknown/change rejects, no ordinary review bypass or fabricated reviewer. AC-R04: deployed Hub/workflow/market show actual current source and own-input form, no GET-triggered queue; no production fake content used for acceptance. AC-R05: offline meaningful permission/version/retry/billing guards and Linux build checks, consistent backup and precise-image browser evidence; actual paid generation remains unclaimed unless legitimately executed for a real deliverable.

## 2026-10-12 当前农客松安全审计修复（XL）

长期目标保持全部ANS商业、AIGC与农客松范围；本切片优先解决两条已复现的权限/阶段旁路，不把修复等同全目标或五轮完整审计通过。本次用户持续授权协作、实现、审计、main与上线；未知赛事日期、实名角色与规则不伪造。

REQ-AU01 / AC-AU01：任务列表仅返回最终服务器时间仍具权限的任务。查询途中到期或被撤销的分享不返回标题、依赖、协作说明或ID；本人任务保留。采用批量重验，分页游标按原扫描边界推进，不逐500条发请求。serverNow/截止状态使用最终时间；保留edition/account/workspace锁与权限。模拟服务覆盖到期瞬间、撤销、有效分享、自己任务、最后页及续页、新分享不额外加入；独立复验实际当前源。

REQ-AU02 / AC-AU02：显式配置的农客松edition（即使尚无workspace）、任何已有农客松workspace（即使disabled）、已有stage历史的entry，全部拒绝普通赛事legacy提交/复核。禁止旧接口绕开已发布独立窗口、阶段不可变版本、技术权限或直接发布/奖励。其他普通赛事保持原功能；正式REGISTERED报名经现有独立窗口权限，不把报名与submission混同。

RULE-AU01：服务端ensureLegacyEntryAllowed在任何业务写/XP/公开之前拒绝，并维持workspace-first锁。数据库agri_legacy_entry_guard通过独立兼容migration更新，任何workspace存在即保护，不以enabled开关解禁；历史protected列、stage-history、old/new edition、NOWAIT防死锁、无保护普通赛事和纯REGISTERED insert行为保留。不重写旧migration或schema/数据，不自动迁移production。

AC-AU03：实际隔离PostgreSQL（全新数据库）应用全部迁移，直接INSERT/UPDATE/DELETE在disabledworkspace、stage历史、跨edition、旧XP/public字段写入均拒绝；普通competition合法旧操作和REGISTERED报名保持。迁移前后既有字段/行/触发器无丢失，新函数只收紧准入。角色权限、publication和XP无新增副作用。测试fixture仅隔离库，不生产造账号/赛事。

AC-AU04：精准应用+测试类型、相关tests/lint/边界、postcoding独立审查完成后PR/main统一集成；发布仍要求当前parent、fresh备份隔离恢复、精确Linuxsource/image、迁移preflight和生产只读验收。并行市场发布不得覆盖新导航/R9/配方，本切片也不覆盖其已发布增量。无付费调用或真实业务样例。

分工：root实现legacy service/DB migration与相关验证；platform_recipe_registration实施任务list+targeted tests；agri_current_completion_audit只读六交付/legacy旁路审查；vibehub_followup_review独立源/任务权限及问题复验。仅独立reviewer能CLOSED。原已完成R3记录保留，当前发现不会逆改历史PASS范围。
## 2026-10-13: Public companion context and personal ledger scope (XL)

REQ-C01 / AC-C01: R11 reads only currently published public detail summaries; private routes, entered facts, files and workflow definitions never enter tool output. Page hints confer no authority. Withdrawn/read-failed entries do not resurrect.
REQ-C02 / AC-C02: Keyword matches disclose partial results; final recommendation buttons come only from the most recent verified lookup, including clearing after empty/failed reads. Preserve confirmation tickets, actual metering, cancellation and recovery.
REQ-L01 / AC-L01: Personal credits statements and reconciliation include only entries which affect users.quotaPoints. Team allocations use team allowances, not personal money; TEAM_GRANT and team/team_member references are excluded before pagination, cursor lookup and balance summation. Historical null refType remains included.
REQ-L02 / AC-L02: One typed filter and one shared SQL reconciliation define this scope. Never fix a displayed mismatch by modifying balances, deleting history or adding compensation. Existing team statements remain intact; real personal mismatches are still detected.
AC-L03: Isolated localhost PostgreSQL proves mixed personal/team history, null refType, positive/negative team allocation, team-only balance, and a real personal mismatch. Fixtures are rolled back; no production identities, orders, payments or model calls.
AC-L04: Integrated companion and quota regressions, all-source lint, application/test types and boundary checks pass. Independent reviewer inspects exact final code. Runtime deployment requires current parent, source/image identity, backup and read-only acceptance; a local PASS is not a deployed claim.
NON-C01: This increment does not open VibePlan sales or claim fully implemented batches/expiry/membership. Follow-up wallet lifecycle remains in the complete objective. The genuine event has no confirmed production record/window/role mapping; do not manufacture dates or staff grants.
