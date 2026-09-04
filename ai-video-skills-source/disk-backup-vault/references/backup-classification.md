# 备份分类细则

本文件定义每类资料的判断标准与典型来源，供分类复制时参照。

## P0 系统核心（不可再生，最高优先级）

判定标准：删掉后无法凭记忆或云同步重建，且构成“工作身份与方法体系”的基座。

典型来源：
- `C:/Users/<user>/.workbuddy/memory/`：跨会话工作记忆与长期记忆
- `C:/Users/<user>/.workbuddy/skills/`：用户级 Skill（方法体系本体）
- `E:/刺猬星球/知识卡/*.md` 等用户自建知识卡
- 项目根 `AGENTS.md`、契约与配置
- 长期生效的偏好、KEY 映射、身份文件（SOUL/IDENTITY/USER）

动作：完整 `cp -r`，不排除任何子项；体量通常 < 50MB。

## P1 文档项目（高重建成本）

判定标准：内容由用户产生、外部不可得，但体量较大、可容忍部分缓存排除。

典型来源：
- 笔记库：Obsidian Vault、Notion 导出、语雀等
- 项目文档：`Documents` 下的项目、学校材料、交付物
- 会话历史：`.codex/sessions`、`archived_sessions`（排除 `.tmp`、`.sandbox-bin`）
- 桌面：`Desktop`
- 代码仓库与工作区（排除 `node_modules`、`venv`、`.git` 大对象可按需）

动作：`robocopy /E`，用 `/XD` 排除明显缓存（如 `BaiduNetdiskTmp`、`xwechat_files` 等庞大数据单独说明）。

## P2 媒体素材（体积大、重做耗时）

判定标准：用户创作的图片/视频/设计源文件，云同步不一定完整保留。

典型来源：
- `Pictures`：AI 视频素材、电商素材、归档源文件
- `Videos`：成片、样片、录屏
- 设计工具源文件（PSD、源工程）
- 自建素材库（如 `E:/刺猬星球/` 中的图片视频部分）

动作：`robocopy /E`，可直接整目录搬运；若备份根空间紧张，P2 可单独放在最大容量的盘。

## 排除类（默认不备份，注明原因）

| 目录/类型 | 原因 |
|---|---|
| `AppData\Local\Temp` | 系统临时，随时再生 |
| npm/pnpm/pip/playwright 缓存 | 包管理器再生 |
| `anaconda3`/`miniconda`、虚拟环境 | 可重建，体积大 |
| `.gradle/caches`、`.nuget/packages`、`.cargo/*` | 依赖缓存再生 |
| `AppData\Local\wsl`、`docker-desktop` | 运行中使用，删除破坏子系统 |
| `C:\Windows`、`Program Files` | 系统文件，重装即得 |
| 聊天庞大数据（`xwechat_files`） | 可客户端重登同步；如要备份需单独确认 |

## 分级检查清单

- [ ] P0 是否完整复制（含 memory、skills、知识卡、契约）
- [ ] P1 是否排除已知缓存但保留用户内容
- [ ] P2 是否整目录搬运
- [ ] 排除项是否在索引中明确标注原因
- [ ] 备份根是否保留源盘的层级语义
