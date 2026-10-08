# ADR 0003：农客松技术工作区、阶段提交和最小权限

## 状态

**P2 代码及60项迁移已部署；本届赛事尚未绑定；2026-10-08 UTC。** `ans-product-c89b31a564b6e794` 已包含个人任务、规则与权限、阶段提交/汇总、技术检查/问题、Demo、现场协作及固定技术档案。发布与只读线上复验见[权威总纲](../ANS权威产品与架构总纲.md)；这不代表真实比赛已配置、六项职责已实际履约或全部产品目标完成。规则确认/发布与真实账号授权仍各有边界；以下分阶段笔记保留历史来源，不用旧“未部署”描述覆盖当前运行事实。

仓库 [AGENTS.md](../../AGENTS.md) 要求数据库 schema 变更先确认；其余拟议扩展按确认范围实施。本记录不扩大授权，也不要求重新确认已经实施的个人任务切片。用户无需选择数据库或理解各张表。正式日期、规则和真实账号可以后补；缺失时相应正式入口保持关闭，未配置本届 ID 的个人任务服务拒绝请求。

## 目的与现状

在“比赛 → 农客松”集中管理技术规范、提交模板、统一作品与版本汇总、技术问题、决赛 Demo、技术档案，以及刘曙宾的个人任务。复用赛事、队伍、私密项目、不可变成果版本、审计和现有登录，不另建报名站或全站任务系统。

2026-10-07T05:12:27.450Z 对生产只读核对：`Competition.title contains 农客松` 返回零条；`ANS_AGRIHACKATHON_COMPETITION_ID` 未配置。查询范围不覆盖其他标题的比赛，不能据此断言数据库没有比赛。证据在本机 `C:/Users/lsb/.workbuddy/evidence/agrihackathon20261007/production-read-only.json`。未写生产数据或修改权限。

| 当前对象 | 复用 | 缺口或副作用 |
| --- | --- | --- |
| Competition | 本届赛事身份及通用介绍 | 只有一组 startsAt/endsAt，无法表达三个独立阶段 |
| TeamCompetition | 原队伍参赛关系及报名授权 | submissionVersionId 仅一个当前指针，不能充当初赛/决赛历史 |
| Project / ArtifactVersion | 私密项目及指定不可变版本 | 队伍标签不自动授权读取项目全部事实或其他版本 |
| AuditLog | 操作人、动作、版本引用及时间 | 不在普通日志或审计 metadata 写私密材料正文 |
| 旧 reviewCompetitionEntry | 原通用评审继续使用 | 会触发公开/XP；新技术检查不能调用它 |

当前页面的赛道、奖项、材料清单和日期来自历史方案，已加“本届规则与日期待确认”提示；它们不作为新服务的默认规则。首页赛事查询已改为明确 ID，缺失/无记录/查询失败均不猜届次。

## 决策与范围

维持现有模块化应用和托管 PostgreSQL。新增农客松专用数据及应用服务，界面复用赛事工作台分区；通用赛事行为保持兼容。先 P1 提交与协作，再 P2 Demo 与档案。除下述四个个人任务已实现模型外，P1/P2 模型与关系仍为拟议设计，不代表已有表。

关系主线：`Competition → TeamCompetition → AgriStageSubmission → ArtifactVersion → Artifact → Project`。一个队伍可以有初赛、决赛各自的提交历史；统一汇总、技术检查、问题、任务和档案引用同一提交 ID。正式提交只读取已选择版本，不复制项目全部事实。

## 个人任务切片：本地实现与验证

本地入口为 `/competitions/agrihackathon/tasks`，列表及 strict 命令 API 为 `/api/competitions/agrihackathon/tasks`，详情 API 为其 `/{id}`。实现位于 `src/contracts/agri-tasks.ts`、`src/server/competitions/agrihackathon/tasks.ts`、`src/components/competitions/agri-timetable.tsx` 和 `agri-task-recovery.tsx`；全局 Providers 加入 `AgriTaskSessionBoundary`。未配置本届 ID 时拒绝请求，不自动创建生产赛事、日期或授权。

`prisma/schema.prisma` 与 `prisma/migrations/20261007230000_agri_personal_timetable/migration.sql` 已包含以下模型：

