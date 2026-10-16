# 算力中心 UI 实现回执

基线 `9ceb01645020a1d172adb958476285f192135bb1`。本子任务只改约定 UI、文案和对应测试，无提交、推送、付费、兑换、模型请求、生产部署。

## 修改

- `/workspace/credits` 使用「算力中心」标题，保留独立「积分账单」区；可用和预占余额在顶部各显示一次，保留6位小数。
- CreditsCenter新增可选 reservedPoints/pendingCount，旧调用兼容；待结算说明保留预占、查询原任务及避免重复启动。
- 模型卡读取 `RUN_MODEL_OPTIONS`、`RUN_MODEL_METERING` 三个现有模型及倍率，不新增/宣传未核实的 Opus，不把倍率解释为相对价格。
- 增加设置接入、项目、工作流运行、AIGC专用账单入口；说明AIGC数据不是全站调用。链接保持原页面账号权限。
- 卡密兑换20秒超时/卸载取消，保留卡密；不将未知结果当作兑换失败或未扣费。忽略超时后迟到成功和已卸载响应，允许安全重试同卡密。
- 中英文新增文案；链接具焦点样式、网格窄屏折行、金额和模型ID可断行。

## 文件

- `src/components/workspace/credits-center.tsx`
- `src/app/workspace/credits/page.tsx`
- `src/__tests__/components/credits-offers.test.tsx`
- `messages/product/zh.json`
- `messages/product/en.json`

## 验证

- 4文件/50项组件测试通过：credits-offers、compute-history、compute-history-page、compute-delivery-status。
- 新增回归覆盖：一次余额、真实模型倍率、准确范围入口、兑换超时可恢复、迟到响应无影响、卸载请求取消。
- 相关3个TS/TSX文件 ESLint 通过；git diff --check通过；中英文JSON及静态t()键检查通过。
- 全仓 TypeScript执行仅报 `src/components/prompts/prompt-filters.tsx:22` 缺少 `@/../public/deepwiki.svg` 模块声明。未改该文件或共享生成物；由根代理核对环境并复验。
- 已读取当前Next page.md指南。未做浏览器或实际手机/键盘验收，不能登记页面实测通过；统一由根代理执行。

## 剩余

密钥账号绑定、API收费警示和统一调用明细由根代理/资金审查处理，本子任务未改认证、api-key-settings、quota服务。原源码审计见同目录 compute-ui-audit.md。

## REQ-006 / AC-006 增量：最近文本 API 调用明细

根代理确认范围为当前账号的 `apic-codex` 文本 API 请求，包含项目/工作流内置调用，不称纯外部客户端；排除 AIGC 与语音，不声称完整历史。

- 新增 `src/server/quota/api-history.ts`：userId 来自已认证服务端会话；查询包含 userId、provider、账号未删除，稳定倒序且最多20条。只 select ANS内部ID、模型、状态、原始预占、nullable结算和三个时间字段；不读取/投影price、outcome、上游回执、输入、用户标识、幂等key或凭据。显式映射再次丢弃额外字段；AUTHORIZED/RUNNING/UNCERTAIN的最终结算始终为null。
- 服务端 credits/page 独立读取并传给 CreditsCenter，不改quota/history返回shape。查询失败显示不可用，不等于空记录或零费用。
- 中英文调用卡展示内部编号、模型、状态、原始预占、最终结算、北京时间。UNCERTAIN明确保留预占，只允许页面刷新读取，不提供调用重试按钮。
- 新增 `src/__tests__/lib/personal-api-history.test.ts`，并扩充credits-offers组件测试：校验owner/provider/limit/select边界、非法账号拒绝、额外敏感字段不泄露、临时结算不冒充最终费用、终态0/正数/null区分、北京时间及不可用/空状态区分。

验证：相关5文件/63项测试通过；新服务及相关5 TS/TSX文件ESLint通过；diff --check通过。最新全仓TypeScript仅报其他代理新增的 `src/__tests__/lib/claude-client.test.ts:36` HeadersInit可选undefined问题，已告知根代理修正；本职责未报类型错误。无真实调用、浏览器、提交或部署。

## REQ-010 / AC-010 增量：ANS 站内模型广场

