---
name: mx-shortdrama-00-router
description: "Primary router for domestic Chinese short-drama redraw to Mexico through the redraw pipeline: Step 01 frame/audio extraction, Step 02 source reference timeline, Step 04 one-pass Mexico localization plus final asset/video prompt Word package, and Step 05 asset image execution. Step 03 is now an internal Step04 localization binding layer by default, exported only on explicit request. Use for 短剧转绘、墨西哥转绘、西语本土化、分集推进、skill 路由、资产提示词、人物图、场景图、道具图、生视频提示词、Word提示词包、redraw/remake, and batch redraw automation. The optional frame-anchor add-on is explicit-only."
---

# MX Shortdrama 00 Router

## Purpose

Route one episode through the Mexico redraw pipeline without loading unrelated steps, stale drafts, or later-step context.

The production objective is not a polished timeline script. Step 02 is the main evidence QA artifact. Step 03 is no longer a normal batch delivery stop; its useful work is compiled inside Step 04 as structured localization bindings. The downstream deliverables are Step 04's production-ready asset/video prompt package and Step 05's actual supporting asset execution.

This router must:

1. choose the next numbered skill;
2. pass only the minimum accepted artifact for that step;
3. prevent old prompt fragments from polluting the current step.

## Priority Override: Redraw

Use this workflow for requests involving `转绘`, `短剧转绘`, `墨西哥本土化`, source timelines, localized timelines, asset prompts, character/scene/prop/text-screen assets, Seedance2 prompts, Word prompt packages, `redraw`, or `remake`.

Normal redraw does not use generated frame-anchor production. If the user explicitly asks for that additional layer or asks that video prompts reference generated frame images, run Step 04 first, then load `$mx-shortdrama-frame-anchor-addon`, then execute any resulting image work through Step 05.

If the request mentions storyboard language, obey the global storyboard workflow rule and use `$image2-storyboard-video` as the primary storyboard workflow. For redraw projects, use the accepted redraw artifact as source material after the required redraw step is complete.

## Default Delivery Contract

### 已确认的资产生产顺序

Step04 只消费 Step02 已接受的镜头事实和生产组，不拆解原片，也不写原片镜头时间轴。每个 job 必须声明 `target_region` 与 `target_language_locale`；现有墨西哥任务为 `Mexico / es-MX`，其他地区任务使用其明确值。目标地区或语言版本未说明时直接问用户，不自动猜测或默认墨西哥；多语言地区的实际对白语言也由用户逐任务明确指定。人物外貌、文字、环境、语言和本土化表达都随当前目标地区变化。生产顺序固定为：`Step04 Word 确认 -> 关键道具卡 / 场景卡 / 角色卡（并发） -> 转绘首帧 -> 正式故事板 -> 生视频提示词 -> 生视频`。Step04 生产包 Word 是唯一常规中途创作确认点；之后连续自动推进。

同一原片转绘到第二个或更多目标地区时，只复用 Step01/Step02 原片证据和镜头事实；目标地区角色、名字、声音、文字、道具、场景、首帧、故事板和视频全部按新任务重新生成。目标地区存在多种常用语言时，主线实际对白语言每个新任务都由用户明确指定，系统不根据国家自动猜测。同一原片制作墨西哥西语、阿根廷西语等不同地区版本时，共用原片证据但各自独立生成当地名字、声音、语言表达、文字、资产与视频，不共用泛化“西语版”产物。

关键道具卡、场景卡和角色卡保持各自资产卡规格；正式故事板必须跟随原片画幅，竖屏原片使用 9:16，横屏原片使用 16:9；最终生视频必须保持原片画幅比例。
画幅覆盖规则：本路由旧段落中若仍出现“正式故事板固定 16:9”，均由本条覆盖；故事板和其 Word 预览必须使用 `source_aspect_ratio`，缺省时从原片媒体探测，不能把竖屏原片裁成横板。

关键道具卡、场景卡、角色卡和转绘首帧统一由用户为当前新任务选择的 Image2 图片渠道生成，不自动沿用旧渠道；每张首次只出 1 个候选。同一集只为影响剧情连续性、需要清楚看见或在多个镜头复用的人物、道具和场景建立独立资产卡；彼此独立的资产卡并发生成，自动 QA 通过后直接进入首帧和正式故事板。用户主动否决一张时只重生成该张及其依赖组，保留其他通过自动 QA 的资产卡。后续图片或视频渠道需要最终图时，控制器用代码自动上传精确文件，不要求用户手动上传。

同一目标地区版本的多集短剧建立整部剧级角色身份与声音库；每集只新增该集需要的服装状态、伤妆状态和新角色。手机、戒指、车、包、文件夹等跨集反复出现的关键道具建立整部剧级资产并跨集复用，只有原片明确损坏、替换或状态改变时才新建状态图。住宅、办公室、餐厅等跨集重复地点复用同一场景基础卡，布置、昼夜、损坏或剧情状态变化以同一卡的状态宫格或精确状态引用呈现。

用户确认新的角色、道具或场景资产替换旧资产后，所有尚未生成的相关视频组自动改用新资产；已经生成的视频不自动重做。后续原片证据发现已确认资产事实有误时，只修正该资产及尚未生成的相关组；已生成视频保留实际结果并由用户决定是否重做。主角跨集换装但脸、发型、声音和身份不变时，复用原有角色身份与声音，只新增该套服装状态角色卡。

资产生图提示词使用三套独立模板：道具卡、场景卡、角色卡各自单独编写；每套只注入该资产真正需要的 Step02 已确认事实，不复制整段原片事实。每个任务自动注入 `target_region`、`target_language_locale`、目标地区本地姓名、服装语境和环境表达。标签位置约束写入模板，标签只能在宫格边缘或空白区域，不遮挡主体或道具真实文字；场景卡不加中文标签。

Step01/Step02 提取证据是提示词的事实来源，不等同于渠道上传参考。角色资产用跨镜头一致的身份/服装/状态事实编写，原片人物帧只作校对，默认不上传以免源演员覆盖目标角色；场景资产用建立镜头、重复主机位、空间关系和光源事实，必要时才将去人物空间证据作为只负责几何的辅助参考；道具资产用清晰近景、状态前后帧和 OCR 事实，文字道具只使用已验证的目标语言文字规格。生视频提示词以视频组事实卡、对白/声音绑定和动作因果为依据；上传图仅为当前组的目标世界首帧、故事板、角色卡、道具卡、场景卡或目标语言文字卡。原片帧、原片人物、OCR 原始截图默认不进入视频上传列表。每一条提示词事实必须能回指 `evidence_basis`；无法确定的创作补全明确标为 `creative_fill`。

Step02 的 `asset_requirements` 是 Step04 资产消费的唯一声明源。每条需求必须同时提供 `asset_id`、`kind`（`character`/`scene`/`prop`）、`purpose`、`evidence_ids`、`required_shot_ids` 和 `continuity_state`；人物还必须声明角色层级、服装/伤妆状态、`requires_final_character_sheet=true` 与 `identity_status=resolved`。缺少任一字段、使用 `speaker_unknown`/冲突身份或没有闭合证据时，Step04 不得创建或复用最终资产，必须在最早缺口阻断。

人物年龄与身份是先于本土化名称、职业、服装和视觉风格的硬事实。Step02 对儿童、青少年或成年人的判断必须由可见体型比例、儿童/成人声线、与成人的身高关系、称谓/剧情关系和逐镜头帧证据共同确定；不能因姓名、办公场景、对话内容或泛化“年轻女性”自行推断成年职业身份。用户明确纠正年龄或身份时，该纠正立即覆盖对应 Step02 角色事实，并在生成或重做任何下游资产前同步到角色卡、首帧、故事板和视频提示词。儿童角色卡必须写入精确年龄或年龄段、儿童头身比、小肩宽、稚嫩五官、身高尺度、发型与儿童服装；严禁改写为成人职业装、成年身材或成年表情。角色卡还必须建立可复用的“辨识锚点”：一组具体且可见的五官轮廓、眼神气质、发型/发际线、肤色与标志性服装细节，并写入首帧、故事板和视频的身份约束。目标是有银幕主角辨识度和自然电影感，不得使用真实公众人物姓名、肖像或“像某明星”的直接模仿。

当原片姓名未获锚定、但脸、服装、主动说话脸或声纹已构成最高置信度的可见角色身份时，Step04 必须为该角色锁定一个明确的目标地区“生产身份”，并将该身份写入角色资产卡、首帧、故事板和相关生视频提示词。必须同时保留“源片姓名未确认”的事实边界，不得把生产身份倒灌为原片姓名，也不得把该人冒认成其他已命名角色。只有脸/服装/说话人等视觉或音频锚点达到可复用级别的角色才建可见角色卡；仅音频、未锚定人脸或 `split_required` 台词不得建角色卡、不得锁定台词/声音。Step04 Word 的资产图执行区必须先给出集中表格，最少包含资产 ID、资产或最高置信度身份、证据等级、使用镜头和完整可复制生图提示词，随后可附逐资产详表。

当 Step01 manifest 声明 Gemini 主镜头卡可消费时，Step02 必须按 `shot_to_card_mapping.json` 消费对应卡；历史渠道失败不能覆盖后续成功产物，也不得写泛化“Gemini 未返回”。卡中明确儿童/未成年而 Step02 写成成人身份时，Step02 必须失败，禁止进入 Step04；具体执行与校验器由 `$mx-shortdrama-01-frame-extract` 和 `$mx-shortdrama-02-source-timeline` 维护。

Gemini v4 主镜头卡是默认且最高权重的连续视频视觉语义证据。Gemini 只接收完整连续视频或按源镜头边界无缝切开的连续视频段，不能上传 start/mid/end 原始帧、字幕裁切、单帧或任何图片；本地原始帧仅供 Step02 帧级核对与争议裁决。每张卡必须逐镜头给出 `剧情发展`（开场状态、触发事件、因果动作、结束状态）、`人物动作细节`、`镜头运动细节`（初始机位与轴线、运动路径与速度、跟随对象或重构图、焦点或景别变化、结束稳定构图）和 `镜头切换和叠化`；每个描述字段至少有两个按时间顺序的可见事实。对于剧情发展、动作因果、人物动作、镜头运动、镜头切换/叠化、构图、站位、空间关系及光线，Gemini 卡与映射清晰原始帧一致时是最高视觉语义证据；清晰原始帧只作交叉验证，发生冲突才为该 `shot_id` 补抽密集帧裁决。Gemini 的可见硬字幕/OCR 是高权重候选，仍须同 Paddle OCR 与原始字幕帧联合裁决。Gemini 不得作为中文 ASR 或台词真值来源：`Mimo ASR` 是唯一生产中文台词文本主来源，`Qwen3-ForcedAligner-0.6B` 只对 Mimo 文本做时间对齐；`Qwen3-ASR-1.7B` 不属于本路由，禁止作为主识别、回退、比较或隐式自动下载。说话人、声纹和身份绑定仍由同一时间的口型/主动说话脸、声纹簇及身份锚点主导。Gemini 的声画观察只能辅助，不能覆盖这些独立事实链。

Gemini 连续视频观察必须返回相对于上传视频的 `local_start_ms`、`local_end_ms`，并由项目唯一实现 `tools/step02_interval_alignment.mjs` 用“连续片段起点 + 局部区间”换算原片时间。TransNet/ffmpeg 切点只是 `cut_candidate`，禁止按 Gemini 返回的 `shot_id`、数组序号或卡片顺序一对一映射。切点短于可观察阈值时先合并为语义观察单元；只有请求中显式给出的目标时间区间，才可在误差不超过一帧时映射为固定生产镜头。旧响应缺失局部时间、观察区间重叠、越界或无法覆盖时，Step02 必须输出 `blocked`，只重跑对应连续视频段，不能让 Step04 接收其自由文本。

默认不注入额外视觉风格。当前仅保留一套“现代目标地区写实短剧”试运行基调：真实人物、自然电影光线、克制但有戏剧张力；只有本任务明确启用时才注入。跑通并观察实际结果后，再决定是否升级为独立风格 Skill。人物默认符合当前目标地区社会与文化语境，只有原片剧情明确要求其他族裔时才保留。当前镜头不新增原片未出现的人物；关键道具出现时，同时引用道具卡并按上游事实、该时间段状态和人物位置写清大小、状态和位置。

原片画质偏低、布光粗糙或带廉价滤镜时，保留镜头事实、构图、情绪和光线意图，同时升级为清晰、真实、现代短剧的画质、材质与光线，不把技术缺陷当作必须复刻的内容。目标地区角色使用真实自然的皮肤、年龄和五官；只保留剧情需要的妆容、伤痕、疲惫或身份特征，不复刻无剧情作用的磨皮、美颜、夸张妆容或网红滤镜。红蓝霓虹、强逆光、突然变暗等戏剧化光线保留方向、变化时点和叙事作用，以目标地区真实场景中可信的实际光源实现，不自动弱化或夸张。

