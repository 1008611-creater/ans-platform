---
name: mx-shortdrama-production-harness
description: 统筹一项原片短剧转绘任务，从用户提交素材到可播放视频持续推进。用于新线程启动、跨步骤恢复、并发调度、渠道执行或现有转绘 Skill 路由出现缺口时；加载 mx-shortdrama-00-router 作为唯一专业路由，并将真正需要用户判断或需要补全路由的卡点压缩为最多三道选择题。
---

# 短剧转绘生产主控

把本 Skill 当作执行主控，不当作第二份转绘方法论。专业步骤、资产规则、提示词规则、渠道规则均以 `$mx-shortdrama-00-router` 和它指向的编号 Skill 为准。

## 启动

按以下顺序读取，随后立即开始最早未完成的生产步骤：

1. 当前项目的 `AGENTS.md`。
2. `$mx-shortdrama-00-router`。
3. `D:\codex-work\zhuanhui\skills\mx-shortdrama-00-router\references\full-chain-dag-contract.md`。
4. 本次任务已给出的原片、已验收产物、用户决定和渠道状态。

为本次任务建立一个 job-local `harness_state.json`。只记录：原片精确路径和 SHA-256、目标地区/语言、渠道、当前最早未完成节点、各节点精确输入输出路径、真实 blocker、下一动作和用户决定。它用于恢复，不替代真实产物、镜头事实或渠道结果。

## 主控线程与置顶任务管理线程

用户启用本 Harness 后，当前线程就是唯一生产主控。读取并执行 [线程控制合同](references/thread-control-contract.md)，它定义主控创建置顶管理线程、单一写入者、动作租约、管理线程调度、统一终态回传和 App 接口修复。

摘要：主控是唯一可以修改生产状态和提交渠道的线程；管理线程接收主控的有界工作请求，调用子智能体并发完成独立支线，自动通过既有路由已允许的步骤，收齐统一终态后通过原生任务消息主动送达主控，并回读主控确认同一五字段 payload 已真实出现。没有这个送达回执时，管理线程自己的最终回答只算中间结果，主控不得据此推进。启动时先调用 `codex_app__set_thread_title` 命名当前主控，再调用 `codex_app__set_thread_pinned` 置顶主控并用 `codex_app__list_threads` 回读确认；随后按合同创建、命名、置顶并回读一个独立管理线程。

目标未交付前，主控和管理线程不得以“等待中”结束任务。它们必须等待子任务/渠道事件并在事件到达后继续最早节点；不使用周期性心跳替代持续执行。创建或置顶管理线程遇到真实 App 错误时，进入合同规定的接口修复路径，直到取得真实 `threadId`、置顶回读和首条状态回传；不得伪造成功、静默跳过或把失败降级为普通状态展示。

缺少下列任一用户输入时，只问必要项；A 必须是推荐项，且一次最多三题：

- 原片精确路径或用户提供的可访问素材。
- `target_region` 和 `target_language_locale`。
- 当前任务图片/视频渠道。每个新任务都主动问，不能默认上个任务渠道。

除上述输入与真实创作异常外，直接按路由判断并执行。Step04 生产包 Word 是唯一常规中途创作确认点；Word 已确认后，不询问资产卡、首帧、故事板、提示词或单个视频组的确认，持续自动推进。不要问用户模板细节、术语细节或已由权威 Skill 决定的常规问题。

## 主循环

每次获得新输入、子智能体终态、渠道状态变化或用户作答后，执行：

```text
读取 harness_state + 当前节点精确产物
-> 找到最早未完成、依赖已满足的节点
-> 立即执行或派发该节点
-> 写入真实路径和下一动作
-> 继续，直到视频已交付或出现真实用户决策/外部阻塞
```

不要将计划、提示词、已提交渠道任务或“等待子智能体”称为视频交付。渠道提交后主动轮询；完成后下载、检查可播放性并把实际视频、参考图和实际提示词展示给用户。所有图像、声音和视频参考均用代码上传，绝不要求用户手动上传。

Step04 恢复必须细化到输入放行门和 A/B/C/D 层，不得把一个“Word 已存在”当作 Step04 完成：`Step02 语义放行 -> A 镜头人物实例与证据绑定 -> B 资产与连续性合同 -> C 事件型毫秒提示词 IR -> D Word/Markdown/渠道交付`。恢复时先读取 job-local `step04_input_gate_report.json`、`step04_layers` 或对应 JSON 的精确路径和 SHA，找到最早缺失层；Step02 输入门失败、A/B/C 任一层缺失、哈希不匹配或语义质量门失败，直接从该层接管，不能用旧 Word 反推事实。Step02 只有 `status=accepted`、`semantic_status=accepted`、`acceptance_mode=semantic`、`semantic_alignment.status=accepted`、其 `mapping_policy` 为 `continuous_observation_local_interval_plus_segment_start; never_ordinal_shot_mapping`，且逐卡 `verdict=pass`、`needs_targeted_recheck=false` 才算可生产输入；结构完整旧卡必须保持阻塞。`semantic_alignment` 缺失、旧 Gemini 响应没有局部时间、或卡片没有回指 `semantic_unit_ids` 时，Harness 当前节点同样必须为 `step04a_input_gate`，下一动作是仅重跑对应连续视频段并执行项目唯一的 `tools/step02_interval_alignment.mjs`。只要 `terra_audit.needs_targeted_recheck=true`、`verdict=conflict` 或 `verdict=uncertain`，Harness 当前节点必须为 `step04a_input_gate`，下一动作是回到 Step02 对指定镜头补证/重拆；D 层只在 A/B/C 通过后渲染，Word 不能参与身份推断、角色替换、镜头计数或冲突消解。

