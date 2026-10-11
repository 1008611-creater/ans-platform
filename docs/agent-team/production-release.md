# ANS 生产发布与恢复门禁

## 2026-10-11：ANS VibeHub 品牌发布（北京时间 20:51）

正式站 VibeHub 页头、ANS 首页入口、页脚展示与 Agent manifest 使用 ANS VibeHub；复用 ANS 深浅色 SVG、favicon、Apple 图标和分享图，保留原站作者及内容来源。窄桌面导航在 1050px 以下收起，手机与桌面品牌完整显示。

当前发布源提交 `89a7753bde184771b70a4f0f4f5d7c5f42220472`，镜像 `sha256:e892b2c5532f3cb580e96018bf7307effd7b3b24cd6d6be5d8b79e5ed0463e64`，BUILD_ID `iY2X1ve1gDQxaG2RWpIyX`，冻结源 SHA-256 `7b20408846eec45f3ed9ff27e3bc6a86d920fcffdbfece69e63669db1f379674`。服务器权威冻结目录 `/srv/ans-releases/ans-vibehub-branding-89a7753-20261011/source`，4770 文件。源保留 vouchers-v2 的线上未提交增量，镜像明确标记 local-modifications；Git 提交仅覆盖本任务品牌及导航改动，不能用 Git 的旧应用源覆盖当前兑换券等功能。后续 ANS 集成发布交由主控统一，本任务没有剩余应用改动。

Linux 应用/测试类型检查、依赖边界检查、lint 与最终构建通过；lint 369 项存量 warning、0 error。首轮本地 lint 通过，后续两次本地重跑因系统内存不足失败，Linux 结果作为发布验证。最终只改 CSS 的补丁复用同一源码检查缓存，并重新完成 Next.js 编译、类型检查与构建。候选与正式各 11 个页面/资源 HTTP200，实际使用的 scoped.css 及两张 ANS SVG 哈希一致。发布前因首页继承 ANS 主站标题而被过严规则拦截，确认实际标题“前端 VibeCoding 术语 | ANS”后修正检查；栏目标题使用 ANS VibeHub。未将首次失败记作通过。

共享发布锁下核对容器和镜像，保留全部环境及挂载、既有 72 项迁移，未执行迁移或用户数据修改。正式数据库连接正常；收藏 1 条保留，浏览器刷新后恢复“收藏1”。已核对 1280×720 深色、390×844 浅色及 774px 窄桌面；深浅色 Logo 正确、无文档横向溢出、窄窗口菜单展开/关闭可用，临时视口和主题已恢复。首次窄窗口样式改到未引用文件的问题已在实际 scoped.css 修复并重新上线。浏览器历史日志曾有发布期间会话 fetch 失败，最终刷新能读取收藏；不将历史日志清空或声称全程零错误。

证据：本任务 `outputs/vibehub-branding-release/` 的 deployment.json、source-validation.json、source-manifest.json、browser-proof.json 和 ans-vibehub-final.jpg；服务器同名发布目录保留构建、候选检查及私有回滚配置，私有配置未入 Git。

当前运行配置以本次发布记录及实际容器检查为准；以下历史记录用于追溯。

## 当前发布：VibeHub 完整内容与账号收藏（2026-10-11）

本次发布已完成，正式站为 `https://ans.cauai.fun/vibe-hub`。冻结应用提交 `491f1544d1e20e9d26685f6ccfd5eb61c0961e83`，release `ans-vibehub-491f1544d1-20261011`，源码 SHA-256 `b6f3855644fcd5520bfbb71d77a2065d593ebe99a5515879759eb5274bd76c18`；运行镜像 `sha256:bd7d44407a286ab40ee6889b63edca91898ddbaa630a375d5839bd4f451bf4cc`，BUILD_ID `U_XFdNEkMc9SxQjul4cEo`，发布时间 `2026-10-11T11:42:31Z`（UTC）。正式容器 `ans-platform-app`，Compose 项目 `ans-platform-header`。运行环境值与原挂载逐项一致，原登录密钥、小恐龙挂载和业务配置保留；回滚镜像及私有原配置已留存。部署结束再次核对正式镜像仍为本版本。

本版包含已合并的 VibeHub 内容、课程、图解、练习、学习路径、Agent API 及截至冻结时已合并的 main 功能。收藏按游客和账号分别存储，只导入游客收藏；账号收藏以服务器为准，未完成操作可重试。切换账号时中止旧请求，后端拒绝身份不符的收藏读写；并发重复添加保持幂等。