风格路由：本轮已确认启用“现代目标地区写实短剧”试运行基调。凡下游节点需要视觉风格时，先运行 `$mx-shortdrama-visual-style`，新任务主动询问用户是否启用，再把其输出的 `prompt_injection` 放在主体事实和动作要求之后，作为独立“视觉风格”段落注入资产、首帧、故事板或视频提示词；默认跳过风格路由，不注入风格。第一批资产和第一段视频完成后立即收集用户反馈并修改试运行基调，尚未升级为正式风格库。

风格反馈先判断人物真实、身份稳定和目标地区身份自然度；若人物真实但整体不统一，先改风格 Skill 的 `prompt_injection`。第一轮效果良好时记为 `v1`，用同一集另一生产组、同一目标地区和同一视觉基调验证，重点比较人物身份稳定、服装连续和目标地区气质自然；验证通过后才固定或升级，不立即设为默认。验证不通过时保留 `v1`，修改为 `v1.1` 再验证，不用每个提示词临时补词绕过风格 Skill。

- 关键道具卡：先生成影响剧情连续性的道具，使用独立 16:9 多宫格，锁定外观、材质和状态；格数按该卡实际需要安排，不强制统一；图片内部使用中文标签标明视角、状态或分区，标签放在宫格边缘或下方且不遮挡主体，若道具本身有目标地区真实可读文字则不覆盖；标签只作辅助识别，不替代图像主体，也不复制进生视频提示词；是否出现手部、人体局部或尺度参照按该道具的实际使用事实决定，需要时使用对应角色卡的人物手部和当前服装状态，且只展示拿、放、打开等影响道具状态的必要操作。
- 场景卡：为每个独立空间生成 16:9 多宫格，不含人物或剪影；同一套房子的客厅、卧室、厨房分别建卡，同一空间昼夜复用同一卡；固定展示地点全景、主要视角、核心家具/背景和空间关系，主要视角按该空间在本集最常用、最关键的原片机位自动选；同一物理空间出现明显布置状态变化时，在同一张卡加入对应状态宫格；场景卡采用中性基础光线，不添加中文标签或剧情说明，昼夜具体光线由首帧、正式故事板和生视频提示词控制；格数按实际需要安排。
- 角色卡：只为主要角色和重复出现角色的每种已确认服装状态各生成一张独立 16:9 多宫格正式角色卡，并在相关镜头复用；使用干净、低干扰的中性背景，包含正面半身、左右侧面、三分之二角度、全身正面、全身背面和中性表情，另外三种由系统根据当前集 Step02 事实自动选出的最常见、最关键表情；图片内部使用中文标签标明角度、表情或分区，标签放在宫格边缘或下方且不遮挡主体，并同时标注“目标地区本地名（原片中文名）”，格数按实际需要安排，不强制统一；标签只作辅助识别，不替代图像主体，也不复制进生视频提示词；角色卡是人脸、年龄、肤色、发型、服装、体型、首饰和职业气质的唯一身份依据，单帧人物图和故事板截图不能替代角色卡。儿童角色卡额外锁定明确年龄、儿童头身比、小肩宽、稚嫩五官、儿童身高比例、发型和服装。
- 人物资产提示词与 QA 必须加载 `$mx-shortdrama-04-character-assets`。生产固定为“单人定妆身份母图 -> 母图身份/妆造 QA -> 引用母图生成 16:9 角色设定卡”，不得用一条提示词同时要求定妆剧照和多宫格三视图。妆造按“身份决定方向、状态决定细节”编译，必须具体写服装版型/层次/材质、发型/发际线/发饰、妆面或胡须/皮肤状态、配饰位置、色彩气质、当前剧情状态和真实摄影质感；删除“高级、精致、氛围感”等不可执行套话。
- 人物最终资产只能是 `asset_stage=character_sheet` 且 `lifecycle_state=final_character_asset_accepted` 的 16:9 角色设定卡。单人定妆身份母图、原片人物帧、故事板截图、Word 内嵌预览和未复核历史资产都只能作为证据或中间层，禁止进入 Step04 B 层、Word 正式预览、首帧、故事板和视频参考上传。最终角色卡必须可回溯到唯一母图的本地路径/SHA、图生图上传回执、母图 QA、角色卡 QA 和实际 2K 原图；任一链缺失由 Harness 严格失败关闭。

原片明确为父女、母子、兄妹等亲属关系时，角色卡与共同画面保持可信的家庭相似性，例如肤色基调、局部五官气质和年龄关系；每个角色仍保持独立、可辨识的人脸，不做共脸或夸张复制。情侣、夫妻或暧昧关系保留原片关系、年龄差、权力感、互动边界和动作事实，外形自然可信，不额外美化为广告情侣。医院、餐厅、街道、办公室等有路人或群众的镜头，背景人物按目标地区与场景的真实人群构成生成；严格保留原片已有的人数、位置和剧情作用，不随机加戏、抢主体或删掉原片事实中的背景人物。

每个原片角色映射一个自然的目标地区本地姓名；角色表、资产名和对白绑定保留这一对一对应关系。

### 角色姓名锁定与视频正文边界（S-001）

一旦 Step02/Step04 将源角色绑定到最高置信度的目标地区生产身份，所有后续生视频正文统一使用该目标地区姓名，不再把“人物、男子、男配、女孩、黑衣人”等泛称传入模型。该映射必须同步覆盖场景身份后的角色状态、动作、视线/表情、手部任务、镜头构图、光线反馈、道具交互和空间位置；源片中文名只保留在证据表、内部资产映射或 QA 对照中。身体局部、衣袖或只露出手臂时，也必须绑定到已验证角色（例如“@男主沈川的黑衣手臂”），禁止生成未命名的匿名额外角色。若某角色仍未达到可复用身份置信度，则保留“未确认”边界并暂停该角色的可见身份注入，不用泛称替代。

人物状态连续性：伤口、淤青、汗水、泪痕、妆容花掉、衣服湿掉或沾污等人物状态按原片时间线锁定其出现、加重和消失时点，并在角色卡、首帧、故事板与视频中连续复用，不允许无故重置。道具破损、打开、倒下、洒出、被拿走或被放回等状态变化按原片时间线建立并持续复用；房间、桌面、门窗、灯光、餐具、文件等环境被人物改变后，同样锁定变化和延续，后续镜头不得自动恢复到改变前。

本土化保持原片剧情功能不变：剧情相关医院、学校、公司、法院等替换为目标地区功能等价且自然可信的机构，并同步更新可见文字、道具和对白；货币、支付方式、电话格式、车牌等生活细节替换为目标地区自然形式，保留原金额关系和剧情作用；称呼、亲属关系和礼貌表达改为目标语言与目标地区自然说法，保留原关系和情绪。

原片存在富裕、普通、贫困等经济差异时，保留人物之间的经济地位、消费能力和冲突关系，以目标地区真实的住宅、服装、交通、道具和生活细节表达，不把贫富做成刻板化夸张。医生、老板、律师、外卖员、学生等职业身份保留职业、权力关系和剧情功能，转换为目标地区真实可信的工作空间、服装、证件、工具和礼仪。城市、社区、住宅区、街道与通勤路线使用目标地区真实可信的空间、社区气质和交通细节，同时保留原片地点关系、人物动线和剧情作用。

婚礼、葬礼、节日、家庭聚餐等文化事件转换为目标地区真实且情绪作用相同的仪式或活动，保留人物关系、冲突和事件结果。食物、酒、送礼、请客、饭局等承担关系或权力信息时，使用目标地区自然的食物、饮品和待客方式，保留谁招待谁、谁付钱、谁施压或示好等关系事实。家庭期待、阶层偏见、性别角色或社会评价制造冲突时，保留冲突强度、权力关系和人物处境，以目标地区能自然成立的社会语境表达，不中和、不说教、不自动弱化。

原片剧情明确发生在中国历史时期、年代或社会背景中时，转换为目标地区社会结构和情绪作用最接近的历史时期或年代，保留人物年龄、事件前后关系和剧情冲突。仅通过旧手机、老款车、服装或画幅表现“若干年前”时，使用目标地区同等年代感的设备、服装、交通和环境细节，保留时间跨度和人物年龄变化。时间跳跃通过发型、服装、妆容、场景陈设或人物年龄变化表现时，必须在对应角色卡、场景卡、首帧、故事板和视频中一致呈现。

对白本土化优先保留剧情信息、人物关系、情绪强度和冲突；目标语言表达必须自然，不做逐字直译，也不自由改写剧情信息。不得为了贴近原片说话时长而压缩、扩展或改写已接受的目标语言台词；完整台词原样交给视频模型处理口型、停顿和时长。

成语、俗语和地域色彩说法按目标地区自然的对应表达改写，保留剧情信息、人物关系和情绪力度，不做字面直译。依赖谐音、双关或语言误会推进剧情时，优先重建目标地区可成立且保留同样误会与戏剧作用的新表达；确实没有等价物时才向用户说明并请求决定。小名、昵称、尊称和讽刺性称呼按目标地区自然的亲疏、年龄、权力关系和情绪选择，并在整部剧固定复用。

原片故意使用外语以表现国籍、距离感、身份差异或听不懂的误会时，保留“语言不同”的剧情作用：主线对白使用目标语言，原片刻意保留的外语仍作为外语处理。诗句、歌词、名言或书面化文字承担情绪或剧情信息时，改写成目标语言中自然且具有同样含义与情绪作用的表达，不做生硬直译。混合语言、职业术语或青年俚语只有在原片确实承担身份或关系作用时，才使用目标地区自然的对应表达；其余对白保持清楚自然。

涉及争执、暴力或亲密接触时，保留原片的剧情作用、情绪强度和镜头事实；只将表达、环境和行为语境转换为目标地区自然形式，不自动弱化、删减或自由改写。

原片表演即使夸张，也保留每个情绪转折、冲突强度、动作目的和人物关系；转绘时改为目标地区观众看起来自然可信的表演方式，不机械复刻表情幅度或节奏。鞠躬、拱手、敬酒、亲属称呼动作、社交距离等文化化身体语言，若不影响剧情、人物位置或道具状态，转换为目标地区自然等价动作；影响剧情事实的动作原样保留。微表情、眼神回避、沉默和停顿承担剧情信息时，必须保留其叙事作用、发生时间和强度，以目标地区自然表演实现，不新增解释台词，也不删除。

无剧情作用的品牌、商品或应用图标中，全球通用大牌的手机、衣服、食物等直接保留；其他项目替换为目标地区真实品牌。剧情相关文化事件替换为目标地区功能和情绪作用相同的文化事件。原片制度或社会关系在目标地区没有直接对应形式时，先向用户展示原片形式、推荐的最接近目标地区形式，以及必须保留的剧情冲突和关系；用户决定后再写入资产、文字和对白。
- 转绘首帧：资产卡完成后，每个普通生产组只依据该组开始时的 Step02 已确认镜头事实，加对应场景卡、角色卡和道具卡生成 1 张转绘首帧，锁定开始时的场景、构图、人物位置、道具初始状态、景别、机位、光线和情绪，不从组中间帧反推；Step02 提前判定为连续链的相邻组，先生成共享边界帧：它以后一组开始时的 Step02 事实为主，同时满足前一组结尾动作和道具状态，兼作前一组目标尾帧和后一组首帧；前一组生视频前把它作为尾帧参考图上传，后一组直接以它为首帧输入，不另生成后续组首帧候选；开头为空镜头时只用场景卡、相关道具卡和首帧提示词，不强行加入角色卡；正面可读的手机或电脑屏幕直接引用对应目标语言屏幕卡并显示锁定文字，不保留原片中文，也不留到视频阶段补字。
- 正式故事板：首帧完成后，必须先运行 `$storyboard-director`，不能直接调用 Image2。它以 `videoGroupFactCard`、`localizationBindings`、本组首帧和已接受资产为唯一剧情事实，创建 job-local `storyboard_director_plan.json`：每个场景先写 `scene_objective`、`audience_must_understand`、`readability_risk`；每个镜头必须写 `narrative_purpose`、`audience_focus`、`blocking_plan`、`composition_goal`、`expression_plan`、`movement_motivation`、`action_timing_validation`、`object_state_control`、`continuity_anchors` 与 critique/correction/evaluation。随后运行该 Skill 的 `validate_storyboard_plan.py`、`score_storyboard_plan.py`、`render_storyboard_prompt.py`，仅在校验通过且评分不低于 4/5 后，才用渲染提示词生成单张 16:9 正式 Image2 电影制作故事板，替代第二张独立关键帧。它在同一张图中包含中文顶部创意指导条、角色与风格参考区、道具锁定区、环境与机位路线区、按时序编号的真实电影帧、灯光/情绪/音频/摄影笔记和固定导演颜色标记。非连续组固定图像参考顺序为：本组转绘首帧 -> 本组相关正式角色卡 -> 本组相关关键道具卡 -> 本组相关场景卡 -> 已校验的故事板渲染提示词。原片人物抽帧不进入正式故事板图像参考列表；其镜头事实已在转绘首帧阶段完成目标世界转化，避免源演员身份覆盖目标角色卡身份。画面严格按本组开始到结束的时间顺序排列，不为画面美观打乱，完整表现动作、切镜头和情绪推进；4 秒短组使用 4-5 帧，其余生产组使用 8-9 帧。连续链共享边界帧同时作为前一组故事板最后一个电影帧和后一组故事板第一个电影帧。导演颜色固定为：红色人物运动、蓝色摄像机运动、绿色构图重点、橙色光线方向、紫色情绪或音频、黑色景别/机位/动作短注。顶部指导条必须使用本组精确时长/时码、已确认地点与事实，不得虚构项目或剧情；台词帧必须使用已接受的目标语言台词、画外声继续或听者反应，不能替换为源中文或模型自造句。原片叠化或渐变时依次表现前画面稳定态、混合态和后画面稳定态。中途换装时，首帧使用开场服装角色卡，故事板和视频同时引用换装前后角色卡。

