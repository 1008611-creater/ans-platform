# 算力中心与积分体验审计

基线 `9ceb01645020a1d172adb958476285f192135bb1`，2026-10-16。范围为源码和现有测试；未操作浏览器、账号、卡密、真实订单或模型。主代理负责唯一浏览器验收。

## 规范与已具备能力

- `docs/ANS权威产品与架构总纲.md:10`、`:11`：六主导航保持不变，算力中心从账号菜单进入 `/workspace/credits`。
- `docs/ANS商业化与计费架构.md:15`、`:22`：固定人民币 ¥1=10积分；上游USD额度、Token价格与采购成本独立。
- `docs/ANS商业化与计费架构.md:81`、`:91`：执行前显示预计费用/最高授权/余额；预占不是实际费，恢复不得重新生成。
- 卡密兑换已有 actor 绑定、单次在途保护、重试保留卡密、状态提示；`CreditsCenter` 使用账号边界。套餐保持准备中，未将预览当可购买。
- AIGC 账单已有预占/实际/退回分列、未知用量不呈现为零、交付与结算区分，任务交付查询有20秒超时及账号边界。

## 可证明问题

| ID | 等级 | 证据与影响 | 最小修复 |
| --- | --- | --- | --- |
| UI-001 | P1 | `src/components/settings/api-key-settings.tsx:38` 无 actorId/账号边界；`:60`/`:79`/`:98` 的密钥操作没有 actor header，`src/app/api/user/api-key/route.ts:50`/`:71`/`:86` 只用当前会话。A账号页面留存后切换B账号，旧界面可对B账号生成或撤销key；A请求迟到也可在旧组件重新显示明文。settings父页也未使用 AccountContentBoundary。 | 服务端 mutation 核对显式 actor 与真实会话；组件跟随 actor 重新挂载并在会话不匹配时卸载私密状态；响应及撤销确认绑定原账号，超时/取消不恢复旧key。根代理处理安全边界。 |
| UI-002 | P1 | `messages/zh.json:1214` 的 keyWarning 仍只警告读取/创建私有提示词，但同一key在 `src/server/integrations/codex-gateway.ts:35` 鉴权后可直接消耗积分。重建/撤销确认同样只提MCP。用户不知道泄露的是付费调用凭据。 | 标明该key授权Codex算力及积分消费，重建/撤销影响全部使用它的客户端；只回显一次，不展示旧明文。需要所有现有语种同步。 |
| UI-003 | P2 | `/workspace/credits` 的header只有刷新；`src/app/workspace/credits/page.tsx:34-56` 无 compute历史、个人key或接入文档入口。虽然账号菜单称算力中心，页面主要是充值和流水；Codex调用者遇到待结算无法从这里找到请求状态。 | 顶部建立「算力中心」统一入口，保留流水区标题；增加接入设置、AIGC任务账单、工作流运行等准确范围链接，不虚构统一任务记录已完成。 |
| UI-004 | P2 | `src/server/compute/member-history.ts:7`、`:50` 明确只查 provider=toonflow；余额是全站余额，累计仅AIGC。该范围文案目前是正确的，但不能把此页当Codex/全站消费详情。credits仅将所有扣费归为「算力扣费/预占」，无法定位其预占来源。 | 本轮 UI 清楚区分统一积分流水与AIGC任务明细；全站任务明细需服务端联合安全投影 ApiComputeRequest/Run/WorkflowRun 等后再开放。至少为Codex提供脱敏ID、模型、状态、预占、结算及原请求恢复方向。 |
| UI-005 | P2 | `src/components/settings/api-key-settings.tsx:129-133` 未等待 clipboard.writeText 即报复制成功；`:179-196` 纯图标显示/隐藏与复制按钮无可访问名称。复制失败被误报成功，键盘/读屏用户无法分辨动作。 | await clipboard，catch后显示明确失败并保留可选择文本；按钮增加已翻译aria-label与切换状态。 |
| UI-006 | P2 | `src/components/workspace/credits-center.tsx:29-46` 兑换fetch没有超时或abort。极端挂起时busy永久保持，兑换按钮无恢复路径。卡密保留与幂等服务端能力已有。 | 设有限等待，组件卸载时abort；显示「结果未确认，重试不会重复入账」，继续保留卡密；不把超时说成未兑换成功。 |
| UI-007 | P3 | `src/components/workspace/credits-center.tsx:53`已有可用余额，`src/app/workspace/credits/page.tsx:41`又显示同一余额；规则在卡片和流水前重复。预占/待结算位于购买卡片之后。 | 可用与预占置顶一次展示；充值/兑换及流水成为后续区块，预占说明紧邻金额。 |

## 本轮建议清单

1. 根代理先修 UI-001/002 的付费key安全与披露；与资金审计结果一起验收。
2. UI层可独立小修 UI-003/005/006/007，不改导航、不改兑换经济规则、不引入新依赖或schema。
3. UI-004 的统一调用明细应单独做受保护服务投影，避免把AIGC总数冒充全站；本轮可以先完成准确范围和入口。
4. Claude Code / Opus 5.5 暂无页面支持、模型ID、Anthropic Messages网关、独立价格/缓存价与预算保护证据；不能直接把Codex Responses示例改一个model值宣称接入。未核实前显示不可用；不得套用GPT0.16。

## 验证与限制

尝试运行4个既有组件测试：compute-history、compute-history-page、credits-offers、compute-delivery-status。命令在启动时失败：`vitest`未被识别，新工作树尚无可用依赖；没有执行到测试断言，不能登记为测试通过。未安装依赖、未修改业务代码。实际移动布局、键盘与浏览器读屏尚未在本子任务验收，不能以源码responsive类推断通过。
