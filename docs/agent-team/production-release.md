# ANS 生产发布与恢复门禁

实际运行目录为 `/srv/ans-platform-authoritative-main`，应用容器为 `ans-platform-app`，Compose 项目名为 `ans-platform-authoritative`。ANS 使用 Supabase Session pooler 与 PostgreSQL 17；共享服务器上的 `prompts-chat-db` 是另一业务，不能作为 ANS 的备份目标。

## 2026-10-11 当前正式站与待发布合并

2026-10-11T12:24Z 最近只读核对：正式容器 `ans-platform-app`、Compose `ans-platform-header` healthy；运行镜像 `sha256:e4417d5c35dc77478ba9336a7726c725378af5fa6f6753a4b48e451a3ce2c3db`，release `ans-vouchers-v2-20261011`，source SHA-256 `13945d63dfc0e021fb3b77fcfca9ea745e2e50cc5fde31397f5df9380b913a69`。此镜像标记基线 Git revision 491f1544 且 `localModifications=true`，不能称为 main 最新26398。充值员工已部署卡密及 `20261011160000_credit_vouchers` 增量迁移；其运行证据 `/srv/ans-releases/ans-vouchers-v2-20261011/deployment.json`。当前人民币市场收款尚未启用。

44 张 GitGlow 封面与个人主页/签到/XP/等级/装饰已在线。Main 26398 的收藏验证、等级文字对比度和详情页语义修复已推送，CI 38135852686 和 Docker publish 38135852757 均 success。`ans-audit-final-v2-20261011` 冻结源码3e262e9e与精确构建通过；对应bd7父版117表/71迁移的一致备份与独立恢复通过。正式切换前发生新的卡密上线，parent检查拒绝部署（退出1），没有覆盖新功能；该旧备份不是当前卡密数据库恢复证明，必须取fresh快照再验证。

主控已逐hash核对并读取卡密16文件源码增量，在权威工作树保留农客松阶段UI和AIGC账单导航后进行语义合并，源压缩包SHA-256 `54e1a3c582e75dfde4fa030b648b4ca879a2a00b8a690433a5c4cbeb3d8c3b2a`，不包含私有业务数据或凭据。此合并、Hypit原生页面、双渠道现金收付款、账号换号保护和农客松历史纯读取均仍为本地工作，是否上线以新冻结release的deployment.json和实际运行容器为准。

独立审查发现：历史GET曾触发冻结数据库写入、券码及私有参赛页换号保护不足。已补纯冻结投影、服务器actor核对、敏感组件卸载及迟到响应保护。当前77项相关回归、生产与测试两套完整TypeScript类型检查、完整ESLint（0错误、384既有/无阻断警告）及六类分层边界检查均通过；尚需真实隔离PostgreSQL证明GET不写库及精确生产发布证据。本地券码/阶段/AIGC范围97项通过、10项既有跳过；换号/迟到请求补验17项通过。首个全量lint发现现金员工新增路由越界，已修复待整合复验；首次完整typecheck因2GB堆限制退出134，后以6GB堆完成两套检查并退出0。全量测试首次2511通过/2失败/10既有跳过，失败为英文账号提示缺失，已补齐并复验11项；最终全量复验以新退出码为准。

仍未完成：当前版本五轮完整生产审计、农客松真实赛事绑定与独立窗口/规则发布、身份与最终队员硬校验、评分投票、阶段档案公开授权；AIGC新双端部署及原作品正式归属迁移、媒体统一计量收费；实际商户配置、真钱退款和创作者分账。用户已确认微信支付和支付宝商户均有，密钥仅通过安全配置注入，不发聊天。无真实绑定不开报，日期保持待确认；不使用生产虚构账户、项目、经验或付费调用验收。

## 发布前

1. 使用已核验的 SSH known_hosts 与指定密钥，保持 `StrictHostKeyChecking=yes`。当前 SSH 可用；不得关闭主机校验或把凭证写入日志。
2. 核对 HEAD、tracked 改动、容器镜像及 health。当前已读基线为 `002d9947405f91feea16a001e15a425daef6c377`；tracked 文件干净。保留 `.env.backup-*` 及其他未跟踪文件。
3. 只输出集成配置的 configured/missing，不输出完整 Env、连接串或 Compose config。数据库地址和密钥只在进程内存读取。
4. 发布本地未提交成果时，在 `/srv/ans-releases/<release-id>/source` 使用独立源码快照。保存逐文件 SHA-256 清单、内容总哈希、基线 HEAD、归档哈希和测试证据。禁止直接覆盖旧 checkout、生产 `.env` 或用 `git clean`。
5. 新版本正式替换前，给运行镜像追加本次唯一 rollback 标签；保留原运行 Compose 文件与环境配置，便于恢复。