Step04 Word 必须新增独立的“分镜故事版”区域，按每个 `VG` 一组输出：场景目标、观众必须理解、可读性风险、故事板作图提示词、逐源小分镜的叙事任务/观众焦点/调度与表情/光线与镜头/作图状态。该区域的计划、提示词和实际故事板图必须一一对应，图像画幅跟随原片（本任务为 9:16）；没有实际图片时写“待 validate/score/render 后作图”，不得以源帧、计划或提示词冒充成图。每个生产组都必须按 `$storyboard-director` 作图，不允许省略故事板或用普通关键帧代替。

每份 Step04 默认 Word 必须新增“分镜故事版”区域，逐个 `VG` 展示故事板场景目标、观众必须理解、可读性风险、正式作图提示词和按源镜头时间顺序展开的故事板计划。每条计划至少包含叙事任务、观众焦点、调度/表情、光线/镜头和作图状态。没有实际故事板图时只能写“待 validate/score/render 后作图”；完成后同一区域必须登记实际故事板图路径、SHA-256、渠道任务 ID 与 QA。该区域是 Storyboard Director 的用户可读执行面，不能用生视频提示词、源帧或泛化镜头表替代。

原片有分屏、画中画、视频通话或监控多画面时，保留分屏结构、画面关系和出现时点；每个画面使用对应目标地区角色、场景或界面资产实现。监控、手机录屏、电视新闻、旧录像等“画面中的画面”保留其媒介身份和叙事作用，以目标地区内容重建并保持合理媒介质感，但不复刻原片低清等非叙事技术缺陷。定格、倒放、加速、减速和快速蒙太奇等时间效果保留开始、结束、速度关系和叙事作用，去掉非叙事技术瑕疵，不统一改为正常速度或额外夸张。
- 生视频：故事板完成后锁定提示词；默认使用 [身份前置毫秒分镜视频提示词](references/video-prompt-identity-first.md)。每个完整 `VG` 生产组只写一段模型正文，但正文内部必须按源小分镜 `shot_id` 的毫秒级时间顺序逐条展开：每条写清构图/人物、动作、镜头运动、光线/道具/环境、声音/对白。`场景身份、环境身份、人物身份` 只在组开头前置一次，不把 `视频目标、空间与人物连续性、节拍与镜头、声音与表演、硬约束` 等生产合同栏目塞进模型正文。Gemini v4 中已确认的剧情发展、人物动作细节、构图和镜头运动必须进入对应小分镜；不得只留在 `shot_evidence` 或故事板 sidecar。画面控制用中文；角色实际台词保留当前目标语言版本并绑定具体说话人。画外声、重叠说话和剧情音效保持原片关系。事实优先级服从 Step04 的 `referenceConsistencyBoard` 与 `videoGroupFactCard`。

#### 电影因果层（v5 默认）

生视频提示词的电影感必须编译成可见因果，不靠“电影感、高级、真实、质感好”等独立形容词。每个毫秒小分镜都建立以下链条，并把结果写进同一小分镜正文：

```text
上一稳定状态 -> 视觉/光线/台词/环境触发 -> 人物反应（动作、视线、表情、重心、手部任务） -> 镜头或环境反馈 -> 当前小分镜结束状态
```

- 镜头、构图或光线改变：只写发生变化的镜头/光线/空间字段；明确人物如何承接这个变化，以及结束时的姿势、视线、表情或道具状态。不得复制上一小分镜的完整镜头字段。
- 镜头、构图和光线保持但有台词：稳定字段只声明“保持”；把台词绑定到可见口型、停顿、视线、眉眼、嘴唇、头部、重心或手部任务变化。证据没有给出的皱眉、微笑、呼吸加重等表演不得臆造。
- 镜头、构图和光线保持且无台词：只执行证据中的连续微动作或保持状态，不新增事件、镜头运动或情绪转折。
- 镜头变化和人物变化同时发生时，先写触发关系，再写人物反应，最后写镜头落点；不能把“镜头服务动作”“人物自然变化”当作事实。

每个小分镜还必须写空间层次：前景/遮挡、主体及其动作、背景道具或环境痕迹、焦点/景别与环境反馈。空间层次必须来自 Gemini/Step02 证据；缺失时明确保持，不用模板补齐。

不同道具、场景、角色和彼此不连续的生产组同一节点可并发；同一生产组严格按上述顺序执行。连续镜头链必须串行：Step02 提前生成共享边界帧，前一组故事板和提示词明确该帧状态并把它作为尾帧参考图，后一组直接把同一帧作为首帧输入，不再新生成首帧候选。

新目标地区版本第一次实际生产时，先完整跑通一个最有代表性的生产组，确认首帧、正式故事板、声音参考和视频实际效果后，再并发其余彼此独立的生产组。某个生产组需要重做时，只重做用户指定的该组；其他已完成结果保持不动，尚未开始的独立组继续生产。连续镜头链中，前一组实际视频尾部与提前生成的共享边界帧不一致时，不自动覆盖边界帧，也不自动重做链路；仅在用户接受该视频并明确继续连续链时，以其记录的 `observed_end_state` 覆盖同一控制维度的计划状态。未接受时展示差异并由用户决定重做前一组、修改边界帧或继续后一组。

代表生产组优先选择同时包含主角、目标语言对白、关键道具、人物动作和至少一次切镜头的典型非连续组；先验证角色、声音、资产与提示词主链，连续镜头链在主链跑通后单独执行。用户看过代表组的实际首帧、故事板和视频并明确允许继续后，剩余彼此独立的生产组立即最大并发。

代表组验收固定展示原片对应片段、生成视频、首帧、故事板、实际上传的参考图和提示词。发现问题时只按问题所在精确修改声音、首帧、角色卡、道具卡、故事板或该组提示词，不无关重做。代表组通过后锁定其已确认的风格、角色、声音、资产和提示词模板结构；后续组只替换自身镜头事实、动作、地点和台词。

连续镜头链仅适用于原片同一时间、同一地点、同一动作或直接承接状态且没有明确跳跃的相邻组；硬切但人物动作和状态连续时仍属于连续链。黑场、标题卡或明确时间跳跃一律断开连续链，下一组按原片新状态生成首帧。

连续组上一段尾帧保持原片边界那一刻的真实姿势和运动状态，不为稳定而改成停住；动作连续但下一镜头机位改变时，下一段先用上一段真实尾帧起始，再按原片立即切换机位。生产组边界不得把一句完整台词切成两段，只能放在上游确认的停顿、换人说话或无对白处；不得缩短、重复或让同一句台词跨两个视频组。

一句完整台词超过 15 秒且没有确认停顿时，停止在该点自动分组并询问用户，不自动拆句或延长。无停顿换人说话是合法边界。无对白材料在 4-15 秒范围内选择最接近原片切镜头且动作相对稳定的位置作为边界。

原片背景中与剧情无关的中文招牌、品牌或海报替换为自然的目标地区环境文字或普通背景元素，不保留中文。正式故事板的创意指导条、分区标题和制作短注统一使用中文。

剧情相关的片名卡、章节卡、时间地点卡保留原片出现时点和叙事作用，使用已验证的目标语言文字资产生成对应画面。回忆、梦境、预告式插入或闪回蒙太奇保留原片进入时点、镜头顺序、颜色/光线变化和叙事作用，不额外加解释字幕或标题。结尾剧情尾声必须保留；无剧情作用的平台水印、账号引导和广告字幕删除，不翻译、不进入视频或后期字幕。

生视频提示词使用一个集中、短小的负向约束，只列当前完整镜头最可能出现的 5-10 个失败：木头动作、身体漂浮或平移、过度平滑、脸部或手部变形、身份/服装漂移、道具关系错误、场景跳变、背景抖动、无依据文字或明显 AI 味；不得在每个栏目重复否定。无对白段写可听见的呼吸、衣料、脚步、房间声场或剧情需要的沉默反馈，不能留空或泛写“无对白”。视频只上传当前生产组真正需要的图；需要多张时按“转绘首帧 -> 正式故事板 -> 角色卡 -> 道具卡 -> 场景卡 -> 文字屏幕卡”排列，上传资产卡时保留原始中文标签，不制作无标签副本。控制器通过代码自动上传 Step04 Word 已确认且通过自动 QA 的精确文件，不要求用户手动上传，也不让渠道从本地目录自行猜测文件。

视频提示词必须分别写清三类身份：`场景身份` 回答这是一场什么事件，`环境身份` 回答时代、地点、空间、阶层、行业和故事语境，`人物身份` 回答他是谁以及当前心理、身体或任务状态。三类身份先于动作出现。无剧情作用、无需读清的文字保持为自然不可读的背景纹理；必须读清的手机、文件或电脑文字只有存在已验证目标语言文字资产时才显示。

手机号码、地址、身份证件、病历号、车牌、账号等剧情相关信息，使用目标地区格式自然、剧情关系一致但完全虚构的内容，不复用真实个人数据。手机 App、网页、支付界面或社交平台推动剧情时，使用目标地区自然的应用或界面形式，保留功能、操作状态、可读信息和剧情结果。合同、报告、收据、工牌、医院文件等必须读清的纸面内容建立独立目标地区文字资产，使用真实可信但虚构的格式、版式和信息，保留原片可读内容的剧情作用。

默认版不再压缩掉逐切镜信息。一个 `VG` 内必须保留每个小分镜的 `shot_id`、原始起止时码和本组相对秒数，并按时间轴逐条描述动作与镜头运动；只有场景身份、环境身份、人物身份和全局负向约束集中一次。若多个连续小分镜中的人物、服装或空间不变，不重复基线形容词，但仍必须写清该镜头真实发生的构图、动作、镜头运动、光线/道具/环境和声音/对白变化。视频正文使用锁定的目标地区本地角色名；内部文件名可以保留资产 ID，提示词、Word 和参考标签只使用中文显示名。

### S-004 Step04 A/B/C/D 编译边界（默认）

### S-026 商业级 Step04 事实、资产与生产提示词闭合（20260805，优先于旧 Word 展示约定）

已观察到的触发：旧 Step04 将可见人物、动作主体、口型说话人和画外声混为 `entity_instances`，把身份母图/旧 accepted 当作最终资产，并把未本地化中文台词和逐字段重复正文写进 Word。保护对象：B 层实际资产图提交、C 层生视频提交、Word、首帧、故事板和视频上传。Owner：唯一 Step04 编译入口与 Harness。退出条件：每项事实、资产、提示词和用户可见 Word 均能回指同一不可变合同。

Step02 进入 Step04 前，每镜头必须显式且彼此独立地提供 `visible_instances`、`action_subject_instance_ids`、`onscreen_speaker_instance_ids`、`offscreen_speaker_instance_ids`。可见人物决定人物参考槽位；动作主体必须可见；口型说话人必须可见且有口型/声音闭合；画外声、电话、旁白和内心独白不得因为听见声音而注入画面角色卡或视频上传参考。仅手、肩、背影、剪影的局部实例只保存空间事实，不能升级为完整人物资产、口型或主动作主体。缺任一分区，或构图主体/动作主体/口型说话人不一致时，在 A 层失败，不生成 Word。

