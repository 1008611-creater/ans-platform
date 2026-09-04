---
name: runninghub-workflow-api
description: name: runninghub-workflow-api
---

---
name: runninghub-workflow-api
description: RunningHub 冠军入口：将 RunningHub/ComfyUI 工作流或 AI 应用定制、发布或调用为稳定 API，并统一专项 Skill 的素材上传、消费级 API Key、RH 币结算和网站回传路径。用于任何 RunningHub 请求，包括工作流、AI 应用、动作迁移、MiniMax H3、Image2、画布素材、消费级 Key 或念念智选服务端接入。
---

# RunningHub 冠军 API

把工作流画布中的定制能力变成稳定、可复用的 API 通道。所有 RunningHub 请求先加载本 Skill，再读取唯一匹配的专项 Skill；只把真实发布后的 `workflow_id` 和页面/API 证据登记为可调用接口。

## 冠军路由

`RunningHub 请求 -> 本 Skill 的上传/Key/结算契约 -> 专项 Skill 的节点与创作契约 -> 自有结果交付`

| 需求 | 专项执行 Skill |
| --- | --- |
| 自定义 workflow、AI 应用、消费级 Key、念念智选接入 | 本 Skill |
| Animate V9 动作迁移 | `runninghub-animate-motion-transfer` |
| MiniMax H3 视频 | `minimaxh3skill`；创作编排先用 `minimaxh3skill-use` |
| Image G 文生图 / 图生图 | `runninghub-image2-text` / `runninghub-image2-image` |
| ComfyUI 画布素材绑定 | `runninghub-canvas-media-upload` |
| 水果电商动作迁移 / 数字人 | `runninghub-fruit-commerce-video` |
| 图片生成多渠道兜底 | `runninghub-canvas-fallback` |

本 Skill 统一负责上传传输、凭据边界、幂等提交、轮询、结算和网站回传；专项 Skill 只维护已验证的模型、节点、提示词和业务规则。完整边界见 [references/champion-routes.md](references/champion-routes.md)。

## 工作流定制与 API 发布

1. 先下载 RunningHub 界面“导出工作流 API”得到的 `api_format` JSON，并运行 [`scripts/extract_workflow_contract.py`](scripts/extract_workflow_contract.py) 提取节点契约。`nodeId` 是顶层节点键，`fieldName` 是该节点 `inputs` 的键，标量值可作为 `nodeInfoList.fieldValue` 的字段依据；数组值表示连线，不覆写。该文件不证明工作流已发布、endpoint 或参数限制。
2. 只改一个单独副本，给它清楚的能力名称，例如“多图+音频参考视频”。已有稳定工作流和既有 API 不覆盖、不改名、不删除。
3. 在 RunningHub 画布完成节点、连线和默认值配置，保存后发布/开启“调用 API”。保存、发布、上传或改变访问权限会影响用户的 RunningHub 资产；执行前在页面动作发生前确认具体副本名称和发布目的。
4. 从新 API 页面读取新的 `workflow_id`、endpoint、类型与限制；节点 `nodeId` 与 `fieldName` 以该 workflow 的 `api_format` JSON 为准。调用 endpoint 使用 `/openapi/v2/run/workflow/{workflow_id}`，但不得在尚未看到新 ID 前猜测 ID 或 endpoint。
5. 先为调用器做不扣费 `dry-run`；用户授权一次真实任务后，以任务回执验证状态、输出文件和结算方式。若用户指定 RH 币，只有 `consumeCoins > 0` 且 `consumeMoney` 为空或 `0` 才算合格。
6. 将新通道登记到目标视频/图像 Skill 的注册表，提供语义化快捷参数和原始 `nodeId.fieldName=value` 逃生入口；保存契约证据，但绝不写入 API Key、Cookie、余额、临时链接或私有素材。

读取 [references/workflow-to-api.md](references/workflow-to-api.md) 获取“何时必须新建 workflow ID”、API 契约格式与证据等级。

## 提交 API 请求与结算验证

先区分线上入口，不能把 AI 应用 ID 当成 workflow ID：

- 已发布工作流使用 `POST /openapi/v2/run/workflow/{workflow_id}`，鉴权为 `Authorization: Bearer <key>`，`nodeInfoList` 必填。
- 已验证的 AI 应用使用 `POST /task/openapi/ai-app/run`，请求体包含 `webappId`、服务端注入的 `apiKey`、`instanceType` 和 `nodeInfoList`；上传仍走 `/openapi/v2/media/upload/binary`，查询仍走 `/openapi/v2/query`。`apiKey` 只存在服务端请求体，绝不下发浏览器。

