# mxai-rpa-mcp — MXAI 生图自动化（MCP 技能包）

把 MXAI（midjourney 中文镜像）生图能力以 **MCP 工具** 暴露，供 WorkBuddy / Codex 等支持 MCP 的客户端直接调用。
团队分发形态：**各自在自己的电脑上跑一份**，各自登录自己的 mxai.cn 账号（积分各自承担，互不共享）。

> 浏览器默认 `headless:false`，**需要使用者本机带桌面环境**，且首次需在弹出的 Edge 窗口里手动登录一次。

本技能包目录结构：

```text
mxai-rpa-mcp/
├── SKILL.md              # Agent 使用说明（客户端 Agent 读它来调工具）
├── references/README.md  # 本文件：成员安装与 mcpServers 配置
└── scripts/              # 实际运行代码
    ├── mxai_mcp_server.js  # MCP stdio server 入口
    ├── mxai_adapter.js     # Playwright 适配器（弹窗关闭/生图/下载）
    ├── package.json
    ├── test/               # mcp_smoke.js / mcp_e2e.js 联调脚本
    └── node_modules/       # 已随包附带；若缺失请 npm install
```

---

## 1. 成员本机安装（一次性）

技能包已自带 `node_modules`，通常无需安装。若目录损坏或你删过 `node_modules`，再执行：

```bash
cd mxai-rpa-mcp/scripts
npm install                    # 安装 playwright + @modelcontextprotocol/sdk
npx playwright install msedge  # 若本机没有 Edge 通道则装一次
```

依赖已在 `scripts/package.json` 中声明：`playwright`、`@modelcontextprotocol/sdk`、`zod`。

---

## 2. 在客户端登记 MCP server

把下面配置加进你所用客户端的 `mcpServers`（路径换成你本机的**绝对路径**，指到 `scripts/mxai_mcp_server.js`）。

### WorkBuddy / Codex（通用 mcpServers 片段）

```json
{
  "mcpServers": {
    "mxai": {
      "command": "node",
      "args": ["/绝对路径/mxai-rpa-mcp/scripts/mxai_mcp_server.js"],
      "env": {
        "MXAI_URL": "https://www.mxai.cn/home/?mp=mjdrawai&from=invite&invite_id=你的邀请ID#/mj"
      }
    }
  }
}
```

- `MXAI_URL` 可选：留默认即可；想用**自己的邀请链接/账号**就改成自己的。
- `MXAI_HEADLESS` 可选：`true` / `false`（默认 false，需桌面）。
- `MXAI_PROFILE` 可选：浏览器 profile 目录（默认 `scripts/.browser-profile`）。

登记后重启客户端，确认 `mxai_*` 工具可见（如 `mxai_start`、`mxai_generate`、`mxai_download_latest`）。

---

## 3. 使用

客户端里的 Agent 读取本目录 `SKILL.md` 后，即可通过工具驱动：

1. `mxai_start` —— 启动并进入生图页、自动关广告弹窗；首次弹出浏览器请手动登录。
2. `mxai_generate` —— 给提示词（可带 `--v 8.2 --ar 9:16 --stylize 250`），生图并自动下载高清原图到 `.automation/results/`。
3. `mxai_download_latest` —— 单独下载最新结果（`via=button` 取高清整图）。
4. `mxai_close` —— 用完关浏览器。

---

## 4. 工具清单

| 工具 | 作用 |
|---|---|
| `mxai_start` | 启动浏览器 + 进生图页 + 自动关弹窗，返回登录态 |
| `mxai_status` | 返回 `running` / `loggedIn` |
| `mxai_generate` | 完整生图流程（含下载高清原图），付费动作需用户授权 |
| `mxai_download_latest` | 下载最新结果（高清整图 / 缩略图兜底） |
| `mxai_dismiss` | 主动关闭残留弹窗 |
| `mxai_diag` | 输出页面 DOM 结构，排查页面改版 |
| `mxai_close` | 关闭浏览器 |

---

## 5. 安全边界（务必遵守）

- **本地只读自动化，不绕过验证码/风控/权限**。遇真人校验即停，提示用户手动处理。
- 生图消耗积分 = **付费动作**，Agent 调用 `mxai_generate` 前必须得到用户当次明确授权。
- 登录态/凭据只存本机 profile，**不外传、不共享账号**。
- stdout 是 MCP 协议通道；适配器日志已重定向到 stderr，勿改回 `console.log`。

---

## 6. 本地调试（可选）

```bash
cd mxai-rpa-mcp/scripts
node test/mcp_smoke.js   # 不启动浏览器，验证工具注册与传输
node test/mcp_e2e.js     # 真实启动浏览器验证链路（用独立测试 profile，不污染登录态）
```
