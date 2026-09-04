---
name: ai-video-novel-creation-v1
description: 小说创作总控 Skill 的 AI 视频路由部署版 v1，完整保留来源 v5.5 总控正文。用于从零创建小说、生成或修改大纲、写单章或场景、续写、修订、红队审查、去 AI 味润色、状态维护、里程碑审查和整书完本审查；小说定稿后再由 ai-video-novel-to-script 接入 AI 短剧改编。
---

# 小说创作总控 Skill \| v5.5

> **核心原则**：好小说 = 情感核心 × 逻辑严谨 × 专业真实 × 主角主动 × 读者体验 **架构升级**：canon.json 统一事实源 + 自动校验脚本 + Author/Critic 分离 + 5步写章流程 + 概念层打底 + 责编视角审稿 + 毒点检测 + 里程碑审查

> **v5.5 关键改进（里程碑审查体系）**：
>
> -   新增 `workflows/milestone-review.md` 里程碑审查工作流（每3-5章强制执行）
> -   8大跨章模式检测：巧合密度/战力曲线/反派智商/情感进度/信息释放/模式重复/配角工具化/设定一致性
> -   大纲审查升级为强制门禁（BLOCK/FAIL 不许动笔），新增八大模式检测
> -   单章 CRITIQUE 新增第14维：跨章模式预警（烟感报警器，发现苗头就提醒）
> -   三道闸门体系：大纲门禁 → 里程碑审查 → 完本审查

------------------------------------------------------------------------

## 任务路由

收到任务后，先判断模式：

| 模式                       | 任务描述                                                 | 需要读取的模块                                                                                 |
|----------------------------|----------------------------------------------------------|------------------------------------------------------------------------------------------------|
| **A. 新建小说项目**        | 从零开始创建新小说（**先建框架→自动审核→通过后写正文**） | `workflows/create-project.md` + `rules/policy-registry.yaml` + `scripts/validate_framework.py` |
| **B. 生成或修改大纲**      | 创建章节大纲或调整现有大纲                               | `workflows/outline.md` + `core/logic-controller.md`                                            |
| **C. 写单章或单场景**      | 5步流程：PLAN→VALIDATE→WRITE→CRITIQUE→COMMIT             | `workflows/write-chapter.md` + `rules/policy-registry.yaml` + `scripts/`下的校验脚本           |
| **D. 续写已有小说**        | 继续已有小说的下一章                                     | `workflows/write-chapter.md` + `core/state-management.md` + `rules/policy-registry.yaml`       |
| **E. 修改问题章节**        | 修复已写章节的问题                                       | `workflows/revise.md` + `core/red-team-review.md` + `rules/policy-registry.yaml`               |
| **F. 红队逻辑审查**        | 对已完成内容进行审查                                     | `workflows/audit.md` + `rules/policy-registry.yaml` + `scripts/`下的校验脚本                   |
| **G. 文笔与去AI味润色**    | 优化文笔、去除AI痕迹                                     | 读取去AI味知识卡（确认P0/P1为零后）                                                            |
| **H. 更新小说状态文件**    | 维护 `canon.json` 与 `events.jsonl`                      | `core/state-management.md` + `rules/policy-registry.yaml`                                      |
| **I. 里程碑审查**          | 每3-5章强制执行，检测跨章模式问题                        | `workflows/milestone-review.md` + `core/red-team-review.md`                                    |
| **J. 文笔/画面感增强润色** | 只润色文笔、增强画面感、去AI味（不动剧情/硬事实）        | `workflows/enhance-description.md` + 去AI味知识卡                                              |
| **K. 整书完本审查**        | 三道闸门最后一关（大纲→里程碑→完本），做全本最终质量判定 | `workflows/audit-novel.md` + `workflows/milestone-review.md` + `core/toxic-points.md`          |

**路由规则：**

1.  先识别任务类型（A-K）
2.  读取对应的 workflow 文件
3.  根据 workflow 指引读取 core 模块和 templates
4.  旧版/备用流程（new-project.md / continue-novel.md / revise-chapter.md）默认不自动调用，仅作兼容参考

------------------------------------------------------------------------

## 最高优先级硬规则（v5）

以下规则在任何模式下都必须遵守，违反任何一条立即停止：

