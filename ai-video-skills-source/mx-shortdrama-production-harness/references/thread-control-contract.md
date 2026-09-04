# 线程控制合同

## 唯一职责

- 当前 Harness 线程：唯一生产主控、唯一 `harness_state.json` 写入者、唯一渠道提交者、唯一用户提问者。
- 置顶任务管理线程：接受主控的有界 `WORK_REQUEST`，调用子智能体并发完成独立支线，自动推进已有路由已允许的步骤，统一回传结果；不得改 `harness_state.json`、改锁定提示词或直接提交渠道。
- 子智能体：只执行管理线程指定的唯一工作范围，并按固定终态回传。

## 最小状态与动作租约

主控在 `harness_state.json` 中维护：

```json
{
  "run_id": "stable task id",
  "state_revision": 0,
  "controller": {"role": "primary", "title": "转绘主控 | <任务名>", "pinned_readback": false},
  "task_manager": {
    "thread_id": null,
    "host_id": null,
    "creation_marker": null,
    "status": "missing|creating|ready|repairing",
    "delivery_receipt": null
  },
  "phase": "runnable|waiting_manager|waiting_provider|waiting_user|delivered",
  "inflight_action": {"key": null, "owner": null, "started_at": null},
  "next_action": null,
  "blocker": null
}
```

只有主控写状态；每次写入递增 `state_revision`。任何生产动作开始前写入唯一 `inflight_action.key`。相同 key 已在运行时，主控、管理线程和任何子智能体都不得再次派发。终态到达后，主控清除租约、记录结果、递增 revision，再选最早可运行节点。

## 创建并置顶管理线程

1. 主控调用 `codex_app__set_thread_title` 命名自身，再调用 `codex_app__set_thread_pinned` 置顶自身，并用 `codex_app__list_threads` 回读本主控真实 `threadId` 已出现在 `pinnedThreads`。回读成功后才写 `controller.pinned_readback=true`；主控未置顶不得继续创建管理线程。
2. `task_manager.status=ready` 且 `thread_id` 可由 `codex_app__read_thread` 读到时直接复用。
3. 否则生成唯一 `creation_marker=run_id + "-manager"`，写入 `creating`，调用 `codex_app__list_projects` / `codex_app__list_threads` 后，以当前项目的本地共享目录创建管理线程；无项目时创建 projectless 线程。
4. 创建提示词必须含这个 marker 和下方固定角色正文。若接口先返回 `clientThreadId`，它只是准备中标识，不能用于命名、置顶或发送消息；主控用 marker 调用 `codex_app__list_threads` 直到取得真实 `threadId`。
5. 只对真实 `threadId` 依次调用 `codex_app__set_thread_title`、`codex_app__set_thread_pinned`、`codex_app__list_threads` 回读置顶结果、`codex_app__send_message_to_thread` 发送第一条状态。四项均成功后才写入 `ready`。

```text
MANAGER_MARKER: <creation_marker>
你是“转绘任务管理 | <任务名>”。你只接受主控发送的 WORK_REQUEST。
收到请求后，按请求的唯一读写范围调用必要子智能体并发工作；已有路由允许的步骤自动批准，不等待管理性确认。你不得改 harness_state.json、锁定提示词、生产资产或提交渠道。
子智能体全部交回终态后，向主控只回传：result_type / task_id / evidence_path_or_url / verified_result / next_action_or_blocker。没有真实 blocker 时，不得用“等待”“建议”“计划”结束。
管理线程自己的最终回答只是中间结果。你必须把完全相同的五字段终态通过 codex_app__send_message_to_thread 主动发送到 WORK_REQUEST 指定的 controller_thread_id，再用 codex_app__read_thread 回读该主控，确认同一 payload 已真实出现；保存 controller_thread_id、回读 turn/message 标识、payload_sha256 和 readback_verified。完成送达回执后才可结束本次请求。
收到 RUN_CLOSED 前持续接受主控的新请求；收到 RUN_CLOSED 后按同一固定终态确认关闭。
```

## 接口修复路径

