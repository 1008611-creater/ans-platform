# 农客松私有外部证据：配置、恢复与发布门

本模块保存原始文件字节，不执行、解压、转码参赛项目。对象留存、来源真实性和截止核验是三个不同事实。`STORED` 仅表示原样字节已落盘、读回哈希一致。Demo 抓取只包含主 HTTP 响应，GitHub tar 只包含代码树，不含 Git 历史、LFS 实体或子模块目标内容。人工核验有独立操作者、时间和理由事件，不改原对象。

## 默认关闭与授权

`ANS_AGRI_EVIDENCE_ENABLED` 默认关闭；只有精确值 `true` 接收新任务/上传/claim/正式绑定/finalize。关闭后带 evidence handle 的正式提交事务整体拒绝、保留原预上传或固定引用；不带 evidence 的正常提交继续可用。关闭不删除数据库、对象、清单或 v3 档案，获授权读取仍可用。`ANS_AGRI_EVIDENCE_WORKER_DISABLED=true` 只停独立归档 worker，不影响其他工作流。

队伍只有本届 ACTIVE OWNER/ADMIN 能准备自己的精确项目版本，普通本队成员可读。预上传和预解析 handle 均 24 小时有效；正式提交在同一数据库事务按本队、操作者、项目、artifactVersion、原仓库 URL/ref 精确绑定。GitHub 预解析由受控队列取得 SHA、服务器 resolvedAt 和响应证明哈希，进入 `RESOLVED`，没有原始字节也没有成功对象。解析 provenance 由数据库保护为首次写后不可变。正式提交采用 handle 后进入 `QUEUED`，仅抓固定 SHA；TAG 再移动不会改变已采用目标。正式 submission 保留原始 TAG，不无痕改写旧记录。过期、撤权、解析失败、跨队或跨版本不能采用；绑定后 handle 的期限不再限制已正式接受的字节抓取。正式提交后队伍仅在已确认窗口截止前补资料；截止后技术负责人须 WORKS_READ + PRIVATE_MATERIALS_READ + ARCHIVE_WRITE，不默认开放队伍。全站 ADMIN、EXPORT 或任务共享不会授予外部文件权限。人工截止核验还须 INTERNAL_NOTES_READ；固定清单/档案沿用 ONSITE_READ。两项能力分别投影，内部理由不返回队伍。汇总列表仅展示当前正式提交的数量和晚留存状态，不含来源 URL、对象 Key 或内部理由。

## 持久存储配置

所有环境变量仅由服务端读取。生产密钥不能进版本库、命令参数、报告或客户端。

- `ANS_AGRI_EVIDENCE_STORAGE_MODE=local_private`：独立持久卷，`ANS_AGRI_EVIDENCE_LOCAL_DIR` 为绝对路径，显式 `ANS_AGRI_EVIDENCE_LOCAL_DURABLE=true`。Linux 目录属当前服务 uid、0700，文件0600；拒 symlink、根文件系统、overlay/tmpfs/ramfs，不能指向 public/视觉目录。应先核验真实 mount、归属、容量与备份策略，再决定宿主机及容器挂载路径。当前代码不自动创建生产卷。
- `ANS_AGRI_EVIDENCE_STORAGE_MODE=s3_private`：专用私有 bucket；配置 `ANS_AGRI_EVIDENCE_S3_BUCKET`、`ANS_AGRI_EVIDENCE_S3_REGION`、可选 `ANS_AGRI_EVIDENCE_S3_ENDPOINT`，以及服务端 `ANS_AGRI_EVIDENCE_S3_ACCESS_KEY_ID` / `ANS_AGRI_EVIDENCE_S3_SECRET_ACCESS_KEY`。必须支持 ACL、BucketPolicyStatus、四项 PublicAccessBlock、BucketVersioning 查询以证明私有；兼容服务不支持即拒绝写入。首版只允许未开启/未暂停版本管理的独立 bucket，避免无法追踪的旧版本及 delete-marker 假清理。既有 S3 SDK，不新增供应商包。