1.  **不得新增未登记的关键证据** — 所有关键证据必须登记在 `canon.json.evidence`
2.  **人物不得知道未获得的信息** — 严格遵守 `canon.json.knowledge` 中的信息边界
3.  **物件移动必须有交接过程** — 物件位置变化必须更新 `canon.json.objects`，并在 `events.jsonl` 追加事件
4.  **时间必须连续** — 时间线只能向后推进，不能倒退
5.  **能力规则不得漂移** — 超自然能力必须遵守 `canon.json.facts` / `canon.json.project` 中已登记设定
6.  **必要条件不满足时停止写作** — 写作门禁检查未通过不能进入正文
7.  **P0/P1 未解决前禁止续写** — 致命硬伤和重大可信度错误必须先修复
8.  **状态文件优先于AI记忆** — 以 `canon.json` 与 `events.jsonl` 为准，不依赖上下文记忆
9.  **信息不足时标注需要补充设定** — 不要凭空编造关键信息
10. **写完章节必须更新状态差量** — 更新 `canon.json`，并在 `events.jsonl` 记录本章新增、修改、待确认事项
11. **新建小说必须先创建项目骨架** — 禁止直接写正文，必须先完成 `goals.md`、`canon.json`、`events.jsonl`、`truth-bible.md`、`outline.md`
12. **简介契约必须兑现** — 简介承诺的核心设定、冲突、主角处境必须在正文中实现（v4.1 新增）
13. **证据必须碎片化获取** — 禁止"反派证据大礼包"，证据需要拼接且有获取代价（v4.1 新增）
14. **行为必须有代价** — 主角违法/执念行为必须承担真实且不可逆的后果（v4.1 新增）
15. **反派行动必须有触发事件** — 必须解释"为什么现在行动"，禁止"突然发疯"（v4.1 新增）
16. **信息释放必须有节奏** — 禁止前紧后松，必须有错误答案和中段反转（v4.1 新增）
17. **配角必须有独立目标** — 配角不是工具人，必须有独立动机和立场（v4.1 新增）
18. **程序正义必须遵守** — 警方行动、证据获取必须符合现实程序（v4.1 新增）
19. **主角必须有弧光** — 开篇和结尾必须有内在变化，变化有代价且不可逆（v4.1 新增）
20. **必须去AI味** — 禁止重复模式、同质化情绪、审讯式对话（v4.1 新增）
21. **胜利必须有节奏** — 前十章只能是"第一次胜利"，每章胜利必须有对应代价，禁止"一章完成三十章高潮"（v4.4 新增）
22. **主角必须主动** — 主角必须亲自发现线索、设局获取证据、做出决策，不能全靠他人告知或送上（v4.4 新增）
23. **反派不能降智** — 反派必须表现专业能力，会吸取教训改变策略，留下"合理"破绽而非"愚蠢"破绽（v4.4 新增）
24. **数字必须一致** — 股权比例、金额、时间线必须全文统一，不同文件中的数字必须一致（v4.4 新增）
25. **商业必须合理** — 赔偿金额必须有依据，商业操作必须符合现实，公司估值必须合理（v4.4 新增）
26. **证据台账必须同步** — 每章写完后必须同步更新 `canon.json.evidence`，记录证据来源、状态、流转（v4.4 新增）
27. **硬事实必须统一** — 年龄、日期、金额、孕周、股权等硬事实必须在 `canon.json.facts` 或对应结构化字段中登记（v4.5 新增）
28. **资金流必须闭环** — 每笔资金需记录来源与去向，确保期初+流入-流出=期末，禁止重复计算（v4.5 新增）
29. **情绪必须追踪** — 女频小说需在 `canon.json.project_progress` 或 `canon.json.facts` 中记录主角情绪变化、失去与夺回清单（v4.5 新增）
30. **变更必须记录** — 修改任何硬事实必须在 `events.jsonl` 记录原设定、新设定及影响范围（v4.5 新增）
31. **情感核心优先** — 每部小说必须定义主角的恐惧/不敢面对的真相/需学习的功课，正文必须推动主角情感成长（v5.0 新增）
32. **主角主动推进** — 关键推进的60%以上必须来自主角主动行动，偶然获得不超过15%，死者遗留物不得一次解释完整真相（v5.0 新增）
33. **结局不完美** — 结局应有不完美元素，主角赢了案件但情感上有损失，有余味而非全解决（v5.0 新增）
34. **写章必须输出工作流痕迹** — 每步必须输出标记（<!-- STEP: PLAN --> 等），禁止跳过任何步骤（v5.1 新增）
35. **写章必须更新状态** — 写完后 canon.json.project\_progress.current\_chapter 必须更新，events.jsonl 必须新增记录（v5.1 新增）
36. **Step 2 VALIDATE 必须运行校验脚本** — 禁止用"读取文件"替代运行脚本。每章必须运行 validate\_workflow\_execution.py，每5章运行 validate\_framework.py（v5.1 新增）
37. **Step 3 必须执行风格采样** — 写正文前必须读取最近3章，提取句式/用词/节奏特征并注入写作约束（v5.1 新增）
38. **大纲强制对齐** — 写章节时必须读取 outline.md，本章目标/信息释放/情感目标必须与大纲对应章节方向一致，不得完全偏离（v5.2 新增）
39. **信息释放节奏控制** — 不得提前释放大纲中明确安排在后续章节的核心信息（如陨落真相、人物真实身份等）（v5.2 新增）
40. **CRITIQUE 必须检查大纲对齐度** — 红队审查第10维度：大纲对齐度，偏离>50%判FAIL（v5.2 新增）
41. **概念层打底（强制）** — PLAN步骤必须读取叙事结构理论、情感-行动循环理论、人物缺点驱动原理三张概念卡，作为写作底层指导原则（v5.3 新增）
42. **CRITIQUE 必须检查概念对齐度** — 红队审查第11维度：概念对齐度，检查情感-行动循环完整性、人物缺点驱动参与度、叙事结构清晰度（v5.3 新增）
43. **上下文加载仪式（强制）** — PLAN步骤前必须逐项加载7项上下文（goals/canon/关系网/前2章/大纲/概念层/角色深度档案），禁止跳过任何一项（v5.4 新增）
44. **读者情绪目标（强制）** — 每章必须定义 reader\_emotion\_curve（开头/中段/结尾分别要让读者产生什么情绪），从读者视角倒推写作目标（v5.4 新增）
45. **CRITIQUE 必须有责编视角** — 红队审查第12维度：责编视角五维评分（钩子强度/节奏把控/角色魅力/信息密度/期待感），从读者/编辑视角评价"好不好看"（v5.4 新增）
46. **CRITIQUE 必须有毒点检测** — 红队审查第13维度：毒点检测，对照 core/toxic-points.md 检查剧毒/中毒/轻毒，发现剧毒即 FAIL（v5.4 新增）
47. **大纲审查是强制门禁** — 写正文前必须通过大纲审查，BLOCK/FAIL 级问题不许动笔（v5.5 新增）
48. **每3-5章必须做里程碑审查** — 专门检测跨章模式问题（巧合密度/战力膨胀/反派降智/情感过快等），不能等到完本才发现（v5.5 新增）
49. **单章审查必须做跨章模式预警** — CRITIQUE 第14维：跨章模式预警，发现连续苗头即 WARN，提醒里程碑审查重点关注（v5.5 新增）
50. **巧合密度必须控制** — 关键巧合数 / 章节数 不得超过 0.5，超过 1.0 直接 FAIL（v5.5 新增）

