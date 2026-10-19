---
name: ans-delivery-governance
description: ANS 交付治理总闸（Git 分支/PR/发布门禁 + 权威基线账本 + 防回退守卫）。当任务涉及 ANS 的分支、提交、PR/合并、上线发布、CI 门禁、审查"为什么又变回非权威了/内容回退/被改掉了"，或用户说"怎么做才对/别让开发把决定改回去/上线流程/仓库治理"时必须激活。
---

# ANS 交付治理（Git + 权威基线不回归）

本 Skill 只解决两件事，且认为它们是同一个根因：

1. **主干与发布没有机器强制**：分支、PR、CI、部署信号全靠人自觉，所以能绕过、能腐化。
2. **权威决定没有单一事实源与守卫**：决定只活在对话和某次 commit 里，下一次"对抗式审查/重构"就能无声地把它删掉。

> 只写文档没用。**每一条权威决定都必须换成一个机器能跑的断言**，否则它一定会回退。

---

## 0. 激活后立刻做的三件事

1. 读权威账本 [docs/authority/ledger.json](docs/authority/ledger.json)；确认本次任务触碰哪几条。
2. 跑守卫：`node .agents/skills/ans-delivery-governance/scripts/check-authority.mjs`
   （默认对 `origin/main` 校验，避免被本地过期工作区误导）。
3. 跑体检：`node .agents/skills/ans-delivery-governance/scripts/git-health.mjs --gh`
   （分支落后、脏树、部署信号、分支保护、CI 状态一次看全）。

涉及 ANS 页面/文案/交互时，**必须同时激活 `ans-ui-ux-baseline`**（含两轮无上下文对抗式审查门禁）。本 Skill 的守卫要在那两轮**之前和之后各跑一次**。

---

## 1. 两条铁律

- **铁律 A（权威必须可执行）**：任何"定下来的产品/流程决定"必须在 `docs/authority/ledger.json` 有一条 `status: authoritative` 的条目，并带至少一条机器规则（文件必须包含/禁止包含/出现次数上限）。没有守卫的决定 = 迟早回退。
- **铁律 B（主干只能被证明过的东西更新）**：任何进入 `develop`/`main` 的改动必须来自分支 + PR + 绿门禁。任何"直接改主干、跳过门禁、只在自己的对话里解释"的改动视为事故。

---

## 2. 分支模型（ANS 实况，2026-10-20 实测）

| 层 | 分支 | 规则 |
|---|---|---|
| 生产主干 | `main` | 只接受 PR 合并；合并后必须 CI 绿 + Docker 构建绿 |
| 集成分支 | `develop` | 功能先合到这里；发布时 `develop → main` 一个 PR 带走整批 |
| 功能分支 | `feat/*`、`fix/*`、`codex/*` | 一个任务一条，名字带日期 `codex/<主题>-YYYYMMDD` |
| 发布标记 | `release/*`、tag `ans-rNN-*` | 只标记，不再开发 |
| 部署信号灯 | `ops/deploy-target` → `ops/prod-live` | 发布完两者必须相等；不等就是"上线没回写"或"上线失败" |

**MR 不存在**：这是 GitHub 仓库，只有 PR。`main` 上允许存在自动化数据提交（`Add prompt: …`，来自 ANS 站内投稿同步），审计时要把它们与人工合并分开看。

完整流程与实测数据见 `references/branch-and-release-model.md`。

---

## 3. 标准工作流（每次改动都照这个走）

```powershell
# 0) 永远从最新远端开始，不要在你的过期工作区上改
git fetch --all --prune
git switch -c fix/<主题>-$(Get-Date -Format yyyyMMdd) origin/main

# 1) 动代码前：读账本 + 跑守卫（记录基线）
node .agents/skills/ans-delivery-governance/scripts/check-authority.mjs

# 2) 实现（页面/文案同时遵守 ans-ui-ux-baseline）

# 3) 提交前自证
npm run verify            # 12 步硬门禁
node .agents/skills/ans-delivery-governance/scripts/check-authority.mjs

# 4) 提交 + 推送 + 开 PR（提交与推送需用户当次明确授权）
git push -u origin HEAD

# 5) 合并前：CI 全绿 + 守卫通过 + 与权威账本逐条对表
# 6) 发布：develop → main 的 PR 合并后，CI/Docker 绿，再推 ops/deploy-target
```