namespace 为 `agri-evidence/v1/{edition}/{request}/{object}.bin`，永不交给客户端作为公开 URL。S3 条件 complete 首次写，不加 public-read；local 临时文件 fsync 后硬链接首次发布，已存在对象不覆盖。对象保存 backend 与 namespaceVersion，切换新写 backend 不改变旧对象位置。更换同 backend 的目录/bucket 前必须迁移全部对象并读回哈希，不能仅修改 env。未完成请求保留受理时 backend；写入 backend 改变时拒绝新写，但可恢复核验原 backend 已完成字节。

默认上限：仓库64MiB、视频256MiB、Demo主文档10MiB、辅助32MiB；单submission512MiB、entry1GiB、actor2GiB、edition及总量10GiB。对应变量 `ANS_AGRI_EVIDENCE_{KIND}_LIMIT_BYTES`、`ANS_AGRI_EVIDENCE_{SUBMISSION|ENTRY|ACTOR|EDITION|TOTAL}_QUOTA_BYTES`。所有值须正安全整数。单对象底层为 PostgreSQL integer，不能配置超过 2GiB；实际生产仍应保持默认限额。

local 默认预测使用率低于90%、预留后剩余5GiB；变量 `ANS_AGRI_EVIDENCE_LOCAL_MAX_USED_PERCENT` / `ANS_AGRI_EVIDENCE_LOCAL_MIN_FREE_BYTES`。数据库预算包含失败、取消与尚未绑定任务，不能仅统计成功对象。只在核对清理完成后释放 reservation。失败或失联请求未完成协调时按整份 maxBytes 保留剩余预算（实际遗留字节另体现在 statfs），不沿用已删除 partial 的旧进度。持全局预算锁和请求锁，确认精确 part/multipart 删除并读回已发布 final 后才调整进度；删除失败或占用未知会暂停/拒绝 claim。已发布未 finalize 对象保留、先核验后恢复，避免在接近阈值时重复预留同一批实际字节。

`ANS_AGRI_EVIDENCE_HTTP_HOSTS` 为逗号分隔的精确 HTTPS hostname；默认空，不接受 wildcard、IP、userinfo、query、片段、非443端口。GitHub 只匿名固定 api.github.com/codeload.github.com。每跳重验全部 DNS 答案并把实际 TCP lookup 固定到已审核 IP，TLS 验证原 host；不继承 Cookie/供应商 Key/HTTP 代理。总获取120秒，DNS/headers10秒、流idle15秒，重试最多3次；失败显示真实状态。

## 代理与上传

只为 `/api/competitions/agrihackathon/evidence/uploads/*/body` 配置大文件路径；其余API保留原有限额。建议该 location：`client_max_body_size 257m`、`proxy_request_buffering off`、`proxy_buffering off`，客户端idle约30秒、应用/代理上限不少于900秒。应用以实际流字节判限，不信 Content-Length，拒 Content-Encoding，并校验同源、会话、actor、速率与当前权限。

这只是配置建议，不是已应用的 Nginx/CDN 配置。生产开放前必须通过真实代理验收：接近上限、超限、chunked、慢流、中断/重试、容量竞争、容器重启仍在及主站其他API延迟。不能以 build 或mock推断已通过。

下载经会话鉴权和实际完整哈希预检，再二次权限检查；attachment、no-store、nosniff、sandbox。支持 File System Access 的浏览器直接串流到用户选定文件；其他浏览器使用有界单文件 Blob 回退，最大按已配置对象上限占用客户端内存。没有公开永久签名 URL，也不在本站执行 HTML/SVG。

## 持久任务与维护

claim/heartbeat/finalize 均重验账号、scope/队伍及 lease fencing。后台同一时刻最多两项；撤权队首会隔离，不拖住后续任务。预解析和绑定后的字节抓取分别最多3次尝试，BIND 事件记录阶段转换并把执行计数清零，预解析尝试仍保存在不可变事件中；失联lease恢复先检查不可变key是否已存在且字节有效，避免完整对象已写好而DB未完成时重复下载。取消/失败留独立事件。尚未绑定原文件保持私有，不进入公开列表、XP、订单、积分账本。

