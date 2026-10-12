# ANS 生产发布与恢复门禁

## 当前正式版本：Hub、导航与可运行工作流市场（2026-10-12 北京时间 15:06）

本轮已合入 main 并实际部署。冻结应用提交 `71ab389593b536fad57c8fece92940376d0be04b`，正式 release `/srv/ans-releases/ans-hubs-release-20261012`；image `sha256:c5fb1c7d67f27ad311217c41ce5fb0f6a54202f440de5d097bccdf78d65ad32a`，source SHA-256 `b30a98fda57f17bd0143cbdba406a0819273c5212300a7cde598f8c1a4444cbf`，BUILD_ID `V1i1JOxr1qckKRptAt6_f`，实际发布时间 `2026-10-12T07:06:53Z`。容器 healthy，原环境与挂载逐项保留。后续仅补充本轮审查及发布文档的提交不表示应用镜像再次构建。

- 一级导航统一为项目广场、Hub 与工作流、社区成长、赛事活动、市场、工作台。账号菜单语言后增加我的收藏、算力中心。四个 Hub 目录上线；内容数量来自真实关联：CAUHub 0 工作流/0 项目/1 赛事入口，ANS VibeHub 0/0/1，AIGC 0/13/2，全栈开发 1/16/0；没有虚构高校入驻或社区工作流。原提示词公共页面删除，旧地址同源 308 跳转并清理查询参数；历史数据和共享 API 保留。原开源许可证保留，退役界面不消除法律来源。
- 工作流一键送审市场、不可变版本绑定、固定简历网站代码、个人输入确认、费用确认、账号隔离和持久重试键已部署。仅人工审核并发布的真实工作流可形成市场运行入口；当前社区工作流真实空态，未制造商品或案例来填充，也未在生产创建或执行验证任务。代码及离线边界证据与生产商业闭环验收分别记录。
- 个人主页保留真实作品/已上架项目，只展示安全昵称；真实账号为 Lv.1、7 XP、1 次已有签到，未写签到/装扮/经验。真实 Tooltip 收藏刷新后可读。充值保持现有链动小铺，100/500/1000/2000/5000 档可见，固定 ¥1 = 10 积分。VibePlan 价格和权益规划已展示，权益未全部履约，购买按钮继续禁用。

发布门禁实际通过：Linux 类型、六类边界、218 文件 2808 项通过/10 跳过、lint 零错误以及 fresh 生产构建均退出 0；118 张 public 表一致快照、独立 PG17 恢复和唯一 PROJECT enum 增量演练通过。正式新增 `20261012180000_project_favorites` 后共有 74 个成功迁移，数据库枚举原有五项顺序保留，仅追加 PROJECT。只读运行核验确认新 Prisma 客户端、镜像内 SQL 哈希、BUILD_ID 与部署报告相符。44 张 GitGlow 封面、24 个恐龙资产和 3 个许可证共 71 文件 hash 通过。

候选与正式本机各 18 路径 200；真实 HTTPS 18 路径 200，五个退役路径 308，浏览器实际 /templates 最终进入 /hubs。真实登录后菜单、收藏、成长、四 Hub、中英文和手机导航已检查；桌面宽 1304、文档宽 1289，手机宽 390、文档宽 375，Hub/VibePlan/积分页未横向溢出。临时视口已恢复，右侧保留新版 Hub 页面。新增恐龙 Agent R9 独立交付未混入本冻结版，不声称它已上线。

首次发布器迁移启动因 restricted /build 目录下 1001 用户无法加载本地工具，npx 意外尝试 registry 后 EACCES，正式应用未切换；保留首次失败。修正只限临时迁移容器使用 root、直接执行镜像内已有 Prisma CLI 和显式只读冻结 schema，未安装新包、未修改生产应用用户或环境。第二次迁移与部署退出 0；原应用 image 回档 tag 和一致数据库备份保留。

本地证据 `C:/Users/lsb/.workbuddy/ans-hubs-release-20261012/`：deployment.json、backup-verification.json、migration.json、runtime-verification.json、public-verification.json、browser-verification.json、final-live-state.json 及桌面/手机截图；服务器同 release 目录保留受限原始日志与回档配置。生产验收没有真实模型/TTS/购买/兑换/扣费退款，也没有新账号、项目、订单或 XP；这些边界、完整会员履约和创作者结算不因本轮发布而宣称完成。下面记录均为历史追溯，以本段和实际容器为当前正式事实。

## 2026-10-11：ANS VibeHub 品牌发布（北京时间 20:51）

正式站 VibeHub 页头、ANS 首页入口、页脚展示与 Agent manifest 使用 ANS VibeHub；复用 ANS 深浅色 SVG、favicon、Apple 图标和分享图，保留原站作者及内容来源。窄桌面导航在 1050px 以下收起，手机与桌面品牌完整显示。

当前发布源提交 `89a7753bde184771b70a4f0f4f5d7c5f42220472`，镜像 `sha256:e892b2c5532f3cb580e96018bf7307effd7b3b24cd6d6be5d8b79e5ed0463e64`，BUILD_ID `iY2X1ve1gDQxaG2RWpIyX`，冻结源 SHA-256 `7b20408846eec45f3ed9ff27e3bc6a86d920fcffdbfece69e63669db1f379674`。服务器权威冻结目录 `/srv/ans-releases/ans-vibehub-branding-89a7753-20261011/source`，4770 文件。源保留 vouchers-v2 的线上未提交增量，镜像明确标记 local-modifications；Git 提交仅覆盖本任务品牌及导航改动，不能用 Git 的旧应用源覆盖当前兑换券等功能。后续 ANS 集成发布交由主控统一，本任务没有剩余应用改动。

