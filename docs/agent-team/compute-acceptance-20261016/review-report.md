# 算力中心与积分候选独立审查（2026-10-16）

审查者未修改业务代码。基线HEAD：`9ceb01645020a1d172adb958476285f192135bb1`。主控于最终文案/history增量后宣布源码冻结；本地未提交候选共75个源码、测试、迁移、验证脚本及文档，逐文件SHA256见 `review-manifest.json`。规范化path→sha256对象集合摘要：`e0613bbf76b74a708dd65ca42b4da49218cad7c17e319c0e9ce27bf9b24d629a`；算法为JSON ensure_ascii=True、sort_keys=True、separators(',',':')。审查自身目录已排除，两个用户接入文档包含在清单。资金18文件冻结清单全部匹配。

本报告替代此前43/50文件审查快照，不表示PR、合并、构建、部署或真实客户端验收已经完成。

## 结论

REQ-001至011本地候选 **CODE PASS**，未发现未关闭的P1/P2实现缺陷。资金快照、模型广场、迟到回执与最终中英文收费说明均已增量复核。新迁移的真实隔离PostgreSQL验证由实现者执行，本审查者核对脚本、合成断言、回执和精确迁移SHA，结论为 **ISOLATED DB CONSTRAINT PASS**。

**Opus真实Claude Code / SSE / APIC请求级结算仍BLOCKED，不能宣称已接通。** 用户已选APIKL/Claude-Max主推分组，Opus用户倍率明确为1、采购倍率0.8独立。主控记录的一次获准32输出token非流式probe返回HTTP200及预期文本，供应商汇总USD用量增加0.0001216；本审查者未执行该付费请求，汇总增量不构成请求级ANS权威回执或底层模型身份认证。

实际USD/CNY汇率政策仍未选择，生产计价配置尚未写入。新代码缺FX/价格/回执快照时拒绝新收费请求；因此不能在配置不全时切换生产并承诺算力连续可用。主控最新只读回执显示生产R30、revision `b56d67651c35bbb35798c0eb25bb4352366a87db`、健康；本审查者没有变更或独立操作生产。

## 逐项验收