------------------------------------------------------------------------

## 模块调用规则

### 按任务类型调用

**新建项目：**

    读取：workflows/create-project.md + rules/policy-registry.yaml
    执行：高概念 → 情感核心 → 简介契约 → 真相底稿 → 初始化canon.json → 大纲生成
    输出：goals.md, canon.json, events.jsonl, truth-bible.md, outline.md

**写单章：**

    读取：workflows/write-chapter.md + goals.md + canon.json + rules/policy-registry.yaml
    执行：PLAN(章节计划) → VALIDATE(自动校验) → WRITE(正文) → CRITIQUE(独立审查) → COMMIT(更新状态)
    输出：章节正文 + 状态更新摘要

**红队审查：**

    读取：workflows/audit.md + core/red-team-review.md + rules/policy-registry.yaml
    执行：确定审查范围 → 读取canon.json/events.jsonl/章节正文 → 运行校验脚本 → 生成审查报告
    输出：red-team-report.md

**里程碑审查：**

    读取：workflows/milestone-review.md + canon.json + goals.md + outline.md + 最近3-5章正文
    执行：准备阶段 → 八维跨章模式检测 → 综合判定 → 输出报告 → 修复跟进
    输出：reports/milestone-review-00N.md

**续写小说：**

    读取：workflows/write-chapter.md + core/state-management.md
    执行：读取canon.json/goals.md/events.jsonl → 确认续写起点 → 执行写章节工作流
    输出：新章节正文 + canon.json/events.jsonl 更新摘要