发布门禁：Linux Prisma 生成、完整类型检查、lint 和生产构建退出码均为 0；服务端 lint 为 0 errors、369 项存量 warnings。一致 public schema 备份及独立 PostgreSQL 17 真实恢复通过，112 张表行数、内容摘要、约束、索引和迁移记录一致，备份 SHA-256 `185c16e83da3321847e34e3c6eb8e627089a62f388a806a80423489c67facef3`。唯一待迁移 `20261011160000_agri_stage_decisions` 已先在备份恢复库演练，111 张既有业务表的数据未变，再执行正式增量迁移；正式 71 项迁移全部完成。未创建正式赛事、虚构账号、业务验收数据或付费调用。

精确发布镜像使用两个**隔离验收账号**完成真实 Credentials/CSRF 登录：匿名 401、8 次并发添加仅生成一条收藏和一条审计、独立账号隔离、新登录读回、身份头不符的 GET/POST/DELETE 409、取消后重登仍为空且不影响另一账号、无效词条 404 均通过。这些增删发生在临时 PostgreSQL，不冒充正式用户或跨实体设备验收。临时数据库、内部网络和候选容器已清理。

用户已在正式 HTTPS 页面完成真实登录。经浏览器 UI 收藏 `tooltip`（文字提示），正式数据库确认一条持久记录及一条添加审计；刷新和新页面均显示“已同步到 ANS 账号”且词条存在。此验收收藏保留在用户账号，未取消或删除用户已有收藏。1280×720 桌面和390×844 手机尺寸均无横向溢出，新页面捕获 console error 为 0。正式健康检查及数据库 connected，16 个真实 HTTPS 页面完整返回200；676 个公开资源哈希核对通过（小恐龙按原挂载保留）。

本地证据：`C:/Users/lsb/Documents/Codex/2026-10-11/ui-screenshot-to-code-01-html/outputs/vibehub-release/` 中的 `deployment.json`、`backup-verification.json`、`isolated-verification.json`、`production-favorite-database.json`、`browser-verification.json` 和桌面/手机截图。服务器受限证据与备份位于本 release 目录。首次隔离网络地址池不足、网络列表空配置及临时库默认 public schema 冲突均已保留诊断后修正；最终恢复、隔离验收及发布退出0，不描述为首次全部成功。

本次完成 VibeHub 发布及账号收藏持久化验证，不扩大其他 ANS 模块的验收范围；真实支付、模型生成、长期稳定观察和其他历史未完成事项仍遵循原项目状态。

## 2026-10-11 main 同步与候选（历史，正式版本已由上述发布替换）

当前正式容器 `ans-platform-app`，Compose 项目 `ans-platform-header`；源码 release `/srv/ans-releases/ans-main-sync-20261011/source`，已部署 Git revision `e1dd01944a871cc5d36703f7e5add17dd4ba7d52`。以实际运行容器检查的配置、项目名和挂载为准，下文早期目录为历史记录。数据库运行使用 Supabase transaction pooler/6543；一致备份和迁移使用已有 `DIRECT_URL` session pooler/5432。

44 张 GitGlow 封面已合并 main 且上线，公开 HTTPS 请求 44/44 HTTP200，与 main 源码哈希相同。证据在本机 `.workbuddy/evidence/ans-main-sync-20261011/gitglow-recheck-20261011.json`。个人主页、签到、XP/等级、装饰与奖励系统已包含在当前部署版本；本轮继续修复并发奖励扣回、公开身份、工作流审核版本、持久任务恢复、市场明确拒绝后重试与农客松阶段决定/更正管理。

候选 release `ans-audit-20261011`：类型检查通过；全量 lint 0 errors，313 既有 warnings；184 个文件、2391 项单元验证通过，10 项 skipped；六类分层与113文档链接检查通过。全71项迁移在新建隔离库执行成功，11类真实 SQL 约束验证通过且事务回滚后业务表为空。此记录不代表候选已上线；正式部署以 release `deployment.json` 和运行容器版本为准。

未完成：新版的五轮生产闭环审计、农客松正式赛事绑定与独立报名窗口接入、阶段档案公开授权、AIGC 工作台真实内嵌/视频统一收费、现金支付适配与真实结算。无真实赛事绑定时不开报，不虚构赛事日期、规则或名单，不用生产付费调用或测试数据验收。这些缺口不能用按钮、模拟或旧证据称已完成。

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
