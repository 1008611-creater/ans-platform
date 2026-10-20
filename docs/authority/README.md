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

## 当前状态（2026-10-20 19:1x）

- **生产**：容器 `ans-platform-app` 跑 `ans-platform:040f6444`（healthy，release 目录
  `ans-040f6444-20261020` 带 `rollback.sh`）；`ops/deploy-target = ops/prod-live = 040f6444`。
  线上 `/showcase` 的 `person.glb` 已由 13.88 MB 降到 1.9 KB（#163）。
- `A-PLAZA-01 / 02 / 04`：已由 #149 合入 main 恢复（`npm run check:authority:upstream` 通过，
  轮转封面、页头标题与可访问性探针都在位上）。
- `A-AGENT-01`：已生效。线上 Agent 就是小恐龙伴侣 `DinoGuide`（`layout.tsx` 挂载 +
  `useCompanionAgent` 链路），旧 `PromptBuilder` 浮层不得回归。
- `A-AGENT-02 / 03 / 04 / 05`：已随 #152 / #153 / #154 / #156 的修复栈合入 main，并由 #165 翻为
  `authoritative`（守卫开始按规则校验）。
- **`A-RELEASE-01 / 02` 曾被静默回退，已恢复**：PR #164（一个基于旧 main 的分支）把
  `deploy/deploy.sh`、`scripts/git-health.mjs` 与账本一起合回了旧版本，A-RELEASE 条目连同实现一起消失，
  而当时所有门禁都是绿的 —— 账本被同一个 PR 改掉，守卫没得可查。这正是"静默回退"最危险的形态。
  恢复 PR：`fix/restore-release-authority-20261020`。
- **新增防复发闸门**：`node scripts/check-authority.mjs --base origin/main` 会检测"base 上存在的权威条目
  被整条删除"，CI 的 Authority job 现在以 `--base origin/main` 运行（自检用例见
  `src/__tests__/lib/authority-guard.test.ts`）。
- `A-SIGNAL-01`：部署信号是**远端分支** `ops/deploy-target` / `ops/prod-live`（既不是仓库里的文件，也不是工作树文件；
  `git ls-remote origin 'refs/heads/ops/*'` 可查）。2026-10-20 复测：两者都指向 `0ae6aef7`（= 当时的 main tip），
  **信号已对齐**，`node scripts/git-health.mjs` 退出码 0；`git-health` 读的正是 `origin/ops/*` 这两个 ref。
  （更正：此前在 README 里写过"ops/ 不在 git 里、是部署机工作树文件"，那是把"路径"当成了"ref"来查，结论错误。）
  发布前需人工确认"未上线"还是"未回写"。注意 `ops/` 目录**不在 git 里**（`git log --all -- ops` 为空），
  它是部署机上的工作树文件，`git-health` 读不到时会打印 `(无)`——发布一致性检查需要先决定它是否入库。

## 待合入 PR 与账本条目的对应关系（2026-10-20）

| 账本条目 | 状态 | 对应 PR | 合入后要做的动作 |
|---|---|---|---|
| `A-AGENT-01`（线上 Agent = 小恐龙） | **authoritative（已生效）** | #155 | 无需动作 |
| `A-AGENT-02`（扣费先报价再确认） | pending | #150 → #153 | 合入后把 status 改回 `authoritative` |
| `A-AGENT-03`（面板文案必须来自 messages/companion） | pending | #151、#156 | 合入后改回 `authoritative` |
| `A-AGENT-04`（3D 按需加载 / reduced-motion 优先） | pending | #152 | 合入后改回 `authoritative` |
| `A-AGENT-05`（Agent 推断必须 UNCONFIRMED） | pending | #154 | 合入后改回 `authoritative` |
| —（无机器规则，诚实性修复） | — | #148 | 无账本动作 |

### 合并顺序与门禁（2026-10-20 预检结果）

1. 顺序：`#148 → #150 → #151 → #152 → #153 → #154 → #156`；`#155`（本 PR）与 `#157`（skills 交接单）独立，可任意顺序。
2. 每个 PR 的必需检查：`Test` + `Authority`（ruleset `main-protection` / `develop-protection`，只允许 merge/squash，
   合并后自动删分支；2026-10-20 17:04 起两个 ruleset 都带 **admin bypass** `RepositoryRole#5: always`，
   用于投稿自动化直推 main 与单人仓库自助合并 —— bypass 只作应急通道，正常发布仍走 PR + 绿门禁）。
3. 合并前已在本机跑过与 CI 等价的门禁（栈 + `origin/main` `0ae6aef7` 的合并结果）：
   `check:authority` / `typecheck` / `typecheck:tests` / `lint` / `docs:check` / `check:boundaries` / `test:unit`
   **全部通过**（344 文件 / 4349 项 0 失败）。`build` / `smoke` / `a11y` / `perf` 需要隔离数据库与浏览器，由 CI 承担。
4. 全部合入后：把上表 4 条 pending 改成 `authoritative`，再跑一次 `npm run check:authority:upstream` 确认上游不回退。
5. **翻开前的模拟已跑过**（2026-10-20）：在「栈 + main + 本 PR」的本地合并结果上把 4 条 pending 全改为
   `authoritative`，`node scripts/check-authority.mjs --worktree` → **23 条规则通过 / 0 失败**（`isZh ?` 实际 32 处，
   全部为数据字段选择、文案三元 0 处；条目上限按棘轮设为 32，只能降不能增）。也就是说合并完成后直接翻状态是安全的。

## 发布后验收（每次上线后跑一遍）

```powershell
npm run audit:live-agent        # 只读探针：3D 是否按需加载、移动端面板是否压站头、建议下一步结构、/.well-known/skills 是否合规
node scripts/git-health.mjs     # 仓库与发布体检：落后/脏树/部署信号/分支卫生（有 critical 时退出码 1）
npm run check:authority:upstream   # 上游是否有人把权威实现改回去
```

2026-10-20 的修复前基线（探针 9 项只有 4 项成立，正好对应已修缺陷）：3D 首屏已加载、
移动端面板与站头重叠 25px、建议下一步不是直接子元素也不带图标、技能索引 174/202 条含反斜杠路径、
148/202 条 description 不合法。发布后这三条命令应当全绿，把输出贴进发布记录即可作为验收证据。
