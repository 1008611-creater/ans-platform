# 备份索引模板（00_INDEX.md）

每次备份在备份根放置一个 `00_INDEX.md`，格式如下。复制完成后用真实值替换占位符。

```markdown
# 本地资料备份索引

- 备份时间：YYYY-MM-DD HH:MM
- 源主机：<主机名>
- 源系统盘：C:（剩余 <X> GB）
- 备份根：E:/backup_YYYYMMDD
- 总备份大小：<X> GB
- 方式：只读复制（robocopy + cp），未删除任何源文件

## 分级汇总

| 级别 | 子目录 | 来源 | 大小 | 文件数 | 排除项 |
|---|---|---|---|---|---|
| P0 | P0_系统核心 | memory/skills/知识卡/契约 | <X> | <N> | 无 |
| P1 | P1_文档项目 | Obsidian/Documents/Desktop/.codex | <X> | <N> | .tmp、xwechat_files、BaiduNetdiskTmp |
| P2 | P2_媒体素材 | Pictures/Videos | <X> | <N> | 无 |

## P0 系统核心（不可再生）

| 内容 | 来源路径 | 备份路径 | 还原方法 |
|---|---|---|---|
| 工作记忆 | C:/Users/<user>/.workbuddy/memory | P0_系统核心/memory | 原样复制回去 |
| 用户 Skill | C:/Users/<user>/.workbuddy/skills | P0_系统核心/skills | 原样复制回去 |
| 知识卡 | E:/刺猬星球/知识卡 | P0_系统核心/knowledge_cards | 原样复制回去 |
| 项目契约 | <项目>/AGENTS.md | P0_系统核心/AGENTS.md | 原样复制回去 |

## P1 文档项目

| 内容 | 来源路径 | 备份路径 | 备注 |
|---|---|---|---|
| Obsidian 笔记库 | Documents/Obsidian Vault | P1_文档项目/Obsidian_Vault | 重要个人知识库 |
| 项目文档 | Documents（排除聊天大文件） | P1_文档项目/Documents | 微信 xwechat_files 未纳入，可重登同步 |
| 会话历史 | .codex（排除 .tmp） | P1_文档项目/codex_sessions | 历史对话记录 |
| 桌面 | Desktop | P1_文档项目/Desktop | 零散文件 |

## P2 媒体素材

| 内容 | 来源路径 | 备份路径 | 备注 |
|---|---|---|---|
| 图片素材 | Pictures | P2_媒体素材/Pictures | AI视频/电商素材 |
| 视频 | Videos | P2_媒体素材/Videos | 成片与样片 |

## 未纳入与原因

- <列出排除项及原因，如 Temp、缓存、anaconda3、WSL>

## 完整性校验

- P0 文件数：源 <N> / 备 <N>（一致）
- P1 总大小：源 <X> / 备 <X>（误差来自排除项，已说明）
- 抽样比对：<列出抽样的几个关键文件，确认存在>

## 安全声明

本次为只读备份，未删除源盘任何文件。清理需在对应用户确认冗余、且本备份可读后进行。
```

## 校验命令样例

复制完成后在备份根执行：

```bash
# 统计各级文件数
for d in P0_系统核心 P1_文档项目 P2_媒体素材; do echo "$d: $(find "$d" -type f | wc -l) 文件, $(du -sh "$d" | cut -f1)"; done
```
