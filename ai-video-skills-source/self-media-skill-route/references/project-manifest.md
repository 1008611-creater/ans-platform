# 自媒体 Skill 路由项目清单

部署根目录：`E:\codex\aisp\aidaihuo\.third-party\self-media-skill-route\repos`

仓库源码只作为本地第三方依赖保存，更新时在对应仓库内执行 `git pull --ff-only`，不要复制进 Skill 目录。

| 项目 | 本地目录 | 类型 | 主要用途 | 许可证 | 外部条件 |
|---|---|---|---|---|---|
| [Agent-Reach](https://github.com/Panniantong/Agent-Reach) | `agent-reach` | Python CLI / Skill | 全网和小红书等平台研究、搜索、阅读 | MIT | 部分平台需要登录态或浏览器 |
| [chubbyskills](https://github.com/chubbyguan/chubbyskills) | `chubbyskills` | 多个 Skill / Python 工具 | 中文内容采集、转录、爆款拆解、知识库 | MIT | 视频转录需要较重 ASR 依赖 |
| [visual-director-skill](https://github.com/ymh3753201/visual-director-skill) | `visual-director-skill` | Codex Plugin / Skill | 小红书图文、抖音封面、视觉方案、发布包装 | MIT | 图片最终生成依赖外部图像工具或 Provider |
| [xiaohongshu-mcp](https://github.com/xpzouying/xiaohongshu-mcp) | `xiaohongshu-mcp` | Go MCP / HTTP | 小红书搜索、读取、图文/视频发布、互动 | Apache-2.0 | 本地 Chrome 登录态，平台页面可能变化 |
| [douyin-upload-mcp-skill](https://github.com/WJZ-P/douyin-upload-mcp-skill) | `douyin-upload-mcp-skill` | Node MCP / CDP | 抖音视频和图文上传发布 | AGPL-3.0 | Chrome、登录态、可见浏览器和人工确认 |
| [douyin-mcp](https://github.com/Kuhakucai/douyin-mcp) | `douyin-mcp` | Python MCP / Playwright | 抖音作品数据、口播文案、复盘 | AGPL-3.0 | Python 3.11、Chrome、登录态；ASR 可选 |
| [clipforge](https://github.com/xixihhhh/clipforge) | `clipforge` | Next.js / MCP / CLI | 脚本、素材、配音、字幕、视频合成、多平台导出 | AGPL-3.0 | Node 20、pnpm 10；AI Provider 可选 |
| [social-push](https://github.com/jihe520/social-push) | `social-push` | Browser Skill | 小红书等平台草稿发布和浏览器操作 | 未声明 | agent-browser、Chromium、浏览器登录态 |
| [socialforge](https://github.com/indranilbanerjee/socialforge) | `socialforge` | Codex Plugin / 16 Skills | 品牌资产、内容日历、多平台创作、审核交付 | MIT | 部分图片/视频连接器需要 Provider |
| [content-pilot](https://github.com/r04943083/content-pilot) | `content-pilot` | Python / NiceGUI Web GUI | 中文平台内容生成、草稿审核、发布看板、定时任务；当前覆盖小红书、抖音、B 站、微博 | MIT | AI 生成需要 Provider；平台发布需要用户扫码登录；当前不含快手 |
| [awesome-social-media-skills](https://github.com/replynodes/awesome-social-media-skills) | `awesome-social-media-skills` | Skill 集合 | 研究、改写、发布审核、分析的组合参考 | MIT | 只读参考，不是常驻服务 |
| [social-video-planner-skill](https://github.com/AnsirStudio/social-video-planner-skill) | `social-video-planner-skill` | Codex Skill | 文章到口播稿、镜头大纲、事实审核、视频交接包 | 未声明 | HyperFrames 或其他下游制作工具可选 |
| [chinese-sensitive-words-mcp](https://github.com/CCCpan/chinese-sensitive-words-mcp) | `chinese-sensitive-words-mcp` | Node MCP | 小红书、抖音、快手、B 站敏感词检查 | MIT | 只能作为辅助检查，不等于平台审核 |

## 状态定义

- `已克隆`：源码完整存在并能读取 Git 提交。
- `已安装`：依赖安装成功。
- `已构建`：项目自身构建或编译成功。
- `离线试跑通过`：不需要登录、Cookie、API Key 的真实命令已通过。
- `待登录/配置`：安装和本地检查可完成，但真实平台能力需要用户登录或 Provider。
- `阻塞`：当前环境缺少必要运行时，或上游项目自身无法完成最小检查。

## 许可证提醒

AGPL 项目用于 SaaS、再分发或修改后发布前，需要单独检查源码披露义务。所有项目都与抖音、小红书无官方关联，使用平台自动化能力前要遵守平台条款。
