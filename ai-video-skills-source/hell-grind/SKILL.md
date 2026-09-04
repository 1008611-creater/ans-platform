---
name: hell-grind
description: name: hell-grind
---

---
name: hell-grind
description: AI 短剧五冠军的提示质控与视频交付节点。已有 shotlist、资产和连续性事实，需要把表演微动作、镜头运动、空间物理与声音转为可靠图像/视频提示词，或诊断提示词和连续性问题时使用；目标为 Seedance 2.5 时，负责精确时间轴、多模态参考与最终交付编译；输出最终提示词与 continuity_ledger，不调用生成渠道。
---

# Hell Grind 导演参考

## 统一交接

开始前必须读取 `C:/Users/lsb/.codex/skills/ai-video-champion-handoff/SKILL.md`。输入必须包含 `project_state`、`shotlist`、`asset_manifest` 和 `continuity_ledger`；输出最终图像/视频提示词和更新后的连续性台账。它只编译提示和做质量审计，不直接调用图像/视频供应商，也不把候选结果写成 `accepted_clip`。

This is a reference and method skill derived from the user-provided Hell Grind bundle and the public Higgsfield Studio project:

https://higgsfield.ai/@higgsfield.studio/projects/hell-grind

Read only the reference that matches the current task:

- `references/cinedance-seedance-director.md`: Seedance 2.0 scene diagnosis, spatial blocking, camera, continuity, physics, audio, and prompt QA.
- `references/acting-system.md`: objective, obstacle, tactics, beats, subtext, listening, body, and proxemics for AI video performance.
- `references/lira-image-prompts.md`: image-generation and image-edit prompt construction for characters, locations, props, and frame repair.
- `references/seedance-2-5-delivery.md`: Seedance 2.5 精确计时、多人 30 秒、延长段、超长模式、多模态参考与交付质量门；只在目标渠道为 Seedance 2.5 时读取。

## Seedance 2.5 交付编译

`sd2.5skill` 的全部生产能力归入本工作段，不再作为独立提示词链。先完成表演、空间物理、镜头和连续性质控；仅当这些事实成立且目标渠道明确为 Seedance 2.5 时，读取 `references/seedance-2-5-delivery.md`，把已审计的镜头编译为时间戳提示词。

- 已确认资产可输出正式视频提示词；候选资产只能输出标明“预演”的提示词，不能被升级为 `asset_manifest`、`continuity_ledger` 或下游事实。
- 在单段、延长段、超长模式和 30 秒多人试镜之间，按实际时长测算和可见动作选择；不得为凑时长添加空镜、台词或动作。
- 每个 `@图片/@视频/@音频/@音效` 都要声明唯一职责和不继承项；交付同时给多模态版与纯文字版，除非用户明确只要其中一种。
- 只要审计发现缺少镜头、资产、连续性或成本授权，就停在最早缺口；本工作段不提交外部渠道。

## 使用方式

- 官方项目页是公开事实的权威来源。
- 用该项目作为长篇 AI 电影组织、视觉一致性、镜头语言、提示词结构和项目资产呈现的参考基准。
- 将表演参考与分镜表构建器结合：把表演节拍转化为每个镜头提示中的可见动作、反应和空间变化。
- 将图像提示词参考与角色、场景、道具资产工作结合：先生成或修复静帧参考，再请求视频提示词。
- CINEDANCE 只是提示词导演方法，不能保证供应商完全遵守每条指令。
- 区分事实与假设；为可复用规则记录来源网址和具体项目页或用户提供的导出文件。
- 用户已授权访问时，优先使用其截图、画布导出、提示词文件和资产包。
- 所有图像和视频生成最终都通过念念画布任务提交；本 Skill 只负责提示词编译、连续性锁定和质量审计，不直接打开外部生成平台。

## 边界

- This skill does not generate or download private Canvas data.
- The public page is not a provider executor, video generator, editor, audio mixer, or publishing pipeline.
- Do not claim that prompts, source assets, or editable Canvas graphs are locally available unless the user supplies an export or the page exposes them publicly.
- Do not copy third-party assets or prompts into a production package without confirming their license and intended use.

## 交付内容

默认交付最终图像/视频提示词、锁定后的 `continuity_ledger`、最早失败变量和下一门。用户要求 Seedance 2.5 时，交付该渠道的时间测算、时间戳、多模态版与纯文字版提示词；研究记录只在用户明确要求资料审计时单独输出。