B 层是 Step05 唯一实际作图提示词合同，不存在展示版与提交版两套文本。每项必须保存纯中文 `@` 显示名、资产种类/阶段、实际 `generation_prompt`、prompt SHA-256、精确原图/SHA、实际提交回执的 `actual_prompt`、下载回执、QA、职责和允许实例；Word 只原样展示该合同。人物只允许 `character_sheet + final_character_asset_accepted + accepted` 的最终角色设定卡进入 B；身份母图、原片帧、故事板预览、旧 Word 和未闭合历史资产一律失败。当前用户明确批准复用的历史资产必须先导出当前 job-local 复用合同：清单、精确路径/SHA 和回执只证明“视觉参考可复用”；只有同一精确文件的 Provider `actual_prompt` 也闭合时，才可进入 B 层和成为 Step05 实际作图提示词。缺 `actual_prompt` 的通过图不重做、不降级、不丢失，但只能停留为 `historical_visual_reference_only`，B 层以 `STEP04_REUSE_PROMPT_PROVENANCE_INCOMPLETE` 失败关闭；不得静默升级旧 accepted，也不得借用同 asset_id 的新图提示词。

C 层仍保留完整事件 IR，但每个 5–15 秒 VG 只输出一段自然、可直接提交的正文：先一次说明实际上传参考及其职责，再写场景/环境和开场状态，随后按本组从 `0` 开始的相对秒数只写发生变化的构图、动作因果、表情/视线/手部、镜头、光线、道具、声音和台词。参考图已锁定的人脸、发型、服装、空间几何和道具外观不得重复；不写“完整连续短剧视频”“初始化”“字幕随台词切换”等元话语或字幕生产语句。台词必须嵌在对应动作时点，目标语言任务必须存在同 locale 的本地化绑定；中文源台词、原片姓名或 `source_language` 伪装为目标台词时 C 层失败。

### S-041 C 层交付投影与恢复闭合（20260806）

C 层的 `story_progression`、`action_detail` 与事件块是同一镜头的多路观察，不是三段可并列拼接的正文。交付正文必须只选择一条按时间推进的因果主线；`action_detail` 只能补入主线尚未表达的、可见的眼神、转头、抬头、微表情或手部细节。同一镜头内“推开/拉拽推开”“进入/走近”“退场/退出”等同类动作只保留一次；不得删改原始事件 IR、证据或时间码。

已在 A 层闭合的角色，C 层只能将来源文本中的表面称谓投影为纯中文 `@角色名`，不得退化为“深色西装男子”“条纹西装男子”“男士”或“女童”。允许投影的唯一依据是：同镜头结构化事件已把该称谓所在动作绑定到该 `subject_instance_id`，或同镜头该类别只有唯一已解析角色；服装词本身不得重新推断身份，无法闭合时保留未确认边界。投影前必须保护已有完整 `@角色名`，替换短词不得产生 `@@角色名`、叠名或把两名同类角色合并。

重编译 C 层时，Harness 默认读取当前 job 的 `step03/localization/dialogue_localization.json`，并兼容从 `harness_state.target.locale` 读取 `target_locale`。非中文目标语言存在对白而本地化合同缺失、语言/源 SHA 不匹配或目标台词仍为源语言时，C 层失败关闭；本地化后的称呼必须出现在其对应动作时间段，不能回退到源片姓名。

当前 job 已获用户明确授权的完整视觉复用合同，若逐项覆盖计划资产并同时闭合精确路径、SHA、当前授权、渠道回执和 `b_layer_consumable`，优先于待生成生命周期门进入 B/C；此例外只适用于该 job 的精确复用合同，不放宽历史目录扫描或普通旧 `accepted` 资产。Step04 成功完成 D 层真实文档 QA 后，Harness 必须将 `current_node` 与 `earliest_incomplete_node` 同步推进到 `step05b_video_firstframes`、清除旧 Step04 门禁/生命周期失败指针；实际 A/B/C/D 文件保留审计，不得在下次恢复误回到已通过的 Step04。

机器回归至少覆盖：已绑定表面称谓投影为对应中文 `@` 角色名、同动作三路观察不重复、已有 `@女孩欣欣` 等引用不被短词二次替换、本地化合同与嵌套 locale 自动消费，以及成功 Step04 不保留旧失败恢复指针。

D 层只渲染 B 层资产图提示词表和“完整生视频提示词”两部分；不展示 A/C 调试字段、内部路径、OCR/HTML、资产 ID 或旧 Word 内容。新建 DOCX 默认采用 OfficeCLI External（外部文档）路径；当它不能保持不可变 B/C 原文、精确本地预览和 SHA 对应时，允许使用直接 OOXML 渲染器完成这三项不可替代能力，但绝不使用 LibreOffice。视觉 QA 必须同时检查 B/C 提示词、预览数量、原图 SHA 对应、目标语言、本地资产中文名、无 OCR/HTML 泄漏和无空白资产项。Word 可渲染不等于内容通过。

详细字段合同见 [Step04 A/B/C/D 编译合同](references/step04-abcd-architecture.md)，需要创建或回放中间层时先读取该引用。

Step04 不是把 Step02 自由文本拼成 Word；它是“证据到生产文本”的四层编译器，必须按以下有向无环路由执行：`Step02 已验收镜头事实 -> A 实体与证据绑定 -> B 资产与连续性合同 -> C 毫秒时间轴提示词 IR -> D Word/Markdown/渠道交付`。A 层为每个动作主语、受事者、位置、服装锚点和局部身体建立唯一 `entity_id`、中文 `role_ref`、证据 ID 和状态；双男镜头不得因“男子/人物”合并，不确定实体保持 `unresolved`，不得默认给男主。B 层把实体映射到唯一资产 `asset_id`、中文显示名、引用职责、证据路径、SHA-256、适用镜头和状态变化；C 层只序列化 A/B 绑定，保留每个 `shot_id`、原始毫秒时码、构图、动作因果、镜头运动、光线/道具/环境、声音/对白；D 层只渲染交付格式，不参与事实推断、角色替换或镜头计数。Word 不是事实源。

Step04 输入除语义验收字段外，必须带 `semantic_alignment`：`status=accepted`、固定 `mapping_policy=continuous_observation_local_interval_plus_segment_start; never_ordinal_shot_mapping`，以及可回读的 `semantic_unit_ids`。每张进入 A 层的卡必须绑定至少一个该列表内的语义单元；缺失即表明卡可能来自旧序号映射，Word 前失败。该门禁由 Python 编译器和念念 AI bridge 同时验证。

资产注册表是 B 层的唯一生图提示词来源。每个 `accepted` 的人物、场景或道具资产必须同时提供 `generation_prompt`（允许兼容字段 `image_prompt`/`prompt`），并由 B 层原样透传到资产图提示词表；缺失、临时拼写或 D 层根据剧情补写都必须在 Word 前失败。资产图提示词、真实文件路径和 SHA-256 属于同一不可变资产事实，D 层只能展示，不能重写。

实现入口固定为项目 `tools/step04_abcd_compiler.py` 与念念 AI `bridge/niannian_step04_abcd.js`。任何旧的 `build_word()`、硬编码 `*_ASSET_BY_SHOT`、服装/身体部位正则或“提示词中出现资产名即视为已消费”的路径均不得作为 Step04 主链。Python 编译器和 JS bridge 必须对同一 A/B/C 合同执行相同的实例、资产、事件和时间码门禁；测试必须证明交换男主/男配实例在 D 之前失败，正确输入才生成交付。

证据必须按字段合并而不是整卡覆盖：身份使用 Step02 绑定与跨镜头锚点；连续动作使用 Gemini 连续视频事实；起止构图和冲突状态使用 Terra/GPT 校正；对白文字使用字幕与 Mimo reconciliation，声纹/主动口型单独决定 speaker。冲突写入 `conflict_notes` 并保留来源，不能用全局字符串替换静默覆盖。语义质量门在 Word 之前执行：每个动作主语和受事者有唯一实体；条纹西装绑定 `@男二男配`、深色/格纹西装和黑衣手臂绑定 `@男主沈川`；生产正文不出现泛称、英文资产 ID、`speaker_unknown` 或 `人物A/B`；每个参考图都有职责句；台词只出现在对应动作时间段；A/B/C 层 JSON 与 D 层文档可回溯且哈希一致。未通过时停止 D 层，不生成表面完整但事实错误的 Word。

编译合同是不可变事实边界：D 层更换 Word 模板、Markdown 样式或渠道载荷格式，不得改变 A/B/C 的规范化 SHA-256。B 层必须读取真实文件并校验 SHA-256；C 层事件的 `subject_instance_id`、`object_instance_id`、`speaker_instance_id`、`reference_slot_id` 和毫秒区间必须全部可回指；任何 `conflict`、`uncertain`、`speaker_unknown`、泛称或资产英文内部键均在 Word 前失败。失败只输出门禁报告，不能输出表面完整的生产包。

#### S-004.1 实例集合与参考消费硬校验

#### S-004.2 连续区间证据与审计传输边界

Gemini 连续视频观察、原片抽帧和 Terra/GPT 审计必须消费同一个绝对源时间区间。每个观察窗口的首/中/尾帧必须由 `source_video + source_start_ms/source_end_ms` 直接抽取，首帧和尾帧向区间内部收缩，禁止用旧 `shot_id`、TransNet 切点序号或历史 `S001/S002` 文件名查找参考帧。TransNet 只保留为 `native_cut_ids` 候选，不得决定审计帧内容。审计输出必须记录 `frame_policy=source absolute interval start/mid/end inset from source video; no cut ordinal lookup` 和每帧 SHA；旧策略生成的批次不得复用。

外部视觉审计的批次必须是真并发：独立批次使用异步进程/请求提交，不能在 `Promise.all` 内调用同步阻塞的 `execFileSync` 或等价实现。成功批次按 `batch_id + window_ids + evidence_paths` 缓存，失败只重试该批次；`503/502/504/429` 和明确瞬时网络错误最多指数退避三次，不能因缓存命中或 HTTP 200 把错配证据标记为 `pass`。审计前先检查窗口帧数量、绝对时间覆盖和输入 SHA，任何证据时间错位先修复取证边界，再决定是否重跑 Provider。

Step04 只接受通过同一绝对区间合同的 Step02 manifest。只要审计仍有 `conflict`、`uncertain` 或 `needs_targeted_recheck=true`，输出 `step04_input_gate_report.json` 并停在 `step04a_input_gate`；不得用旧宽窗口、旧 Terra 批次或旧 Word 覆盖新事实。

A 层必须要求每个镜头卡的 `entity_instances` 集合与权威身份绑定集合完全相等，不能只验证卡片中出现的行；多余、缺失、重复或同一镜头同一资产多实例而没有显式实例边界时一律失败。B 层的 `display_name` 必须匹配 `@[\u3400-\u9fff]+`，只允许中文 `@` 显示名；英文名、资产 ID、文件名和混合别名不得进入提示词或 Word。C 层每个事件必须有 `evidence_ids`；每条对白必须有独立证据 ID、已绑定 `speaker_instance_id`，且对白时间完全位于动作事件内。每个实际上传的 `reference_slot` 必须在组级参考协同中写出职责，并在事件或组级引用集合中可回指；只出现 `@` 名称而没有职责和槽位绑定，视为未消费。Python 编译器和念念 AI JS bridge 必须同时执行这些规则，并为每个失败返回可定位错误码。

#### S-001 授权后的输入放行与实例编译修复

Step02 的 `accepted` manifest 只证明文件结构完整，不等于语义可以生产。进入 Step04 前必须同时满足 `status=accepted`、`semantic_status=accepted`、`acceptance_mode=semantic`；每张卡必须有 `verdict=pass` 且 `terra_audit.needs_targeted_recheck=false`。Step04A 启动前必须逐卡检查 `terra_audit.needs_targeted_recheck`；只要为 `true`，或 `verdict` 为 `conflict`/`uncertain`，或缺少语义放行字段，就只能写入 `step04_input_gate_report.json` 并把 Harness 当前节点留在 `step04a_input_gate`，不得生成 Word、Markdown 或渠道载荷。结构完整的旧卡不得伪装成语义放行。若一个镜头内出现硬切、前景/背景两个同类人物或主体变化，先在 Step02 拆成独立时间段，不能在 Step04 用提示词拼接修复。

A 层的实体最小粒度是“镜头人物实例”而非全剧角色：同一角色跨镜头可复用资产，但同一镜头的前景男配、背景男性和局部手臂必须各有独立 `instance_id`；未确认实例保持 `@未确认背景角色_仅保留轮廓`，禁止借用男主或男配资产。B 层必须为每个镜头/参考图建立结构化 `reference_slot`，包含资产、职责、证据、路径、SHA-256、允许实例和 `planned/uploaded/verified` 状态；只检查 `@` 名称出现在提示词中不算资产已消费。C 层必须输出事件块，显式记录动作主语实例、受事者实例、起始状态、变化、结束状态、时间码和证据；D 层只能渲染 C 层，不得再做角色替换、事实判断或镜头计数。

