---
name: audit-master-thread
description: name: audit-master-thread
---

---
name: audit-master-thread
description: Audit and advance multi-agent Chinese short-drama production from finalized script through accepted video clips and edited delivery. Use when resuming a project, reviewing a handoff, checking production readiness, locating the earliest failure, reconciling project state, or turning repeated failures into validated workflow improvements.
---

# 审计主控线程

把本 Skill（技能）作为生产控制面使用。它协调既有四冠军链，不替代 `screenwriter`、`chaoge-assets-trial`、`shotlist-builder` 或 `hell-grind` 的创作判断。

## 核心出口

推动项目完成：

`剧本定稿 -> 资产确认 -> 正式分镜 -> 提示质控 -> 视频生成 -> 片段验收 -> 剪辑交付`

只有同时存在定稿剧本、已确认资产、正式镜头表、锁定连续性、通过真实文件验收的视频、`accepted_clip`、可播放剪辑交付物、声音字幕和导出记录，才报告一集样片闭环完成。

## 每次运行

按以下顺序执行，遇到已解决的缺口继续推进，不把“继续”当作工作内容：

1. **锁定项目**：读取当前项目的 `project_context.json`、`01_input_packet.md`、`project_state` 和线程绑定；确认项目编号、根目录、标题、阶段和当前冠军一致。
2. **回读事实**：按阶段读取 `asset_manifest`、`shotlist`、`continuity_ledger`、`accepted_clip`、候选文件和证据台账；以文件事实为准，不以聊天记忆或渠道返回状态为准。
3. **找最早缺口**：从生产链起点向后检查，找到第一个阻断下游的缺口；不要跳到后续节点补写上游事实。
4. **分类问题**：归类为项目数据错误、交接缺口、执行器缺陷、渠道能力事实或创作决策。
5. **自动推进**：前四类先做最小可验证修复，重新读取并验证；创作决策只生成判断卡，不替用户选审美方案。
6. **选择冠军**：只调用能解决当前最早缺口的冠军。入口事实不足时写明缺口和责任上游，不让下游猜测。
7. **交接留证**：每次通过、阻塞或需要裁决时，更新项目唯一事实对象和证据台账，再报告下一动作。

## 自动封装

可以直接自动完成：状态对账、路径和引用检查、剧本场次与角色状态提取、资产差异整理、镜头表与提示词编译、文件可读性和媒体属性检查、首尾连续性检查、最早失败变量定位、候选状态更新、返工原因记录和下一节点准备。

对视频生成结果，必须区分预检、预演、候选和 `accepted_clip`。没有真实文件验收，不得把“已生成”“可播放”或渠道响应写成正式成片事实。

## 确定性审计入口

需要对项目文件做基础对账时，先运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit_project.ps1 -ProjectRoot <项目根目录>
```

脚本只读取项目文件，输出项目编号、阶段、冠军、缺失权威引用、缺失交接文件、项目上下文校验结果和最早缺口。把脚本结果作为事实底稿，再进行冠军路由和人工判断，不让模型凭目录印象猜测状态。

## 人工判断卡

只有以下事项交给用户：创作方向、身份与审美确认、外部生成或重做动作、多个合格候选之间的最终取舍。判断卡只写：当前项目和最早缺口、已验证事实、至多三个合格选项、主控推荐、对成片和外部动作的直接影响。

## 错误反哺

每个可复现问题按以下结构记录：

`问题 -> 证据 -> 根因分类 -> 最小修复 -> 回归验证`

只有同类问题跨项目重复且会改变后续行为时，才提出系统改进。优先修数据和路径，再修校验器和脚本，再补 Skill（技能）或节点合同，最后才增加人工判断点。没有回归样例，不修改共享规则。

## 交付语言

向用户先报告结论，再报告真实产物路径、已验证事实、未验证项和唯一下一动作。不要把计划、内部状态、预览图、提示词草案或候选链接单独报告为完成。

需要详细字段、问题分类或回归记录格式时，读取 [protocol.md](references/protocol.md)。
