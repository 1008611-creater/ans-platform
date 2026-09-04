# 自媒体 Skill 路由试跑结果

本文件记录当前部署批次的实际命令、构建输出和离线试跑结果。README 声明、未配置登录态的能力和未执行的线上操作不计为通过。

## 当前批次

- 日期：2026-08-03
- 部署根目录：`E:\codex\aisp\aidaihuo\.third-party\self-media-skill-route\repos`
- Skill 路由：`C:\Users\lsb\.codex\skills\self-media-skill-route`
- 账号、Cookie、Token、API Key：未写入
- 统一 Smoke：通过

## 结果表

| 项目 | 安装/构建 | 最小试跑 | 当前状态 |
|---|---|---|---|
| Agent-Reach | 独立 `.venv` 安装通过 | `--help`、`doctor` 通过；4/15 个渠道可用 | 已部署；基础网页、RSS、V2EX 可用，其他渠道按需配置登录态 |
| chubbyskills | 独立 `.venv` 已安装 `torch`、`torchaudio`、`funasr`、`faster-whisper`、`modelscope`、`mcp` 等依赖 | `quickstart --ephemeral`、示例输出、平台定义、semantic-lite、`mcp_workflow_demo.py`、`torch`/`torchaudio` 导入通过；`funasr` 导入在当前 Windows/Python 环境长时间无返回，已停止检查 | 已部署；离线知识库/MCP 可用，视频转录入口待兼容性处理，未下载模型 |
| visual-director-skill | Codex Plugin manifest 通过；内层 Skill 用 `quick_validate.py` 通过 | `SKILL.md` 和插件结构读取通过 | 已部署；按 Codex Skill 调用 |
| xiaohongshu-mcp | `go build ./...` 通过 | 构建通过；`go test ./...` 有 1 个上游 Windows 路径测试失败 | 已构建；待小红书登录态，未执行登录或发布 |
| douyin-upload-mcp-skill | `npm install`、Node 语法检查通过 | MCP 入口模块导入通过 | 已部署；待抖音登录态，未执行登录或发布 |
| douyin-mcp | 独立 `.venv` 安装通过；源码编译通过 | `doctor` 通过：schema、数据目录、浏览器和 Playwright 就绪 | 已部署；待抖音登录态，未读取真实作品数据 |
| clipforge | `pnpm install --frozen-lockfile`、`pnpm build` 通过 | `/api/health` 返回 200；首页返回 200 且包含 ClipForge | 已部署；生产构建和本地网页可用 |
| social-push | Skill 文件存在；`agent-browser --help` 通过 | 浏览器工具入口通过 | 已部署；仅保留草稿/人工确认路线 |
| socialforge | Codex Plugin manifest 校验退出码 0 | 插件结构读取通过 | 已部署；按内容日历、品牌资产和审核流程调用 |
| awesome-social-media-skills | 仓库读取通过 | 35 个 Skill 文件静态检查通过 | 已部署；作为组合参考库，不是常驻服务 |
| social-video-planner-skill | `SKILL.md` 和引用结构读取通过 | 可生成 content brief、script、outline、review 和 HyperFrames handoff 结构 | 已部署；纯 Skill，无独立服务 |
| chinese-sensitive-words-mcp | `npm install`、`npm run build`、`npm test` 通过 | 构建和测试通过 | 已部署；npm 报告 2 low、4 moderate、3 high 漏洞，未执行 `npm audit fix` |

## 已知失败和环境限制

### xiaohongshu-mcp

`go test ./...` 的唯一失败是 `cookies/TestGetCookiesFilePath/本地没有时兜底到tmp旧路径`：测试期望 Windows 临时目录中的 `cookies.json`，实际返回 `cookies.json`。这是上游仓库当前 Windows 路径测试问题，未修改第三方源码。

### chubbyskills

完整转录依赖已经安装，但在当前 Windows/Python 3.12 环境中，执行 `import funasr` 长时间无返回；为避免留下无输出进程，已停止本次导入检查。`torch`、`torchaudio`、MCP、CLI quickstart 和离线知识库工作流均已单独验证通过。没有下载 ASR 模型，也没有执行真实视频转录。

### clipforge

`pnpm test` 共 839 个通过、2 个失败：一个是 Windows 路径分隔符与 POSIX 断言不一致，另一个是绝对路径素材测试在 Windows 下进入 `fetch` 分支并报 `unknown scheme`。生产构建、健康接口和首页真实 HTTP 访问均已通过。

### 外部验证未执行项

- 小红书和抖音账号登录、扫码、短信验证和最终发布未执行。
- Agent-Reach 的 X、Instagram、Reddit 等需要登录态或额外配置的渠道未配置。
- 真实账号作品数据、线上内容表现和平台审核结果未读取。
- 没有任何凭证写入 Skill、日志、项目清单或测试报告。

## 本地访问

ClipForge 当前可通过 `http://127.0.0.1:3010` 访问；该端口是因为工作区已有服务占用 3000 而临时选择的隔离端口。若服务已停止，可在仓库目录运行 `pnpm exec next start -p 3010`。
