# ANS 问卷与农客松模型额度 — 已确认实现需求

状态：2026-10-16，本地实现批次。未实施发放、未修改生产、未授权真实付费。既有算力验收候选与在途发布不改动。本文件只定义本批次，不另建发布状态队列。

## 背景和目标

用户要求注册账号完成问卷后获得 DeepSeek 专属额度；农客松报名问卷审核通过后获得指定 GPT/Claude 额度。算力中心展示各额度；通过 API 和个人 Key 接入外部 Agent。底层继续使用现有 APIC / New API。

## 本次范围

- REQ-001：注册问卷提交成功后，为该 ANS 账号发放一次 1000 美元额度的 deepseek-v4.1-flash；问卷由我根据用户思路设计，现先实现可版本化的用途/经验/Agent/场景问卷。新旧已注册账号均可按同一活动规则完成一次问卷；不自动批量补发。
- REQ-002：独立的农客松报名问卷与人工审核，通过后发放 GPT-5.6 Terra 300、GPT-6 Astra/GPT-6.1 Sol 200、Claude Opus 5.5 100 美元额度。Astra/Sol共用200，Claude额外100，合计600；按本人报名问卷获批账号发放，不按队伍复制。
- REQ-003：赠送额度按账号、活动、额度类别与允许模型独立记账；不直接增加可用于市场交易的通用积分。原充值换算继续为 1 元 = 1 美元额度 = 10 积分，GPT 原消费倍率 0.16 保留。赠送额度按官方美元费用1:1扣减，不应用消费倍率。
- REQ-004：算力中心展示领取条件、问卷/审核进度、总赠送/已用/预占/可用额度、适用模型、来源、有效期、消费流水；数据必须来自本人真实账本。未启用渠道不得展示为可调用。
- REQ-005：复用现有个人 API Key 创建/轮换/撤销（每账号一个当前有效 Key）；模型权限由本人可用赠送类别及路由白名单限定，余额与请求上限由统一网关执行。Key 轮换和站内/外部调用共用账号同一额度，不复制余额。OpenAI/Anthropic 两协议按已验收范围开放；本批不新增多把命名 Key 产品。
- REQ-006：New API 负责现有上游路由；赠送与付费账户的一致预占、结算、退款由唯一权威账本控制。不得把共享基础设施 Token 发给用户，不得开放绕过账号账本的直连路径。
- REQ-007：GPT-5.6 Terra 是新增接入模型，官网 ID 为 gpt-5.6-terra；其上游固定用户指定 McGrox free 分组，尚未提供该组凭据；可用性、消费倍率与 APIC 回执需独立核对，不从其他 GPT 名称推断。

## 业务规则与待确认项

- RULE-BIZ-001：美元额度是按实际 token 用量折算的预算，不承诺固定 token 数量。输入、输出、缓存、长上下文按对应费率记账，不得把保守预占价宣传为实际结算价。
- RULE-BIZ-002：一次性赠送至少受唯一 (userId, campaignId, benefitKind) 约束。问卷重交、审核重试、改名、重建 Key 不得重复送。
- RULE-BIZ-003：报名审核与赛事作品审核分开。现有 reviewCompetitionEntry 审核投稿作品，不能当报名审核触发器。
- RULE-BIZ-004：默认赠送额度优先；若本人已有该模型权益但已耗尽/到期，明确报错。显式 x-ans-funding: paid 才跳过赠送；没有该模型权益时保留原付费路径。不拆单混用赠送与付费余额。
- 已确认：GPT500 + Claude100合计600；Astra/Sol200共池；仅本人报名申请获批触发。
- 已确认：赠送美元按官方费用扣减；付费积分原消费倍率保留。
- 已确认：问卷授权设计；每笔发放到账起30天有效，不因Key重建或问卷改动续期；Terra使用McGrox free，待安全录入新组凭据，未配置不开放。
- 待确认D：旧账号完成问卷是否同样可领；农客松已审核通过的历史报名是否补发。实现不擅自批量补发。

## 权限与数据规则

- RULE-AUTH-001：本人问卷与额度仅本人/必要审核员可读。前端提交金额、审批状态、用户ID或模型白名单不能决定发放内容。
- RULE-AUTH-002：只有获授权的报名审核员可审核；审核与发放绑定持久事件和事务/可恢复幂等任务。撤销或重新审核不重复发放，已消费额度的撤销政策需明确后执行。
- RULE-DATA-001：金额采用整数微单位或精确 decimal，拒绝浮点累计；不可变政策快照区分原始APIC quota、官方美元费用、赠送美元、付费积分和采购成本。
- RULE-DATA-002：同账号的并发请求先原子预占再执行；退款回原额度来源。失败有未执行证据才释放；回执不明确保留待核对，不伪造成功、零用量或退款。
- RULE-DATA-003：问卷版本和提交时间保留；答案不进入公开模型目录或通用日志。API Key只保存散列，原始值仅在创建时安全返回，日志不记录。
- RULE-DATA-004：新问卷权益不通过原 /api/quota/claim 的无问卷公共积分领取路径绕过；旧发放和已有余额不重新计算。旧领取入口的兼容策略在实现阶段单独核对。

