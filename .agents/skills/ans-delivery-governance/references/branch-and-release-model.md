# 分支、PR 与发布模型（ANS 实测版）

> 数据采集时间：2026-10-20 01:00 (+08:00)，来源：本机仓库 + GitHub API 实测。所有数字都可复现。

## 1. 实测事实

| 项目 | 实测值 | 复现命令 |
|---|---|---|
| 远端 | `github.com/1008611-creater/ans-platform`（public） | `git remote -v` |
| 默认分支 | `main` | `gh api repos/1008611-creater/ans-platform --jq .default_branch` |
| 远端分支总数 | 122 | `gh api --paginate --slurp "repos/.../branches?per_page=100"` |
| 已被 main 包含的分支 | 87（含 main 自身） | `git branch -r --merged origin/main` |
| 受保护分支 | **0** | 同上 API 的 `protected` 字段；`rulesets` 为空 |
| `main` 最新 | `26a19e23`（2026-10-19 19:46，PR #140） | `git log -1 origin/main` |
| `develop` 最新 | `647d9275`（2026-10-19 19:29，PR #144），相对 main 领先 0 | `git rev-list --left-right --count origin/main...origin/develop` |
| 部署信号 | `ops/deploy-target` = `ops/prod-live` = `f32e06f0`（2026-10-18 21:24），落后 main **131** 个提交 | `git rev-list --count origin/ops/prod-live..origin/main` |
| 最近合并 PR 的 review | 40 个全部 `reviewDecision=none` | `gh pr list --state merged --limit 40 --json reviewDecision` |
| 已合并 PR 总数 / 未关 | 132 / 0 | `gh pr list --state closed` |
| `delete_branch_on_merge` | false | 仓库设置 API |

## 2. 正常流转

```
feat/*  fix/*  codex/*
        │  PR（描述里写：触及哪条权威 ID）
        ▼
     develop        ← 集成；只跑 AI 反垃圾检查，不跑 verify
        │  PR（develop → main，发布 PR）
        ▼
      main          ← 触发 CI(npm run verify) + Docker 发布(ghcr.io)
        │  合并后人工/脚本推信号
        ▼
 ops/deploy-target  ──►  生产机执行 migrate + 重启 + 冒烟  ──►  ops/prod-live
```

## 3. 门禁的真实覆盖（这是最大的结构性缺口）

- `.github/workflows/ci.yml` 触发条件：`push: main` + `pull_request: main`。
  **合进 `develop` 的 PR 不跑 verify**，只跑 `Spam & Self-Promotion Check`（AI 反垃圾/反自荐，引擎配置见 `.github/workflows/spam-check.md`）。
- 后果：坏代码堆在 `develop`，风险集中在 `develop → main` 那一刻。实测 2026-10-19 当天 `develop` 的 CI 连续 5 次 failure 才第 6 次成功。
- `docker-publish.yml`：`push: main`、tag `v*`、手动。跑 verify 后构建并推 `ghcr.io/1008611-creater/ans-platform`。

## 4. 治理改造清单（按优先级，全部需要用户授权后执行）

1. **加 ruleset（最高优先）**：`main` + `develop` 均要求
   - 必需状态检查：`Test`（CI）+ `authority`（新增守卫 job）；
   - 禁止直接 push（含管理员）；
   - 至少 1 个 review（含 `develop`）；
   - 允许 squash/merge，禁止强推与删除分支。
2. **扩大 CI 覆盖面**：`ci.yml` 的 `pull_request.branches` 增加 `develop`，`push.branches` 增加 `develop`。
3. **接入权威守卫**：新增 job 跑 `check-authority.mjs` 与 `git-health.mjs`；PR 模板加"权威 ID"字段。
4. **发布信号一致性**：发布后自动校验 `ops/prod-live == ops/deploy-target == 本次发布 SHA`，不一致就报警。
5. **分支卫生**：开启 `delete_branch_on_merge`；对 87 条已合并分支做一次批量清理（保留 `release/*` 与 tag 对应的历史锚点）。
6. **本地工作区治理**：`E:\codex\ans` 当前停在 2026-10-06 的 `1cd97fc8`，落后 `origin/main` 1278 个提交，且工作树有 2699 删除 / 46 修改 / 40 未跟踪。要么更新，要么明确标注为"只读历史参考"。

## 5. 常用审计命令速查

```powershell
git fetch --all --prune
git status -sb
git rev-list --count main..origin/main        # 本地落后多少
git branch -r --no-merged origin/main          # 还有哪些分支没进主干
gh run list --limit 10                         # 最近流水线红绿
gh pr list --state open                        # 待评审
git log -1 --format='%h %ci %s' origin/ops/prod-live   # 生产信号停在哪个提交
```
