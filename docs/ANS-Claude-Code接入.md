# ANS Claude Code 接入与开放条件

2026-10-16。本文件描述本地候选，不表示线上已启用。APIKL 的一次原生 Messages 小额调用已返回200；真实 Claude Code、上游流式与工具回合、经 APIC 的请求级费用回执仍未验收。

## 用户入口与费用

- 用户使用自己的 ANS Key，通过 ANS 原生 Messages 网关；供应商 Key 只留平台配置，积分由 ANS 统一预占、结算。
- 充值固定 ¥1=10积分。Claude-Max（主推）的0.8是供应商采购分组倍率，不自动成为 ANS 用户倍率；Opus不能套用GPT的0.16。
- 每次收费请求必须带用户明确选择的 `x-ans-max-points` 单次积分上限；服务端另有日预算、并发1和最大输出限制。未知回执保留预占，不当免费、不自动重跑。
- 当前只支持 `claude-opus-5-5`、文本和客户端工具。图片、文件、托管工具、未知beta和其他收费特性会在调用前拒绝。

## 候选客户端配置

只有管理员完成开放条件后才使用，支持的API版本为 `2023-06-01`。

| 配置 | 要求 |
| --- | --- |
| `ANTHROPIC_BASE_URL` | `https://ans.cauai.fun/api/claude`；SDK自行追加 `/v1/messages` |
| `ANTHROPIC_AUTH_TOKEN` | 用户自己的ANS Key，避免同时遗留其他账号的 `ANTHROPIC_API_KEY` |
| `ANTHROPIC_MODEL` | `claude-opus-5-5`，不配置昂贵模型自动切换 |
| `ANTHROPIC_CUSTOM_HEADERS` | `x-ans-max-points: 用户明确选择的单次积分上限`；替换成正数且不超过站端政策 |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | 不超过8192及站端具体限制 |
| `CLAUDE_CODE_GATEWAY_HINT_HEADERS` | `1`，让自定义网关收到提示UUID等路由信息 |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | `1`；若某版本仍发送beta，停下核对，不静默删除 |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT` | `1`，避免尚未核实的长上下文费用档次 |

此方案要求Claude Code至少2.1.283，并显式设置 `CLAUDE_CODE_GATEWAY_HINT_HEADERS=1`；自定义地址默认不发送提示UUID。不同工具回合按归一化正文摘要区分；同一会话、提示、Agent和正文的重试共享幂等键。未归属用户提示的后台请求可能没有提示UUID，会被拒绝；因此这仍是有限支持候选，不能宣称所有后台功能可用。缺少稳定身份返回明确错误，不随机分配新键再次付费。自定义客户端可为每条消息提供独立 `Idempotency-Key`，不要给整个会话使用一个固定值。

## 原生辅助接口

- `GET /api/claude/v1/models`：要求ANS Key、已启用政策和明确记录的供应商元数据；缺元数据返回503，不补造发布日期。返回日期只是供应商所报目录时间，不证明底层官方发布日期。
- `POST /api/claude/v1/messages/count_tokens`：校验输入和功能边界，返回本地UTF8保守上界，并带 `x-ans-token-count-kind: conservative-utf8-upper-bound`。用于提前收缩上下文，不是供应商精确分词数，不用于结算；不会请求供应商、扣积分或触发后台对账。
- Messages JSON与SSE错误遵循原生格式。未知费用保留预占；预算/并发限制返回429，账单状态不可用返回503。

## 管理员开放条件

1. 将确认的独立分组配置进APIC，核对Messages与模型映射。凭据适配器只在进程内读取本机凭据，不放入源码、命令参数、剪贴板或日志。
2. 核对输入、输出、5分钟/1小时缓存写入、缓存读取及上下文价格上界，并另行确认ANS用户倍率。历史请求保留价格政策快照。
3. 经批准的小额验证必须核对APIC请求ID与专属ANS令牌的请求级计费桥；供应商总用量增量不能代替积分结算权威回执。
4. 用真实Claude Code验收流式、工具回合及超时/重复提交；只读接口和模拟回归不等于真实客户端已可用。
5. 配置完整 `ANS_CLAUDE_POLICY`。如使用 `modelMetadata`，必须显式提供 `createdAt/source/observedAt`；价格、上游和计费验证开关齐备前继续关闭。APIC目标必须HTTPS。
6. 任务分支经独审、CI、合并后，从精确main版本发布并保留回滚证据。满足前不将Opus列为已可用模型。

## 依据

- Claude Code官方网关协议：`https://code.claude.com/docs/en/llm-gateway-protocol`
- Claude Code官方网关配置：`https://code.claude.com/docs/en/llm-gateway`
- 模型目录协议：`https://platform.claude.com/docs/en/api/models/list`
- APIKL文档及报价：`https://docs.apikl.ai/claude-code`、`https://apikl.ai/api/v1/model-plaza`

以上区分协议、供应商所报信息与本地候选，不证明供应商底层模型身份或本候选已上线。