Step04 的实际恢复顺序固定为：读取 `step04_input_gate_report.json` -> 运行 `tools/step04_abcd_compiler.py` 生成或回读 `step04_abcd_contract.json` -> 校验 A/B/C 层 SHA 与真实资产路径/SHA -> 仅从 C 层渲染 D。Harness 不得调用旧 Python Word 编译器绕过 A/B/C，也不得用旧 Word、旧提示词或旧资产表反推缺失事实。D 层失败只重渲染 D；A/B/C 失败必须从最早失败层接管，并保留原失败证据。

Step04 恢复还必须执行实例集合、中文显示名、事件证据和参考槽位四项同构门禁：A 层卡片实例集合与绑定集合必须完全相等；同镜头重复资产没有显式实例边界必须回到 Step02；B 层只接受纯中文 `@` 显示名并验证真实文件 SHA；人物、场景和关键道具都必须由 Step02 明确的 `asset_requirements` 声明 `kind/purpose/evidence_ids/required_shot_ids`，不得从构图、剧情或提示词文本猜资产；每个已声明资产都生成镜头级真实参考槽位。C 层事件和对白必须分别有证据 ID，人物参考槽位由事件消费，场景和道具参考槽位由该镜头上下文显式消费。Python 与念念 AI bridge 任一端失败，都保留 `step04_input_gate_report.json` 或结构化错误码并停在最早失败层，不生成表面完整 Word。

B 层还必须检查每个已验收资产存在结构化 `generation_prompt`（或兼容的 `image_prompt`/`prompt`），并将其与真实图路径、SHA-256、证据和参考槽位一起传给 D。C 层事件必须同时有起始状态、变化/动作、结束状态；对白必须显式提供独立毫秒区间，禁止用父事件区间回填。资产提示词缺失、事件状态缺失或对白时间缺失时，Harness 只输出结构化阻塞，不进入 Word。

### S-011 商业资产生命周期与最终资产门禁（20260805）

人物、场景和道具不再只以 `status=accepted` 判断可用性。每个 job 初始化 `asset_production_registry.json` 保存完整过程；`asset_registry.json` 只导出能被 Step04、首帧、故事板和视频消费的最终资产。历史资产不得删除，先进入 `legacy_pending_reconciliation`；没有补齐阶段、路径/SHA、QA 和来源链时不能进入任何新合同。

### 当前任务已通过资产复用（S-025）

触发条件是当前用户明确要求复用既有通过资产，且当前 job 有 `user_approved_asset_reuse_manifest.json`（或等价的当前任务用户决定）逐项绑定 `asset_id`、纯中文 `@` 显示名、精确原图路径、SHA-256 与可读回执。Harness 必须在任何同 `asset_id` 的图片渠道提交前先读取该清单、校验文件与 SHA，并把这些精确原图写入当前 job 的参考槽位；不得因它来自历史 job、旧 Word 或旧目录而重做、换脸、放大后冒充 2K，或用新图覆盖用户已通过图。

只有清单逐项通过“当前用户授权 + 文件存在 + SHA 一致 + 回执明确允许当前任务复用”四项验证，才可作为当前任务的用户授权复用资产进入 Step04、首帧、故事板和视频参考。仅凭文件名、目录、旧 `accepted` 状态或截图仍是 `legacy_pending_reconciliation`，不得自行晋级。若任一项缺失，恢复到该资产最早缺失阶段；若完整，则跳过该资产的身份母图、角色卡或单阶段重做，直接复用精确原图。已在本次错误提交但尚未消费的新图必须保留审计并标记 `archived_not_consumable`，不能替代复用资产，也不能被后续 Provider 扫描或上传。

### S-026 Step04 商业生产恢复与防错闭合（20260805）

已观察到的触发：旧 Word 曾在人物实例、资产阶段、台词 locale 和提示词正文错误时仍可生成。保护动作：渲染 Step04 Word、生成资产、首帧/故事板和上传视频。Owner：Harness 主控。退出条件：最早失败的 A/B/C/D 层通过其真实报告，且用户可见 Word 与 B/C 合同一致。

Harness 在 Step04 前依次运行四个本地、无 Provider 的门：`compile_semantic_step02.py` 的人物事实分区门、A 层实例/事件门、B 层 `step04_asset_prompt_contract.py`、C/D 层 `step04_word_contract_qa.py`。A 门要求可见人物、动作主体、口型说话人、画外说话人分离；B 门要求 B 提示词 SHA 与渠道 `actual_prompt` 一致、人物是最终角色卡或当前用户复用例外；用户复用例外先走 `step04_reuse_adapter.py`，视觉批准、路径、SHA 和允许使用回执齐全但缺同图 `actual_prompt` 时标为 `historical_visual_reference_only`，不得借用旧/新同 ID 提示词进入 B 或 Step05。C 门要求本地化 locale 闭合、每个 VG 从 0 计时、参考优先且无静态复述/字幕生产语句；D 门要求 Word 只展示 B/C、无 OCR/HTML、无内部资产 ID、无空白资产预览项。任一门失败时不生成/更新 Word、不提交任何渠道。

