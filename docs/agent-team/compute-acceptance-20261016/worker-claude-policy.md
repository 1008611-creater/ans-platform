# Claude 原生 Messages 费用策略实施回执（2026-10-16）

基线 `9ceb01645020a1d172adb958476285f192135bb1`。实现 AC-004 的本地受保护策略；仅新增策略模块和测试，不改路由、共享网关、运行配置、schema、依赖或认证。无上游请求、真实费用、凭据读取、提交或发布。

## 对接契约

- `readClaudePolicy(env = process.env, now = Date.now()): ClaudePolicy`：只有 `ANS_CLAUDE_GATEWAY_ENABLED=1` 且 `ANS_CLAUDE_POLICY` 为完整严格 JSON 才返回，否则抛 `ClaudePolicyError`（code/status）。验证时间须合法且不在未来；来源必须 HTTPS、无用户密码、查询串或片段。没有任何默认实际价格、渠道、凭据或消费倍率。
- `validateClaudePayload(value, policy): ValidatedClaudePayload`：返回 body、text、bodyBytes、inputTokenUpperBound、reserve、modelId、maxOutputTokens、stream。body 是唯一可转发的已验证原生 Messages 请求，stream 缺省为 false，max_tokens 必填。严格未知字段拒绝，不保留未受控成本参数。
- `assertClaudeBudget(policy, { reserve, rollingDayPoints, concurrentRequests }): void`：必须在创建预占的同一个账号锁/事务内调用。rollingDayPoints 是过去 24 小时已结算费用，加所有仍未决授权（包括超过24小时的旧未决）；concurrentRequests 包含全部仍运行/未知 Claude 请求。调用者负责持久读取与原子授权；本模块不访问数据库。
- `ClaudePolicyError` 仅暴露稳定 code/status，不带原配置、用户输入、密钥或下游错误。金额/正文超过单次上限返回402/413；日上限、并发上限429；缺配置/预算来源异常503。

## 策略 JSON（全部显式字段）

`version`、`modelId`（只能 claude-opus-5-5）、`reserveRatesUsdPerMillion`（input、output、cacheWrite5m、cacheWrite1h、cacheRead）、`consumptionMultiplier`、`verifiedSource`、`verifiedAt`、`maxBodyBytes`（1024至262144）、`maxOutputTokens`（1至8192）、`inputOverheadTokens`（1024至16384）、`requestMaxPoints`、`rollingDayMaxPoints`、`maxConcurrent`（必须1）、`timeoutMs`（1000至300000）。金额/倍率最多六位小数，必须有限数；倍率、单次/日上限、输入/输出价为正数。单次上限不超过日上限。

reserveRates 表示管理员核实的保守价格上界，必须覆盖允许的全部上下文长度、缓存期限及渠道档次。核实普通上下文标价不等于核实所有适用档次；本模块不会声称某个网页数据已经完成渠道/价格认证。未配置或未核实不得开放模型。

## 成本和协议边界

- 将整个已验证 JSON 的 UTF8 字节数（含 system、tools/schema、tool_result、thinking回放）按一字节一个token的保守输入估计，再加明确配置的 overhead；以输入、两档缓存写、缓存读中最高价报价，不假设缓存命中或折扣。输出整段 max_tokens 包括 thinking。与显式独立倍率相乘，使用 BigInt 整数微积分计算并向上舍入至六位；不复用 GPT 倍率。
- 只支持 text、自定义客户端 tool_use/tool_result、system、tools、常规采样/停止设置、有限 metadata、thinking（disabled/enabled/adaptive）和 output_config.effort。enabled预算必须小于max_tokens；adaptive同样受max_tokens上限约束。保留assistant带签名thinking/redacted_thinking回放，以支持Claude Code多轮工具链。
- 拒绝原生 image/document/audio/video/URL媒体、server_tool_use、服务端工具类型、service_tier、speed、batch、background、context_management和其他未知字段；tool_result只允许文本结果。普通文本/客户端工具JSON中出现URL不会触发服务端抓取。
- 校验JSON深度、循环、非JSON对象/数值、角色、工具定义重名、tool_use重复、tool_result归属与重复结果。只有支持的严格结构可转发。
- reserve仅为授权预占；不得使用此报价或usage字段自行结算。结算必须依赖 APIC 权威回执；未知回执不能自动退款或重发。

## 验证及限制

- 单文件 Vitest：87项全部通过，涵盖默认关闭、完整/严格配置、独立倍率、UTF8/工具成本、向上舍入、正文/输出/单次/日/并发边界、原生工具链、thinking、禁用媒体和服务端功能、非法JSON/未知成本字段。
- 策略和测试文件定向ESLint：通过。
- 已修正仓库ES2017目标不支持BigInt字面量的问题，改用BigInt(...)，不修改tsconfig。
- 供应商、实际价格/倍率、凭据引用、Messages兼容、SSE、实际计费回执和模型生成仍未验证；尚未运行真实调用。本模块未连接生产，不能据此宣称Claude Code已可用。全仓类型/网关集成/独审由主代理合批执行。

## 冻结摘要

- src/server/integrations/claude-policy.ts SHA256: `db8a0e19d8bb24c58ee3d6226f748cdb8e147516b8de1139d76f21077d3f75a5`
- src/__tests__/lib/claude-policy.test.ts SHA256: `75b5be30e464ea5abd6b85f0772295f5fba8021589d80ea2afca2ace09fe1535`