Linux 应用/测试类型检查、依赖边界检查、lint 与最终构建通过；lint 369 项存量 warning、0 error。首轮本地 lint 通过，后续两次本地重跑因系统内存不足失败，Linux 结果作为发布验证。最终只改 CSS 的补丁复用同一源码检查缓存，并重新完成 Next.js 编译、类型检查与构建。候选与正式各 11 个页面/资源 HTTP200，实际使用的 scoped.css 及两张 ANS SVG 哈希一致。发布前因首页继承 ANS 主站标题而被过严规则拦截，确认实际标题“前端 VibeCoding 术语 | ANS”后修正检查；栏目标题使用 ANS VibeHub。未将首次失败记作通过。

共享发布锁下核对容器和镜像，保留全部环境及挂载、既有 72 项迁移，未执行迁移或用户数据修改。正式数据库连接正常；收藏 1 条保留，浏览器刷新后恢复“收藏1”。已核对 1280×720 深色、390×844 浅色及 774px 窄桌面；深浅色 Logo 正确、无文档横向溢出、窄窗口菜单展开/关闭可用，临时视口和主题已恢复。首次窄窗口样式改到未引用文件的问题已在实际 scoped.css 修复并重新上线。浏览器历史日志曾有发布期间会话 fetch 失败，最终刷新能读取收藏；不将历史日志清空或声称全程零错误。

证据：本任务 `outputs/vibehub-branding-release/` 的 deployment.json、source-validation.json、source-manifest.json、browser-proof.json 和 ans-vibehub-final.jpg；服务器同名发布目录保留构建、候选检查及私有回滚配置，私有配置未入 Git。

当前运行配置以本次发布记录及实际容器检查为准；以下历史记录用于追溯。

## 2026-10-11 21:23 本轮修复与待发布冻结

最近真实父版为 ans-vibehub-branding-89a7753-20261011，image sha256:e892b2c5532f3cb580e96018bf7307effd7b3b24cd6d6be5d8b79e5ed0463e64、healthy；以下旧e441父版记录为历史。Hypit最小候选已构建，主控整合版包含其7文件但尚未部署。当前整合补齐账号绑定、支付恢复、模型安全重试、争议审批及退款队列、农客松负责人/精确Demo引用/固定现场责任档案。197文件2584通过/10既有跳过、完整类型、lint0错误及六类边界通过；下一步按最终Git冻结源码fresh备份恢复、唯一新迁移旧数据演练、Linux构建和实际切换。

唯一新迁移20261011183000_agri_completion_provenance（SHA256 a3f9a5ab4bcbac57ae128b7fe7ccd25be2263a1a8466eef420c7d393b38490eb）已在独立PG17核验旧v1档案逐字节不变及v2权限。回滚原旧镜像在产生v2后会拒读v2，不能宣称无条件回滚；发布前后核验赛事绑定关闭和新档案写入不可达，后续开赛必须采用兼容reader回滚版本。旧冻结27ea的备份与构建失败不用于放行当前父版。

商户后台双方均有；微信登录等待用户扫码。真实付款/退款/卖家分账、真实比赛身份日期、AIGC全媒体计量/双端发布、五轮完整生产审计仍未完成。所有生产fixture/收费调用保持零，不把入口或关闭的开关算真实商业闭环。

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


## 历史发布：VibeHub 完整内容与账号收藏（2026-10-11）

本次发布已完成，正式站为 `https://ans.cauai.fun/vibe-hub`。冻结应用提交 `491f1544d1e20e9d26685f6ccfd5eb61c0961e83`，release `ans-vibehub-491f1544d1-20261011`，源码 SHA-256 `b6f3855644fcd5520bfbb71d77a2065d593ebe99a5515879759eb5274bd76c18`；运行镜像 `sha256:bd7d44407a286ab40ee6889b63edca91898ddbaa630a375d5839bd4f451bf4cc`，BUILD_ID `U_XFdNEkMc9SxQjul4cEo`，发布时间 `2026-10-11T11:42:31Z`（UTC）。正式容器 `ans-platform-app`，Compose 项目 `ans-platform-header`。运行环境值与原挂载逐项一致，原登录密钥、小恐龙挂载和业务配置保留；回滚镜像及私有原配置已留存。部署结束再次核对正式镜像仍为本版本。

本版包含已合并的 VibeHub 内容、课程、图解、练习、学习路径、Agent API 及截至冻结时已合并的 main 功能。收藏按游客和账号分别存储，只导入游客收藏；账号收藏以服务器为准，未完成操作可重试。切换账号时中止旧请求，后端拒绝身份不符的收藏读写；并发重复添加保持幂等。

发布门禁：Linux Prisma 生成、完整类型检查、lint 和生产构建退出码均为 0；服务端 lint 为 0 errors、369 项存量 warnings。一致 public schema 备份及独立 PostgreSQL 17 真实恢复通过，112 张表行数、内容摘要、约束、索引和迁移记录一致，备份 SHA-256 `185c16e83da3321847e34e3c6eb8e627089a62f388a806a80423489c67facef3`。唯一待迁移 `20261011160000_agri_stage_decisions` 已先在备份恢复库演练，111 张既有业务表的数据未变，再执行正式增量迁移；正式 71 项迁移全部完成。未创建正式赛事、虚构账号、业务验收数据或付费调用。

精确发布镜像使用两个**隔离验收账号**完成真实 Credentials/CSRF 登录：匿名 401、8 次并发添加仅生成一条收藏和一条审计、独立账号隔离、新登录读回、身份头不符的 GET/POST/DELETE 409、取消后重登仍为空且不影响另一账号、无效词条 404 均通过。这些增删发生在临时 PostgreSQL，不冒充正式用户或跨实体设备验收。临时数据库、内部网络和候选容器已清理。