#### S-009 已验收资产的原图追溯、Word 预览与 2K 默认

已验收资产进入 B 层时，`assets[]` 与每个镜头的 `reference_slot` 必须同时保留 `asset_id`、纯中文 `display_name`、`exact_path`、`sha256`、`status`、实际 `generation_prompt`（兼容 `image_prompt`/`prompt`）、`evidence_path` 与使用职责。B 层先对 `exact_path` 的实际原图重新计算 SHA-256；路径不存在、哈希不符、提示词缺失或状态不是 `accepted` 时，不得把它写成已验收参考，也不得进入 D 层。

D 层 Word 只能读取同一不可变 B 层合同：已验收且已通过原图路径/SHA 校验的资产，必须从原图生成仅供 Word 查看的压缩内嵌预览；预览绝不替代原图，后续首帧、故事板和生视频上传仍只使用 B 层登记的 `exact_path` 与 SHA-256。`planned` 资产必须明确显示“待生成（新图默认 2K）”，不得伪造预览、虚构已验收状态或把 Word 内嵌图回写为渠道参考。D 层不得从旧 Word、目录猜测或自由文本补全资产。

新生成的角色、场景、道具、首帧和故事板默认请求约 2048 像素长边的渠道档位；渠道没有 2K 时，选择不超过 2K 的最高标准档。历史已验收资产按原始真实分辨率复用，不得无意义放大并冒充 2K。Word 的资产表必须同时显示中文资产名、资产类型、实际压缩预览（或明确待生成状态）和已验收提示词，让用户能在同一份 Step04 Word 内核对资产，而不影响下游精确原图调用。

### S-002 生视频提示词最小充分编译规则（默认）

本规则覆盖旧版“完整字段逐镜头复制”写法。生视频正文的参考图调用、中文动作叙述和 `@` 参考标签只使用已锁定的中文角色显示名，例如“男主沈川”“男二男配”“女孩欣欣”；目标地区英文名、英文资产别名和资产 ID 不得进入 `@` 参考标签。唯一例外是**引号内、实际要被角色说出的目标语言台词**：必须使用同一 `localizationBindings` 中该角色已锁定的转绘后本地名，例如中文参考 `@男主沈川` 的英语台词写 `Julian`，中文参考 `@女孩欣欣` 的英语台词写 `Sofia`。C 层对每个本地化台词同时保存 `source_text`、`target_text`、`speaker_instance_id`、`target_dialogue_name` 和时间范围；若源台词含已知原片姓名/亲属称谓而 `target_text` 未出现对应转绘后本地名，则 C 层失败。角色称呼必须来自当前镜头的 `visible_characters` 或已接受说话人绑定；不得把未出镜、只被台词提及或只出现在组级角色集合中的角色带入该小分镜。

每个完整 `VG` 只写一次 `参考协同`、场景身份、环境身份、人物身份和连续性基线。`参考协同` 必须把每张实际上传参考图与职责、画面事实绑定成可执行句子：角色卡锁脸型/发型/服装/身份，首帧锁开场构图/机位/站位，道具卡锁外形/材质/状态，场景卡锁空间几何/背景/光线；不得只列 `@资产名` 而不说明其如何参与本段。

资产参考名显示规则：提示词、Word 资产表和参考职责正文只显示资产的中文显示名，不显示目标地区英文名、资产 ID、渠道内部键或文件名后缀。角色使用已锁定的中文角色显示名（例如“男主沈川”“男二男配”“女孩欣欣”），道具和场景使用中文名称并去除下划线后的内部标识；资产 ID 仅保留在内部 JSON 合同和 QA 对照。一个完整提示词内第一次提到某资产时写中文显示名；同一提示词再次提到该资产时，必须在中文显示名前加 `@`，例如“男主沈川；再次引用 @男主沈川”。`@` 后不得追加英文别名、`_CHAR_`、资产 ID 或文件名后缀。编译器必须按组内引用顺序执行该规则并统计重复引用数。

小分镜按源 `shot_id` 和毫秒时码保留。第一个小分镜写完整基准；后续小分镜使用“保持上一状态；变化：……；结果：……”差分格式，只写构图、动作、表情、镜头、光线、道具或声音中实际变化的事实。未变化的服装、空间、光线和道具不重复。每条仍必须覆盖构图/人物、动作因果、镜头运动、光线/道具/环境和声音/对白；字段没有证据时写“保持上一状态”或“证据未给出”，不能用套话补齐。

删除无画面作用的模板句和抽象词，包括“人物自然变化”“镜头服务动作”“电影感”“高级”“真实质感”“整体氛围”“持续保持张力”等。每个参考职责只在 `参考协同` 或首次真正发生变化处写一次。负向约束只保留当前生产组最可能出现的 3-5 个失败，不在每个字段重复否定。

编译质量门：正文只出现当前小分镜事实角色；后续段落重复率相对上一段下降；每个上传参考图至少有一条职责句进入正文；删除形容词后画面不应失去可执行信息；组级字符数、角色名重复次数和参考职责覆盖率写入合同统计；`@` 引用只允许中文显示名，出现英文别名、`_CHAR_`、资产 ID 或泛称即失败。未通过时只修正编译器，不把低价值模板句交给视频模型。

### S-006 参考图优先、文字只补动态变化

将当前生产组实际上传且通过 QA 的目标世界参考图视为 Seedance2 的主要视觉事实来源，优先锁定角色身份与外观、场景空间几何、道具外形与材质、文字资产版式和连续性。提示词只负责补充参考图不能直接锁定的场景身份、时间段内动作与剧情因果、表情/视线/手部变化、镜头运动、光线变化、对白/声音和动态状态；不得重新描述或改写参考图已经锁定的脸、发型、服装、空间材质、道具外观或静态文字。

按“参考图调用 -> 场景/环境身份 -> 人物当前状态 -> 时间轴差分动作与镜头 -> 声音/对白 -> 必要动态细节”的顺序编译。连续小分镜只写相对上一段发生的变化；未变化的外观、服装、空间、道具和基础光线不重复。只有当前时间段确实改变了参考图锁定的对象时，才描述该变化及其结果。

台词必须嵌入它实际发生的 `shot_id` 和毫秒时间段的动作行，紧邻说话时的口型、视线、手势或反应；不得把台词集中堆在组末尾的“对白候选”或“细节”字段。Mimo 的已闭合台词、说话人和时序是本地化语义真值；OCR 只用于确认字幕出现、切换和位置，不能将旧字幕人名直接复制为转绘台词人名。目标语言台词必须调用 `localizationBindings` 的角色本地名，而不是原片中文名、原字幕名或资产 ID。声音段只保留环境声、画外/电话关系和无法闭合的说话人边界；同一台词不得在动作行和声音段重复出现。

资产引用必须在正文中成为可执行调用，不得只堆列名称；首次引用写中文显示名，重复引用写 `@中文显示名`。当参考图缺失、未上传或 QA 未通过时，禁止假装其信息已被锁定，必须在提示词中明确由文字补足的事实或将该生产组标为待补参考。验收时检查每张实际上传参考图都有职责句、每个生产组包含“参考图优先”边界、文字没有重复参考图静态信息，且提示词字符主要用于动作、镜头、声音和剧情变化。

每个时间段按原片事实保留镜头运动细节：手持抖动写清强度和方向；焦点变化写清从哪里转到哪里；慢动作、加速或突然停顿写在对应时间段。保留原片手持方向、强度和紧张感，以及剧情需要的拉焦、失焦和运动模糊；去掉压缩抖动、无意义跳帧、低清与自动对焦失灵等非叙事技术缺陷，不统一稳定镜头或强行保持锐利。人物被故意裁在画面边缘、只露局部身体或道具，而构图承担压迫、悬念、窥视或关系信息时，保留原片裁切和画面重心，不为完整或美观自动补全、重构。

人物进出画面时，按原片写清从哪一侧进入或离开及其时间点；视线写清看向谁或什么以及何时移动；递东西、拉手、拥抱、推开等接触动作写清谁用哪只手、接触谁或什么、动作开始和结束状态。

每个时间段按原片保留主光方向、环境光、色温和明暗变化；保留时间、天气和变化发生时点。台灯、屏幕光、车灯、霓虹灯等实际光源写清位置、颜色、亮灭状态及其对人物或道具的影响。

当前镜头不得新增原片事实中未出现的人物。已有明确专业最优解的模板细节由控制器直接执行并写入，不再逐项询问用户。只对会改变用户创作方向或外部执行结果的事项提问：目标地区或语言、当前任务图片/视频渠道、本土化没有等价形式时的替换、启用或修改视觉风格，以及真实执行中需要用户选择的异常。

生视频提示词不生成或要求烧录字幕；字幕属于成片后剪辑，到需要制作时再主动询问用户决定。重叠说话直接由提示词约束同时说话、各自声音和原片画面位置，不改成轮流说话；仅在实际生成结果证明无法实现时才转后期剪辑补齐。电话声和画外声同样由提示词约束为画外或电话传来，保持当前真实画面和可见人物反应，不新增说话人画面。

电话声和画外声在提示词中明确写为“电话传来”或“画外声”，保持当前画面和可见人物反应，不新增说话人画面。关门、脚步、手机提示音等剧情音效由 Seedance2 在对应时间点生成，保留原片时序和剧情作用。生视频阶段不生成背景音乐；全部视频组完成后才进入成片剪辑阶段。

已确认角色的目标语言声音身份优先由 Mimo 声音设计模型生成并在整部剧复用，换集、换服装、换地点不改变同一剧情角色的声音身份。所有有明确台词的次要人物也建立独立声音身份，避免本集内或后续返场时串角色。Step02 确认角色、目标语言和说话人后，立即与独立资产卡并发生成，不等角色卡确认或临近生视频才开始。每个声音身份使用不含剧情信息的目标语言中性短句建立，固定声音身份而不预先锁死某一场戏的情绪或真实台词。声音设计以转绘后的目标地区角色身份为准，自动匹配自然的年龄感、性别表达、职业感和社会语境，不模仿原片演员声线；默认使用当前目标语言地区自然且普遍可懂的口音，只有原片人物身份或剧情明确需要时才加入地区性口音或俚语。两个或更多相近年龄、相同性别的主要角色，在保持自然前提下主动拉开音色、语速、共鸣位置和表达气质，确保观众可辨识。低声、哭腔、愤怒喊叫、电话处理和画外旁白都复用同一角色声音身份，只在对应时间段按原片事实写清该次表达方式。提交每个生产组前，先检查当前视频渠道是否支持上传声音或视频参考：支持时，控制器为该角色生成对应的目标语言声音参考，并用代码自动上传给需要它的生产组；不支持时，不要求用户手动上传，改在生视频提示词中明确该角色专属声音身份、目标语言、音色、年龄感和语气范围，并要求同一角色跨全部生产组保持一致。该规则只锁定声音身份，不改变已接受的对白、说话人、画外声或口型事实。

独立旁白不归给剧情角色：为本剧建立一个独立、可复用的目标语言旁白声音身份。电话或画外说话人尚未被 Step02 确认时，建立“未确认来电者/画外者”临时声音身份；后续确认具体角色后合并到该角色身份，绝不自动冒认给画面人物。人群声、广播、电视新闻、商场播报等非角色声音作为环境声音生成，不建立角色卡或长期声音身份；只有剧情关键且重复出现时，才按其独立剧情作用建立可复用身份。

画面内唱歌、哼唱或剧情关键歌曲标为“剧情内歌曲”，保留其剧情作用与出现时点；先完成正常视频，待全部视频完成、进入成片剪辑时再询问用户是否用 Suno 生成目标地区版本。笑、哭、喘气、叹气、吞咽、抽泣等角色非语言表演声音，复用该角色同一 Mimo 声音身份，并在对应时间点按原片强度与时序由视频渠道生成。

声音参考按当前生产组实际可听见的声音最小上传：角色仅出现在画面中、全程没有台词、画外声、电话声、唱声或非语言表演声音时，不上传其声音参考。两名或更多角色重叠说话时，上传全部实际说话者的声音参考，并在提示词中写清各自位置、台词、重叠时间及画内/画外关系。安静反应镜头中只要能听见角色的呼吸、抽泣、压抑哭声等表演声音，仍上传该角色声音参考；它不是普通环境声。

每个时间段的声音空间感严格跟随原片人物距离、朝向、遮挡和空间关系：远离镜头、背对镜头、隔门说话时，写清相应的近远、闷响、房间混响或门外声。镜头从说话人切到听者而原说话人继续讲话时，保留同一角色声音连续，只将其从画内讲话转为符合当前画面的画外声，不重新建立或上传另一种声音。相同地点连续切镜头时，保持同一环境底噪、空间感和声场，只按原片门开关、人物进出、镜头转向及其他真实事件改变。