| 验收 | 结论 | 证据与边界 |
| --- | --- | --- |
| AC-001 全站规范/积分统一 | CODE PASS | 充值固定¥1=10积分；卡密手动兑换保持；未履约套餐禁售保持。最终product/learning中英说明去除1积分=1美元，history契约返回usdQuotaPerPoint:null及pointsPerCny:10。未证明线上赠送数量/库存/所有页面均已实测。 |
| AC-002 资金/幂等/隔离 | CODE PASS | 四条旧AI入口付费前关闭；visual预占只读归集；账号/耐久attempt/回执/人工豁免边界保持。原兑换、交易、账本隔离未改部分复用前轮审查。未运行真实生产钱包或并发交易。 |
| AC-003 算力UI/账号 | CODE PASS；浏览器由主控验收 | 6位积分、待核查不暗示退款、兑换超时恢复；APIKey同源+actor操作绑定，切换账号销毁秘密状态并拒迟到响应。独审未操作共享浏览器，不宣称移动/键盘/线上实测完成。 |
| AC-004 Claude保护 | GUARDED CODE PASS；真实接入BLOCKED | 默认关闭；HTTPS基础设施、显式单次上限、独立价格/缓存上界、向上取整预占；模型并发1；已结算按finishedAt滚动窗口，所有未决不限制年龄；未知费用保留。拒媒体/托管工具/未知beta，原生JSON/SSE错误。真实CC/SSE工具及APIC回执未验收。 |
| AC-005 验证/发布 | LOCAL PASS；未发布 | 独立定向测试见下；本轮新增一项资金约束迁移，不再沿用初轮“无数据库变化”的结论。无新增依赖或认证提供方流程变更。主控负责最终构建、浏览器与未来PR/CI/发布回滚。 |
| AC-006 最近API明细 | CODE PASS | session权威userId、数据库owner/未删除账号/provider过滤、稳定倒序take20；仅select安全列并显式投影；未决settled为null。范围明确含内置文本调用，不是全部账本。失败显示不可用，无自动重试/退款按钮。 |
| AC-007 原生客户端准备 | GUARDED CODE PASS；真实客户端BLOCKED | 显式幂等键优先且无效不fallback；否则严格session/prompt UUID+agent+归一化正文SHA256，userId唯一隔离。models缺真实元数据503；count_tokens仅严格本地输入验证与保守上界，不依赖FX/消费cap、不provider/扣费/对账。文档限定CC2.1.283及GATEWAY_HINT_HEADERS；无提示身份后台请求拒绝。 |
| AC-008 采购/用户售价 | CODE PASS | 后续用户已明确Opus用户倍率1；采购0.8只独立记录，不冒充用户折扣；不套GPT0.16。没有新增付费、密钥部署或生产启用。 |
| AC-009 单位/快照/历史 | CODE PASS；隔离DB约束PASS | USD费用×冻结FX×10×消费倍率；APIC已含倍率先消除，GPT .16仅一次。预占/结算/迟到恢复同快照；无billing历史维持原规则，损坏billing拒绝降级。原始quota独立保留，证据应收/实收/平台差额同积分单位。无生产汇率默认值。 |
| AC-010 ANS模型广场 | CODE PASS | 固定HTTPS公共URL、无凭据、禁重定向、超时/1MiB流限/schema/去重/安全投影；不输出私组/钱包/凭据，不执行外部expr。标准官方价区别于保守预占，GPT通用cacheWrite与Claude5m/1h分列。目录状态不证明路由/实时可用，失败只保留有日期的官方参考。 |
| AC-011 定向验证/回滚 | LOCAL/ISOLATED CONSTRAINT PASS | 资金快照、精度、历史、目录畸形/失败、预算与只读计数、最后文案均有回归。数据库事务迁移保留历史/免费TTS/证据不可变；v2后不得恢复旧约束或由旧代码结算v2。未执行实际生产切换或恢复演练。 |

## 关键修复与关闭发现

- POINTS-001/P1：HTTP提示词优化、MCP improve_prompt、翻译、SQL遗漏积分门禁；统一模式在业务正文/provider前用既有blockUnmeteredConsumerAI拒绝，非统一安装保留旧行为，未关闭工作流运行工具。
- POINTS-002/P2：3D/四视图预占遗漏；参数化双owner只读查询，原始正数costPoints、未退款、真实未决，四视图另charged；免费TTS不计资金占用数。无猜测零费用或自动退款。
- REVIEW-001/002/003：Claude HTTP目标、延迟结算日窗遗漏、后段错误格式/状态码均已修；HTTPS、SETTLED/finishedAt+所有未决、Anthropic JSON/SSE及429/503回归通过。
- REVIEW-004/P2：models缺元数据原用固定epoch；现需createdAt/source/observedAt及合法时间关系，缺记录503，标upstream-reported，不称官方发布日期。
- REVIEW-005/P2：CC提示UUID最低版本由2.1.124修为2.1.283，并启用CLAUDE_CODE_GATEWAY_HINT_HEADERS=1。独审曾误报ENABLE_GATEWAY_HINTS；重新核对官方当前协议后已撤销该意见，未把错误变量写入最终配置。
- PRICING-001/P1：USD信用额度直接当ANS积分；新增严格计价快照、BigInt微积分向上取整、独立FX×10及回执倍率归一化，缺配置拒绝新收费。
- PRICING-002/P1：证据层USD减ANS；现在raw quota不变，所有证据金额使用请求快照下的积分单位，DB触发器独立验证相同公式。
- PRICING-003/P2：model-client从settled积分反造quota；现在仅从VERIFIED证据读取原始quota，无证据不造charge。非统一APIC模型调用拒绝，避免继续旧混单位路径。
- PRICING-004/P2：保守预占上界与官方单价混淆；目录明示标准官方参考及来源/核对日期，长上下文/Fast等另列边界。有效APIC配置已确认GPT显式tiered_expr含.16，撤销只看旧ModelRatio而猜Astra$5/$20的早期推断。
- CATALOG-001/P2：外部tiered条目保留旧ratio可能误标价；现在检测billing_mode/expr，不执行表达式、不用旧ratio冒充有效价，保留官方参考。
- CATALOG-002/P2：每百万单价误用带单次cap的预占函数；现用纯modelUsdToMemberPoints换算，实际请求仍由reserveModelPoints强制cap。
- COUNT-001/P2：新资金cap影响只读count_tokens；抽出validateClaudeInput，缺FX/极小cap仍可严格计数，paid messages保持503/402。
- COPY-001/P2：history固定美元等同字段及product/learning旧文案；已置null并统一USD→快照FX→10→倍率说明，历史不重算，旧fixture也不再固化1美元=1积分。

