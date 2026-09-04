---
name: mx-shortdrama-production-iteration
description: Record, evaluate, and verify evidence-based quality and throughput improvements for original-footage short-drama redraw jobs. Use after provider outputs, user visual feedback, channel failures, timing measurements, or task completion; also use when updating the redraw router or harness from observed production results.
---

# 短剧转绘迭代

将一次任务的实测问题转成可验证的改进，不把聊天结论、创作偏好或一次渠道波动误写成通用规则。

## 记录位置与边界

为每个 job 维护唯一 `production_iteration.json`，位于 job 根目录。它是生产事实的索引，不替代 `harness_state.json`、编号步骤产物、提示词合同或渠道日志。

每条记录必须包含：

- 输入/输出的精确路径和 SHA-256（可得时）。
- `run_id`、provider、provider task ID、提交/完成/下载时间。
- `active_execution_seconds` 与 `external_wait_seconds`，不得把等待用户、排队或失效登录混入算法耗时。
- 实际 QA 结论、观察到的偏差、原始证据路径。
- 最窄责任边界、纠正动作、适用范围、是否需用户重做许可。
- `learning_status`：`current_task_preference`、`reusable_hypothesis`、或 `verified_reusable_rule`。
- 后续同类结果的验证字段；无效时记录 `narrowed` 或 `reverted`，不得继续扩大规则。

不写入账号、Cookie、API key、临时上传 URL 或其他凭据。

## 触发与动作

1. Step04 接受时创建文件，登记 Word/MD 的权威输出路径、输入合同和当前生产组计划。
2. 每次资产、首帧、故事板或视频产生实际渠道结果时，立即追加其任务 ID、时间、媒体路径、引用、QA 和偏差。
3. 渠道提交、轮询、下载或播放失败时，登记原始错误、失败边界和恢复动作；不自动重新提交视频。
4. 用户对实际画面提出具体反馈时，先以原片证据、实际上传参考、锁定提示词定位最窄步骤；仅在获得本次明确许可后，才修改对应权威 Skill。
5. 每次任务结束前追加一个简短复盘：只把已经在下一次同类实际输出中证明有效的事项升级为 `verified_reusable_rule`。

## 性能与并发复盘

每次 run 都登记可减少墙钟时间的改进，以及它是否实际生效。只允许下列安全并发：不同资产或独立生产组已提交后的轮询、下载、媒体探测和 QA。必须串行：同一锁定提示词的改写、同一首帧链、用户决定、付费/真实渠道提交和连续镜头链。

本 job 的已知建议应作为 `reusable_hypothesis` 起步：提交独立资产时逐项立即持久化 task ID；对已提交的任务并发轮询/下载/QA；Word 中嵌入压缩预览、原始 4K 独立保存；首次交付前只渲染核验关键页，不进行会阻塞用户查看的重型全页渲染。只有后续实测降低墙钟时间且不损伤质量，才能升级为规则。

## 路由接点

`mx-shortdrama-00-router` 负责专业步骤；`mx-shortdrama-production-harness` 在 Step04 接受、Step05 实际结果、用户视觉反馈与任务完成时调用本 Skill。权威 Word/MD 必须从同一结构化事实模型生成，中文为主，并清楚区分“实际产物”“待生成”“渠道受阻”。

## 最小验证

每次写入后读取 JSON，检查所有实际任务均有 provider/task ID/时间/路径，所有改进均有证据路径与学习状态。引用路径不存在、把计划标成实际、或把一次偏好写成通用规则，均视为失败并立即修正。
