# Prompt Contracts

Use these contracts when writing final prompts after selecting the route.

## Shared Prompt Rules

- Write positive concrete description first; place all negative constraints in the final block.
- Translate abstract quality words into visible variables:
  - `真实`: natural skin texture, imperfect hairline, practical wardrobe fit, believable room wear, camera/lens/light choices.
  - `明星感`: symmetrical face structure, expressive eyes, groomed hair, controlled pose, clean styling, confident screen presence.
  - `高级`: restrained palette, high-quality fabric/materials, intentional light, uncluttered composition, precise silhouette.
  - `本土化`: local ethnicity range, environment, props, signage policy, clothing norms, work context, and cultural avoidance rules.
- Avoid celebrity comparisons as the core instruction. If a user references a celebrity or sample image, convert it into visible features.
- Do not bury the task under negative phrases. Use 5-10 targeted failure controls based on the current model and prior failures.
- For readable text inside generated images, default to no text or minimal large labels. Use local overlay for exact Chinese/Spanish/English copy.

## Image2 Realistic Photo Contract

```text
【资产用途】
【主体】
【场景身份】
【可见细节】
【构图】
【摄影机/镜头】
【光线】
【材质与触感】
【可信瑕疵】
【文字策略】
【画幅】
【负面约束】
【后期/本地处理】
```

Default text policy:
`不要生成可读长文字、表格、品牌 logo、聊天截图、银行记录、法律文件或密集 UI。需要精确文字时，画面留干净区域给后期本地叠字。`

QA checklist:
- The asset type is immediately recognizable.
- The most important subject is not ambiguous.
- The image can pass without reading generated text.
- The prompt does not rely on one broad adjective such as "realistic" or "cinematic".
- Negative constraints target actual failure modes.

## Realistic Character Board Contract

Use for movie/short-drama leads, supporting roles, character references, actor-look development, and reusable character assets.

### Default Asset Type And Regression Guard

The default for a reusable narrative-character authority is `character_board_full_set`, not a vertical medium-shot portrait. The board must be one coherent 16:9 horizontal visual dossier: a full-body lead view plus face/three-quarter/profile and expression/wardrobe evidence that all describe the same person. It may use clean photographic spatial grouping, but must not look like a UI dashboard, comic strip, fashion collage, contact sheet, or poster.

`shot_specific_identity_plate` is a separate, lower-scope asset for a particular first-frame/shot composition. It can supplement a confirmed character board, but may not replace it. If a job unexpectedly changes from a complete set to a vertical half-body or three-quarter single image, record `character_board_scope_regression`, restore the full-set prompt, and block downstream reference confirmation until a new candidate is reviewed.

Realism must be evidenced, not asserted. Do not use smoothing instructions such as `smooth shading`, `minimal texture`, blanket denoising, or "perfect skin" for human character boards. Require believable skin variation, flyaway hair and hairline irregularity, garment tension/folds, restrained grooming, and motivated light with direction, contrast ratio, and color temperature.

```text
【资产用途】
16:9 横版影视人物全套设定板/角色参考图，用于后续短剧资产与视频保持角色一致；这不是单张半身肖像，也不是海报。

【角色身份】
姓名、年龄段、职业、阶层、剧情功能、所在国家/地区。不要只写"男主/女主"。

【外貌结构】
肤色、脸型、颧骨/下颌/鼻梁/眉眼/唇形、发型发色、身材比例、年龄质感、皮肤质感。用可见描述，不写"像某明星"。

【气质与表演】
眼神、表情强度、站姿/坐姿、手部动作、情绪克制程度、角色关系感。

【服装与道具】
服装剪裁、材质、颜色、配饰、职业道具、身份道具。道具数量少而准确。

【版式结构】
一个统一、干净的横版角色设定场景：左侧为全身三分之四站姿，脚部可见，确认身材比例、完整服装和自然双手；中间为胸像三分之四角度，确认五官、发型与克制的基础表情；右侧为自然侧脸和一个低强度情绪变化，确认轮廓、耳饰/眼镜等配饰稳定。所有观察位来自同一人物、同一服装状态、同一光线逻辑。可在底部保留少量服装材质或身份道具近景，不生成文字标签、边框、分格线或拼贴 UI。

【摄影与质感】
50mm 左右的平视摄影机，高度接近人物眼线；柔和主光写清来源、方向、约 1:2 至 1:3 的亮暗关系和中性偏暖色温，暗部保留层次。皮肤保留细小毛孔、轻微肤色不均和真实高光，不磨皮；发际线和碎发自然；衣料有符合站姿的张力、褶皱和材质反射。电影级但不塑料、不影楼广告化。

【文字策略】
默认无文字或极少大标签。用户需要中文解释时，优先后期本地叠字；若必须生成，限制为少量大字并接受失败风险。

【画幅】
16:9 或用户指定比例，写清横版/竖版/方图。

【负面约束】
集中列出：非目标族裔、中文/英文/乱码文字、第二个人、背影、前景肩膀、多余肢体、塑料皮肤、过度网红脸、过度磨皮、低清、错职业道具等。
```

