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

## 当前状态（2026-10-20 17:00）

- **生产已切到权威版**：容器 `ans-platform-app` 跑 `ans-platform:0ae6aef7`（healthy），
  `main = ops/deploy-target = ops/prod-live = 0ae6aef7`；`npm run check:authority:upstream` **10/10 通过**。
- `A-PLAZA-01 / 02 / 04`：已随 PR #149 合并，并在生产用真实 HTML 验证（`/explore` 的 h1 = sr-only 页面名 + 品牌主标题 + 轮转封面）。
- `A-GATE-02`：`ci.yml` 已覆盖 `develop` 的 push 与 PR（改动还没进 develop，所以 develop 目前只要求 PR、不要求状态检查）。
- `A-GATE-01`：GitHub ruleset 已生效 —— `main-protection`（必需 `Test` + `Authority`、禁强推/删除、admin bypass）、
  `develop-protection`（要求走 PR、admin bypass）。`scripts/git-health.mjs --gh` 会把两者打印出来。
- `A-RELEASE-01 / 02`：`deploy/deploy.sh` 已按真实发布约定重写（release 目录 + `production-private.json` +
  镜像 tag 带短 SHA + 回滚脚本 + 构建前拒绝未跟踪 src 文件）。
- 仍在红：`develop` 的 6 个测试文件（计费/政策断言漂移），修复分支 `fix/develop-verify-tests-20261020`。
