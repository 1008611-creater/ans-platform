feat(agent): 让 Agent 真的替用户跑完项目三份产物（run_project_pack）

根本问题：学生点进项目后，要自己找到三张卡、逐个点「生成草稿」；这一步本该由 Agent 替他走。

- 新工具 run_project_pack：注册进 AGENT_TOOLS，模型可调用
- 两道闸门：不在项目页 → NOT_ON_PROJECT；未明确短句确认 → CONFIRM_REQUIRED（不执行、不扣费）
- 执行复用 runProjectPack，归属由 loadOwned 强制校验，Agent 不能替别人跑
- 部分成功/全部失败都诚实报出；无产出不按产出扣费
- 6 条测试；反证：改坏确认闸门后测试变红（已验证）

验证：vitest 6/6；typecheck 0 错误；eslint 0 问题。