恢复顺序固定为：A 失败写 `step04_input_gate_report.json` 并只回 Step02 对指定镜头复核；B 失败写 `step04b_asset_prompt_gate.json` 并只恢复对应资产生命周期、实际提示词或回执；C 失败只重编译 C；D 失败只重渲染 D。旧 Word、旧合同、历史 accepted、渲染截图和目录扫描不能越过这些门。Harness 将旧输出标为 `stale_reference_not_consumable`，保留审计但从首帧、故事板、视频和新 Word 输入中排除。

人物资产固定走：`identity_master_prepared -> identity_master_submitted -> identity_master_downloaded -> identity_master_qa_passed -> character_sheet_prepared -> character_sheet_submitted -> character_sheet_downloaded -> character_sheet_qa_passed -> final_character_asset_accepted`。最终合同同时写 `asset_stage=character_sheet` 与 `lifecycle_state=final_character_asset_accepted`；身份母图是内部中间资产，永远不能写入最终 registry、B 层、Word 正式预览或任何下游上传列表。角色设定卡必须把已通过母图的精确原图和 SHA 上传到当前图生图渠道；没有上传回执、母图 SHA、母图 QA、角色卡 QA 或 16:9 约 2K 最终原图，严格失败关闭。

场景和道具采用各自的一阶段卡生产，但同样必须完成“提交、下载、SHA、结构/视觉 QA、最终验收”；最终合同除原图路径/SHA 与 `final_qa` 外，必须有实际 `generation_prompt`、真实 `evidence_path`、`asset_submission_receipt`（声明 `scene` 或 `prop` 阶段并含渠道任务 ID）和 `asset_download_receipt`（同一任务 ID、精确原图路径/SHA、字节/尺寸/文件 QA）。缺任一项分别报 `STEP04_ASSET_PROMPT_MISSING`、`STEP04_ASSET_EVIDENCE_MISSING`、`STEP04_ASSET_SUBMISSION_RECEIPT_MISSING`、`STEP04_ASSET_TASK_ID_MISSING` 或 `STEP04_ASSET_DOWNLOAD_RECEIPT_MISSING`；它们不能以旧文件名、Word 预览、计划提示词或渠道 HTTP 成功代替最终资格。

人物角色设定卡 QA 固定检查文件可解码/2K/16:9、多宫格与中文边缘标签、正侧背/头肩/表情组、同脸/同年龄/同发型/同服装/同配饰、全身比例与四肢、无原片演员/文字泄漏。QA 结果必须由 `tools/character_sheet_qa.py` 写入 job-local 生命周期：首次不通过时只准备同一母图、同一 SHA、同一渠道、带失败原因的定向重做；不得换脸、换母图、换身份、换渠道或重复提交成功任务。第二次失败时该工具返回 `external_blocked` 并保留两次实际结果；无依赖的资产组继续。

角色最终资产的机器准入字段必须逐项存在：`asset_stage=character_sheet`、`lifecycle_state=final_character_asset_accepted`、真实 `exact_path`/SHA-256、`identity_master_path`/SHA-256、母图 QA、`character_sheet_prompt`、角色卡实际提交回执、角色卡 `task_id`、`asset_download_receipt`（同任务 ID、最终原图路径/SHA 与文件 QA）、`display_name`、`purpose`、`evidence_path`、`allowed_instance_ids` 和角色卡 QA。角色卡提交回执必须声明 `asset_stage=character_sheet`，并绑定同一母图路径与 SHA；只含母图任务、Word 预览或文件名的记录一律报 `STEP04_CHARACTER_SHEET_SUBMISSION_RECEIPT_MISSING`。Harness 在进入 Step04 B 层前调用唯一生命周期校验器，按以下错误码失败关闭：`STEP04_CHARACTER_ASSET_STAGE_INVALID`、`STEP04_CHARACTER_SHEET_PARENT_MISSING`、`STEP04_CHARACTER_SHEET_PARENT_SHA_MISMATCH`、`STEP04_CHARACTER_SHEET_PROMPT_MISSING`、`STEP04_CHARACTER_SHEET_SUBMISSION_RECEIPT_MISSING`、`STEP04_CHARACTER_SHEET_TASK_ID_MISSING`、`STEP04_ASSET_DOWNLOAD_RECEIPT_MISSING`、`STEP04_CHARACTER_SHEET_QA_MISSING`、`STEP04_CHARACTER_SHEET_QA_FAILED`、`STEP04_FINAL_ASSET_REFERENCES_IDENTITY_MASTER`。任何一个错误都不生成/更新 Word、不导出首帧或故事板参考、不提交视频；恢复动作只指向该资产最早缺失阶段。

Harness 恢复时先运行 `tools/reconcile_asset_lifecycle.py` 读取 `asset_production_registry.json`，找到每个资产的最早缺失阶段；母图、角色卡、渠道上传、下载、QA 和最终登记必须各有精确路径、SHA 和非秘密回执。首帧、故事板和视频提交前必须用 `tools/prepare_downstream_references.py` 从最终 registry 导出精确路径/SHA，禁止从 Word 或母图库取图。旧 Word、截图和旧 `accepted` 状态不能反推资格。`tools/asset_lifecycle.py` 是资产阶段合同和历史隔离/最终 registry 导出的唯一实现；`tools/step04_abcd_compiler.py` 必须拒绝任何中间人物母图、父图来源不闭合或 QA 未通过的最终人物资产。