用户已在正式 HTTPS 页面完成真实登录。经浏览器 UI 收藏 `tooltip`（文字提示），正式数据库确认一条持久记录及一条添加审计；刷新和新页面均显示“已同步到 ANS 账号”且词条存在。此验收收藏保留在用户账号，未取消或删除用户已有收藏。1280×720 桌面和390×844 手机尺寸均无横向溢出，新页面捕获 console error 为 0。正式健康检查及数据库 connected，16 个真实 HTTPS 页面完整返回200；676 个公开资源哈希核对通过（小恐龙按原挂载保留）。

本地证据：`C:/Users/lsb/Documents/Codex/2026-10-11/ui-screenshot-to-code-01-html/outputs/vibehub-release/` 中的 `deployment.json`、`backup-verification.json`、`isolated-verification.json`、`production-favorite-database.json`、`browser-verification.json` 和桌面/手机截图。服务器受限证据与备份位于本 release 目录。首次隔离网络地址池不足、网络列表空配置及临时库默认 public schema 冲突均已保留诊断后修正；最终恢复、隔离验收及发布退出0，不描述为首次全部成功。

本次完成 VibeHub 发布及账号收藏持久化验证，不扩大其他 ANS 模块的验收范围；真实支付、模型生成、长期稳定观察和其他历史未完成事项仍遵循原项目状态。


## Integrated production release b9ab5ffe (2026-10-11 22:24 Asia/Shanghai)

The authorized integrated release is now deployed, not only merged: at deployment, `origin/main` and frozen application source revision were `b9ab5ffe63be7ecf8cce2d9bfdbb19917a234fbb`. Release directory `/srv/ans-releases/ans-integrated-b9ab5ffe-20261011`; runtime image `sha256:617f660a8c85447f425525df9e3ee7e6754a2718578799caf538350cca9d6608`, BUILD_ID `cSJJA4bG-FdAbpU24AgZP`. Production healthy; original application environment preserved. Exactly one provenance migration was applied, bringing finished migrations to 73. Prior application image and consistent backup are retained; no database rollback was performed.

Backup restore and upgrade rehearsal passed: all original columns of 118 public tables retained matching row digests. Precise-source isolated verification passed history 30 plus fresh-process persistence 1, completion 12 plus persistence 2, and market 13 signed simulated-provider scenarios. The outdated market verifier received a verifier-only overlay in `/verify`; frozen business source and image were not edited. Original checker SHA `2893a3d71c10007e20e7bd665545f4d5116a8049cb747901f512c97627923085`; overlay SHA `15bf3958f4009a6638796ac487ac2a8464149ca6c9486f7bbbf4bd58e14c129a`. Historical CASH fixtures existed only in the guarded isolated database; no real payment or provider checkout was asserted.

Original Docker packaging exited 1 after code gates and image writing because the independent data disk filled. Unused build cache was removed, and the exact tagged image was successfully unpacked and executed; original build exit and failed logs remain preserved. First production migration attempt failed on transaction-pooler prepared statements before application switching. The migration process alone used the same Supabase endpoint on session port 5432; second attempt exited 0. Preview/production persistent environment was unchanged; both migration attempts remain in private release evidence.

Real HTTPS browser checks covered 8 routes at 1440 and 390 widths: Document 200, current BUILD_ID, no horizontal overflow. Initial VibeHub/profile loading-skeleton observations were followed by actual-content checks. Existing Hypit project and profile growth/check-in records were read through the recovered existing user session; no new project, XP, order or payment was written. All 44 GitGlow cover hashes match. Five anonymous private read/export endpoints returned 401. Chinese/English event rules and French-to-English fallback matched current scoring and Demo wording.

Evidence retained locally at `C:/Users/lsb/.workbuddy/ans-integrated-release-b9ab5ffe/` and privately in the release directory. This closes this integrated deployment, not the complete product goal. Merchant dashboards exist for both WeChat Pay and Alipay, but merchant login/configuration, actual collection/refund and third-party seller settlement remain pending. Hypit AI media channels, AIGC actual usage and billing, protected resource delivery, complete five-round audit, and real event edition/dates/eligibility/staff/scoring/voting/publication authorization remain separate unfinished gates. The event remains unbound; the old-reader rollback condition must be reconsidered before binding it and writing v2 archives.


## VibeHub ANS return navigation ? prepared for integrated release (2026-10-11)

The user clarified that ?return to the original position? means the ANS page and scroll position they came from. The header, mobile navigation and footer now share a return destination, including query parameters and hash. The root navigation provider saves the latest ANS page per browser tab before entry; VibeHub routes and refreshes retain that origin. Returning waits up to four seconds for page height, restores both scroll axes and stops on user input. Missing origins fall back to the ANS homepage. Same-origin validation rejects external, API and VibeHub destinations; unavailable session storage uses a tab-local memory fallback. This changes no database schema, account, favorite or payment data.

Source changes: `src/components/providers/vibehub-return-navigation.tsx`, `src/components/providers/index.tsx`, `src/app/vibe-hub/ans-return-link.tsx`, `src/app/vibe-hub/shell.tsx`, `src/app/vibe-hub/footer.tsx`, `src/app/vibe-hub/labels.json`, `public/vibe-hub/source/scoped.css`. The historical `vibe-hub.css` copy is not imported and was not changed.

Validation: full lint passes with the existing 371 warnings and zero errors; TypeScript and all six architecture boundary checks pass, and `git diff --check` passes. No new test suite or dependencies were added. There is no production-build or browser scroll-restoration pass for this change. Local browser acceptance was blocked by the browser URL policy and was not bypassed; the local homepage also lacks a working database/auth configuration. Browser and narrow-screen acceptance remain required after integrated deployment.

