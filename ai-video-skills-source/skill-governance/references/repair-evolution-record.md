# Repair Evolution Record

同一任务或失败路径需要第二次修复时创建：

```yaml
first_attempt: 第一次路线和失败的精确证据
successful_repair: 已验证修复的精确证据
root_cause: information_gap | wrong_source_of_truth | stale_dependency | wrong_tool_route | contradictory_rule | premature_completion | excessive_gate | external_instability
prevent_first_failure_check: 若第一遍提前执行即可发现问题的一条检查
promotion: no_promotion | project | domain | global | machine_gate
owner: 最窄权威 owner
verification_level: structural | integrated | real_delivery
rework_observation:
  target_uses: 3-5
  completed_uses: 0
  rework_reduced: unknown
```

- 依据真实前后证据，不依据聊天印象；只选一个主要根因和一个晋级等级。
- 客观稳定检查优先 `machine_gate`，但专业语义仍归项目或领域 owner。
- 项目特有入口、Provider、服务器和业务合同用 `project`；同领域复用用 `domain`；跨不同项目有真实证据后才用 `global`。
- 网络波动、偶然 Provider 异常、无法归因或证据不足用 `no_promotion`。
- 已授权阶段内可自动增加项目级规则、focused test、preflight 和最窄现有 Skill 修正。新增全局默认、重大依赖/服务、核心工具替换、跨项目行为以及改变产品效果、费用、隐私、锁定或外部风险时必须询问用户。
- 建立观察机制仅是 structural 证据；完成 3-5 次真实使用前不得宣称返工率已经下降。
- 修改代码、Skill、脚本、validator、automation 或 pipeline 后仍必须运行 post-coding-review。
