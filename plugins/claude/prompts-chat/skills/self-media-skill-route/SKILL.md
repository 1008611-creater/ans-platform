---
name: self-media-skill-route
description: name: self-media-skill-route
---

---
name: self-media-skill-route
description: Use this route when turning a project, article, video, screenshot, product, or technical result into publishable Chinese social-media content for Xiaohongshu or Douyin. It coordinates research, content ingestion, visual planning, script planning, compliance checks, draft publishing, and performance review through the locally deployed projects in this route.
---

# 自媒体 Skill 路由

把用户已有的成果变成可传播内容，并保持一条可复用的闭环：

```text
真实素材 -> 研究与采集 -> 内容角度 -> 图文/视频方案 -> 风险检查 -> 人工确认 -> 发布 -> 数据复盘
```

## 路由规则

1. 先识别输入：项目目录、文章、视频、截图、演示地址、产品图、用户反馈或历史发布数据。
2. 需要找热点、竞品、受众问题或外部证据时，优先使用 `Agent-Reach`；需要把中文平台素材转成文字、摘要、标签或知识库条目时，使用 `chubbyskills`。
3. 需要小红书图文、抖音竖版封面、知识卡片或视觉发布包装时，先识别真实商品、穿搭、场景或结果，把商品或穿搭放在主视觉中；工具界面、后台截图和流程图只作为小面积证据，不作为画面主体。每张图只表达一个具体问题、动作或结果，先完成视觉确认，再扩写完整图文或口播。使用 `visual-director-skill`；需要口播稿、镜头节奏和视频前期包时，使用 `social-video-planner-skill`。
4. 需要生成短视频、配音、字幕、素材和多平台导出时，使用 `clipforge`；只需要内容生产日历、品牌资产管理和审核工作流时，使用 `socialforge`。
5. 发布前先使用 `chinese-sensitive-words-mcp` 做敏感词和表达风险检查。检查通过不代表平台审核通过，仍需保留人工确认。
6. 小红书发布使用 `xiaohongshu-mcp`；抖音视频或图文发布使用 `douyin-upload-mcp-skill`。默认先生成草稿并打开可见浏览器，只有用户明确确认后才执行最终发布。
7. 发布后需要判断什么有效时，使用 `douyin-mcp` 读取作品指标、口播文案和历史快照，输出带证据的复盘；不要用猜测补齐缺失指标。
8. `social-push` 只作为浏览器草稿发布的备用路线，`awesome-social-media-skills` 作为可组合 Skill 参考，不要把两者当成必须启动的服务。

## 安全边界

- 首次登录、扫码、短信验证码、Cookie、API Key、平台发布确认必须由用户完成或明确确认。
- 不绕过登录、验证码、权限、平台安全验证或平台风控；不自动批量发布，不伪造互动。
- 不把凭证写入 Skill、日志、项目清单或输出文件。第三方源码和依赖只放在路由的隔离目录。
- 任何第三方仓库的 README 声明都需要通过实际命令、构建、健康检查或离线样例验证后才能报告为“可用”。
- 若一个服务只能读 README、能构建但需要登录，状态写成“已部署/已构建/待登录”，不要写成“已发布验证”。

## 本地部署位置

默认第三方仓库根目录是：

```text
E:\codex\aisp\aidaihuo\.third-party\self-media-skill-route\repos
```

也可以通过环境变量 `SELF_MEDIA_STACK_ROOT` 指定根目录。详细仓库清单、许可证、运行方式和能力边界见 [project-manifest.md](references/project-manifest.md)。

## 常用调用模板

### 从项目生成一组内容

```text
使用自媒体 Skill 路由，把这个项目变成：
1. 一套 8 页小红书图文；
2. 一条 30 秒抖音口播稿；
3. 一个 9:16 封面方案；
4. 标题、正文、标签和评论区引导。
先研究受众真正关心的痛点，保留真实截图和真实结果，不要夸大，先出草稿不要发布。
```

### 发布前检查

```text
使用自媒体 Skill 路由检查这份小红书/抖音草稿：
检查敏感词、夸大承诺、事实依据、图片尺寸、首屏信息、标题清晰度和平台适配性。
输出修改后的草稿，但不要自动发布。
```

### 发布后复盘

```text
使用自媒体 Skill 路由复盘我最近 30 天的抖音作品：
按播放、完播、互动、收藏、分享和涨粉分析共同点，结合口播稿检查开头钩子和内容结构；
每个结论都写出对应作品和数据时间，缺失项明确标记。
```

## 试跑与状态

执行部署核对：

```powershell
& 'C:\Users\lsb\.codex\skills\self-media-skill-route\scripts\self-media-status.ps1'
```

执行不需要登录和 API Key 的最小试跑：

```powershell
& 'C:\Users\lsb\.codex\skills\self-media-skill-route\scripts\self-media-smoke.ps1'
```

试跑结果和当前外部阻塞见 [test-results.md](references/test-results.md)。