| 已实现模型 | 实际字段及约束 | 职责 |
| --- | --- | --- |
| AgriPersonalTask | competitionId/ownerId 外键、templateKey?、title、stage、status、priority、dueState/dueAt?、acceptanceCriteria、collaborationNotes?、inputRequirements Json、blockingInput Json?、completionResult?、completedById?/completedAt?、revision、createdAt/updatedAt；唯一 ownerId+competitionId+templateKey、id+competitionId；索引 ownerId+competitionId+status+dueAt | 私密个人任务；没有 submissionId、issueId、projectId 或 artifactVersionId，不能据此返回关联作品 |
| AgriTaskEvent | taskId、actorId 外键、revision、action、snapshot Json、createdAt；唯一 taskId+revision | 不可变任务历史，分享事件记录接收者、到期时间及前次分享状态 |
| AgriTaskShare | taskId、userId、sharedById 外键、sharedAt、revokedAt?、expiresAt?、revision；唯一 taskId+userId；索引 userId+revokedAt+expiresAt | 显式只读分享，每次读取重新检查撤回、到期和账号状态 |
| AgriTaskCommandReceipt | competitionId、actorId、operation、idempotencyKey、requestHash、taskId?、appliedRevision?、createdTaskCount?、createdAt；唯一 competitionId+actorId+operation+idempotencyKey；taskId+competitionId 复合外键 | 与变更同事务的不可变回执，保存已应用版本或初始化数量；不同于下述拟议阶段命令回执 |

迁移 CHECK 覆盖日期、完成字段、阻塞/输入 Json 与回执；触发器保护任务身份和 revision、事件/回执不可变、分享不可删除及 revision，以及事件/分享/回执的任务所有者权限。服务按用户行、任务行锁定并重新检查账号和权限；回执先查再检测 revision，任务变更、事件和回执同事务。模板由用户明确点击初始化，六个稳定键去重，不默认日期或完成。列表支持游标分页。所有者私密读写，分享只读投影不包含所有者历史及分享名单；全站 ADMIN 无隐私穿透权限，协作说明不授予访问。

隔离 PostgreSQL 已从零成功执行仓库 52 项迁移（含历史迁移，不是 52 项个人任务迁移）；后续复用同一隔离库重验迁移，不将重验记为再次从零。个人任务最新筛选增量已本地实现：界面按“可见范围 / 阶段”请求服务端，数据库先执行权限和筛选再分页，切换筛选丢弃旧响应并重新分页，提供筛选空态。相关 6 文件 / 58 项测试、15 项服务集成及 1 项 fresh Node 持久读回通过；501 条可见任务验证全部/我的/他人分享与阶段组合不会被 500 条页限制截断。真实 Next + Credentials/CSRF + PostgreSQL 的 15 项 HTTP 检查重验通过，包含筛选参数、权限及进程重启恢复。新隔离构建 `.next-agri-tasks/BUILD_ID` 为 `AQzsfbPQcAVlhmYTxQPgr`，构建及其 TypeScript 检查退出 0；筛选文件与验收脚本 ESLint 退出 0，修复本轮新增的 cleanup ref warning 后组件复查零 warning。完整 P1/P2 与六项技术交付仍未完成，未生产迁移或部署。新报告位于 `.workbuddy/evidence/agri-tasks/`。

浏览器证据分开记录：旧 `ed4bpgBINNZxTWmyYBuKQ` 构建已通过真实 Credentials 页面登录、新建保存、修改阶段/状态、整页刷新回读和两条历史显示；其后旧 tab 7 触发离开未保存页面的原生确认框，工具恢复及关闭均在 focus emulation 超时。新构建仅完成匿名任务入口与登录边界观察及截图；tab 8 可读 DOM/导航/截图，但点击未完成登录，不能据此宣称新筛选的登录态浏览器、手机、换号只读分享或草稿取消/恢复通过。旧 tab 7 的临时 Network 阻断规则仍局限该 tab，因同一阻塞尚未重置。详见 `browser-status.json` 与 `browser-latest-login-gate.jpg`。这不推翻已通过的服务及 HTTP 检查，也不构成完整浏览器验收。

本轮恢复修复保留未知响应后的原命令和幂等键，即使重试返回 429 也不推断原请求未提交；回执查询后的明确版本冲突释放 pending 并显式读取最新版。`inFlight`/`initializing` 在 await 前设置，阻止同步重复写；`x-ans-task-actor` 比对当前会话，旧账号意图返回冲突。列表、打开、初始化、重载、变更及后续读取的 catch 先检查实例存活，六项迟到错误测试已补齐；卸载后的成功响应也不清除恢复记录，不覆盖新实例。恢复 Map 仅当前 tab 内存按 actor+competitionId 隔离，同账号重挂载沿用原 key 并通过回执去重，换号/注销清除；不使用 localStorage、URL 或共享服务端缓存，不承诺整页重载/关 tab 恢复。未保存导航和 beforeunload 有确认，pending 不能直接关闭丢失 key；写确认后的详情读取失败保留保存确认、显示 staleDetail 并独立刷新，不重复 POST 或覆盖未保存输入。

## P1 数据方案（其余能力与关联扩展仍拟议）

所有新 ID 为 cuid/String；外键默认 Restrict，避免删除赛事、队伍或成果时无声级联抹去比赛历史。时间列用 `timestamptz(3)`，数据库保存瞬间，赛事界面明确按 Asia/Shanghai 展示。若现有外键级联会与 Restrict 冲突，删除服务返回明确阻断，不自动移除历史。

