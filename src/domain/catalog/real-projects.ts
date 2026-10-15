import type { CatalogEntry } from "@/contracts/catalog-content";

// Verified project sources; GitGlow layouts use real project material or project typography.
export const REAL_CATALOG_PROJECTS = [
  {
    "slug": "liu-resume",
    "workflowSlugs": ["ans-portfolio-website"],
    "category": "career",
    "subcategory": "portfolio",
    "goal": "career",
    "preview": "site",
    "source": "official",
    "sourceUrl": "https://resume.cauai.fun/",
    "content": {
      "zh": {
        "title": "个人简历与作品集站",
        "summary": "告别干瘪的纸质表格——把你的真实履历、可交互的代表作和项目复盘装进同一个高颜值个人主页。",
        "sample": "resume.cauai.fun/",
        "output": "可在线访问的响应式个人主页、四大代表作案例卡片与一键打印 PDF 简历视图",
        "inputs": "在线浏览无需任何准备；若想做同款主页，准备好你的真实经历与 1～3 个做过的项目即可",
        "decisions": "挑出最能证明你动手能力的代表作放在首屏，坚持只写自己亲手做过的真实贡献",
        "model": "线上展示站为纯前端确定性渲染（零推理延迟）；若使用 ANS 同款简历工作流润色文案，则调用站内文本模型。",
        "prompt": "用「痛点背景 → 我负责的核心动作 → 可验证的交付结果」三段式结构组织每段项目经历，避免堆砌空洞形容词。",
        "skill": "可直接点击下方关联的「个人简历与作品集网站」工作流在站内免代码生成，或打开原站参考双栏排版与打印样式设计。",
        "sourceNote": "ANS 官方标杆案例。原站公开可浏览；同款制作能力已接入站内市场与工作流。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/liu-resume.webp",
    "coverNote": "真实项目页面 · GitGlow 版式"
  },
  {
    "slug": "image2-library",
    "category": "aigc",
    "subcategory": "image",
    "goal": "portfolio",
    "preview": "site",
    "source": "official",
    "sourceUrl": "https://image2.cauai.fun/",
    "content": {
      "zh": {
        "title": "Image2 · 视觉提示词拆解库",
        "summary": "不知道好图是怎么写出来的？先看带真实出处的成片效果，再一键拆解它的 Prompt 词根结构并改写出你的变体。",
        "sample": "image2.cauai.fun/",
        "output": "按风格分类的高清视觉案例墙、结构化中英对照 Prompt 拆解卡片与灵感收藏夹",
        "inputs": "你想尝试的画面风格（如胶片人像、3D 盲盒、海报排版）与想替换的主体关键词",
        "decisions": "先看原图确认光影与构图是不是你要的感觉，再保留其「镜头/光效/材质」骨骼词、只替换「主体与动作」",
        "model": "案例库收录主流多模态生图模型（Midjourney / Flux / 即梦等）的实测成片；浏览拆解无需消耗算力。",
        "prompt": "遵循「主体描述 + 场景环境 + 构图机位 + 光影材质 + 风格尾缀」五层拆解法，改词时不破坏原图的光影骨架。",
        "skill": "打开原站检索心动风格 → 复制结构化提示词骨架 → 替换核心主体词 → 在你常用的生图工具中出图对比。",
        "sourceNote": "ANS 官方视觉案例库。所有收录案例均保留原作者与来源出处，具体功能以原站页面为准。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/image2-library.webp",
    "coverNote": "真实项目页面 · GitGlow 版式"
  },
  {
    "slug": "vibephoto",
    "category": "aigc",
    "subcategory": "image",
    "goal": "portfolio",
    "preview": "site",
    "source": "official",
    "sourceUrl": "https://zsm.cauai.fun/",
    "content": {
      "zh": {
        "title": "VibePhoto · 趣味跨次元合影",
        "summary": "选定真实地标场景与趣味角色搭子，上传照片编排机位，生成自然融光的趣味跨次元合影。",
        "sample": "zsm.cauai.fun/",
        "output": "原站拍摄计划单、人物与场景融合后的成片以及个人相册归档",
        "inputs": "清晰的正脸或半身照、想打卡的地点场景与趣味互动姿势（需登录原站并核对开拍额度）",
        "decisions": "开拍前先确认透视比例与环境光方向一致；公开分享作品时主动标注 AI 创意合成",
        "model": "原站底层结合人像特征保持与场景光影重绘模型；具体可用模型与单次额度以原站开拍确认页为准。",
        "prompt": "原站已将复杂的「机位景别 + 环境光匹配 + 互动神态」封装为可视化选项，无需手写长篇英文咒语。",
        "skill": "进入原站挑选场景与互动模板 → 上传本人授权照片 → 核对拍摄计划与额度消耗 → 生成并挑选最自然的一张保存。",
        "sourceNote": "ANS 官方创意实验站（zsm.cauai.fun）。账号登录与开拍额度规则以原站实时说明为准。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/vibephoto.webp",
    "coverNote": "真实项目页面 · GitGlow 版式"
  },
  {
    "slug": "aigc-workspace",
    "category": "aigc",
    "subcategory": "video",
    "goal": "portfolio",
    "preview": "video",
    "source": "official",
    "sourceUrl": "https://toonflow.cauai.fun/",
    "content": {
      "zh": {
        "title": "AIGC 视频分镜工作台",
        "summary": "把脑海里的剧本拆成角色设定卡、关键首尾帧与连续分镜，在统一时间线上推进 AI 漫剧与短片制作。",
        "sample": "toonflow.cauai.fun/",
        "output": "角色设定资产库、逐镜分镜表、关键帧画面与合成视频片段",
        "inputs": "一段故事梗概或剧本、核心角色外貌设定，以及工作台所需的模型渠道配置",
        "decisions": "务必先锁死角色的立绘三视图和画风种子，再去批量抽分镜首帧，最后才对满意的关键帧发起图生视频（省钱且防崩）",
        "model": "支持按创作阶段组合调用大语言模型（拆剧本）、文生图模型（定角色与首帧）及图生视频模型（动效生成）。",
        "prompt": "采用「全局画风前缀 + 角色固定特征词 + 单镜头运镜与动作描述」三明治结构，确保跨镜头人物不换脸。",
        "skill": "在独立窗口打开工作台 → 建剧目并固定角色资产 → AI 拆解分镜脚本 → 逐镜确认首帧画面 → 按需生成动态视频。",
        "sourceNote": "ANS 官方视频工作流（Toonflow）。当前通过独立创作空间打开，生成前请核对模型渠道与费用。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/aigc-workspace.webp",
    "coverNote": "原项目官方演示素材 · GitGlow 版式"
  },
  {
    "slug": "niannian-drama",
    "category": "aigc",
    "subcategory": "video",
    "goal": "portfolio",
    "preview": "video",
    "source": "official",
    "sourceUrl": "https://ai.cauai.fun/",
    "content": {
      "zh": {
        "title": "念念 AI · 短剧与漫剧工作台",
        "summary": "专为多集 AI 短剧与动态漫打造的生产流水线——把剧本改编、角色锁脸、分镜配音与成片合成装进同一套工序。",
        "sample": "ai.cauai.fun/",
        "output": "多集短剧工程档案、角色声画绑定资产与可导出的分集视频",
        "inputs": "小说章节或短剧剧本、主角人设小传，并按原站要求完成账号登录与计费确认",
        "decisions": "在第一集定下黄金前 3 秒冲突钩子与核心主角音色，严格先审分镜静帧再跑视频渲染，避免无效返工",
        "model": "原站集成长文本剧本拆解、一致性角色生图、情感语音合成（TTS）与图生视频多模态管线。",
        "prompt": "将小说叙事自动转译为「景别（特写/中景）+ 画面视觉元素 + 台词情绪标签 + 运镜指令（推/拉/摇/移）」的标准分镜表。",
        "skill": "登录原站创建剧集工程 → 导入文本拆出分镜表 → 绑定主角立绘与专属音色 → 逐镜抽卡审片并导出成片。",
        "sourceNote": "ANS 官方生态产品（ai.cauai.fun）。具体可用模型、计费标准与任务队列以原站说明为准。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/niannian-drama.webp",
    "coverNote": "真实项目页面 · GitGlow 版式"
  },
  {
    "slug": "niannian-edit",
    "category": "aigc",
    "subcategory": "video",
    "goal": "portfolio",
    "preview": "video",
    "source": "official",
    "sourceUrl": "https://edit.cauai.fun/",
    "content": {
      "zh": {
        "title": "念念智剪 · AI 视频粗剪与包装",
        "summary": "抽完一堆 AI 视频片段不知道怎么拼？把零散素材丢进智能时间线，快速完成气口裁剪、字幕对齐与成片输出。",
        "sample": "edit.cauai.fun/",
        "output": "对齐音轨与字幕的多轨视频时间线工程及最终成片文件",
        "inputs": "你生成的视频片段、配音音频或口播原片，以及想要的成片画幅比例",
        "decisions": "先剔除画面崩坏的废片、按叙事节奏排好主时间线，再统一压入字幕样式与背景音乐",
        "model": "结合语音识别（ASR）时间轴对齐与多模态画面关键点理解；基础时间线剪辑无需消耗大模型算力。",
        "prompt": "通过结构化剪辑指令或时间轴标记控制切片节奏，聚焦「台词卡点、转场衔接与重点字幕高亮」。",
        "skill": "打开原站导入视频与音轨 → 自动识别语音并对齐字幕时间轴 → 删减气口与废片 → 预览并导出成片。",
        "sourceNote": "ANS 官方生态工具（edit.cauai.fun）。具体剪辑能力与导出规格以原站当前版本为准。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/niannian-edit.webp",
    "coverNote": "真实项目介绍排版 · GitGlow 版式"
  },
  {
    "slug": "kids-motion",
    "category": "aigc",
    "subcategory": "video",
    "goal": "portfolio",
    "preview": "video",
    "source": "official",
    "sourceUrl": "https://dh.cauai.fun/",
    "content": {
      "zh": {
        "title": "童装动作迁移制作台",
        "summary": "电商棚拍实操案例：看如何用「平铺服装图 + 首帧上身合成 + 动作骨骼迁移」做出自然的童装动态展示视频。",
        "sample": "dh.cauai.fun/",
        "output": "高清童装模特首帧图与动作流畅的竖屏电商展示短视频",
        "inputs": "拥有合法商用授权的服装实拍图、目标模特形象设定与参考走秀/转身动作视频",
        "decisions": "生成视频前必须先放大检查首帧图的领口、袖口花纹与面料颜色是否 100% 还原实物，绝不拿货不对板的图去跑视频",
        "model": "采用「图像局部重绘/换装保持模型 + 姿态驱动视频生成模型（Pose-to-Video）」两阶段串联架构。",
        "prompt": "弱化天马行空的风格词，强约束「服装版型、印花细节零篡改、自然棚拍柔光与稳定走姿」。",
        "skill": "两步走稳妥法：第 1 步先在首帧环节锁死衣服版型与模特长相；第 2 步套用标准走秀动作参考视频驱动成片。",
        "sourceNote": "ANS 官方垂直场景工作台（dh.cauai.fun）。请务必使用自有或获准商用的商品图片。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/kids-motion.webp",
    "coverNote": "真实项目页面 · GitGlow 版式"
  },
  {
    "slug": "infinite-canvas",
    "category": "aigc",
    "subcategory": "image",
    "goal": "portfolio",
    "preview": "site",
    "source": "official",
    "sourceUrl": "https://hb.cauai.fun/",
    "content": {
      "zh": {
        "title": "CAUAI 无限灵感画布",
        "summary": "摆脱单向聊天框的束缚！在无边界的二维画布上自由摆放参考图、拆解情绪板，把多步 AIGC 试验并排对比。",
        "sample": "hb.cauai.fun/",
        "output": "可视化灵感情绪板（Moodboard）、多分支生图对比画布与高清素材归档",
        "inputs": "你收集的参考截图、草图线条、配色灵感以及原站所需的模型连接配置",
        "decisions": "把同一组 Prompt 的不同参数变体并排贴在画布上直观比选，挑出光影和构图最稳的一支继续细化",
        "model": "画布交互本身在浏览器端流畅运行；画布内挂载的生图/改图节点按你在原站配置的图像模型执行。",
        "prompt": "利用画布空间把「参考图（垫图）+ 局部重绘遮罩 + 增量修改词」组合起来，比纯靠文字盲猜精准十倍。",
        "skill": "打开无限画布 → 拖入 3～5 张风格参考图建立视觉基准 → 分支延展测试不同提示词 → 框选最优成片导出。",
        "sourceNote": "ANS 官方创作工具（hb.cauai.fun）。画布操作与外部模型配置以原站说明为准。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/infinite-canvas.webp",
    "coverNote": "真实项目页面 · GitGlow 版式"
  },
  {
    "slug": "ai-video-services",
    "category": "business",
    "subcategory": "services",
    "goal": "portfolio",
    "preview": "site",
    "source": "official",
    "sourceUrl": "https://video.cauai.fun/",
    "content": {
      "zh": {
        "title": "AI 商业视频定制与拆解展厅",
        "summary": "想用 AIGC 接商单却不知道怎么定价、怎么定交付标准？直接拆解真实商业广告、品牌短片与产品种草片的交付样本。",
        "sample": "video.cauai.fun/",
        "output": "真实商业短片成片展厅、分档位服务交付标准与商务询价参考",
        "inputs": "浏览研究无需输入；如需定制合作，需准备明确的品牌诉求、产品实拍素材、目标时长与投放渠道",
        "decisions": "接单或下单前务必明确「分镜确认节点、免费修改次数上限、实拍素材占比与商用版权边界」（ANS 站内不代收现金）",
        "model": "展厅浏览无需调用模型；所展示的商业成片综合运用了主流商业级视频生成、配音与后期合成工具链。",
        "prompt": "商业交付不靠单次抽卡运气，而是靠「客户脚本确认 → 静态故事板签字 → 动态抽卡 → 传统后期精修调色」的工业化SOP。",
        "skill": "新手可将其作为「AIGC 商业接单教科书」：研究它如何划分服务档位、如何展示样片品质、如何规避无限改稿陷阱。",
        "sourceNote": "ANS 官方商业案例展厅（video.cauai.fun）。仅作案例展示与联系入口，商务合作以双方正式约定为准。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/ai-video-services.webp",
    "coverNote": "真实项目页面与原站公开作品 · GitGlow 版式"
  },
  {
    "slug": "niannian-agent",
    "category": "productivity",
    "subcategory": "automation",
    "goal": "portfolio",
    "preview": "site",
    "source": "official",
    "sourceUrl": "https://tutor.cauai.fun/",
    "content": {
      "zh": {
        "title": "念念 AI · 多模态学习与任务助手",
        "summary": "围绕错题拆解、资料精读与日常任务，把长上下文对话、拍照识图和语音讲解揉进同一个清爽的个人助手里。",
        "sample": "tutor.cauai.fun/",
        "output": "分步解题推导、结构化阅读摘要与多轮跟进的学习记录",
        "inputs": "你遇到的具体题目截图、长文资料或待办任务说明（需按原站要求登录使用）",
        "decisions": "不要直接向 AI 索要最终答案抄写——让它先拆解解题思路和易错点，再自己动手算一遍核对",
        "model": "原站接入支持视觉理解（Vision）与长文本推理的大语言模型，具体模型选项以原站对话界面为准。",
        "prompt": "采用「苏格拉底式启发引导」：要求模型先定位核心考点 → 给出一层提示 → 逐步推导，而非直接甩出结果。",
        "skill": "进入原站上传题目或文档 → 让助手先划出已知条件与核心概念 → 针对卡壳步骤追问推导过程 → 整理进错题本。",
        "sourceNote": "ANS 官方生态应用（tutor.cauai.fun）。账号权限与使用额度以原站实时规则为准。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/niannian-agent.webp",
    "coverNote": "真实项目介绍排版 · GitGlow 版式"
  },
  {
    "slug": "liu-aigc-portfolio",
    "category": "career",
    "subcategory": "portfolio",
    "goal": "career",
    "preview": "site",
    "source": "official",
    "sourceUrl": "https://resume.cauai.fun/portfolio/",
    "content": {
      "zh": {
        "title": "AIGC 视觉与交互动效作品集",
        "summary": "不仅晒最终视频，还把滚动揭示、液体玻璃、3D 卡片堆叠等前端动效与 AIGC 成片融合在一座沉浸式展厅里。",
        "sample": "resume.cauai.fun/portfolio/",
        "output": "可在线交互体验的动效作品集展厅与分项目创作档案",
        "inputs": "在线浏览完全免费；若想搭建自己的动效作品集，需准备代表作视频/高清截图与每个项目的简短复盘",
        "decisions": "克制使用花哨特效——动效的唯一目的是衬托你的作品画质，同时务必为低配设备与减弱动态偏好留好平滑降级",
        "model": "页面动效基于现代 CSS / WebGL / React 确定性实现，浏览时零 AI 算力开销。",
        "prompt": "为每件作品配齐「一句话创作命题 + 用到的工具链 + 解决的核心难点」，让内行看门道、外行看惊艳效果。",
        "skill": "打开原站体验滚动节奏与卡片交互 → 参考其「主视觉直出 + 极简背景说明」的策展逻辑来包装你自己的作品。",
        "sourceNote": "ANS 官方创作者作品集样本（resume.cauai.fun/portfolio）。公开可浏览，转发请保留原作者署名。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/liu-aigc-portfolio.webp",
    "coverNote": "原站公开作品缩略图 · GitGlow 版式"
  },
  {
    "slug": "cauai-one",
    "category": "web",
    "subcategory": "applications",
    "goal": "portfolio",
    "preview": "site",
    "source": "official",
    "sourceUrl": "https://one.cauai.fun/",
    "content": {
      "zh": {
        "title": "CAUAI 创作工具矩阵导航",
        "summary": "一页总览 CAUAI 生态下的无限画布、短剧视频工作台、智剪工具与接口服务，找工具不再翻群聊收藏夹。",
        "sample": "one.cauai.fun/",
        "output": "集中式创作工具传送门与各子站点实时入口",
        "inputs": "明确你今天要做的任务类型（生图排版 / 漫剧视频 / 粗剪包装 / 模型调用）",
        "decisions": "根据当前任务阶段跳往最专精的子工具（例如脑暴构图去无限画布，分镜成片去视频工作台），并核对各站独立说明",
        "model": "导航站本身为轻量静态门户，不调用模型；实际模型能力由你进入的具体子工作台提供。",
        "prompt": "把复杂大项目拆成「画布定视觉 → 工作台跑分镜 → 智剪合音轨」的流水线，让每个工具干自己最擅长的一环。",
        "skill": "收藏该矩阵入口 → 按今日创作阶段一键直达对应子工具 → 跨工具串联完成完整多媒体作品。",
        "sourceNote": "ANS 官方生态矩阵门户（one.cauai.fun）。各子工具的开放状态与计费方式以对应页面为准。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/cauai-one.webp",
    "coverNote": "真实项目页面 · GitGlow 版式"
  },
  {
    "slug": "hello-algo",
    "category": "learning",
    "subcategory": "methods",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/krahets/hello-algo",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub81.md",
    "content": {
      "zh": {
        "title": "Hello 算法",
        "summary": "用动画、图解和多语言代码理解数据结构与算法。",
        "sample": "krahets/hello-algo",
        "output": "在线教材、动画演示与可运行代码",
        "inputs": "选择想学的算法与熟悉的编程语言",
        "decisions": "先理解图解，再亲手运行和修改代码",
        "model": "无需 AI 模型",
        "prompt": "无需提示词；从章节与代码开始",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "krahets 维护，收录于 HelloGitHub 第 81 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/hello-algo.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "build-your-own-x",
    "category": "learning",
    "subcategory": "methods",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/codecrafters-io/build-your-own-x",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub27.md",
    "content": {
      "zh": {
        "title": "Build Your Own X",
        "summary": "从数据库、编译器到搜索引擎，跟着教程亲手实现一个技术项目。",
        "sample": "codecrafters-io/build-your-own-x",
        "output": "按主题整理的动手实现教程",
        "inputs": "选择一个技术主题与对应教程",
        "decisions": "按自己的编程基础选择难度，保留实现过程",
        "model": "无需 AI 模型",
        "prompt": "无需提示词；教程按主题导航",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "codecrafters-io 维护，收录于 HelloGitHub 第 27 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/build-your-own-x.webp",
    "coverNote": "原项目 README 内容排版 · GitGlow 版式"
  },
  {
    "slug": "freecodecamp",
    "category": "learning",
    "subcategory": "notes",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/freeCodeCamp/freeCodeCamp",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub64.md",
    "content": {
      "zh": {
        "title": "freeCodeCamp",
        "summary": "通过在线课程和编程练习入门 Web 开发与计算机基础。",
        "sample": "freeCodeCamp/freeCodeCamp",
        "output": "课程、练习与学习路径",
        "inputs": "选择学习方向；需要时注册原站账号",
        "decisions": "按课程顺序练习，自己完成代码",
        "model": "无需 AI 模型",
        "prompt": "无需提示词；直接进入课程",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "freeCodeCamp 维护，收录于 HelloGitHub 第 64 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/freecodecamp.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "python-algorithms",
    "category": "learning",
    "subcategory": "research",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/TheAlgorithms/Python",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub71.md",
    "content": {
      "zh": {
        "title": "The Algorithms · Python",
        "summary": "阅读 Python 算法实现，把概念和实际代码对照起来。",
        "sample": "TheAlgorithms/Python",
        "output": "按主题整理的 Python 算法源码",
        "inputs": "Python 环境、算法主题与自己的输入数据",
        "decisions": "理解实现与复杂度后再用于自己的项目",
        "model": "无需 AI 模型",
        "prompt": "无需提示词；按算法目录阅读",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "TheAlgorithms 维护，收录于 HelloGitHub 第 71 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/python-algorithms.webp",
    "coverNote": "原项目 README 内容排版 · GitGlow 版式"
  },
  {
    "slug": "reactive-resume",
    "category": "career",
    "subcategory": "resume",
    "goal": "career",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/reactive-resume/reactive-resume",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub101.md",
    "content": {
      "zh": {
        "title": "Reactive Resume",
        "summary": "可自部署的简历编辑器，整理经历、调整版式并导出简历。",
        "sample": "reactive-resume/reactive-resume",
        "output": "可编辑简历与 PDF 导出",
        "inputs": "自己的真实经历、教育与技能",
        "decisions": "核对所有事实，选择适合岗位的模板",
        "model": "AI 辅助需在原项目中自行配置；并非必须",
        "prompt": "按原项目 AI 设置使用；ANS 未代填个人经历",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "reactive-resume 维护，收录于 HelloGitHub 第 101 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/reactive-resume.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "magic-resume",
    "category": "career",
    "subcategory": "resume",
    "goal": "career",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/joyceql/magic-resume",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub124.md",
    "content": {
      "zh": {
        "title": "Magic Resume",
        "summary": "开源简历制作工具，把真实经历整理成可维护的简历。",
        "sample": "joyceql/magic-resume",
        "output": "在线简历编辑、排版与导出",
        "inputs": "真实简历信息与选择的模板",
        "decisions": "检查排版与岗位匹配；AI 润色后逐项核对",
        "model": "AI 功能依项目配置与供应商而定",
        "prompt": "提示词与 AI 配置查看原仓库；不预置虚构经历",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "joyceql 维护，收录于 HelloGitHub 第 124 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/magic-resume.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "vcard-portfolio",
    "category": "career",
    "subcategory": "portfolio",
    "goal": "career",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/codewithsadee/vcard-personal-portfolio",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub73.md",
    "content": {
      "zh": {
        "title": "vCard 个人作品集",
        "summary": "响应式个人作品集网站源码，适合整理介绍、经历与作品链接。",
        "sample": "codewithsadee/vcard-personal-portfolio",
        "output": "个人作品集前端页面",
        "inputs": "自己的介绍、真实作品、图片与链接",
        "decisions": "替换原模板内容后再公开自己的站点",
        "model": "无需 AI 模型",
        "prompt": "无需提示词；按源码替换个人内容",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "codewithsadee 维护，收录于 HelloGitHub 第 73 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/vcard-portfolio.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "react-interview",
    "category": "career",
    "subcategory": "interview",
    "goal": "career",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/sudheerj/reactjs-interview-questions",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub95.md",
    "content": {
      "zh": {
        "title": "React 面试问答",
        "summary": "按主题阅读 React 问题和答案，用源码与练习补齐面试知识。",
        "sample": "sudheerj/reactjs-interview-questions",
        "output": "React 问答与知识主题导航",
        "inputs": "自己的知识薄弱点与 React 学习目标",
        "decisions": "对照当前 React 文档理解答案，而非只背结论",
        "model": "无需 AI 模型",
        "prompt": "无需提示词；按问题与答案阅读",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "sudheerj 维护，收录于 HelloGitHub 第 95 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/react-interview.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "remotion-video",
    "category": "aigc",
    "subcategory": "video",
    "goal": "portfolio",
    "preview": "video",
    "source": "github",
    "sourceUrl": "https://github.com/remotion-dev/remotion",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub111.md",
    "content": {
      "zh": {
        "title": "Remotion 视频开发",
        "summary": "用 React 和 Web 技术制作动画视频，适合可编程内容与批量渲染。",
        "sample": "remotion-dev/remotion",
        "output": "由代码定义的视频和渲染输出",
        "inputs": "React 代码、素材与视频参数",
        "decisions": "选择时间轴与素材；使用前核对其商业许可",
        "model": "核心渲染无需 AI 模型",
        "prompt": "无需提示词；视频由 React 组件与参数定义",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "remotion-dev 维护，收录于 HelloGitHub 第 111 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/remotion-video.webp",
    "coverNote": "真实项目文档 · GitGlow 版式"
  },
  {
    "slug": "comfyui",
    "category": "aigc",
    "subcategory": "image",
    "goal": "portfolio",
    "preview": "video",
    "source": "github",
    "sourceUrl": "https://github.com/Comfy-Org/ComfyUI",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub92.md",
    "content": {
      "zh": {
        "title": "ComfyUI",
        "summary": "通过节点组织 AI 创作流程，保存和复用自己的生成工作流。",
        "sample": "Comfy-Org/ComfyUI",
        "output": "节点式生成工作流与媒体输出",
        "inputs": "本地或自部署环境、模型和工作流输入",
        "decisions": "选择模型与节点，核对硬件和素材权限",
        "model": "取决于用户下载与配置的模型",
        "prompt": "由具体工作流的文本输入节点定义",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "Comfy-Org 维护，收录于 HelloGitHub 第 92 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/comfyui.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "pyvideotrans",
    "category": "aigc",
    "subcategory": "video",
    "goal": "portfolio",
    "preview": "video",
    "source": "github",
    "sourceUrl": "https://github.com/jianchang512/pyvideotrans",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub94.md",
    "content": {
      "zh": {
        "title": "pyVideoTrans 视频翻译",
        "summary": "把语音识别、字幕翻译与配音组织成视频翻译流程。",
        "sample": "jianchang512/pyvideotrans",
        "output": "字幕、配音与翻译后视频",
        "inputs": "视频文件、目标语言、识别和配音配置",
        "decisions": "核对字幕、声音与时间对齐；在线 API 费用由原服务决定",
        "model": "支持本地识别与多种在线 API，按原文档选择",
        "prompt": "翻译与配音配置在原项目中完成",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "jianchang512 维护，收录于 HelloGitHub 第 94 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/pyvideotrans.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "video2x",
    "category": "aigc",
    "subcategory": "video",
    "goal": "portfolio",
    "preview": "video",
    "source": "github",
    "sourceUrl": "https://github.com/k4yt3x/video2x",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub101.md",
    "content": {
      "zh": {
        "title": "Video2X 视频增强",
        "summary": "面向视频超分辨率与补帧的工具，用于已有视频的后期处理。",
        "sample": "k4yt3x/video2x",
        "output": "增强分辨率或补帧后的视频",
        "inputs": "原视频、兼容硬件与处理参数",
        "decisions": "选择增强模型和倍率，检查细节与运动伪影",
        "model": "按原项目的超分辨率与插帧模型配置",
        "prompt": "无需自然语言提示词；使用模型与视频参数",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "k4yt3x 维护，收录于 HelloGitHub 第 101 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/video2x.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "hugo-site",
    "category": "web",
    "subcategory": "personal-site",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/gohugoio/hugo",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub64.md",
    "content": {
      "zh": {
        "title": "Hugo 静态网站",
        "summary": "把内容与主题构建成静态网站，适合博客、个人站和内容站。",
        "sample": "gohugoio/hugo",
        "output": "可部署的静态网页",
        "inputs": "Markdown 内容、主题与站点配置",
        "decisions": "选择主题与发布方式，检查真实内容和导航",
        "model": "无需 AI 模型",
        "prompt": "无需提示词；内容与模板驱动构建",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "gohugoio 维护，收录于 HelloGitHub 第 64 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/hugo-site.webp",
    "coverNote": "原项目 README 内容排版 · GitGlow 版式"
  },
  {
    "slug": "docsify",
    "category": "web",
    "subcategory": "documentation",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/docsifyjs/docsify",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub89.md",
    "content": {
      "zh": {
        "title": "Docsify 文档站",
        "summary": "把 Markdown 文档组织成一个可浏览、可搜索的文档网站。",
        "sample": "docsifyjs/docsify",
        "output": "浏览器中的文档站点",
        "inputs": "README、Markdown 文档与配置",
        "decisions": "整理文档结构并选择插件",
        "model": "无需 AI 模型",
        "prompt": "无需提示词；以 Markdown 与配置组织内容",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "docsifyjs 维护，收录于 HelloGitHub 第 89 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/docsify.webp",
    "coverNote": "真实项目页面 · GitGlow 版式"
  },
  {
    "slug": "astro-starlight",
    "category": "web",
    "subcategory": "documentation",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/withastro/starlight",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub104.md",
    "content": {
      "zh": {
        "title": "Astro Starlight",
        "summary": "基于 Astro 的文档站工具，适合项目说明、教程与产品文档。",
        "sample": "withastro/starlight",
        "output": "文档页面与导航结构",
        "inputs": "项目文档、目录与 Astro 开发环境",
        "decisions": "确定内容层次与部署位置",
        "model": "无需 AI 模型",
        "prompt": "无需提示词；按官方文档配置站点",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "withastro 维护，收录于 HelloGitHub 第 104 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/astro-starlight.webp",
    "coverNote": "真实项目页面 · GitGlow 版式"
  },
  {
    "slug": "drawio",
    "category": "web",
    "subcategory": "applications",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/jgraph/drawio",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub61.md",
    "content": {
      "zh": {
        "title": "draw.io 图表工具",
        "summary": "用图形编辑器画流程图、架构图与项目说明，支持浏览器使用。",
        "sample": "jgraph/drawio",
        "output": "可编辑图表与导出文件",
        "inputs": "流程、架构或概念内容",
        "decisions": "选择合适图形并核对节点关系",
        "model": "核心绘图不需要 AI 模型",
        "prompt": "无需提示词；通过编辑器操作",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "jgraph 维护，收录于 HelloGitHub 第 61 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/drawio.webp",
    "coverNote": "原项目 README 内容排版 · GitGlow 版式"
  },
  {
    "slug": "ollama",
    "category": "github",
    "subcategory": "agents",
    "goal": "portfolio",
    "preview": "agent",
    "source": "github",
    "sourceUrl": "https://github.com/ollama/ollama",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub97.md",
    "content": {
      "zh": {
        "title": "Ollama 本地模型",
        "summary": "在自己的环境管理和运行语言模型，为个人工具提供模型接口。",
        "sample": "ollama/ollama",
        "output": "本地模型运行服务与对话接口",
        "inputs": "支持的模型、硬件与运行环境",
        "decisions": "选择符合硬件与许可的模型，核对数据处理范围",
        "model": "由用户选择和下载的模型决定",
        "prompt": "提示词由自己的应用提供；原仓库说明 API",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "ollama 维护，收录于 HelloGitHub 第 97 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/ollama.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "code2prompt",
    "category": "github",
    "subcategory": "automation",
    "goal": "portfolio",
    "preview": "agent",
    "source": "github",
    "sourceUrl": "https://github.com/mufeedvh/code2prompt",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub106.md",
    "content": {
      "zh": {
        "title": "Code2Prompt",
        "summary": "把代码仓库整理成模型能阅读的上下文，减少手动复制代码。",
        "sample": "mufeedvh/code2prompt",
        "output": "代码上下文、目录结构与提示词文本",
        "inputs": "自己的代码目录、过滤规则与模板",
        "decisions": "排除密钥、私密文件和无关目录后再交给模型",
        "model": "工具本身不调用模型；后续使用由用户决定",
        "prompt": "可用模板组织代码上下文与任务说明",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "mufeedvh 维护，收录于 HelloGitHub 第 106 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/code2prompt.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "ai-agents-for-beginners",
    "category": "github",
    "subcategory": "agents",
    "goal": "portfolio",
    "preview": "agent",
    "source": "github",
    "sourceUrl": "https://github.com/microsoft/ai-agents-for-beginners",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub108.md",
    "content": {
      "zh": {
        "title": "微软 AI Agent 入门",
        "summary": "通过课程与代码了解 Agent 的工具调用、设计模式和实现方法。",
        "sample": "microsoft/ai-agents-for-beginners",
        "output": "Agent 教程、示例源码与学习资料",
        "inputs": "Python 环境与课程所需配置",
        "decisions": "按课程理解原理，模型账号与费用自行确认",
        "model": "随课程与代码选择的供应商配置",
        "prompt": "课程中包含任务说明与 Agent 指令，查看原文档",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "microsoft 维护，收录于 HelloGitHub 第 108 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/ai-agents-for-beginners.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "hermes-agent",
    "category": "github",
    "subcategory": "agents",
    "goal": "portfolio",
    "preview": "agent",
    "source": "github",
    "sourceUrl": "https://github.com/NousResearch/hermes-agent",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub121.md",
    "content": {
      "zh": {
        "title": "Hermes Agent",
        "summary": "可自行部署的 Agent 项目，围绕工具、技能与持续使用组织工作。",
        "sample": "NousResearch/hermes-agent",
        "output": "Agent 程序、工具配置与任务记录",
        "inputs": "模型配置、运行环境与需要使用的工具",
        "decisions": "明确工具权限并核对任务执行结果",
        "model": "按用户选择的模型与供应商配置",
        "prompt": "按照原项目配置 Agent 指令和技能",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "NousResearch 维护，收录于 HelloGitHub 第 121 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/hermes-agent.webp",
    "coverNote": "真实项目页面 · GitGlow 版式"
  },
  {
    "slug": "plausible-analytics",
    "category": "business",
    "subcategory": "validation",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/plausible/analytics",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub52.md",
    "content": {
      "zh": {
        "title": "Plausible 网站分析",
        "summary": "通过网站分析了解真实访问来源和行为，为产品迭代提供依据。",
        "sample": "plausible/analytics",
        "output": "网站访问统计与分析看板",
        "inputs": "自己的站点与部署配置",
        "decisions": "选择需要观察的指标；托管服务与自部署成本另行核对",
        "model": "核心分析无需 AI 模型",
        "prompt": "无需提示词；用真实访问数据进行分析",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "plausible 维护，收录于 HelloGitHub 第 52 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/plausible-analytics.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "saleor-commerce",
    "category": "business",
    "subcategory": "services",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/saleor/saleor",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub72.md",
    "content": {
      "zh": {
        "title": "Saleor 电商引擎",
        "summary": "以 GraphQL 接口组织商品、购物与电商业务，适合开发自己的商店。",
        "sample": "saleor/saleor",
        "output": "电商后端与可连接的业务接口",
        "inputs": "商品资料、开发环境与业务配置",
        "decisions": "明确商品、履约与支付方案；项目卡不代开收款",
        "model": "核心电商能力无需 AI 模型",
        "prompt": "无需提示词；按 GraphQL API 和文档接入",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "saleor 维护，收录于 HelloGitHub 第 72 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/saleor-commerce.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "cordys-crm",
    "category": "business",
    "subcategory": "services",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/1Panel-dev/CordysCRM",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub116.md",
    "content": {
      "zh": {
        "title": "Cordys CRM",
        "summary": "围绕客户、线索与业务协作整理销售流程的开源 CRM。",
        "sample": "1Panel-dev/CordysCRM",
        "output": "客户管理与销售流程工作区",
        "inputs": "合法获得的客户资料与业务规则",
        "decisions": "定义团队权限、跟进阶段与数据范围",
        "model": "AI 能力需按项目文档配置；不声称 ANS 已接入",
        "prompt": "AI 配置与指令以原仓库为准",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "1Panel-dev 维护，收录于 HelloGitHub 第 116 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/cordys-crm.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "xiaoju-survey",
    "category": "business",
    "subcategory": "validation",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/didi/xiaoju-survey",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub104.md",
    "content": {
      "zh": {
        "title": "小桔问卷",
        "summary": "用问卷和表单收集真实反馈，适合产品调研、活动报名与需求验证。",
        "sample": "didi/xiaoju-survey",
        "output": "问卷、表单和回收结果",
        "inputs": "问题内容、目标受访者与部署配置",
        "decisions": "检查问题表达、隐私说明和结果解读",
        "model": "基础问卷无需模型；AI 功能自行配置",
        "prompt": "普通问卷由题目与规则定义；AI 设置见文档",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "didi 维护，收录于 HelloGitHub 第 104 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/xiaoju-survey.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "appflowy",
    "category": "productivity",
    "subcategory": "knowledge",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/AppFlowy-IO/AppFlowy",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub69.md",
    "content": {
      "zh": {
        "title": "AppFlowy",
        "summary": "把笔记、资料和任务放在自己的工作区，整理个人与团队知识。",
        "sample": "AppFlowy-IO/AppFlowy",
        "output": "笔记、任务和结构化资料",
        "inputs": "自己的文档、任务与使用环境",
        "decisions": "选择本地或协作方式，确认数据公开范围",
        "model": "基础整理无需模型；AI 依原项目配置",
        "prompt": "按原项目功能配置",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "AppFlowy-IO 维护，收录于 HelloGitHub 第 69 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/appflowy.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "affine",
    "category": "productivity",
    "subcategory": "collaboration",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/toeverything/AFFiNE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub87.md",
    "content": {
      "zh": {
        "title": "AFFiNE",
        "summary": "在文档与画布之间组织知识，把文字、结构和思考放在一个工作区。",
        "sample": "toeverything/AFFiNE",
        "output": "文档、画布与知识空间",
        "inputs": "笔记、图形和团队协作需求",
        "decisions": "确定组织方式、同步与分享范围",
        "model": "基础文档和画布无需模型；AI 另行配置",
        "prompt": "按原产品设置使用 AI；不预置 ANS 提示词",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "toeverything 维护，收录于 HelloGitHub 第 87 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/affine.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "memos",
    "category": "productivity",
    "subcategory": "knowledge",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/usememos/memos",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub83.md",
    "content": {
      "zh": {
        "title": "Memos 随手记录",
        "summary": "轻量记录想法与日常信息，用自己的内容积累可检索的笔记。",
        "sample": "usememos/memos",
        "output": "时间线笔记、标签与公开或私密记录",
        "inputs": "自己的文字与内容",
        "decisions": "确认每条记录的可见性与部署位置",
        "model": "无需 AI 模型",
        "prompt": "无需提示词；直接记录和组织内容",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "usememos 维护，收录于 HelloGitHub 第 83 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/memos.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "hedgedoc",
    "category": "productivity",
    "subcategory": "collaboration",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/hedgedoc/hedgedoc",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub108.md",
    "content": {
      "zh": {
        "title": "HedgeDoc 协作文档",
        "summary": "多人一起编辑 Markdown，把会议纪要、计划与文档保持同步。",
        "sample": "hedgedoc/hedgedoc",
        "output": "协作 Markdown 文档与分享页面",
        "inputs": "文档内容、部署环境与协作者",
        "decisions": "选择文档权限并核对共享链接",
        "model": "无需 AI 模型",
        "prompt": "无需提示词；通过 Markdown 编辑与协作",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "hedgedoc 维护，收录于 HelloGitHub 第 108 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/hedgedoc.webp",
    "coverNote": "真实项目页面 · GitGlow 版式"
  },
  {
    "slug": "plane-projects",
    "category": "competition",
    "subcategory": "delivery",
    "goal": "contest",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/makeplane/plane",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub98.md",
    "content": {
      "zh": {
        "title": "Plane 团队项目管理",
        "summary": "用工作项、周期和文档组织团队任务，适合比赛推进与版本交付。",
        "sample": "makeplane/plane",
        "output": "团队工作项、计划与项目文档",
        "inputs": "队伍、任务拆分与部署或原站账号",
        "decisions": "明确负责人和进度；不要把任务状态当作交付成果",
        "model": "基础管理不需要 AI 模型",
        "prompt": "无需提示词；通过工作项和文档管理项目",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "makeplane 维护，收录于 HelloGitHub 第 98 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/plane-projects.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "excalidraw",
    "category": "competition",
    "subcategory": "proposal",
    "goal": "contest",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/excalidraw/excalidraw",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub95.md",
    "content": {
      "zh": {
        "title": "Excalidraw 方案白板",
        "summary": "把想法画成流程与架构，适合团队讨论和参赛方案沟通。",
        "sample": "excalidraw/excalidraw",
        "output": "可编辑白板与导出的图形",
        "inputs": "问题、方案结构与协作者",
        "decisions": "检查图的逻辑与共享范围",
        "model": "基础绘图无需 AI 模型",
        "prompt": "无需提示词；直接用白板组织方案",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "excalidraw 维护，收录于 HelloGitHub 第 95 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/excalidraw.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "reveal-slides",
    "category": "competition",
    "subcategory": "pitch",
    "goal": "contest",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/hakimel/reveal.js",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub72.md",
    "content": {
      "zh": {
        "title": "reveal.js 路演幻灯片",
        "summary": "用 HTML 和 Web 技术制作演示文稿，把参赛项目整理成路演。",
        "sample": "hakimel/reveal.js",
        "output": "浏览器演示文稿",
        "inputs": "真实项目内容、图片与演示结构",
        "decisions": "控制页数与节奏，核对所有结论和数据",
        "model": "无需 AI 模型",
        "prompt": "无需提示词；使用 HTML 或 Markdown 组织页面",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "hakimel 维护，收录于 HelloGitHub 第 72 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/reveal-slides.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  },
  {
    "slug": "pptxgenjs",
    "category": "competition",
    "subcategory": "pitch",
    "goal": "contest",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/gitbrent/PptxGenJS",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub101.md",
    "content": {
      "zh": {
        "title": "PptxGenJS 演示文稿",
        "summary": "用 JavaScript 生成 PPTX，让真实项目资料形成可编辑的演示文件。",
        "sample": "gitbrent/PptxGenJS",
        "output": "可编辑 PPTX 文件",
        "inputs": "真实文字、图表、图片与 JavaScript 代码",
        "decisions": "检查信息层次、图表与字体兼容性",
        "model": "无需 AI 模型",
        "prompt": "无需提示词；幻灯片由代码和真实内容定义",
        "skill": "按仓库 README 安装与使用。",
        "sourceNote": "gitbrent 维护，收录于 HelloGitHub 第 101 期。"
      }
    },
    "coverUrl": "/catalog/gitglow-v1/pptxgenjs.webp",
    "coverNote": "原项目官方素材 · GitGlow 版式"
  }
] satisfies readonly CatalogEntry[];