### 按小说类型调用

根据小说类型读取对应的 genres 模块：

| 类型         | 读取文件                           |
|--------------|------------------------------------|
| 悬疑/推理    | `genres/suspense.md`               |
| 言情/情感    | `genres/romance.md`                |
| 玄幻/修仙    | `genres/fantasy.md`                |
| 都市/职场    | `genres/urban.md`                  |
| 古言/历史    | `genres/historical.md`             |
| **女频短篇** | `genres/female-frequency-short.md` |

**女频短篇特殊说明**：

-   包含 131 条从 58 篇女频短篇蒸馏的叙事模式规则
-   按 9 阶段叙事流程组织（开篇钩子 → 人物处境 → 关系冲突 → 情绪压迫 → 信息延迟 → 冲突升级 → 女主觉醒 → 反转释放 → 结尾回收）
-   使用统一检索入口按需调用：`_Dev\knowledge_query.py "女频短篇 {阶段名}" --limit 5 --json`

### 知识卡调用规则

**不要每次全部读取 related\_cards，改成按模式调用：**

**新建项目：**

-   读取：高概念设计、提纲骨架、人物塑造、冲突悬念

**写单章：**

-   读取：小事件链、对白三差异、场景烟火气、当前类型知识卡

**红队审查：**

-   读取：悬疑公平性、去AI味、职业或专业知识、当前问题相关卡

**文笔润色：**

-   读取：去AI味、人物语言、场景描写、叙事风格

**调用流程：**

    Step 1: 识别任务类型和小说类型
    Step 2: 知识卡检索 → _Dev\knowledge_query.py "小说写作 {类型} {关键词}" --limit 10 --json
    Step 3: 读取检索包 → 优先使用 content/artifacts，related_artifacts 只作补充
    Step 4: 注入可调用内容 → 基于知识卡的具体规则执行任务

**禁止跳过知识卡检索直接生成内容。**

------------------------------------------------------------------------

## 停止条件

遇到以下情况立即停止，不要继续：

1.  **写作门禁检查未通过** — 任何一项"不通过"都不能进入正文
2.  **发现P0/P1问题** — 致命硬伤和重大可信度错误必须先修复
3.  **状态文件缺失** — 续写时缺少 `canon.json`、`events.jsonl` 或 `goals.md`
4.  **信息边界冲突** — 人物知道了不该知道的信息
5.  **时间线矛盾** — 时间倒退或日期计算错误
6.  **能力规则漂移** — 超自然能力违反设定

------------------------------------------------------------------------

## 输出规范

### 每章必须输出

1.  **章节正文** — 符合场景合同的正文内容
2.  **章节状态差量** — 更新 `canon.json` 中受影响字段
3.  **事件溯源记录** — 在 `events.jsonl` 追加本章事件
4.  **单章红队检查** — 简要审查报告

### 审查必须输出

1.  **审查报告** — 使用 `templates/red-team-report.md`
2.  **问题清单** — P0/P1/P2/P3 分级
3.  **修复建议** — 针对每个问题的修复方案
4.  **修复验证清单** — 修复后的验证步骤

### 新建项目必须输出

1.  **真相底稿** — 使用 `templates/truth-bible.md`
2.  **项目目标** — 使用 `goals.md`
3.  **统一事实源** — 使用 `canon.json`
4.  **事件日志** — 使用 `events.jsonl`
5.  **大纲** — 使用 `outline.md`

------------------------------------------------------------------------

