# ANS 分阶段交付任务

## 目标与约束

- REQ-001：按 P0 → P1 → P2 → P3 → P4 门禁推进；代码、测试、生产证据分别记录，不能凭旧文档勾选推断生产状态。
- REQ-002：P0 登录、注册密码、确认密码使用常显可访问控件；显示/隐藏和失焦不丢按钮；密码管理与密码校验不变。
- REQ-003：验证注册、密码重置、匿名身份、签到、邀请码与权限；修复重置无限尝试与非原子消费问题。
- REQ-004：生产发布前核验 SSH 身份、HEAD、容器、变量 configured/missing、迁移；先 pg_dump 并在隔离库验证恢复再运行迁移。
- REQ-005：通过本地与生产门禁后推进下一阶段；P4 候选能力以真实 P2/P3 数据决定，不预先实现收费。
- RULE-DATA-001：ANS 与旧站共库；不删除生产数据，不重置，不打印或修改凭据；保留备份和未跟踪文件。补丁必须先保存再处理服务器改动。
- RULE-DEPLOY-001：构建 `docker compose -f compose.yml build app`；运行 `docker compose -f docker-compose.yml up -d app`；镜像仅 `ans-platform:latest`。入口会执行迁移，重建容器也必须在数据库备份门禁之后。
- NON-001：不覆盖 AGENTS.md、用户改动或配置；不强推历史。缺访问凭据不绕过认证。

## 分工

- 根线程：交接资料、生产访问、发布流程、完整 diff、最终验证和验收。
- p0_worker（Luna）：密码控件及组件测试。
- reset_worker（Luna）：密码重置两个 API、独立服务及测试。
- p1_explorer（Luna，只读）：P1 与后续阶段真实差距。
- 新上下文 reviewer（只读）：最终结论 ship / fix-first / rethink；有问题修复后重新审查。

## 验收

- AC-001 / REQ-002：三个输入框有正确 label 关联，点击两次恢复 password，失焦仍有按钮，刷新默认隐藏，autocomplete 保留；组件测试和真实浏览器验证。
- AC-002 / REQ-003：重置冷却、尝试限制、过期/重复消费、配送失败清理、事务失败不消耗验证码有测试；注册/社区/身份/P1 定向测试通过。
- AC-003 / REQ-001：执行 `npm run lint`、全量 Vitest、隔离 DB 集成与带测试 DATABASE_URL/DIRECT_URL 的 `npm run build`，记录准确数量和历史失败，不降低门禁。
- AC-004 / REQ-004：SSH 读到真实版本/状态，备份可恢复，迁移状态核验，生产目标 commit 对齐；/api/health 与浏览器核心路径均通过。
- AC-005 / REQ-005：P0/P1 未验收时不将 P2–P4 标为交付；外部条件阻塞写明证据与恢复步骤。

## 原始资料

已读取仓库 AGENTS.md、P0/P1 规范及 `E:/WORKBUDDY/2026-08-27-06-01-25/ANS-handoff-20260907.zip` 内 00/01/02/03/05/06 文档。旧交接资料只作历史证据，当前状态以重跑结果为准。