Deployment state: application container was read-only verified healthy, public health 200, release `integrated-b9ab5ffe-20261011`, image `sha256:617f660a8c85447f425525df9e3ee7e6754a2718578799caf538350cca9d6608`. This return-navigation change is NOT live. To respect the active ANS coordinator?s unified release request and avoid overwriting concurrent recharge/VibePlan changes, this chat did not independently build on the server or replace the application container. Integrate this source change from main into the next frozen coordinated source and deploy under `/var/lock/ans-platform-deploy.lock`. After release, accept: ANS source page with a query and hash ? scroll ? enter VibeHub ? switch topics and refresh ? use each return entry ? original URL and scroll position; also direct VibeHub entry and mobile header/menu.

Local validation logs and the exact seven-file source delta/manifest are retained in `C:/Users/lsb/Documents/Codex/2026-10-11/ui-screenshot-to-code-01-html/outputs/vibehub-branding-release/` (`return-final-lint.log`, `return-final-types.log`, `return-boundaries.log`, `return-navigation-delta.tgz`, `return-navigation-manifest.json`).


## ANS VibeHub knowledge adaptation — prepared for coordinated release (2026-10-12 Asia/Shanghai)

The user requested creative adaptation before the next publication, using Interface Design, UI UX Pro Max, LottieFiles Motion Design and Design Motion Principles. The result is an ANS knowledge/practice entry rather than a branding-only copy. It inherits the host palette, font, Button/Sheet components and shared light/dark theme; keeps the ANS logo and existing mascot; and retains all 360 terminology entries, both courses, practice, journeys, lab and account favorites. No schema, authentication, payment configuration, dependency or production image was changed by this adaptation.

Six original bilingual guides cover an actionable brief, a factual portfolio, creative production, GitHub/skill reuse, competition evidence, and account/private-material/compute boundaries. Each includes three substantive sections, a copyable request, verified related terms and existing ANS destinations. Guides appear in the home page, their directory, matching term pages, journey entry, local search, bilingual sitemap and browserContent manifest. Upstream update dates remain explicitly labeled as upstream history. Rules and the pinned method repositories are saved in `.interface-design/system.md`; repositories were read from task checkouts, not claimed as globally installed or reloaded.

Integrated source baseline: `106dfc92e72ee062820cf9470d3b343b56244219`, retaining the latest Hypit workspace/receipt recovery, host polish, credit denominations and VibePlan work already on main. Full lint exits 0 (371 existing warnings, no errors); TypeScript and all six architecture boundary checks exit 0; diff whitespace checks pass. Guide term slugs, real destinations and translation key parity pass. No new test suite or invented database content was added.

The first final production build compiled successfully, then its TypeScript worker failed with a memory allocation error. The retry used process-local memory settings, retained `ignoreBuildErrors: false`, and completed all build stages with exit 0. BUILD_ID `tpZIOB8AlTWBcHnWxP9y4`. Missing local database setup triggered existing static-data fallbacks during generation; this does not establish database readiness. Standalone production HTTP acceptance returned 200 for 13 routes, including original guides, search, courses, upstream updates, six-guide manifest and bilingual sitemap.

Real development-browser acceptance covered Chinese/English, light/dark, 1440x950 desktop and 390x844 mobile, menu opening/closing and all entries, original directory/detail, clipboard copy, matching search, retained term and course display, and a real practice answer/unlocked content. Inspected pages had no horizontal overflow. Return acceptance succeeded: source `/terms?from=knowledge-return#main-content`, x=0/y=1449, enter knowledge home, navigate ANS Practice, reload, use the header return, and obtain the identical URL and scroll coordinates. This supersedes the preceding return section's earlier unverified-local-browser status. Production scroll restoration still needs acceptance after coordinated publication.

The optional standalone browser recheck did not complete after an initial connection-refused error and browser tab initialization timeout; the blocked data error page was not bypassed. HTTP checks and prior real UI acceptance remain distinct. Local authentication is not configured, so this round does not re-validate production login, favorites persistence or cross-device sync. Prior production favorite evidence remains historical and the favorite implementation is unchanged.

Deployment: this adaptation is NOT live. The active ANS coordinator is publishing other changes; this chat prepared the new Git source and reviewable evidence without replacing its container. Integrate the committed adaptation into a new frozen main source, preserve current business configuration and migration state, and use `/var/lock/ans-platform-deploy.lock`. After publication verify the actual revision, Chinese/English mobile/desktop, known-account favorites, return URL/scroll and the original guide endpoints. Do not treat this local build or old release evidence as proof of the new production image.

Evidence directory: `C:/Users/lsb/Documents/Codex/2026-10-11/ui-screenshot-to-code-01-html/outputs/vibehub-branding-release/`. Key artifacts: `ans-final-lint.log`, `ans-final-types.log`, `ans-final-boundaries.log`, failed `ans-final-build.log`, successful `ans-final-build-retry.log`, `ans-production-http-proof.json`, `ans-return-browser-proof.json`, and the actual local screenshots. The forthcoming `ans-knowledge-delta.tgz`/`ans-knowledge-manifest.json` identify exact changed files and hashes; no private deployment configuration is packaged.

## Unified credits, VibePlan and Hypit release (2026-10-11 23:59:28 Asia/Shanghai)