Step04 输入审计的参考帧必须按连续观察窗口的绝对毫秒从同一原片重新抽取首/中/尾，不得按旧切点编号找图；审计脚本必须使用真正异步的批次传输，禁止在并发调度中嵌套同步阻塞子进程。遇到帧时间错位或旧缓存，先切换到版本化审计目录并修正证据生成边界，再重跑受影响批次。Harness 只把同一窗口的 Gemini 卡、绝对时间帧和 Terra 结果合并，绝不把不同时间轴的结果拼成一个 Step02 卡。

对已生成视频不得自动重做。展示问题和建议，只在用户明确决定后重做指定生产组；其他没有依赖关系的工作继续。

全部视频组完成前，不进入字幕、完整剪辑、背景音乐或 Suno。完成后先问用户当次剪辑方案。

## 并发与协作

仅为彼此独立且写入范围不重叠的工作调用多个子智能体。优先并发：

- Step01 的音频、镜头/基础帧、文字/OCR 三支线。
- 不同关键道具卡、场景卡、角色卡和声音身份。
- 首帧、故事板、提示词和视频中彼此不连续的生产组。
- 已提交渠道任务的轮询、下载和独立结果检查。

连续镜头链、同一个锁定提示词、同一首帧职责、用户决定和付费提交由主控串行负责。不要让两个子智能体同时修改同一文件、同一生产组或同一渠道任务。

### 并发槽位与低价值任务削减（S-003）

当前线程最多使用 `3 个子 agent + 1 个主控`。存在三个或以上互不依赖、写入范围独立的工作单元时，主控应尽量占满三个子 agent；不足三个时不创建虚假任务，不把同一文件或同一生产组拆给多个 agent。子 agent 不得为了“占满槽位”重复读取同一审计结果、重复生成同一帧或只做可由本机脚本完成的字段类型检查。

Step01/Step02 默认采用轻量首轮 -> 风险触发补证：先并发音频、轻量帧、字幕候选和 Gemini 连续视频；仅将冲突镜头、边界不一致、字幕变化不明、年龄/身份冲突和会影响下游身份绑定的对白派发给密集帧/语义复核。contact sheet、Markdown 预览、raw response 整理、重复哈希和结构性 JSON 检查作为旁路或主控本地检查，不得阻塞外部观察、轮询或下一节点。

所有子任务仍必须以固定五字段终态回传；主控回读真实产物后再合并，不因 agent idle、已发消息或 HTTP 成功提前结束。合并写入者只有主控。

### 外部视觉审计速度合同（S-002）

适用范围：Gemini/Yunwu 视觉证据交给 GPT 做事实审计。默认模型为 `gpt-5.6-terra`；不得沿用旧批次的 `gpt-5.6-luna`、`gpt-5.6-sol` 或其他未声明模型。已成功的批次不重复提交，失败批次按镜头 ID 精确恢复。

主控先一次性准备全部独立批次和本地证据路径，再并发提交彼此独立批次；提交后的轮询、下载、JSON 合并和 QA 并发执行。单批次建议 4 个镜头，批次数量受实际额度和渠道并发限制约束；Word 生成、压缩预览、哈希和结构检查全部旁路执行，不得阻塞外部提交或轮询。

Step04 A/B/C 编译是本地确定性工作，不为 Word 生成再次调用 Provider。只有 Step02 已确认的冲突窗口才补证；没有冲突的镜头不重复提交 Gemini/Terra、不重复 OCR、不重复抽取 start/mid/end 帧。D 层结构检查、哈希和截图 QA 与外部轮询旁路执行，不能阻塞已提交批次。

仅对 HTTP `503`、`502`、`504`、`429` 和明确的瞬时网络错误自动重试，最多 3 次，使用 2/4/8 秒指数退避并记录每次开始/结束、状态码和尝试次数。`401`、`403`、参数错误、内容策略拦截和持续失败不重试；重试仍失败时只保留该批次为 `external_blocked`，不重跑成功批次，也不把原始 Gemini 卡伪装成 GPT 审计结果。

每次审计必须记录 `model`、`endpoint`、`batch_id`、`shot_ids`、`submit_at`、`completed_at`、`retry_count`、`http_statuses`、`status` 和 `evidence_path`，最终报告区分本地活动耗时与外部等待耗时。质量结论只消费同一批次的 Gemini 卡、精确原始帧和审计输出。

每个子智能体任务必须包含：`task_id`、唯一读写范围、预期产物或证据路径、主控接续条件，并以且仅以以下格式结束：

```text
result_type: final_delivery | external_blocked
task_id:
evidence_path_or_url:
verified_result:
next_action_or_blocker:
```

子智能体超时或没有终态时，主控先读取其唯一写入范围：存在可核验产物就接管并继续最早缺口；没有产物则对同一子智能体补发一次固定终态请求。仍无结果时主控自己执行，不创建重复工人或无限等待循环。

## 卡点与路由迭代

只有以下情况可以暂停等待用户：

