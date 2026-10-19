/**
 * 简历内容层。
 *
 * 唯一来源：作者本人 v7 简历（lsb-resume-ai-product-white-gold-v7.pdf）与
 * resume.lsb0713.online。数字、项目名、技术栈逐条可核对，不做推测性润色。
 *
 * 与 site.ts 的分工：site.ts 供作品集叙事使用，本文件供可扫读的简历页与打印版使用。
 * 两处若出现同一事实，以本文件为准。
 */

export type ResumeBullet = string

export type ResumeEntry = {
  index: string
  title: string
  titleEn?: string
  role: string
  period: string
  stack: string
  bullets: ResumeBullet[]
}

export type ResumeSkill = {
  title: string
  keywords: string[]
  bullets: ResumeBullet[]
}

/** 核心成果。四条都是可核对的量化结果，不是能力形容词。 */
export const RESUME_HIGHLIGHTS = [
  { figure: '5w+', unit: '元', label: 'AI 视频独立商业变现', note: '另有 50w+ 在途项目' },
  { figure: '30+', unit: '位', label: '付费用户', note: '头部 MCN 月度复购 8 次' },
  { figure: '7→3', unit: '天', label: '视频交付周期', note: '标准化 SOP 压缩' },
  { figure: '300-2000', unit: '元', label: '单分钟视频变现', note: '持续打磨效果与成本平衡' },
] as const

export const RESUME_TARGET = {
  role: 'AI Agent 产品经理（视频生成方向）实习',
  availability: '2026 暑期可全职到岗',
  basis: '持续围绕生成式交互、AI 工作台与 Agent 协作做产品化实践',
} as const

export const RESUME_INTRO =
  '持续围绕生成式交互、AI 工作台与 Agent 协作做产品化实践，关注如何把能力、状态、工具调用、验证记录与知识更新机制收束成可进入真实流程的产品主线。既能从需求拆解、信息架构、交互约束到文案策略层面组织复杂问题，也能直接进入 Next.js / React / TypeScript / FastAPI 等工程实现推进验证闭环；同时有 AI 视频商业化与品牌视觉量产交付经验，理解表达效果、执行成本与生产约束之间的平衡。'

export const RESUME_PROJECTS: ResumeEntry[] = [
  {
    index: '01',
    title: '中国古代建筑交互作品 / 古建拼搭工坊',
    titleEn: 'Heritage Scroll',
    role: '独立推进的比赛项目',
    period: '2026.04 - 至今',
    stack: 'Next.js 16 / React 19 / TypeScript / Three.js / React Three Fiber / Pretext',
    bullets: [
      '围绕民居、官府、皇宫、桥梁 4 类主题，独立推进兼具观看、讲解、生成、拼搭的浏览器内 3D 交互作品。',
      '设计「专题切换 - 观景台 - 构景台 - 工坊」4 段核心体验流程，并落实到首页、建筑独立页、平台页、工坊页等 9 个主路由。',
      '基于 Pretext 与自定义 wrap geometry 组件推进 3D 场景状态与中文实时排版的联动表达；建立 4 类 subject rules、3 类工作视图与 GLB 校验脚本。',
      'heritage-engine.test.ts 含 24 个用例、167 条断言；项目整体围绕内容驱动、状态驱动与交互驱动的统一组织持续推进。',
    ],
  },
  {
    index: '02',
    title: 'AI 视频商业化与 Hermes Agent 实践',
    titleEn: 'AI Video Delivery',
    role: '生成式内容产品 / Agent 工作流实践',
    period: '2025.12 - 2026',
    stack: 'AI 视频生成 / Hermes / ACP / VS Code / WeChat Clawbot',
    bullets: [
      '独立完成面向政企、MCN、动漫、海外等场景的 AI 视频定制全链路，实现 5w+ 商业变现、50w+ 在途项目，服务 30+ 付费用户并获得头部 MCN 月度复购 8 次。',
      '建立标准化 SOP，将视频交付周期由 7 天压缩至 3 天；单分钟视频变现 300 - 2000 元，持续打磨效果、一致性、效率与成本控制之间的平衡。',
      '当前持续将 Hermes 通过 ACP 接入 VS Code，并接入微信 Clawbot，形成「本地执行 + 微信消息承接与汇总」的双端工作流。',
      '关注点从单轮问答转向跨端协作、上下文延续、工具执行与结果回传的稳定性；这段实践也为后续推进 AI 工作台与生成式交互作品提供了方法论基础。',
    ],
  },
  {
    index: '03',
    title: '果智营经营工作台',
    titleEn: 'GuoZhiYing',
    role: 'AI 工作台 / Agent 协作产品实践',
    period: '2026 - 至今',
    stack: 'Next.js / React 19 / TypeScript / FastAPI / SQLAlchemy',
    bullets: [
      '面向真实经营场景推进 AI 工作台产品，覆盖首页、AI 助手、采购、库存、渠道、客群、内容、爆品、扩店等 8+ 模块，核心是把分散模块统一回同一条经营判断链路。',
      '主导页面迁移到新的 Studio shell 基线，重建顶层信息架构；重构 AI Assistant 页面，收拢分裂入口与历史追问，形成围绕经营问题的单一快判流。',
      '统一 workspace / detail page 叙事节奏，推进 seed / database 双模式一致性，并补强状态文件、日志落盘、失败清理等验证闭环。',
      '代码侧已形成约 81 个核心文件、约 2.76 万行代码的工作台骨架，覆盖多个业务页面、详情路由与 Agent 协作相关状态组织。',
    ],
  },
  {
    index: '04',
    title: '品牌视觉与包装设计落地实践',
    titleEn: 'Packaging at Scale',
    role: '独立设计 / 商业量产交付',
    period: '2025 - 至今',
    stack: 'Photoshop / Illustrator / 印前文件 / 打样调整 / 工厂对接',
    bullets: [
      '独立负责「凤梨贴纸」「葡萄开口盒」2 个品牌包装项目，覆盖主视觉设定、文案排版、印前文件输出、打样修正与工厂协同，承担从视觉方案到量产交付的完整链路。',
      '凤梨项目围绕终端贴标与果品识别需求，设计 88 x 88mm 小尺寸包装贴标系统，将品名、卖点文案、品牌字样与凤梨 icon 组织进高识别度版式，并完成联版输出与实际印刷落地。',
      '葡萄项目围绕礼盒包装场景，构建由主视觉 KV、标题文案面与氛围延展面组成的系列化视觉系统，通过手绘葡萄主题画面、紫金配色与金色标题字统一品牌气质与货架识别。',
      '在执行阶段同步处理包装信息层级、印刷适配、打样偏差修正、印前规范与工厂对接问题；两个项目均已完成工厂实物生产，单项目量产规模约 2 - 5 万份。',
    ],
  },
]