User-authorized production publication completed: source revision `106dfc92e72ee062820cf9470d3b343b56244219` was pushed to `origin/main` and deployed from `/srv/ans-releases/ans-ui-credit-vibeplan-v2-20261011`. Running image `sha256:fe2a2c7a4ed16bf4944113f0094f16bbd4b429e65e6b1fe4c62dde9f120f87de`, source SHA-256 `cc26772b193d967304a6bb71ad14d804a44f8a9aa32703dbfdf786455814f7fc`; deployment exited 0, actual container and database healthy. This includes the latest task receipt recovery, Hypit internal workspace, official Hypit media showcase, VibeHub source-page return and credits UI; preserves 44 verified GitGlow covers and mascot mounts. The earlier 2e286d72 candidate was never deployed because another authorized recovery release had changed the production parent. Its checks cannot replace this v2 release evidence.

Only the existing LDXP voucher route is used for credit sales. The user explicitly confirmed publication and inventory transmission. Five real products were published with 20 genuine unredeemed vouchers each at publication: 100 points / CNY10 (`gear3z`), 500 / CNY50 (`tme6gj`), 1000 / CNY100 (`fjg7om`), 2000 / CNY200 (`vzgq9f`), 5000 / CNY500 (`yz6ej2`), all under `https://wzyp.cn/item/`. The five production URL variables exactly match these products; existing environment and original 10-point product are preserved. Merchant UI and each public product were read back; all imports explicitly reported 20 successful vouchers. Checkout fees follow the provider's actual checkout. Inventory generation and upload are real production writes; no real purchase, redemption or model call was made. Do not regenerate or reimport the private inventory. WeChat/Alipay direct merchant integration is superseded for recharge. Marketplace cash checkout and seller settlement remain separate unfinished work.

Exact Linux build, fresh consistent backup/restore and isolated committed-source verification all exited 0. No new migration; 73 completed migrations with zero pending. History 31, completion 14 and marketplace 13 simulated-provider checks passed only in isolated PostgreSQL. Increment audit passed 18 focused component checks; no claim of rerunning the full repository during that independent increment audit. Production and candidate core pages returned complete HTTP200. Public HTTPS health, VibePlan, Hypit, Explore and VibeHub returned200; anonymous credits correctly redirects to login. VibePlan serves weekly/monthly/quarterly preview with purchases disabled; price, quota, benefits, renewal and carryover remain unconfirmed. This is a preview release, not a sellable subscription.

Browser tabs changed across compaction; new-tab initialization, navigation and screenshot commands repeatedly timed out. Final desktop/mobile visual, live SKU selector interactions, Hypit playback and VibeHub scroll-return acceptance remain unverified for this release; candidate screenshots are not production screenshots. Stored merchant inventory screenshot remains valid evidence for the completed publication. Local release evidence and existing Hypit handoff are updated under `C:/Users/lsb/.workbuddy/ans-credits-vibeplan-handoff/` (`v2-deployment.json`, `v2-public-readonly-verification.json`, `v2-source-validation.json`, `v2-candidate-covers.json`, `v2-backup-verification.json`, `ldxp-five-products-stocked.png`). This completes this publication, not the overall ANS product goal or formal event setup.


## 套餐目录、已审计 PR 与小恐龙统一上线（2026-10-12 Asia/Shanghai）

本轮用户明确授权合并并部署。实际应用冻结提交 `29dec185be4980836c83f878595ce931cc39864b` 已合入 main，部署目录 `/srv/ans-releases/ans-billing-pr-integrated-20261012`；正式切换时间 `2026-10-11T18:34:28Z`（UTC）。运行镜像 `sha256:8e6d3a015f4103f5722eef1348a61f55f3feb8d987435bd17911503e731c7658`，BUILD_ID `FnFxoBjNXK-MNTBO-XCzo`，容器与数据库均 healthy。源码 SHA-256 `9ec56237757283b0a28df8e1b660768ad12486851b509b7d131fe515aeb804f2`。生产原环境逐项保留，新小恐龙文本使用独立只读挂载；既有 GLB、rig、44 张 GitGlow 封面逐文件哈希核验通过。未新增生产迁移，73 项迁移已完成、零待迁移。

发布范围：已确认的 VibePlan/Pro 六个周月季 SKU、规则与权益规划、固定 ¥1=10 算力积分；原链动小铺五档及旧10积分卡保留。会员购买仍关闭，服务端就绪门禁未通过，未发放虚构会员或积分。完整批次钱包、到期/用途隔离、权益履约、原渠道退款、真实成本及会员商品仍未完成；详见商业化计费架构及本轮 backend-lifecycle-next.md。计划页上线不表示会员已可购买。

PR #47 的发现/搜索/输入预览与翻译经安全适配合并，保留成长奖励、旧新两类收藏、现有APIC估价；PR #30 的SSR首屏、metadata/hash、手机重工具挂载及键盘焦点经适配合并；#29 被现有实现替代并关闭。发布后 GitHub 开放 PR 列表为空。另包含 VibeHub 91a89630 的 ANS 实践内容、公开 AIGC 工作台命名、安全管理员调账界面，以及小恐龙本地站内向导和网站设置。小恐龙默认静音、聊天不消耗积分，未冒充付费模型回复。

精确 Linux 构建退出0：应用与测试类型、六类架构边界、lint与生产构建通过。208个测试文件通过；2683项通过，10项按原规则跳过；lint 0 errors、373 warnings。新一致快照备份在独立 PostgreSQL17恢复，118张public业务表行数/摘要、约束、索引和迁移记录一致；备份 SHA-256 `34bb4857e5fceb7858d8daf86815b8b9f9c793eac44ddf1810220faab4ee8a35`。仅为应用public schema，不覆盖Supabase平台schema或外部对象存储。隔离精确源码验收history31、completion14、market13（签名模拟渠道、无真实付款）通过；隔离环境记录不冒充生产业务交易。

