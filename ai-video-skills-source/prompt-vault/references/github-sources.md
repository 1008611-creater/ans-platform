# 已收录的 GitHub 提示词管理项目

## 1. PromptDex（浏览器插件 - 右键存提示词）

- **仓库**: `kristyc/PromptDex`
- **本地路径**: `tools/PromptDex/`
- **核心能力**: Chrome 扩展，右键存提示词，`Ctrl+Shift+L` 调出，分类管理 + JSON 备份
- **适用场景**: 日常浏览时快速收藏提示词
- **使用方式**: Chrome 开发者模式加载已解压的扩展程序

## 2. jonv11/jonv11-prompts-library（Git 仓库模板）

- **仓库**: `jonv11/jonv11-prompts-library`
- **核心能力**: 结构化的提示词 Git 仓库模板，按 agents/project-management/review/tasks 分类
- **适用场景**: 长期积累，版本追溯
- **本地适配**: 本项目 `prompts/` 目录参考其结构，分类调整为 ai-video/seedance-2.5/image-gen/general-work

## 3. prompts.chat（自托管平台 - 搜索 UI + MCP）

- **仓库**: `f/awesome-chatgpt-prompts`（163k+ stars）
- **本地路径**: `tools/prompts-chat-src/`
- **核心能力**: 自托管提示词库网站，带搜索 UI、分类、投票、MCP Server 接入
- **适用场景**: 团队共享 + AI 工具直接读取提示词库
- **启动方式**: `cd tools/prompts-chat-src && bash start.sh`（需 Docker + PostgreSQL）

## 4. microsoft/promptflow（工程框架 - 版本管理 + 评估）

- **仓库**: `microsoft/promptflow`（11k+ stars）
- **核心能力**: 可视化工作流 + 提示词版本对比 + 评估框架
- **适用场景**: 把提示词当代码管理，需要 A/B 测试和版本对比时
- **安装**: `pip install promptflow`

## 5. cyqlelabs/pal（Prompt Assembly Language - 组件化提示词）

- **仓库**: `cyqlelabs/pal`
- **核心能力**: 把提示词拆成可复用组件（persona/task/context/rules），支持依赖导入和 Jinja2 模板
- **适用场景**: 提示词需要模块化组合和复用时
- **安装**: `pip install pal-framework`

## 6. promptslab/promptify（版本管理 + 评估 + 成本追踪）

- **仓库**: `promptslab/Promptify`（4.6k+ stars）
- **核心能力**: 提示词版本管理 + 评估 + token 成本追踪 + 统一 API 网关
- **适用场景**: 需要追踪提示词效果和成本时