Character-board QA:
- The image is a full, horizontally framed identity set, not a vertical three-quarter or half-body substitute.
- The lead image is attractive enough for a drama protagonist without looking like a fashion ad extra.
- Face, hair, clothing, and prop choices are stable enough to reuse.
- No accidental ethnicity drift or forbidden cultural element.
- No extra person, back view, cropped shoulder, or random foreground body part when a solo board is requested.
- If generated text appears, it must satisfy the run's text/localization policy.
- Skin, hair, garment folds, hands, and light behavior read as a photographed person, not a smoothed beauty render.

## Xiaohongshu Image Note Contract

```text
Audience:
One conflict / mistake:
One action:
Image 1 visible text:
Image 2 visible text:
Image 3 visible text:
Background prompt:
Overlay method:
Quality gate:
```

Default overlay method:
Use local HTML/CSS or compositing for all Chinese text. Image2 should produce clean backgrounds or visual anchors only.

## AI Video Prompt Contract

```text
【视频类型】
【失败关键变量】
【角色/道具/场景锚点】
【基础设定】
【画面锚点与连接】
【动作与时间调度】
【镜头运动】
【光线与质感】
【声音】
【负面约束】
【重抽诊断标准】
```

Video prompt rules:
- Anchor identity and scene before motion.
- Describe motion as visible changes over time, not vague mood.
- Keep camera movement physically plausible.
- Use sound only when the target workflow accepts it; otherwise put sound notes outside the model prompt.
- For storyboard-to-video tasks, follow the dedicated storyboard skill's format before using this generic contract.

## Script-Only Narrative Video Contract

Use after script-only N01-N03 are accepted. This contract does not invent source-video evidence.

```text
【上传参考图职责】
- 逐张写明 ref_key、资产类型和唯一职责：角色身份/服装、场景空间、关键道具、首帧机位与构图。
- 写清不负责什么，避免人物图改机位、场景图改人物、首帧图覆盖身份。
- 未确认路径与 SHA 的参考图标为候选，不得写成可上传权威图。

【视频提示词正文】
【基础设定】
时长、画幅、人物、地点、当前剧情拍点、表演克制度；只写当前镜头需要的事实。

【画面锚点与连接】
起始画面中心、人物相对位置、朝向、手部和关键道具状态；承接上一镜的进入状态，并写本镜结束后的可剪辑连接状态。

【动作与时间调度】
一个主要动作；按时间顺序写身体路径与重心变化、头发/服装/道具的跟随反应、眼神/呼吸/手指等微反应、环境或光线变化。短镜头不堆叠多个高潮动作。

【镜头运动】
镜头角度 + 景别 + 焦段行为 + 前中后景关系 + 单一运镜 + 戏剧目的。运镜必须与主体动作和空间方向一致。

【光线与质感】
明确现实光源、方向、主要照亮对象、亮暗比例、暗部保留、补光/眼神光和情绪作用；材质与皮肤保持真实，不用抽象“高级感”代替。

【声音】
环境声和关键动作声；对白按说话人绑定。声音表演写年龄感、声线、语速、情绪底色、气息/停顿、重音和句尾，多句按时间推进情绪。

【负面约束】
仅列当前镜头的 5-10 个高风险失败：身份漂移、服装漂移、站位/朝向错误、手部或道具关系错误、身体平移、附属物僵硬、背景抖动、无依据文字、错误字幕等。
```

Script-only narrative QA:
- Every model-visible fact traces to canon, accepted designed shot facts, or confirmed asset duties.
- One short shot has one primary action with an observable start, change, and end state.
- Hair, clothing, props, light, environment, and sound react consistently with the body action.
- Camera angle is paired with scale, lens behavior, spatial layers, and a dramatic reason.
- Light has a motivated source and preserves intentional shadow detail.
- Dialogue belongs to the correct speaker; voice structure and punctuation support the intended progression.
- The final state creates a deliberate cut/overlap handoff; a still frame is not treated as motion evidence.
- Prompt structure PASS does not authorize reference upload or provider submission.

## Marketing Copy Contract