| 模型 | 主要字段及约束 | 索引与职责 |
| --- | --- | --- |
| AgriWorkspace | competitionId 唯一外键；enabled=false；draftRevision Int；rulesDraft Json；confirmedRuleVersionId?；publishedRuleVersionId?；updatedById/updatedAt | 一届一份设置；草稿 Json 仅存带 schemaVersion 的规范内容/字段要求，不存授权和提交状态 |
| AgriRuleVersion | competitionId、version Int、requirements Json、guidanceMarkdown、confirmedById/confirmedAt、createdAt；唯一 competitionId+version | 确认时形成不可变规范快照；公开指针必须指向同届已确认版本，确认不自动发布 |
| AgriStageWindow | ruleVersionId、stage(REGISTRATION/PRELIMINARY/FINAL)、state(PENDING/CONFIRMED)、opensAt?、closesAt?、includesDeadline? | 唯一 ruleVersionId+stage；CONFIRMED 要求两个时间、截止政策非空且 opensAt≤closesAt；随规范版本不可变 |
| AgriAccessGrant | competitionId、userId、scope、grantedById/grantedAt、revokedAt?、expiresAt?、revision Int | 唯一 competitionId+userId+scope；索引 userId+competitionId；一行一个明确权限，重授/撤回留审计 |
| AgriEntryStage | competitionId、teamCompetitionId、stage(PRELIMINARY/FINAL)、draftRevision、draftMaterials Json、draftArtifactVersionId?、currentSubmissionId?、frozenSubmissionId?、updatedById/updatedAt | 唯一 teamCompetitionId+stage；同届复合外键；草稿 CAS，正式提交与冻结指针只能指向本行的历史记录 |
| AgriStageSubmission | competitionId、entryStageId、sequence、projectId、artifactVersionId、ruleVersionId、submittedById/submittedAt、repositoryUrl?、repositoryRef?、demoUrl?、materials Json、supersedesId?、correctionPermitId? | 唯一 entryStageId+sequence；索引 competitionId+submittedAt；不可变；材料是有界、版本化快照，不是任意业务状态袋 |
| AgriCorrectionPermit | competitionId、entryStageId、previousSubmissionId、allowedFields Json、reason、authorizedById/authorizedAt、expiresAt、usedBySubmissionId?、revokedAt? | 授权一次更正；usedBySubmissionId 唯一；只允许精确旧版本/字段和期限，不能作为不限次数的补交通行证 |
| AgriTechnicalCheck | competitionId、submissionId、checkedById/checkedAt、result(PASS/NEEDS_ACTION/UNREACHABLE)、checklist Json、internalNote? | 索引 submissionId+checkedAt；每次检查追加，不变更原审核/公开/奖励；检查本身默认内部可见 |
| AgriCheckFeedbackEvent | competitionId、checkId、sequence、action(PUBLISH/WITHDRAW)、body?、actorId/createdAt | 唯一 checkId+sequence；追加发布/撤回事件；PUBLISH 必须有经过核对的队伍反馈，WITHDRAW 不带正文；独立于不可变检查 |
| AgriIssue | competitionId、submissionId、title、status、priority、assigneeId?、dueState、dueAt?、visibility(TEAM/INTERNAL)、revision、createdById/createdAt、updatedAt | 索引 competitionId+status+dueAt、assigneeId+status；问题至少关联具体提交，不只绑定队伍名称 |
| AgriIssueEvent | issueId、actorId/createdAt、type、body?、beforeState?/afterState?、visibility(TEAM/INTERNAL) | 索引 issueId+createdAt；追加处理记录；TEAM 问题也可有 INTERNAL 事件，队伍列表不能带出内部事件 |
| AgriPersonalTask（后续关联扩展） | 上述个人任务字段已实现；submissionId?、issueId? 仍为拟议扩展，尚无这些列/外键 | 未来按具体提交/问题校验关联访问；现有 DONE 要求验收结果和记录人/时间，BLOCKED 要求缺谁的何种输入 |
| AgriTaskShare（已实现；关联权限待扩展） | taskId、userId、sharedById/sharedAt、revokedAt?、expiresAt?、revision | 唯一 taskId+userId；默认无共享，当前只读；未来关联作品/问题仍须逐对象授权，协作方文字不授予访问 |
| AgriCommandReceipt（阶段命令拟议） | competitionId、actorId、operation、idempotencyKey、requestHash、resourceId、createdAt | 尚未建表；与已实现 AgriTaskCommandReceipt 区分；拟与阶段变更同事务，不存私密原始请求，相同请求返回原记录，不同返回冲突 |

补充约束：所有跨对象关系在数据库用同届复合唯一键/外键保护，在服务里再校验项目、作品版本与队伍关系。`currentSubmissionId` / `frozenSubmissionId` 通过 entryStageId+submissionId 复合外键限定归属，允许先插入无指针的阶段行，再在同一事务插入提交并推进指针。禁止循环 ON DELETE CASCADE。