- 缺少原片、目标地区/语言、渠道或当前渠道所需的真实授权。
- 本土化没有可信等价形式，且会改变剧情关系、冲突或用户创作方向。
- 渠道实际失败且需要用户决定是否换渠道、删除渠道或等待恢复。
- 已生成视频的重做、改参考、改提示词或是否进入剪辑。首帧、故事板或资产卡不单独形成用户确认阻塞；仅当用户主动否决已生成结果时才暂停该依赖范围。
- 已验证的路由缺口，无法依据既有权威 Skill 做出不改变创作结果的判断。

出现路由缺口时，先用已有原片证据、当前产物和错误信息定位在最窄步骤；给出最多三道可理解的选择题。收到答案后：

1. 立即修改最窄的权威 Skill 或 reference，不能只记在聊天中。
2. 同步当前 Codex 发现的对应 Skill 副本。
3. 回读关键词并运行最小验证；报告“改前行为 -> 改后行为”。
4. 从原卡点继续，而不是重新开始全链路。

不要因假设性风险设置降级、额外审批或第二条流程。真实 provider 错误的修复只能落在报错边界，不能替代或绕过用户已选渠道。

## 基于实际结果的自进化

把用户对已展示的首帧、故事板、声音参考或实际视频的具体反馈，与对应原片证据、实际上传参考图和实际提示词一起作为“优化证据包”。不要仅凭抽象偏好、一次渠道波动或未经展示的候选结果修改 Skill。

先将问题定位到最窄责任步骤，再向用户申请本次优化许可。默认映射如下：

- 身份、服装、关键道具、文字资产、本土化事实或参考图职责错误：Step04 / 对应资产或风格 Skill。
- 首帧机位、构图、站位、开场动作或连续边界错误：首帧节点及其提示词合同。
- 故事板顺序、调度、转场或镜头信息错误：正式故事板节点及其提示词合同。
- 已锁定参考和提示词正确，但视频人物、动作、口型、声音或镜头执行偏差：Step05 / 当前渠道执行规则。
- 明确的 API、上传、模型参数、轮询或下载问题：当前渠道的最窄 Skill 或脚本。

申请许可时只说明：观察到的实际问题、推荐修改位置、修改后会影响的未生成生产组，以及是否同时按该改动重做当前指定组。把推荐项放在 A；一次最多三题。没有本次明确许可，只记录问题并继续不依赖的工作，不修改 Skill，不重做视频，不消耗新的渠道额度。

获得许可后：

1. 只修改最窄、最权威的 owner；单个生产组的创作选择只写入当前 job，不升级 Skill。
2. 将规则写成可复用的“触发条件 -> 权威输入 -> 正确动作 -> 适用范围”，不记录凭据、临时任务 ID 或一次性 URL。
3. 同步当前 Codex 发现副本，回读变更并运行最小验证。
4. 只将修改应用到用户许可范围内尚未生成的生产组；已生成视频仍由用户逐组决定是否重做。
5. 在下一次同类实际产物中检查该规则是否减少同类问题；若没有，保留任务证据但撤回或收窄该规则，不把它扩大为默认。

每次获准优化后向用户简短回传：`实际问题 -> 修改的 Skill/步骤 -> 改后会怎样 -> 已验证证据 -> 尚未验证部分`。这是一条有用户许可的学习闭环，不是自动修改所有路由的权限。

每次 Skill 迭代产生了新的默认模板、Word、提示词包或其他会替代旧版本的 job-local 产物后，主动问用户一次是否归档被替代版本；没有用户同意不得自动移动或删除。用户同意后只归档被新版本替代的同类产物，先生成并校验可恢复 ZIP，再移出活跃生产目录，最后把任务状态中的活跃路径和 SHA-256 统一指向新版本。若文件被占用，继续处理可归档项并如实报告唯一待归档文件，不强关用户应用、不把部分归档说成全部完成。

### Skill 路由版本与回退

修改权威 Skill、Harness 或路由参考前，先把本次会消费的完整路由目录复制到版本化快照目录，生成 `snapshot_manifest.json` 和 SHA-256，再压缩为 ZIP。快照必须包含主路由、Harness、当前编号节点、故事板、资产、渠道辅助和其直接引用的 references；不得只备份正在修改的单个 `SKILL.md`。修改后将快照路径、ZIP SHA-256 和变更版本写入当前任务状态。

回退只使用快照 manifest 校验通过的文件。执行覆盖前先备份当前目标目录；默认只覆盖快照列出的 Skill 文件，不自动删除后来新增的文件。标准回退脚本为 `skill_route_snapshots/restore_skill_route.ps1`；回退完成必须输出恢复报告和新的当前目录备份路径。任何路由修改都必须能沿“当前版本 -> 修改前快照 -> 修改前目录备份”三层链路恢复，不允许直接覆盖后无来源可追溯。

## 交付与恢复

每次对用户只报告会改变决定的内容：实际视频/产物位置、真实卡点、当前需要的选择题或下一自动动作。网站或画布有变化时给出 URL 与一行实际效果说明。

恢复任务时，读取 `harness_state.json`、当前精确产物和渠道状态，从最早未完成节点继续；禁止根据 `latest`、旧 zip、浏览器历史或同名文件猜测输入。若已验收产物不足以判断从哪一步接续，展示已有产物和缺口，问用户从哪一步开始。

当本次请求的视频全部可访问且已展示给用户时，返回：交付视频路径/URL、每个生产组状态、已验证内容、未执行的后期剪辑事项。除真正的用户决定或外部阻塞外，不停在中间状态。

