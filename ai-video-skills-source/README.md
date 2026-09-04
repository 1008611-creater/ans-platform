# AI 视频 Skill 路由全量导出

来源入口：`C:\Users\lsb\.codex\skills\ai-video-fundamentals-skill\SKILL.md`

导出日期：2026-08-15

本目录包含入口 Skill 及其直接点名的全部 13 个下游 Skill，共 14 个 Skill。除运行缓存 `__pycache__` 和 `.pyc` 外，保留每个 Skill 目录中的 `SKILL.md`、`agents/`、`references/`、`assets/` 和 `scripts/`；新增 `ai-video-novel-creation-v1` 已逐文件通过 SHA-256 本机安装源/导出副本一致性校验。

## 路由清单

| 层级 | Skill | 主要职责 |
|---|---|---|
| 总门 | `ai-video-fundamentals-skill` | 来源分类、交付分类、三道生产门与总路由 |
| 方法层 | `ai-video-novel-creation-v1` | 小说立项、写章、续写、审查和短剧改编前事实交接 |
| 方法层 | `ai-video-novel-to-script` | 小说/大纲到可拍短剧剧本 |
| 方法层 | `ai-video-asset-prompts` | 角色、场景、道具、首帧资产提示词 |
| 执行层 | `ai-video-asset-production` | 原创资产的一键生成、登记、下载与 QA |
| 方法/质量层 | `storyboard-director` | 剧本审查、镜头规划、故事板与动作表达验证 |
| 执行层 | `sd2.5skill` | Seedance 2.5 视频提示词 |
| 执行层 | `seedance2-narrative-shot-workflow` | 连续镜头、尾帧续接和状态锁 |
| 路由层 | `mx-shortdrama-00-router` | 已有短剧转绘/本土化总路由 |
| 执行层 | `mx-shortdrama-04-character-assets` | 人物资产转绘与角色一致性 |
| 执行层 | `image2-storyboard-video` | 故事板资产和图生视频交接 |
| 渠道层 | `mikoto-gpt-image-2` | GPT Image 2 原创图片生成 |
| 质量层 | `mx-shortdrama-production-harness` | 转绘生产、资产生命周期和生产验证 |
| 迭代层 | `mx-shortdrama-production-iteration` | 生成后诊断与单变量重做 |

## 合并边界

这是“当前总路由直接引用集”，没有把各下游 Skill 文本中偶然提及的所有其他 Skill 递归扩张进来。冠军 Skill 合并时应先以这 14 个为第一批权威候选，再决定哪些规则内联、哪些保留为渠道适配器或执行脚本。
