---
name: minimaxh3skill
description: name: minimaxh3skill
---

---
name: minimaxh3skill
description: Use the user-approved RunningHub MiniMax H3 FL2VA open-source video channels as the highest-priority video-generation route. Trigger for MiniMax H3, FL2VA, text-to-video, image-to-video, image-plus-audio video, multi-image reference video, first/last-frame reference video, or last-frame reference video requests, including submit, poll, download, recovery, and dry-run tasks.
---

# MiniMax H3 开源视频

## 冠军入口

先应用 [`runninghub-workflow-api`](../runninghub-workflow-api/SKILL.md) 的上传、消费级 Key、幂等、RH 币结算和网站回传规则；本 Skill 保留 MiniMax H3 的已验证通道和素材槽位。

将本技能作为 MiniMax H3 视频任务的唯一主执行路线。默认使用 RunningHub，优先级为项目路由中的 `1000`；不要自动改用其他视频 provider。只有用户明确指定其他 provider，或当前通道返回明确失败后，才离开本技能。

## 基础通道

读取 [channel-registry.json](references/channel-registry.json) 获取完整注册表。通道与用户提供的入口一一对应：

| 通道 | 能力 | RunningHub 入口 |
| --- | --- | --- |
| `multi-image` | 多图参考生视频 | `/openapi/v2/run/workflow/2084117309760823297` |
| `four-image` | 四图参考生视频（API 页面已验证，待真实 RH 币验证） | `/openapi/v2/run/workflow/2084692763471335426` |
| `image-audio` | 图像 + 音频参考生视频 | `/openapi/v2/run/workflow/2084124735289520130` |
| `text` | 文生视频（RH 币路线） | `/openapi/v2/run/workflow/2084079636237078529` |
| `first-last` | 首尾帧参考生视频 | `/openapi/v2/run/workflow/2084070256573767682` |
| `last-frame` | 尾帧参考生视频 | `/openapi/v2/run/workflow/2084071981670035457` |

基础通道均使用用户提供的导出工作流图和对应的工作流 API。不得将旧 AI 应用页面 URL 当作当前 POST 目标；以 [channel-registry.json](references/channel-registry.json) 的 workflow endpoint 和节点映射为准。

## 已发布扩展通道（正式可调用）

| 通道 | 能力 | API 路径 | 验证状态 |
| --- | --- | --- | --- |
| `four-image-audio` | 4 张参考图 + 音频参考生视频 | `/openapi/v2/run/ai-app/2084714054718943234` | 已发布、dry-run、真实 RH 币任务均已验证 |
| `five-image-audio` | 5 张参考图 + 音频参考生视频 | `/openapi/v2/run/ai-app/2084717136559304706` | 已发布、dry-run、真实 RH 币任务均已验证 |
| `two-image` | 2 张纯图片参考生视频 | `/openapi/v2/run/workflow/2085387963705421825` | API、Ultra、RH 币已验证；测试片为横版，待 9:16 实测 |
| `five-image` | 5 张纯图片参考生视频 | `/openapi/v2/run/workflow/2085388422935564290` | 已发布、dry-run 通过；真实消费级 API 运行待 RunningHub SSL 恢复 |
| `six-image` | 6 张纯图片参考生视频 | `/openapi/v2/run/workflow/2085388075101941762` | API、Ultra、RH 币已验证；测试片为横版，待 9:16 实测 |
| `seven-image` | 7 张纯图片参考生视频 | `/openapi/v2/run/workflow/2085388173340925954` | API、Ultra、RH 币已验证；测试片为横版，待 9:16 实测 |
| `eight-image` | 8 张纯图片参考生视频 | `/openapi/v2/run/workflow/2085386742324092929` | API、Ultra、RH 币已验证；测试片为横版，待 9:16 实测 |
| `nine-image` | 9 张纯图片参考生视频 | `/openapi/v2/run/workflow/2085388017635778561` | API、Ultra、RH 币已验证；测试片为横版，待 9:16 实测 |