### Step04 单一恢复入口（20260804）

Step04 的本地恢复入口固定为 `tools/run_step04_abcd.py`。它在编译前把 Harness 节点写为 `step04a_input_gate`，成功后只推进到 `step04d_render_pending`；失败时保留 `step04_input_gate_report.json` 或编译器结构化错误，不会因为旧 Word、旧合同或历史资产目录存在而推进。它不调用任何图片/视频 Provider，也不重新推断 Step02 事实。

DOCX 渲染和真实截图 QA 完成后，统一使用 `tools/finalize_step04_abcd.py` 回写 `step04_word_delivered`；该入口必须核对合同 SHA、DOCX 实际路径、渲染回执和 `docx-preview + Chromium` QA 截图，任何一项缺失都保持 `step04d_render_pending`。

### S-004.5 实例唯一性与文档运行时封口（20260804）

同一镜头的多人物必须使用结构化唯一 `instance_id`；同一资产可被多个实例共用，但只生成一个镜头级参考槽位，并列出全部 `allowed_instance_ids`。Harness 只接受 A 层实例集合与 Step02 完全一致的合同，不得用角色名、衣服、身体局部或资产名补回缺失实例。

渲染 D 层前由运行时探针选出可执行的真实 Python，明确排除 WindowsApps 占位命令和 LibreOffice Python；探针失败就保持 `step04d_render_pending` 并返回结构化阻塞，不能切换到未经验证的系统别名或重复生成 Word。

### S-004.6 提示词压缩恢复规则（20260804）

Step04 的提示词压缩在 C 层完成，D 层只读渲染。按 MiniMax H3 使用手册的可执行结构，正文顺序固定为：实际参考图、场景/环境身份、核心创意与构图、毫秒级变化过程、镜头/光线/声音。已上传参考图锁定的脸、发型、服装、空间几何、道具材质和静态文字不重复描述；连续小分镜只写相对上一段的新变化。台词必须留在对应事件并绑定独立对白时码，不能同时复制到细节或环境声。

Harness 恢复时必须读取 C 层的 `prompt_compression`，验证压缩前后字符统计、参考图声明、事件/对白/实例回指和 `prompt_policy`；压缩只允许删除精确套话和重复句，不得依据字数硬截断或改写事实。`compressed_chars > raw_chars`、台词重复、事件/对白/参考槽位缺失、出现泛称或英文资产 ID时，保持 `step04a_input_gate`/C 层阻塞并回传结构化错误。Python 编译器、念念 AI bridge 与 Word 渲染器必须使用同一 C 层 `prompt_text`，禁止 D 层重新拼成长提示词。

### S-027 念念 AI 一键转绘生产代理边界（20260806）

念念 AI 工作台把整条 `mx-shortdrama-production-harness -> mx-shortdrama-00-router` 作为一个可恢复的**转绘生产代理**调用，而不是把各 Step 的提示词、Word 或渠道脚本暴露成独立生产入口。网站唯一可提交对象是 job-local `niannian_redraw_agent_job_v1` 任务包：`job_id`、原片精确路径/SHA-256/时长、目标地区/locale、渠道选择、用户复用决定、当前允许的 Provider 范围，以及 Step04 所需的已验收结构化输入路径。不得把 API Key、Cookie、媒体字节或自由 Prompt 写入网站任务包。

工作台 -> 任务包 -> `tools/run_shortdrama_redraw_agent.py` -> Harness 最早缺失节点 -> Router 编号 Step -> typed final result。代理先校验原片路径和 SHA-256，只把任务包与 `harness_state.json` 写到本 job，绝不复制原片；然后由 `tools/run_step04_abcd.py` 执行唯一的 Step04 A/B/C/D 路径。网站不得再调用 `niannian_step04_abcd.js` 的独立语义编译、旧 Word/目录解析或 `run_current_ar_prevideo_images.py`；后者只保留取证，生产调用固定返回 `LEGACY_STEP05_ENTRYPOINT_DISABLED`。

图片渠道的每次生产调用必须带 `job_id`、`asset_id`、`asset_stage`，并将提交的同一文本写入不可变 `actual_prompt` 与 `actual_prompt_sha256`，随后写提交回执、下载回执、精确路径、SHA-256、文件 QA 和阶段 QA。`identity_master`、`character_sheet`、`scene`、`prop`、`first_frame`、`storyboard` 不得使用 generic 阶段；角色设定卡仍必须先通过同一母图的图生图上传与角色卡 QA。只有阶段化 Step05 执行器能调用渠道；它只接收已验证的 B/C 合同与最终资产 registry。

代理每次只回写五字段 typed result：`result_type`、`task_id`、`evidence_path_or_url`、`verified_result`、`next_action_or_blocker`。网站只展示该真实终态；`Word 已存在`、目录有图、HTTP 200、旧 accepted 或旧截图均不是成功。默认 `provider_calls_allowed=false`：无明确生产授权时，代理完成本地合同和 Word 后在 Step05 返回精确阻塞，而不是隐式调用图片或视频渠道。

### S-028 工作台 Step01/Step02 同源闭环（20260806）