`create_thread`、线程解析、命名、置顶、置顶回读或首条消息任一失败时，主控写入失败接口、脱敏错误、已有真实 ID/marker 与精确下一修复动作，状态设为 `repairing`。然后只修复失败边界：

- `clientThreadId` 未就绪：用 marker 读取线程列表，得到真实 `threadId` 后继续未完成动作。
- 创建无回执：按 marker 查找是否已创建；找到则复用，未找到才重新发起同一个创建请求。
- 命名/置顶/消息失败：保留真实 `threadId`，只重试该接口，成功后继续下一项。
- App 工具桥报错：主控诊断并修复该桥的可用性后继续同一个 `creation_marker`；不得声明线程已创建或改为无管理线程运行。

管理线程是本任务指定的执行结构，`repairing` 时主控可做不改变生产状态的读取和准备，但不提交渠道、不宣称 Harness 已启动完成。

## 工作请求与自动推进

主控把依赖已满足的独立工作聚成一个有界请求，先写入动作租约，再向管理线程发送：

```text
WORK_REQUEST
run_id:
state_revision:
task_id:
scope:
read_paths:
write_paths:
expected_outputs:
parent_continuation:
controller_thread_id:
automatic_authority:
```

`automatic_authority` 覆盖当前权威 Skill 已明确允许的读取、证据提取、独立资产/生产组并发、上传准备、轮询、下载和结果检查。它不覆盖：缺少原片/地区/语言/渠道、会改变剧情的本土化选择、已生成视频重做、真实渠道错误的渠道选择，以及用户保留的创作决定。

管理线程将无写入重叠的工作并发派给子智能体，自己等待终态；一个子智能体无终态时，先读取其唯一写入范围，随后补发一次固定终态请求，仍无结果则管理线程接管该范围。它不等待用户的管理性审批。

## 主控送达回执

管理线程在本地形成五字段终态后，必须按以下顺序完成送达：

1. 固定完整五字段 payload，并计算其 UTF-8 `SHA-256`；发送、回执文件与管理线程最终回答必须逐字段逐字符一致。
2. 使用原生 `codex_app__send_message_to_thread` 将该 payload 发送到 `WORK_REQUEST.controller_thread_id`。
3. 使用 `codex_app__read_thread` 回读同一主控，确认 payload 真实出现在主控任务中，并记录对应的 turn/message 标识。
4. 在管理线程自己的有界恢复证据中只保存 `controller_thread_id`、回读 turn/message 标识、`payload_sha256` 与 `readback_verified=true`；不得修改主控的 `harness_state.json`。
5. 管理线程向自己的任务返回同一五字段 payload。主控独立回读管理线程、置顶状态和送达回执三项全部成立后，才清除租约、写入结果并进入下一最早节点。

管理线程自己的最终回答、后台请求 ID、发送尝试或桥接账本都不是主控送达回执。原生发送或主控回读发生真实错误时，只修复该接口并继续同一个 `task_id`；仍不可用时返回包含精确接口错误的 `external_blocked`，不得伪造已送达。

主控通过 `codex_app__wait_threads` 或当前可用的子智能体等待机制等待管理线程终态，同时接受管理线程主动送达的五字段 payload；终态和送达回执到达后立刻写状态并进入下一最早节点。主控不得因管理线程已接单、只在本地结束或只完成发送尝试而结束用户任务。

## 持续运行与关闭

目标未交付、且不存在真实用户决策或外部 blocker 时，主控和管理线程持续处理事件：子智能体终态、渠道状态变化、下载结果、用户作答。它们不得用周期性 heartbeat 维持表面活跃，也不得因“等待中”返回最终回复。

当 `phase=waiting_provider`，管理线程负责在同一工作请求内等待/轮询，主控保留租约；完成、失败或可读下载结果到达后立即回传。`waiting_user` 只在真正需要用户决定时成立。

视频完整交付后，主控发送 `RUN_CLOSED`，管理线程回传固定终态；管理线程无回传不阻止主控交付已经可访问的视频。