调用前使用该 workflow 的 `api_format` JSON 构造 `nodeInfoList`：顶层节点键为 `nodeId`，`inputs` 的键为 `fieldName`，标量为可传 `fieldValue`；数组值是连线，禁止覆写。API 页面或 `GET /api/webapp/apiCallDemo` 用于确认已发布入口、workflow ID、endpoint、类型与限制，不能以网页示例中的空数组否定 `api_format` 的字段映射。官方依据见 [references/official-node-info-list.md](references/official-node-info-list.md)。

RunningHub API 使用 Bearer API Key 鉴权。已从 API 页面取得真实 `workflow_id` 后，向以下地址提交工作流：

```bash
curl --location --request POST \
  'https://www.runninghub.cn/openapi/v2/run/workflow/<workflow_id>' \
  --header 'Content-Type: application/json' \
  --header "Authorization: Bearer ${RUNNINGHUB_API_KEY}" \
  --data-raw '{
    "addMetadata": true,
    "nodeInfoList": [],
    "instanceType": "default",
    "usePersonalQueue": false
  }'
```

`nodeInfoList` 必填，字段映射来自同一 workflow 的 `api_format` JSON；API 页面确认其发布入口与限制。`instanceType` 可选 `default`（24G）、`plus`（48G）或 `ultra`（84G 显存）；它只表示运行实例规格，不决定 Key 类型、结算币种或模型质量。`usePersonalQueue`、`addMetadata` 必须传 JSON 布尔值。企业共享 Key 可选 `retainSeconds`（10~180 秒），消费级 Key 不传该字段；也可传 `webhookUrl` 接收完成回调。

提交响应中的 `taskId` 用于查询，常见状态为 `QUEUED`、`RUNNING`、`SUCCESS`、`FAILED`。查询接口为：

```bash
curl --location --request POST 'https://www.runninghub.cn/openapi/v2/query' \
  --header 'Content-Type: application/json' \
  --header "Authorization: Bearer ${RUNNINGHUB_API_KEY}" \
  --data-raw '{"taskId":"<task_id>"}'
```

查询结果的 `results[].url` 可能包含图片、视频或文本输出；`RUNNING` 时出现空结果占位不代表已经产出，必须等到 `SUCCESS`。下载链接有效期仅 24 小时，成功后必须及时下载或转存。结算读取 `usage.consumeCoins`、`usage.consumeMoney` 和 `usage.thirdPartyConsumeMoney`：用户指定“仅扣 RH 币”时，只有 `consumeCoins > 0` 且 `consumeMoney` 为空或为 `0` 才算验证通过。提交成功、拿到 `taskId` 或文件生成成功都不能替代这个结算回读。

本地素材先上传到。网站场景必须先把用户文件保存到自己的素材库，再由服务端 Worker 上传 RunningHub；浏览器不得携带 RH Key，也不得直接把 RH 临时地址当作网站资产。

```bash
curl --http1.1 --location --request POST \
  'https://www.runninghub.cn/openapi/v2/media/upload/binary' \
  --header "Authorization: Bearer ${RUNNINGHUB_API_KEY}" \
  --connect-timeout 30 --max-time 600 \
  --retry 4 --retry-delay 3 --retry-all-errors \
  --form 'file=@/path/to/file;type=video/mp4'
```

上传响应的 `data.download_url` 或 `data.fileName` 可作为工作流输入；资源链接有效期约 1 天。Windows 上本地视频优先使用 `curl.exe --http1.1` 并显式传 MIME 类型：真实任务中 `Invoke-RestMethod -Form` 曾在 300 秒后超时，默认 curl 连接曾被重置，而 HTTP/1.1 加有限网络重试后同一 MP4 上传成功。这个规则修复上传传输边界，不代表 HTTP/1.1 提升带宽；上传每个规范化本地路径一次并复用返回 URL，避免因为查询慢而重复上传。

上传效率边界：小图片可用原生 HTTP multipart；视频或大文件优先调用 `curl(.exe) --http1.1`，显式 `type=video/mp4`、连接/总时限和有限网络重试。RH 这个接口没有可依赖的断点续传契约，不要自行拆片；网站到自身的上传可以用 Tus，RH 侧仍一次 multipart。以素材 `sha256 + byte_size + mime` 做上传缓存键，在 RH URL 24 小时有效期内复用，避免查询慢或重试时重复上传。

消费级 Key 不需要另一套鉴权方式：已发布 workflow 仍用同一 `/openapi/v2/run/workflow/{workflow_id}` 和 `Authorization: Bearer ...`；AI 应用则按其已验证的 `/task/openapi/ai-app/run` 请求体提交。Key 字符串、上传成功、`instanceType` 或提交响应都不能证明结算类型；Key 类型由 RunningHub 账户侧配置决定。首次遇到来源不明的 Key 且用户已授权付费验证时，先调用注册表中低成本、`runtime_verified`、`rh_coins_only` 的对照工作流，终态必须返回 `consumeCoins > 0` 且 `consumeMoney` 为空或 `0`，再运行高成本目标工作流。若对照任务返回金额结算，立即停止高成本提交；失败且未扣费的校验任务也不能证明 Key 类型。