新增 `/workspace/models` 公开只读页面；由根代理实现的安全 loader 提供目录，无账号、余额、密钥或管理能力迁入，无 iframe、无第三方源码复制、无新增依赖。算力中心增加模型广场入口。

- 搜索名称/ID/供应商，按供应商、协议、目录状态组合筛选；支持清除筛选和空结果恢复。
- 美元/ANS积分、1M/1K Token切换、名称/输入/输出价格排序，按当前显示币种排序。积分价格缺失显示未配置，不以零或示例汇率替代。
- 卡片与可聚焦横向滚动表格；详情使用现有 Radix 对话框，Escape/关闭返回原详情按钮。模型ID复制等待真实剪贴板结果，失败明确提示。
- 卡片和详情分别标注 APIC 公开美元价或官方参考价；包括输入、输出、缓存读取、GPT通用缓存写入、Claude 5分钟/1小时缓存写入。
- 明确目录发布不证明实时调用成功；not-listed仅代表公开目录未发布，不等于不存在私有路由；prepared默认关闭。
- 标准价说明区分DeepSeek峰值、GPT超过272K/Fast附加费及Opus模式/区域/工具附加费。页末分开显示官方参考价核对日期referenceDate与APIC目录抓取observedAt，汇率有单独来源/时间。
- 中英文文案；站点现有product消息装载对其他语言使用英文fallback。手机使用折行网格，表格在内部横向滚动，不把整页撑宽。

新增/涉及UI文件：`src/app/workspace/models/page.tsx`、`src/components/workspace/model-plaza.tsx`、`src/__tests__/components/model-plaza.test.tsx`、既有credits-center、product zh/en。服务端model-plaza及共享类型由根代理负责。

修正了PowerShell到Python管道写入导致的本地新增中文问号及界面分隔符，改用明确UTF-8文件写入，并重新检查新增中文键；该问题从未发布。

最终本职责验证：model-plaza/credits-offers/personal-api-history 3文件27项通过（模型广场7项覆盖价格来源、筛选、单位/积分缺失、表格、Escape及焦点恢复、复制失败/成功、目录失败）；相关4个UI文件ESLint通过；最新全仓TypeScript通过。独立浏览器、手机和线上效果仍由主代理验收，本子任务未操作浏览器、未真实生成/消费、未提交或部署。

冻结前补充：已按最新契约加入GPT通用缓存写入cacheWrite（与Claude 5m/1h分列）；官方参考日期从catalog.referenceDate读取，不再混用APIC observedAt。not-listed文案明确不等于无路由。已修复模型协议和状态分隔符。最终3文件27测试、相关ESLint、全仓TypeScript再次通过；本UI差异已冻结，精确文件摘要见 ui-source-snapshot.json。

## 旧美元/积分混同文案修复（最终增量）

修正 product zh/en 的 vouchers.rules、quotaHistory.rules、quotaHistory.billingBody，以及 learning zh/en 的 cost（后者同样仍含旧1积分=1美元）。页面现统一说明：固定人民币1元=10积分；模型积分=官方美元费用×本次快照汇率×10×模型消耗倍率，GPT0.16只应用一次，DeepSeek1，出现Opus时为1；历史请求保留原计价快照，不追溯换价。实际第三处key为quotaHistory.billingBody，当前不存在codexSetup.billingBody，未凭空新增重复配置。

CreditsCenter的usdQuotaPerPoint兼容可选number|null；credits-offers、credits-catalog-ui及voucher-ui夹具同步null，不再把旧固定美元额度写进测试。顶层apiKey语言风险文案未发现美元/积分等同句；未改他人负责的apiKey风险文案。

新增精确回归 `src/__tests__/components/billing-copy.test.ts`：中英文四处收费说明都必须含独立USD→FX→10→倍率公式、仅应用一次与历史快照；禁止恢复1积分=1美元，并保留动态倍率占位与固定DeepSeek/Opus倍率。

验证：billing-copy、credits-offers、model-plaza、credits-catalog-ui、voucher-ui共5文件28项通过；本增量相关5个TS/TSX的ESLint通过。全仓TypeScript在最后两个fixture字面量由1改null前通过；新增nullable类型及credits-offers的null已纳入该次类型检查。最终构建由根代理执行。本增量9文件重新冻结，无服务修改、付费、浏览器、提交或部署。