规范版本、窗口、正式提交、技术检查、反馈事件和问题事件使用数据库触发器拒绝改写/删除，保留受控数据治理操作的独立评审流程。规范变更追加新版本，不改写已采用的规范。CHECK 约束覆盖日期组合、任务完成字段、更正原因和反馈事件动作/正文组合；实体外键不塞 JSON。任务 inputRequirements 是有界输入要求清单，每项包含提供方说明、所需内容和 UNKNOWN/TENTATIVE/CONFIRMED 最晚输入时间，未阻塞时也可记录；协作说明不代替 AgriTaskShare 授权。Json 仅用于因材料/检查项不同而变化的有界清单，读取和写入都按 schemaVersion 校验。

## 提交、截止、冻结与更正（拟议，尚未实现）

1. 保存草稿只改变 AgriEntryStage，使用 expectedRevision；冲突返回 409，保留浏览器输入。提交人由当前会话确定，确认人/时间/操作者不得从客户端直接采信。
2. 正式提交在一个事务内按统一顺序锁定 workspace、授权账号/授权行、TeamCompetition、EntryStage。撤回授权、规范生效、更正和截止冻结使用相同顺序，锁后重新检查账号状态、队内 OWNER/ADMIN、目标版本归属及规则。不能依靠页面按钮禁用。
3. **受理时间在取得相关锁后由数据库 clock_timestamp() 获取**，不要用事务开始时间或客户端时间。客户端点击时间不构成截止前受理；排队到截止之后的请求按已确认窗口判定。
4. 输入和材料按固定 ruleVersionId 校验；未确认/未发布/工作区关闭不接收正式提交。打开时间包含；截止瞬间是否包含由 includesDeadline 明确规定，无默认猜测。报名、初赛、决赛各用自己的窗口，不复用 Competition 的一组日期。
5. 正常窗口内每次提交追加 sequence 并推进本阶段 currentSubmissionId，旧版本保留。重复请求用 receipt 返回原提交；同幂等键不同内容返回 409；并发不同键加锁后逐个判定，不覆盖已有版本。
6. 到截止时冻结本阶段最后一次合法受理记录。读取时可根据受理时间和规则判定冻结，即使后台定时器未运行也不能再提交；持久化 frozenSubmissionId 在下一次受保护事务或获授权冻结操作完成。规则改期不能默默解冻，必须追加规范和明确重新开放事件。
7. 截止后更正必须有单次 AgriCorrectionPermit：准确旧提交、原因、允许字段、授权人和期限。消费 permit 与新提交原子发生，记录 supersedesId 和前后版本；初赛原冻结指针不改写，另外展示获准更正链。没有批准的补交政策时拒绝补交。
8. 决赛使用另一 EntryStage 和规范窗口，初赛记录仍可读。晋级资格从获确认的运营记录/名单接入，技术检查不推断晋级；接入方式在真实规则确认后落地；在可核验的资格来源接好以前，决赛正式提交保持关闭。
9. 技术检查、问题和任务的写服务不调用 reviewCompetitionEntry，不写 entryStatus、publicConsent、ArtifactPublication、XP 或额度账本。公开作品仍走现有明确版本授权与审核规则。

## 完整工作区服务端权限与字段投影（拟议；个人任务边界见上）

授权按真实 userId+competitionId+scope 读取，账号 flagged/deletedAt、撤回、到期和服务端时间均在每次请求核对。全站 ADMIN 不自动穿透农客松私密记录，昵称/姓名不参与授权。ACCESS_MANAGE 不表示拥有全部 scope：站内只能向他人委派自己当前仍有效且可委派的权限，期限不超过自身授权；不能自行延长权限或获得未持有的 scope。ACCESS_MANAGE 本身的首次授予及扩权走经用户确认的受控配置，不能由普通委派接口产生。首次 ACCESS_MANAGE 授权由经用户确认的本届账号在受控配置步骤建立并留审计，不开放“任意管理员自助获取权限”。

