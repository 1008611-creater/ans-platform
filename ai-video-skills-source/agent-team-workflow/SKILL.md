---
name: agent-team-workflow
description: name: agent-team-workflow
---

---
name: agent-team-workflow
description: name: agent-team-workflow
---

---
name: agent-team-workflow
description: "Use when Codex should run a task with Agent Team role separation: classifying task size, creating a numbered task spec, implementing from that spec, independently reviewing with evidence, or managing issue-based rework. Trigger when the user mentions Agent Team, 三窗口, 多窗口, task-spec, worker-report, review-report, issue 闭环, independent review, or wants complex Codex work split into requirements, implementation, and verification roles."
---

# Agent Team Workflow

Use this skill to keep complex Codex work from becoming one long self-validating chat. Treat each "window" as an independent Codex conversation or role context. The roles are:

1. Requirements analysis: define what to do and how to verify it.
2. Implementation: implement only from the spec and self-test.
3. Review: independently verify against the spec with evidence.

For tiny tasks, do not force the full process.

## Start With Task Size

Classify before choosing the workflow:

- `S`: typo, one-line config, small style tweak, clear error fix. Use one window and do the work directly.
- `M`: one module, limited frontend/backend linkage, clear acceptance points. Create a light spec, implement, then self-check.
- `L`: permissions, database, multiple modules, core business logic, or release risk. Use the full three-window workflow.
- `XL`: payment, orders, user permissions, migrations, core paths, or business-loss risk. Use the full workflow with stricter evidence and consider multiple implementation windows.

If a mistake would cause business damage, avoid single-window mode.

## Default Files

Use these files unless the user requests another location:

```text
docs/agent-team/
  task-spec.md
  worker-report.md
  review-report.md
  issues.json        # only when review finds issues
  evidence/          # only when screenshots, logs, responses, or other proof are needed
```

Keep files few and traceable. Put important content in files, not only in chat.

## Numbering

Number everything that will be handed between roles:

- Requirement: `REQ-001`
- Non-goal: `NON-001`
- Business rule: `RULE-BIZ-001`
- Permission rule: `RULE-AUTH-001`
- Data rule: `RULE-DATA-001`
- Implementation task: `TASK-001`
- Acceptance criterion: `AC-001`
- Issue: `ISSUE-001`

Later roles should cite IDs instead of repeating long requirement text.

## Requirements Analysis Role

Use this role when starting `M`, `L`, or `XL` work.

Do:

- Read only necessary context.
- Clarify background, goal, scope, and non-goals.
- Write business, permission, data, and boundary rules.
- Recommend implementation steps without writing code.
- Write executable acceptance criteria.
- Put uncertainty in "待确认事项".
- Ensure each `REQ` maps to at least one `AC`.

Do not:

- Write business code.
- Decide final acceptance.
- Use vague criteria such as "正常处理", "尽量优化", or "适配一下".

Output only `docs/agent-team/task-spec.md`.

Suggested sections:

```text
# Task Spec

## 背景和目标
## 本次范围
## 本次不做
## 业务规则
## 权限规则
## 数据规则
## 影响范围
## 推荐实现步骤
## 验收标准
## 待确认事项
```

## Implementation Role

Use this role after `task-spec.md` exists.

First read `docs/agent-team/task-spec.md`, then do an executability check:

```text
需求是否清晰：是 / 否
实现计划是否合理：是 / 否
验收标准是否可执行：是 / 否
是否需要补充：是 / 否
```

If the spec is not executable, stop coding and explain the missing information.

If executable:

- Implement only the requested scope.
- Do not change requirements.
- Do not lower acceptance standards.
- Do not do unrelated refactors.
- Run relevant self-tests.
- Record what changed and what remains risky.

Output `docs/agent-team/worker-report.md`.

Suggested sections:

```text
# Worker Report

## 可执行性复核
## 实现摘要
## 修改文件
## 覆盖范围
## 自测结果
## 未覆盖项
## 风险与验收关注点
```

Final response should say only that implementation and self-test are done and review is waiting. Do not claim independent acceptance.

## Review Role

Use this role after implementation.

Read:

- `docs/agent-team/task-spec.md`
- `docs/agent-team/worker-report.md`
- Current code diff
- Necessary test evidence

Do:

- Verify each `AC` by ID.
- Run necessary tests.
- Use browser verification for frontend behavior.
- Use requests for API behavior.
- Inspect data results for database work.
- Record commands, actions, evidence, expected results, and actual results.

Do not:

- Fix code.
- Change the spec.
- Give `PASS` without evidence.

Output `docs/agent-team/review-report.md`. If issues exist, also create `docs/agent-team/issues.json`.

Review conclusion must be one of:

- `PASS`
- `FAIL`
- `BLOCKED`

Suggested sections:

```text
# Review Report

## 验收结论
## 验收范围
## 执行命令和验证动作
## 逐项验收记录
## 问题摘要
## 最终说明
```

## Issue Loop

Create `issues.json` only when review finds problems. Use these statuses:

- `OPEN`: review found issue, waiting for fix.
- `FIXED_WAIT_RETEST`: implementation fixed it, waiting for review.
- `CLOSED`: review retested and passed.
- `BLOCKED`: blocked by external condition.
- `WONT_FIX`: explicitly accepted out of scope, with reason.

Rules:

- Only the review role may mark `CLOSED`.
- Implementation may only move `OPEN` to `FIXED_WAIT_RETEST`.
- `WONT_FIX` must include a reason.
- Every issue must bind to at least one `REQ` or `AC`.
- During rework, read only `issues.json`, related `REQ` / `AC`, and relevant code by default.

Example issue:

```json
[
  {
    "id": "ISSUE-001",
    "severity": "P1",
    "type": "权限",
    "status": "OPEN",
    "requirement": "REQ-003",
    "acceptance_item": "AC-003",
    "steps": ["使用无导出权限账号登录", "直接请求订单导出接口"],
    "expected": "接口拒绝访问",
    "actual": "接口返回导出文件",
    "evidence": ["docs/agent-team/evidence/export-auth-fail.log"],
    "suggestion": "后端导出接口补充权限校验"
  }
]
```

## Lightweight Single-Window Mode

Use this for `M` tasks or when the user does not want multiple conversations:

1. Write a short numbered spec in chat or `task-spec.md`.
2. Wait for confirmation if requirements are uncertain.
3. Implement.
4. Write `worker-report.md`.
5. Self-check each `AC`, but do not describe it as independent review.

## Copyable Prompts

Requirements window:

```text
你是需求分析窗口，只负责分析需求并写 docs/agent-team/task-spec.md。禁止写业务代码和做最终验收。请阅读必要上下文，判断任务等级，编号整理 REQ / NON / RULE / TASK / AC，不确定内容写入待确认事项，每个 REQ 至少对应一个可执行 AC。
```

Implementation window:

```text
你是工作实现窗口，只负责按 docs/agent-team/task-spec.md 实现并自测。先做可执行性复核；如果需要补充，停止编码并说明缺口；如果可以执行，再修改代码、自测并创建 docs/agent-team/worker-report.md。禁止改需求、降低验收标准、做无关重构或宣布验收通过。
```

Review window:

```text
你是验收窗口，只负责独立验收，不修代码。读取 docs/agent-team/task-spec.md、docs/agent-team/worker-report.md、当前代码 diff 和必要证据，按 AC 编号逐项验收。输出 docs/agent-team/review-report.md；有问题时创建 docs/agent-team/issues.json。最终结论只能是 PASS / FAIL / BLOCKED。
```
