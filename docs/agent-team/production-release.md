# ANS 生产发布与恢复门禁

此记录适用于 `/srv/ans-platform`，不表示下列生产操作已经执行。主机共享旧站数据库，发布负责人必须逐项留存证据。

## 发布前

1. 严格校验 SSH 主机指纹。当前默认 known_hosts 的 ED25519 指纹已与服务端响应一致，旧别名专用 known_hosts 过期；不得关闭主机校验。登录仍需有效授权凭据。
2. 核对 `git status --short`、`git rev-parse HEAD`、`docker ps`、`docker inspect ans-platform-app`（只选择 Image、Config.Image、State.Health.Status、端口；不要打印 Env）。记录旧 commit、镜像 ID，给旧镜像追加本次唯一 rollback 标签。
3. 用容器内脚本逐项输出 configured/missing：RUN_BASE_URL、RUN_API_KEY、TURNSTILE_SECRET_KEY、NEXT_PUBLIC_TURNSTILE_SITE_KEY、RESEND_API_KEY、EMAIL_FROM、TEMPLATE_REVIEW_BASE_URL、TEMPLATE_REVIEW_API_KEY、TEMPLATE_REVIEW_MODEL。不打印值或完整 compose config。
4. 若 tracked 文件脏，`umask 077` 后分别保存 staged/unstaged 的 binary patch、改动文件清单，并确认非空可读；评估本地修改已被目标版本覆盖后才恢复对应文件。所有未跟踪文件、`.env.bak*`、`backups/` 保留。禁止 `git clean`。
5. `git fetch origin main`，核对目标 SHA；只允许 `git pull --ff-only origin main`。出现分叉停止并处理，不能强推。

## 数据库门禁

入口 `docker/entrypoint.sh` 在启动时自动运行迁移，所以即使只重建应用容器也不能跳过此步骤。

1. 在 `prompts-chat-db` 对 `prompts_chat` 运行 `pg_dump -U prompts -d prompts_chat -Fc`，先写容器临时文件，再 `docker cp` 到服务器 `backups/` 本次独立目录（权限 0700，文件 0600）。不要输出数据内容。
2. 记录备份字节数和 SHA-256；`pg_restore --list` 只能证明目录可读，不能当作恢复成功。
3. 在单独隔离 PostgreSQL 16 实例恢复此备份，不暴露宿主网络端口；恢复失败立即停止。核对关键表、约束、行数与迁移记录。保留恢复验证结果，不输出用户数据。
4. 查询生产 `_prisma_migrations` 与仓库 migration 名称及 checksum；检查是否存在失败或未完成迁移。确认待迁移 SQL 不破坏旧站兼容性后才执行。
5. 不做 `db push`、`migrate reset` 或破坏性回退。数据库不兼容问题默认向前修复；从备份覆盖生产必须单独设计停写、数据合并和旧站协调方案。

## 构建与上线

1. 本地目标版本 lint、相关测试、隔离集成、build 必须有真实退出码。全量旧测试失败独立列明，不能静默忽略或改测试凑绿。
2. 服务器后台运行 `docker compose -f compose.yml build app`，日志写本次唯一位置；同时记录 PID 与最终退出码文件，轮询不超过每分钟一次。npm 网络故障重试同版本依赖。
3. 构建完成必须核验退出码 0 和 `ans-platform:latest` 新镜像 ID；不得构建或改标旧站镜像。
4. `docker compose -f docker-compose.yml up -d app`；轮询到 `ans-platform-app` healthy。记录运行镜像 ID、HEAD、开始时间。
5. 检查 `/api/health` 的 status=healthy、database=connected；登录/注册页三个眼睛点击、失焦、刷新验证；人工 CAPTCHA/真实邮箱闭环只在实际完成后勾选。
6. 检查模板公开列表、授权用户创建/提交/复核流程与审计；测试数据必须明确标识且禁止冒用真实用户。

## 回滚与观察

- 应用失败且数据库保持向后兼容时，以留存的旧镜像 ID 恢复 `ans-platform:latest`，运行既定 compose 启动并复验 health；记录失败版本和证据。
- 迁移失败不能盲目反复重启，也不能自动还原共用生产库。先保留日志并确认迁移状态。
- 完成后记录 GitHub SHA、服务器 SHA、镜像 ID、备份及恢复结果、变量状态、测试与浏览器证据。未观测的 24 小时稳定性保持未验收，不虚构观察结果。