全部视频组完成后，才进入成片剪辑阶段，并主动询问用户当次完整剪辑方案；在用户明确决定前，不预设剪辑方式、不生成背景音乐、不选择音乐风格，也不加入背景音乐。用户决定需要背景音乐后，再进入 Suno 音乐决策。

视频生成结果无论是生成失败、无法播放、缺失声音/已锁定台词，还是人物、动作、镜头偏差，均不自动重做或改写。控制器须展示对应生产组的实际结果和问题，由用户决定是否重做、改提示词、改参考或进入剪辑；未收到该决定时保留当前结果并继续其他不依赖该决定的生产组。

- Step 01 evidence extraction is not a user-approval stop by default. After it passes validation, continue to Step 02.
- Step 02 is the clean evidence handoff. Raw OCR/ASR/frame evidence belongs in sidecars.
- Step 03 is internal by default. Export a separate Step03 Word only when the user explicitly asks to review the Mexico Spanish reference script before production prompts.
- Step 04 is a production package: supporting assets, provider-neutral canvas script, grouped 4-15s Seedance2 prompts, dialogue review table, shot timeline, calibration, and a mandatory authoritative production record in both Markdown and Word. The Word is a visual execution package: each asset has its Chinese duty, image prompt, actual uploaded image references, and compressed actual output image; each video group places its full video prompt beside the actual reference images. Source evidence frames are never labeled as generation references. Scene assets never upload source frames containing people; those frames only establish Step02 spatial, composition, and lighting facts. When no image is uploaded, label the asset as text-only generation and source not uploaded. Missing first frames or storyboards are labeled as pending, never fabricated. The production record is the user review surface after Step04: it must register locked prompts, source-timecode scope, reference order, actual generated assets/frames/storyboards/videos as they arrive, exact output locations, QA status, and unresolved deviations. It is a live production index, not an internal log dump.
- Step 05 is execution-only. It reuses accepted Step 04 prompt bodies and appends only fixed provider-quality suffixes where the Step 05 skill requires them.
- 在 Step04 接受时初始化 job-local `production_iteration.json`；每个 Step05 实际渠道输出、用户视觉反馈、渠道失败与任务结束时按 `$mx-shortdrama-production-iteration` 追加精确任务 ID、时间、QA、责任边界和验证状态。它只记录经证据支持的改进，不能自动重做视频或把一次创作偏好升级为通用规则。
- Word deliverables are user-facing documents. No internal paths, process notes, raw evidence dumps, or validator logs appear in Word unless explicitly requested.
- Build, update, and structurally validate redraw Word packages with `python-docx` and direct OOXML. Do not use LibreOffice for redraw Word generation, conversion, or acceptance. For visual acceptance when Microsoft Word is unavailable, use the maintained Apache-2.0 `docx-preview` renderer (`VolodymyrBaydalka/docxjs`, npm package `docx-preview`) in a Chromium-family browser, and save page screenshots as job-local QA evidence.
- Before generating, revising, or accepting a Step04 Word package, read and enforce [Step04 Word 版式与验收合同](references/step04-word-layout-contract.md). Table text may wrap or paginate, but it may never extend beyond the section's real usable width, be truncated to fit, or be accepted without structural geometry checks plus Microsoft Word or `docx-preview` visual review. The visual renderer is QA evidence, not a replacement for OOXML validation.
- Dialogue attribution is evidence-led, never a line-index or screenplay-role lookup. Step01 preserves ASR text/timing, diarization clusters, face tracks and active-speaker observations separately. For speaker identity, use `同一时间的可见口型/主动说话脸 + 声纹簇是否与已确认角色声纹相同或不同` as the primary proof; subtitle meaning is a semantic cross-check that can exclude an impossible binding, such as a line that refers to “沈川” in the third person. Step02 may name a character only when a concrete identity anchor plus these proofs supports it. A different confirmed voiceprint is sufficient to rule a character out even before the speaker's own canonical name is resolved. For off-screen or unresolved speech, retain the stable speaker cluster and exact evidence IDs; it blocks dialogue localization or character-voice locking that requires a name.
- Dialogue text reconciliation is a separate mandatory Step01/Step02 fact chain. For every spoken line, retain `asr_text`, `visible_subtitle_text`, `reconciled_source_text`, `text_conflict_status`, `resolution_evidence`, and the exact subtitle-frame paths. Clearly visible in-picture subtitles, including user-flagged subtitle frames, are primary semantic evidence; ASR supplies timing and an independent transcription candidate but may not overwrite a subtitle conflict. Empty OCR is only an OCR miss, never proof that no subtitle existed. When subtitle and ASR conflict, create a per-line reconciliation record before Step02 is authoritative; the final source text must state why it was selected. A personal name in dialogue identifies a referenced or addressed character only, never the speaker. Text meaning, acoustic voice cluster, active speaking face, and named-character identity must remain separately evidenced and may be joined only by their own proof.
- Step 01 的能力清单包括：WAV 提取、能量/VAD、`Mimo ASR` 中文台词文本、按风险触发的 `Qwen/Qwen3-ForcedAligner-0.6B` 对 Mimo 文本做精确 timestamps/SRT、speaker second-pass attempt、音频引导抽帧、TransNetV2、Paddle PP-OCRv6 和 Gemini 视频理解。默认先走快速首轮，不全量启动 ForcedAligner；具体触发规则见下方“音频时间证据调度”。Gemini 默认走云雾 `gemini-3.6-flash`，云雾只能使用其 OpenAI-compatible `POST /v1/chat/completions` 与 `Authorization: Bearer <protected key>`；不得误用 Google/Google-compatible `generateContent` 或 `x-goog-api-key`。直连真实 TCP 超时时，先按 `$mx-shortdrama-01-frame-extract` 预检既有本地 HTTP CONNECT 代理，成功后仅对云雾进程注入 `YUNWU_HTTPS_PROXY`，不得改系统代理或猜测 IP。它只接收完整连续视频或按源镜头边界无缝切开的连续视频段，不接收每镜头 start/mid/end 帧或其他图片；渠道/API、连续分段与预检细节只维护在 `$mx-shortdrama-01-frame-extract`。`Qwen3-ASR-1.7B`、faster-whisper、FunASR 和 SenseVoice 均不得作为生产 ASR、回退、比较或自动下载；它们的结果不得进入 Step01/Step02/Step04。Local OCR is not the default fallback.

The quality-first chain listed above is a capability inventory, not a full-run mandate. The scheduling rule below has precedence: run the light first pass, then enable VAD, dense frames, TransNetV2, Paddle OCR, or speaker second-pass only when its risk trigger is present.

### Step01/Step02 证据调度效率合同（S-003）

### ASR 生产硬约束（Mimo 主识别）

- **唯一文本来源**：Step01 的中文台词文本只能来自 `Mimo ASR`；`source_tool`、状态、清单和下游 handoff 必须明确写成 `mimo_asr`。
- **条件精确对齐层**：需要精确对齐时才调用 `Qwen/Qwen3-ForcedAligner-0.6B`，且它只接收 Mimo 的原文行并生成时间戳/SRT；必须写出 `transcript_origin=mimo_asr`、`asr_model_invoked=false` 和对齐回执。未触发精确对齐时，必须明确记录 `timing_basis=mimo_asr_segment_vad`，不得伪造 ForcedAligner 回执。
- **禁止误路由**：任何 `qwen3`/`Qwen3-ASR-1.7B` backend、fallback、默认模型、自动下载、旧 `qwen3_asr_raw` 真值文件或把 Qwen 识别结果写入 `transcript_segments` 的行为，均判定为路由违规；执行器应立即失败并指出“应调用 Mimo ASR”。
- **失败处理**：Mimo 失败始终是 blocker；快速模式下未触发或暂时无法调用 ForcedAligner 不阻断 Step02，使用 Mimo 句级时间、能量/VAD 与镜头边界并标注精度等级。精确模式或已触发的高风险窗口若 ForcedAligner 失败，才记录该窗口 blocker 并暂停依赖该精度的下游绑定。任何情况下不得用 faster-whisper、FunASR、SenseVoice、Qwen3-ASR 或 VAD 字符切分冒充 ForcedAligner 结果；隔离比较报告只能留在诊断目录，不能进入 Step02/Step04 真值字段。
- **执行器开关**：快速首轮必须使用 `stable_batch` 或等价快速配置；`--skip-qwen3` 必须同时阻止 `Qwen3-ForcedAligner` 子进程。只有命中精确触发窗口时，才显式传入 `--force-align --asr-enable-timestamps`；普通 Mimo 行写 `timing_basis=mimo_asr_segment_vad`，不得因为 `--skip-qwen3` 仍加载对齐模型。

### 音频时间证据调度（默认快速、风险触发精确对齐）

1. **快速首轮（默认）**：完成 WAV、Mimo ASR、能量/VAD、轻量抽帧和镜头边界；以 `Mimo` 句级时间 + VAD + 镜头切点作为 Step02 的基础时间证据。模型只启动一次并常驻的条件未满足时，不为普通对白下载或加载 ForcedAligner。
2. **精确触发**：仅在以下窗口调用 ForcedAligner：短台词（约 1 秒以内或少于 4 个汉字）、多人重叠/抢话、台词跨镜头切点、字幕与 ASR 冲突、Mimo 时间明显异常，或 Step04 明确需要口型/动作毫秒级卡点。调用时只提交该窗口的 WAV 与对应 Mimo 原文，不重新请求 Mimo。
3. **结果标记**：精确窗口写 `timing_basis=qwen3_forced_aligner_on_mimo_text`；普通窗口写 `timing_basis=mimo_asr_segment_vad`，并保留 `timing_precision=segment|word`。Gemini 只能辅助可见剧情、动作和镜头事实，不能替代 Mimo 文本或 ForcedAligner 时间。
4. **模式切换**：用户要求逐字字幕、配音口型同步或全片毫秒级动作绑定时切换为全量 ForcedAligner；否则保持快速模式。新任务默认快速模式，已有成功对齐结果可直接复用，ForcedAligner 修复不得删除或重跑 Mimo。

执行证据提取时采用“两阶段、风险触发”调度，不能把所有昂贵支线预先全量跑完：

1. **轻量首轮**：并发完成 WAV、Mimo ASR、能量/VAD边界、轻量自适应抽帧、字幕候选检测和 Gemini 连续视频观察；只把命中精确触发条件的窗口派发给 ForcedAligner。Gemini 只消费连续视频；不要为了 Gemini 预生成每个镜头的 start/mid/end 图片。
2. **争议补证**：只有以下情况才对指定 `shot_id` 补抽密集帧或调用额外镜头检测：Gemini/Terra 与清晰原始帧冲突、镜头边界不一致、字幕出现/变化/消失无法确认、人物年龄/身份冲突、候选说话人会改变 Step04 角色或台词绑定。没有争议的镜头不补抽、不重跑。
3. **条件支线**：TransNetV2 只用于快速切镜、渐变或自适应边界不确定的区间；Paddle OCR 只处理字幕首次出现/变化/消失及低置信度候选帧，不重复请求连续相同字幕；Silero/VAD 是快速模式的基础时间证据，并在 ForcedAligner 触发窗口中用于边界校验，不对已稳定对白重复全片运行。
4. **审计分级**：首次任务或角色/字幕/镜头冲突比例高的任务，对 Gemini 主卡做完整 Terra 审计；同一剧集后续已稳定的镜头只审计高风险卡和发生变化的卡，除非质量门重新发现系统性冲突。成功批次不重复提交。
5. **旁路材料**：contact sheet、Markdown 预览、raw response 副本、重复哈希和人工浏览图属于审计旁路，不得阻塞 Step01/Step02 主链；规范化 JSON、证据映射和质量门通过后即可继续。
6. **结构校验归并**：45 行以内的 JSON 字段、类型、连续覆盖和 SHA 校验由主控本地一次完成；子智能体只承担语义复核、冲突定位或独立生产组，不派发“纯结构验收”空任务。
7. **执行器媒体质量门**：Step02 主视觉请求的规范化输入必须是 `continuous_video`，每个连续段恰好一个 `video/mp4`，主请求 `primary_uploaded_images` 必须为 `0`；本地 start/mid/end 帧只能登记为未上传的裁决证据。任何旧的逐镜头图片入口必须转发到连续视频入口或直接失败，不能静默重建全量图片批次。
8. **文档运行时预选**：Step04 启动时一次选定可直接生成和结构校验 DOCX 的运行时（当前为 `python-docx`/直接 OOXML），并预选 `docx-preview` + Chromium 截图作为无 Microsoft Word 时的视觉 QA；运行中不得等到交付阶段才切换环境或重复生成。