## Supabase 数据库门禁

`docker/entrypoint.sh` 启动会自动 `prisma migrate deploy`，所以重建应用前必须通过数据库门禁。

1. 执行源码中的 `scripts/production-backup-verify.py`。脚本从运行容器内存读取连接配置，仅允许已核实的 Supabase Session pooler/5432；凭证不进入命令参数或报告。
2. 开启只读 Repeatable Read 事务，导出 snapshot，并在同一快照计算 public 所有表的行数和内容摘要、约束、索引及迁移记录。PostgreSQL 17 `pg_dump` 使用该 snapshot 导出 public schema 自定义归档。
3. 备份目录权限 0700、文件 0600。记录字节数和 SHA-256；`pg_restore --list` 只作初步检查。
4. 在无宿主端口、无外部网络的独立 PostgreSQL 17 容器真实恢复，逐项比较所有 public 表的行数/内容摘要、约束、索引和迁移记录。脚本只删除自己创建的隔离验证容器，不覆盖生产。
5. 生产所有既有 migration 名称与 SHA-256 必须与快照源码一致且 finished、未 rolled back。待迁移 SQL 逐项审阅；新增 market、workflow inputs 和 catalog 均为增量结构，不能 `db push`、reset 或删表。
6. 备份覆盖 ANS public 的用户、verification_tokens 和业务表；不覆盖 Supabase 平台 schema、供应商系统及外部文件存储，不能称为整个平台灾备。
7. 恢复失败或 migration checksum 不一致时停止发布，保留受限备份和脱敏诊断。迁移失败默认向前修复，禁止自动回灌覆盖生产。

## 构建与上线

1. 目标源码类型、lint、相关测试、隔离集成、build 与浏览器检查必须有真实退出码。全量门禁运行后若继续改动，应明确旧结果范围并补验证。
2. 在独立 release source 目录构建，显式使用权威 checkout 的 `.env`：`docker compose --env-file /srv/ans-platform-authoritative-main/.env -f compose.yml build app`。构建日志与退出码文件保存在 release 目录，不输出凭证。
3. 必须检查构建退出码 0 和新镜像 ID。备份恢复通过后，再用同一 Compose 项目名及运行文件替换：`docker compose -p ans-platform-authoritative --env-file /srv/ans-platform-authoritative-main/.env -f docker-compose.yml up -d app`。
4. 记录运行镜像 ID、源码 manifest 哈希、BUILD_ID、迁移状态及 healthy。源码快照没有 Git commit，不能把旧 HEAD 当成这次发布版本。
5. 验收真实域名首页、发现、详情、工作流、市场、登录、社区、比赛和手机布局；health 必须 database connected。公开与私密权限、草稿/发布/撤回和任务执行另按真实身份验收。
6. CAPTCHA、真实邮箱、真实模型质量/成本和实际支付仅在实际完成后登记。模拟支付不是资金到账；支付未配置时继续禁用付款。

## 回滚与观察

- 应用失败且迁移向后兼容时，以留存旧镜像 ID 恢复 `ans-platform:latest`，使用权威 checkout 的原 Compose 与 `.env` 启动，复验 health。
- 备份恢复验证不等于生产回滚已演练；恢复生产需单独设计停写和新增数据处理，不自动执行。
- 保存发布、备份恢复、数据库与浏览器证据。未实际观察的持续稳定性和未完成的五轮审计保持未验收。

## 当前发布：c89 P2（2026-10-08 UTC）

本轮授权发布已于 `2026-10-08T16:56:29Z` 完成，release `ans-product-c89b31a564b6e794`，source SHA-256 `c89b31a564b6e794a87390cf980308cbdd413b9391d1cc82587ce89a88daf059`，运行镜像 `sha256:da232be1a4f67a7369b64c0ad9c78c94f0dbaa0a74b914164d317ded76a90cd8`，Linux BUILD_ID `3tZ7X3frwZH-5RqhCRqpI`。使用 release source 的 docker-compose.yml 和固定 image override；旧权威 checkout 与环境未覆盖。应用 healthy、health200、database connected，60 项迁移 finished、unfinished0，完整 checksum 核对通过。