候选与正式12个页面完整HTTP200；真实HTTPS health及VibePlan/templates/developers/VibeHub/explore完整200。真实浏览器核对六价格/额度/周期、按钮禁购、固定换算、中文与英文；1280桌面和390手机均无横向溢出。小恐龙1iframe/1panel、快捷视频提问更新真实工作流与工作台入口、默认语音关闭、安静与推荐开关工作。模板真实总数1，agent搜索0并显示诚实空态；开发者手机告知桌面限制、桌面分词器加载及hash切换成功。VibeHub手机/桌面布局与返回 `/developers#tokenizer` 成功，精确滚动位置未重新验证。已有真实账号积分账单加载；5000积分/¥500切换到原已上架商品；没有购买、兑换、生成、付费TTS、造账号或生产验收订单。

证据：`C:/Users/lsb/.workbuddy/ans-billing-release-20261012/` 下 deployment.json、public-verification.json、browser-verification.json、backup-verification.json、source-validation.json、candidate-covers.json、linux-build.log、isolated-evidence及实际桌面/手机截图。前端聊天另外只读验收了 `/explore` 的新面板与设置，证据位于 `ans-companion-settings-20261012/evidence/`，其报告未冒充额外真实TTS验收。

冻结后main新增 `f4172f18864f5fe9403736f87c9b612ec4e682c9` 的下一批知识区改动，未在本轮镜像中；不能把本轮验证或下述文档提交当成这一增量已部署的证据。本轮应用仍以29dec185为准，后续增量须另做精确发布门禁，不覆盖本次记录。

## 2026-10-12：ANS VibeHub 原创学习与创作改造正式发布

北京时间 2026-10-12 11:57:22 发布完成，应用源码提交 `f4172f18864f5fe9403736f87c9b612ec4e682c9`，release `/srv/ans-releases/ans-vibehub-original-f4172f1-20261012`。运行镜像 `sha256:11f03f87f3449792e31bcfe2920b02563ca5d7fbf318032db20424afaa8247c6`，BUILD_ID `LYH9fyp3QZYHm5-9F4ZrI`，源码 SHA-256 `5a2a18bca2b0372555f0ae3ff4b0bdc8cf4ad352fd61d0a2608962261edfe1ba`，10386 个 Git 归档文件逐项核验。集成保留最新 29dec18 主站代码及其实际生产源码，未用旧冻结版本覆盖并行成果。首次准备检测到父版变化，拒绝继续；重新核对新父版与 29dec18 应用源码完全一致后才构建。

本版把上游更新历史替换成有实际页面对应的 ANS 改进记录，增加三条原创学习路径、课程导学目录与可填写/复制的 Agent 需求整理；首页三张封面概括本站术语、原创实践和互动练习，沿用 GitGlow 排版方法和许可。保留上游术语、基础课程与来源。实验室虚构人数/评分已换成真实内容数量。学习路径勾选与需求草稿保存当前设备，不宣称账号同步；词条收藏继续使用真实 ANS 账号与数据库。

集成源码本地类型检查、完整 lint（0 error / 376 既有 warning）、六类边界通过。精确 Linux 源码完成 Prisma 生成、类型检查、边界、lint 和生产构建，构建退出 0。未增加测试套件。构建初次依赖镜像缺少已有 QR 依赖、第二次受隔离网络限制，切换当前正式镜像的依赖与构建网络后通过；首次镜像打包引用原镜像 ID 格式错误，固定验证标签后通过。失败日志保留，不称首次全部成功。

当前父版的 public schema 一致快照与 PostgreSQL 17 独立实际恢复通过：118 张表，73 项已完成迁移，0 项待迁移；备份 SHA-256 `f97a39eea012d4711537f6f7220bdf2e84f4e040efca10edac4b8be4c739213d`。没有新增迁移。共享发布锁内再次核对父容器和镜像，保留所有环境值及挂载、原镜像回滚标签；候选与正式各 30 个页面/资源 HTTP200，新封面候选哈希符合冻结源码。正式 healthy / 数据库 connected；未进行生产数据库回灌、真实收费或模型调用。

真实已登录账号新增 progress 收藏，数据库一条持久记录及一条 FAVORITE_ADDED 审计记录确认；浏览器刷新后显示“已同步到 ANS 账号”，上线后仍读取到原 tooltip 与新增 progress 两条收藏。只清理本次验收新建的 progress 记录并保留原 tooltip 与审计日志，不删除原收藏。返回 ANS 实际验收：`/explore?search=agent#ans-main-content`、滚动 y=294，经知识站跨栏目及刷新返回后地址与 y=294 均恢复。正式桌面首页确认本站三张封面，改进记录中文桌面与英文 390px 手机无横向溢出；最后学习路径导航曾超时，但随后实际文档标题、地址与原创路径内容正确，保留此边界，不宣称全站逐交互生产验收。

证据：`C:/Users/lsb/Documents/Codex/2026-10-11/ui-screenshot-to-code-01-html/outputs/vibehub-refactor-release/`，包括 deployment.json、source-validation.json、backup-verification.json、favorites-added-database.json、favorites-restored.json、return-navigation.json、candidate-pages.json、production-pages.json 和正式站截图。源构建与备份私有日志保留服务器受限目录，凭据不进入 Git。

## 2026-10-12: Knowledge return and stable cover sizing production release

Application revision `25580d29d3f904302b1f433b5f00ef0f2cc7fe39` is merged into origin/main and deployed from `/srv/ans-releases/ans-cover-stability-20261012` at `2026-10-12T05:24:25Z` UTC. Image `sha256:8d0ab49987f88932e301c9a50d011336424bef532568837d25a4b4c35d599d24`, frozen source SHA256 `6ee1ff7aaf751218b81dd3a9033a62a7613830007e8b07abe7b679a5660f0340`, BUILD_ID `lpuK6p68krus1MELGM7C7`. Container and database are healthy. Original environment and mounts are exactly preserved; all 44 GitGlow covers and 24 companion files pass byte-hash checks. No new migration, 73 completed migrations and zero pending. Candidate and production each returned complete HTTP200 for 12 routes; public HTTPS health/database connected and plan/explore/English paths complete200.

