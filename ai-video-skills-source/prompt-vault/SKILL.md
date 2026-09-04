---
name: prompt-vault
description: 提示词管理库。当用户需要搜索、分类、索引、记录使用次数、查看统计或管理提示词时使用。触发词：提示词管理、搜索提示词、找提示词、提示词统计、prompt vault、记录提示词使用、提示词用了几次。
agent_created: true
---

# Prompt Vault - 提示词管理

## 定位

个人提示词积累与管理工具。解决"用过的提示词找不到、效果好的记不住、不知道用了多少次"的问题。自动扫描项目 `prompts/` 目录，建立索引，支持搜索、分类、使用次数统计和评分。

## 核心能力

1. **自动扫描索引**：扫描 `prompts/` 下所有 `.md` 文件，解析标题、用途、模型、效果、日期，建立 JSON 索引
2. **搜索**：按关键词搜索提示词标题、用途、模型、效果和分类
3. **使用次数追踪**：每次使用提示词后记录一次，统计总使用次数和最后使用时间
4. **评分系统**：对提示词效果打分（S+/A/B/C 等）
5. **统计面板**：总数、模板明细、分类明细、使用次数 TOP 10、已评分列表、提炼候选
6. **模板系统**：分类模板 + 适配规则 + 必填字段，减少重复劳动，实现提示词复利
7. **提炼提醒**：使用次数 ≥ 3 且评分 ≥ A 的提示词自动提醒提炼为模板
8. **GitHub 源管理**：收录已知的优质 GitHub 提示词项目，方便查找和参考

## 模板系统（复利核心）

模板是提示词的复利机制：好用的提示词提炼成模板后，后续每次使用都在已有经验上叠加。

### 现有模板

| 模板文件 | 适用场景 | 必填字段数 |
|---|---|---|
| `_template.md` | 基础通用（最小字段集） | 6 |
| `_template_sd25.md` | Seedance 2.5 图生视频/文生视频 | 12 |
| `_template_image_gen.md` | AI 图片生成（MJ/OpenLux） | 12 |
| `_template_ai_video.md` | 其他 AI 视频（Runway/Kling/Veo） | 9 |
| `_template_general.md` | 日常工作（代码审查/文档/分析） | 7 |

### 适配规则

每个模板文件头部有 `<!-- 适配规则 -->` 注释，写明：什么场景用这个模板、填之前必须先确认什么、正文填写注意事项。运行 `templates` 命令可查看全部模板及适配规则。

### 提炼规则（复利闭环）

当一条提示词使用次数 ≥ 3 次且评分 ≥ A 时，`suggest` 命令会提醒提炼为模板：

1. 识别可复用结构（角色/输出格式/约束条件）
2. 把每次变化的部分改成 `{变量名}`
3. 复制 `_template.md` 为 `_template_<细分>.md`，写适配规则
4. 运行 `scan` 更新索引

完整模板规范见 `references/template-rules.md`。

## 提示词库结构

提示词存放在项目根目录 `prompts/` 下，按分类组织：

```
prompts/
├── README.md
├── _template.md                 ← 基础通用模板
├── _template_sd25.md            ← Seedance 2.5 视频模板
├── _template_image_gen.md       ← AI 图片生成模板
├── _template_ai_video.md        ← AI 视频通用模板
├── _template_general.md         ← 日常工作模板
├── ai-video/                    ← AI 视频类
├── seedance-2.5/                 ← Seedance 2.5 专用
├── image-gen/                   ← 图片生成类
└── general-work/                ← 日常工作类
```

每条提示词是一个 `.md` 文件，包含：标题、用途、适用模型、效果备注、使用日期、提示词正文。新建提示词时复制对应分类的模板，按模板内的适配规则填写。

使用次数、评分、GitHub 源和模板索引自动保存在 `C:/Users/lsb/.workbuddy/prompt-vault-indexes/`，不污染项目目录，也避免项目权限影响面板按钮。

## 使用方式

### 扫描并更新索引

当新增或修改提示词文件后，运行：

```bash
python scripts/prompt_vault.py scan
```

### 搜索提示词