| 视图/操作 | 必要条件 | 输出边界 |
| --- | --- | --- |
| 公开指南 | publishedRuleVersionId 有效 | 仅确认且明确发布的规范，无内部备注或私密材料 |
| 本队记录 | 活跃本队成员；写/正式提交要求 OWNER/ADMIN | 本队指定提交和当前有效 PUBLISH 事件的队伍反馈；不能沿 projectId 读取别人私密项目 |
| 内部作品汇总 | WORKS_READ | 队伍标识、阶段、提交时间、版本、检查状态；默认不带私密仓库/Demo/附件正文 |
| 私有材料/下载 | WORKS_READ + PRIVATE_MATERIALS_READ | 按目标提交逐对象授权；不得通过搜索、导出、预取或临时链接绕过 |
| 技术检查/反馈 | WORKS_READ + TECHNICAL_WRITE；操作私密材料另加 PRIVATE_MATERIALS_READ | 内部备注读写额外需要 INTERNAL_NOTES_READ；向队伍发布/撤回追加反馈事件，不修改检查；队伍查询只投影最后一个事件仍为 PUBLISH 的反馈 |
| 问题读写 | WORKS_READ + ISSUES_WRITE；INTERNAL 内容额外需要 INTERNAL_NOTES_READ | issue 和 event 分别过滤可见性；内部转队伍可见须明确核对标题/正文，不自动公开旧内部事件；不会把内部处理摘要混进队伍反馈 |
| Demo 检查 | WORKS_READ + DEMO_WRITE；私有材料额外校验 | 只看到获准演示信息与检查材料 |
| 现场设备/待办 | ONSITE_READ | 仅获分享的队伍显示名、演示条件、设备/时段、备用方案摘要，不含联系方式/私有仓库/全量问题 |
| 技术档案 | WORKS_READ + ARCHIVE_WRITE；受限来源逐项校验 | 权限不会因为“归档”扩大；公开版仍要准确作品版本授权 |
| 导出 | EXPORT + 对应读取权限 | 用同一投影；生成时和下载时重验，标注来源/版本/生成时间；链接短期有效且不公开缓存 |
| 规则确认/发布 | RULES_CONFIRM | 两个独立显式操作；发布时间、版本、操作者留审计；正式规则和开报仍须本次授权 |
| 管理授权 | ACCESS_MANAGE | 仅管理本届且留审计，不修改全站角色 |
| 个人任务 | ownerId=当前用户；或仍有效的只读 AgriTaskShare | 赛事管理权限不自动读取；共享不能暴露关联作品/问题超出被共享者权限的内容 |

刘曙宾、于闻博、曹月、彭坤鹏为职责说明，**不是已创建的授权名单**。刘的候选范围为技术、问题、Demo、档案；于读取同一作品基础记录，私密材料及备注按实际需要另授；曹只取得现场必要信息；Mentor 不默认有私密作品访问。真实账号、总负责人及最终 scopes 由用户确认。

页面、列表、详情、统计、写入、附件下载和导出均调用同一服务权限入口；客户端不获取 grant 全表或完整 Prisma 记录后自行筛选。没有权限的对象按一致 404/403 策略拒绝，日志仅记固定错误码/对象 ID，不记输入、材料正文、邮箱或仓库凭据。

## P2 扩展（不在 P1 提前迁移）

| 模型 | 字段与约束 |
| --- | --- |
| AgriDemoCheck | competitionId、submissionId、checkedById/checkedAt、result、environment Json、checklist Json、backupMaterialRefs Json、rechecksSubmissionId?；追加且关联确切版本 |
| AgriOnsiteItem | competitionId、demoCheckId?、队伍显示信息、设备/时段/条件、公开给现场协作的摘要、状态、ownerId、revision；ONSITE_READ 仅该投影，内部问题另存原 Issue |
| AgriTechnicalArchive / AgriTechnicalArchiveVersion | 每队一档案容器与不可变版本；competitionId+teamCompetitionId 唯一；阶段提交、Demo、问题引用、材料清单、createdBy/At、audience；currentVersion CAS；来源权限与公开授权每次读取重验 |

P2 不复制仓库或自行抓取 URL；记录 repositoryUrl/ref 只表示定位，不等于仓库备份。Demo 可访问检查有实际 checkedAt、设备和结果，不把合法 URL 当成“可运行”。材料首版引用现有获授权存储/链接，不新增上传供应商或依赖；私有链接不得进入公开页面或普通日志，不接受含密码/Token 的 URL。自动巡检、通知、日历、多评委评分和排行另行评估。

## API 与界面安排

农客松首页已有待确认提示，个人任务页已具备真实持久读写、阶段与可见范围筛选、历史、分享和恢复。完整工作台仍拟添加“本队提交 / 作品管理 / 我的任务 / Demo 与档案”；阶段表单步骤为“选定作品版本 → 填材料 → 核对规范与截止 → 明确提交 → 读回记录”。管理侧先作品汇总，再展开版本、检查、问题和关联任务；按本周、待输入、未定日期分组仍为后续界面方案，现有完成操作已要求验收结果。

`src/contracts/agri-tasks.ts` 的 strict 写命令已接入个人任务 API 和持久化服务，任务日期派生规则已使用 `src/domain/competitions/agrihackathon.ts`；ownerId、completedById/completedAt 由服务确定。`src/contracts/agrihackathon.ts` 的完整工作区授权/阶段窗口等仍为候选契约和纯规则，尚未接入对应真实写服务。独立阶段命令已在 `src/contracts/agri-submissions.ts` 本地准备，覆盖草稿、正式提交、指定旧版本更正、技术检查和反馈发布/撤回；不接收客户端操作者、确认人、受理时间、公开状态或 XP 指令。