## 独立验证与证据范围

独审实际执行：

- 初轮11:19：15文件299项；REQ006-008增量11:51:36：5文件191项。未改变部分复用，不把这两轮旧结果冒充新增资金迁移后的完整重跑。
- REQ009-011最终计价/目录/count增量，13:28:19：8文件222项全部通过，范围model-billing-policy、gateway-billing-units、unified-model-billing、codex-gateway、claude-policy、apic-billing、model-plaza(lib/UI)。
- 最终history/中英文计价文案增量，13:33:07：6文件47项全部通过，范围billing-copy、credits-offers、model-plaza(UI)、credits-catalog-ui、voucher-ui、quota-history。与前轮有重叠，不相加声称独立总用例数。
- 13:21曾出现1个目录单价被cap拦截失败；该失败已修，13:24的221项及最终222项覆盖修复，最终不遗留失败。

以上Vitest的DB/provider为夹具，没有真实收费、生产用户、卡密或凭据。实现者另外记录资金7文件202项、相关ESLint/全源码tsc；主控记录两类tsc、目录18/history19；本独审未冒称亲自执行这些回执。

真实PostgreSQL隔离验证：`billing-units-postgres.json`记录91个旧迁移+新迁移通过、未复制生产数据、未新建服务、cleanup=true。迁移实际SHA256=`90de22506fc07ad1d41ed68a85db03e0797bde90b9ba9a9bedd403e54202b940`，与资金冻结及实测回执一致。脚本核对精确Docker容器ID/镜像/compose归属，拒覆盖已有库，只清理由本轮创建且owner comment吻合的临时库。

合成SQL覆盖：历史关键金额与证据保留、GPT .16归一化/FX7/10积分单位、Opus1与采购.8独立、旧账无FX恢复、超cap/坏快照/混单位拒绝、quote/evidence不可变、明确拒绝RELEASED0与免费TTS分支。本审查者读脚本/fixtures并核对回执，未重复执行该数据库写入。此证据不表示整行byte-for-byte对照、真实余额流水扣退、并发事务或生产资金端到端验收。

## 发布与保留边界

- 先核准真实FX策略及各模型价格/回执依据，再将准确代码、新约束与配置作为同一批发布；缺配置不开放新收费。保守价格上界不能当作官方报价宣传。
- 新迁移使用BEGIN/COMMIT及本地锁超时，保留旧约束分支；有v2请求/证据后不得回退旧CHECK。应用回滚先关闭新收费，保留前向兼容DB；v2未决只能由兼容代码恢复，不能删除证据或重跑历史迁移冒充回滚。
- 尚需任务分支提交/PR/独审CI/main、主控最终构建与浏览器、精确生产切换/烟测/回滚证据。当前仅本地未提交候选，不能称上线完成。
- 平台AI初审供应商成本预算仍属既有独立问题，不擅自扣用户积分。本批未重写卖家余额不足退款政策及会员积分用途批次；成熟度整体结论保留这些范围限制。
- 依据文档见 `docs/ANS-Claude-Code接入.md`、`docs/ANS模型计费与模型广场.md`；官方协议/价格核对与供应商一次probe不证明底层模型身份、真实CC/SSE或APIC权威费用链路已经可用。
