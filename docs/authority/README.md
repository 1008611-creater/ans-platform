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

- `A-PLAZA-01 / 02 / 04`：已由 #149 合入 main 恢复（`npm run check:authority:upstream` 现在通过，
  轮转封面、页头标题与可访问性探针都在位上）。
- `A-AGENT-01`：已生效。线上 Agent 就是小恐龙伴侣 `DinoGuide`（`layout.tsx` 挂载 +
  `useCompanionAgent` 链路），旧 `PromptBuilder` 浮层不得回归。
- `A-AGENT-02 / 03 / 04 / 05`：**pending**（守卫自动跳过）。对应的实现还在评审中的 PR 栈里
  （#150 扣费先报价再确认 → #151 面板文案 i18n → #152 3D 按需加载 → #153 抓娃娃载荷与聊天确认 →
  #154 诚实性与无障碍）。**谁先把它们合入 main，谁就在同一个 PR 里把 status 改回 `authoritative`**，
  否则规则一开就会红。
- `A-SIGNAL-01`：`ops/deploy-target` ≠ `ops/prod-live`，且 deploy-target 落后 main 多个提交，
  发布前需人工确认"未上线"还是"未回写"。注意 `ops/` 目录**不在 git 里**（`git log --all -- ops` 为空），
  它是部署机上的工作树文件，`git-health` 读不到时会打印 `(无)`——发布一致性检查需要先决定它是否入库。
