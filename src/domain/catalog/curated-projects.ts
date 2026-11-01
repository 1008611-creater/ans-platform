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
  },
  {
    "slug": "hyperframes",
    "category": "aigc",
    "subcategory": "video",
    "goal": "portfolio",
    "preview": "video",
    "source": "github",
    "sourceUrl": "https://github.com/heygen-com/hyperframes",
    "licenseUrl": "https://github.com/heygen-com/hyperframes/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub122.md",
    "coverUrl": "/catalog/gitglow-v1/hyperframes.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "HyperFrames · 用 HTML 写视频",
        "summary": "用 HTML、CSS 和动画写画面，渲染成 MP4；可以直接让 Agent 帮你做。",
        "sample": "heygen-com/hyperframes",
        "output": "一支 MP4 视频，画面、字幕、配乐都来自你写的 HTML 页面。",
        "inputs": "Node.js 和一个编程 Agent（Claude Code、Codex、Cursor 都行）。视频里要用的图片、视频片段和音乐自己准备。",
        "decisions": "做同款主要定三件事：视频讲什么（社团招新、课程作业、作品介绍），画面风格，时长和节奏。动画写法和渲染流程沿用原项目。",
        "model": "渲染本身不需要 AI 模型。让 Agent 写画面时，用你 Agent 自带的模型。",
        "prompt": "用 /hyperframes 帮我做一支 15 秒的社团招新视频：标题淡入，配三张活动照片，最后停在报名二维码上。",
        "skill": "1. 在视频项目目录运行 npx hyperframes skills update，给 Agent 装上技能\n2. 或者手动开始：npx hyperframes init my-video\n3. npx hyperframes preview 在浏览器里预览，npx hyperframes render 导出 MP4",
        "sourceNote": "HeyGen 开源，Apache-2.0 许可。官网 hyperframes.heygen.com 有 Studio 和 Playground。发现于 HelloGitHub 第 122 期。"
      },
      "en": {
        "title": "HyperFrames · Write HTML, render video",
        "summary": "Build frames with HTML, CSS and animation, then render an MP4; your agent can do it for you.",
        "sample": "heygen-com/hyperframes",
        "output": "An MP4 video whose frames, captions and music come from HTML you wrote.",
        "inputs": "Node.js and a coding agent (Claude Code, Codex or Cursor). Bring your own images, clips and music.",
        "decisions": "Decide what the video is about (club recruiting, a course project, a portfolio intro), the visual style, and length and pacing. Reuse the animation and rendering workflow.",
        "model": "Rendering needs no AI model. When an agent writes the frames, it uses its own model.",
        "prompt": "Using /hyperframes, make a 15-second club recruiting video: a fade-in title, three event photos, ending on the sign-up QR code.",
        "skill": "1. In your video folder run npx hyperframes skills update to give your agent the skills\n2. Or start by hand: npx hyperframes init my-video\n3. npx hyperframes preview to preview in the browser, npx hyperframes render to export MP4",
        "sourceNote": "Open-sourced by HeyGen under Apache-2.0. Studio and Playground are on hyperframes.heygen.com. Found in HelloGitHub issue 122."
      }
    }
  },
  {
    "slug": "hallmark",
    "category": "web",
    "subcategory": "personal-site",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/Nutlope/hallmark",
    "licenseUrl": "https://github.com/Nutlope/hallmark/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub124.md",
    "coverUrl": "/catalog/gitglow-v1/hallmark.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "Hallmark · 不像 AI 做的网页",
        "summary": "让 Agent 做网页时避开一眼 AI 味的套路，做出像设计师做的页面。",
        "sample": "Nutlope/hallmark",
        "output": "一个独立的 HTML 网页，带 50 套主题里选出的版式，并在浏览器里检查过不同屏幕宽度。",
        "inputs": "Node.js 18 以上和一个编程 Agent。浏览器检查还要装 Chrome 和 puppeteer-core。照片、截图和真实数字要自己提供，它不替你编。",
        "decisions": "做同款时你决定：页面给谁看、要访客做什么（报名、看作品、联系你），从三套候选主题里挑一套，或者说「custom」让它从头设计。",
        "model": "不自带模型，用你 Agent 自带的模型。",
        "prompt": "用 /hallmark 给我做一个个人作品集页面：放三个课程项目，每个配一张截图，页面最后是联系方式。",
        "skill": "1. npx skills add nutlope/hallmark -g\n2. 在 Agent 里说出你要的页面，让它从三套主题里挑\n3. 已有页面可以用 /hallmark audit ./index.html 只检查不改",
        "sourceNote": "Together AI 出品，MIT 许可。50 套主题在 usehallmark.com 能看到。发现于 HelloGitHub 第 124 期。"
      },
      "en": {
        "title": "Hallmark · Web pages that don't look AI-made",
        "summary": "Helps your agent avoid the usual AI-generated tells and build pages that feel designed.",
        "sample": "Nutlope/hallmark",
        "output": "A self-contained HTML page in one of 50 themes, checked in a real browser at several widths.",
        "inputs": "Node.js 18+ and a coding agent. Browser checks also need Chrome and puppeteer-core. Bring your own photos, screenshots and real numbers; it will not invent them.",
        "decisions": "Decide who the page is for and what visitors should do (sign up, see your work, contact you), then pick one of three suggested themes or say \"custom\".",
        "model": "No built-in model; uses your agent's model.",
        "prompt": "Using /hallmark, build a portfolio page with three course projects, one screenshot each, ending with my contact details.",
        "skill": "1. npx skills add nutlope/hallmark -g\n2. Describe the page to your agent and pick one of the three themes\n3. For an existing page, /hallmark audit ./index.html reports without changing it",
        "sourceNote": "By Together AI, MIT license. All 50 themes are on usehallmark.com. Found in HelloGitHub issue 124."
      }
    }
  },
  {
    "slug": "anatomy",
    "category": "github",
    "subcategory": "creative-tools",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/wheresryan22/anatomy",
    "licenseUrl": "https://github.com/wheresryan22/anatomy/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub127.md",
    "coverUrl": "/catalog/gitglow-v1/anatomy.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "Anatomy · 把概念画成会动的机器",
        "summary": "让 Agent 把一个技术概念做成一台会动的等距小机器，用来讲清它怎么工作。",
        "sample": "wheresryan22/anatomy",
        "output": "一张能交互的网页插图：几十个小零件拼成的机械装置，鼠标划过会动，带标题和实时读数。",
        "inputs": "一个编程 Agent（Claude Code、Codex、OpenCode 等）和 Node.js。不用 API Key，也不用 npm install。",
        "decisions": "做同款最关键的是选概念：挑一个你课上学过、别人觉得抽象的概念（比如缓存、限流、电路），说清要不要能交互。机器长什么样让 Agent 自己想。",
        "model": "不自带模型，用你 Agent 自带的模型。",
        "prompt": "/anatomy 用一台会动的机器解释「TCP 三次握手」，要能交互，适合放进课程汇报。",
        "skill": "1. npx skills add wheresryan22/anatomy -g\n2. 在 Claude Code 里输入 /anatomy 加你要讲的概念\n3. 看 examples/ 里的样例页面找灵感",
        "sourceNote": "作者 wheresryan22，MIT 许可。在线图库 skills.wheresryan.sh/anatomy。发现于 HelloGitHub 第 127 期。"
      },
      "en": {
        "title": "Anatomy · Explain a concept as a working machine",
        "summary": "Your agent turns a technical idea into a small isometric machine that shows how it works.",
        "sample": "wheresryan22/anatomy",
        "output": "An interactive illustration: a machine built from dozens of small parts that moves under the pointer, with a title and live readout.",
        "inputs": "A coding agent (Claude Code, Codex, OpenCode and others) and Node.js. No API key and no npm install.",
        "decisions": "The key choice is the concept: pick something from your courses that others find abstract (caching, rate limiting, circuits) and say whether it should be interactive. Let the agent invent the machine.",
        "model": "No built-in model; uses your agent's model.",
        "prompt": "/anatomy explain the TCP three-way handshake as a working machine, interactive, for a course presentation.",
        "skill": "1. npx skills add wheresryan22/anatomy -g\n2. In Claude Code type /anatomy plus the concept\n3. Browse examples/ for ideas",
        "sourceNote": "By wheresryan22, MIT license. Gallery at skills.wheresryan.sh/anatomy. Found in HelloGitHub issue 127."
      }
    }
  },
  {
    "slug": "kami",
    "category": "career",
    "subcategory": "resume",
    "goal": "career",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/tw93/Kami",
    "licenseUrl": "https://github.com/tw93/Kami/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub122.md",
    "coverUrl": "/catalog/gitglow-v1/kami.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "Kami · 能打印的好排版",
        "summary": "给 Agent 一套排版规则和模板，把简历、一页纸介绍、信件做成像样的 PDF。",
        "sample": "tw93/Kami",
        "output": "排好版的 PDF、PNG 或可编辑的 PPT：简历、一页纸、报告、推荐信、幻灯片等八种模板。",
        "inputs": "一个编程 Agent。Windows 要在 WSL 里用。内容（经历、数据、文字）自己准备。",
        "decisions": "做同款时你决定：用哪种模板（简历、一页纸、作品集），放哪些内容，中文还是英文。排版规则沿用原项目。",
        "model": "不自带模型，用你 Agent 自带的模型。",
        "prompt": "用 /kami 把我这份经历整理成一页中文简历 PDF，突出两个项目和一次比赛获奖。",
        "skill": "1. npx skills add tw93/kami -a claude-code codex cursor -g -y\n2. 在 Agent 里输入 /kami 加你的需求\n3. 缺中文字体时运行 skills/kami/scripts/ensure-fonts.sh",
        "sourceNote": "作者 tw93，MIT 许可。官网 kami.tw93.fun 有八种格式的样张。发现于 HelloGitHub 第 122 期。"
      },
      "en": {
        "title": "Kami · Layouts worth printing",
        "summary": "Gives your agent layout rules and templates for resumes, one-pagers and letters as polished PDFs.",
        "sample": "tw93/Kami",
        "output": "Laid-out PDF, PNG or editable PowerPoint: eight templates including resume, one-pager, report, letter and slides.",
        "inputs": "A coding agent. On Windows, use WSL. Bring your own content.",
        "decisions": "Choose the template (resume, one-pager, portfolio), the content and the language. Reuse the layout rules.",
        "model": "No built-in model; uses your agent's model.",
        "prompt": "Using /kami, turn my experience into a one-page resume PDF that highlights two projects and a competition award.",
        "skill": "1. npx skills add tw93/kami -a claude-code codex cursor -g -y\n2. Type /kami plus your request in your agent\n3. If CJK fonts are missing, run skills/kami/scripts/ensure-fonts.sh",
        "sourceNote": "By tw93, MIT license. Samples in eight formats on kami.tw93.fun. Found in HelloGitHub issue 122."
      }
    }
  },
  {
    "slug": "gitfut",
    "category": "career",
    "subcategory": "portfolio",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/Younesfdj/gitfut",
    "licenseUrl": "https://github.com/Younesfdj/gitfut/blob/master/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub124.md",
    "coverUrl": "/catalog/gitglow-v1/gitfut.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "GitFut · 把 GitHub 做成球星卡",
        "summary": "读你的 GitHub 数据，给你打分，做成一张足球球星卡。",
        "sample": "Younesfdj/gitfut",
        "output": "一张会随数据更新的球星卡图片和一页球探报告，可以贴进个人主页或 GitHub 简介。",
        "inputs": "直接用：打开 gitfut.com 输入用户名。自己改一版：Node.js、一个 GitHub Token（项目用它读 GraphQL API）。",
        "decisions": "做同款主要换两样：数据来源（换成刷题记录、运动数据、B 站数据），以及六项属性怎么从数据算出来。卡片样式可以沿用。",
        "model": "不需要 AI 模型。",
        "prompt": "帮我把 gitfut 跑起来，然后把六项属性换成我的 LeetCode 数据：做题数、通过率、连续打卡天数。",
        "skill": "1. 打开 https://gitfut.com/你的用户名 看自己的卡\n2. git clone https://github.com/Younesfdj/gitfut && cd gitfut && npm install\n3. 按 CONTRIBUTING.md 配好 GITHUB_TOKEN，再 npm run dev",
        "sourceNote": "作者 Younesfdj，MIT 许可。发现于 HelloGitHub 第 124 期。"
      },
      "en": {
        "title": "GitFut · Your GitHub as a football card",
        "summary": "Reads your GitHub data, rates it and turns it into a football player card.",
        "sample": "Younesfdj/gitfut",
        "output": "A card image that updates with your stats and a scout report page, ready for your profile README.",
        "inputs": "To use it: open gitfut.com and enter a username. To build your own: Node.js and a GitHub token (it reads the GraphQL API).",
        "decisions": "Swap the data source (coding practice, workouts, video stats) and how the six attributes are calculated. The card style can stay.",
        "model": "No AI model required.",
        "prompt": "Help me run gitfut, then change the six attributes to my LeetCode data: problems solved, acceptance rate and streak.",
        "skill": "1. Open https://gitfut.com/your-username to see your card\n2. git clone https://github.com/Younesfdj/gitfut && cd gitfut && npm install\n3. Set GITHUB_TOKEN as in CONTRIBUTING.md, then npm run dev",
        "sourceNote": "By Younesfdj, MIT license. Found in HelloGitHub issue 124."
      }
    }
  },
  {
    "slug": "ian-xiaohei-illustrations",
    "category": "aigc",
    "subcategory": "image",
    "goal": "portfolio",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/helloianneo/ian-xiaohei-illustrations",
    "licenseUrl": "https://github.com/helloianneo/ian-xiaohei-illustrations/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub125.md",
    "coverUrl": "/catalog/gitglow-v1/ian-xiaohei-illustrations.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "小黑配图 · 给文章画手绘解释图",
        "summary": "让 Agent 读懂你的文章，挑出关键观点，画成白底手绘的 16:9 配图。",
        "sample": "helloianneo/ian-xiaohei-illustrations",
        "output": "一篇文章的 4–8 张配图规划，和最终的 PNG 配图：白底、黑色手绘线、小黑角色、少量红橙蓝中文批注。",
        "inputs": "Codex 和能生图的模型。要配图的中文文章自己准备。",
        "decisions": "做同款可以换掉主角和画风：把「小黑」换成你自己的角色，把白底手绘换成你喜欢的风格。先只做配图规划，看满意再生图。",
        "model": "需要能生成图片的模型，原项目在 Codex 里使用。",
        "prompt": "Use $ian-xiaohei-illustrations 先不要生图，分析这篇文章哪里值得配图，给我 5 张图的规划。",
        "skill": "1. git clone https://github.com/helloianneo/ian-xiaohei-illustrations.git\n2. 把 ian-xiaohei-illustrations 目录复制到 ~/.codex/skills/\n3. 在 Codex 里用 $ian-xiaohei-illustrations 加你的文章",
        "sourceNote": "作者 Ian（helloianneo），MIT 许可。原项目说明样例图只用来校准风格，不是构图模板。发现于 HelloGitHub 第 125 期。"
      },
      "en": {
        "title": "Xiaohei Illustrations · Hand-drawn explainers for articles",
        "summary": "Your agent reads your article, picks the key ideas and draws them as white, hand-drawn 16:9 illustrations.",
        "sample": "helloianneo/ian-xiaohei-illustrations",
        "output": "An illustration plan of 4–8 shots for one article and the final PNGs: white background, black hand-drawn lines, the Xiaohei character and a few red, orange and blue Chinese notes.",
        "inputs": "Codex and an image-generation model. Bring your own Chinese article.",
        "decisions": "Swap the character and style: replace Xiaohei with your own character and the hand-drawn look with one you like. Plan first, generate when you are happy.",
        "model": "Needs an image-generation model; the original runs in Codex.",
        "prompt": "Use $ian-xiaohei-illustrations without generating images yet: find where this article needs illustrations and give me a plan for 5.",
        "skill": "1. git clone https://github.com/helloianneo/ian-xiaohei-illustrations.git\n2. Copy the ian-xiaohei-illustrations folder into ~/.codex/skills/\n3. In Codex use $ian-xiaohei-illustrations with your article",
        "sourceNote": "By Ian (helloianneo), MIT license. The sample images calibrate the style and are not composition templates. Found in HelloGitHub issue 125."
      }
    }
  },
  {
    "slug": "effective-html",
    "category": "github",
    "subcategory": "creative-tools",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/plannotator/effective-html",
    "licenseUrl": "https://github.com/plannotator/effective-html/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub125.md",
    "coverUrl": "/catalog/gitglow-v1/effective-html.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "Effective HTML · 用 HTML 画原型和图",
        "summary": "八个技能，教 Agent 用一个 HTML 文件做线框图、可交互原型、计划和一页纸。",
        "sample": "plannotator/effective-html",
        "output": "单个能直接打开的 HTML 文件：低保真线框图、带交互的原型、路线图或一页纸说明。",
        "inputs": "一个编程 Agent。也可以不装，直接把仓库当参考资料给 Agent 看。",
        "decisions": "做同款时你决定做哪一种：给课程项目画原型，给小组讲计划，还是做一页纸汇报。内容和页面结构自己定。",
        "model": "不自带模型，用你 Agent 自带的模型。",
        "prompt": "用 html-prototype 技能，给我的「二手教材交换」小程序做一个能点的原型：首页、发布页、详情页。",
        "skill": "1. npx skills add plannotator/effective-html\n2. 按需求选技能：html-wireframe 画线框，html-prototype 做原型，one-pager 做一页纸\n3. 用浏览器打开生成的 HTML 文件",
        "sourceNote": "plannotator 出品，MIT 许可。使用指南在 effectivehtml.com。发现于 HelloGitHub 第 125 期。"
      },
      "en": {
        "title": "Effective HTML · Prototypes and diagrams in HTML",
        "summary": "Eight skills that teach your agent to make wireframes, working prototypes, plans and one-pagers as a single HTML file.",
        "sample": "plannotator/effective-html",
        "output": "One HTML file you can open directly: a low-fidelity wireframe, an interactive prototype, a roadmap or a one-pager.",
        "inputs": "A coding agent. You can also skip installing and hand the repository to your agent as reference.",
        "decisions": "Choose the kind of artifact: a prototype for a course project, a plan for your team or a one-page recap. You decide the content and structure.",
        "model": "No built-in model; uses your agent's model.",
        "prompt": "Using html-prototype, build a clickable prototype of my textbook-swap app: home, post and detail pages.",
        "skill": "1. npx skills add plannotator/effective-html\n2. Pick a skill: html-wireframe for wireframes, html-prototype for prototypes, one-pager for a one-pager\n3. Open the generated HTML in your browser",
        "sourceNote": "By plannotator, MIT license. Guide at effectivehtml.com. Found in HelloGitHub issue 125."
      }
    }
  },
  {
    "slug": "manimgx",
    "category": "aigc",
    "subcategory": "video",
    "goal": "portfolio",
    "preview": "video",
    "source": "github",
    "sourceUrl": "https://github.com/academa-labs/manimgx",
    "licenseUrl": "https://github.com/academa-labs/manimgx/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub127.md",
    "coverUrl": "/catalog/gitglow-v1/manimgx.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "ManimGX · 快速做数学动画",
        "summary": "用 Python 写数学和 3D 动画，渲染成视频，写法和 Manim 一样。",
        "sample": "academa-labs/manimgx",
        "output": "一支 1080p60 的 MP4 动画，可以是 2D 公式推导，也可以是 3D 几何。",
        "inputs": "Python 3.13 以上，pip install manimgx。字体、排版和视频编码已经包含在内。",
        "decisions": "做同款主要定题目：挑一道你想讲清楚的数学或物理题，决定分几步展示、镜头怎么转。代码写法沿用 Manim CE。",
        "model": "渲染不需要 AI 模型。让 Agent 写动画代码时，用你 Agent 自带的模型。",
        "prompt": "Follow https://manimgx.academa.ai/llms.txt。安装 ManimGX，做一个讲清「勾股定理」的 20 秒动画并打开它。",
        "skill": "1. pip install manimgx\n2. 照官网 Quickstart 写一个 scene.py\n3. manimgx render scene.py 得到 MP4",
        "sourceNote": "academa-labs 出品，MIT 许可。性能对比数据见仓库 benchmarks 目录。发现于 HelloGitHub 第 127 期。"
      },
      "en": {
        "title": "ManimGX · Fast math animations",
        "summary": "Write math and 3D animations in Python and render them to video, using the Manim API.",
        "sample": "academa-labs/manimgx",
        "output": "A 1080p60 MP4 animation: a 2D derivation or 3D geometry.",
        "inputs": "Python 3.13+ and pip install manimgx. Fonts, typesetting and video encoding are included.",
        "decisions": "Pick the topic: a math or physics problem you want to explain, how many steps to show and how the camera moves. Code follows the Manim CE API.",
        "model": "Rendering needs no AI model. When an agent writes the code, it uses its own model.",
        "prompt": "Follow https://manimgx.academa.ai/llms.txt. Install ManimGX, make a 20-second animation explaining the Pythagorean theorem and open it.",
        "skill": "1. pip install manimgx\n2. Write a scene.py following the Quickstart\n3. manimgx render scene.py to get an MP4",
        "sourceNote": "By academa-labs, MIT license. Benchmark data is in the repository's benchmarks folder. Found in HelloGitHub issue 127."
      }
    }
  },
  {
    "slug": "god-agent-town",
    "category": "github",
    "subcategory": "agents",
    "goal": "portfolio",
    "preview": "agent",
    "source": "github",
    "sourceUrl": "https://github.com/XiaoLuoLYG/GOD",
    "licenseUrl": "https://github.com/XiaoLuoLYG/GOD/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub123.md",
    "coverUrl": "/catalog/gitglow-v1/god-agent-town.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "GOD · 当一座 AI 小镇的神",
        "summary": "看一群 AI 居民在小镇里生活，可以暂停、提问、改变下一步。",
        "sample": "XiaoLuoLYG/GOD",
        "output": "一座能回放、能干预的 AI 智能体小镇，还能导出别人可以重跑的实验包。",
        "inputs": "先看效果：打开公开站点看回放，不用安装和 API Key。本地跑：一个兼容 OpenAI 接口的模型 API Key、地址和模型名。",
        "decisions": "做同款主要换居民和地图：把居民换成你的同学、室友或小说角色，设计他们的性格和关系，再换一张校园地图。",
        "model": "本地跑需要兼容 OpenAI 接口的大模型。浏览器回放不需要。",
        "prompt": "帮我把 GOD 跑起来，然后把小镇居民换成一个宿舍的 6 个同学，每人写一句性格设定。",
        "skill": "1. 打开 https://xiaoluolyg.github.io/GOD/ 看回放\n2. git clone https://github.com/XiaoLuoLYG/GOD.git && cd GOD\n3. ./scripts/god.sh start，按向导填模型信息",
        "sourceNote": "作者 XiaoLuoLYG，Apache-2.0 许可，论文入选 EMNLP 2026 系统演示。原项目说明它用来观察语言模型智能体，不代表真实社会。发现于 HelloGitHub 第 123 期。"
      },
      "en": {
        "title": "GOD · Be the god of an AI town",
        "summary": "Watch AI residents live in a town, and pause, question or change their next step.",
        "sample": "XiaoLuoLYG/GOD",
        "output": "A replayable AI agent town you can steer, plus experiment packs others can rerun.",
        "inputs": "To look: open the public site for replays, no install or API key. To run locally: an OpenAI-compatible API key, base URL and model name.",
        "decisions": "Swap the residents and the map: make them your classmates, roommates or novel characters, write their personalities and relationships, and use a campus map.",
        "model": "Running locally needs an OpenAI-compatible model. Browser replays need none.",
        "prompt": "Help me run GOD, then replace the residents with six roommates, each with a one-line personality.",
        "skill": "1. Open https://xiaoluolyg.github.io/GOD/ to watch replays\n2. git clone https://github.com/XiaoLuoLYG/GOD.git && cd GOD\n3. ./scripts/god.sh start and fill in your model in the wizard",
        "sourceNote": "By XiaoLuoLYG, Apache-2.0 license; accepted to the EMNLP 2026 System Demonstrations track. The project says it is for inspecting language-agent societies, not for claiming social realism. Found in HelloGitHub issue 123."
      }
    }
  },
  {
    "slug": "ai-engineering-from-scratch",
    "category": "learning",
    "subcategory": "methods",
    "goal": "career",
    "preview": "code",
    "source": "github",
    "sourceUrl": "https://github.com/rohitg00/ai-engineering-from-scratch",
    "licenseUrl": "https://github.com/rohitg00/ai-engineering-from-scratch/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub122.md",
    "coverUrl": "/catalog/gitglow-v1/ai-engineering-from-scratch.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "从零学 AI 工程",
        "summary": "542 节课、20 个阶段，从开发环境一路学到模型原理、检索和 Agent。",
        "sample": "rohitg00/ai-engineering-from-scratch",
        "output": "跟着课程写出来的代码和实验结果：从向量运算到检索流程、Agent 运行时，每节都能跑。",
        "inputs": "Python 3。可以在网站上学，也可以克隆到本地跑代码。部分课程需要 GPU 或云服务。",
        "decisions": "做同款时你决定走哪条路线、做哪个项目挑战，把结果整理成自己的学习作品集。",
        "model": "前面的课不需要 AI 模型；Agent 相关的课程会调用 OpenAI、Anthropic 等接口。",
        "prompt": "我是大二学生，会一点 Python。帮我从 ai-engineering-from-scratch 里排一条四周的学习路线，最后做一个检索问答小项目。",
        "skill": "1. 打开 aiengineeringfromscratch.com 开始第一课\n2. git clone https://github.com/rohitg00/ai-engineering-from-scratch.git && cd ai-engineering-from-scratch\n3. python3 phases/00-setup-and-tooling/01-dev-environment/code/verify.py --route beginner 检查环境",
        "sourceNote": "作者 rohitg00，MIT 许可，有简体中文版。发现于 HelloGitHub 第 122 期。"
      },
      "en": {
        "title": "AI Engineering from Scratch",
        "summary": "542 lessons in 20 phases, from dev setup to model internals, retrieval and agents.",
        "sample": "rohitg00/ai-engineering-from-scratch",
        "output": "Code and results from the course: from vector maths to retrieval pipelines and agent runtimes, every lesson runnable.",
        "inputs": "Python 3. Learn on the website or clone and run locally. Some lessons need a GPU or cloud service.",
        "decisions": "Choose a learning route and a project challenge, and turn the results into your own learning portfolio.",
        "model": "Early lessons need no AI model; agent lessons call APIs such as OpenAI and Anthropic.",
        "prompt": "I'm a second-year student who knows some Python. Plan a four-week route through ai-engineering-from-scratch ending in a small retrieval Q&A project.",
        "skill": "1. Start the first lesson on aiengineeringfromscratch.com\n2. git clone https://github.com/rohitg00/ai-engineering-from-scratch.git && cd ai-engineering-from-scratch\n3. python3 phases/00-setup-and-tooling/01-dev-environment/code/verify.py --route beginner to check your setup",
        "sourceNote": "By rohitg00, MIT license, with a Simplified Chinese version. Found in HelloGitHub issue 122."
      }
    }
  },
  {
    "slug": "text-to-cad",
    "category": "github",
    "subcategory": "creative-tools",
    "goal": "contest",
    "preview": "code",
    "source": "github",
    "sourceUrl": "https://github.com/earthtojake/text-to-cad",
    "licenseUrl": "https://github.com/earthtojake/text-to-cad/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub123.md",
    "coverUrl": "/catalog/gitglow-v1/text-to-cad.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "text-to-cad · 一句话做 CAD 模型",
        "summary": "让 Agent 写 Python 脚本生成 3D 零件，导出 STEP、STL 等文件，能直接 3D 打印。",
        "sample": "earthtojake/text-to-cad",
        "output": "可以打印或加工的 3D 模型文件（STEP、GLB、STL、3MF），还有可制造性检查和工程图。",
        "inputs": "一个支持插件或技能的 Agent（Claude Code、Codex、Cursor 等）。安装脚本会自动装好 uv。",
        "decisions": "做同款时你决定做什么零件、尺寸多少、用什么方式加工（3D 打印、钣金、CNC）。适合课程设计和比赛样机。",
        "model": "不自带模型，用你 Agent 自带的模型。",
        "prompt": "帮我做一个手机支架的 CAD 模型：底座 80×60 毫米，倾角 60 度，导出 STL 用来 3D 打印。",
        "skill": "1. macOS / Linux 运行 curl -fsSL https://texttocad.dev/install.sh | sh\n2. 在 Agent 里描述你要的零件\n3. 在 CAD 预览里看模型，满意后导出文件",
        "sourceNote": "作者 earthtojake，MIT 许可。官网 texttocad.dev。发现于 HelloGitHub 第 123 期。"
      },
      "en": {
        "title": "text-to-cad · CAD models from a sentence",
        "summary": "Your agent writes Python that builds 3D parts and exports STEP, STL and more, ready to print.",
        "sample": "earthtojake/text-to-cad",
        "output": "Printable or machinable 3D files (STEP, GLB, STL, 3MF), plus manufacturability checks and engineering drawings.",
        "inputs": "An agent that supports plugins or skills (Claude Code, Codex, Cursor and others). The installer sets up uv for you.",
        "decisions": "Decide the part, its dimensions and how it will be made (3D printing, sheet metal, CNC). Good for course design projects and competition prototypes.",
        "model": "No built-in model; uses your agent's model.",
        "prompt": "Make a CAD model of a phone stand: 80×60 mm base, 60-degree tilt, exported as STL for 3D printing.",
        "skill": "1. On macOS / Linux run curl -fsSL https://texttocad.dev/install.sh | sh\n2. Describe the part to your agent\n3. Check it in the CAD viewer and export the files",
        "sourceNote": "By earthtojake, MIT license. Site: texttocad.dev. Found in HelloGitHub issue 123."
      }
    }
  },
  {
    "slug": "tiny-world-builder",
    "category": "web",
    "subcategory": "applications",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/jasonkneen/tiny-world-builder",
    "licenseUrl": "https://github.com/jasonkneen/tiny-world-builder/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub123.md",
    "coverUrl": "/catalog/gitglow-v1/tiny-world-builder.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "Tiny World Builder · 浏览器里搭小世界",
        "summary": "在浏览器里搭一个 3D 体素小世界：放地形、房子、庄稼和动物，还能飞进去看。",
        "sample": "jasonkneen/tiny-world-builder",
        "output": "一个能在浏览器里编辑和浏览的 3D 体素世界，可以保存、导出、分享给别人。",
        "inputs": "在线版直接打开 tinyworld.build。本地跑要 Node.js，也可以直接用浏览器打开 index.html。",
        "decisions": "做同款主要换主题：把小镇换成你的校园、宿舍楼或家乡，换掉道具和配色。编辑器可以沿用。",
        "model": "不需要 AI 模型。",
        "prompt": "帮我把 tiny-world-builder 跑起来，加一组校园道具：教学楼、操场和食堂，然后搭一个迷你校园。",
        "skill": "1. 打开 https://tinyworld.build 先玩一下\n2. git clone https://github.com/jasonkneen/tiny-world-builder.git && cd tiny-world-builder\n3. npm run dev，打开 http://localhost:3000/tiny-world-builder",
        "sourceNote": "作者 jasonkneen，AGPL-3.0 许可：改版公开部署时也要开源。发现于 HelloGitHub 第 123 期。"
      },
      "en": {
        "title": "Tiny World Builder · Build a tiny world in the browser",
        "summary": "Build a 3D voxel world in your browser: terrain, houses, crops and animals, then fly through it.",
        "sample": "jasonkneen/tiny-world-builder",
        "output": "A 3D voxel world you can edit and explore in the browser, then save, export and share.",
        "inputs": "The live version is at tinyworld.build. Locally you need Node.js, or just open index.html.",
        "decisions": "Change the theme: make it your campus, dorm or hometown with your own props and colours. The editor stays.",
        "model": "No AI model required.",
        "prompt": "Help me run tiny-world-builder, add campus props (a teaching building, a sports field, a canteen) and build a mini campus.",
        "skill": "1. Play at https://tinyworld.build\n2. git clone https://github.com/jasonkneen/tiny-world-builder.git && cd tiny-world-builder\n3. npm run dev and open http://localhost:3000/tiny-world-builder",
        "sourceNote": "By jasonkneen, AGPL-3.0 license: a publicly deployed remix must also be open source. Found in HelloGitHub issue 123."
      }
    }
  },
  {
    "slug": "open-design",
    "category": "github",
    "subcategory": "creative-tools",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/nexu-io/open-design",
    "licenseUrl": "https://github.com/nexu-io/open-design/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub122.md",
    "coverUrl": "/catalog/gitglow-v1/open-design.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "OpenDesign · 开源的 AI 设计工作台",
        "summary": "写一段需求，让 Agent 按你的设计规范做出可分享的原型。",
        "sample": "nexu-io/open-design",
        "output": "按设计规范生成的界面原型，可以和别人协作修改、分享。",
        "inputs": "直接用云端版，或者本地部署：Docker，或者 Node 24 加 pnpm 10。需要一个编程 Agent 或模型额度。",
        "decisions": "做同款时你决定：给哪个项目出设计（社团小程序、课程作业），定一套自己的颜色和字体规范。",
        "model": "可以接你已有的编程 Agent，也可以用云端提供的多种模型。",
        "prompt": "用 OpenDesign 给我的「自习室占座」小程序出三个页面原型：首页、选座、我的预约，风格简洁。",
        "skill": "1. git clone https://github.com/nexu-io/open-design.git\n2. cd open-design/deploy && docker compose up -d\n3. 或者开发模式：cd open-design && corepack enable && pnpm install && pnpm tools-dev run web",
        "sourceNote": "nexu-io 出品，Apache-2.0 许可。云端版收费，开源版可以自己部署。发现于 HelloGitHub 第 122 期。"
      },
      "en": {
        "title": "OpenDesign · Open-source AI design workspace",
        "summary": "Write a brief and let an agent build shareable prototypes that follow your design system.",
        "sample": "nexu-io/open-design",
        "output": "Interface prototypes that follow a design system, which you can share and edit with others.",
        "inputs": "Use the cloud version, or self-host with Docker or Node 24 plus pnpm 10. Needs a coding agent or model credits.",
        "decisions": "Decide what to design (a club mini-app, a course project) and set your own colour and type rules.",
        "model": "Connects to your existing coding agent or to the cloud's models.",
        "prompt": "Use OpenDesign to make three prototype screens for my study-room booking app: home, seat picker and my bookings, in a clean style.",
        "skill": "1. git clone https://github.com/nexu-io/open-design.git\n2. cd open-design/deploy && docker compose up -d\n3. Or dev mode: cd open-design && corepack enable && pnpm install && pnpm tools-dev run web",
        "sourceNote": "By nexu-io, Apache-2.0 license. The cloud version is paid; the open-source version can be self-hosted. Found in HelloGitHub issue 122."
      }
    }
  },
  {
    "slug": "impeccable",
    "category": "github",
    "subcategory": "creative-tools",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/pbakaus/impeccable",
    "licenseUrl": "https://github.com/pbakaus/impeccable/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub127.md",
    "coverUrl": "/catalog/gitglow-v1/impeccable.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "Impeccable · 让 AI 做的界面更有品味",
        "summary": "给编程 Agent 一套设计词汇，还能扫出页面里的「AI 味」问题。",
        "sample": "pbakaus/impeccable",
        "output": "改过一版的界面，和一份按 62 条规则扫出来的问题清单。",
        "inputs": "Node.js 和一个编程 Agent。扫描线上页面要装 Chrome 或 Edge。",
        "decisions": "做同款时拿你自己的作品页或课程项目来改：先 critique 看问题，再用 polish、bolder 调方向。",
        "model": "检查规则不需要 AI 模型；改界面时用你 Agent 自带的模型。",
        "prompt": "用 /impeccable critique 看看我的个人主页哪里像 AI 做的，再帮我改一版。",
        "skill": "1. 在项目根目录运行 npx impeccable install\n2. 重启 Agent，运行 /impeccable init\n3. npx impeccable detect src/ 扫描代码里的问题",
        "sourceNote": "作者 pbakaus，Apache-2.0 许可。文档在 impeccable.style/docs。发现于 HelloGitHub 第 127 期。"
      },
      "en": {
        "title": "Impeccable · Better taste for AI-built interfaces",
        "summary": "Gives your coding agent a design vocabulary and scans pages for AI-generated tells.",
        "sample": "pbakaus/impeccable",
        "output": "A revised interface plus a list of issues found by 62 deterministic rules.",
        "inputs": "Node.js and a coding agent. Scanning live pages needs Chrome or Edge.",
        "decisions": "Use your own portfolio or course project: run critique first, then steer with polish and bolder.",
        "model": "The detector needs no AI model; changes use your agent's model.",
        "prompt": "Use /impeccable critique to find what makes my homepage look AI-made, then revise it.",
        "skill": "1. In your project root run npx impeccable install\n2. Reload your agent and run /impeccable init\n3. npx impeccable detect src/ to scan your code",
        "sourceNote": "By pbakaus, Apache-2.0 license. Docs at impeccable.style/docs. Found in HelloGitHub issue 127."
      }
    }
  },
  {
    "slug": "openmontage",
    "category": "aigc",
    "subcategory": "video",
    "goal": "portfolio",
    "preview": "video",
    "source": "github",
    "sourceUrl": "https://github.com/calesthio/OpenMontage",
    "licenseUrl": "https://github.com/calesthio/OpenMontage/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub124.md",
    "coverUrl": "/catalog/gitglow-v1/openmontage.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "OpenMontage · 让 Agent 当视频工作室",
        "summary": "用大白话描述你要的视频，Agent 负责找素材、写脚本、剪辑和合成。",
        "sample": "calesthio/OpenMontage",
        "output": "一支剪好的视频：可以用免费素材库的真实镜头，也可以接入生图、生视频服务。",
        "inputs": "Python 和 make。API Key 是可选的，接得越多能用的工具越多，比如 Pexels、Pixabay 的免费素材。",
        "decisions": "做同款时你决定：视频主题、时长、用免费素材还是生成画面。适合做课程汇报片或社团宣传片。",
        "model": "可选接入生图、生视频、配乐服务，各自需要对应的 API Key；只用免费素材也能做。",
        "prompt": "帮我用 OpenMontage 做一支 30 秒的校园秋天短片，只用免费素材，配轻音乐。",
        "skill": "1. git clone https://github.com/calesthio/OpenMontage.git && cd OpenMontage\n2. make setup\n3. 在 .env 里填需要的 API Key，然后在 Agent 里描述你的视频",
        "sourceNote": "作者 calesthio，AGPL-3.0 许可：改版公开部署时也要开源。发现于 HelloGitHub 第 124 期。"
      },
      "en": {
        "title": "OpenMontage · Your agent as a video studio",
        "summary": "Describe the video in plain words; your agent researches, scripts, gathers assets, edits and composes it.",
        "sample": "calesthio/OpenMontage",
        "output": "An edited video: real footage from free stock libraries, or generated images and video if you connect those services.",
        "inputs": "Python and make. API keys are optional; more keys unlock more tools, such as free stock from Pexels and Pixabay.",
        "decisions": "Decide the topic, length and whether to use free footage or generated visuals. Good for course presentations or club promos.",
        "model": "Optional image, video and music services each need their own API key; free footage alone works too.",
        "prompt": "Use OpenMontage to make a 30-second autumn-on-campus video with free footage only and light music.",
        "skill": "1. git clone https://github.com/calesthio/OpenMontage.git && cd OpenMontage\n2. make setup\n3. Add the API keys you need to .env, then describe your video to your agent",
        "sourceNote": "By calesthio, AGPL-3.0 license: a publicly deployed remix must also be open source. Found in HelloGitHub issue 124."
      }
    }
  },
  {
    "slug": "how-to-live-better",
    "category": "web",
    "subcategory": "documentation",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/eternity4719/HowToLiveBetter",
    "licenseUrl": "https://github.com/eternity4719/HowToLiveBetter/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub127.md",
    "coverUrl": "/catalog/gitglow-v1/how-to-live-better.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "高性价比人生指南",
        "summary": "767 条生活建议，每条写明花什么、换什么、证据多硬，可以在线检索。",
        "sample": "eternity4719/HowToLiveBetter",
        "output": "一本能在线检索的指南网站，也有 PDF 和 EPUB；还带一个让 AI 照书回答的技能。",
        "inputs": "直接看：打开在线检索页。自己做一版：Python（本地预览）和 Node.js（生成 EPUB）。",
        "decisions": "做同款主要换内容：写一本你自己的「大学生存指南」「新生手册」或专业入门指南，沿用它的条目格式和证据分级。",
        "model": "看书不需要 AI 模型。书里的 AI 技能支持 Claude Code 和 Codex。",
        "prompt": "参考 HowToLiveBetter 的条目格式，帮我写一本新生入学指南：先列 20 条，每条写清花什么、换什么、依据是什么。",
        "skill": "1. 打开 https://eternity4719.github.io/HowToLiveBetter/\n2. git clone https://github.com/eternity4719/HowToLiveBetter.git && cd HowToLiveBetter\n3. python -m http.server 8000 本地预览",
        "sourceNote": "作者 eternity4719。正文用 CC BY 4.0：可以转载、改编、商用，但要写明出处。原项目说明内容可能过时或有错，法律、医疗问题以当地部门和专业人士为准。发现于 HelloGitHub 第 127 期。"
      },
      "en": {
        "title": "A Cost-Effective Guide to Life",
        "summary": "767 pieces of advice, each stating what it costs, what you get and how strong the evidence is, searchable online.",
        "sample": "eternity4719/HowToLiveBetter",
        "output": "A searchable guide website plus PDF and EPUB, and a skill that lets an AI answer from the book.",
        "inputs": "To read: open the online search page. To make your own: Python for local preview and Node.js for EPUB.",
        "decisions": "Swap the content: write your own campus survival guide, freshman handbook or subject primer, reusing its entry format and evidence grades.",
        "model": "Reading needs no AI model. The book's AI skill supports Claude Code and Codex.",
        "prompt": "Following HowToLiveBetter's entry format, help me write a freshman guide: 20 entries first, each with what it costs, what you get and the source.",
        "skill": "1. Open https://eternity4719.github.io/HowToLiveBetter/\n2. git clone https://github.com/eternity4719/HowToLiveBetter.git && cd HowToLiveBetter\n3. python -m http.server 8000 to preview locally",
        "sourceNote": "By eternity4719. Text is CC BY 4.0: you may share, adapt and use commercially with attribution. The project notes content may be outdated or wrong; follow local authorities and professionals on legal and medical matters. Found in HelloGitHub issue 127."
      }
    }
  },
  {
    "slug": "ai-agent-book",
    "category": "learning",
    "subcategory": "methods",
    "goal": "career",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/bojieli/ai-agent-book",
    "licenseUrl": "https://github.com/bojieli/ai-agent-book/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub124.md",
    "coverUrl": "/catalog/gitglow-v1/ai-agent-book.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "深入理解 AI Agent（开源书）",
        "summary": "一本讲 AI Agent 设计原理和工程实践的中文书，每章配可以运行的实验。",
        "sample": "bojieli/ai-agent-book",
        "output": "读完一章就能跑通对应实验，最后做出自己的 Agent。书有在线版、PDF 和 EPUB。",
        "inputs": "在线阅读不用准备。跑实验要 Python 和 uv，大部分实验要至少一个模型服务商的 API Key。",
        "decisions": "做同款时你决定从哪章开始、做哪个实验，把实验改成自己关心的场景（比如课程答疑 Agent）。",
        "model": "大部分实验要调用模型 API，少数支持本地 Ollama。",
        "prompt": "我想做一个课程答疑 Agent。帮我从《深入理解 AI Agent》里挑出最相关的两章，按书里的实验搭一个最小版本。",
        "skill": "1. 打开 https://bojieli.github.io/ai-agent-book/astro/ 在线阅读\n2. git clone https://github.com/bojieli/ai-agent-book.git && cd ai-agent-book\n3. uv sync --locked --extra ch1 && uv run python chapter1/context/main.py",
        "sourceNote": "作者 bojieli，Apache-2.0 许可。发现于 HelloGitHub 第 124 期。"
      },
      "en": {
        "title": "Understanding AI Agents (open-source book)",
        "summary": "A Chinese book on AI agent design and engineering, with runnable experiments in every chapter.",
        "sample": "bojieli/ai-agent-book",
        "output": "Finish a chapter and run its experiment, then build your own agent. Online, PDF and EPUB editions.",
        "inputs": "Online reading needs nothing. Experiments need Python and uv, and most need at least one model provider API key.",
        "decisions": "Choose where to start and which experiment to do, and adapt it to a scenario you care about, such as a course Q&A agent.",
        "model": "Most experiments call model APIs; a few support local Ollama.",
        "prompt": "I want a course Q&A agent. Pick the two most relevant chapters of Understanding AI Agents and build a minimal version from their experiments.",
        "skill": "1. Read online at https://bojieli.github.io/ai-agent-book/astro/\n2. git clone https://github.com/bojieli/ai-agent-book.git && cd ai-agent-book\n3. uv sync --locked --extra ch1 && uv run python chapter1/context/main.py",
        "sourceNote": "By bojieli, Apache-2.0 license. Found in HelloGitHub issue 124."
      }
    }
  },
  {
    "slug": "train-llm-from-scratch",
    "category": "learning",
    "subcategory": "research",
    "goal": "career",
    "preview": "code",
    "source": "github",
    "sourceUrl": "https://github.com/FareedKhan-dev/train-llm-from-scratch",
    "licenseUrl": "https://github.com/FareedKhan-dev/train-llm-from-scratch/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub123.md",
    "coverUrl": "/catalog/gitglow-v1/train-llm-from-scratch.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "从零训练一个大语言模型",
        "summary": "用 PyTorch 从头实现 Transformer，在笔记本 CPU 上几分钟就能训练出一个小模型。",
        "sample": "FareedKhan-dev/train-llm-from-scratch",
        "output": "一个你自己训练的小语言模型，能写短故事；有 GPU 的话可以训练更大的版本。",
        "inputs": "Python 和 pip。不需要 GPU 就能开始，大一点的模型用免费的 Colab 或 Kaggle T4 就行。",
        "decisions": "做同款主要换数据：把 TinyStories 换成你自己的语料（诗歌、课程笔记、某位作家的文章），看模型学成什么样。",
        "model": "不调用外部模型，所有模型都是你自己训练的。",
        "prompt": "帮我跑通 train-llm-from-scratch 的笔记本 CPU 版本，然后把训练数据换成唐诗，训练一个会写诗的小模型。",
        "skill": "1. git clone https://github.com/FareedKhan-dev/train-llm-from-scratch.git && cd train-llm-from-scratch && pip install -e .\n2. python scripts/prepare_tiny_data.py\n3. python scripts/train_transformer.py --preset tiny --arch modern，约 5 分钟后用 generate_text.py 写故事",
        "sourceNote": "作者 FareedKhan-dev，MIT 许可。发现于 HelloGitHub 第 123 期。"
      },
      "en": {
        "title": "Train an LLM from Scratch",
        "summary": "Implement a Transformer in PyTorch from scratch and train a small model on a laptop CPU in minutes.",
        "sample": "FareedKhan-dev/train-llm-from-scratch",
        "output": "A small language model you trained yourself that writes short stories; bigger versions with a GPU.",
        "inputs": "Python and pip. No GPU needed to start; a free Colab or Kaggle T4 handles the larger models.",
        "decisions": "Swap the data: replace TinyStories with your own corpus (poems, course notes, an author's essays) and see what the model learns.",
        "model": "No external model; every model is one you train.",
        "prompt": "Help me run the laptop CPU track of train-llm-from-scratch, then retrain on Tang poems to get a small poem-writing model.",
        "skill": "1. git clone https://github.com/FareedKhan-dev/train-llm-from-scratch.git && cd train-llm-from-scratch && pip install -e .\n2. python scripts/prepare_tiny_data.py\n3. python scripts/train_transformer.py --preset tiny --arch modern, then write a story with generate_text.py after about 5 minutes",
        "sourceNote": "By FareedKhan-dev, MIT license. Found in HelloGitHub issue 123."
      }
    }
  },
  {
    "slug": "echo-loop",
    "category": "learning",
    "subcategory": "methods",
    "goal": "portfolio",
    "preview": "code",
    "source": "github",
    "sourceUrl": "https://github.com/echo-loop/Echo-Loop",
    "licenseUrl": "https://github.com/echo-loop/Echo-Loop/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub123.md",
    "coverUrl": "/catalog/gitglow-v1/echo-loop.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "Echo Loop · 英语听说训练",
        "summary": "导入一段英语音频，按精听、跟读、盲听、复述一步步练，系统自动安排复习。",
        "sample": "echo-loop/Echo-Loop",
        "output": "一个英语听说训练 App：逐句精听、难句解析、跟读、复述和间隔复习。",
        "inputs": "直接用：从官网下载 App。自己改一版：Flutter 开发环境。",
        "decisions": "做同款主要换练习材料和节奏：换成四六级、雅思或专业英语音频，调整训练步骤和复习间隔。",
        "model": "部分 AI 功能调用大模型服务，需要付费会员；本地离线转录字幕要先下载模型。",
        "prompt": "帮我把 Echo-Loop 跑起来，然后把默认练习流程改成适合四级听力的版本：去掉复述，加一轮做题。",
        "skill": "1. 从 www.echo-loop.top 下载 App 体验\n2. git clone https://github.com/echo-loop/Echo-Loop.git && cd Echo-Loop && flutter pub get\n3. flutter run 选择 iOS 或 Android 设备",
        "sourceNote": "由中央民族大学外国语学院杨艳老师指导设计，AGPL-3.0 许可：改版公开发布时也要开源。发现于 HelloGitHub 第 123 期。"
      },
      "en": {
        "title": "Echo Loop · English listening and speaking practice",
        "summary": "Import English audio and work through intensive listening, shadowing, blind listening and retelling, with reviews scheduled for you.",
        "sample": "echo-loop/Echo-Loop",
        "output": "An English listening and speaking app: sentence-by-sentence listening, hard-sentence analysis, shadowing, retelling and spaced review.",
        "inputs": "To use: download the app from the website. To build your own: a Flutter environment.",
        "decisions": "Swap the material and the rhythm: use CET, IELTS or subject English audio and adjust the training steps and review intervals.",
        "model": "Some AI features call model services and need a paid membership; offline transcription downloads a model first.",
        "prompt": "Help me run Echo-Loop, then change the default flow for CET-4 listening: drop retelling and add a round of questions.",
        "skill": "1. Download the app from www.echo-loop.top\n2. git clone https://github.com/echo-loop/Echo-Loop.git && cd Echo-Loop && flutter pub get\n3. flutter run and pick an iOS or Android device",
        "sourceNote": "Designed under the guidance of Yang Yan, School of Foreign Languages, Minzu University of China. AGPL-3.0 license: a publicly released remix must also be open source. Found in HelloGitHub issue 123."
      }
    }
  },
  {
    "slug": "shiguang-schedule",
    "category": "productivity",
    "subcategory": "knowledge",
    "goal": "portfolio",
    "preview": "code",
    "source": "github",
    "sourceUrl": "https://github.com/ShiGuangSchedule/shiguangschedule",
    "licenseUrl": "https://github.com/ShiGuangSchedule/shiguangschedule/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub123.md",
    "coverUrl": "/catalog/gitglow-v1/shiguang-schedule.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "拾光课程表",
        "summary": "面向国内高校的课程表，能通过适配脚本从教务系统导入课表。",
        "sample": "ShiGuangSchedule/shiguangschedule",
        "output": "一个课程表 App：今日课表、周课表、桌面小组件和深色模式，支持 Android 和电脑。",
        "inputs": "Android 8.0 以上的手机，或者 Windows、macOS、Linux 电脑。改代码要 Compose Multiplatform 开发环境。",
        "decisions": "做同款最直接的是给自己学校写适配：让课表能从你们学校的教务系统一键导入，再按学校作息调整时间。",
        "model": "不需要 AI 模型。",
        "prompt": "帮我看懂拾光课程表的教务适配是怎么写的，然后给我们学校写一个适配脚本。",
        "skill": "1. 在仓库 Releases 下载安装包\n2. 在「更多」页面连点应用图标 5 次打开开发者功能\n3. 参考项目的开源适配仓库，给自己学校写适配",
        "sourceNote": "拾光课程表团队，Apache-2.0 许可。电脑版目前还在实验阶段。发现于 HelloGitHub 第 123 期。"
      },
      "en": {
        "title": "ShiGuang Schedule · Class timetable",
        "summary": "A class timetable for Chinese universities that imports schedules from academic systems through adapter scripts.",
        "sample": "ShiGuangSchedule/shiguangschedule",
        "output": "A timetable app with today and week views, home-screen widgets and dark mode, on Android and desktop.",
        "inputs": "An Android 8.0+ phone, or a Windows, macOS or Linux computer. Code changes need a Compose Multiplatform setup.",
        "decisions": "The most direct remix is an adapter for your own school, so the timetable imports from your academic system in one tap, then matches your school's hours.",
        "model": "No AI model required.",
        "prompt": "Help me understand how ShiGuang Schedule's academic-system adapters work, then write one for my university.",
        "skill": "1. Download a build from the repository's Releases\n2. Tap the app icon 5 times on the More page to enable developer features\n3. Use the project's open adapter repository to write one for your school",
        "sourceNote": "By the ShiGuang Schedule team, Apache-2.0 license. The desktop version is still experimental. Found in HelloGitHub issue 123."
      }
    }
  },
  {
    "slug": "models-dev",
    "category": "web",
    "subcategory": "applications",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/anomalyco/models.dev",
    "licenseUrl": "https://github.com/anomalyco/models.dev/blob/dev/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub122.md",
    "coverUrl": "/catalog/gitglow-v1/models-dev.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "Models.dev · AI 模型速查表",
        "summary": "一个社区维护的 AI 模型数据库，查价格、上下文长度和能力，还提供接口。",
        "sample": "anomalyco/models.dev",
        "output": "一个能搜索的模型速查网站，以及能直接调用的 JSON 数据接口。",
        "inputs": "直接看：打开 models.dev。自己做一版：Bun。",
        "decisions": "做同款主要换数据：把模型换成你关心的东西，比如考研院校、奖学金、竞赛日历，沿用它「一个条目一个文件」的数据组织和速查页面。",
        "model": "网站本身不需要 AI 模型。",
        "prompt": "参考 models.dev 的数据组织方式，帮我做一个全国大学生竞赛速查站：每个比赛一个文件，记录报名时间、级别和官网。",
        "skill": "1. 打开 https://models.dev，或者 curl https://models.dev/api.json 看数据\n2. git clone https://github.com/anomalyco/models.dev.git && cd models.dev && bun install\n3. cd packages/web && bun run dev",
        "sourceNote": "anomalyco 出品，MIT 许可，opencode 也在用这份数据。发现于 HelloGitHub 第 122 期。"
      },
      "en": {
        "title": "Models.dev · AI model lookup",
        "summary": "A community-maintained database of AI models: prices, context length and capabilities, with an API.",
        "sample": "anomalyco/models.dev",
        "output": "A searchable model lookup site and a JSON API you can call.",
        "inputs": "To look: open models.dev. To make your own: Bun.",
        "decisions": "Swap the data for something you care about, such as graduate programmes, scholarships or competition calendars, and reuse its one-file-per-entry layout and lookup page.",
        "model": "The site needs no AI model.",
        "prompt": "Following models.dev's data layout, help me build a student competition lookup site: one file per competition with deadlines, level and website.",
        "skill": "1. Open https://models.dev, or curl https://models.dev/api.json\n2. git clone https://github.com/anomalyco/models.dev.git && cd models.dev && bun install\n3. cd packages/web && bun run dev",
        "sourceNote": "By anomalyco, MIT license; opencode uses this data too. Found in HelloGitHub issue 122."
      }
    }
  },
  {
    "slug": "chinese-poetry-api",
    "category": "web",
    "subcategory": "applications",
    "goal": "portfolio",
    "preview": "code",
    "source": "github",
    "sourceUrl": "https://github.com/palemoky/chinese-poetry-api",
    "licenseUrl": "https://github.com/palemoky/chinese-poetry-api/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub123.md",
    "coverUrl": "/catalog/gitglow-v1/chinese-poetry-api.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "中国古诗词 API",
        "summary": "近 40 万首唐诗宋词元曲，做成可以搜索的接口，支持简繁切换。",
        "sample": "palemoky/chinese-poetry-api",
        "output": "一个能自己部署的诗词接口服务，支持 REST 和 GraphQL，可以按朝代、作者、类型查询。",
        "inputs": "直接用在线版 poetry.palemoky.com。自己部署：Docker，一条命令。",
        "decisions": "做同款主要换数据：把诗词换成你专业的名词库、题库或校史资料，做成别人能调用的接口，再配一个小网页。",
        "model": "不需要 AI 模型。",
        "prompt": "参考 chinese-poetry-api，帮我把我们专业的 500 个术语做成一个能搜索的接口，再做一个查询网页。",
        "skill": "1. docker run -d -p 1279:1279 palemoky/chinese-poetry-api:latest\n2. curl \"http://localhost:1279/api/v1/stats\" 看一下数据量\n3. 想改数据：git clone --recurse-submodules --depth=1 https://github.com/palemoky/chinese-poetry-api.git，再 make process-data && make run-server",
        "sourceNote": "作者 palemoky，GPL-3.0 许可。发现于 HelloGitHub 第 123 期。"
      },
      "en": {
        "title": "Chinese Poetry API",
        "summary": "Nearly 400,000 Tang, Song and Yuan poems as a searchable API, in simplified and traditional Chinese.",
        "sample": "palemoky/chinese-poetry-api",
        "output": "A self-hostable poetry API with REST and GraphQL, searchable by dynasty, author and form.",
        "inputs": "Use the online version at poetry.palemoky.com, or self-host with one Docker command.",
        "decisions": "Swap the data: turn your subject's glossary, question bank or school history into an API others can call, and add a small web page.",
        "model": "No AI model required.",
        "prompt": "Following chinese-poetry-api, help me turn our department's 500 terms into a searchable API and a lookup page.",
        "skill": "1. docker run -d -p 1279:1279 palemoky/chinese-poetry-api:latest\n2. curl \"http://localhost:1279/api/v1/stats\" to check the data\n3. To change the data: git clone --recurse-submodules --depth=1 https://github.com/palemoky/chinese-poetry-api.git, then make process-data && make run-server",
        "sourceNote": "By palemoky, GPL-3.0 license. Found in HelloGitHub issue 123."
      }
    }
  },
  {
    "slug": "dashi-ppt-skill",
    "category": "competition",
    "subcategory": "pitch",
    "goal": "contest",
    "preview": "document",
    "source": "github",
    "sourceUrl": "https://github.com/chuspeeism/dashi-ppt-skill",
    "licenseUrl": "https://github.com/chuspeeism/dashi-ppt-skill/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub125.md",
    "coverUrl": "/catalog/gitglow-v1/dashi-ppt-skill.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "大师 PPT · 让 Agent 做 PPT",
        "summary": "把文档丢给 Agent，生成网页版 PPT，在浏览器里改，再导出可编辑的 PPTX。",
        "sample": "chuspeeism/dashi-ppt-skill",
        "output": "一份网页版 PPT，可以导出成可编辑的 PPTX 或 PDF。12 套主题，1020 个版式。",
        "inputs": "Node.js 和一个 AI Agent。汇报的内容和数据自己准备。",
        "decisions": "做同款时你决定：汇报讲什么（课程答辩、比赛路演），选哪套主题，哪些页要图表。不满意的页在浏览器里直接改。",
        "model": "不自带模型，用你 Agent 自带的模型。",
        "prompt": "帮我把这份比赛项目说明做成 12 页路演 PPT：选简洁的主题，第 5 页放市场规模图表，最后导出 PPTX。",
        "skill": "1. npx dashi-ppt-skill@latest（国内网络加 --registry=https://registry.npmmirror.com）\n2. 把文档交给 Agent，选主题生成 PPT\n3. 在浏览器里改完，用 export:pptx 导出",
        "sourceNote": "作者 chuspeeism，AGPL-3.0 许可：改版公开发布时也要开源。发现于 HelloGitHub 第 125 期。"
      },
      "en": {
        "title": "Dashi PPT · Let your agent make slides",
        "summary": "Hand a document to your agent, get web slides you can edit in the browser, then export an editable PPTX.",
        "sample": "chuspeeism/dashi-ppt-skill",
        "output": "Web slides that export to editable PPTX or PDF, with 12 themes and 1,020 layouts.",
        "inputs": "Node.js and an AI agent. Bring your own content and data.",
        "decisions": "Decide what the deck is for (a course defence, a competition pitch), which theme, and which slides need charts. Fix any slide directly in the browser.",
        "model": "No built-in model; uses your agent's model.",
        "prompt": "Turn this competition project brief into a 12-slide pitch deck: a clean theme, a market-size chart on slide 5, exported as PPTX.",
        "skill": "1. npx dashi-ppt-skill@latest (in mainland China add --registry=https://registry.npmmirror.com)\n2. Give your document to the agent and pick a theme\n3. Edit in the browser, then export with export:pptx",
        "sourceNote": "By chuspeeism, AGPL-3.0 license: a publicly released remix must also be open source. Found in HelloGitHub issue 125."
      }
    }
  },
  {
    "slug": "figures4papers",
    "category": "learning",
    "subcategory": "research",
    "goal": "contest",
    "preview": "code",
    "source": "github",
    "sourceUrl": "https://github.com/ChenLiu-1996/figures4papers",
    "licenseUrl": "https://github.com/ChenLiu-1996/figures4papers/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub126.md",
    "coverUrl": "/catalog/gitglow-v1/figures4papers.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "论文配图脚本合集",
        "summary": "耶鲁博士生发表在顶会顶刊上的论文配图，Python 源码全部公开。",
        "sample": "ChenLiu-1996/figures4papers",
        "output": "可以直接改的论文配图脚本：柱状图、雷达图、3D 球体等，风格统一好看。",
        "inputs": "Python 和 matplotlib。自己的实验数据。",
        "decisions": "做同款主要换数据和配色：把示例数据换成你论文或课程报告的实验结果，改成你学校或期刊要求的配色。",
        "model": "不需要 AI 模型。",
        "prompt": "参考 figures4papers 的柱状图脚本，帮我把这组实验结果画成一张论文配图，配色和原项目一致。",
        "skill": "1. git clone https://github.com/ChenLiu-1996/figures4papers.git\n2. 找到和你需要的图最像的脚本\n3. 换上自己的数据，运行脚本出图",
        "sourceNote": "作者 Chen Liu（耶鲁大学），CC BY-NC 4.0 许可：仅限非商用。作者希望在合乎学术规范的前提下引用相关论文。发现于 HelloGitHub 第 126 期。"
      },
      "en": {
        "title": "Figures for Papers",
        "summary": "Python source for figures a Yale PhD student published at top venues.",
        "sample": "ChenLiu-1996/figures4papers",
        "output": "Editable figure scripts: bar charts, radar charts, 3D spheres and more, in a consistent, clean style.",
        "inputs": "Python and matplotlib, plus your own experimental data.",
        "decisions": "Swap the data and colours: use results from your paper or course report and your school's or journal's palette.",
        "model": "No AI model required.",
        "prompt": "Using a bar-chart script from figures4papers, plot these experiment results as a paper figure in the same colour style.",
        "skill": "1. git clone https://github.com/ChenLiu-1996/figures4papers.git\n2. Find the script closest to the figure you need\n3. Replace the data with yours and run it",
        "sourceNote": "By Chen Liu (Yale University), CC BY-NC 4.0 license: non-commercial use only. The author asks that related papers be cited where academically appropriate. Found in HelloGitHub issue 126."
      }
    }
  },
  {
    "slug": "flint-chart",
    "category": "github",
    "subcategory": "creative-tools",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/microsoft/flint-chart",
    "licenseUrl": "https://github.com/microsoft/flint-chart/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub125.md",
    "coverUrl": "/catalog/gitglow-v1/flint-chart.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "Flint · 让 Agent 画好看的图表",
        "summary": "微软开源的图表语言，让 AI 用简单的配置画出好看、可交互的图表。",
        "sample": "microsoft/flint-chart",
        "output": "一张可交互的图表，配置文件人也能看懂、能改。",
        "inputs": "当 MCP 服务器给 Agent 用，或者 npm install flint-chart 写进自己的网页。",
        "decisions": "做同款时你决定画什么数据：课程作业的统计结果、社团活动数据、生活开销，选合适的图表类型。",
        "model": "库本身不需要 AI 模型；配合 Agent 使用时用 Agent 自带的模型。",
        "prompt": "用 Flint 把这份一学期的开销表画成三张图：按月趋势、按类别占比、和上学期对比。",
        "skill": "1. 打开 microsoft.github.io/flint-chart 看图库和编辑器\n2. 按官网说明给 Agent 装上 MCP 服务器\n3. 或者 npm install flint-chart 用在自己的项目里",
        "sourceNote": "微软开源，MIT 许可，有中文主页和论文。发现于 HelloGitHub 第 125 期。"
      },
      "en": {
        "title": "Flint · Good-looking charts from your agent",
        "summary": "Microsoft's open-source chart language that lets AI build polished, interactive charts from simple specs.",
        "sample": "microsoft/flint-chart",
        "output": "An interactive chart whose spec people can read and edit.",
        "inputs": "Use it as an MCP server for your agent, or npm install flint-chart in your own pages.",
        "decisions": "Decide what data to chart (course statistics, club activity, your spending) and which chart types fit.",
        "model": "The library needs no AI model; with an agent it uses the agent's model.",
        "prompt": "Use Flint to turn this semester's spending sheet into three charts: monthly trend, category share and a comparison with last semester.",
        "skill": "1. Browse the gallery and editor at microsoft.github.io/flint-chart\n2. Add the MCP server to your agent as described on the site\n3. Or npm install flint-chart in your own project",
        "sourceNote": "Open-sourced by Microsoft, MIT license, with a Chinese homepage and a paper. Found in HelloGitHub issue 125."
      }
    }
  },
  {
    "slug": "numbat",
    "category": "learning",
    "subcategory": "methods",
    "goal": "portfolio",
    "preview": "site",
    "source": "github",
    "sourceUrl": "https://github.com/sharkdp/numbat",
    "licenseUrl": "https://github.com/sharkdp/numbat/blob/main/LICENSE-APACHE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub126.md",
    "coverUrl": "/catalog/gitglow-v1/numbat.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "Numbat · 会换算单位的计算器",
        "summary": "一门做科学计算的语言，带物理单位，算错单位会直接报错。",
        "sample": "sharkdp/numbat",
        "output": "一个能自动换算物理单位的计算器，可以在网页上用，也可以装在命令行里。",
        "inputs": "直接打开 numbat.dev 在线用。本地装要 Rust 的 cargo。",
        "decisions": "做同款可以加上你专业常用的单位和常数，或者写一组专业课的计算示例，做成自己的计算工具。",
        "model": "不需要 AI 模型。",
        "prompt": "帮我用 Numbat 写一组大学物理常用计算：抛体运动、电路功率、热量计算，每个都带单位。",
        "skill": "1. 打开 https://numbat.dev 在线试\n2. 看官网 Tutorial 学基本写法\n3. 本地安装：cargo install -f --path numbat-cli",
        "sourceNote": "作者 sharkdp，MIT 和 Apache-2.0 双许可。发现于 HelloGitHub 第 126 期。"
      },
      "en": {
        "title": "Numbat · A calculator that knows units",
        "summary": "A language for scientific computation with physical units; mixing up units is an error.",
        "sample": "sharkdp/numbat",
        "output": "A calculator that converts physical units automatically, on the web or in your terminal.",
        "inputs": "Open numbat.dev to use it online. Installing locally needs Rust's cargo.",
        "decisions": "Add the units and constants your subject uses, or write a set of worked examples for a course and make it your own calculation tool.",
        "model": "No AI model required.",
        "prompt": "Use Numbat to write common university physics calculations: projectile motion, circuit power and heat, all with units.",
        "skill": "1. Try it at https://numbat.dev\n2. Learn the basics from the Tutorial on the site\n3. Install locally: cargo install -f --path numbat-cli",
        "sourceNote": "By sharkdp, dual-licensed MIT and Apache-2.0. Found in HelloGitHub issue 126."
      }
    }
  },
  {
    "slug": "asciline",
    "category": "aigc",
    "subcategory": "video",
    "goal": "portfolio",
    "preview": "video",
    "source": "github",
    "sourceUrl": "https://github.com/YusufB5/ASCILINE",
    "licenseUrl": "https://github.com/YusufB5/ASCILINE/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub123.md",
    "coverUrl": "/catalog/gitglow-v1/asciline.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "ASCILINE · 把视频变成字符画",
        "summary": "把视频实时转成字符画，在浏览器里播放，不需要显卡。",
        "sample": "YusufB5/ASCILINE",
        "output": "一段在浏览器里播放的字符画视频，可以是本地视频，也可以是在线视频链接。",
        "inputs": "Python 3.9 以上和 pip。准备一段自己的视频。",
        "decisions": "做同款主要定素材和风格：选一段你拍的视频，调列数和像素模式，做成字符画短片。",
        "model": "不需要 AI 模型。",
        "prompt": "帮我用 ASCILINE 把这段校园视频转成 240 列的字符画，在浏览器里播放。",
        "skill": "1. git clone https://github.com/YusufB5/ASCILINE.git && cd ASCILINE && pip install .\n2. python stream_server.py video.mp4 --cols 240\n3. 用浏览器打开终端里显示的地址",
        "sourceNote": "作者 YusufB5。服务端核心为 AGPL-3.0，浏览器播放器为 MIT：改服务端并公开部署时要开源。发现于 HelloGitHub 第 123 期。"
      },
      "en": {
        "title": "ASCILINE · Turn video into ASCII art",
        "summary": "Converts video to ASCII art in real time and plays it in the browser, with no GPU needed.",
        "sample": "YusufB5/ASCILINE",
        "output": "An ASCII-art video playing in your browser, from a local file or an online video link.",
        "inputs": "Python 3.9+ and pip, plus a video of your own.",
        "decisions": "Choose the footage and style: pick a clip you shot, tune the column count and pixel mode, and make an ASCII short.",
        "model": "No AI model required.",
        "prompt": "Use ASCILINE to turn this campus video into 240-column ASCII art and play it in the browser.",
        "skill": "1. git clone https://github.com/YusufB5/ASCILINE.git && cd ASCILINE && pip install .\n2. python stream_server.py video.mp4 --cols 240\n3. Open the address shown in the terminal",
        "sourceNote": "By YusufB5. The server core is AGPL-3.0 and the browser player is MIT: a publicly deployed server remix must be open source. Found in HelloGitHub issue 123."
      }
    }
  },
  {
    "slug": "book-to-skill",
    "category": "learning",
    "subcategory": "notes",
    "goal": "portfolio",
    "preview": "agent",
    "source": "github",
    "sourceUrl": "https://github.com/virgiliojr94/book-to-skill",
    "licenseUrl": "https://github.com/virgiliojr94/book-to-skill/blob/master/LICENSE.md",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub125.md",
    "coverUrl": "/catalog/gitglow-v1/book-to-skill.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "book-to-skill · 把书变成技能",
        "summary": "把一本技术书或一堆资料，整理成 Agent 能随时查阅的技能。",
        "sample": "virgiliojr94/book-to-skill",
        "output": "一个技能包：Agent 回答问题时先查书里的内容，比把整本书塞进上下文省很多 token。",
        "inputs": "一个编程 Agent（Claude Code、Codex 等），和你要整理的书或资料（PDF、文件夹都行）。",
        "decisions": "做同款时你决定喂什么资料：教材、讲义、往年题，整理成一个专属复习助手。",
        "model": "不自带模型，用你 Agent 自带的模型。",
        "prompt": "/book-to-skill ./数据结构讲义.pdf，然后帮我出 10 道期末复习题，每道注明出自哪一章。",
        "skill": "1. npx skills add virgiliojr94/book-to-skill\n2. 在 Agent 里运行 /book-to-skill 加文件或文件夹路径\n3. 生成后直接向 Agent 提问",
        "sourceNote": "作者 virgiliojr94，MIT 许可，有简体中文说明。发现于 HelloGitHub 第 125 期。"
      },
      "en": {
        "title": "book-to-skill · Turn a book into a skill",
        "summary": "Turns a technical book or a pile of sources into a skill your agent can consult at any time.",
        "sample": "virgiliojr94/book-to-skill",
        "output": "A skill package: your agent checks the book before answering, using far fewer tokens than pasting the whole book.",
        "inputs": "A coding agent (Claude Code, Codex and others) and the book or sources to process (PDF or folder).",
        "decisions": "Decide what to feed it: textbooks, lecture notes or past exams, and make your own revision assistant.",
        "model": "No built-in model; uses your agent's model.",
        "prompt": "/book-to-skill ./data-structures-notes.pdf, then give me 10 final-exam review questions, each citing its chapter.",
        "skill": "1. npx skills add virgiliojr94/book-to-skill\n2. In your agent run /book-to-skill with a file or folder path\n3. Ask your agent questions once it is done",
        "sourceNote": "By virgiliojr94, MIT license, with Simplified Chinese docs. Found in HelloGitHub issue 125."
      }
    }
  },
  {
    "slug": "gittype",
    "category": "learning",
    "subcategory": "methods",
    "goal": "portfolio",
    "preview": "code",
    "source": "github",
    "sourceUrl": "https://github.com/unhappychoice/gittype",
    "licenseUrl": "https://github.com/unhappychoice/gittype/blob/main/LICENSE",
    "discoveryUrl": "https://github.com/521xueweihan/HelloGitHub/blob/master/content/HelloGitHub122.md",
    "coverUrl": "/catalog/gitglow-v1/gittype.webp",
    "coverNote": "原项目界面截图 GitGlow 版式",
    "content": {
      "zh": {
        "title": "GitType · 用自己的代码练打字",
        "summary": "把你写过的代码变成终端里的打字游戏，实时算速度和准确率。",
        "sample": "unhappychoice/gittype",
        "output": "一个终端打字游戏：多种模式、实时 WPM 和准确率、从新手到高手的称号。",
        "inputs": "Rust 的 cargo，和一个有代码的项目目录。",
        "decisions": "做同款可以换掉练习内容：把代码换成你专业的术语、英文单词或古诗，改成适合你的打字练习。",
        "model": "不需要 AI 模型。",
        "prompt": "帮我改一版 gittype：练习内容从代码换成四级单词，每轮 20 个词，结束时显示准确率。",
        "skill": "1. cargo install gittype\n2. cd 到你自己的项目目录\n3. 运行 gittype 开始练",
        "sourceNote": "作者 unhappychoice，MIT 许可。发现于 HelloGitHub 第 122 期。"
      },
      "en": {
        "title": "GitType · Typing practice with your own code",
        "summary": "Turns code you wrote into a terminal typing game with live speed and accuracy.",
        "sample": "unhappychoice/gittype",
        "output": "A terminal typing game with several modes, live WPM and accuracy, and titles from newbie to expert.",
        "inputs": "Rust's cargo and a folder with code in it.",
        "decisions": "Swap the practice content: replace code with subject terms, English words or poems to make your own typing trainer.",
        "model": "No AI model required.",
        "prompt": "Help me fork gittype so the practice content is CET-4 words instead of code: 20 words per round and accuracy at the end.",
        "skill": "1. cargo install gittype\n2. cd into one of your projects\n3. Run gittype",
        "sourceNote": "By unhappychoice, MIT license. Found in HelloGitHub issue 122."
      }
    }
  }
] satisfies readonly CatalogEntry[];