发布顺序为一致备份与实际隔离恢复 → 精确镜像57→60演练 → HTTPS候选16屏浏览器 → review预检 → 即时生产基线/保护配置预检 → 保留旧健康应用执行增量迁移 → 固定镜像替换 → 生产健康/迁移核对。备份 SHA-256 `f465787b947d57e4a90d3f6d91b3bcb699f03ba04712c9b66b17d076536de430`；97 张旧业务表旧列内容在演练保持、9 张新增表为空、6 个 deferred guard 与3函数定义核验通过。本轮唯一回滚标签 `ans-platform:rollback-ans-product-c89b31a564b6e794` 已保留，未执行生产回滚或数据库回灌。

生产复验16次桌面/手机页面HTTP200、当前BUILD_ID、无横向溢出、axe自动违规0；14个匿名私密接口均401。保留自动检查 incomplete 和首次工具视口/预期不匹配失败，不称全部可访问性问题清零。Demo、现场卡和固定技术档案已部署；赛事ID仍空，正式提交关闭；`ANS_TOONFLOW_EMBED_ENABLED=0`。Toonflow 新双端仅合成HTTPS预览完成真实恢复/保存/换号验收，未替换Toonflow生产或启用正式内嵌。浏览器档案文件落盘、真实生成/视频计量、支付和自主Agent仍未验收。

本地证据：`.workbuddy/evidence/releases/ans-product-c89b31a564b6e794/`；预览恢复：`agri-p2-ops-20261008/toonflow-preview/browser-recovery-c89-9c68.json`。此状态文档更新不修改冻结source或已部署镜像。以下均为历史记录，后续改动不得复用旧证据冒充已发布。

## 2026-10-07 后续本地增量（历史）

Toonflow 默认关闭的内嵌候选、运行时配置透传及农客松明确赛事绑定/历史提示已完成本地增量检查：6 文件 / 75 测试、改动范围 ESLint、测试范围类型、边界和文档通过。隔离配置下生产构建退出 0，BUILD_ID `D91KN6jiwe97LVcDzj1Wk`；未执行迁移。实际本地 Next 的农客松/Toonflow 默认关闭页共 4 次桌面/手机只读检查通过，axe 0；3 次既有 Sentry 遥测尝试均被浏览器拦截。首次缺少 DATABASE_URL 的 generate 及零外部尝试断言失败均保留，最终修正环境和核对遥测后通过；不描述为所有尝试首次成功。

证据在本机 `C:/Users/lsb/.workbuddy/evidence/agrihackathon20261007/`，内嵌协议 17 项 fixture 浏览器证据在 `C:/Users/lsb/.workbuddy/evidence/toonflowEmbed20261007/`。农客松数据库与权限 [ADR 0003](../adr/0003-agrihackathon-technical-workspace.md) 仍为提议，schema/迁移待确认；真实工作台、Toonflow/OIDC/视频计费未完成。本轮未部署、修改生产配置、开报、发布规则、授权真实账号或收费，以下生产快照保持不变。

## 历史发布证据：232f

最新发布 `ans-product-232f7846bb9aa756`，镜像 `sha256:23a2d2d89ef511864e7af22bb46c08429b453aa713aa484247398bae8117ebc7`、BUILD_ID `BKnbR1e-K5mg-3fTUQ9lU`。healthy / health 200 / database connected，50 项迁移完成、unfinished 0。线上 26 次公开读取、3 项交互通过；已登录工作台只读正常。74 张 public 表（含迁移表）一致备份与 PG17 恢复通过，SHA-256 `c4ae819ba6264dfa8b83206e854c56ec48cf3ca0d11b1a782fb0f09d8521d6c1`；精确镜像演练保持 73 张既有业务表全部原列数据不变，50→50 无新迁移。

五轮正式审计全部闭环。第四、第五轮最终完整 verify 退出 0：118 文件 / 1600 测试、smoke 26、axe 15、性能通过；8 项账号与状态浏览器验收通过。真实 PostgreSQL 与 Next，身份和上游为 fixture，零真实模型调用。生产复验为公开读取，不冒充生产故障注入或真实生成、交易验收。后续统一算力本地源码不包含在本发布门禁或运行快照。

Toonflow 站内多用户整合、统一算力、恐龙执行 Agent、真实模型质量与成本、真实支付和结算仍待交付或验收，goal 保持 active。Toonflow 线上已有 OIDC，但当前白名单阻断用户浏览器，计费关闭；候选本地独立账本不能作为 ANS 统一余额。以下为历史发布证据。