**2026-10-07 阶段规则准备增量（未接入持久化）**：`src/domain/competitions/agri-submissions.ts` 已提供版本 / 届次 / 阶段 / 截止与冻结判断、单次更正许可字段及期限检查、有界材料要求校验、队伍反馈最小投影。材料要求必须来自明确规范版本，不猜测仓库、ref、Demo 或材料的必填默认值；错误只返回固定代码与材料键，不返回正文或 URL。反馈读取要求调用方取得包含撤回的最新事件，撤回投影为 null。纯规则不提供真实鉴权、数据库锁、原子幂等、更正许可消费、版本所有权或 URL 可访问性检查；决赛资格来源仍须实际接入，未接入时入口保持关闭。相关六文件 118 项测试、四文件 ESLint、全仓分层与 TypeScript 检查通过；本轮没有 schema / migration / route / service 变更、生产操作或模型调用。类型检查结果单独记录于 `.workbuddy/evidence/agri-tasks/submission-contracts-typecheck.log`，其余证据与汇总位于同目录 `submission-contracts-*`。

服务放在 `src/server/competitions/agrihackathon/`。Route Handler 只做会话/同源/限流/strict 契约和响应映射，页面不访问 Prisma。写操作接受 idempotencyKey/expectedRevision，不接受由用户伪造的角色/提交时间。新文字使用 i18n，不改变全局 UTC 展示配置。

## 兼容、迁移和回退

1. 个人任务切片已有上述四模型/迁移及隔离 PostgreSQL 52 项从零迁移证据；尚未完成从当前生产备份恢复的升级演练，不能将从零成功当成既有数据保持验证。其余 P1 扩展按确认范围新增表、约束和关系，再分别完成从零及恢复升级演练，核对原表行数/内容摘要。不得 db push 到生产。
2. 不自动创建生产赛事、正式日期或真实授权。不按标题回填，不把旧单指针推测成初赛或决赛；如有旧数据，先生成只读映射报告，按已确认的真实届次/阶段导入历史记录，标记 imported/provenance 并保留原提交时间来源。
3. 旧 TeamCompetition 指针和旧通用赛事接口不双写农客松阶段历史。确认农客松工作区启用后，旧提交/审核写入口对该届显式拒绝并引导新入口；其他赛事继续走原路径。旧公开作品只读仍经原授权判断。
4. 拟议完整工作区 AgriWorkspace 首版 enabled=false；该模型尚未建立，个人任务切片没有 enabled 列，依赖明确本届 ID 和会话权限。生产另按发布方案进行备份、恢复、精确镜像演练和明确授权。新增表/索引不批量重写旧列；外键/不可变触发器在演练覆盖删除和错误路径。
5. 应用回退时先关闭本届新写入，不删除新历史；回退旧版本不得恢复旧农客松写路径。若旧镜像不含该保护，使用维护路由阻止本届所有写请求并先演练。数据恢复是最后措施，不当成一条随意执行的 down migration。
6. P2 独立迁移/演练；没有 P1 验收和 P2 确认就不提前改表。无新增依赖、认证流程或 prompts.config.ts 结构变更。

## 完整工作台仍需通过的验收

- 队伍 A 提交指定版本，刘/于读同一提交，记录技术反馈/问题，A 只读到显式公开给队伍的内容；任务可回到原作品。
- B、未授权账号、封禁账号、被撤回/到期授权无法通过列表/详情/API/下载/导出读 A 私密材料；共享任务不能绕过关联对象权限。
- 截止前/瞬间/后一毫秒、锁等待跨截止、两阶段并行、重复/冲突幂等请求、不同键并发与单次更正消费均符合确认规则。
- PASS 技术检查前后 entryStatus、publicConsent、作品公开状态、XP 和账本完全不变。
- 初赛冻结、决赛迭代、更正链、规范变更、反馈发布/撤回和档案读取都可追溯，不改写历史；反馈撤回后队伍列表/详情/导出立即不再返回正文，内部审计历史保留。
- 私人任务未知/暂定日期不算正式逾期；延期留事件/审计；DONE 有实际验收结果，失败/刷新/并发不丢输入。
- 手机/桌面、键盘、无赛事/无数据/无权限/保存失败均可理解；生产验收与本地模拟分开记。

个人任务切片本地持久化已实现，已有上述 58 项测试、15 项服务集成、1 项 fresh Node 读回和 15 项真实认证 HTTP 检查证据；新构建登录态浏览器仍被旧标签页原生确认框影响，不能记录为通过。完整六项技术交付、阶段提交/检查/问题/Demo/档案及任务关联作品仍未完成，整体 P1/P2 保持提议待实施。真实账号绑定、生产迁移和部署均未完成；完整工作台以真实授权与可读回的完整链路验收，不能用前端假数据宣布交付。

## 2026-10-08 实施状态补充（优先于历史拟议措辞）

