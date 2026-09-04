---
name: ai-video-fundamentals-skill
description: name: ai-video-fundamentals-skill
---

---
name: ai-video-fundamentals-skill
description: AI 视频旧总路由兼容入口与审批门。用于识别五冠军正式链路之外的候选 Skill，并在调用任何下级 Skill 前向用户征询明确批准；不得自动分派或执行下级 Skill。
---

# AI视频基本功

这是 AI 视频的兼容入口和审批门，不再是自动分派器。先读取 `$ai-video-skill-route-index` 的 `references/route-registry.json`：只有 `knowledge-card-skill` -> `screenwriter` -> `chaoge-assets-trial` -> `shotlist-builder` -> `hell-grind` 是正式主链；其余 15 个下级 Skill 必须先获得用户对具体 Skill 的明确批准。

## 路由权限与调用门

1. 主链内的工作按冠军交接契约推进，不把下级 Skill 当作默认步骤。
2. 需要下级 Skill 时，先说明 `Skill 名称`、`本次用途`、`预期交付`，并等待用户明确批准；“继续”“做下去”等泛化指令不等同于批准某一项下级 Skill。
3. 未获批准时，只保留在当前冠军的交付边界内，或给出候选项；不得读取、调用或转交下级 Skill。

## 路由顺序

以下是用户批准相应下级 Skill 后才可使用的旧路由映射，不构成自动选择规则：

1. **来源分类**：从零小说创作、已有小说/大纲、纯文本剧本、已有视频转绘、原创创意、已有成片续接。
2. **交付分类**：可拍剧本、资产图提示词、首帧/故事板、视频提示词、真实生成、生成后诊断。
3. **方法层选择**：本技能负责总门；定稿剧本需要完整前半程导演分析、写实角色和关键道具资产时，优先走用户指定冠军 `chaoge-assets-trial`；从零写小说、续写或审查走 `ai-video-novel-creation-v1`，小说已经存在且要改成短剧走 `ai-video-novel-to-script`；原创新叙事资产先走 `ai-video-asset-prompts`，实际一键资产生产走 `ai-video-asset-production`；剧本镜头规划可叠加 `storyboard-director`。
4. **执行层选择**：Seedance 2.5 视频提示词由冠军 `hell-grind` 的“Seedance 2.5 交付编译”工作段输出；连续镜头/尾帧续接参考 `seedance2-narrative-shot-workflow`；已有视频转绘走 `mx-shortdrama-00-router`；人物资产转绘细节走 `mx-shortdrama-04-character-assets`；故事板资产走 `image2-storyboard-video`；原创无参考资产由 `ai-video-asset-production -> mikoto-gpt-image-2` 执行，参考图/编辑需求在 Mikoto 未提供验证合同前阻断。
5. **质量层选择**：故事/动作/表达审查用 `storyboard-director`；转绘生产与资产生命周期用 `mx-shortdrama-production-harness`；生成后问题用 `mx-shortdrama-production-iteration` 或对应渠道 QA。

## 批准后候选表

| 用户意图 | 主方法 | 必要下游 | 交付边界 |
|---|---|---|---|
| “定稿剧本做导演分析、角色和关键道具” | `chaoge-assets-trial` | 当前可用 Image 2 工具或外部平台提示词 | 用户指定冠军；只到关键道具，场景、分镜和视频生成回到本总路由 |
| “从零写小说/续写/审小说，再做AI视频” | `ai-video-novel-creation-v1` | 定稿后 `ai-video-novel-to-script` | 先完成小说事实、正文和审查，不直接跳资产或视频提示词 |
| “把小说改成短剧” | `ai-video-novel-to-script` | `storyboard-director`（需要镜头审查时） | 先交剧本与镜头事实，不直接跳生视频 |
| “剧本一键做人物/场景/道具图” | `ai-video-asset-prompts` | `ai-video-asset-production` -> `mikoto-gpt-image-2` | 清单、依赖、下载回执、QA、可复用资产引用 |
| “剧本做首帧/分镜板” | `storyboard-director` | `image2-storyboard-video` | 首帧和故事板是不同资产，不混为一谈 |
| “剧本写Seedance 2.5提示词” | `hell-grind` | `seedance2-narrative-shot-workflow`（连续镜头） | 先完成质控，再输出精确计时提示词；兼容入口 `sd2.5skill` 不独立执行 |
| “已有短剧转绘/本土化” | `mx-shortdrama-00-router` | Step01/02/04/05及其Harness | 原片证据是事实源，不能用自由创作替代 |
| “继续上一段视频” | `seedance2-narrative-shot-workflow` | `hell-grind` 或当前渠道 | 必须有已生成成片/尾帧和观察到的末状态 |
| “视频效果不好，重做” | `mx-shortdrama-production-iteration` | 当前执行渠道 | 先诊断最窄失败点，再只改一个变量 |