当前快照 `ans-product-068b7aa37cfba7aa` 已上线，运行镜像 `sha256:37913dd4ebe5520945ffb47b538bb4bafe78b4f4a926cb63a5b83c882f6e28b6`、BUILD_ID `u1o9gYmfPoqlGxtdgPa_h`。应用 healthy、health 200、数据库 connected；48 项迁移完成、unfinished 0。

最终完整本地 verify 退出 0，114 文件 / 1571 用例、类型、lint、边界、文档、build、smoke 26、axe 15、性能通过。部署后 26 次桌面/手机页面检查与 3 项交互全部通过，axe 零违规、无横向溢出、无运行及翻译错误。该公开验收不是生成、支付或五轮正式审计。

73 张 public 表一致备份与 PG17 隔离恢复通过；备份 SHA-256 `279ddacea4b58fbf3cc468f30b0b0f87be41cd27a9ad8b1ba9d0d9d7d1e4a425`。候选精确镜像演练确认 72 张既有业务表行数和摘要不变。

本次 rollback 标签 `ans-platform:rollback-ans-product-068b7aa37cfba7aa` 已恢复精确原镜像 index/runtime，blob、BUILD_ID 与 digest 核验通过。构建 attestation payload 未恢复，未执行生产回滚演练或数据库回灌。恢复证据在 `.workbuddy/evidence/releases/ans-product-068b7aa37cfba7aa/rollback-image-recovery.json`。

第一轮正式审计已闭环（品牌对比度及健康/媒体错误边界）；错误泄露验收是本地故障注入 + 部署源对应关系，不是生产故障注入。第二轮项目包错误泄露已本地复现和修复，尚未上线。真实模型质量、Toonflow 站内整合及资金结算仍待验收。

## 2026-10-07 独立增量候选434b收尾状态（未发布）

候选 `ans-product-434b598d20f1d804` 独立源构建（含TypeScript）退出0，BUILD_ID `yIqvGotd9xlmPRsAMjML8`；隔离PostgreSQL 52项迁移名称/checksum一致，源与归档SHA复核通过。匿名桌面/手机浏览器已检查首页、分类/子分类、简历详情、方法说明、登录回跳、工作流、默认关闭Toonflow、恐龙ESC/焦点、手机导航和农客松历史提示。所查页面无文档横向溢出，捕获warn/error为零。没有执行本轮登录生成、完整iframe、真实视频计费、配置赛事个人任务及standalone部署验收；两项待修正文案详见browser-verification.json，不称正式全量验收通过。

北京时间2026-10-07 18:19:34生产只读观察仍为232f版本，healthy/health200/database connected，完整50项migration checksum通过，混合换行原字节见证已保存。两项新增迁移 `20261007220000_unified_compute_reservations`、`20261007230000_agri_personal_timetable` 的精准schema批准仍缺失。15项离线fixture和六脚本语法通过只证明本地门禁；当前生产备份恢复、不可变候选镜像及50→52恢复演练未执行。整体部署授权沿用既有用户原始回合，只为两项schema批准另询问，没有替用户签署。

证据：`.workbuddy/evidence/releases/ans-product-434b598d20f1d804/local-build-verification.json`、同目录 `browser-verification.json`、`.workbuddy/evidence/releases/next-increment-ops/ops-verification.json`。本轮状态文档不修改冻结候选；后续源修改须新冻结并补验。本轮没有上传、部署、生产迁移、收费或模型调用，长期目标保持进行中。


### 2026-10-07 修正文案候选 0a26 与本次授权

