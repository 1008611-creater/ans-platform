# P0 发布候选实施记录 · 2026-09-10

## 实现

- 共享 PasswordInput 修复三个密码控件，真实 input 承载 label/ref/aria；按钮固定定位、背景和点击区，保留密码管理，抑制原生 reveal。
- 重置新增 PostgreSQL advisory lock、请求冷却与限次、猜码锁定、邮箱绑定 HMAC、旧码兼容；消费和更新同事务，成功使同邮箱其他重置码失效。未改密码长度校验、未改 schema、未加依赖。
- 补充密码重置和登录组件测试、注册组件交互测试，以及三项真实 PostgreSQL 重置场景。
- 读取原始交接 ZIP，纠正此前“注册测试不存在”“构建失败是历史问题”的错误结论；生产数据库迁移状态不能由旧文档推断。
- 修正文档 config GET、模板编辑 PATCH、审核 PASS/BLOCKED/UNAVAILABLE 契约，加入生产备份/恢复/回滚门禁。

## 根线程验证

| 命令或操作 | 结果 |
|---|---|
| `npm run lint` | 退出 0；0 errors、231 warnings |
| auth/password-reset 文件与新增测试的定向 `npx eslint` | 通过 |
| `npx vitest run`（JSON 报告） | 1070 tests：1032 通过、38 失败；9 个失败文件 |
| 登录/注册/密码重置/社区 API/模板 API/模板审核/模板 UI 定向 Vitest | 8 文件，150 tests 通过 |
| `npx vitest run --config tests/ans-p0p1.vitest.config.ts` | 12 场景 PASS、0 FAIL、1 SKIP；外层 Vitest 1 test 通过 |
| 设置 DATABASE_URL 与 DIRECT_URL 为 `postgresql://postgres:postgres@127.0.0.1:55437/ans_integration?schema=public` 后 `npm run build` | 最终构建退出 0 |
| `git diff --check` | 通过 |

全量失败位于 admin-categories、admin-prompts、admin-tags、admin-users、mcp-handler、prompts-id、prompts、search、user-api-key。38 个失败与本轮修复前运行及交接基线一致；未修改这些测试来降低标准。全量不是全绿。

隔离库新增重置场景真实观测 2 个 advisory lock 等待者、双请求仅一次成功；8 个并发错误码请求触发限制；用户更新失败令验证码消费回滚。Profile 昵称锁因完整认证上下文按既有设计跳过，不将其记为通过。

## 浏览器证据

- 使用 Codex 浏览器；DOM/Playwright 读取超时后，改用同一浏览器文档支持的 screenshot + cua。
- 本地 `127.0.0.1:3017/login`：眼睛常显、测试字符串显示/隐藏、点空白后保留、刷新默认隐藏，截图确认。
- 本地 `/register`：密码和确认密码均完成上述检查，截图确认。本地缺邮件/人机配置显示注册服务未配置，未提交注册或发送邮件。
- 生产 `/register` 和 `/login` 已截图：当前看不到自定义眼睛；注册页面显示人机验证出错。不能作为发布通过证据。
- 生产 `/api/health` 在 2026-09-10T00:24:02Z 返回 status=healthy、database=connected。

## 生产阻塞与阶段状态

默认 known_hosts 指纹已与 SSH 服务端核对一致；旧别名使用过期专用记录。两把本地候选部署密钥均被拒绝，未使用未知密码、未关闭主机校验。已请用户提供授权凭据位置，尚未获得。

因此服务器 HEAD、容器、运行镜像、变量 configured/missing、迁移状态尚未读取；未 pg_dump、未迁移、未构建生产镜像、未重启。P0 生产未验收，P1 只有本地测试证据，P2–P4 不越过阶段门禁启动。原始交接提到公益/中文/匿名及 P4 独立 Flow/Ops；收费仍仅是最新路线的候选，不能擅自启用。

日志位于 gitignore 的 `.workbuddy/`：`build-final-20260910.log`、`lint-final-20260910.log`、`full-tests-final-20260910.json`、`target-final-20260910.log`、`integration-final-20260910.log`。原始日志不进仓库。
