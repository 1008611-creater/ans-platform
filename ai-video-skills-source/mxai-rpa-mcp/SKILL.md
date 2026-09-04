---
name: mxai-rpa-mcp
description: 通过 MCP 工具驱动 MXAI（midjourney 中文镜像）生图：自动关闭广告弹窗、填提示词、生成、下载高清原图。当用户要在 MXAI 上出 MJ 图、下载高清结果、或处理 MXAI 页面弹窗时使用。
agent_created: true
---

# MXAI 生图自动化（MCP 版）

本技能把 MXAI 生图能力以 **MCP 工具** 暴露。Agent 通过 `mxai_*` 工具调用，无需直接拼 HTTP。
代码位于本目录 `scripts/`（含 `mxai_mcp_server.js` 与 `mxai_adapter.js`），node_modules 已随技能一并安装，开箱即用。

## 前置（一次性，由使用者本机完成）
- 已安装 Node ≥ 18；Edge 通道可用（`npx playwright install msedge`，或本机已有 Edge）。
- 在 WorkBuddy / Codex 的 `mcpServers` 中登记本 MCP server，指向 `node <本技能目录>/scripts/mxai_mcp_server.js`（见 `references/README.md` 的 config 片段）。
- `mxai_start` 会打开本机 Edge 窗口；**首次需在弹出的浏览器里手动登录自己的 mxai.cn 账号**（登录态保存在本机 profile，下次免登录）。

## 可用工具
- `mxai_start`：启动浏览器并进入生图页，自动清理广告/签到弹窗。返回 `loggedIn`。未登录时先让用户去浏览器手动登录。
- `mxai_status`：返回 `running` / `loggedIn`。
- `mxai_generate`：完整生图流程（填提示词→选参数→点生成→轮询→下载高清原图）。参数：`prompt`（必填，可含 `--v 8.2 --ar 9:16` 等）、`task_id`（结果文件名前缀）、`version`、`aspect`、`mode`、`timeout`。**生成是付费动作，调用即视为已获用户授权**。
- `mxai_download_latest`：下载最新结果。`via=button`（默认）走页面下载/预览逻辑取高清原图（整张 4 宫格，约 1856×2464）；`via=url` 仅缩略图兜底。
- `mxai_dismiss`：随时主动关闭残留弹窗。
- `mxai_diag`：输出页面 DOM 结构，用于排查页面改版。
- `mxai_close`：关闭浏览器释放资源。

## 典型工作流
1. 不确定是否已登录 → 调 `mxai_status`；若 `running:false` 或 `loggedIn:false` → 调 `mxai_start`。
2. 用户给出提示词（含 MJ 参数）→ 调 `mxai_generate`（带 `task_id` 便于归档）。返回里 `images` 为下载到本机 `.automation/results/` 的文件路径。
3. 若想单独补下载 → `mxai_download_latest`（`task_id` 与生成时一致）。
4. 结束或长时间不用 → `mxai_close`。

## 安全与边界
- **本地只读自动化，不绕过验证码/风控/权限**。遇到真人校验，停止并提示用户手动处理。
- 生成消耗积分 = 付费动作，**必须用户当次明确授权**后才调 `mxai_generate`。
- 浏览器默认 `headless:false`，需使用者本机带桌面环境；不要在无显示服务器上强开。
- 登录态/凭据只存本机 profile（默认 `scripts/.browser-profile`），不外传。
- 环境变量可覆盖：`MXAI_URL`（生图页地址/各自邀请链接）、`MXAI_HEADLESS`（true/false）、`MXAI_PROFILE`（profile 目录）。

## 故障排查
- `mxai_start` 超时：客户端可能默认工具超时太短（生成/启动可达分钟级）。在调用侧把工具超时调大（≥120s）。
- 页面改版导致选择器失效：`mxai_diag` 看结构，回退用 `via=url` 下载缩略图，并上报维护者。
- 弹出窗口被误判/漏关：先 `mxai_dismiss` 再操作。