这些扩展通道已经登记在 [channel-registry.json](references/channel-registry.json) 的正式 `channels` 节点中；对应的 API 页面地址也保存在 `api_url` 字段。扩展通道也必须以注册表的实际 endpoint 为准。`four-image-audio` 使用 4 个重复的 `--reference-image` 参数，`five-image-audio` 使用 5 个重复的 `--reference-image` 参数；两者都使用 1 个 `--audio` 和 1 个 `--prompt`，可以直接复用已发布接口，不需要再次发布。`two-image` 至 `nine-image` 的纯图片工作流按注册表逐项上传对应数量的参考图，不能按图数猜节点，也不能超过 9 张。

`five-image` 虽已发布并通过节点 dry-run，但真实消费级 API 运行尚未完成；在 RunningHub SSL 恢复且结算回执满足 RH 币规则前，只能作为待验证通道，禁止自动路由生产任务。

`two-image` 已通过 Personal 画布 Ultra 真实任务 `2086070745657733121` 并发布 API；查询回执为 `consumeCoins=203`、`consumeMoney=null`。但已下载的测试片实际为 `832x480`、`10.125秒`，触发 `H3_TARGET_DIMENSION_MISMATCH`；在用 `480x832` Target 完成一条新的消费级实测前，不得进入竖版生产路由，也不得替换为二图+音频候选。

`six-image`、`seven-image`、`eight-image`、`nine-image` 的 Personal Ultra 任务回执也已闭合：分别为 `consumeCoins=207/231/269/281`，`consumeMoney=null`。但四个下载结果同样是 `832x480`、`10.125秒`，因此五条通道均只验证了 API、个人 RH 币结算和文件可读性，尚未验证竖版输出。五图纯图片通道仍没有本轮发布后的消费级 API 任务回执；二至九图通道在新的 `480x832` 实测通过前均不得自动路由竖版生产。

## 执行规则

1. 先确认通道和输入资产。所有提示词默认用中文；保留 `MiniMax H3`、`FL2VA`、节点字段名等固定标识。
   正式提交固定使用 `instanceType=ultra`；提交器会拒绝其它实例类型。每个任务必须显式传入该 VG 的正式生视频提示词，禁止依赖工作流导出的样例提示词。
2. 先运行 `--dry-run`，检查 endpoint、`nodeInfoList`、输入文件上传占位符和敏感字段脱敏；五个通道都必须显示注册表中的 `/openapi/v2/run/workflow/` endpoint。用户明确要求真实生成后再提交。
3. 本地图片、音频、视频必须先通过 `/openapi/v2/media/upload/binary` 上传，随后把返回的 `data.fileName` 放入 `fieldValue`。公网 URL 可直接作为 `fieldValue`。
4. 提交统一使用 `POST /openapi/v2/run/workflow/{id}` 或 `POST /openapi/v2/run/ai-app/{id}`，请求体只包含 `nodeInfoList` 与可选实例参数，并在请求头发送 `Authorization: Bearer`。
5. 保存提交响应中的 `taskId`，使用 `POST /openapi/v2/query` 轮询。`QUEUED`、`RUNNING`、空 `failedReason` 都不是失败；只有明确的 `FAILED`、`REJECTED`、`CANCELLED` 或非空错误信息才停止。
6. 所有通道完成后，核对 `usage.consumeCoins` 为正数，且 `usage.consumeMoney` 为空或 0；否则报告为结算异常，不要自动重提。输出 URL 有效期可能有限。拿到 `results[].url` 后立即下载到 `--download-dir`，并验证文件存在且不是 HTML 错误页。
7. 网络超时、SSL EOF 或本地下载中断后，先用已有 `taskId` 查询，不要盲目重复提交。

## 调用器

使用 [minimax_h3.py](scripts/minimax_h3.py)。它支持注册表中所有正式通道的统一提交和结果恢复：

