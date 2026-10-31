import type { CatalogEntry } from "@/contracts/catalog-content";

// Source-checked editorial entries. No execution or third-party media is implied.
export const CURATED_CATALOG_PROJECTS = [
  {
    "slug": "markmap",
    "category": "learning",
    "subcategory": "notes",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/markmap/markmap",
    "licenseUrl": "https://github.com/markmap/markmap/blob/master/LICENSE",
    "coverUrl": "/catalog/gitglow-v1/markmap.svg",
    "content": {
      "zh": {
        "title": "把复习提纲变成知识地图 · Markmap",
        "summary": "用 Markdown 标题与列表组织知识，生成可缩放、可折叠的思维导图。",
        "sample": "markmap/markmap",
        "output": "Markdown 原稿与交互式知识地图",
        "inputs": "自己的提纲、章节层级和关键概念",
        "decisions": "先检查概念关系，再选择分享范围",
        "model": "无需 AI 模型",
        "prompt": "按自己的目标组织真实内容，具体操作见本页上手步骤。",
        "skill": "使用官方操作指南，不需要安装 ANS Skill。",
        "sourceNote": "markmap/markmap · MIT 许可。"
      },
      "en": {
        "title": "Turn revision notes into an interactive mind map · Markmap",
        "summary": "Use Markdown headings and lists to create a zoomable, collapsible map.",
        "sample": "markmap/markmap",
        "output": "Markdown source and an interactive knowledge map",
        "inputs": "Your outline, chapter hierarchy and key concepts",
        "decisions": "Check concept relationships before choosing what to share",
        "model": "No AI model required",
        "prompt": "Use real content for your goal; follow the getting-started steps on this page.",
        "skill": "Use the official guide; no ANS Skill installation is required.",
        "sourceNote": "markmap/markmap · MIT license."
      }
    }
  },
  {
    "slug": "slidev",
    "category": "competition",
    "subcategory": "pitch",
    "goal": "contest",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/slidevjs/slidev",
    "licenseUrl": "https://github.com/slidevjs/slidev/blob/main/LICENSE",
    "coverUrl": "/catalog/gitglow-v1/slidev.svg",
    "content": {
      "zh": {
        "title": "把项目讲清楚的网页演示 · Slidev",
        "summary": "从 Markdown 制作路演，放入代码、图表和真实演示，再导出或发布网页。",
        "sample": "slidevjs/slidev",
        "output": "演示网页、Markdown 原稿与可导出文件",
        "inputs": "真实项目资料、演示截图和故事结构",
        "decisions": "决定每页讲什么，核对引用和数据",
        "model": "无需 AI 模型",
        "prompt": "按自己的目标组织真实内容，具体操作见本页上手步骤。",
        "skill": "使用官方操作指南，不需要安装 ANS Skill。",
        "sourceNote": "slidevjs/slidev · MIT 许可。"
      },
      "en": {
        "title": "A web presentation that explains your project · Slidev",
        "summary": "Create a Markdown pitch with code, diagrams and real demos, then export or publish it.",
        "sample": "slidevjs/slidev",
        "output": "Web slides, Markdown source and exportable files",
        "inputs": "Real project evidence, screenshots and narrative structure",
        "decisions": "Choose one point per slide and check sources and figures",
        "model": "No AI model required",
        "prompt": "Use real content for your goal; follow the getting-started steps on this page.",
        "skill": "Use the official guide; no ANS Skill installation is required.",
        "sourceNote": "slidevjs/slidev · MIT license."
      }
    }
  },
  {
    "slug": "penpot",
    "category": "competition",
    "subcategory": "proposal",
    "goal": "contest",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/penpot/penpot",
    "licenseUrl": "https://github.com/penpot/penpot/blob/develop/LICENSE",
    "coverUrl": "/catalog/gitglow-v1/penpot.svg",
    "content": {
      "zh": {
        "title": "让队友点得动你的产品想法 · Penpot",
        "summary": "画出产品界面、连接交互并分享原型，让讨论落在实际流程上。",
        "sample": "penpot/penpot",
        "output": "界面设计文件与可分享的点击原型",
        "inputs": "目标用户、核心任务、页面草图与自有素材",
        "decisions": "先决定一条关键路径，避免用装饰代替体验",
        "model": "基础设计无需 AI 模型",
        "prompt": "按自己的目标组织真实内容，具体操作见本页上手步骤。",
        "skill": "使用官方操作指南，不需要安装 ANS Skill。",
        "sourceNote": "penpot/penpot · MPL-2.0 许可；企业功能与服务另计。"
      },
      "en": {
        "title": "Let teammates click through your product idea · Penpot",
        "summary": "Design screens, connect interactions and share a prototype grounded in an actual user journey.",
        "sample": "penpot/penpot",
        "output": "Design file and a shareable clickable prototype",
        "inputs": "Target users, a core task, screen sketches and your assets",
        "decisions": "Prioritize one key journey before visual decoration",
        "model": "No model needed for basic design",
        "prompt": "Use real content for your goal; follow the getting-started steps on this page.",
        "skill": "Use the official guide; no ANS Skill installation is required.",
        "sourceNote": "penpot/penpot · MPL-2.0; enterprise features and services are separate."
      }
    }
  },
  {
    "slug": "stirling-pdf",
    "category": "productivity",
    "subcategory": "automation",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/Stirling-Tools/Stirling-PDF",
    "licenseUrl": "https://github.com/Stirling-Tools/Stirling-PDF/blob/main/LICENSE",
    "coverUrl": "/catalog/gitglow-v1/stirling-pdf.svg",
    "content": {
      "zh": {
        "title": "把零散 PDF 整理成一份能交的材料 · Stirling PDF",
        "summary": "合并、拆分、压缩或 OCR，把报名材料、扫描笔记与附件整理清楚。",
        "sample": "Stirling-Tools/Stirling-PDF",
        "output": "处理后的 PDF 文件",
        "inputs": "自己有权处理的 PDF、页序与目标大小",
        "decisions": "明确是否需要压缩、OCR 或脱敏，保留原件",
        "model": "常规 PDF 操作无需 AI 模型",
        "prompt": "按自己的目标组织真实内容，具体操作见本页上手步骤。",
        "skill": "使用官方操作指南，不需要安装 ANS Skill。",
        "sourceNote": "Stirling-Tools/Stirling-PDF · MIT 核心；LICENSE 指定目录采用各自许可。"
      },
      "en": {
        "title": "Turn scattered PDFs into a submission-ready packet · Stirling PDF",
        "summary": "Merge, split, compress or OCR applications, scanned notes and attachments.",
        "sample": "Stirling-Tools/Stirling-PDF",
        "output": "Processed PDF files",
        "inputs": "PDFs you are allowed to process, page order and size target",
        "decisions": "Choose compression, OCR or redaction needs and preserve originals",
        "model": "No AI model for standard PDF operations",
        "prompt": "Use real content for your goal; follow the getting-started steps on this page.",
        "skill": "Use the official guide; no ANS Skill installation is required.",
        "sourceNote": "Stirling-Tools/Stirling-PDF · MIT core; directories named in LICENSE have separate terms."
      }
    }
  },
  {
    "slug": "formbricks",
    "category": "business",
    "subcategory": "validation",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/formbricks/formbricks",
    "licenseUrl": "https://github.com/formbricks/formbricks/blob/main/LICENSE",
    "coverUrl": "/catalog/gitglow-v1/formbricks.svg",
    "content": {
      "zh": {
        "title": "给产品想法收一轮真实反馈 · Formbricks",
        "summary": "发布链接问卷，围绕真实使用问题收集反馈，为下一次修改找依据。",
        "sample": "formbricks/formbricks",
        "output": "问卷链接与真实回收结果",
        "inputs": "调研目的、具体问题和合适的受访者",
        "decisions": "避免诱导问题，决定收集哪些必要信息",
        "model": "普通链接问卷无需 AI 模型",
        "prompt": "按自己的目标组织真实内容，具体操作见本页上手步骤。",
        "skill": "使用官方操作指南，不需要安装 ANS Skill。",
        "sourceNote": "formbricks/formbricks · 核心 AGPL-3.0；企业目录采用单独许可。"
      },
      "en": {
        "title": "Collect real feedback for a product idea · Formbricks",
        "summary": "Publish a link survey about actual user problems and use responses to guide the next revision.",
        "sample": "formbricks/formbricks",
        "output": "Survey link and real responses",
        "inputs": "Research goal, focused questions and relevant respondents",
        "decisions": "Avoid leading questions and collect only necessary information",
        "model": "No model required for ordinary link surveys",
        "prompt": "Use real content for your goal; follow the getting-started steps on this page.",
        "skill": "Use the official guide; no ANS Skill installation is required.",
        "sourceNote": "formbricks/formbricks · AGPL-3.0 core; enterprise directories have separate terms."
      }
    }
  },
  {
    "slug": "actual-budget",
    "category": "productivity",
    "subcategory": "knowledge",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/actualbudget/actual",
    "licenseUrl": "https://github.com/actualbudget/actual/blob/master/LICENSE.txt",
    "coverUrl": "/catalog/gitglow-v1/actual-budget.svg",
    "content": {
      "zh": {
        "title": "给生活费安排一个可执行预算 · Actual Budget",
        "summary": "按分类安排现有资金，记录真实收支，让每月预算可以持续调整。",
        "sample": "actualbudget/actual",
        "output": "个人预算、账户和收支记录",
        "inputs": "真实账户余额、收支记录和自己的预算分类",
        "decisions": "只安排已经拥有的资金，选择数据保存方式",
        "model": "无需 AI 模型",
        "prompt": "按自己的目标组织真实内容，具体操作见本页上手步骤。",
        "skill": "使用官方操作指南，不需要安装 ANS Skill。",
        "sourceNote": "actualbudget/actual · MIT 许可。"
      },
      "en": {
        "title": "Make a workable budget for your living costs · Actual Budget",
        "summary": "Allocate available money into categories and track real income and expenses.",
        "sample": "actualbudget/actual",
        "output": "Personal budget, accounts and transaction records",
        "inputs": "Actual balances, transactions and your categories",
        "decisions": "Allocate money you already have and choose where data is stored",
        "model": "No AI model required",
        "prompt": "Use real content for your goal; follow the getting-started steps on this page.",
        "skill": "Use the official guide; no ANS Skill installation is required.",
        "sourceNote": "actualbudget/actual · MIT license."
      }
    }
  },
  {
    "slug": "linkwarden",
    "category": "learning",
    "subcategory": "research",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/linkwarden/linkwarden",
    "licenseUrl": "https://github.com/linkwarden/linkwarden/blob/main/LICENSE.md",
    "coverUrl": "/catalog/gitglow-v1/linkwarden.svg",
    "content": {
      "zh": {
        "title": "把研究链接收成能再找到的资料库 · Linkwarden",
        "summary": "按主题保存、标注和检索网页，并为可抓取内容保留截图或 PDF。",
        "sample": "linkwarden/linkwarden",
        "output": "分类链接库、注释与成功保存的网页副本",
        "inputs": "自己收集的公开链接、主题分类和简短笔记",
        "decisions": "确认资料来源与权限，不把归档成功当作长期备份保证",
        "model": "基础收藏无需模型；可选 AI 标签需另配",
        "prompt": "按自己的目标组织真实内容，具体操作见本页上手步骤。",
        "skill": "使用官方操作指南，不需要安装 ANS Skill。",
        "sourceNote": "linkwarden/linkwarden · AGPL-3.0 许可。"
      },
      "en": {
        "title": "Build a research library you can find again · Linkwarden",
        "summary": "Collect, annotate and search links by topic, with screenshots or PDFs when capture succeeds.",
        "sample": "linkwarden/linkwarden",
        "output": "Organized links, annotations and successfully captured copies",
        "inputs": "Public sources, topic categories and short notes",
        "decisions": "Check provenance and rights; capture is not a long-term backup guarantee",
        "model": "No model for bookmarks; optional AI tagging requires configuration",
        "prompt": "Use real content for your goal; follow the getting-started steps on this page.",
        "skill": "Use the official guide; no ANS Skill installation is required.",
        "sourceNote": "linkwarden/linkwarden · AGPL-3.0 license."
      }
    }
  },
  {
    "slug": "immich",
    "category": "productivity",
    "subcategory": "knowledge",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/immich-app/immich",
    "licenseUrl": "https://github.com/immich-app/immich/blob/main/LICENSE",
    "coverUrl": "/catalog/gitglow-v1/immich.svg",
    "content": {
      "zh": {
        "title": "给照片和视频建一个自己的相册 · Immich",
        "summary": "自部署照片库，整理拍摄素材并从手机备份到自己管理的服务器。",
        "sample": "immich-app/immich",
        "output": "自管理相册与照片视频库",
        "inputs": "有权保存的照片视频、存储空间和独立备份",
        "decisions": "先决定存储与恢复策略，再开启手机自动上传",
        "model": "内置智能能力依赖本地机器学习资源",
        "prompt": "按自己的目标组织真实内容，具体操作见本页上手步骤。",
        "skill": "使用官方操作指南，不需要安装 ANS Skill。",
        "sourceNote": "immich-app/immich · AGPL-3.0 许可。"
      },
      "en": {
        "title": "Create your own photo and video library · Immich",
        "summary": "Host a photo library and back up mobile media to a server you manage.",
        "sample": "immich-app/immich",
        "output": "Self-managed albums and a photo/video library",
        "inputs": "Media you may store, disk space and independent backups",
        "decisions": "Plan storage and recovery before enabling automatic uploads",
        "model": "Smart features consume local machine-learning resources",
        "prompt": "Use real content for your goal; follow the getting-started steps on this page.",
        "skill": "Use the official guide; no ANS Skill installation is required.",
        "sourceNote": "immich-app/immich · AGPL-3.0 license."
      }
    }
  },
  {
    "slug": "uptime-kuma",
    "category": "web",
    "subcategory": "applications",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/louislam/uptime-kuma",
    "licenseUrl": "https://github.com/louislam/uptime-kuma/blob/master/LICENSE",
    "coverUrl": "/catalog/gitglow-v1/uptime-kuma.svg",
    "content": {
      "zh": {
        "title": "知道自己的作品网站什么时候打不开 · Uptime Kuma",
        "summary": "监测网址可达性，配置故障通知，为自己的公开项目建立状态页。",
        "sample": "louislam/uptime-kuma",
        "output": "监测面板、故障通知与可选状态页",
        "inputs": "自己的网址、监测规则与通知接收渠道",
        "decisions": "决定检查什么以及故障后由谁处理",
        "model": "无需 AI 模型",
        "prompt": "按自己的目标组织真实内容，具体操作见本页上手步骤。",
        "skill": "使用官方操作指南，不需要安装 ANS Skill。",
        "sourceNote": "louislam/uptime-kuma · MIT 许可。"
      },
      "en": {
        "title": "Know when your project website is unavailable · Uptime Kuma",
        "summary": "Monitor a URL, configure failure notifications and optionally publish a status page.",
        "sample": "louislam/uptime-kuma",
        "output": "Monitoring dashboard, failure alerts and optional status page",
        "inputs": "Your URLs, monitoring rules and a notification destination",
        "decisions": "Choose what to check and who responds to a failure",
        "model": "No AI model required",
        "prompt": "Use real content for your goal; follow the getting-started steps on this page.",
        "skill": "Use the official guide; no ANS Skill installation is required.",
        "sourceNote": "louislam/uptime-kuma · MIT license."
      }
    }
  },
  {
    "slug": "docusaurus",
    "category": "web",
    "subcategory": "documentation",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/facebook/docusaurus",
    "licenseUrl": "https://github.com/facebook/docusaurus/blob/main/LICENSE",
    "coverUrl": "/catalog/gitglow-v1/docusaurus.svg",
    "content": {
      "zh": {
        "title": "给开源作品配一份认真写的使用说明 · Docusaurus",
        "summary": "把安装、教程和版本说明组织成文档网站，让别人真能用你的项目。",
        "sample": "facebook/docusaurus",
        "output": "文档网站、Markdown 原稿与构建文件",
        "inputs": "真实安装步骤、使用案例和版本说明",
        "decisions": "写清读者起点与适用版本，检查每一步链接",
        "model": "无需 AI 模型",
        "prompt": "按自己的目标组织真实内容，具体操作见本页上手步骤。",
        "skill": "使用官方操作指南，不需要安装 ANS Skill。",
        "sourceNote": "facebook/docusaurus · 代码 MIT；官方文档 CC-BY-4.0。"
      },
      "en": {
        "title": "Give your open-source project useful documentation · Docusaurus",
        "summary": "Organize installation, tutorials and release notes into a site people can actually use.",
        "sample": "facebook/docusaurus",
        "output": "Documentation website, Markdown and build output",
        "inputs": "Real installation steps, examples and release notes",
        "decisions": "State the reader prerequisites and supported version and check each link",
        "model": "No AI model required",
        "prompt": "Use real content for your goal; follow the getting-started steps on this page.",
        "skill": "Use the official guide; no ANS Skill installation is required.",
        "sourceNote": "facebook/docusaurus · MIT code; official documentation CC-BY-4.0."
      }
    }
  },
  {
    "slug": "open-webui",
    "category": "github",
    "subcategory": "agents",
    "goal": "portfolio",
    "preview": "agent",
    "source": "github",
    "sourceUrl": "https://github.com/open-webui/open-webui",
    "licenseUrl": "https://github.com/open-webui/open-webui/blob/main/LICENSE",
    "coverUrl": "/catalog/gitglow-v1/open-webui.svg",
    "content": {
      "zh": {
        "title": "给自己的模型和资料一个聊天工作区 · Open WebUI",
        "summary": "接入本地模型或兼容 API，在自己部署的界面中管理对话和资料。",
        "sample": "open-webui/open-webui",
        "output": "连接实际模型的聊天界面与个人知识资料",
        "inputs": "模型连接、自有文档、运行环境与权限设置",
        "decisions": "决定哪些数据发给外部模型，限制工具权限",
        "model": "需自行连接 Ollama 或 OpenAI 兼容 API",
        "prompt": "按自己的目标组织真实内容，具体操作见本页上手步骤。",
        "skill": "使用官方操作指南，不需要安装 ANS Skill。",
        "sourceNote": "open-webui/open-webui · Open WebUI License，含品牌保留条件；模型另有许可。"
      },
      "en": {
        "title": "A chat workspace for your own models and documents · Open WebUI",
        "summary": "Connect local models or compatible APIs and manage chats and documents in a self-hosted interface.",
        "sample": "open-webui/open-webui",
        "output": "Chat interface connected to real models and your knowledge documents",
        "inputs": "Model connection, your documents, runtime and permissions",
        "decisions": "Choose what reaches external models and limit tool permissions",
        "model": "Connect your own Ollama service or OpenAI-compatible API",
        "prompt": "Use real content for your goal; follow the getting-started steps on this page.",
        "skill": "Use the official guide; no ANS Skill installation is required.",
        "sourceNote": "open-webui/open-webui · Open WebUI License with branding conditions; models have separate terms."
      }
    }
  },
  {
    "slug": "mermaid-live",
    "category": "competition",
    "subcategory": "proposal",
    "goal": "contest",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/mermaid-js/mermaid-live-editor",
    "licenseUrl": "https://github.com/mermaid-js/mermaid-live-editor/blob/develop/LICENSE",
    "coverUrl": "/catalog/gitglow-v1/mermaid-live.svg",
    "content": {
      "zh": {
        "title": "用几行文字画清项目流程 · Mermaid Live Editor",
        "summary": "写流程图、时序图或甘特图，保留可修改源码，把方案说明放进文档。",
        "sample": "mermaid-js/mermaid-live-editor",
        "output": "图形与 Mermaid 文本源码",
        "inputs": "真实流程、参与者和步骤关系",
        "decisions": "选择合适图类型，删去无助于解释的节点",
        "model": "无需 AI 模型",
        "prompt": "按自己的目标组织真实内容，具体操作见本页上手步骤。",
        "skill": "使用官方操作指南，不需要安装 ANS Skill。",
        "sourceNote": "mermaid-js/mermaid-live-editor · MIT 许可。"
      },
      "en": {
        "title": "Explain a project flow with a few lines of text · Mermaid Live Editor",
        "summary": "Write flowcharts, sequence or Gantt diagrams, retain editable source and add them to docs.",
        "sample": "mermaid-js/mermaid-live-editor",
        "output": "Diagram and Mermaid text source",
        "inputs": "Real processes, participants and relationships",
        "decisions": "Choose an appropriate diagram type and remove irrelevant nodes",
        "model": "No AI model required",
        "prompt": "Use real content for your goal; follow the getting-started steps on this page.",
        "skill": "Use the official guide; no ANS Skill installation is required.",
        "sourceNote": "mermaid-js/mermaid-live-editor · MIT license."
      }
    }
  },
  {
    "slug": "diagram-design",
    "category": "github",
    "subcategory": "agents",
    "goal": "portfolio",
    "preview": "agent",
    "source": "github",
    "sourceUrl": "https://github.com/cathrynlavery/diagram-design",
    "licenseUrl": "https://github.com/cathrynlavery/diagram-design/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub127.md",
    "coverUrl": "/catalog/gitglow-v1/diagram-design.webp",
    "coverNote": "原项目示例图库截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "Diagram Design · 让 Agent 画好图",
        "summary": "装进 Agent 的画图技能：一句话出架构图、流程图，配色字体跟着你的品牌走。",
        "sample": "cathrynlavery/diagram-design",
        "output": "一个独立的 HTML + SVG 图表文件，45 种图表类型可选，可以直接截图放进作品集、比赛方案或文章。",
        "inputs": "一个支持 Agent Skills 的工具（Claude Code、Codex、Cursor 等）和 Node.js（用来跑 npx）。想用自己的配色，准备一个自己的网站地址。",
        "decisions": "做同款时要定三件事：画什么图（架构、流程、时序等 45 种里选）、用谁的品牌（给网址让它提取配色和字体）、放在哪里用（作品集、比赛 PPT 还是 README）。",
        "model": "用你的 Agent 当前在用的模型，技能本身不指定模型。",
        "prompt": "用 diagram-design 帮我画一张我比赛项目的系统架构图：前端、后端、数据库和 AI 接口四块，配色用我网站的颜色。",
        "skill": "1. npx skills add cathrynlavery/diagram-design（Claude Code 也可以用 /plugin marketplace add cathrynlavery/diagram-design）\n2. 对 Agent 说「onboard diagram-design to <你的网站>」，确认后配色就换成你的\n3. 直接让 Agent 画图；想先看效果，打开 skills/diagram-design/assets/index.html 示例图库",
        "sourceNote": "作者 Cathryn Lavery，MIT 许可。官方版本只在这个仓库发布。发现于 HelloGitHub 第 127 期。"
      },
      "en": {
        "title": "Diagram Design · Diagrams your agent draws well",
        "summary": "An agent skill that turns one sentence into architecture and flow diagrams in your brand's colors and fonts.",
        "sample": "cathrynlavery/diagram-design",
        "output": "A self-contained HTML + SVG diagram file, with 45 diagram types, ready for a portfolio, pitch deck or article.",
        "inputs": "A tool that reads Agent Skills (Claude Code, Codex, Cursor and others) and Node.js for npx. For your own palette, a website URL.",
        "decisions": "Decide what to draw (architecture, flow, sequence and more), whose brand to use (give a URL to extract colors and fonts) and where it will be used.",
        "model": "Uses whatever model your agent runs; the skill does not require a specific one.",
        "prompt": "Use diagram-design to draw the system architecture of my competition project: frontend, backend, database and AI API, in my website's colors.",
        "skill": "1. npx skills add cathrynlavery/diagram-design (or /plugin marketplace add cathrynlavery/diagram-design in Claude Code)\n2. Tell your agent \"onboard diagram-design to <your site>\" and approve the palette\n3. Ask for a diagram; to preview, open skills/diagram-design/assets/index.html",
        "sourceNote": "By Cathryn Lavery, MIT license. Official builds come only from this repository. Found in HelloGitHub issue 127."
      }
    }
  },
  {
    "slug": "word-atlas",
    "category": "learning",
    "subcategory": "methods",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/designfuchen/word-atlas",
    "licenseUrl": "https://github.com/designfuchen/word-atlas/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub127.md",
    "coverUrl": "/catalog/gitglow-v1/word-atlas.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "词光 · 一词一画背雅思",
        "summary": "看插画记单词，听英美发音，用间隔复习把 7298 个雅思词背牢。",
        "sample": "designfuchen/word-atlas",
        "output": "一个能在浏览器里用的背词网站：插画词卡、英美发音、每日计划、按话题组织的词汇星图，进度存在自己的设备上。",
        "inputs": "Node.js 20 以上和 npm。仓库带全部图片和录音，第一次下载会比较久。想换成自己的词库，要准备词条、例句、插画和录音。",
        "decisions": "做同款时主要换三样：词库（换成四六级、考研或专业词汇）、插画风格、复习节奏（FSRS 的目标记忆率可调）。界面和星图可以直接沿用。",
        "model": "使用应用本身不需要 AI 模型。原项目的释义、例句和插画用生成式 AI 制作，录音用 ElevenLabs；换词库时需要同类模型。",
        "prompt": "帮我把 word-atlas 跑起来，然后把词库换成四级词汇：保留插画词卡和星图，先做 50 个词试试效果。",
        "skill": "1. git clone --depth 1 https://github.com/designfuchen/word-atlas.git && cd word-atlas\n2. npm ci && npm run dev，打开 http://localhost:5188\n3. 读 docs/dataset.md 了解词条字段，再按 docs/pipeline.md 生成自己的词条",
        "sourceNote": "作者 designfuchen。代码和界面原创插画为 MIT，词库内容为 CC BY 4.0。原项目说明内容经过自动校验，尚未逐条人工审校。发现于 HelloGitHub 第 127 期。在线版独立迭代，功能和仓库可能不同。"
      },
      "en": {
        "title": "Word Atlas · Illustrated IELTS vocabulary",
        "summary": "Learn 7,298 IELTS words with illustrations, UK and US audio and spaced repetition.",
        "sample": "designfuchen/word-atlas",
        "output": "A browser vocabulary app: illustrated word cards, UK/US audio, a daily plan and a topic star map, with progress stored on your device.",
        "inputs": "Node.js 20+ and npm. The repository includes all images and audio, so the first download is large. For your own word list, prepare entries, examples, illustrations and audio.",
        "decisions": "Swap the word list (CET, graduate exams or subject vocabulary), the illustration style and the review target (FSRS retention is adjustable). The interface and star map can stay.",
        "model": "Using the app needs no AI model. The original definitions, examples and illustrations were AI-generated and audio uses ElevenLabs; a new word list needs similar models.",
        "prompt": "Help me run word-atlas, then replace the word list with CET-4 vocabulary: keep the illustrated cards and star map and try 50 words first.",
        "skill": "1. git clone --depth 1 https://github.com/designfuchen/word-atlas.git && cd word-atlas\n2. npm ci && npm run dev, then open http://localhost:5188\n3. Read docs/dataset.md for entry fields, then follow docs/pipeline.md to generate your own entries",
        "sourceNote": "By designfuchen. Code and original interface artwork are MIT; vocabulary content is CC BY 4.0. Content is automatically checked but not yet reviewed entry by entry. Found in HelloGitHub issue 127."
      }
    }
  },
  {
    "slug": "future-periodic-table",
    "category": "web",
    "subcategory": "applications",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/SeanWong17/Future-Style-Periodic-Table",
    "licenseUrl": "https://github.com/SeanWong17/Future-Style-Periodic-Table/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub127.md",
    "coverUrl": "/catalog/gitglow-v1/future-periodic-table.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "未来风元素周期表",
        "summary": "赛博朋克风的交互式元素周期表，点开元素能拖着转 3D 原子模型。",
        "sample": "SeanWong17/Future-Style-Periodic-Table",
        "output": "一个中英双语的周期表网页：118 种元素的数据卡片、原子半径和电负性等热力图、可旋转缩放的 3D 原子结构。",
        "inputs": "Node.js 20、22 或 24 以上（推荐 22），会一点 TypeScript 和 CSS 就能改。",
        "decisions": "做同款时可以换主题（换成别的学科的「表」，比如氨基酸表、星座表）、换配色（颜色集中在 CSS 变量里）、换热力图的指标。周期表网格和 3D 模型的写法可以直接参考。",
        "model": "不需要 AI 模型。",
        "prompt": "参考 Future-Style-Periodic-Table 的写法，帮我做一个同样风格的 20 种氨基酸交互表：网格布局、分类高亮、点开看 3D 结构。",
        "skill": "1. git clone https://github.com/SeanWong17/Future-Style-Periodic-Table.git && cd Future-Style-Periodic-Table\n2. npm install && npm run dev，打开 http://localhost:5173/\n3. 改 src/config/categories.ts 换分类和颜色，改 src/css/styles.css 换主题",
        "sourceNote": "作者 SeanWong17，MIT 许可。HelloGitHub 第 127 期和科技爱好者周刊第 383 期推荐过。"
      },
      "en": {
        "title": "Future-Style Periodic Table",
        "summary": "A cyberpunk interactive periodic table where each element opens a draggable 3D atom.",
        "sample": "SeanWong17/Future-Style-Periodic-Table",
        "output": "A bilingual periodic table site: data cards for 118 elements, heat maps for atomic radius, electronegativity and more, and rotatable 3D atomic structures.",
        "inputs": "Node.js 20, 22 or 24+ (22 recommended); a little TypeScript and CSS is enough to customise it.",
        "decisions": "Change the subject (an amino-acid or constellation table), the palette (colors live in CSS variables) or the heat-map metrics. Reuse the grid and 3D model approach.",
        "model": "No AI model required.",
        "prompt": "Following Future-Style-Periodic-Table, build an interactive table of the 20 amino acids in the same style: grid layout, category highlights and a 3D structure view.",
        "skill": "1. git clone https://github.com/SeanWong17/Future-Style-Periodic-Table.git && cd Future-Style-Periodic-Table\n2. npm install && npm run dev, then open http://localhost:5173/\n3. Edit src/config/categories.ts for categories and colors, and src/css/styles.css for the theme",
        "sourceNote": "By SeanWong17, MIT license. Featured in HelloGitHub issue 127 and Tech Enthusiast Weekly issue 383."
      }
    }
  }
] satisfies readonly CatalogEntry[];