## 目录结构

    novel-writing/
    ├── SKILL.md                    # 本文件（总控路由器）
    ├── README.md                   # 使用说明
    │
    ├── core/                       # 核心模块
    │   ├── logic-controller.md     # 逻辑控制器（时间/物件/能力/知识边界）
    │   ├── red-team-review.md      # 红队审查系统（P0-P3分级）
    │   ├── state-management.md     # 状态管理（跨会话状态保存）
    │   └── writing-gates.md        # 写作门禁（写前检查）
    │
    ├── rules/                      # 规则注册表（v5.0 新增）
    │   └── policy-registry.yaml    # 规则注册表（唯一规则ID，供工作流引用）
    │
    ├── scripts/                    # 自动校验脚本（v5.0 新增，v5.1/v5.5 扩展）
    │   ├── validate_time.py        # 时间线校验（日期/星期/年龄）
    │   ├── validate_money.py       # 资金流校验（余额守恒/重复计算）
    │   ├── validate_state.py       # 状态一致性校验（持有人/位置）
    │   ├── validate_references.py  # 引用校验（ID唯一性/关系引用）
    │   ├── validate_ids.py         # ID唯一性校验
    │   ├── validate_structure.py   # 结构校验（文件存在性/证据碎片化）
    │   ├── style_lint.py           # 风格检查（AI句式/章末结构）
    │   ├── validate_framework.py   # v5.0 框架门禁：23项审核（大纲/情感核心/证据碎片化/推进比例/巧合密度等），新建/每5章跑
    │   ├── validate_workflow_execution.py # v5.1 写章门禁：PLAN章节号/标题对齐/状态更新检查，每章必跑
    │   ├── run_all_validators.py   # 跑以上 9 个校验脚本的全量包
    │   └── run_evals.py            # v5.5 回归测试执行器：扫描 evals/*.json → 构造临时项目 → 调用校验器 → 预期匹配 → 出报告
    │
    ├── evals/                      # 回归测试（v5.0 新增）
    │   ├── continuity_cases/       # 连续性测试用例（物件位置/知识边界）
    │   ├── evidence_cases/         # 证据测试用例（证据大礼包/完整契约）
    │   ├── timeline_cases/         # 时间线测试用例（日期不匹配/时间倒流）
    │   ├── professional_cases/     # 专业可行性测试用例（法医权限/律师身份）
    │   └── style_cases/            # 风格测试用例（模式重复/情绪平板）
    │
    ├── workflows/                  # 工作流
    │   ├── create-project.md       # 新建小说项目（v5.0 简化版）
    │   ├── new-project.md          # v3/v4 旧版新建项目流程（LEGACY，保留参考）
    │   ├── outline.md              # 生成或修改大纲
    │   ├── write-chapter.md        # 5步写章流程（v5.0 重构 + v5.4 责编视角升级 + v5.5 里程碑接入）
    │   ├── milestone-review.md     # 里程碑审查（v5.5 新增，每3-5章）
    │   ├── continue-novel.md       # LEGACY：旧版续写流程，默认不调用
    │   ├── revise.md               # 修改问题章节（v5.0 精简版）
    │   ├── revise-chapter.md       # 单章修改专用流程（补充版）
    │   ├── audit.md                # 红队逻辑审查（v5.0 精简版）
    │   ├── audit-novel.md          # 整书审查全流程（补充版）
    │   └── enhance-description.md  # 文笔/画面感增强润色流程
    │
    ├── project-template/           # 项目模板（v5.0 新增）
    │   ├── canon.json              # canon.json 初始模板（含必填占位与示例字段）
    │   ├── events.jsonl            # events.jsonl 初始文件
    │   ├── goals.md                # 情感核心与故事主题模板
    │   ├── outline.md              # 章节大纲模板
    │   └── truth-bible.md          # 真相底稿模板
    │
    ├── templates/                  # 模板
    │   ├── truth-bible.md          # 真相底稿模板
    │   ├── project-state.md        # LEGACY：旧版项目状态模板
    │   ├── scene-contract.md       # 场景合同模板
    │   ├── chapter-delta.md        # LEGACY：旧版章节状态差量模板
    │   ├── evidence-ledger.md      # 派生报告模板，不作为事实源
    │   ├── events-ledger.md        # 派生报告模板，不作为事实源
    │   ├── knowledge-matrix.md     # 派生报告模板，不作为事实源
    │   ├── synopsis-contract.md    # 简介契约模板（v4.1 新增）
    │   ├── red-team-report.md      # 红队审查报告模板
    │   ├── canon-registry.md       # 派生报告模板，不作为事实源
    │   ├── money-flow.md           # 派生报告模板，不作为事实源
    │   ├── emotion-ledger.md       # 派生报告模板，不作为事实源
    │   └── change-log.md           # 派生报告模板，不替代 events.jsonl
    │
    └── genres/                     # 类型模块
        ├── genre-profile.md        # 类型优先级/多类型组合配置（对应 IRON-032）
        ├── suspense.md             # 悬疑/推理
        ├── female-frequency-short.md # 女频短篇
        ├── fantasy.md              # 玄幻/修仙
        ├── urban.md                # 都市/职场
        ├── historical.md           # 古言/历史
        └── romance.md              # 言情/情感