```powershell
# 查看注册表
C:\Users\lsb\anaconda3\python.exe C:\Users\lsb\.codex\skills\minimaxh3skill\scripts\minimax_h3.py list

# 不扣费检查文生视频 RH 币路线
C:\Users\lsb\anaconda3\python.exe C:\Users\lsb\.codex\skills\minimaxh3skill\scripts\minimax_h3.py submit --channel text --prompt "一位穿红色外套的人在雨夜街头缓慢回头" --aspect-ratio 16:9 --duration 5 --width 832 --height 480 --dry-run

# 图像 + 音频通道的已知字段快捷方式
C:\Users\lsb\anaconda3\python.exe C:\Users\lsb\.codex\skills\minimaxh3skill\scripts\minimax_h3.py submit --channel image-audio --image .\first.png --audio .\voice.mp3 --prompt "人物自然说话并轻微转身" --aspect-ratio 9:16 --duration 5 --dry-run

# 多图参考通道固定使用 3 张参考图
C:\Users\lsb\anaconda3\python.exe C:\Users\lsb\.codex\skills\minimaxh3skill\scripts\minimax_h3.py submit --channel multi-image --reference-image .\ref-1.png --reference-image .\ref-2.png --reference-image .\ref-3.png --prompt "三张参考图保持人物和产品特征一致" --aspect-ratio 16:9 --duration 5 --dry-run

# 真实提交并等待下载（需要 RUNNINGHUB_API_KEY）
C:\Users\lsb\anaconda3\python.exe C:\Users\lsb\.codex\skills\minimaxh3skill\scripts\minimax_h3.py submit --channel first-last --input-file .\first-last-inputs.json --wait --download-dir .\outputs\minimaxh3

# 不重新生成，恢复既有任务
C:\Users\lsb\anaconda3\python.exe C:\Users\lsb\.codex\skills\minimaxh3skill\scripts\minimax_h3.py query --task-id 123456789 --wait --download-dir .\outputs\recovered
```

`--input-file` 接受 `[{"nodeId":"4","fieldName":"image","fieldValue":"..."}]`，也接受 `{ "4.image": "..." }`。当接口页面的节点编号或字段发生变化时，以页面注册表/接口文档为准，使用原始 `--input` 覆盖，不要猜节点。

`multi-image` 的当前工作流需要 3 张参考图，对应 `4.image`、`19.image`、`20.image`；`four-image` 需要 4 张参考图，对应 `4.image`、`19.image`、`20.image`、`21.image`。两个通道均使用重复的 `--reference-image` 参数，并且必须与各自固定张数完全一致。其余通道可用快捷参数：`image-audio` 使用 `--image`、`--audio`，`first-last` 使用 `--first-image`、`--last-image`，`last-frame` 使用 `--image`。

`four-image` 已在 RunningHub API 页面取得 workflow ID 和 endpoint，但尚未以真实任务验证 RH 币结算；用户明确要求使用四图生成时，先 dry-run，再按当次付费授权提交，只有任务回执满足 RH 币结算规则后才提升为默认已验证通道。

## 参考视频高级控制

图像 + 音频与多图参考通道均可传入导出工作流已经存在、但不改变工作流拓扑的高级字段：`--ref-image-size`、`--seed`、`--sigma-points`、`--video-shift`、`--audio-shift`、`--accel`、`--denoise-video`/`--no-denoise-video`、`--cache-dit-rdt`、`--cache-dit-mc`、`--cache-dit-warmup`、`--velocity-stride`、`--fps`、`--bit-depth`、`--filename-prefix`、`--output-format`、`--codec`。

例如，生成稳定复现版本时固定 `seed`；要快速探索时改变 `seed`；要控制交付封装时设置 `fps` 与 `codec`。组合型字段（如 `ref_image_size`、`accel`、`codec`）的可选值以该工作流在 RunningHub 画布/API 页显示的值为准，不能猜测。首次使用某个新增字段，先 `--dry-run` 核对节点映射；只有用户明确同意一次真实 RH 币任务后，才能把该字段标记为线上验证。

