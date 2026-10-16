# 积分单位修复交接（2026-10-16）

状态：本地实现及隔离验证通过；未提交、推送、部署、执行生产迁移或写入生产配置。基线 9ceb01645020a1d172adb958476285f192135bb1。此前 Claude policy 的文件摘要已失效，本轮以 billing-units-freeze.json 为准。

## 规则与配置

充值固定 ¥1＝10积分。新模型费用为官方 USD 标价成本×请求冻结 USD/CNY×10×消费倍率。GPT 消费倍率0.16，DeepSeek及Opus为1；Opus采购倍率0.8独立记录，不用于打消费者折扣。

ANS_MODEL_BILLING_POLICY 为严格JSON：version；fx（usdCny、HTTPS source、observedAt）；models（可选配置四个精确模型，各含 requestMaxPoints、consumptionMultiplier、receiptConsumptionMultiplier、procurementMultiplier、reserveRatesUsdPerMillion.input/output、priceEvidence及receiptEvidence）。来源禁止凭据、查询串和片段；日期不得在未来；金额最多6位小数。单次上限最大10000积分，未配置模型拒绝新收费。不得将测试fixture汇率用作生产默认值。

APIC真实回执 quota/500000 是已包含APIC倍率的美元额度。新结算公式为 ceil6(quota/500000/receiptConsumptionMultiplier×fx×10×consumptionMultiplier)。父代理只读证据确认GPT tiered_expr最后已乘0.16且GroupRatio1，因此回执倍率应记录0.16，防止重复折扣；DeepSeek组1。Opus仍需要真实回执计价证据和确定的FX配置后才能开放新收费。

modelUsdToMemberPoints 是目录单价纯换算，不执行单次预算；reserveModelPoints 是请求预占，强制冻结 requestMaxPoints。Claude count_tokens 使用 validateClaudeInput 做结构、长度、会话验证，无provider调用、积分扣减、回执恢复或FX依赖；付费messages仍执行完整门禁。

## 历史与凭据

无 price.billing 的历史请求继续 quota/500000＝积分的旧规则；有billing但损坏／未知版本拒绝，绝不降级。恢复只读取请求冻结快照，不使用当前汇率；不重写历史账单。新证据 upstreamPoints、billedPoints、platformCoveredPoints 都为该请求规则下的ANS积分，raw upstreamQuota始终保留原始凭据。model-client只从 VERIFIED evidence读真实quota，不从成员积分反造quota；无证据时不输出charge。

## 数据库与验证

迁移 20261016120000_model_billing_units_v2 保留历史、不可变凭据、终态配对及管理员豁免守卫；新quote允许四模型及合理冻结cap；修复旧state CHECK结算最高10导致Opus70积分结算失败；新终态不得超过原预占。免费TTS分支保留。

使用现有 ans-platform-db-1 的精确ID及compose归属验证后，仅创建本轮临时库 ans_compute_units_20261016，执行91个旧迁移、新迁移和纯合成数据断言。GPT倍率去重/FX7单位、Opus采购独立、旧账恢复、预算/混单位/坏快照拒绝、不可变quote/evidence、明确拒绝退款及免费TTS均通过；临时库按owner comment核验后已删除，cleanup=true。记录 billing-units-postgres.json；可复验 scripts/verify-model-billing-units.py。

定向7文件202项通过；14个相关TS文件ESLint通过；全源码tsc通过。未新增真实付费调用；未验证线上新计费生效。

## 发布顺序与回滚

生产先确认备份、配置证据及对应PR审核，先迁移再切新代码。缺少FX或任一价格/回执依据时保持新收费关闭。先验收旧账恢复，再按明确支出授权验收新请求；上线版本需关联main精确提交及回滚镜像。

存在v2请求或证据后不可恢复旧CHECK／删除迁移。代码回滚先关闭新收费，保留前向兼容数据库；v2未决必须由兼容v2的代码恢复。旧代码不得处理v2结算。此处仅给出回滚路径，未执行生产操作。