念念 AI Agent 从新 job 开始时，`tools/run_step01_step02_agent.py` 是唯一早期调度入口：先执行当前 job-local 原片的 Mimo 音频/镜头与基础帧，再由主控根据这些真实帧生成连续视频计划；Yunwu Gemini 连续视频观察与 Paddle OCR 在独立目录并发执行。三者均成功后，主控才写唯一 `step01_evidence_manifest.json`，其中每条支线必须有同 job_id、同 source SHA-256、精确清单路径/SHA 和给 Step02 使用的显式导出；不得从旧 Word、旧任务清单、目录扫描或帧序号补齐任一支线。

证据渠道的授权独立于图片/视频生产授权：只有当前任务同时声明 `execution.evidence_provider_calls_allowed=true` 和对应受保护 Provider 配置时，Agent 才调用 Mimo、Yunwu、Paddle 及 Step02 Terra/GPT 审计。仅有 `provider_calls_allowed=true` 不得隐式授权这些证据调用。任一支线失败时，保持该支线精确 blocker；另外两条已完成支线保留并可恢复，不重跑。

Step02 语义编译器必须把每一个 `entity_instances` 与一条唯一的 `identity_bindings.bindings[]` 对齐：同 `shot_id + instance_id + asset_id + 纯中文@名` 一一对应，且 binding 有 `resolved`、证据 ID、镜头集合与实例映射。集合不相等、重复绑定或把视觉不同人物合并到同一资产时，事实包失败关闭，不能进入 Step04、资产、Word 或渠道。

### S-029 计划资产合同与可推进生命周期（20260806）

新 job 的中段固定为：`Step02 已验收事实 -> run_step04_planned_assets.py -> planned B 合同 + asset_production_registry.json -> Step05A 阶段化资产生产 -> final asset_registry -> Step04 A/B/C/D`。计划 B 只保存第五步将逐字消费的资产提示词及 SHA、证据、使用镜头、人物母图/角色卡两阶段意图和生命周期起点；它是 `planned_asset_generation`，禁止进入最终资产 registry、Word、首帧、故事板和视频。

`asset_production_registry.json` 是可恢复过程状态：阶段化执行器只能追加/推进提交回执、下载回执、精确路径/SHA、QA、一次角色卡定向重做和最终验收；不得改写 job/source 归属、资产集合、资产种类、证据来源或锁定提示词 SHA。计划 B 合同不可变；注册表可推进但不能被重新初始化覆盖。恢复时先验证不可变锚点，再只执行每项资产的最早缺失阶段。最终角色卡/场景/道具均通过生命周期和 QA 后，才导出最终 registry 并允许最终 Step04 B/C/D、Word、首帧、故事板和视频。

### S-030 下载后视觉 QA 与无重复付费恢复（20260806）

已观察到的触发：若在图片生成前要求 QA，系统只能伪造“通过”或无法推进；若生成完成后因 QA 授权缺失直接从 `*_prepared` 重启，又会重复提交同一付费图片任务。保护动作：将图片渠道结果写入最终资产 registry、进入 Step04 B/C/D、首帧、故事板或视频。Owner：Harness 主控和唯一阶段化图片适配器。退出条件：当前 job 的同一操作已有真实下载图、SHA、下载回执和文件/视觉 QA；失败时完成唯一允许的角色卡定向重做或保留精确 blocker。

每个 Step05A 图片操作固定按：`锁定 actual_prompt -> 当前 job/stage 提交 -> 轮询下载原图 -> 精确路径/SHA/16:9 2K 文件检查 -> 下载后视觉 QA -> 生命周期回写` 执行。视觉 QA 是与图片渠道独立的当前 job 授权；它只读取已下载的 job-local 原图和锁定资产职责，不能读取原片人物帧、旧 Word 或目录扫描。视觉 QA 没有授权、凭据或有效结论时，适配器保留确定性 `pending_visual_qa_operation_result.json`，下一次只从该下载结果继续 QA，严禁再次提交图片。

角色卡视觉 QA 失败时，`character_sheet_qa.py` 仅允许同一身份母图路径/SHA、同一渠道和同一角色资产的一次定向重做；不得换脸、换母图、换身份或静默切换渠道。第二次失败严格阻断该资产，场景/道具等无依赖资产继续。只有视觉 QA 和文件 QA 都通过的最终角色卡、场景或道具，才可导出最终 `asset_registry.json`；渠道 HTTP 成功、下载目录存在或 QA 请求已创建均不是验收。
## Step04 Runtime Delivery

Harness 在 Step02 通过后只调用 A/B/C/D 合同编译入口，不再调用历史 `build_step04*.py`、`recover_ar_step04.py` 或自由文本 Word 生成器；这些入口视为已禁用的旧实现。网站 Step04 compile 成功后必须在受控工作器中调用 `render_step04_abcd_docx.py`，再调用 `qa_step04_abcd_docx_preview.js`，回读合同 SHA、Word SHA、截图 QA 状态和输出路径。任一渲染、回读或视觉检查失败，返回 `external_blocked`，不能只返回“合同已保存”。Step04 API 的 Word 下载必须指向这次合同的实际 DOCX，不能从历史 job 或旧 Word 恢复。

### S-004.4 不可变编译边界与发布闭合（20260804）

Step04 是确定性编译层，不是第二次视觉理解层。只接受 Step02 已通过语义门的不可变合同；禁止根据服装、身体局部、字幕姓名、自由文本、旧镜头号或历史资产表补写人物、说话人、动作、场景、道具和参考图。A/B/C 每个字段必须能回指证据和前一层，D 只能读取同一合同的规范化摘要并渲染，不得重新读取原始 cards 或改写事实。