```powershell
# 图像 + 音频：固定随机性、保留参考图策略并指定 24fps
C:\Users\lsb\anaconda3\python.exe C:\Users\lsb\.codex\skills\minimaxh3skill\scripts\minimax_h3.py submit --channel image-audio --image .\first.png --audio .\voice.mp3 --prompt "人物自然说话并轻微转身" --seed 42 --ref-image-size match --fps 24 --dry-run

# 多图：三张参考图不变，使用已在工作流中存在的采样控制
C:\Users\lsb\anaconda3\python.exe C:\Users\lsb\.codex\skills\minimaxh3skill\scripts\minimax_h3.py submit --channel multi-image --reference-image .\ref-1.png --reference-image .\ref-2.png --reference-image .\ref-3.png --prompt "保持人物、产品和场景特征一致" --seed 42 --accel manual-velocity --dry-run
```

要增加参考图数量、合并多图与音频、引入视频参考或增加新模型节点，不能仅追加 `nodeInfoList` 字段。使用 [`runninghub-workflow-api`](../runninghub-workflow-api/SKILL.md) 创建新的工作流副本、发布新的 workflow ID、获取 API 节点契约后再登记为独立通道；原通道保持不动。

## 静态汽车多角度车型替换（S-001，20260807）

当原视频是静态汽车的多角度运镜展示时，按以下语义生成 H3 提示词：

- 将 `@视频` 作为唯一的场景、机位、运镜路径、镜头时长、切镜顺序、光线、遮挡、反射和运动模糊参考；车辆保持原视频中的静止状态。
- 将全部车辆图片共同作为目标车型的物体/外观参考，锁定同一台车的车身比例、颜色、轮毂、灯组、尾翼和材质细节。
- 不把单张参考图绑定到固定镜头、固定角度或固定时长，不按图片上传顺序排镜头，不把图片当首帧或尾帧；依据当前镜头的真实视角，从全部参考图综合还原最匹配的可见车辆角度。
- 明确写出“视频决定镜头如何拍，图片共同决定车辆长什么样”；只替换汽车主体，不新增车辆动作、镜头或展示角度，不改变背景、地面、人物、道具和原生声音。
- 在输出前检查目标车辆跨镜头的身份、车身比例、颜色、轮毂、灯组、尾翼、阴影、反射、遮挡和地面接触是否连续；如果工作流没有视频参考输入或无法消费请求的图片数量，先核对通道节点契约，不得把“已上传素材”当作已被模型使用。

## 定制通道积累

对于当前五个通道不能满足、且用户已明确要求实现的 H3 视频能力，调用 `runninghub-workflow-api` 的「按需扩展与工作流资产沉淀」：从最接近的稳定 H3 工作流复制，完成最小拓扑改动，发布为新 workflow API，并在 API 页面、dry-run 和授权的真实 RH 币任务验证后写入本 Skill 的通道注册表。以后同类需求优先使用该已验证定制通道；不得覆盖原五个稳定通道，也不得为未发生的需求预建工作流。

用户明确要求提前储备能力范围时，可以读取 [candidate-workflow-registry.json](references/candidate-workflow-registry.json) 选择已经导入工作台的候选副本。候选副本只证明工作流拓扑和工作台 ID，不是 API；必须先完成 API 页面、dry-run 和用户授权的真实任务三层证据，才能提升到正式通道。候选副本默认不运行、不扣费、不参与自动路由。

## 凭据与安全

- 从当前目录及父目录最近的 `.env` 读取 `RUNNINGHUB_API_KEY`；环境变量可作为补充。
- 不在提示词、日志、截图、技能文件或最终回复中打印 API Key、Authorization header 或完整敏感响应。
- 未经用户明确授权，不执行真实付费提交；`--dry-run` 不会创建生成任务。

## 交付检查

