# ANS 双机协同主控手册（本机大脑 + 远端员工执行器）

## 一、 角色定位与绝对权限边界

| 角色 | 所在设备 | 核心职责（只做什么） | 严禁越界（绝不做什么） |
| :--- | :--- | :--- | :--- |
| **ANS 总控大脑 (Brain)** | **当前这台 Mac**<br>工作区：`/Users/eeo/Downloads/ans/ans-release-master` | 1. 统筹全局任务排期与上线批次<br>2. 独立执行代码 Diff 审查（单 SHA 仅审一次）、UTF-8 BOM/JSON 规范扫描<br>3. 秒解分支冲突、合入并推送 `origin/main`<br>4. 给远端员工下发「单步精确工单」并验收回执 | 不在本地跑重型 Docker 数据库，不阻塞日常开发目录 `/Users/eeo/Downloads/ans/ans-platform` |
| **执行器员工 (Worker)** | **另一台电脑**<br>（具备 Docker 隔离库 + 生产 SSH 权限） | 1. 接收大脑下发的指定 Commit SHA（如 `4b088034`）<br>2. 执行指定测试/构建/生产部署/线上冒烟<br>3. 按标准格式输出 5 行《执行回执》并同步远端状态分支 | **严禁**自行发起 `R31/R32 review` 子代理<br>**严禁**在发布线程内自行决定修改业务代码<br>**严禁**未经大脑指令重跑全量 92 项数据库迁移 |

---

## 二、 完整闭环工作流（4 步流水线）

1. **Step 1 · 大脑审码与合流（本机，耗时 < 1 分钟）**
   - 大脑在 `/Users/eeo/Downloads/ans/ans-release-master` 拉取远端待合入分支，完成单次 Diff 审查、清理解冲突、合入 `origin/main`，锁定唯一的目标 Commit SHA（例如 `4b088034`）。
2. **Step 2 · 大脑推送远端发版信号灯 `ops/deploy-target`（免复制粘贴工单）**
   - 大脑在 GitHub Actions 门禁通过后，直接将目标 SHA 强推至远端信号分支：
     `git push origin <TARGET_SHA>:refs/heads/ops/deploy-target --force`
3. **Step 3 · 员工自动监听或一句话触发（远端执行）**
   - **全自动轮询模式**：远端员工（或生产机 Cron）每 60 秒比对 `git ls-remote origin refs/heads/ops/deploy-target refs/heads/ops/prod-live`，一旦发现 `deploy-target != prod-live`，自动检出 `ops/deploy-target`（或拉取已构建好的 `ghcr.io/1008611-creater/ans-platform:main` 镜像）、执行 `npx prisma migrate deploy`、重启生产服务并跑 `npm run audit:online`。
   - **极简口令模式**：你在另一台电脑只需输入 2 个字「**上线**」，远端员工自动读取 `origin/ops/deploy-target` 指向的 Commit SHA 执行上线，无需复制任何工单文本。
4. **Step 4 · 远端回写信号灯与大脑自动归档**
   - 员工部署验收成功后，立即执行：
     `git push origin HEAD:refs/heads/ops/prod-live --force`
   - 本机大脑通过 `git ls-remote origin "refs/heads/ops/*"` 即可自动核验 `ops/prod-live == ops/deploy-target` 并在本机直跑 `npm run audit:online` 完成线上终验。