Persistent RootLayout is now wrapped in a client SiteFrame using usePathname, while server Header/Footer remain slots and Providers stay outside the conditional frame. Return restoration holds a bounded four-second window and immediately yields to pointer, wheel, touch, scrolling keys, Tab and Enter. First fix2fac restored chrome but actually returned1512->1559. Deployed5aae initially returned2999->3071; this failure remains recorded. Independent review identified the cover's declared1264x712 versus actual1280x800 ratio. f6347 sets both intrinsic hints and CSS to8:5, reserving stable space for official or member images without changing image bytes.

Final live1280x720 desktop returns1440->1440->1440 after language switching and reload;390x844 mobile returns2284->2284->2284 after mobile menu language switching and reload. Read after six seconds and another five seconds; main/footer restored, one companion iframe and no document horizontal overflow. Four incomplete images (naturalWidth0) and their later decoded1280x800 versions have identical rects, approximately388.3x242.7. Final six VibePlan prices/allowances/periods/quarterly grant schedules, fixedCNY1=10points and disabled membership purchase were verified in Chinese, plus English/mobile rendering. No purchase, redemption, fabricated account/order, member grant, model or TTS call.

Concurrent production handling:1f5b224 was an ancestor of5aae. The first parent gate rejected deployment without switching production. After independently reviewing the remaining six-file difference, a fresh backup79026ef from actual2ff parent was created before5aae deployment. Oldb22 backup and rejection logs remain, clearly distinguished. Later81f263 footer simplification was normally merged into25580; footer source links are removed, while course/foundation-path attribution and ANS original labels remain. This final patch built and deployed against actual4fc/5aae. Fresh public-schema snapshot SHA256 `b4616f16ab8e7f57f914a4a20da6afbfb4d9dd78f16a6028e38aff874f7fc201` was restored in isolated PostgreSQL17 with118 table counts/content digests/constraints/indexes/migration checks. This does not cover Supabase platform schemas or external object storage.

Exact Linux generation, application types, six architecture boundaries,3files/11 relevant regressions, full lint and production build all exit0. Lint0errors/373 existing warnings;174 static pages. The intentionally disconnected build DB produced a prompts.csv warning while build exited0; it is not production API acceptance evidence. Independent reviewer vibehub_followup_review verifies this release only. AC-V04 authenticated favorites were not repeated in this batch; priorf417 favorite evidence cannot prove25580 behavior.

Evidence: `C:/Users/lsb/.workbuddy/ans-cover-stability-20261012/` deployment.json, backup-verification.json, source-validation.json, source-manifest.json, browser-verification.json, vibeplan-verification.json, public-verification.json, final-live-state.json and actual screenshots. Independent review: `C:/Users/lsb/.workbuddy/ans-vibehub-followup-audit-20261012/`. Documentation commits do not change the deployed application revision. Membership remains an approved plan preview with purchases disabled: real activation, batch expiration/purpose isolation, entitlements, original-channel refunds, procurement cost and plan products are unfinished. Existing five LDXP recharge products remain. The other chat's real companion Agent candidate is excluded from this frozen release and is not deployed; its isolated UI evidence cannot substitute for real model/tool compatibility or billing verification.

## 2026-10-12 20:10:43 北京时间：六导航、Hub、固定配方与 R9 正式上线

用户明确授权本次提交 main 与部署。应用冻结 revision `1c1d4db1897dd738812963562a33d6f329bf56cb` 已推至 main，并从 `/srv/ans-releases/ans-platform-recipe-r9-r3-20261012` 正式发布。部署退出 0；实际 image `sha256:a6694acb1fe03e4b58071e7a261d0d72f2e401a237615fcce32c923ef3a773ea`，container `8b83b3ac26df1791ad73576e498ac5a7ea217dbe966ea0e78eb284c5827e39b9`，BUILD_ID `Y3jvHQM_xL96PNVZdEQQ5`，source SHA256 `1f4a07de61a11431036bad24098fabd93b583c7fab903770a806fc5c3ad2a358`。实际容器 healthy，数据库 connected，workerEnabled true；环境与挂载逐项保留。此后文档提交不代表应用已换版。

发布包含六主导航、账号菜单收藏与算力中心、四个真实 Hub、旧公共提示词等界面退役、PROJECT 收藏支持，以及 R9 小恐龙 Agent 布局/模型选择/静音/可调整面板。完整保留当前父版知识区、44 张 GitGlow 封面、24 件 mascot 资产与三件许可文件，71 件静态文件 hash 通过。并行市场线程尚未整合的新项目/SDK候选不属于本 release。

首个官方固定配方真实登记成功：officialId `ans-platform-resume-website-v1`，workflow `cmv57kxtg0001rs0hofcak7p2`，slug `ans-portfolio-website`，immutable version `cmv57kxth0003rs0hjo3cnap7`；市场卡 `cmv57lacv0007rs0hca9i3dy2`、slug `workflow-1d3ca6305418660ecacf4b3f-v1`，version1/PUBLISHED。平台严格注册来源、代码、版本和审计；实际 owner 权限有效。官方发布前后 XP 均7，不生成虚构账号或奖励。模型仅整理用户事实，固定代码产出个人网站；Hub、workflow详情、market均指向这套实际版本。