------------------------------------------------------------------------

## 快速开始

### 场景1：新建小说项目

    用户：帮我写一部悬疑小说
    路由：模式A（新建小说项目）
    读取：workflows/create-project.md + rules/policy-registry.yaml + genres/suspense.md
    执行：高概念 → 情感核心 → 简介契约 → 真相底稿 → 初始化canon.json → 大纲
    输出：goals.md + canon.json + truth-bible.md + outline.md

### 场景2：写章节（v5.5 五步流程 + 双门禁校验）

    用户：写第3章
    路由：模式C（5步写章流程）
    读取：workflows/write-chapter.md + goals.md + canon.json + policy-registry.yaml
    PLAN    → 上下文加载仪式（7项打勾）+ 章节计划（reader_emotion_curve + progress_source 标记 + 概念层打底卡读取）
    VALIDATE→ 自动校验：每章跑 validate_workflow_execution.py（写章门禁），每 5 章加跑 validate_framework.py（大纲门禁）
    WRITE   → 作者写正文（风格采样最近3章，不加载全部规则）
    CRITIQUE→ 独立红队审查（14 维：原 6 维 + 大纲对齐度/概念对齐度/责编视角/毒点/跨章模式预警等）
    COMMIT  → 更新 canon.json + events.jsonl + 差量摘要
    输出：正文（用户可见）+ 状态更新摘要（简洁版）

### 场景3：红队审查（单章/局部审查）

    用户：帮我审查一下这部小说有没有逻辑问题（只看第4-6章）
    路由：模式F（红队逻辑审查）
    读取：workflows/audit.md + rules/policy-registry.yaml
    执行：读章节正文 + 自动运行 9 个校验脚本（run_all_validators.py = 7基础 + framework门禁 + workflow门禁） + 6维度基础审查 + 必要时调用 audit-novel.md 整书审查
    输出：审查报告（BLOCK/FAIL/WARN，每项有证据/出处/建议）

### 场景3B：整书完本审查（三道闸门第3关）

    用户：写完了，帮我做整书完本审查
    路由：模式 F + 完本审查（audit-novel.md）
    读取：workflows/audit-novel.md + milestone-review.md + rules/policy-registry.yaml
    执行：整书重读 + 9 脚本全量跑 + 8 模式全扫 + 毒点全本扫描 + 伏笔回收检查 + 结局不完美度评价
    输出：完本审查报告（BLOCK/FAIL/WARN/PASS，含修复优先级和完本质量评分

