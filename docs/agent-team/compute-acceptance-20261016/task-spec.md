# ANS 算力中心与积分验收（2026-10-16）

任务等级 XL；基线 origin/main 9ceb01645020a1d172adb958476285f192135bb1，生产仍 R29 4434778e。仅本地修改、只读线上核对；不执行真实付费、兑换、领取或交易。提交、推送、公开发布和部署保留具体授权点。

- REQ-001 / AC-001：按照当前主纲和商业化规范核对页面、模型、充值、余额及账单。固定 ¥1=10积分；上游USD额度和采购成本独立，不机械乘10；套餐未履约维持禁售。
- REQ-002 / AC-002：审核赠送、卡密兑换、预占、结算、退款、并发幂等、账号隔离和管理员边界。问题提供实际路径、影响、回归证据；未知回执不推断零费用，不重复调用。
- REQ-003 / AC-003：算力入口提供余额、费用、授权上限、历史/恢复及准确客户端接入指导，符合六导航/账号菜单、移动和键盘等统一规范；敏感凭据不进入展示与证据。
- REQ-004 / AC-004：核实 Claude Code Opus 5.5 的供应商、准确ID、Messages协议、价格（输入/输出/缓存写读/长上下文）和凭据引用。无法核实不开放、不猜价、不套用GPT倍率、不试用收费调用。可先实现受保护的配置和独立模型预算能力。
- REQ-005 / AC-005：针对已证实缺陷完成本地修复及必要测试/类型/构建，独立审查绑定基线与实际差异摘要；区分本地、生产和待核验。无迁移、无新依赖、无认证流程修改，除非另获授权。

实现先完成只读审计，随后按明确缺陷分配文件；审核者不修改自己审查的代码。只维护根目录既有发布队列，本文件不重复发布队列。

## Continuation after bounded supplier probe

2026-10-16: The user selected APIKL / Claude-Max main group and authorized exactly one bounded nonstreaming probe (32 output tokens). That probe returned HTTP 200 and the expected text; supplier aggregate USD usage increased by 0.0001216. It is not an authoritative per-request ANS receipt. No further paid probe is authorized by this continuation.

- REQ-006 / AC-006: Surface the most recent personal API compute requests in the compute center: internal ANS request identifier, model, state, original authorization, nullable final member charge and timestamps. Always owner-scope in the database, limit results, select only safe columns, never expose upstream outcome/receipt, input, credential or price metadata. UNCERTAIN must remain pending, never zero-cost or auto-retry. Clearly label limited recent-request scope.
- REQ-007 / AC-007: Prepare documented Claude Code native protocol support while disabled: explicit member spend ceiling, retry identity scoped to account/session/prompt/body, safe unsupported-feature rejection, no silent costly model fallback. CountTokens may be a labeled conservative local upper bound, with no debit/upstream call. Native Models must expose only the supported model and require the member key. Do not claim the real client/streaming/end-to-end billing was verified.
- REQ-008 / AC-008: Keep procurement group 0.8 separate from the still-unapproved ANS retail multiplier. No hard-coded production prices, credential deployment, production enablement or new paid call. New diff invalidates only affected review entries and needs independent re-review.

## 2026-10-16：计价单位核验和模型广场

- REQ-009 / AC-009：积分充值固定10积分/CNY；模型美元标价、汇率、采购折扣、消费倍率分别建模。新计价必须有可追溯的汇率和价格快照，预占与结算使用同一快照；配置不全拒绝新收费请求，历史请求按原快照恢复，不修改历史账单。Opus倍率1，采购0.8不得冒充用户售价。审计其余模型，不能把保守预占价声明为官方单价。
- REQ-010 / AC-010：算力中心新增ANS站内模型广场入口；将APIC/New API公开模型广场的目录、筛选、单价、协议、模型详情功能迁入ANS本地页面。采用真实安全公开元数据，不迁入APIC认证、密钥、钱包和管理员权限；不可用或未核实模型不宣称已可用；保留适用来源说明。无新增依赖、无生产修改。
- REQ-011 / AC-011：针对新计价单位、历史恢复、目录外部数据校验、失败降级和UI做定向验证，并独立复审。未批准真实汇率时不默认采用示例值；新付费请求、提交和上线仍保留授权边界。


## 2026-10-16 Post-merge Agent budget and CI increment

- REQ-012: Agent quote/ticket/payload caps use the configured model billing snapshot in ANS points, including the approved10points per credit-dollar denomination; no module-import billing configuration requirement and no runtime default pricing.
- REQ-013: Existing tickets never increase their signed cap. A changed current cap rejects execution; status/receipt inspection remains possible without current billing configuration. No provider calls are authorized by this increment.
- REQ-014: Synchronize stale template/workflow tests with rejection of non-unified APIC execution and durable VERIFIED receipt projections. API Key mutations explicitly use same-origin credentials and no-store, preserving cancellation/account isolation.
- NON-012: No production configuration, schema, billing evidence, wallets, live calls, upstream activation or production deployment changes.
- AC-012: At configured denomination1, Sol's three-call conservative authorization is2.84619ANS points; each actual request reserve fits its quote. Changed or missing policy cannot start a call. Status recovery remains available.
- AC-013: All four failing CI test files pass with realistic explicit fixtures; legacy APIC bypass tests assert rejection/no upstream request rather than enabling the unsafe path. Missing VERIFIED quota never gets fabricated from ANS points.
- AC-014: Existing account-switch, late-response and API Key tests pass; each mutation retains actor, cancellation, no-store and same-origin options. Relevant lint/types pass. Independent review binds exact frozen diff, with no production or paid verification claims.
