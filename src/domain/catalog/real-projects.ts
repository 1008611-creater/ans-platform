import type { CatalogEntry } from "@/contracts/catalog-content";

// Verified project sources; GitGlow layouts use real project material or project typography.
export const REAL_CATALOG_PROJECTS = [
  {
    "slug": "ans-ecommerce-outbound",
    "marketSlugs": ["ans-ecommerce-outbound-saas"],
    "category": "business",
    "subcategory": "services",
    "goal": "portfolio",
    "preview": "site",
    "source": "official",
    "sourceUrl": "https://waihu.cauai.fun",
    "content": {
      "zh": {
        "title": "ANS 电商智能外呼系统 · 全自动催付邀评与买家 360° 画像平台",
        "summary": "帮电商商家自动做未付款催付、物流异常提醒、签收后邀请评价和老客复购回访，内置买家价值分层与接听时段分析。",
        "sample": "waihu.cauai.fun",
        "output": "全天候自动执行拍下未付催付、签收晒图邀评、售后安抚挽单与大促老客召回；自动生成全店买家 360° 画像（5大价值分层 + 黄金接听时段锁定 + 高频退货号自动排集省话费）",
        "inputs": "支持 ANS (AI Never Stops) 账号一键登录，新商家默认零数据态配 4 步交互式新手引导，内置四大金牌客服声音在线试听与挂机利益点短信自动补发",
        "decisions": "先按新手引导试听四大金牌客服声音并启用场景触达规则，再结合买家 360° 价值分层与黄金接听时段发起精准外呼",
        "model": "内置四大金牌电商客服声音在线试听与实时对话演练。",
        "prompt": "内置 12 大电商全链路自动化触达话术模板，支持按店铺优惠券与利益点自由配置。",
        "skill": "进入系统即可通过 4 步新手引导快速上手，支持 ANS 账号一键登录。",
        "sourceNote": "ANS (AI Never Stops) 官方电商智能外呼与买家 360° 画像平台。"
      },
      "en": {
        "title": "ANS E-Commerce Outbound System · Automated Follow-Up & 360° Buyer Insights",
        "summary": "Automates unpaid order follow-ups, delivery alerts, review invitations, and repeat-buyer winback with built-in 360° buyer value segmentation and golden call-window analytics.",
        "sample": "waihu.cauai.fun",
        "output": "24/7 automated order payment reminders, review invitations, after-sales care, and 360° buyer segmentation (5 value tiers + golden call window + high-return filtering)",
        "inputs": "One-click ANS (AI Never Stops) sign-in, clean zero-data starter state with 4-step interactive onboarding, 4 customer service voices, and automatic follow-up SMS",
        "decisions": "Preview the 4 customer service voices, enable scenario rules, and launch targeted campaigns during peak answer windows",
        "model": "Includes 4 e-commerce customer service voices with live interactive call rehearsal.",
        "prompt": "Includes 12 full-lifecycle e-commerce outreach script templates customizable to store incentives.",
        "skill": "Sign in with your ANS account and follow the 4-step interactive onboarding guide.",
        "sourceNote": "Official ANS (AI Never Stops) e-commerce smart outbound and 360° buyer insight platform."
      }
    },
    "outerCoverUrl": "/catalog/ans-pro-v1/ans-ecommerce-outbound.webp",
    "coverUrl": "/catalog/gitglow-v1/ans-ecommerce-outbound.webp",
    "coverNote": "真实线上界面截图（waihu.cauai.fun）· GitGlow 双层浮窗版式"
  },
  {
    "slug": "ans-3d-showcase",
    "workflowSlugs": ["ans-portfolio-website"],
    "category": "web",
    "subcategory": "personal-site",
    "goal": "portfolio",
    "preview": "site",
    "source": "official",
    "sourceUrl": "https://ans.cauai.fun/showcase/ans-3d/index.html",
    "content": {
      "zh": {
        "title": "ANS × 小恐龙 3D 互动展示",
        "summary": "ANS 吉祥物小恐龙 3D 展厅：支持滚轮伴飞运镜、超微距贴脸表情、奇迹暖暖 3D 换装与鼠标悬停/点击碎碎念交互。",
        "sample": "ans.cauai.fun/showcase/ans-3d/index.html",
        "output": "小恐龙 3D 实时交互展厅、多章节滚轮运镜与线上产品亮点导览",
        "inputs": "鼠标滚轮控制章节与视角，鼠标悬停或点击小恐龙触发摸头、换装与碎碎念互动",
        "decisions": "基于 WebGL 实时渲染舞台叠加吉祥物骨骼动画、GLSL 表情着色器与微距镜头调度",
        "model": "浏览与互动无需消耗 AI 算力。",
        "prompt": "在 3D 个人网站工作流中替换个人文案与 3D 资产。",
        "skill": "进入项目即可直接滚动与点击体验。",
        "sourceNote": "ANS 官方互动展示项目。直接同源复用站内 3D 吉祥物资产。"
      },
      "en": {
        "title": "ANS × Little Dino 3D Interactive Showcase",
        "summary": "Interactive WebGL stage featuring the ANS mascot Little Dino with scroll-driven camera rig, macro facial expressions, 3D wardrobe, and hover/click chatter.",
        "sample": "ans.cauai.fun/showcase/ans-3d/index.html",
        "output": "Real-time Little Dino 3D interactive webpage, scroll camera rig, and live product tour",
        "inputs": "Scroll wheel controls chapters and camera; hover or click Little Dino to trigger head-pats and playful chatter",
        "decisions": "Combines a 3D showcase stage with mascot skeletal animation, GLSL expression shaders, and macro camera scheduling",
        "model": "Browsing and interacting require zero AI compute points.",
        "prompt": "Replace personal copy and 3D assets in the 3D Personal Website workflow.",
        "skill": "Open the project to scroll and interact immediately in your browser.",
        "sourceNote": "Official ANS interactive showcase reusing same-origin 3D mascot assets."
      }
    },
    "outerCoverUrl": "/catalog/ans-pro-v1/ans-3d-showcase.webp",
    "coverUrl": "/catalog/gitglow-v1/ans-3d-showcase.svg",
    "coverNote": "权威主风格（瑞士科技杂志轻3D屏幕风）× GitGlow 双封面 · ANS 小恐龙"
  },
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
        "title": "个人简历与作品集",
        "summary": "用真实经历、公开产品和作品建立个人展示网站。",
        "sample": "resume.cauai.fun/",
        "output": "公开个人介绍、产品目录与作品入口",
        "inputs": "浏览公开站点；制作自己的版本需准备真实经历与作品",
        "decisions": "以自己的真实内容重新设计，不复制他人经历",
        "model": "浏览与使用无需 AI 模型。",
        "prompt": "在项目中编辑内容与提示词。",
        "skill": "进入项目，按使用指南操作。",
        "sourceNote": "ANS 官方项目。功能与使用条件以项目页面为准。"
      },
      "en": {
        "title": "Personal Resume & Portfolio Website",
        "summary": "Build a personal showcase website powered by your real experience, public products, and featured works.",
        "sample": "resume.cauai.fun/",
        "output": "Public profile, product catalog, and interactive portfolio entry",
        "inputs": "Browse the live site; prepare your own experience and works to build your version",
        "decisions": "Redesign around your authentic experience rather than copying someone else's resume",
        "model": "No AI model compute required for browsing and local editing.",
        "prompt": "Edit content and structured prompts directly inside the studio.",
        "skill": "Open the project and follow the step-by-step guide.",
        "sourceNote": "Official ANS project. Features and usage terms follow the project page."
      }
    },
    "outerCoverUrl": "/catalog/ans-pro-v1/magic-resume.webp",
    "coverUrl": "/catalog/gitglow-v1/liu-resume.webp",
    "coverNote": "权威主风格（瑞士科技杂志轻3D屏幕风）× 双封面"
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
        "title": "Image2 提示词案例库",
        "summary": "先看真实来源图片，再研究提示词结构、保存和改写变体。",
        "sample": "image2.cauai.fun/",
        "output": "带来源的图片与提示词案例、收藏和创作入口",
        "inputs": "自己的创作方向与希望研究的案例",
        "decisions": "核对原作者与使用范围，再决定如何改写提示词",
        "model": "在项目中查看可用模型。",
        "prompt": "在项目中编辑内容与提示词。",
        "skill": "进入项目，按使用指南操作。",
        "sourceNote": "ANS 官方项目。功能与使用条件以项目页面为准。"
      },
      "en": {
        "title": "Image2 Prompt Case Library",
        "summary": "Inspect verified source images first, then study prompt structure, save favorites, and remix variations.",
        "sample": "image2.cauai.fun/",
        "output": "Provenance-backed image & prompt cases, collection tools, and creation entry",
        "inputs": "Your creative direction and reference cases you want to study",
        "decisions": "Verify original authorship and usage scope before adapting prompts",
        "model": "Check available image models inside the project.",
        "prompt": "Edit content and prompts inside the project.",
        "skill": "Open the project and follow the usage guide.",
        "sourceNote": "Official ANS project. Features and usage terms follow the project page."
      }
    },
    "outerCoverUrl": "/catalog/ans-pro-v1/image2-library.webp",
    "coverUrl": "/catalog/gitglow-v1/image2-library.webp",
    "coverNote": "权威主风格（瑞士科技杂志轻3D屏幕风）× GitGlow 双封面"
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
        "title": "VibePhoto · 趣味合影",
        "summary": "选真实地点和趣味角色，用自己的照片组织 AI 合影拍摄。",
        "sample": "zsm.cauai.fun/",
        "output": "原站的拍摄计划、生成图片与作品保存功能",
        "inputs": "自己的照片、玩法与地点；登录并核对原站开拍额度",
        "decisions": "确认拍摄计划后再生成；公开作品明确标注 AI 创作",
        "model": "在项目中查看可用模型。",
        "prompt": "在项目中编辑内容与提示词。",
        "skill": "进入项目，按使用指南操作。",
        "sourceNote": "ANS 官方项目。功能与使用条件以项目页面为准。"
      }
    },
    "outerCoverUrl": "/catalog/ans-pro-v1/vibephoto.webp",
    "coverUrl": "/catalog/gitglow-v1/vibephoto.webp",
    "coverNote": "Apple 柔和糖果色 3D 卡片风 × GitGlow 双封面"
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
        "title": "CAUAI 无限画布 · AIGC 工作台",
        "summary": "在可视化无限画布上统一组织素材、提示词、图像与视频生成步骤，连接自己的 AIGC 创作工作流。",
        "sample": "hb.cauai.fun/",
        "output": "AIGC 无限画布工作台与多模态素材组织界面",
        "inputs": "创作素材、想法与原站所需配置",
        "decisions": "明确素材用途和连接关系，生成前核对配置",
        "model": "在项目中查看可用模型。",
        "prompt": "在项目中编辑内容与提示词。",
        "skill": "进入项目，按使用指南操作。",
        "sourceNote": "ANS 官方项目。功能与使用条件以项目页面为准。"
      }
    },
    "outerCoverUrl": "/catalog/ans-pro-v1/infinite-canvas.webp",
    "coverUrl": "/catalog/gitglow-v1/infinite-canvas.webp",
    "coverNote": "ANS 漫画墨线解释图（独立开发者+小恐龙）× GitGlow 双封面"
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
        "title": "AI 商业视频服务",
        "summary": "通过真实服务目录了解产品广告、种草片与定制短片的交付方式。",
        "sample": "video.cauai.fun/",
        "output": "服务说明、案例与报价信息",
        "inputs": "真实商品、用途、交付规格和需求",
        "decisions": "先看案例，再联系确认报价和交付；ANS 未开放代收款",
        "model": "浏览与使用无需 AI 模型。",
        "prompt": "在项目中编辑内容与提示词。",
        "skill": "进入项目，按使用指南操作。",
        "sourceNote": "ANS 官方项目。功能与使用条件以项目页面为准。"
      }
    },
    "outerCoverUrl": "/catalog/ans-pro-v1/ai-video-services.webp",
    "coverUrl": "/catalog/gitglow-v1/ai-video-services.webp",
    "coverNote": "权威主风格（瑞士科技杂志轻3D屏幕风）× GitGlow 双封面"
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
    "coverNote": "GitGlow 项目专用封面"
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