### 场景4：里程碑审查（每3-5章）

    用户：写了3章了，帮我做个里程碑审查
    路由：模式I（里程碑审查）
    读取：workflows/milestone-review.md + canon.json + goals.md + outline.md + 最近3-5章正文
    执行：八大跨章模式检测（巧合/战力/反派智商/情感/信息释放/模式重复/配角工具化/设定一致性）
    输出：里程碑审查报告（BLOCK/FAIL/WARN/PASS，含修复优先级）

    ---

    ## 版本历史

    - **v5.5.0** (2026-07-20) — **里程碑审查体系**：新增 `workflows/milestone-review.md` 里程碑审查工作流（每3-5章强制执行），8大跨章模式检测（巧合密度/战力曲线/反派智商/情感进度/信息释放/模式重复/配角工具化/设定一致性）；大纲审查升级为强制门禁（BLOCK/FAIL 不许动笔），新增八大模式检测；单章 CRITIQUE 新增第14维「跨章模式预警」（烟感报警器，发现苗头就提醒）；建立三道闸门体系：大纲门禁 → 里程碑审查 → 完本审查；新增 4 条铁律（47-50）
    - **v5.4.0** (2026-07-20) — **责编视角升级**：借鉴 SoloEnt（灵蟹创作）AI 责编思路，PLAN 步骤新增「上下文加载仪式」（7项逐项打勾）和「角色深度档案」（核心动机/缺点/心理/秘密），新增「读者情绪目标」 reader_emotion_curve，CRITIQUE 新增第12维「责编视角五维评分」（钩子强度/节奏把控/角色魅力/信息密度/期待感）和第13维「毒点检测」（11个毒点分三级，剧毒即FAIL），新增 core/toxic-points.md 毒点清单，写章工作流从"工程师思维（不出错）"升级为"双视角（不出错+更好看）"
    - **v5.3.0** (2026-07-16) — **概念层打底**：PLAN步骤强制读取叙事结构理论/情感-行动循环理论/人物缺点驱动原理三张概念卡，CRITIQUE新增第11维度概念对齐度检查，写章工作流从"凭感觉写"升级为"有底层理论支撑"
    - **v5.2.0** (2026-07-16) — **大纲对齐强化**：修复 validate_framework.py Check 22 大纲事件覆盖率空跑问题（支持字段化大纲格式/多文件名格式），PLAN 步骤大纲从可选改为强制读取，CRITIQUE 新增第10维度大纲对齐度审查，validate_workflow_execution.py 新增 PLAN 章节号校验和标题对齐预警，新增3条铁律（38-40）
    - **v5.1.0** (2026-07-15) — 新增工作流执行痕迹强制输出、状态更新强制、Step 2 VALIDATE 脚本执行强制、Step 3 风格采样强制
    - **v5.0.0** (2026-07-12) — **架构级重构**：新增goals.md定义情感核心（主角恐惧/真相/功课），canon.json作为唯一结构化事实源，7个自动校验脚本（可确定的错误不再靠模型自审），Author/Critic分离写章流程（PLAN→VALIDATE→WRITE→CRITIQUE→COMMIT），policy-registry.yaml规则注册表（所有工作流只引用规则ID），10个回归测试用例，新增3条求好型铁律（31-33），精简用户可见输出（默认只显示正文+3条风险+状态更新），删除旧审计报告，统一版本号到v5.0
    - **v4.5.0** (2026-07-12) — 基于《账本里的第三者》结论优化，新增4大铁律（硬事实统一/资金流闭环/情绪追踪/变更记录），新增4个模板（canon-registry/money-flow/emotion-ledger/change-log），红队审查重构为四档制（BLOCK/FAIL/WARN/PASS），新增8个强制问题，新增专业可行性审查，重构写章节流程为六步（读底稿→章节合同→前置校验→正文→红队→同步台账）
    - **v4.4.0** (2026-07-12) — 基于《婚礼次日》评价优化，新增6大铁律（胜利节奏/主角主动性/反派智商/数字一致性/商业合理性/证据台账同步），新增6项门禁检查，新增5项红队检测，强化大纲生成流程的胜利节奏控制和反派分工设计
    - **v4.3.0** (2026-07-12) — 整合女频短篇蒸馏规则卡（131张），新增 genres/female-frequency-short.md 模块，支持9阶段叙事流程按需调用
    - **v4.2.0** (2026-07-12) — 基于《总体评价》优化记忆闭环，新增差量验证步骤、事件溯源、事实状态标记
    - **v4.1.0** (2026-07-12) — 基于《灰烬之下》评价优化，新增简介契约、证据碎片化、代价追踪、反派触发事件、信息释放节奏、配角独立性、程序正义、人物弧光、去AI味强化等9大规则，新增十一类问题检测清单
    - **v4.0.0** (2026-07-12) — 模块化架构重构，从"百科全书式"改为"路由器式"
    - **v3.0.0** — 硬伤防御版，增加多视角管理、世界观设定、伏笔追踪、跨会话状态保存
    - **v2.0.0** — 增加前置检查6表、连续性台账、对抗式审查
    - **v1.0.0** — 基础版本

    ---

    ## 备份说明

    旧版审计报告（AUDIT_REPORT_v4.md / GLOBAL_AUDIT_REPORT.md）已在v5.0中删除，由自动校验脚本替换。

## v1 实现补充

原版目录中点名的子模块已在本 v1 部署中补齐。执行具体任务时先按上文路由读取对应的 `workflows/`、`core/`、`rules/`、`genres/` 和模板；自动校验使用 `scripts/`，AI 视频改编交接读取 [references/ai-video-handoff.md](references/ai-video-handoff.md)。