消费级 Key 的稳定执行顺序：

1. 从环境变量读取 Key，校验所有本地文件、`api_format` JSON 映射的 `nodeId.fieldName` 及 API 页面确认的发布入口；不要把 Key 放进 Skill、命令示例或持久日志。
2. 先上传全部唯一素材，逐个确认 `code=0`、`data.download_url` 非空，再一次性组装 `nodeInfoList`。
3. 向 `/openapi/v2/run/workflow/{workflow_id}` 只提交一次。返回 `taskId` 后只查询该任务；查询超时、连接提前结束或长时间 `RUNNING` 都不授权自动重提，避免重复扣费。
4. 轮询 `/openapi/v2/query` 到 `SUCCESS` 或 `FAILED`。瞬时查询网络错误可有限重试；工作流节点错误按 `failedReason` 定位，实例级 CUDA/CUDNN 错误可在已验证兼容实例上重跑，但切换实例前必须有真实失败证据。
5. `SUCCESS` 后立即将 `results[].url` 原子下载到本地并验证文件非空；视频环境有 `ffprobe` 时再验证编码、时长和尺寸。
6. 最终同时交付本地文件和结算回执。消费级 RH 币目标的唯一合格条件是 `consumeCoins > 0` 且 `consumeMoney` 为空或 `0`；失败任务是否扣费也以同一查询响应为准。

## 念念智选网站接入契约

将下面的链路实现为一个服务端 Provider（不要把上传、提交、轮询散落到页面组件）：

`网站上传 -> 自有素材记录/哈希 -> RH 上传缓存 -> AI 应用或 workflow 提交一次 -> 持久化 providerTaskId -> 查询至终态 -> 回读 usage -> 下载到自有媒体存储 -> 网站返回自有 assetId/下载接口`

- 网站 API 只接收用户文件和工作流参数，先校验登录、归属、文件类型/大小、任务幂等键与用户积分授权；Key 只从服务端环境变量读取。
- Provider 必须持久化 `provider_task_id`、入口类型、`instance_type`、上传资源引用、状态、错误和 `usage.consumeCoins/consumeMoney`；提交响应没有 `taskId` 时立即失败。
- 提交请求禁止自动重试。连接超时属于“提交结果未知”，按已保存任务键查询或人工核对后再决定，不得盲目重新提交；查询网络错误才允许有限退避重试。
- 结果 URL 仅在服务端使用并立即下载到网站自己的数据盘，校验非空及视频 `ffprobe`/等价媒体探针；前端只拿网站自己的 `/api/video-tasks/{id}/download` 或媒体 ID。
- 任务成功不等于收费正确：若产品承诺“扣 RH 币”，终态必须回读 `consumeCoins > 0` 且 `consumeMoney` 为空或 `0`，否则标记结算异常，不向用户报成功扣币。
- 任务状态要能恢复：Worker 重启后用持久化 `provider_task_id` 继续查询；超时返回可恢复状态和任务 ID，不重新创建任务。

念念智选的最小实现应复用已有 `uploaded_assets`、`video_tasks` 和 Worker/Harness；为 RunningHub 增加独立 Provider 模块和受控 `runninghub` 路由，保留现有网站媒体下载鉴权。详细字段和伪代码见 [references/niannian-consumer-provider.md](references/niannian-consumer-provider.md)。

### 活跃网站仓库的 GitHub 交接

当 RunningHub 能力需要进入一个仍由其他任务持续开发的网站时，先确认该任务、权威仓库和最新 `main`；不要把旧候选、原始 Nomi 构建或完整发布包复制回权威源码。若当前任务正在修复或发布共享页面，等待它的修复 PR 合并且 CI 通过，再从该精确 `main` 建立 Issue 关联的独立工作树。

Provider 实现只修改服务端适配器、任务存储、环境变量示例和聚焦测试；不同时修改对方正在维护的 Studio 运行适配器。提交为一个窄 PR，写清用户链路、允许文件、保护页面、验证结果、真实 Provider 消费和未完成的 UI 映射。接收任务从当前 `main` 审阅并合并该 PR；需要 Studio 映射时由 Studio Owner 在合并后另做最小提交。合并后的 `main` 才能成为发布候选输入。

固定交接顺序：

`当前稳定 main -> 独立 Issue/工作树 -> Provider 聚焦 PR -> 原开发任务合并 -> 必要的 Studio 映射 -> 候选与真实回读`

任何 API Key、Cookie、用户素材、Provider 原始响应、临时结果 URL 和运行时任务数据都不得进入分支、Issue、PR 或交接消息。分支存在、HTTP 成功或 PR 创建都只是进度；只有接收任务完成合并、所需映射和真实网站回读后，才算网站能力交付。

