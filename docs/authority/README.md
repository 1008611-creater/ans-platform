# 权威基线（Authority Ledger）

这个目录回答一个问题：**"之前定下来的东西，会不会被下一次 audit/fix 静默删掉？"**

- `ledger.json`：唯一事实源。每条 `status: authoritative` 的决定都必须带至少一条机器规则
  （`contains` / `absent` / `countMax`），否则守卫无法阻止回退。
- 守卫：`node .agents/skills/ans-delivery-governance/scripts/check-authority.mjs`
  （默认对 `origin/main` 校验；CI 里的 `Authority` job 会强制执行）。
- 体检：`node .agents/skills/ans-delivery-governance/scripts/git-health.mjs --gh`
  （分支保护、部署信号灯、CI 红绿、分支卫生）。

规则很简单：**改代码而不改账本 = 静默回退**。要撤销某条权威，必须在同一个 PR 里把
`status` 改成 `revoked`/`superseded` 并写清理由。写法和复盘案例见
`.agents/skills/ans-delivery-governance/references/authority-ledger.md`。