```text
Audience:
Current pain:
Desired outcome:
Offer:
Proof:
Objection:
Primary action:
Voice:
Draft:
Anti-slop pass:
```

## Route Decision Contract

```text
User asks for:
Domain:
Risk:
Selected route:
Skipped skills:
Reason:
Minimum evidence needed:
Output artifact:
Quality gate:
```

## Frontend Ideal Image Concept Contract

Use for Image2/RH concept images of websites, apps, product UI, dashboards, and visual references before real frontend coding. This is not the same as implementing the frontend.

```text
【产品定位】
这个网页/应用解决什么真实工作流，给谁用，用户为什么会频繁打开它。

【审美路线】
选择一个具体路线，不写泛泛的“高级感”：{生产驾驶舱 / 视觉操作系统 / 编辑台 / 影棚中控 / 批量验收墙 / 提示词引擎 / 其他明确路线}。

【记忆点】
画面中最值得截图的一件事：{大画布流水线 / 节点路由 / 成片墙 / 对比工作台 / 版本时间线 / 任务队列 / 诊断面板}。

【核心工作流】
用 3-5 个真实步骤表达用户从输入到产出的路径。每一步必须对应一个可见区域或交互，不要只写装饰性模块。

【信息结构】
主工作区、辅助栏、状态区、批量动作区如何分布。图片/内容预览必须占据视觉中心。

【视觉语言】
字体气质、空间密度、色彩策略、光影/材质、图标和按钮风格。说明为什么这套视觉属于本产品。

【小白友好】
只暴露一个主行动作；复杂参数隐藏为系统自动判断、智能建议、版本记忆或失败诊断。

【生成约束】
16:9 桌面端真实产品截图感；不要营销页；不要普通后台；不要模板化 SaaS 卡片；不要紫蓝 AI 渐变；不要无意义数据图表；不要密集长文本；不要卡通插画；不要水印。
```

Aesthetic gate:
- Squint test: 眯眼看仍然能识别独特工作流，不只是普通 dashboard。
- Screenshot test: 至少一个区域值得单独截图当产品记忆点。
- Workflow test: 用户能看懂下一步做什么。
- Domain fit test: 界面里的模块来自这个产品的真实工作流，不是通用 KPI/统计卡片。
- Anti-slop test: 没有默认侧栏 + 大卡片 + 蓝紫渐变 + 假数据图表的组合。

## Display Image Two-Reference Contract 展示面图

Use for male/female profile display images, social lifestyle photos, and customer-person replacement into template photos.

Core rule: use a base prompt template with slots. Do not build the default prompt by stacking long negative constraints.

```text
把参考图B中的目标人物替换成参考图A里的客户本人，生成一张自然真实、好看上镜的展示面照片。

参考图A只负责人物身份：{客户身份锚点}。
参考图B只负责模板画面：{模板画面锚点}。

保留参考图B的构图、姿势、服装、场景、镜头距离、画幅和照片质感。
人物面部使用参考图A的脸部结构和发型方向，只做{轻微优化幅度}的自然上镜优化，仍然像客户本人。

本图重点修正：{本图审美主修}。
成片感觉：{性别与风格变量}，真实生活照片，不像影楼写真、AI海报或过度精修照。

避免：{避免项1}；{避免项2}；{避免项3}。
```

Slot rules:
- `{客户身份锚点}`: 4-6 个身份锚点，优先脸型、下颌线、眼型、鼻梁、鼻头、唇厚、肤色、年龄感、发型方向。不要写一大段泛泛的“高相似度”。
- `{模板画面锚点}`: 用一句话概括模板的场景、姿势、服装、构图、镜头距离、光线、画幅和照片质感。模板原人物不是身份参考。
- `{轻微优化幅度}`: 男生通常写“轻微变帅但保持本人”，女生通常写“轻微变美但保持本人”。优化幅度小，不能换成陌生网红脸。
- `{本图审美主修}`: 只选 1-2 个真实问题，必须来自当前模板，例如脸部欠曝、俯拍压脸、肩颈塌、头身比例短、表情僵、互动不自然、侧光压五官。
- `{避免项}`: 最多三条，针对当前模板失败风险。不要把所有历史失败点都塞进去。

QA checklist:
- 身份：输出人物明显像参考图A，而不是模板原人物。
- 模板：姿势、衣服、场景、构图、画幅和照片质感接近参考图B。
- 审美：脸部受光干净，角度自然，肩颈和头身比例上镜。
- Prompt：每张模板有自己的 `{本图审美主修}`；不同模板不应生成完全相同 prompt。
- 约束：避免项不超过三条，默认不使用长篇负面约束。
