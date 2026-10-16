# 积分资金路径只读审计（2026-10-16）

基线：`9ceb01645020a1d172adb958476285f192135bb1`。范围 REQ-002 / AC-002。只读源码与现有测试；未执行真实领取、兑换、付费、订单、模型调用、生产写入或凭据读取。本报告不代表生产验收通过。

## 已证实问题

### P1 / POINTS-001：四个消费者 AI 入口绕过统一积分门禁

证据：

- `src/app/api/improve-prompt/route.ts:61` 在 session/API key 鉴权后直接调用 `improvePrompt`；无 `blockUnmeteredConsumerAI`、报价/预占/结算或余额检查。
- `src/app/api/mcp/route.ts:742` 的 `improve_prompt` 工具同样直接调用该 helper，未验证当前账号可消费状态。
- `src/app/api/prompts/translate/route.ts:25` 直接 `translateContent`；helper `src/lib/ai/generation.ts:35` 只读取 OPENAI 配置，没有积分上下文，甚至不检查 `aiGeneration` 开关；输入无长度限制。
- `src/app/api/generate/sql/route.ts:34` 只检查登录和 `aiGeneration`，直接 `generateSQL`；无积分预算/账本。
- `src/lib/ai/improve-prompt.ts:169`、`src/lib/ai/generation.ts:43,66` 直接调用 OpenAI SDK，不经过 `meteredResponses`。
- `src/__tests__/api/legacy-consumer-ai-boundary.test.ts` 现只覆盖 book/demo、prompt-builder/chat、prompt-builder/generate-example 三条旧入口，漏掉以上入口。

影响：当部署了可用 OPENAI 凭据时，余额为零的登录用户仍可产生平台供应商费用，不记 ANS 资金流水；MCP 还保留 5 分钟身份缓存。是否生产实际配置这些凭据未验证，不应声称已发生漏扣。

最小修复：沿用已存在的统一积分保护，在 helper 的消费者边界或上述每个可达入口 fail closed（统一积分模式返回 POINTS_INTEGRATION_REQUIRED），直到真正接入报价、幂等及结算；不得简单加一个事后估算扣费。

最小回归：统一积分开 + 可用配置 mock + 已登录且零余额，分别调用三条 HTTP 入口与 MCP improve_prompt；断言 503/结构化业务错误、没有 OPENAI provider 调用。保留非统一部署兼容和未登录拒绝。

### P2 / POINTS-002：新增 3D / 四视图预占不在积分页待结算汇总

证据：

- `src/server/visual-portfolio/jobs.ts:78` 会 `debitQuota` 并把任务记入 `visual_model_jobs`（note 明确 reservation）；可取消未提交任务退回，有 NEEDS_REVIEW 保留。
- `src/server/visual-portfolio/four-view-jobs.ts:43` 预占 5 积分；同样有 QUEUED/RUNNING/NEEDS_REVIEW 与明确退款条件。
- `src/server/quota/history.ts:38` 的 pending 聚合只有 computeTask、apiComputeRequest、marketPointsEscrow、run、workflowRun、mediaGeneration、exam，不读上述两表。
- `src/server/compute/member-history.ts:6` 限定 toonflow，不会补充这些任务。

影响：用户余额已减少，但积分页的 reservedPoints/pendingCount 不显示这笔正在执行/待核查的预占，账单只显示普通 RUN_COST，不便解释与追踪恢复。此结论不等于余额扣错或重复扣款。

最小修复：只读派生这些真实预占（owner 过滤、charged 且未 refunded、合理非终态/未知态），纳入汇总与可恢复任务入口。应先明确“已确认上游失败但有实际费用”的终态是已消费还是待审；不要把所有失败自动退款。无须 schema 迁移。

最小回归：混合两个账号的 3D 与四视图记录（未扣费上传、已扣费队列、未知、已退款、完成）验证只统计当前账号真实未结预占；余额原值保持不变。

## 本次未发现新的可证明资金漏洞的路径

- 领取：用户行锁 + quotaClaimedAt；池总量 CAS 与领取余额/流水同事务，单账号不可重复领取，池余额不得并发超发。
- 卡密：只存哈希；serializable transaction、未兑换 CAS、唯一 operationKey；同账号重试不增额，异账号拒绝，撤销/过期拒绝。
- 管理员增减：事务内重新检查 ADMIN/USERS_MANAGE 与账号有效状态；operationKey/requestHash、充值证据去重；不足额减法拒绝。
- 市场积分：买家/订单归属、order 行锁、escrow CAS、交易 serializable 重试，付款/接受/争议退款账本原子；卖家余额不足时明确 SELLER_REVERSAL_REQUIRES_REVIEW，不擅自垫付。
- Codex：只支持白名单模型、禁止状态串接与媒体/托管工具；账号锁 + provider/user/key 唯一、耐久失败 attempt，未知不退款不重发；有 APIC 回执才结算；超授权供应商费用由平台承担、用户收费不超上限。
- 管理员 waiver：明确人工豁免、事务内权限复核、保留 unknown 成本证据，不把豁免误作供应商未执行。
- 个人与团队账本：personalQuotaLedgerWhere 明确剔除 TEAM_GRANT/team/team_member，保留 legacy null。
- LDXP 自动充值入口保持 `configured() === false`，仍是卡密手动兑换，没有因 Token 配置重新自动上账。

以上为源码结构结论，不替代真实 PostgreSQL 并发验证或线上配置验收。

## 仍需注意但不冒充本轮新缺陷

- AI 初审两条直接供应商调用依然未接统一成本审计；应作为平台成本路径，不能擅自扣用户积分。必须核对独立预算、调用限流和管理员审计要求。
- 一次赠送具体 1000 分属于池配置，源码允许管理员配置其他合法值；未读线上池不证明生产值正确。
- 套餐用途限制/积分来源批次未成熟时应维持售卖门禁，不能仅凭当前总余额宣称活动/会员积分能安全用于卖家可提现交易。
- 未执行付费请求，不核验实际上游计价或账单。

