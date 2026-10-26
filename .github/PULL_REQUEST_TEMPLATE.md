## 改了什么

<!-- 一两句话说明改动和原因 -->

## 权威基线（必填）

- 本 PR 触及的权威条目 ID：<!-- 例如 A-PLAZA-01；没有就写“无” -->
- [ ] 已跑 `node scripts/check-authority.mjs --worktree` 且通过
- [ ] 若撤销/取代了某条权威：同 PR 已更新 `docs/authority/ledger.json` 并写明理由
- [ ] 若新增了权威：已补账本条目 + 机器规则（contains / absent / countMax）
- [ ] 若本 PR **实现了某条 `pending` 条目**：同 PR 把它的 `status` 改回 `authoritative`（否则规则永远不生效）
- [ ] 若本 PR 只改 `docs/authority/**`：已确认 `git ls-tree` 里的实现确实满足新规则（台账不能先于实现变红）

## 改动类型

- [ ] Bug 修复
- [ ] 新功能
- [ ] 文档
- [ ] 其他（请说明）：

## 自查

- [ ] `npm run lint` 和 `npx tsc --noEmit` 通过，相关测试已跑
- [ ] 新增的界面文案已写进 `messages/*.json`
- [ ] 品牌：`ANS` 只写作 AI Never Stops；界面里叫 `Agent`，不出现 Pi Agent 等内部代号
- [ ] 没有虚构的实时数据、用户、订单或统计（示例必须标明是参考范例）
- [ ] 涉及计费或价格：展示的倍率与 `ANS_MODEL_BILLING_POLICY` 实际收费一致
- [ ] 带数据库迁移：已在 `scripts/production-backup-verify.py` 的 `REVIEWED_MIGRATION_SHAS` 和 `APPROVED_PENDING_SEQUENCES` 两处都登记，上线前跑备份恢复门禁

## 验证

<!-- 跑了什么、看到什么结果；截图或日志可以贴在这里 -->