R1、R2 都在生产切换前失败，证据保留。R1 `$queryRaw` 接收 PostgreSQL advisory lock 的 void 返回引发 P2010，改为 `$executeRaw` 并在真实只读事务确认。R2 原始详细错误被发布器遮蔽，不声称直接捕获其原始 Prisma code；独立13查询对照在默认5秒事务末步复现P2028，30秒上限成功。仅官方登记事务增加有限 maxWait15000/timeout30000，诊断只输出安全稳定错误码，R3 成功登记。独立审查依据 R3 实际登记、版本、来源、audit、XP及healthy关闭 ISSUE-HR13，不扩大为真实收费模型验收。

精确 Linux：223文件、2932通过/10跳过/0失败，完整应用与测试类型、六边界、生产构建通过；lint0error/340存量warning。74项迁移、零待迁移、本轮零新增DDL。发布前 fresh public-schema 一致备份 SHA256 `411d57d98b86cd9e4c0a0d0c9c4acb984841bd2a9246785fb1e48ff6410222be` 在隔离 PostgreSQL17 恢复，118表计数/摘要/约束/索引/迁移一致；不覆盖 Supabase 平台 schema 或外部存储。candidate/production 各20页面完整HTTP200，公开HTTPS六入口及精确运行镜像再次通过。

实际生产浏览器使用已有账号：桌面与390×844手机确认六导航、账号收藏/算力、四Hub、Hub→真实配方、市场同版本个人输入、空输入生成禁用、高级结构折叠和页面无横向溢出。R9 默认静音、三个实际模型选项、模型与发送同排，手机面板366×522宽度适配、全页一iframe。独立小恐龙聊天另确认桌面拖动后重开/刷新记忆与恢复默认，本聊天自身刷新曾出现ERR_HTTP2_PROTOCOL_ERROR，随后同浏览器新HTTPS tab恢复；失败不删除。临时手机viewport已恢复，交付页为 `/hubs`。

未提交个人资料、运行工作流、发送模型/TTS、购买、兑换、制造订单、XP或收藏写入。真实付费生成和结算未执行；VibePlan仍禁售，完整会员生命周期、市场现金购买与卖家结算未完成。此发布完成本轮导航/Hub/固定配方供应与R9，整体长期目标仍active。

安全证据与实际截图：`C:/Users/lsb/.workbuddy/ans-platform-recipe-r9-r3-20261012/`，包括 `local-safe-evidence-manifest.json`、`deployment.json`、`platform-product.json`、`platform-product-check.json`、`source-validation.json`、`backup-verification.json`、`build-verification-safe.json`、`public-runtime-verification.json`、`browser-verification.json` 及桌面/手机截图。独立审查在 `C:/Users/lsb/.workbuddy/ans-vibehub-followup-audit-20261012/`。私有env、原始ORM、备份dump与运行私有日志没有进入Git。
## 2026-10-13 03:24 Asia/Shanghai — Navigation / Hub release R3

Authorized PR55–58 are merged into main and deployed from frozen application revision `c2cc3d27ad6fe4166e99deda75a9af83cc8bd5af`. Release `/srv/ans-releases/ans-navigation-hubs-r3-20261013`; image `sha256:5b86ae2ae67c242e58eafbfc78aa412590cdd88a93bc282f46b290495ce7109f`; container `48977b942d9c3e705af760181dc4f4243d85fd40110c3e85b1976e116e3019b7`; BUILD_ID `R5_858I5t53HmR4P7m3B0`; source SHA256 `18eb04f2579131920f4bbc7b0bc801a386f80765396aca58d0c3a766213e6f06`. Environment and ports exactly retained; only reviewed mascot overlay source changed. Healthy with 78 prior applied migrations and zero production DDL. Fresh public-schema backup restored successfully in isolated PostgreSQL17, SHA256 `4f1cc7b58dc179ef26deb077b1269730c5702e719eae9a3ba9bb8175e7c00570`.

Exact frozen Linux build, app/test types, full unit checks, native voice, six boundaries and full lint passed. HTTPS verification checks 18 pages with the actual new BUILD_ID, 47 static chunks, 44 GitGlow covers and four voice files byte-for-byte against runtime. Public retired routes redirect correctly. Existing real-account credits, preserved Tooltip favorite, admin page, six desktop/mobile navigation entries, four Hub cards, fixed portfolio workflow and market version1 forms verified. Homepage author separately verified live auto/manual/pause controls at1280 and390 widths with matching deployment/build evidence. No new accounts, orders, credits, XP, model/TTS calls, purchases or redemption were created during this release verification. VibePlan is still disabled for purchase; incomplete membership writer candidates remain isolated.

First deploy attempt correctly stopped before switching production: new public voice-client.mjs had root0600 from prepare umask. Only its permission was changed to0644; bytes stayed exact, and all689 runtime assets passed before switching. Precision cache cleanup removed only two unshared/reclaimable legacy records (leaf nt3h49hc0ebn99pt2e7r4yava then parent xsir98d9cwwrhy4ntfb0yhne3), preserving every image/container/volume, private data and rollback. Docker free bytes increased251645952→2019745792.

Remaining acceptance defect discovered in actual production browser: old VibeHub `/ans/portfolio#step-2` and `#request` lose fragment across Next server redirect, both ending at default content step. The simulated effect checks did not cover the server/browser redirect. R3 navigation and runtime release passed, but legacy-anchor compatibility is explicitly NOT accepted. A separate minimal client bridge repair and independently reviewed R4 release are in progress; do not report overall completion based on this record.

Evidence: `C:/Users/lsb/.workbuddy/ans-navigation-release-20261013/` deployment/public-release/browser-verification JSON, independent reviews, permission and precise cache cleanup evidence, desktop/mobile/account screenshots and legacy-fragment-production-failure.json. Homepage independent evidence: `C:/Users/lsb/.workbuddy/ans-home-refinement-20261013/evidence/homepage-production-*`. The overall ANS objective remains active.