阶段规则与授权foundation为本地53项迁移，阶段提交为54项；正式提交持久化、截止/冻结与拒绝旧通用写路径已实现，获准更正与真实决赛资格来源仍关闭。汇总搜索/筛选/详情及完整范围CSV已接入服务；144相关测试和19实际认证HTTP检查通过。浏览器补齐队长草稿刷新读回、离开取消、队员只读、工作人员私密分层、键盘及手机axe0。浏览器CSV落盘未核对，接口下载内容/头已通过。记录 `.workbuddy/evidence/agri-submissions/browser.json`。

本地55项迁移 `agri_technical_reviews` 新增检查、反馈事件及review回执：检查引用准确submission+entryStage+competition复合外键，由提交关联ANS版本；METADATA检查不能读取私密材料，PRIVATE_MATERIALS写/读另需权限，内部备注再需INTERNAL_NOTES_READ。团队投影只含结论、版本、检查时间和最新仍PUBLISH的明确队伍反馈，撤回立即消除正文；旧发布事件保持不可变。查/写逐次重新核对账号、有效scope与数据库时间；没有ADMIN旁路。检查、反馈及回执同事务、原幂等键恢复，反馈CAS序列受数据库触发器保护。检查无晋级、publicConsent、Publication、XP/Quota副作用。

接口 `/api/competitions/agrihackathon/reviews` POST、`/{submissionId}` GET。界面从内部作品汇总当前或历史提交打开检查，本队当前提交查看反馈。已通过14服务集成、fresh Node读回及98相关unit；实际HTTP/浏览器验收仍在继续，不将本地证据计为生产。新增表只在隔离PostgreSQL，生产仍52项；问题/任务关联与P2仍须实施。

## 2026-10-08 问题与共同离开保护的本地验收

本地第 56 项迁移 `20261008030000_agri_technical_issues` 已冻结并通过隔离 PostgreSQL：issue/event/receipt、独立可见范围、CAS、同键原请求恢复与权限撤回复核。SQL SHA-256 `f1d026f005f35b040bf59bed4e58040936b7e6912a235d9d9d6c070c48cf6744`。49 项 contract/API/组件、20 项真实服务集成与 fresh Node 读回通过，证据 `.workbuddy/evidence/agri-issues/`。17 语言产品字典已接入；中文使用中文文本，其余使用明确英文 fallback。

Reviews、Submissions、Issues 和 Toonflow 共同使用多 guard 导航保护，保存/确认期间目的地不能被后续点击替换；取消、卸载和单次回调均经过测试。整合后全量 1946 项测试、lint、types、build、boundary、docs 均通过；实际 HTTP 29 项及新构建浏览器 9 项通过，后者验证双编辑输入取消/恢复、中文保存和事件读回、内部转本队可见重新审核、成员/有限 staff 隔离及桌面手机 axe0。证据 `.workbuddy/evidence/agri-reviews/browser-final.json`。CSV 在浏览器的 HTTP200/type/675bytes 完成已观察，本机下载路径尚未核验。

生产仍 3277 / 52 migrations。以上为本地 P1 提交、检查和问题增量，不能计为 P2 或六项全部完成；任务关联、Demo、现场和档案仍须实现。待精确镜像、当前备份与 52→56 隔离恢复演练收口后发布本增量。本届账号、日程和规则保持未确认，不猜测授权和正式开报。


## 2026-10-08 P1 增量生产发布（优先于上述本地状态）

用户原文“确认 都允许跟授权 不需要问我的”已用于本轮源码/镜像绑定的迁移与发布。`ans-product-8f59c308bf7c484e` 于2026-10-08 14:49:55（北京时间）上线；53–56四项SQL已生产应用，56完整checksum、health200、database connected及exact BUILD_ID通过。当前备份恢复及52→56精确镜像演练通过，79既有业务表原列counts/digests保持一致。生产16页桌面/手机公开读取检查、已有会话的配置关闭态与匿名私密接口拒绝均通过；不将隔离fixture计为生产正式提交或真实账号范围验收。

本届competitionId、正式规则/日程和人员scopes仍为空；没有创建生产赛事或按姓名授予权限。任务实体关联与P2 Demo/现场/档案仍未实现，更正和正式决赛资格来源保持关闭。保留SQL字节与回滚/备份，临时预览已清理。本轮发布证据为 `.workbuddy/evidence/releases/ans-product-8f59c308bf7c484e/`；1946业务测试实际源与18字节CSS ancestry复用均有标注，另做新Linux构建和新16页候选验收。完整六项交付仍在推进。


### 2026-10-08 任务关联增量验收（本地候选，尚未部署）

时间表已实现正式提交版本、具体技术问题的关联与移除，独立关系记录保留历史；每项任务最多十条生效关联。关联、任务 revision、事件、幂等回执及审计同事务提交。共享任务每次独立核对目标权限，不开放作品、内部记录或私有材料；无权的共享接收人看不到目标 ID 或关联存在。本人失去目标权限后仅保留匿名移除入口。关联历史不保存目标标题或正文。精确记录页直接打开对应问题；有 WORKS_READ 的工作人员可按原材料/可见范围查看，编辑仍须 ISSUES_WRITE。