```bash
# 搜索包含"国风"的提示词
python scripts/prompt_vault.py search 国风

# 列出全部提示词
python scripts/prompt_vault.py search
```

### 记录使用

每次使用某条提示词后记录一次（路径关键词模糊匹配）：

```bash
python scripts/prompt_vault.py use guofeng-15s
```

### 设置评分

对提示词效果打分：

```bash
python scripts/prompt_vault.py rate guofeng-15s S+
```

### 查看统计

```bash
python scripts/prompt_vault.py stats
```

输出：总数、模板明细、分类明细、使用次数 TOP 10、已评分列表、模板提炼候选。

### 查看模板与适配规则

```bash
python scripts/prompt_vault.py templates
```

列出全部模板、必填字段数和适配规则，帮助选择该用哪个模板。

### 模板提炼提醒

```bash
python scripts/prompt_vault.py suggest
```

列出使用次数 ≥ 3 且评分 ≥ A 的提示词，提醒提炼为模板（复利闭环）。

### 管理 GitHub 源

查看已收录的 GitHub 提示词管理项目：

```bash
python scripts/prompt_vault.py github
```

添加新的 GitHub 源：

```bash
python scripts/prompt_vault.py add-github PromptDex https://github.com/kristyc/PromptDex "Chrome 右键存提示词"
```

## 新建提示词流程

1. 运行 `python scripts/prompt_vault.py templates` 看该用哪个模板
2. 复制对应模板（如 `_template_sd25.md`）到对应分类目录，去掉文件名前缀改成 `prompt-<描述>.md`
3. 按模板头部适配规则填写必填字段（带 ★ 的）
4. 运行 `python scripts/prompt_vault.py scan` 更新索引
5. 用完后运行 `python scripts/prompt_vault.py use <关键词>` 记录使用
6. 效果好就 `python scripts/prompt_vault.py rate <关键词> S+` 评分
7. 用到 3 次以上且评分 A+，`suggest` 会提醒你提炼成新模板

## 脚本路径

核心脚本：`scripts/prompt_vault.py`

GitHub 源参考：`references/github-sources.md`

模板规范与复利规则：`references/template-rules.md`

## 与外部工具配合

| 工具 | 角色 | 本地路径 |
|---|---|---|
| PromptDex | 浏览器右键快速存 | `tools/PromptDex/` |
| prompts/ 目录 | 长期积累 + Git 版本 | `prompts/` |
| prompts.chat | 自托管搜索 UI + MCP | `tools/prompts-chat-src/` |
| prompt-vault.py | 索引 + 搜索 + 统计 | 本 Skill `scripts/` |
| prompts MCP | WorkBuddy 直接搜索/保存 | 本 Skill `scripts/prompts_mcp_server.py` |

日常流程：PromptDex 右键存 → 导出 JSON → 转存为 `prompts/` 下的 `.md` → `scan` 更新索引 → 用完 `use` 记录 → 定期 `stats` 查看哪些好用。

## 对话蒸馏（女娲式提取）

自动从对话记录或外部来源中提取提示词、分类并保存到 prompts.chat。

### 触发

在对话中直接说：
- "把对话里的提示词提取出来"
- "蒸馏一下今天的对话"
- "女娲蒸馏"
- "把刚才的提示词整理一下存起来"
- "帮我把这个链接里的提示词存到库里"（外部来源）
- "导入这个 GitHub 仓库的提示词"

### 工作流

1. **获取内容** — 对话记录 / 网页链接 / GitHub 仓库 / 粘贴文本
2. **识别提取** — 找到所有完整提示词、模板、效果评价
3. **分类决策** — 按内容自动分到 `seedance-2-5` / `ai-video` / `ai-image` / `general-work` / `prompt-templates`
4. **去重保存** — 检查是否已存在，调用 MCP `save_prompt` 工具写入
5. **报告** — 输出摘要：来源、提取数、去重数、新增数、分类明细

详细流程见 `references/distill-workflow.md`。

### 命令行工具

```bash
python scripts/save_prompt.py --title "标题" --content "内容" --type VIDEO --description "用途" --category seedance-2-5
```