- 通道 ID 与 endpoint 与注册表一致。
- `dry-run` 显示正确的 endpoint 和非空 `nodeInfoList`。
- 真实任务记录 `taskId`、通道、输出 URL 和本地文件路径。
- 本地视频文件存在并可读取；只有满足这一点才报告“已生成/已交付”。

## Step04 语义合同前置校验（S-031，20260807）

真实提交前，H3 只接受 Step04 已闭合的生产组。调用 `scripts/minimax_h3.py submit` 时必须提供 `--step02-manifest`、`--step04-ir` 和 `--group-id`；提交器在本地、无 Provider 阶段加载 `mx-shortdrama-production-harness/scripts/validate_step04_prompt_contract.py`，先验证视觉发言人、说话人、对白时长/重复、组区间、`@` 参考图消费、泛称和字幕策略。校验失败返回 `H3_SEMANTIC_CONTRACT_BLOCKED`，不上传参考图、不创建任务、不扣 RH 币。

`--dry-run` 在未携带合同参数时仍可用于检查通道节点；一旦携带 Step04 合同，就必须真实运行语义校验。H3 的 `ultra`、参考图数量、路径和 SHA 通过不等于提示词合格；已生成但语义或视觉质量不合格的旧任务只保留审计，不得盲目重提或当作正式成片。

## 视频组聚合与参考图数量合同（20260807）

Step04 C 层可以保留用于证据追溯的 0.4–4.7 秒细粒度子段，但本技能的 H3 提交单元只能是完整视频组。提交器接收编译后的组清单，不逐个提交子段；相邻连续子段必须在提交前合并为 `5–15` 秒组，并保留每个子段在组内从 `0.000秒` 起算的相对时间、提示词变化和来源区间。不得凭空延长、补造动作或丢失子段证据。

每组参考图按最终资产 ID 去重后计数，范围为 `1–9` 张；只上传该组镜头实际消费的最终资产原图及其 SHA，不上传 Word 预览、原片抽帧、身份母图、故事板或已淘汰版本。组时长、参考数量、资产路径和 SHA 任一不合格时，在本地返回结构化 blocker，不上传媒体、不创建任务、不扣费。

通道映射必须与实际参考图数量一致。未发布的 5 图/6 图候选可以写入本地 `prepared` 参考清单并标记 `channel_status=unpublished_candidate`，但不得作为 Provider 任务提交；只有真正执行 `submit` 时才检查对应 RunningHub workflow 的发布状态。未发布时返回明确的 `H3_REFERENCE_WORKFLOW_UNPUBLISHED`，保留清单供恢复，发布后从该提交边界继续。H3 实例类型固定为 `ultra`，不得为了绕过数量或发布状态改用其他数量通道。
## RunningHub 画布优先与消费级授权封口（S-032，20260807）

真实失败已证明：环境中的 `RUNNINGHUB_API_KEY` 可能属于企业级钱包；直接调用工作流 endpoint 会把本应由个人/消费级账号承担的任务记为 `consumeMoney`，且无法证明画布中的参考图和提示词实际被消费。以后 H3 多图任务固定按以下顺序执行：

1. 以用户当前 RunningHub 画布中的工作流为唯一拓扑来源，在画布右侧的 Load Image 节点逐项上传当前最终资产原图，并在对应提示词节点填入 Step04 已验收的整段提示词；不从 Word 反抽图，不使用身份母图、原片抽帧、故事板或旧下载图。
2. 先在画布确认参考槽位数量、图片顺序、提示词、9:16、H3 `Ultra` 和当前个人/消费级账户，再由用户已授权的画布操作点击运行。画布运行前禁止使用环境变量中的企业级 Key 直连提交；该环境变量不得作为个人/消费级任务的默认凭据。
3. 只有画布任务真实成功、输出 MP4 可读取且通过最小视频 QA（文件非 HTML、H.264/AAC、画幅正确、时长在生产组合同内、无占位图/错误图、人物和关键道具与上传资产一致）后，才允许从该画布发布 API。发布的 API 必须回写画布工作流 ID、发布回执、运行任务回执和当前参考图数量，才能登记进 `channel-registry.json`。
4. 结算必须回读个人/消费级账户的实际字段；若出现 `consumeMoney`、企业钱包标识、账号不一致或无法证明当前画布账户，任务只能标记为 `H3_BILLING_SCOPE_MISMATCH`，不重提、不自动切换 Key、不发布 API。视频质量不合格时标记 `H3_OUTPUT_QUALITY_BLOCKED`，保留真实结果和 QA 原因，也不得发布为正式通道。