真实隔离 PostgreSQL r2 的十四项集成及一次全新进程回读通过，包括并发同键/不同键 CAS、十条上限、撤权脱敏和事务内到期回滚。真实 Next Credentials/CSRF 的十项 HTTP 检查通过，包含应用进程重启后回读和回执恢复。获准浏览器以两个合成账号执行选择、关联、精确记录、手机返回、移除、退出及只读查看；四项桌面/手机页面 axe 零违规、无横向溢出。全仓 145 文件 / 1959 测试、全仓 lint、应用类型、脚本类型、边界与 Next 生产构建通过；lint 有存量 warning。所有账号、赛事、问题和提交为本地 fixture；未向生产写入业务样例，未调用真实供应商或资金。

第57项 SQL `20261008040000_agri_task_references` 已冻结，SHA-256 `5908bcbde895f924afa9aed3b08fa37697e434d52f6aba89ee9ebb3411e751d4`。首轮 r1 测试属于日期 CHECK 修正前的候选；修正后在全新 r2 数据库重新从零应用57项迁移，未重写 r1 checksum 或历史证据。第一次 HTTP 验收因检查脚本使用错误问题详情路径失败，已保留失败报告，修正为实际 `/issues/item/` 后重验通过。证据位于 `.workbuddy/evidence/agri-references/`。该候选已于2026-10-08 17:26:19（北京时间）以 `ans-product-7d839f9b24bc51a0` 上线；生产57项迁移、健康和16项HTTPS只读页面验收通过。正式赛事写入、Demo、现场及档案、Toonflow内嵌和真实模型/支付仍未完成。


### 2026-10-08 任务关联增量上线

当前已上线源码快照为 `ans-product-7d839f9b24bc51a0`，镜像 `sha256:68dc3c4e0bc4e3cea10f33bd56924dfd3de02a46eb548b1cce0a44723fda3c0e`，生产 BUILD_ID `frEL95nCbNho5P0AmFG0n`。2026-10-08 17:26:19（北京时间）完成本轮授权发布：应用 healthy，health 200、database connected；57 项迁移完成、unfinished 0，全部 checksum 已核对。时间表已可关联具体正式提交或技术问题并打开对应记录，关联与移除有历史和幂等保护；共享任务每次独立核对目标权限。修复 WORKS_READ 工作人员的问题读取及精确问题路由编辑状态。生产本届赛事、规则与账号权限仍未绑定，正式提交保持关闭；P2 Demo、现场及档案仍待补齐。

精确 Linux 候选空隔离 PostgreSQL 的16项桌面/手机页面检查通过；真实 HTTPS 生产使用已有登录会话另做16项只读页面检查，实际Document HTTP200、axe零违规、无文档横向溢出。匿名HTTP健康及7个私密读取/导出接口边界均通过。本轮保留候选axe表达式失败、生产缺失Document与导航/批量超时记录，恢复后独立复验，不描述为首次全部成功。隔离任务关联服务14项与全新进程1项、真实 Next Credentials/CSRF 10项、当前业务源码全仓145文件/1959测试及lint/types/script-types/boundaries/docs/build通过；lint保留213项存量warning。生产读取不含正式赛事业务写入、真实模型、支付或 iframe 验收。

本版一致备份 SHA-256 `0f339824406db292bdf6ec94d56928d7814b1a06460726c415920f7e7ae0f360`，97张public表恢复通过。恢复发现17项 PostgreSQL varchar/text渲染差异，逐项在隔离数据库重新解析CHECK比较，精确匹配并保留首次失败，不宽泛忽略约束差异。精确镜像56→57演练确认96张既有业务表原列行数/内容摘要不变，新任务关联表为空；生产先增量迁移，旧健康应用继续服务，之后替换镜像。自有隔离预览容器、网络、空临时PG目录与3159隧道已清理；生产、备份和当前回滚镜像保留。证据位于 `.workbuddy/evidence/releases/ans-product-7d839f9b24bc51a0/`。历史审计仅证明其问题范围，完整产品目标继续 active。

## 2026-10-08 e37 production status

This ADR records production release `ans-product-e37c465603270fa1`, deployed at `2026-10-08T18:06:44.406420+00:00Z`, with Linux BUILD_ID `GgUFsIX68BdfT86LECCpj`; all 60 migrations finished. Post-release evidence records the 60-to-60 no-op check, preservation of schema and existing data across 107 public tables, six deferred guards, and three function definitions. The backup SHA-256 is `0df818a52807b29e297fe2030c69f3ad3482219618bedebce010e4c346fa5a47`.

Production page and onsite targeted-message acceptance are recorded. Formal competition submission and Toonflow production embed remain disabled; e37 parent transfer is incomplete. c89/9c68 recovery evidence cannot replace e37 preview or production-embed acceptance.
