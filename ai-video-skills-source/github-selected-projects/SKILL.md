---
name: github-selected-projects
description: name: github-selected-projects
---

---
name: github-selected-projects
description: Manage and run the local GitHub selected-project bundle containing WorldMonitor, DeepTutor, code-review-graph, OfficeCLI, and Archscribe. Use when the user asks to inspect, install, start, stop, check, index, render, or use any of these projects locally, or asks to add another GitHub project to this local bundle.
---

# GitHub 精选项目

使用本 Skill 管理工作区中的五个上游项目。先读取 `references/projects.md`，确认路径和当前上游版本，再使用 `scripts/status.ps1` 检查真实状态；需要启动 WorldMonitor 或 DeepTutor 时使用 `scripts/start.ps1`，需要停止时使用 `scripts/stop.ps1`。

## 项目入口

- `WorldMonitor`: TypeScript/Vite 全球态势仪表盘。默认地址为 `http://127.0.0.1:3000`，不配置密钥也能打开基础面板。
- `DeepTutor`: Python 学习助手。默认使用官方 GHCR 镜像，前端地址为 `http://127.0.0.1:3782`，后端健康地址为 `http://127.0.0.1:8001`。真正调用模型前必须在其设置页面配置一个模型提供商。
- `code-review-graph`: 本地代码知识图谱和 MCP 服务。它不是浏览器网页；先用 `scripts/build-graph.ps1 -RepoPath <repo>` 建图，再用 `status`、`detect-changes --brief` 或 MCP 客户端使用。
- `OfficeCLI`: 本地 Office 文档生成 CLI。使用 `officecli new docx|xlsx|pptx|report|img ...` 生成可编辑文件；默认使用官方 Hosted 匿名模式，也支持配置自己的外部模型运行时。
- `Archscribe`: Python 本地架构图渲染器。输入 JSON spec，输出 Excalidraw、PNG、GIF、MP4、SVG 或 HTML；它是一次性命令，不提供常驻网页服务。

## 工作流

1. 读取 `references/projects.md`，不要凭记忆替换上游仓库或版本。
2. 运行 `scripts/status.ps1`，区分已启动、已安装、已建图、OfficeCLI 配置和缺少模型配置。
3. 运行 `scripts/start.ps1` 启动 WorldMonitor 和 DeepTutor；脚本会写入各自项目下的本地日志，不输出密钥。
4. 对需要代码分析的仓库运行 `scripts/build-graph.ps1 -RepoPath <repo>`，然后运行 `code-review-graph status` 验证索引。
5. 通过 HTTP 页面、健康接口或 CLI 结果验证真实可用路径；不要把安装成功或 Docker 拉取成功当成用户交付。
6. OfficeCLI 生成文件时优先使用 `--no-publish` 做本地交付；需要联网 Hosted 模式或自有模型时，先检查 `officecli config status`，不要把匿名额度或付费密钥写入 Skill。
   - 配置 External 模型时，先用进程级 `OFFICE_CLI_RUNTIME_MODE`、`OFFICE_CLI_LLM_BASE_URL`、`OFFICE_CLI_LLM_API_KEY` 和 `OFFICE_CLI_LLM_MODEL` 做一次真实 `new docx ... --no-publish` 验证；成功后再用 `officecli config set-runtime external` 与 `officecli config set-generation` 固化地址和凭据，最后回读配置并在不设置模型环境变量的情况下再次生成验证。
   - `config set-generation` 可能把模型保留为默认值；需检查 `%APPDATA%\officecli\config.json` 的 `llm.model`，将其设为实际模型 ID，并保持 `defaults.mode=best`。不把凭据或验证文件复制进 Skill。
   - 在 Windows 工作区运行 OfficeCLI 附带的 `.sh` 检查/修复脚本时，只对临时副本做 LF 换行转换；以 PowerShell 下 `officecli config status` 和 `%APPDATA%\officecli\config.json` 为配置真值，Bash 子环境的 `$HOME` 配置只作辅助诊断，不覆盖 Windows CLI 结果。
7. Archscribe 使用项目内 `.venv\Scripts\python.exe`；先运行 `scripts\doctor.py` 检查浏览器和发布依赖，再用 `scripts\archscribe-render.ps1` 或上游渲染脚本生成结果。

## 约束

- 保留上游仓库的许可证和源码，不把第三方源码复制进本 Skill。
- 不在 Skill、日志、命令输出或仓库文件中保存 API 密钥、访问令牌或私有 URL。
- DeepTutor 的模型配置属于运行时用户设置；没有模型配置时仍可验证页面和后端启动，但不能声称对话能力已验证。
- `code-review-graph` 的图数据写在目标仓库的 `.code-review-graph/` 中；只有用户明确要求时才运行卸载或删除操作。
- OfficeCLI 的生成结果应写入项目输出目录或用户指定的 `--out` 目录；使用 `--no-publish` 可避免在线发布。不要把 API Key、Hosted session 或生成结果复制进本 Skill。
- Archscribe 的输出应写入项目目录或用户指定的 `--outdir`；不要把输出文件、浏览器缓存或虚拟环境复制进本 Skill。

## 可复现命令

```powershell
& 'C:\Users\lsb\.codex\skills\github-selected-projects\scripts\status.ps1'
& 'C:\Users\lsb\.codex\skills\github-selected-projects\scripts\start.ps1'
& 'C:\Users\lsb\.codex\skills\github-selected-projects\scripts\build-graph.ps1' -RepoPath 'E:\codex\aisp\aidaihuo'
officecli --version
officecli config status
& 'C:\Users\lsb\.codex\skills\github-selected-projects\scripts\archscribe-render.ps1' -Spec 'assets\default-spec.json' -OutDir 'outputs' -BaseName 'diagram' -Formats 'png'
& 'C:\Users\lsb\.codex\skills\github-selected-projects\scripts\stop.ps1'
```