默认不自动删除任何文件。维护入口 `scripts/agri-evidence-maintenance.ts` 默认只返回有限 inventory，不返回存储Key。获批准的维护使用 `--apply` 且环境显式 `ANS_AGRI_EVIDENCE_MAINTENANCE_CONFIRM=retire-unbound-after-48h`：仅处理创建超过48小时、无有效lease、无成功object引用的终止任务或过期预上传；持锁核对精确namespace，删除该任务未绑定文件/part/multipart后才保存不可变清理事件与释放预算。已成功对象只清理同namespace遗留part，不删最终字节。维护错误保留reservation，不能全桶/全盘清理。S3版本bucket拒绝清理。

## 备份、恢复与回滚

数据库与原文件必须成对备份：停新受理及 worker，等在途任务停稳，导出数据库并记录固定manifest/object id、hash、size及backend的inventory；复制精确namespace原文件或使用bucket备份策略。受控恢复到隔离DB与独立对象根，逐manifest和对象校验实际字节哈希、size、外键与fixed archive hash，再批准切换。只列文件名或只恢复DB不算成功。

隔离工具 `scripts/agri-evidence-local-runner.cjs` 使用自己的loopback PostgreSQL18、随机临时密码、非55439空闲端口、明确fixture数据库与独立对象目录；不读生产env或供应商凭据。它执行fresh全部migration、实际bytes集成，并通过真实task服务创建UNKNOWN/TENTATIVE/CONFIRMED三种依赖日期的非空BLOCKED任务及事件/回执；fresh Node读取后，以标准pg_dump/pg_restore --exit-on-error恢复到第二个隔离DB与独立对象目录，再核对原字节、v1/v2/v3档案和完整任务历史。pg_ctl日志使用文件句柄，避免Windows后台PostgreSQL继承捕获管道使启动/停止检查超时。测试资料是合成fixture，不是生产参赛数据。首次失败日志保留。

增量迁移 `20261015190000_agri_evidence_reconciliation` 扩展 RESOLVED 状态和不可变解析 guard，原六表迁移 `20261015173000_agri_external_evidence` 字节/checksum 保持不变。回滚仍保留两份迁移与新 reader，不能把新增状态交给不认识它的旧 writer。 main的独立修复 `20261015210000_agri_task_restore_helpers` 为任务CHECK helper内部调用显式限定public schema，必须一并保留；否则标准恢复的空search_path会使带非空输入依赖的任务COPY失败。组合候选当前90项迁移，不改原有历史checksum。旧备份含旧helper时应按已验证的分段恢复顺序先恢复pre-data、应用准确helper修复、再恢复data/post-data并用Prisma对齐迁移记录，不改写导出SQL或放宽CHECK。

v1/v2 canonical JSON与hash不重写。v3显式选择不可变manifest，未来live补交不改变旧档案。回滚先 `ANS_AGRI_EVIDENCE_ENABLED=false` 停写，保留新schema和所有字节。**v3一旦存在，旧镜像只支持1/2的档案列表会失败；不能无条件回滚旧镜像。** 回滚应保留支持v3读取的新reader镜像，仅停新writer/worker；或先单独发布reader兼容版，再启用v3。首次默认关闭且无v3产生时旧镜像可继续读旧数据。回滚不得DROP表、删除v3或对象。

## 本地证据与生产门

本候选只实施与隔离验证。真实赛事配置、真实账号文件、实际S3、专用持久卷、真实Nginx/CDN、大文件through-proxy、真实浏览器下载/移动端与生产回滚均需要主控在正式发布阶段验收。不能制造生产报名/日期/文件填补这些门槛。独立审查、CI、main精确提交/镜像、迁移哈希、生产当前DB及对象恢复证据齐备后方能开放留存。