恢复时必须同时确认语义闭合和资产闭合：连续区间、实体实例、事件、对白和冲突状态全部 accepted；镜头实例、参考槽位、真实路径、SHA-256、职责与实际消费关系全部一一对应。任一闭合链失败，停在最早层并返回结构化 `external_blocked`，不生成表面完整 Word。双男镜头、局部手臂、同镜头多人物和重复服装词必须按 `instance_id` 分离，只出现中文 `@` 名称不算参考图消费。

发布恢复还要验证 D 依赖闭合：隔离发布包必须携带 D 层 Python 渲染器、截图 QA 脚本和 `docx-preview/jszip` vendor；服务端优先使用包内路径，开发环境才使用工作区回退路径。compile 成功但 D 工具、合同回读、Word SHA 或真实截图 QA 缺失时，保持 `external_blocked`，不得把合同保存误报成 Word 交付。

### S-031 Step04 提示词合同验证与 H3 提交前封口（20260807）

本规则由真实失败触发：Step02 曾把画面中的男配与男主对白错绑；“保证？”曾只有 17ms；同一句台词在相邻小镜头重复；C 层还出现人物泛称以及显示字幕/禁止新增字幕的互斥要求。Harness 在 Step04 A 入口和 C 层输出后都必须运行 `scripts/validate_step04_prompt_contract.py`，不能只检查 JSON 字段存在。

校验器固定检查：每条口型对白的视觉发言人闭合、Step02/Step04 说话人一致、对白独立区间和最小 120ms 可执行时长、相邻重复台词、生产组源区间与小镜头区间、纯中文 `@` 参考名、泛称/英文资产 ID、字幕策略冲突和当前组参考图实际消费。失败时写 `step04_prompt_contract_gate_report.json`，当前节点停在最早缺失的 Step02 或 C 层；不得生成/更新 Word，也不得创建 RunningHub 任务。

恢复只修复报告指向的最早证据缺口。H3 提交器在真实提交前必须接收 `--step02-manifest --step04-ir --group-id` 并先调用同一校验器；校验失败在上传文件和付费提交之前返回 `H3_SEMANTIC_CONTRACT_BLOCKED`。`--dry-run` 可以不携带合同用于检查通道映射，但携带合同时必须实际执行语义校验。

### 视频参考组聚合与 H3 提交合同（20260807）

真实任务已经证明：Step04 C 层为了保留证据可以有很多细粒度子段，但 MiniMax H3 的实际提交单元必须是完整的 5–15 秒视频组。Harness 在视频参考编译边界执行一次确定性聚合：按原片绝对时间排序，只合并相邻且连续的子段；组内保留 `source_group_ids`、`source_start_ms`、`source_end_ms` 和每个子段相对于组起点的秒级时间/提示词变化，不伪造动作、不补造时长、不丢失证据。

聚合后的每组必须满足 `5 <= duration_seconds <= 15`，并按最终资产 ID 去重后携带不超过 9 张最终资产原图。尾段不足 5 秒时，只能在与前组连续、合并后不超过 15 秒且参考图仍不超过 9 张时并入前组；否则停在视频参考组合节点并写结构化阻塞。组内参考图只能来自当前镜头实际消费的最终资产槽位，不能从 Word、原片抽帧、身份母图、故事板或旧版本目录反推。

参考编译允许先生成本地 `prepared` 清单；5 图/6 图等未发布候选通道只能标记 `channel_status=unpublished_candidate` 并停留在待提交参考组合，不能上传文件、创建 H3 任务或扣费。只有进入真正的 H3 提交节点时，才检查参考图数量对应的 RunningHub 工作流是否已发布；未发布时保持 Harness 当前节点为 H3 提交边界，修复或发布该通道后从该节点恢复，不重跑 Step01–Step05，也不重复生成已经验收的资产。
## H3 画布授权与质量恢复封口（S-032，20260807）

视频节点不得把环境中的 RunningHub API Key 当作用户当前账户授权。H3 多图任务的正式提交入口是用户当前 RunningHub 画布：先绑定最终资产原图和 Step04 提示词，画布以 `Ultra` 成功运行后才允许发布 API。Harness 必须保存画布工作流 ID、输入资产数量、运行任务回执、实际账户范围和发布回执；无法证明这些字段时保持 `h3_provider_authorization` 阻塞。

`consumeMoney` 非空、`consumeCoins` 缺失、账户范围不一致或使用企业级 Key 直连时，返回 `H3_BILLING_SCOPE_MISMATCH`，不重提、不换 Key、不发布 API。视频下载后还必须检查 MP4 可读取、H.264/AAC、9:16、生产组时长、参考图未使用占位图以及人物/场景/道具与最终资产一致；失败返回 `H3_OUTPUT_QUALITY_BLOCKED`，保留真实文件和 QA 原因，不能登记正式通道。

恢复顺序固定为：`画布资产上传 -> 画布 Ultra 运行 -> 视频 QA/结算回读 -> 发布 API -> 通道登记`。只从最早缺失节点继续，不重新跑已完成的 Step01–Step05，不从 Word 反抽图，不把候选 workflow ID 当成正式 API。