说话人复核也采用风险触发：只有画面中存在稳定主动说话脸/口型，且绑定结果会改变 Step04 角色、声音或台词时才继续密集复核；画外声、旁白、多人反打无法闭合的对白保留 `speaker_unresolved`，不得为追求“全闭合”反复消耗 Provider。
- Copyable Seedance2 prompt bodies integrate spoken lines, pauses, breath, silence, hesitation, and pressure inside timed `动作 / 【画面/动作】` segments.
- Provider-facing or provider-named wording stays out of final Word unless explicitly requested. User-facing canvas sections use `画布`.
- Character assets and references use `原片中文名 / 西语名`, not Spanish-only names.
- Recurring character wardrobe continuity is decided before Step 04 character prompts are written.

## Clean Contract Chain

1. `$mx-shortdrama-01-frame-extract`
   Input: one episode video.
   Output: quality-first evidence package with source WAV, Mimo transcript, and Qwen3-ForcedAligner timestamped transcript/SRT only for triggered windows or precision mode, plus timing-basis markers for fast-mode segments; speaker second-pass status/ledger when configured, dialogue/audio-event/emotion ledgers, native-resolution frame evidence, OCR support, shot evidence, manifests, `minute_chunks/`, and shot-level supplements when needed.

2. `$mx-shortdrama-02-source-timeline`
   Input: accepted Step 01 evidence package plus source video.
   Output: original Chinese source reference timeline with shot-level rows, per-minute fine schedule, timecode-grounded story beats, visible evidence, key asset candidates, and resolved dialogue/audio anchors.

3. `$mx-shortdrama-03-mexico-localize`
   Input: accepted Step 02 timeline plus minimal evidence paths.
   Output: optional review-only Mexico Spanish localized reference timeline/script. In normal production runs, do not stop here and do not produce a separate user-facing Word. Compile the same logic inside Step 04 as `localizationBindings`: `Shot + 时间码 + 原片说话人 + 原片台词 + 西语角色 + es-MX台词 + visible replacement + A1/B/A2 internal check`.

4. `$mx-shortdrama-04-asset-prompts`
   Input: accepted Step 02 handoff plus Step 01/02 frame, shot, audio, ASR/dialogue/OCR evidence paths. If a separate Step03 review artifact exists, use it as an additional accepted source; otherwise compile localization internally.
   Output: final production package following the EP001 hard standard: the structured compiled contract, plus an authoritative Markdown and Word production record. Both review records include the Seedance2 seven-column top table, dialogue table, canvas script, shot timeline, supporting asset prompts, grouped 4-15s video prompts, continuity decisions, action checks, calibration, and an asset/video ledger that is updated with each actual provider result.

5. `$mx-shortdrama-05-asset-images`
   Input: accepted Step 04 package, selected provider mode, asset subset, optional references, and output/canvas details.
   Output: actual asset image execution package with manifests, logs, job states, and generated or pending asset images.

Optional add-on: `$mx-shortdrama-frame-anchor-addon` only after Step 04 and only when explicitly requested.

## Routing Rules

1. If the user provides only an episode video or asks for extraction/evidence/key visual analysis, route to Step 01.
2. If Step 01 exists and passes validation, route to Step 02. If the user asks for source timeline, source dialogue, or pull-apart analysis, route to Step 02.
3. If Step 02 exists and the user asks only for a Mexico Spanish reference script, localized dialogue review, or pre-production es-MX QA, route to Step 03 and stop after that review artifact.
4. If Step 02 exists and the user asks for asset prompts, production prompts, Seedance2 prompts, final Word package, all-purpose reference video prompts, or final prompt deliverables, route directly to Step 04. Step 04 must run the internal localization binding pass first; do not require a separate Step03 Word. Before Step04 is accepted, it must write the authoritative production record in both `.md` and `.docx`; Step05 then updates its output ledger using exact provider paths, SHA-256 values, actual prompts, and QA status.
5. If accepted Step 04 exists and the user asks to generate asset images, produce character/scene/prop images, run canvas/direct/RunningHub/rhimage2/Krill Image2 execution, or prepare provider jobs, route to Step 05. For `Krill` or `gpt-image-2`, load `$krill-image2`; it uploads the selected local reference image to Krill `/images/edits`, preserves the accepted Step04 prompt body, downloads the output, and records exact output hashes.
6. If the user explicitly requests generated frame-anchor images or video prompts that reference those generated images, route Step 04 first, then use the frame-anchor add-on, then Step 05 for any image execution.
7. If the user asks for a later step without the accepted upstream artifact, run the missing previous step first or ask for the missing artifact only when it cannot be discovered locally.

## 权威转绘资产与故事板链

保留既有的原片拆解与镜头时间轴职责；本节只规定下游转绘资产、首帧、故事板和生视频执行顺序。

### 关键道具卡

- 先生成关键道具卡，再生成角色卡。
- 每张关键道具卡为一张 16:9 多宫格资产图，锁定主视图、侧视图或三分之二视图、材质细节、人物互动尺度和剧情需要的状态。
- 手机、文件夹、报告、手表及其他连续性关键物件，后续首帧、故事板和视频均使用同一对应道具卡。

### 角色卡

- 每个主要角色必须使用独立 16:9 多宫格正式角色卡，包含正面半身、左右侧面、三分之二角度、全身正面、全身背面和四种剧情相关表情。
- 角色卡是人物身份唯一依据，锁定人脸、年龄、肤色、发型、服装、体型、首饰和职业气质；单帧人物图与故事板截图不能替代角色卡。
- 儿童角色卡额外锁定明确年龄、儿童头身比、小肩宽、稚嫩五官、儿童身高比例、发型和服装。

### 资产提示词边界

- 资产图与生视频提示词绝不共用模板。资产卡不写时长、节拍、对白、声音、首帧、故事板或视频引用顺序；这些仅属于生视频组。
- 道具卡：16:9 多宫格，只写道具身份、结构、颜色、材质、尺寸、主视/侧视/材质特写、人物手部尺度和剧情状态；中文标签只能放在边缘或空白区域。
- 场景卡：16:9 多宫格，只写无人物、无人形剪影的空间几何、建立全景、主机位与反打背景、核心陈设、材质和中性基础光线；不写人物、表演情绪、剧情动作，也不出现任何可读文字、数字、编号、标签、标识或水印。
- 角色卡：16:9 多宫格，只写目标地区身份、年龄、体型、辨识锚点、发型、服装、正面半身、左右侧面、三分之二、全身前后与四种剧情相关表情。儿童卡每个宫格重复锁定年龄与儿童比例。角色卡不得上传原片人物帧或模仿真实明星。
- 约束自然写进画面描述；不再使用独立的“负向约束”或“可选降噪提示词”字段。角色卡采用真实影视选角资料质感，场景/道具采用清晰、可重复使用的真实材质质感。

### 转绘首帧与正式故事板

- 道具卡和角色卡完成后，为每个生产组生成一张转绘首帧，锁定该组开始时的场景、构图、人物位置、道具初始状态、景别、机位、光线和情绪。
- 首帧完成后，先使用 `$storyboard-director` 生成、校验、评分并渲染本组 job-local 结构化故事板计划，再以其已校验的渲染提示词生成单张 16:9 正式 Image2 电影制作故事板；它替代第二张独立关键帧。
- 正式故事板须在同一张 Image2 图中包含角色与风格参考区、道具锁定区、环境与机位路线区、按时序编号的真实电影帧、灯光/情绪/音频/摄影笔记和导演颜色标记。
- 正式故事板的固定图像参考顺序为：本组转绘首帧 -> 本组相关正式角色卡 -> 本组相关关键道具卡 -> 本组故事板提示词。
- 原片人物抽帧不进入正式故事板图像参考列表；其镜头事实已在转绘首帧阶段完成目标世界转化，避免源演员身份覆盖目标角色卡身份。

### 生视频顺序与并发

唯一生产链：

```text
Step04 Word 确认
-> 关键道具卡 / 场景卡 / 角色卡（并发）
-> 转绘首帧
-> $storyboard-director（结构化计划 -> 校验 -> 评分 -> 渲染）
-> 正式故事板
-> 生视频提示词
-> 生视频
```

- 同层彼此独立的道具卡、场景卡、角色卡、生产组首帧、生产组故事板和生产组视频可以并发。
- 同一集全部必需资产卡通过自动 QA 后进入首帧；同一生产组严格按首帧 -> 正式故事板 -> 生视频提示词 -> 生视频执行。首帧和故事板不单独请求用户确认。

## Context Hygiene

- Load only the current numbered skill and the current episode's accepted upstream artifact.
- Do not pass old failed drafts, old generated prompts, duplicate Word files, or long historical notes when an accepted artifact exists.
- For Step 04, pass evidence paths and clean handoff objects; do not paste raw OCR dumps, frame manifests, or previous prompt drafts.
- Dirty evidence may exist only in sidecars. User-facing Word/MD/JSON and numbered-step handoffs must be clean before the next generator consumes them.
- A validator failure means the upstream contract or generator is wrong. Fix the route and regenerate the requested range rather than patching a final cell.

## Minimal Handoff Package

```text
Episode ID:
Source video:
Current accepted artifact:
Current artifact path:
Source duration / fps / aspect:
Frame/audio/dialogue/emotion evidence paths:
Minute chunk manifests, if used:
Minute schedule / key asset table, if available:
Known cast / relationship locks:
Known wardrobe / prop / text locks:
Unresolved uncertainties:
Requested next step:
```

## Accepted Artifact Standard

- Step 01 is accepted when audio/frame evidence is complete enough for shot-level redraw, the selected timing mode is explicit, Mimo transcript text is present, and no Qwen3-ASR transcript or implicit ASR fallback has entered the accepted handoff. In default fast mode, `mimo_asr_segment_vad` is an accepted timing basis and ForcedAligner is required only for triggered windows; in precision mode, every required window must carry `qwen3_forced_aligner_on_mimo_text`. If Mimo fails, stop the audio-dependent handoff; if a triggered/precision ForcedAligner window fails, block only the dependent precision binding and record the exact window.
- Step 02 is accepted when the original timeline is shot-level, sorted by timecode, grounded in evidence, and includes per-minute fine schedule plus key asset candidates.
- Step 03 is accepted only as an optional review artifact when explicitly requested.
- Step 04 is accepted when it follows the EP001 final standard in content and Word style, starts with the seven-column Seedance2 table, uses grouped 4-15s prompts, has concrete speakers and timed dialogue, includes the provider-neutral canvas script, performs internal `localizationBindings` / A1-B-A2 checks from Step02, writes both the authoritative Markdown and Word production records, and passes validation. The Word record must let a reviewer compare actual images/videos to their exact locked prompt and source timecode without opening internal manifests, including asset tables with image prompt/source reference/compressed actual output and video-group tables with complete video prompt/actual references side by side.
- Step 05 is accepted when it executes accepted Step 04 prompts without rewriting their prompt bodies and records asset status, provider mode, logs, manifests, and output paths.

## Output

Return one of:

- the selected numbered skill and why;
- the missing artifact required before routing;
- the minimal handoff package for the next step;
- the current episode progress status across Steps 01-05.

### S-004.3 单一 Harness 编译入口与桥接同构（20260804）

本地恢复统一通过项目 `tools/run_step04_abcd.py` 调用 `tools/step04_abcd_compiler.py`；该入口只负责读取 job-local 状态、传递精确输入、记录最早失败层和保存 A/B/C/D 路径，不得调用旧 `build_step04*.py`、`recover_ar_step04.py` 或自由文本 Word 入口。编译器没有返回结构化终态时，Harness 必须输出 `external_blocked`，不能根据退出码或目录中“看起来像 Word”的文件猜测成功。

念念 AI 的 `bridge/niannian_step04_abcd.js` 必须与 Python 编译器执行同一组门禁：身份绑定坏行不得静默丢弃；卡片 `entity_instances` 必须与权威绑定按镜头、实例、角色引用和资产逐项相等；人物、场景、道具参考槽位必须唯一且验证真实文件 SHA；对白说话人必须消费对应人物参考槽位；D 层必须携带 A/B/C 输入摘要。任何一端放宽规则都视为合同不一致，禁止进入网站交付。
### Step04 A/B/C/D 唯一编译边界

Step02 到 Step04 必须先通过 `tools/compile_semantic_step02.py` 的结构化语义门。该入口只接受已验收的连续视频区间合同、镜头级 `entity_instances`、事件块、对白证据和 `semantic_unit_ids`；它不得根据服装、身体部位、字幕姓名、自然语言或历史镜头号补写人物、说话人、动作、场景、道具或资产需求。没有局部时间、区间映射、结构化实体、事件证据或闭合说话人的输入必须输出 `blocked`，并回到 Step02 定向重查。

