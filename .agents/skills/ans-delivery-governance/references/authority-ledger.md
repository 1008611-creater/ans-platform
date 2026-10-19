# 权威基线账本：写法、流程与复盘

## 1. 为什么要它

ANS 已经出现过多次"权威决定被后来的 audit/fix 提交静默删除"。根因不是谁不小心，而是：
决定只存在于**对话**和**某次 commit**里，后来的 Agent/人看不到，删除也不会触发任何红灯。

账本把"决定"变成**可执行断言**，让回退变成**测试失败**，而不是等用户发现。

## 2. 文件与字段

路径：`docs/authority/ledger.json`

```json
{
  "version": 1,
  "updatedAt": "2026-10-20T01:20:00+08:00",
  "entries": [
    {
      "id": "A-PLAZA-01",
      "status": "authoritative",
      "title": "短句，能独立读懂",
      "decidedAt": "YYYY-MM-DD",
      "authority": "commit <sha> / PR #号 / 文档路径",
      "surface": ["受影响文件"],
      "rules": [
        { "ref": "origin/main", "file": "src/app/xxx.tsx", "type": "contains", "value": "ProjectCoverflow", "note": "为什么" }
      ],
      "rollback": [{ "commit": "27969917", "at": "2026-10-19 18:25 +0800", "what": "删除了什么" }]
    }
  ]
}
```

- `status`：`authoritative`（生效，必须被守卫）/ `revoked`（已撤销）/ `superseded`（被新条目取代）。
- 规则类型：`contains` / `absent` / `countMax`（配合 `max` 字段，用于"同页不复读"）。
- `ref`：校验基于哪个 git ref，**统一写 `origin/main`**；只有刻意的本地核查才用 `--worktree`。

## 3. 写入流程（谁、什么时候写）

1. 任何"这个功能/文案/规则就是这样"的结论，落成一次**明确的确认**（对话里用户说了算）。
2. 实现它的同一个 PR 里新增/更新账本条目。
3. 守卫必须能把它表达成 `contains/absent/countMax`；表达不了说明这条决定还没被想清楚（例：'要好用' 不可守卫，'页头不得出现重复标题' 可守卫）。
4. 撤销权威：同一个 PR 里把 `status` 改掉并写明理由，**不允许只删代码**。

## 4. PR 对表清单（合并前逐条过）

- [ ] 本次改动触及哪些 `A-*` 条目？（PR 模板必填）
- [ ] `node …/check-authority.mjs` 通过（对 `origin/main`）
- [ ] 若撤销了某条：账本已更新且理由可读
- [ ] 若新增了权威：账本条目 + 规则已加
- [ ] `npm run verify` 通过
- [ ] 若是 develop→main 发布 PR：`git-health.mjs` 无非预期项

## 5. 复盘：项目广场（/explore）回退事故

时间线（+08:00，全部可在 `git log` 复现）：

| 时间 | 提交 | 动作 |
|---|---|---|
| 2026-10-19 00:31 | `219422c9` | **权威建立**："restore Hero + ProjectCoverflow on /explore, eliminate duplicate 项目广场 title" —— /explore 恢复首页式 Hero + 轮转封面，标题不再重复"项目广场" |
| 2026-10-19 14:33 | `51baaa7d` | 站点级"双盲零上下文对抗式审查"，重排 /explore、/ 页头 |
| 2026-10-19 18:25 | `27969917` | **静默回退**：删除 `ProjectCoverflow`、`homepageProjects`、`homeStyles` 引用，把页头换成 `<h1 className="ans-page-title">{t("nav.explore")}</h1>`（标题重新变成"项目广场"） |
| 2026-10-19 19:46 | PR #140 | 该回退随 `develop → main` 一起上线 |

**教训**：`219422c9` 的决定只写在 commit message 里，没有任何守卫；3 次提交、18 小时后彻底消失，且被包装成"审计修复"。同类命名（`fix(audit)`、`fix(site-audit)`）后续必须强制跑账本对表。

**恢复方式**（需授权后执行）：从 `219422c9` 取回 `src/app/explore/page.tsx` 的 Hero + Coverflow 结构（保留后续合法改动），同时补 `A-PLAZA-01/02` 的守卫规则，再走 PR。

## 6. 反模式

- 只写"设计原则"不写断言 → 无法守卫 → 必然回退。
- 把账本放在未跟踪的本地 md（如 `RELEASE_STATE.md` 现状）→ 团队与 CI 都看不到。
- 用"对抗式审查"当免罪符 → 审查也必须先过账本。