画布路径的最小 DAG：

```text
Step04 最终资产与提示词 -> RunningHub 画布上传/绑定 -> 个人账户 Ultra 运行 -> 视频 QA 与结算回读 -> 发布 API 并登记通道
```

未经画布成功运行和消费级结算回读的 workflow ID 只能是候选，不得被脚本或 Harness 当作正式 API 通道调用。后续恢复时读取画布运行回执，从最早缺失的“上传、画布运行、QA、发布”节点继续，不重复上传或重复扣费。

## H3 实际画幅三层校验（S-033，20260808）

真实失败已证明：提示词中的 `9:16` 不会覆盖 RunningHub `Target` 节点的实际画幅；当节点仍为 `16:9 / 832x480` 时，成片仍会导出横版。

画布提交前必须逐项一致：Step04 合同的画幅和时长、`Target` 节点的 `aspect_ratio`/`width`/`height`、以及整段提示词中的画幅要求。`9:16` 默认设为 `480x832`，除非当前工作流明确支持且合同指定另一组合法竖版尺寸。

下载后必须以本地可解码 MP4 的真实 `width`、`height`、`duration` 验收，不能只依据提示词、节点截图、任务状态或播放器视觉比例。任一层不一致时标记 `H3_TARGET_DIMENSION_MISMATCH`，不交付、不发布 API；只修复 `Target` 参数后重跑，旧视频保留审计但不得加入正式素材。

## H3 工作流 JSON 导入前槽位合同（S-034，20260809）

真实九图模板复核发现：导出的 JSON 可能同时保留样例资产、重复的 `LoadImage` 文件名，以及与提示词相反的 `Target` 参数。以后导入、上传或发布任何 H3 多图工作流前，必须先对导出的 JSON 做本地静态校验，不得把“节点数量正确”当作“参考图已经正确消费”。使用 `scripts/validate_workflow_json.py`，并显式传入本次通道的图片数量；校验必须同时通过：

- `LoadImage` 数量等于通道契约，文件名全部不同且没有模板样例、眼镜示例或 `__UPLOAD_SLOT_*__` 占位符；
- 恰好一个 `RHMiniMaxH3Ref2VATarget`，其 `aspect_ratio`、`width`、`height`、`duration_seconds` 与本次合同一致；竖版默认是 `9:16 / 480x832 / 5秒`；
- Encode/提示词节点存在非空提示词，提示词明确写出同一画幅和尺寸，且不包含相反的 `16:9 / 832x480`；
- 所有图片值已经替换为当前 RunningHub 上传回执文件名；本地路径、Word 预览、故事板、原片帧、身份母图和旧下载图均不得作为槽位值。

任一检查失败都返回结构化错误并停止后续上传、运行和发布：`H3_WORKFLOW_JSON_INVALID`、`H3_REFERENCE_SLOT_COUNT_MISMATCH`、`H3_REFERENCE_SLOT_DUPLICATE`、`H3_SAMPLE_ASSET_REMAINS`、`H3_REFERENCE_UPLOAD_PLACEHOLDER_UNRESOLVED`、`H3_TARGET_NODE_CONTRACT_INVALID`、`H3_PROMPT_TARGET_MISMATCH` 或 `H3_PROMPT_TARGET_MISSING`。修复只能回到最早缺失的 JSON/上传绑定阶段，不能在画布里盲目点击运行。该门禁只验证工作流载荷，不替代个人账户、实际 MP4 和费用结算回读。