Windows 上使用 [`scripts/run_consumer_workflow.ps1`](scripts/run_consumer_workflow.ps1) 执行上述路径。它会对相同素材路径去重、用 HTTP/1.1 上传、避免自动重提、容错轮询、校验 RH 币结算并下载结果；例如：

```powershell
$env:RUNNINGHUB_API_KEY = '<仅保存在当前进程>'
& .\scripts\run_consumer_workflow.ps1 `
  -WorkflowId '<workflow_id>' -InstanceType plus `
  -FileInput '275.video=C:\path\reference.mp4','299.image=C:\path\subject.png'
```

先加 `-DryRun` 可只验证文件、节点映射和脱敏请求结构，不上传、不提交、不扣费。公开素材也可作为 `-ValueInput 'nodeId.fieldName=https://...'` 直接传入；不要把 API Key、Cookie、余额、临时结果 URL 或用户素材写入 Skill/注册表。

若使用 `webhookUrl`，回调事件通常为 `TASK_END`，`eventData` 与查询响应同构；仍应以查询接口回读任务状态、结果和结算，不能只凭 Webhook 到达宣称交付。

对 MiniMax H3 Ref2VA 多图工作流，使用 [`scripts/append_h3_image_references.py`](scripts/append_h3_image_references.py) 从现有末端参考链追加一张或多张参考图。它只生成新的本地 JSON 副本；导入、保存、发布并取得 workflow ID 仍必须在 RunningHub 上完成。

对 MiniMax H3 Ref2VA 的“多图 + 音频参考”需求，使用 [`scripts/append_h3_audio_reference.py`](scripts/append_h3_audio_reference.py)。它从已验证的图像+音频工作流复制兼容的 `LoadAudio` 与 `AudioReference` 节点，将已有多图参考链接入音频参考层，再同时回接 `Target.references` 和 `Encode.references`。脚本会校验节点与连线完整性、清空新音频节点的示例素材，并且只写入新的本地 JSON 副本；必须在 RunningHub 导入后读取实际 workflow ID 和 API 页面契约，才可以注册为调用通道。

## 选择改参数还是改拓扑

- 已存在的图片、音频、提示词、尺寸、采样、输出字段：优先通过现有 API 的 `nodeInfoList` 覆盖，不改变工作流拓扑。
- 要增加图片数量、增加视频/音频参考链、合并首尾帧、插入控制模型或改变节点连线：创建并发布新工作流副本，再将新 ID 作为独立通道接入。

不要把 `api_format` 中数组形式的连线、纯前端逻辑字段或未发布工作流当作可覆写参数；标量 `inputs` 字段可以进入 `nodeInfoList`，工作流发布状态、endpoint、参数限制与真实运行仍须由 API 页面或授权回执验证。

## 按需扩展与工作流资产沉淀

当用户在一个实际任务中需要某种明确能力，而已登记的 API 通道不能完成时，直接完成该能力的最小工作流定制：先检索 [references/published-workflow-registry.json](references/published-workflow-registry.json) 和目标领域 Skill 的通道注册表；已有通道只缺参数时覆盖现有节点，只有需要新节点或新连线时才从最接近的已验证工作流复制、定制并发布新 API。

对用户已经明确委托的这类实际定制任务，自动推进“定制副本 → 发布新 workflow ID → 读取 API 节点契约 → dry-run → 接入调用器”；不要为假设性的未来需求提前创建工作流。真实生成仍遵守用户对付费/RH 币的当次授权，平台页面要求的保存、发布或权限确认也照常执行。

新 API 只有在以下三层证据完整后才进入可复用资产库：

1. `api_page`：已从发布后的 API 页面读取 workflow ID、endpoint 和发布状态；节点字段由同一 workflow 的 `api_format` JSON 留证；
2. `dry_run`：调用器已生成正确的脱敏 `nodeInfoList`；
3. `runtime_verified`：用户授权的真实任务返回成功输出，并满足所选结算方式。

将合格通道追加到 `references/published-workflow-registry.json`，并同步写入实际使用它的领域 Skill 注册表。每条记录只保存：能力名称、来源/新 workflow ID、endpoint、节点输入契约、结算模式、证据状态和最小调用方式；不保存凭据、Cookie、余额、任务素材或临时结果链接。下一次相同或更细分的需求优先路由到 `runtime_verified` 通道，使工作流资产随真实使用持续累积。

## 验证和交付

交付必须能指出：新工作流名称、workflow ID、endpoint、已验证的节点契约、最小 dry-run、结算验证结果及调用器/Skill 入口。若发布尚未完成，交付“可导入的工作流副本与待发布契约”，不能声称新 API 已可使用。