- 新冻结候选 `ans-product-0a26c50237904678`，源码 SHA-256 `0a26c50237904678f4c5de6d7e0439ea70532f3df7f9d5939fa36dcf51618bea`，BUILD_ID `NBFlNS4RmZVmpmbnpT7xd`（以验证报告实值为准）。7449 个冻结文件逐项哈希、内容总哈希及归档 SHA 均一致；独立生产构建含 TypeScript 检查通过。隔离 PostgreSQL 52 项迁移名称/checksum一致，算力19项、个人任务15项集成与1项真正 fresh Node 持久读回通过。供应商与身份/用量为 fixture，零真实资金和模型调用。`local-product-runner` 不转发 `--persistence` 的原错误调用日志保留；真正持久化证据为 `agri-persistence-corrected.log`，不把重复集成当成新进程验收。
- 本候选修正简历网页预览说明，明确实际 HTML 交付模板和虚构示例；17 种主语言修正农客松历史规则、大众投票与本届待确认预算的边界。中英文桌面/手机6项匿名浏览器检查通过，所查页面无文档横向溢出、捕获 warn/error 为零。父端实际查看了桌面与手机简历截图。未登录生成、未配置本届任务UI、未验证真实 iframe/OIDC/原生后退/视频收费。
- 单独复制构建的 `server.js`、`public` 和 `.next/static` 到可撤销本地运行目录，健康检查数据库 connected、简历详情当前文案、全部27项页面引用静态资源、公开Logo和两个页面请求通过；由本次启动的3109进程已停止。初次标题断言把“把经历”误写成“把简历”，原失败证据保留，按真实标题校正后通过，无业务修改。此项复用现有依赖junction，只证明Windows本地standalone入口及资源可运行，不等于Linux部署镜像、Docker entrypoint或生产50→52验收。
- `next-increment-ops-0a26` 核对本候选相对434b共22文件、相对生产232f共89文件；52份SQL与434b原始字节一致。此前15项fixture与5脚本语法检查通过，缺schema授权的preflight退出2属于当时预期结果。该历史结果不作为新授权后的发布通过证据。
- 用户本次明确回复：**“确认 都允许跟授权 不需要问我的”**。此回复对应正在等待的本候选发布以及两项新增迁移 `20261007220000_unified_compute_reservations`（6225字节，SHA `20af237004f72be39035a57aa190c46dcb3329c11122457e2f9e81d57e4a8ef0`）与 `20261007230000_agri_personal_timetable`（12079字节，SHA `f329f3931be930bd2d51bad72b1ab9bfe17453eeea2a2be7cb7a00d9a504654a`）；精准schema与部署授权已取得。保存原文与实际回合来源，不伪造签名或用户授权时间。继续当前生产一致备份、隔离恢复、不可变镜像及50→52演练；结果仍以真实证据登记。批准不等于上述操作已完成。
- 本记录引用同候选 `local-build-verification.json`、`browser-verification.json`、`standalone-entry-verification.json`。生产最新已观察证据仍为2026-10-07北京时间18:19:34的232f版本，实时部署状态须再次读取。上述本地工作没有生产写入、收费或模型调用，冻结source未改；Toonflow取消后真实Agent插件仍运行的退出保护在单独候选补验，完整农客松P1/P2、六项职责与恐龙自主执行仍待交付，goal保持active。

## Current release: e37 (2026-10-08)

The current production release is `ans-product-e37c465603270fa1`, deployed at `2026-10-08T18:06:44.406420+00:00Z`, with Linux BUILD_ID `GgUFsIX68BdfT86LECCpj`. Production health passed: health returned 200 and the database connection was healthy; all 60 migrations finished.

Post-release evidence records a 60-to-60 no-op migration check, preservation checks for schema and existing data across 107 public tables, six deferred guards, three function definitions, and production page plus signed-in onsite targeted-message acceptance. The public-schema backup SHA-256 is `0df818a52807b29e297fe2030c69f3ad3482219618bedebce010e4c346fa5a47`.

The historical baseline `ans-product-c89b31a564b6e794` is retained. Toonflow production embed remains disabled and e37 parent transfer is incomplete; c89/9c68 recovery evidence cannot replace e37 preview acceptance.


### 2026-10-11：同步真实正式站源码到主分支

本次合并从已正式部署的 growth-unified-20261011-v3 冻结源同步应用代码、数据库迁移、GitGlow 封面及生成器来源、当前线上小恐龙挂载源码和公开个人页传输代理。44 张 GitGlow 封面已逐张核对：真实公开请求 HTTP200，图片 SHA-256 与冻结源和正式容器一致。真实账号签到记录为 5 XP、连续 1 天，签到、成长事件、XP 流水各一条。

采用三方合并保留 origin/main 的 VibeHub API、页面、数据、收藏枚举及入口；主页保持正式站项目发现布局，保留全局时区和移动导航。生产私有环境、数据库凭据、回滚私有配置均不进入 Git。第三方 Three.js 原始包与许可保留，ESLint 排除 vendor 目录。

此前正式镜像 sha256:993853abaf131dd7df9eee512d86850191f9c22b2f0934851e38a42c90feef9b，源 SHA-256 89a8da0129f7ba024470b11612da2244d04a555c260e0f0f3ef8484c9f682a69；仅调整 Supabase transaction pooler connection_limit 2→8，其他运行配置与全部 OIDC clients 保留。未来发布须保留这些真实线上功能，不能用旧源码覆盖。公开核对证据见 C:/Users/lsb/.workbuddy/evidence/ans-growth-20261011/gitglow-current-verification.json。高级成长奖励未用虚构经验触发验收。
