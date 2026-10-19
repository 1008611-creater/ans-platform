# docs/authority —— ANS 权威基线

这个目录是 ANS 的**唯一权威事实源**。任何“就这样定”的产品/流程决定都必须落成 `ledger.json` 里的一条，
并且带机器能跑的规则；否则它一定会被后来的重构或“对抗式审查”静默删掉（已有先例：项目广场的轮转封面与重复标题）。

## 怎么用

```powershell
npm run check:authority            # 校验当前工作树（本地门禁 / CI job "Authority"）
npm run check:authority:upstream   # 审计 origin/main 是否已经回退
npm run check:git-health -- --gh   # 仓库与发布体检：落后、脏树、部署信号灯、分支保护、CI 状态
```

## 规则

- 新增/撤销权威 → **必须与实现同一个 PR**。
- 只删代码不改账本 → 视为静默回退，CI 的 Authority job 必须拦住。
- 规则支持三种：`contains`（必须有）、`absent`（必须没有）、`countMax`（同页不复读的次数上限）。
- `ref` 统一写 `origin/main`：这样审计的是“上游真实状态”，不会被本地过期工作区骗过；
  CI 里用 `--worktree` 校验本次合并结果。

## PR 对表清单（合并前逐条过）

- [ ] 本 PR 触及哪些 `A-*` 条目？（[PR 模板](../../.github/PULL_REQUEST_TEMPLATE.md) 必填）
- [ ] `npm run check:authority` 通过
- [ ] 若撤销/取代了某条：账本已更新且理由可读
- [ ] 若新增了权威：账本条目 + 机器规则已加
- [ ] 若是 develop→main 发布 PR：`git-health` 无非预期项

事故复盘（项目广场回退 `219422c9` → `27969917`）与更细的写法指引，见本地 Skill
`ans-delivery-governance` 的 `references/authority-ledger.md`。

## 当前状态（2026-10-20）

- `A-PLAZA-01 / 02 / 04` 正在由 `fix/explore-plaza-authority-restore-20261020` 恢复：
  合并前 `origin/main` 与 `origin/develop` 仍是回退态，`npm run check:authority:upstream` 会报红 —— 这是预期的。
- `A-GATE-02`：`ci.yml` 已覆盖 `develop` 的 push 与 PR。
- `A-SIGNAL-01`：`ops/deploy-target`(219422c9) ≠ `ops/prod-live`(f32e06f0)，且 deploy-target 落后 main 124 个提交，发布前需人工确认。