Step04 只能经过 `tools/step04_abcd_compiler.py` 或同构的 `niannian_step04_abcd.js` 编译 A/B/C/D。A 层以已验收身份绑定为唯一人物事实源；B 层以真实已验收资产注册表、路径和 SHA-256 建立镜头级参考槽位；C 层逐事件保留毫秒范围、主语、受事者、说话人、对白证据、镜头/光线/声音事实和实际引用的参考槽位；D 层只读合同，不能重新读取 Step02 原始卡、硬编码资产表或改写提示词。用户可见引用只使用中文 `@角色名`，英文内部资产 ID 只存在于机器合同和证据索引。

C 层每个事件必须同时具备 `start_state`、`change`/`action` 和 `end_state`；对白必须具备独立的 `timecode_ms`，不得回退为整个动作区间。事件的主语、受事者、说话人和参考槽位必须逐项回指 A/B；任何缺失都回到最早缺失的证据层，不允许由 Word 或渠道提示词补全。

生产组只能携带当前镜头实际需要的参考槽位，不取整组人物并集。已上传参考图已经锁定的人脸、服装、场景和道具事实不在视频正文重复描述，正文只写该时间段的变化。Word 交付必须由同一不可变合同渲染，并在 `docx-preview + Chromium` 真实截图 QA 通过后才标记交付；图片和视频 Provider 调用在 Step04 固定为 false。

### S-004.4 不可变编译边界与发布闭合（20260804）

Step04 的职责是确定性编译，不是第二次理解原片。Step02 通过的语义验收合同是唯一事实入口；Step04 不得从服装词、身体部位、字幕姓名、自由文本、旧镜头号或历史资产表重新推断人物、说话人、动作、场景、道具或参考图。A/B/C 的每个事实必须保留来源字段和唯一回指，D 只能读取同一合同的 A/B/C 规范化摘要并渲染，不得重新读取原始 cards 或改写内容。

第四步必须同时通过两条闭合链：`语义闭合`（Step02 的连续区间、实体、事件、对白和冲突状态全部 accepted）与 `资产闭合`（每个镜头实例、参考槽位、真实文件、SHA-256、资产职责和实际消费关系一一对应）。任一链断裂都只输出最早失败层的结构化阻塞，不生成表面完整的 Word。双男镜头、局部手臂、重复服装词和同镜头多实例必须按 `instance_id` 保持分离；只出现 `@` 名称不算参考图消费。

发布闭合属于同一合同：隔离发布包必须同时包含 `niannian_step04_abcd.js`、D 层渲染器、视觉 QA 脚本及 `docx-preview/jszip` vendor；服务端优先使用发布包内部工具，开发环境才回退到工作区工具。网站 Step04 compile 返回成功但 D 工具、合同回读或截图 QA 缺失时，状态必须为 `external_blocked`，不得把“合同已保存”当作 Word 交付。

### S-004.5 实例唯一性与文档运行时封口（20260804）

同一镜头出现两个以上同类人物时，绑定合同必须为每个实例提供唯一 `instance_id`；同一角色资产可以被多个实例共用，但 B 层只生成一个镜头级参考槽位，并把全部允许实例写入 `allowed_instance_ids`。A 层按 `shot_id + instance_id + role_ref + asset_id` 比对 Step02 卡片，B/C 层按实例寻找参考槽位，禁止用资产名或服装词替代实例身份。没有唯一实例边界时，在 A 层阻断，不进入提示词或 Word。

Step04 D 层启动时必须通过运行时探针选择真实 Python：拒绝 WindowsApps 占位命令和 LibreOffice 自带 Python；候选运行时必须能执行一次无媒体的 `import sys` 探针并返回真实解释器路径。找不到可验证运行时时返回 `external_blocked`，不能用系统别名继续尝试，也不能把 D 层失败归因于 Word 内容。

### S-004.6 提示词最小充分编译与参考素材优先（20260804）

参考素材优先遵循 MiniMax H3 使用手册的三段要求：先声明实际参考素材，再给本段核心创意，最后按时间顺序写可见画面过程。参考图已经锁定的人脸、发型、服装、场景几何、道具材质和静态文字不得在正文重复展开；正文只补场景/环境身份、当前构图、相对上一事件的变化、镜头运动、光线变化、声音和对白。每个完整 `VG` 只输出一段自然叙述式、可直接提交的完整正文；C 层内部可以保留事件 IR，但 Word 的视频提示词区不得显示“事件、构图、声音、参考协同”等生产合同字段或另拆小分镜提示词。

C 层保存完整事件 IR，但同时生成 `prompt_text` 的压缩视图：每条事件保留毫秒区间、主语/受事者、起始状态、变化、结束状态和对白；连续事件中未变化的状态只在第一次出现，重复的对白只保留在其所属事件；对白不能被放到细节或声音字段重复。提示词删除固定套话和抽象形容词只允许精确去重，不得删除证据事实；“电影感、高级、真实、质感好”等词只有被翻译成明确的光线、景深、空间层次、微表情、材质反馈或镜头运动时才保留。

每个完整 `VG` 是独立的视频提交单元：C 层事件 IR、来源表和证据索引继续保留原片绝对毫秒；仅用户可见的生视频 `prompt_text` 必须把该 `VG` 的起点投影为 `0.000秒`，组内所有镜头、动作、对白和镜头运动时间均相对该起点顺序计时。不得把上一组或原片的累计时间泄漏进提示词；跨组的前后镜头只用“开场/片段末端/承接上一镜头”描述，不能伪造本组外的时间码。

### S-027 工作台代理入口与渠道执行收口（20260806）

当念念 AI 一键转绘工作台调用本路由时，网站层不再是 Step04 的平行编译器。`bridge/niannian_redraw_agent.js` 只负责把已验收结构化事实写为 job-local 任务包，并调用 `tools/run_shortdrama_redraw_agent.py`；该代理再按本路由选择最早缺失编号 Step。网站桥接不得重算人物、动作、说话人、资产、台词、本土化或视频 Prompt，不能消费旧 Word、截图、目录扫描或历史 accepted 作为替代输入。

Step04 仍由 Python S-026 唯一编译器产出不可变 A/B/C/D 合同；D 层还必须绑定合同 SHA、合同文件 SHA、policy version、实际 DOCX SHA 和 `docx-preview + Chromium` 截图 QA，才可回写 `step04_word_delivered`。恢复 D 时必须打开合同验证当前 policy 与自身摘要，不能只相信 `harness_state.json` 中的标签。

Step05 的渠道封装只消费 B/C 合同：B 的 `generation_prompt` 与回执 `actual_prompt` 必须逐字一致，所有渠道调用有 job/asset/stage 三重归属。`generic` 阶段、没有 `actual_prompt` 的下载、未绑定最终角色卡的首帧/故事板/视频上传以及旧 `run_current_ar_prevideo_images.py` 均不是合法生产路径。角色资产、场景、道具、首帧和故事板只能从相应阶段化执行器生成、下载、QA 后进入下游；视频生产另按用户实际授权与既有视频 Skill 执行，不因工作台任务包而自动开通。

 编译器必须在每个片段写入 `prompt_compression.raw_chars`、`compressed_chars`、`reduction_chars`、`reduction_ratio` 和 `prompt_policy`，并验证 `compressed_chars <= raw_chars`、参考图声明存在、台词只出现一次、`speaker_instance_id` 未改变。若压缩造成事件、对白、参考槽位或时间码缺失，C 层失败，不能由 D 层补写。Python 编译器和念念 AI bridge 必须输出同构压缩结果；Word 只读取 C 层压缩正文，不自行重建长提示词。

### S-031 说话人闭合与生视频合同机器门（20260807）

本规则由真实失败触发：S035 的条纹西装画面被错误绑定为男主对白，S036 的“保证？”只有 17 毫秒，相邻镜头又重复生成同一句台词；同时提示词混入“一名男子”等泛称并同时要求显示/禁止新增字幕。Step02 `accepted` 不能只代表字段齐全：每条口型对白必须有唯一 `speaker_instance_id`、明确 `visual_speaker_instance_id`（或等价的可见发言人字段）、独立时间范围和声音/口型证据；视觉发言人与对白说话人冲突、缺失或未闭合时，Step02/Step04 失败关闭，Step04 不得猜测或纠正。

Step04 编译前必须运行 `mx-shortdrama-production-harness/scripts/validate_step04_prompt_contract.py`。该门逐组验证 Step02 与 C 层区间一致、对白最小时长、相邻同角色同文本重复、`@` 参考名集合、英文资产 ID、人物泛称和字幕正负策略冲突；任一失败只写结构化 gate report，不生成/更新 Word、首帧、故事板或渠道载荷。当前最小可执行对白时长为 120ms，17ms 一律阻断；重复台词只有在上游提供明确不同事件证据并被单独接受后才可放行。

### S-028 新任务同源 Step01/Step02 生产入口（20260806）

新建念念 AI 转绘任务固定走 `run_step01_step02_agent.py`：job-local 原片与 SHA-256 -> Mimo ASR/音频账本和 TransNet/基础帧 -> 由真实 `shot_list + start/mid/end` 生成 Yunwu 连续视频计划 -> Yunwu 连续视频观察与 Paddle OCR 并发 -> 单一 Step01 汇总清单 -> Terra/GPT 语义事实编译 -> Step02 合成验收。Yunwu 只上传连续 MP4 段；Paddle 只读取当前任务候选帧；Step02 只消费该汇总清单明确回指的三个支线，禁止任意历史路径、旧 Word、旧资产或数组序号映射。

Step02 审计返回 `accepted` 时必须同时输出 `identity_bindings.bindings[]`。每个可见实例都必须由唯一 binding 精确覆盖：`shot_id`、`instance_id`、`asset_id`、纯中文 `@` 显示名和证据 ID 完全一致；字幕人名、服装词或声纹候选均不能替代这一集合合同。集合不闭合时仅返回 `blocked` 和当前镜头证据缺口，Step04 不得再尝试合并、猜测或纠正角色。

### S-029 Step02 到 Step05A 的计划资产编译边界（20260806）

Step02 已验收后先运行 `tools/run_step04_planned_assets.py`，不能直接调用最终 `step04_abcd_compiler.py`。该编译器以当前 job 的 Step02 manifest 与精确 `identity_bindings` 生成不可变计划 B：每项 `generation_prompt` 与 SHA、资产职责、证据、使用镜头和人物母图/角色卡两阶段提示词必须闭合；计划合同只允许 `Step05A` 消费，任何 `planned_not_accepted` 或 `identity_master` 都不得进入最终 B、Word、首帧、故事板或视频。

`asset_production_registry.json` 必须锁定计划时的 job/source、资产集合、资产种类与提示词 SHA，却允许渠道执行阶段将生命周期从 `*_prepared` 推进为 submitted、downloaded、QA、final accepted。重启计划编译时只能验证并复用已推进注册表，不能覆盖回执、路径、SHA、QA 或重试状态。只有 `final_*_accepted` 资产导出到最终 `asset_registry.json` 后，才运行最终 Step04 A/B/C/D；这保持 B 的实际作图提示词与渠道 `actual_prompt` 一致，同时不允许中间母图越级。

### S-030 图片结果先下载后审计（20260806）

Step05A 的视觉 QA 只能发生在当前 job 的图片渠道已经下载原图、写入精确 SHA 和下载回执之后。文件层先验证可解码、16:9、默认 2K；随后视觉层按资产类型审核：角色卡审核多宫格/同脸/年龄/发型/服装/配饰/正侧背表情组/四肢/中文边缘标签与原片演员泄漏，场景审核无人和空间连续，道具审核可复用外观与剧情状态。不能在生成前提交一个预设 QA，也不能用 Word 预览、渠道 HTTP 成功或旧图片代替真实下载图。

视觉 QA 调用是独立的 job 授权；授权或运行时缺失时，保持当前操作的下载结果为 `pending_visual_qa`，恢复时先审核该精确下载图，严禁重新提交同一图片操作。视觉 QA 失败不进入最终 B/Word/首帧/故事板/视频；角色卡仅能依同一母图和渠道自动重做一次，第二次失败则只阻断其依赖组。所有图片实际提交仍逐字使用计划 B 的 `generation_prompt` 与 SHA，视觉 QA 不得改写提示词或资产身份。
## H3 生产渠道选择（S-032，20260807）

当用户要求 RunningHub MiniMax H3 多图生视频时，路由必须先进入用户当前 RunningHub 画布，由画布绑定最终资产并使用用户当前个人/消费级账户执行一次 `Ultra` 任务。环境 API Key 不能替代画布授权；画布任务未成功、结算范围不明或输出 QA 不通过时，不得发布或登记 API。只有画布成功运行、视频质量与结算回执均通过后，才从同一工作流发布 API，并把发布回执和参考图数量纳入渠道注册。

```text
Step04/Step05 最终资产 -> RunningHub 画布授权运行 -> 视频 QA 与结算回读 -> 发布并登记 H3 API
```