export const RESUME_SKILLS: ResumeSkill[] = [
  {
    title: '复杂问题收敛与产品主线判断',
    keywords: ['问题拆解', '信息架构', '页面主线', '状态流转'],
    bullets: [
      '习惯先拆一级目标、核心约束与验证条件，再决定页面结构、信息层级、状态流转和文案位置。',
      '能将复杂项目拆成连续链路，例如把古建项目组织为「专题切换 - 观景台 - 构景台 - 工坊」，把果智营页面组织为「当前判断 / 任务单 / 复验项」。',
      '在复杂系统中会主动做减法，明确主视觉、主入口、主任务和非核心信息的层级关系。',
    ],
  },
  {
    title: 'AI 产品与 Agent 工作流设计',
    keywords: ['模型选型', 'Prompt 设计', 'RAG', 'Memory', 'Tool Use', 'Workflow'],
    bullets: [
      '做过从模型选型、提示词设计、全能参考输入、工作流编排到交付验收的完整 AI 生产链路。',
      '持续围绕 RAG、上下文记忆、知识更新、工具调用、多步骤协作与验证记录等机制设计 Agent 产品，并关注上下文工程与约束工程在真实流程中的稳定性。',
      '在果智营项目中将 Agent 能力与页面结构、状态文件、验证记录和开放问题模板结合，形成 3 类状态记录与 2 层验证机制。',
      '熟悉闭源视频模型调用、开源模型本地部署与 RunningHub 云端工作流等不同执行路径。',
    ],
  },
  {
    title: '生成式内容与交互表达',
    keywords: ['AI 视频', '3D 交互', '包装视觉', '品牌物料'],
    bullets: [
      '做过 AI 视频、3D 交互作品、包装视觉与品牌物料等不同媒介的表达设计。',
      '在古建项目中尝试将 Pretext 排版约束引入 3D 场景信息呈现；在葡萄礼盒项目中通过主视觉 KV、标题文案面与氛围延展面统一品牌气质和货架识别。',
      '理解生成式内容交付中的关键约束：参考一致性、首尾帧控制、节点复用、提示词稳定性、出图与出视频效率，以及包装印刷中的尺寸、联版、打样偏差和印前文件规范。',
    ],
  },
  {
    title: '工程理解与落地协同',
    keywords: ['前端工程', '路由与组件', '状态文件', '验证脚本', '3D Web'],
    bullets: [
      '熟悉 Next.js / React / TypeScript 项目结构，能直接进入代码、路由、组件、状态文件与验证脚本推进实现。',
      '能与接口、数据模式、日志、运行时状态文件和验证脚本等工程要素协同工作，推动从方案到回归验证的完整闭环。',
      '熟悉 Three.js / React Three Fiber 等 3D Web 表达栈，理解内容驱动、状态驱动与交互驱动在复杂前端系统中的组织方式。',
    ],
  },
]

export const RESUME_EDUCATION = {
  school: '中国农业大学',
  major: '数据科学与大数据技术',
  degree: '本科',
  period: '2023.09 - 2027.06',
  status: '本科大三在读，预计 2027 年毕业',
} as const

/** 页脚备注。写清楚这份简历的边界，避免读者误读为完整履历。 */
export const RESUME_FOOTNOTE =
  '本页内容与 v7 版简历同源，项目细节可在作品集内逐条展开核对。'