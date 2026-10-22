## 根本问题

学生点进项目后，「先完成这三份」要他自己找到三张卡、逐个点「生成草稿」。
平台把最后一步留给了用户 —— 这一步本该由 Agent 替他走。

## 本 PR 让 Agent 走完这一步

```
学生在项目页说：把这三份产物跑出来
→ Agent 调 run_project_pack
→ 未确认 → 只报价，不执行不扣费
→ 回「可以 / 执行」→ 真跑（复用现有 runProjectPack）
→ 产物 + 可点链接 + 账单
```

## 三个文件

| 文件 | 作用 |
|---|---|
| `src/server/companion/project-pack.ts`（新） | 工具实现：两道闸门 + 真实执行 + 诚实结果 |
| `src/server/companion/tools.ts` | 注册工具 + 执行分支（项目 id **只从 pathname 取**） |
| `src/__tests__/lib/companion-project-pack.test.ts`（新） | 6 条测试：闸门 + 成功/部分/失败 + 机器码透传 |

## 两道不可绕过的闸门

1. **NOT_ON_PROJECT**：不在项目详情页 → 直接拒绝，绝不动执行链；
2. **CONFIRM_REQUIRED**：用户消息没有明确短句确认（可以/行/确认/执行/ok/go…）→ 只报价、不执行、不扣费。
   复用现有 `isExplicitChargeConfirmation`，界面无法伪造。

## 复用而非重造

执行 = 现有 `runProjectPack`（`loadOwned` 强制校验归属）；计费 = 现有工作流结算；确认 = 现有短句确认。**未改任何计费语义。**

## 验证

```
npx vitest run src/__tests__/lib/companion-project-pack.test.ts   → 6 passed
npm run typecheck                                                 → 0 errors
npx eslint <changed>                                              → 0 problems
```

**反证**：把 `if (!userConfirmed)` 改成 `if (false)` → 测试变红；恢复后变绿。

## 未验证（部署后补）

线上真实一次端到端（会产生积分消耗）：需部署后在项目页实际说一句并确认。