## 已核对代码与来源

- src/app/api/quota/claim/route.ts：现有登录公共积分池领取，无问卷条件且到账通用积分，不能直接复用为新权益。
- src/server/competitions/service.ts：registerTeamForCompetition 与作品 reviewCompetitionEntry，不能据作品审批推定报名问卷已获批。
- src/server/competitions/agrihackathon/registration.ts：报名窗口与赛事版本约束，须保留。
- src/server/integrations/codex-gateway.ts：现有账号 Key鉴权、预占、APIC权威回执、幂等与迟到恢复，应增量接入额度来源，不能再实现一套独立消费入口。
- New API 官方 Token管理与使用查询文档确认有限额度、模型限制与令牌过期能力。尚未核对APIC实际部署版本与管理API，不将官方能力描述冒充本站已接通。
- https://doc.newapi.pro/en/api/fei-token-management/
- https://doc.newapi.pro/en/api/token-usage/
- https://developers.openai.com/api/docs/models/gpt-5.6-terra

## 推荐实现顺序

1. 确认金额分配、赠送扣减口径、问卷、有效期及新增渠道；从合适明确main批次建立独立实现范围，不修改在途冻结候选。
2. 实现专属额度账本与幂等发放、问卷提交与独立报名审核；迁移与资金边界独审。
3. 给已有统一网关增加赠送额度的预占/结算/恢复与本人API Key；保留NewAPI路由且拒绝旁路。
4. 算力中心真实可视化与接入说明；管理员可查看发放/重试/失败原因而不暴露Key。
5. 定向单元、事务并发和迁移验证，独立审查与浏览器验收。提交/发布按本次明确授权执行，真实上游付费验收另行限额授权。

## 验收标准

- AC-001 / REQ-001：未完成问卷不能领取，成功完成只到账一次；重复/并发提交不超发；受限/删除账号拒绝。
- AC-002 / REQ-002：报名未审或拒绝不发放，获批按确认的确切分配发放一次；作品审核不触发权益，其他赛事不能套用。
- AC-003 / REQ-003：模型之间不能越权挪用；赠送不能用于交易/提现/转账；两种余额使用顺序和不足行为与政策一致。
- AC-004 / REQ-004：真实余额各项守恒；预占、成功、失败、退款和到期状态与服务端一致；本人隔离、空态和移动布局验证。
- AC-005 / REQ-005：站内和外部 API 共享本人余额；Key 轮换不补发；撤销立即拒绝；Key 不显示上游凭据；模型调用不能越权消费其他模型赠送池。
- AC-006 / REQ-006：即便绕过前端直接请求API仍受同一账本约束；NewAPI回执按冻结口径归集，不能双扣或不扣。
- AC-007 / REQ-007：Terra仅在确切渠道与模型验收后开放；Opus不得因赠送卡片存在而绕过原有未完成协议/回执门禁。


## 2026-10-16 本批实现分工

- Backend: src/contracts/compute-benefits.ts; src/server/compute-benefits/**; src/app/api/compute-benefits/**; src/app/api/admin/compute-benefits/**; prisma新前向迁移; 对应测试。原生SQL避免修改共享Prisma生成物。
- UI: src/components/workspace/compute-benefits.tsx; src/app/workspace/benefits/page.tsx; src/app/admin/compute-benefits/page.tsx; src/components/admin/compute-benefits.tsx; messages/product/en.json与zh.json新namespace; credits页面入口; UI测试。
- Root: gift/USD纯金额换算、已有codex网关预占/结算/恢复接入、历史汇总防误展示、独审和发布准备。
- 既有服务feature flag ANS_COMPUTE_BENEFITS_ENABLED=1才启用；新迁移和计价未装前不访问新表，生产默认不变。
- Backend统一接口: reserveBenefit(tx,{userId,requestId,modelId,usdMicros:bigint}):{grantId,reservedUsdMicros:string}|null; completeBenefit(tx,{userId,requestId,actualUsdMicros:bigint,state:SETTLED|RELEASED}):void; Gift errors有code/status。锁顺序users→application/grants→reservation。root在已有account锁内调用；service内部同顺序可重复锁。
- grant资金足够才预占；匹配但余额不足/过期报BENEFIT_UNAVAILABLE，不偷偷走付费。没有匹配grant返回null走原付费。completeBenefit将actual超出预占部分记录为平台承担，不超扣，事务终态只能完成一次，跨owner拒绝。
