---
name: jellyfish-sync
description: 将本地项目的剧本、章节、shotlist、角色、场景、道具和资产图片同步到本地 Jellyfish 工作台。用户要求把项目内容填入 Jellyfish、同步项目资料、导入剧本/分镜/资产时使用。依赖 jellyfish-mcp 提供的 jf_* 工具。
---

# Jellyfish 项目同步 Skill

## 目标

把项目资料库里的结构化内容安全、可追溯地导入 Jellyfish。Jellyfish 只是生产看板和工作台，不是上游项目文件的替代品；原始剧本、资产清单、连续性台账仍以项目目录中的权威文件为准。

## 固定工作流

### 1. 先检查连接

先调用 `jf_health`。如果失败，提示用户双击桌面的 `Jellyfish启动.cmd`，不要继续写入。

### 2. 先查重，再创建

- 调用 `jf_list_projects`，按项目名或项目 ID 查重。
- 已存在的项目不重复创建，记录已有 ID，后续复用。
- 不确定是否为同一项目时，停下来询问用户，不猜测。

### 3. 创建项目

调用 `jf_create_project`：

- `id` 使用稳定、可读、不会随文件名变化的项目 ID。
- 天宫漫剧使用 `style=国漫`、`visual_style=动漫`、`default_video_ratio=9:16`。
- 其他项目先调用 `jf_style_options`，再选择合法值。
- 项目描述只写已确认事实，不把草稿状态写成已验收。

### 4. 同步章节/剧本

- 每一集或一个可独立生产单元创建一个 chapter。
- `index` 按项目内顺序填写；上/中/下集通常为 1/2/3。
- `raw_text` 放完整原文；`condensed_text` 只放明确标注的精简版。
- `status` 默认 `draft`。只有用户明确确认进入制作才改为 `shooting`，完成验收才改 `done`。
- 写入前调用 `jf_list_chapters` 查重；按 project_id + index + title 判断。

### 5. 同步分镜

- 每个 shotlist 镜头创建一个 shot。
- `index` 必须保持章节内顺序。
- `title` 用“镜号 + 简短概要”。
- `script_excerpt` 放景别、机位、空间走位、动作、台词、声音和资产依赖等完整镜头描述。
- 不把 Seedance 最终 I2V 提示词伪装成 `script_excerpt`；视频提示词属于后续生产阶段。
- 写入前调用 `jf_list_shots` 查重。

### 6. 同步资产实体

调用 `jf_create_entity`，实体类型如下：

- `character`：角色
- `scene`：场景
- `prop`：道具
- `costume`：服装
- `actor`：演员/人物母板

资产 ID 尽量沿用上游资产编号（例如 M01、M07），描述放资产需求/验收信息，标签放稳定分类。角色必须带 `project_id`；场景、道具、服装建议带 `project_id`。

### 7. 上传资产图片

1. 先调用 `jf_upload_file`，传本地文件绝对路径。
2. 再调用 `jf_create_entity_image`，把返回的 `file_id` 挂到对应实体。
3. 身份、视角和质量信息必须来自文件名、资产清单或用户确认，不得猜测。
4. 常用 `view_angle`：`FRONT`、`LEFT`、`RIGHT`、`BACK`、`THREE_QUARTER`、`TOP`。
5. 用户没有确认的候选图只能作为候选，不标成已验收资产。

## 项目资料映射建议

| 上游资料 | Jellyfish 对象 |
|---|---|
| 项目状态文件 | project description / progress（仅同步已确认状态） |
| 三集剧本 | chapters.raw_text |
| shotlist | shots.script_excerpt |
| asset_manifest | character / scene / prop / costume |
| 本地 PNG/JPG | files + entity images |
| continuity_ledger | shot 描述中的连续性约束；原 YAML 仍保留在上游 |
| Seedance 提示词 | 不提前写入；等视频编译阶段处理 |

## 不可越过的门

- 不因为文件存在就认定资产已验收。
- 不覆盖 Jellyfish 中已有项目、章节、镜头或实体；先查重、再更新或询问。
- 不改上游剧本、资产、分镜和台账。
- 不自动调用任何付费出图或视频生成渠道。
- API 错误时停止该批次，报告已成功写入和失败对象，不盲目重试造成重复数据。
- 同步完毕后重新列表验证数量，并输出项目 ID、章节数、镜头数、实体数和失败清单。

## 推荐调用顺序

`jf_health` → `jf_style_options` → `jf_list_projects` → `jf_create_project` → `jf_list_chapters` → `jf_create_chapter` → `jf_list_shots` → `jf_create_shot` → `jf_list_entities` → `jf_create_entity` → `jf_upload_file` → `jf_create_entity_image`

## 汇报格式

同步结束必须用中文汇报：

- Jellyfish 项目名称 / ID
- 本次导入范围
- 成功数量：章节、镜头、实体、图片
- 跳过数量及原因（已存在/候选未验收/缺少关联）
- 失败数量及 API 错误
- 下一步可执行动作