## 验证状态

已完成静态可达路径追踪、当前测试覆盖检查。此工作树初始无 node_modules；尚未运行现有回归，不将“现有测试文件存在”写成“测试通过”。待依赖可用后运行资金/兑换/历史/网关/门禁针对性测试，再记录结果。
## REQ-009 计价单位独立初审（2026-10-16，修复前）

此节为新计价需求下对旧实现的审计，不推翻前轮在旧积分政策下的CODE PASS；新需求使计价相关差异必须重新独审。只读核对源码与脱敏已有证据，未发模型请求、读凭据或改生产。

- PRICING-001 / P1：`apic-billing.ts` 将APIC quota/500000（USD信用额度）命名points；`codex-gateway.ts` 的预占仅美元上界乘消费倍率，结算和恢复直接用charge.points扣ANS积分，缺少USD→CNY汇率×10快照。新请求必须拒绝缺汇率/来源/价格快照的配置，预占和最终回执均使用同一不可变快照；旧请求无新快照继续原规则恢复，不能用新环境汇率重算旧账。
- PRICING-002 / P1（跨层依赖）：`gateway-evidence.ts` 直接用charge.points减billedPoints且拒绝负数。若只修改gateway转为ANS积分，证据层将USD数减ANS积分数，可能拒绝正常结算并使请求永久待核查。原始quota保持原样，证据金额必须使用任务快照转换到同一积分单位；不能改历史证据的单位含义。
- PRICING-003 / P2（跨层依赖）：`model-client.ts` 从ANS settledPoints反造quota=points×500000，掩盖回执原值。应分开真实APIC quota和ANS已结算积分，不从积分反造上游回执。`workflows/runner.ts` 的sum quota/500000旧换算仅非统一模式路径；生产统一模式使用readMeteredRunCost，不能误报该分支为生产二次换算。
- PRICING-004 / P2：`run-models.ts` 的45/75和9/15是保守上界，不是官方单价；UI/模型广场不得标成官方基础输入/输出价格。DeepSeek官方ID为deepseek-flash，version标V4.1-Flash，网关deepseek-v4.1-flash属于别名，应保留映射来源。

官方primary来源实时核对：OpenAI Astra标准input/cache-read/cache-write/output为$10/$1/$12.5/$50每MTok，Sol为$2/$0.10/$2.5/$10；>272K输入的长上下文档次input/cache为2倍，output为1.5倍。DeepSeek Flash峰值cache-read/input/output为$0.006/$0.3/$1.2，低峰减半。来源：`https://developers.openai.com/api/docs/models/gpt-6-astra`、`https://developers.openai.com/api/docs/models/gpt-6.1-sol`、`https://api-docs.deepseek.com/quick_start/pricing/`。这是价格文档核对，不证明转售渠道底层模型身份或APIC实际费率。

已有公开APIC pricing证据仅含DeepSeek model_ratio=.15、completion_ratio=4、cache_ratio=.02；public group_ratio仅default/vip=1，不能据此断言ANS专用token的有效组倍率。New API官方源码`relay/helper/price.go`先选择userGroup/usingGroup特殊倍率，否则取usingGroup倍率，预占及分层计费快照均包含有效groupRatio。因此GPT .16可能已在回执内，必须依据ANS专用token实际组与脱敏费率证据显式配置receiptConsumptionMultiplier，不能再次机械乘.16。源码：`https://raw.githubusercontent.com/QuantumNous/new-api/main/relay/helper/price.go`。

最小修复面：独立严格价格快照模块、gateway预占/结算/历史恢复、证据金额同单位处理、model-client真实quota保存、受影响回归。不能以一次供应商汇总用量替代APIC请求级回执；采购0.8仍和Opus用户倍率1分开。冻结后由本审查者复核实现并更新审查manifest。

### 有效计费配置后续核实（2026-10-16）

已直接复核主控只读证据 `pricing-config-readonly.jsonl` 与 `pricing-tiered-readonly.jsonl`。当前生产为R30、revision `b56d67651c35bbb35798c0eb25bb4352366a87db`，健康；这些是主控提供的只读回执，本独审没有变更生产。

- ANS专用tokenGroup与userGroup均ans_compute_service，GroupRatio=1，没有该组的GroupGroupRatio覆盖。
- DeepSeek显式ratio模式；GPT两模型显式tiered_expr模式。两者标准/长上下文表达式与上述官方价格一致，并整体乘 `(hour("Asia/Shanghai") >= 0 ? 0.16 : 1)`；合法小时恒满足>=0，故有效折扣为0.16。无model_mapping。
- 因此早先只看旧ModelRatio而推断Astra可能按$5/$20计费的意见已撤销，实际tiered表达式覆盖旧倍率；GPT回执已包含0.16，应仅转换USD→CNY→积分，不再额外打一次0.16折扣。通用快照公式仍应显式记录receiptConsumptionMultiplier=.16与ANS consumptionMultiplier=.16，便于避免双乘并保留来源。
- 公开模型目录没有GPT是目录对tiered元数据未发布的展示缺口，不能据此断言GPT无路由。APIC镜像标识为`apic-subscription-redeem:20260927`，不把当前上游main源码直接称为运行镜像的精确代码。

PRICING-001/002/003仍成立；PRICING-004仅指保守预占上界不得宣传为官方标价，不再称APIC实际GPT计价与官方不符。REQ009进一步明确Opus用户消费倍率为1，采购0.8独立；不覆盖前轮报告所记录的当时“尚未批准”状态，最终新候选报告应更新该事实。