**改动的收尾动作（最关键）**：如果你的改动"satisfies 某条权威"或"撤销某条权威"，必须在**同一个 PR 里**改账本：

- 满足/固化 → 新增或把条目 `status` 置为 `authoritative` 并补规则；
- 撤销/取代 → 置为 `revoked`/`superseded`，写明理由与取代它的条目 ID。

**不允许**：修改被权威条目约束的代码而不动账本。这类 PR 一律视为"静默回退"，CI 必须拦住。

---

## 4. 门禁矩阵（缺一不可）

| 关卡 | 命令/位置 | 现状 |
|---|---|---|
| 类型/lint/边界/单测/依赖扫描/构建/冒烟/a11y/性能 | `npm run verify` | 已实现，CI 只在 `main` 与"PR→main"触发 |
| 权威不回归 | `scripts/check-authority.mjs` | 本 Skill 提供；**待接入 CI** |
| Git/部署一致性 | `scripts/git-health.mjs` | 本 Skill 提供；**待接入 CI/发布前** |
| 对抗式审查 | `ans-ui-ux-baseline` 的两轮 Subagent | 已约定，未机器化 |
| 分支保护 | GitHub ruleset：必需 CI + 禁止直推 + 必需 review | **当前为 0，必须补** |

---

## 5. 权威账本怎么写（`docs/authority/ledger.json`）

```json
{
  "id": "A-PLAZA-01",
  "status": "authoritative",
  "title": "项目广场 /explore 必须保留轮转项目封面",
  "decidedAt": "2026-10-19",
  "authority": "commit 219422c9",
  "surface": ["src/app/explore/page.tsx"],
  "rules": [
    { "ref": "origin/main", "file": "src/app/explore/page.tsx", "type": "contains", "value": "ProjectCoverflow" }
  ]
}
```

规则类型：`contains`（必须出现）、`absent`（禁止出现）、`countMax`（出现次数上限，用于"同页不复读"）。`ref` 一律写 `origin/main`，这样本地再脏也不会骗过守卫。

写法与红线详见 `references/authority-ledger.md`。

---

## 6. 常见事故与处置

| 症状 | 真实原因 | 处置 |
|---|---|---|
| "之前说好的功能又没了" | 某次 audit/fix 提交直接删了实现，无人守卫 | 从账本`rollback`记录定位到删除提交 → 恢复实现 → 补守卫规则 |
| "本地看是对的，线上是错的" | 本地工作区过期 + 未提交改动 | 先 `git fetch` + 对 `origin/main` 校验，永远别用本地树做结论 |
| "上线了但不知道上线的是哪版" | 部署信号灯没回写 | 跑 `git-health.mjs`，比对 `deploy-target`/`prod-live`/`main` |
| "分支太多不知道哪个能删" | 无清理策略 | `git branch -r --merged origin/main` + 30 天未动判定，批量清理需授权 |

---

## 7. 红线（绝不做）

- 不在过期工作区（落后 `origin/main` 大量提交、脏树）上做判断或提交。
- 不用"我改好了"代替证据：必须给出守卫输出、`npm run verify` 结论、PR 号。
- 不把权威决定只写在对话、commit message 或本地未跟踪 md 里。
- 不在未获当次授权时 push、开 PR、合并、打 tag、推 `ops/deploy-target`。
- 不用"对抗式审查/审计"的名义删除已有权威功能；要删必须先改账本。

---

## 8. 资料与脚本

- `references/branch-and-release-model.md`：分支/PR/发布/信号灯全流程 + 2026-10-20 实测审计数据 + 治理改造清单
- `references/authority-ledger.md`：账本 schema、写入流程、PR 对表清单、项目广场回退案例复盘
- `scripts/check-authority.mjs`：权威守卫（`--ref`/`--worktree`/`--ledger`）
- `scripts/git-health.mjs`：Git/发布体检（`--gh` 检查分支保护与最新 CI）
- `assets/ledger.example.json`：从零初始化账本的模板
