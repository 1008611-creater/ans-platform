# 项目清单

| 项目 | 上游仓库 | 本地目录 | 当前版本 | 本地入口 |
| --- | --- | --- | --- | --- |
| WorldMonitor | https://github.com/koala73/worldmonitor | `E:\codex\aisp\aidaihuo\github-selected-projects\worldmonitor-upstream` | `ab798e6` | `http://127.0.0.1:3000` |
| DeepTutor | https://github.com/HKUDS/DeepTutor | `E:\codex\aisp\aidaihuo\github-selected-projects\deeptutor` | `44fa7a1` | `http://127.0.0.1:3782` |
| code-review-graph | https://github.com/tirth8205/code-review-graph | `E:\codex\aisp\aidaihuo\github-selected-projects\code-review-graph` | `1a010de` | CLI/MCP，不提供网页 |
| OfficeCLI | https://github.com/officecli/officecli | `E:\codex\aisp\aidaihuo\github-selected-projects\officecli` | `8cd8bd0` | `officecli` CLI |
| Archscribe | https://github.com/lazypay/Archscribe | `E:\codex\aisp\aidaihuo\github-selected-projects\archscribe` | `46ea42c` | Python 渲染器，不提供网页 |

## 运行时

- WorldMonitor 使用 Node.js 22+，当前本机 Node.js 24；开发服务器默认端口为 3000。
- DeepTutor 使用 Docker Compose 的 `docker-compose.ghcr.yml`，项目名固定为 `github-deeptutor`，前端端口 3782、后端端口 8001。
- code-review-graph 使用 `code-review-graph\.venv\Scripts\code-review-graph.exe`，当前环境为 Python 3.13；其图数据位于目标仓库的 `.code-review-graph`。
- OfficeCLI 使用全局 npm 包 `officecli@0.2.121`，当前命令为 `C:\Users\lsb\AppData\Roaming\npm\officecli.cmd`；配置文件位于 `%APPDATA%\officecli\config.json`，默认输出目录为工作区下的 `output`。
- Archscribe 使用项目内 `archscribe\.venv\Scripts\python.exe`，当前已安装 Pillow、svg.path、Playwright 和 Chromium；`ffmpeg` 已可用。输出写入用户指定的 `--outdir` 目录。