## 三个生产门

### 故事门

进入镜头或视频提示词前，至少确认：主角与目标、冲突/阻碍、触发事件、因果动作、结尾可见变化、开场钩子和结尾钩子。抽象心理必须转为表情、视线、身体、道具、光线或声音；没有可见变化就先回到剧本改写。

### 资产门

视频提示词需要的身份、空间和关键道具必须先声明资产职责：角色身份/服装状态、场景空间母板、剧情道具状态、首帧或故事板职责。资产图提示词不能把角色、场景、道具合成一张无边界大图；只有 `ai-video-asset-production` 登记为 `accepted` 的原图资产才可作为视频参考。

### 视频门

视频提示词必须明确输入模式（T2V/I2V/V2V/R2V/首尾帧/续接）、每个参考的职责、一个主动作及其终点、镜头与光线动机、对白/声音规则、文字控制和负面约束。连续片段先记录已发生状态、当前状态、不可改变锁和本段只允许发生的变化。

## 统一交接字段

不同子技能之间至少传递以下事实，不要求用户看到内部字段：

```text
project_scope：项目/集/场/镜头组
source_type：novel | script | redraw_video | original_idea | accepted_clip
deliverable：screenplay | asset_prompts | first_frame | storyboard | video_prompt | qa
characters：角色身份、年龄、辨识锚点、服装状态、声音状态
world：地点、时间、空间地标、光线方向、文化语境
props：道具外观、材质、文字、当前状态、允许变化
beats：触发 -> 动作 -> 结果 -> 反应，带时间顺序
continuity_locks：脸、发型、服装、空间轴线、道具、光线、末帧
reference_roles：每个@素材参考什么、不参考什么
next_gate：下一步最早需要通过的质量门
asset_manifest：asset_id、依赖、状态、参考职责、精确文件路径/SHA、下载回执和QA
```

## 关键原则

- 先事实后形容词；“电影感、明星感、真实”必须落成可见的脸、皮肤、材质、机位、光源、动作和声音。
- 先正向画面，再用一段聚焦的 `负面约束`；不堆无关禁止词。
- 提示词和真实生成是两件事。没有用户授权、当前渠道、成本和参考确认时，只交付提示词，不提交 Provider。
- 不把内部审查标签、证据ID、资产ID、历史路径塞进最终模型提示词；它们只用于交接和QA。
- 已有视频续接必须以实际成片末状态为准，不能用计划中的“应该结束状态”冒充。

## 输出契约

普通用户只需要结果时，先给：`路由`、`当前交付`、`下一步`。复杂项目再给完整路由包：来源判断、已通过的门、主方法、下游技能、资产/镜头/视频提示词清单、未验证项。用户要求“完整提示词”时，直接输出可复制正文，不额外塞入内部分析模板。

## 禁止越权

- 不用兼容入口 `sd2.5skill` 代替 `hell-grind`、小说改编、角色资产图或转绘证据分析。
- 不用 `ai-video-novel-creation-v1` 重新创作用户已定稿、只待短剧改编的小说，也不用它处理已有视频转绘。
- 不把 `prepared`、渠道URL、母图、故事板截图或旧同名文件当作已验收资产；视频参考只消费当前项目的 `accepted` 资产。
- 不用 `mx-shortdrama-00-router` 处理没有原片证据的原创小说，除非用户明确提供了转绘源视频。
- 不让 `chaoge-assets-trial` 接管其体验范围之外的场景、分镜、视频提示词或真实视频生成；这些请求返回本总路由继续分派。
- 不用故事板截图冒充最终角色卡或场景母板。
- 不因某个渠道成功返回HTTP状态就宣布资产或视频通过；必须有文件、视觉和连续性QA。
