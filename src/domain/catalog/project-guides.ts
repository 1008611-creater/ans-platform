import type { ProjectGuide } from "./project-guide-types";

// Sources were read on checkedAt; this does not claim installation or task execution.
export const PROJECT_GUIDES: readonly ProjectGuide[] = [
  {
    "slug": "markmap",
    "experienceUrl": "https://markmap.js.org/repl",
    "sourceUrl": "https://github.com/markmap/markmap",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "GitHub · markmap/markmap",
        "href": "https://github.com/markmap/markmap"
      },
      {
        "label": "Official CLI guide",
        "href": "https://markmap.js.org/docs/packages--markmap-cli"
      }
    ],
    "zh": {
      "audience": "有课堂提纲、读书笔记或研究资料的人",
      "difficulty": "入门 · 会写标题和列表即可",
      "access": "官方在线编辑器；也可在本地使用 CLI",
      "cost": "MIT 工具；基础使用无需模型，自己的托管成本另计",
      "result": "Markdown 原稿与交互式知识地图",
      "steps": [
        {
          "title": "打开编辑器",
          "body": "进入 Markmap 官方编辑器，先保留一份自己的 Markdown 提纲。",
          "href": "https://markmap.js.org/repl"
        },
        {
          "title": "整理三层结构",
          "body": "用 # 写主题、## 写章节，再用列表放关键概念；先从一章开始，查看右侧导图。"
        },
        {
          "title": "保留可修改版本",
          "body": "展开检查节点关系，保存 Markdown 原稿；按编辑器或 CLI 的导出方式生成 HTML。"
        }
      ],
      "cautions": [
        "层级来自你的标题和列表，工具不会替你判断知识关系是否正确。",
        "公开链接或导出文件可能包含全文，分享前删除个人信息。"
      ]
    },
    "en": {
      "audience": "Students organizing notes, reading outlines or competition research",
      "difficulty": "Beginner · basic headings and lists",
      "access": "Official online editor or a local CLI",
      "cost": "MIT tool; no model required; your hosting costs are separate",
      "result": "Markdown source and an interactive knowledge map",
      "steps": [
        {
          "title": "Open the editor",
          "body": "Open the official Markmap editor and keep a copy of your Markdown outline.",
          "href": "https://markmap.js.org/repl"
        },
        {
          "title": "Build three levels",
          "body": "Use # for the topic, ## for chapters and lists for key ideas; start with one chapter and inspect the map."
        },
        {
          "title": "Keep editable source",
          "body": "Check expanded nodes, retain the Markdown file and use the editor or CLI export options to generate HTML."
        }
      ],
      "cautions": [
        "The map reflects your headings; it does not verify conceptual relationships.",
        "Shared links and exports can include the full text; remove private details first."
      ]
    }
  },
  {
    "slug": "slidev",
    "sourceUrl": "https://github.com/slidevjs/slidev",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "GitHub · slidevjs/slidev",
        "href": "https://github.com/slidevjs/slidev"
      },
      {
        "label": "Official guide",
        "href": "https://sli.dev/guide/"
      }
    ],
    "zh": {
      "audience": "准备课程展示、技术分享或比赛路演的人",
      "difficulty": "进阶 · Markdown 与基础开发环境",
      "access": "官方浏览器模板；本地安装需要兼容的 Node.js",
      "cost": "MIT 工具；部署费用自理，无需付费模型",
      "result": "演示网页、Markdown 原稿与可导出文件",
      "steps": [
        {
          "title": "先跑通模板",
          "body": "从官方在线模板体验，或按入门文档创建本地 Slidev 项目。",
          "href": "https://sli.dev/guide/"
        },
        {
          "title": "写自己的 slides.md",
          "body": "按问题、方案、实现、结果组织页面；用 --- 分页，把模板演示替换成自己的内容。"
        },
        {
          "title": "演练并交付",
          "body": "检查演讲者视图与页面节奏；按官方说明导出，或构建静态网页。",
          "href": "https://sli.dev/guide/exporting"
        }
      ],
      "cautions": [
        "网页交互不会完整保留到静态导出，提交格式以比赛要求为准。",
        "本地安装依赖当前文档要求的 Node.js，导出还可能需要浏览器依赖。"
      ]
    },
    "en": {
      "audience": "Students giving course presentations, technical talks or competition pitches",
      "difficulty": "Intermediate · Markdown and a development environment",
      "access": "Official browser template; local setup requires compatible Node.js",
      "cost": "MIT tool; hosting is separate; no paid model required",
      "result": "Web slides, Markdown source and exportable files",
      "steps": [
        {
          "title": "Start with the template",
          "body": "Try the official browser template or create a local project using the getting-started guide.",
          "href": "https://sli.dev/guide/"
        },
        {
          "title": "Write slides.md",
          "body": "Organize problem, approach, implementation and results; use --- between slides and replace sample material."
        },
        {
          "title": "Rehearse and deliver",
          "body": "Check presenter view and pacing, then follow the export guide or build a static site.",
          "href": "https://sli.dev/guide/exporting"
        }
      ],
      "cautions": [
        "Interactive web content does not fully survive static export; check submission rules.",
        "Local setup requires the Node.js version in current docs; export may need browser dependencies."
      ]
    }
  },
  {
    "slug": "penpot",
    "sourceUrl": "https://github.com/penpot/penpot",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "GitHub · penpot/penpot",
        "href": "https://github.com/penpot/penpot"
      },
      {
        "label": "Official guide",
        "href": "https://help.penpot.app/user-guide/prototyping-testing/prototyping/"
      }
    ],
    "zh": {
      "audience": "需要验证页面流程的参赛队伍与产品设计初学者",
      "difficulty": "入门操作 · 做好原型需要设计判断",
      "access": "官方云端账号，或自行部署",
      "cost": "MPL-2.0 源码；云端和企业权益以官方方案为准",
      "result": "界面设计文件与可分享的点击原型",
      "steps": [
        {
          "title": "画出关键三屏",
          "body": "新建文件，为进入、操作、完成三个状态建立画板。",
          "href": "https://help.penpot.app/"
        },
        {
          "title": "连接交互",
          "body": "切到原型面板，把按钮连接到目标画板，设定起始画板；必要时加打开链接动作。",
          "href": "https://help.penpot.app/user-guide/prototyping-testing/prototyping/"
        },
        {
          "title": "分享后收集问题",
          "body": "进入 View 模式完整走一遍，再分享流程链接；记录对方卡住的位置并修改。"
        }
      ],
      "cautions": [
        "点击原型不等于可上线的应用，登录、支付和数据保存仍需开发。",
        "素材版权和分享权限由你确认；自行部署还需要维护服务器。"
      ]
    },
    "en": {
      "audience": "Competition teams and beginner product designers validating a flow",
      "difficulty": "Beginner controls · design judgment required",
      "access": "Official cloud account or self-hosted instance",
      "cost": "MPL-2.0 source; cloud and enterprise terms follow the official plans",
      "result": "Design file and a shareable clickable prototype",
      "steps": [
        {
          "title": "Draw three essential screens",
          "body": "Create a file and boards for entry, action and completion.",
          "href": "https://help.penpot.app/"
        },
        {
          "title": "Connect interactions",
          "body": "Use the prototype panel to connect buttons to boards and set a starting point; add external URL actions if needed.",
          "href": "https://help.penpot.app/user-guide/prototyping-testing/prototyping/"
        },
        {
          "title": "Share and collect friction",
          "body": "Walk through View mode, share the flow link and record where collaborators get stuck before revising."
        }
      ],
      "cautions": [
        "A clickable prototype is not a deployed application; authentication, payments and storage still need development.",
        "Check asset rights and sharing permissions; self-hosting requires server maintenance."
      ]
    }
  },
  {
    "slug": "stirling-pdf",
    "sourceUrl": "https://github.com/Stirling-Tools/Stirling-PDF",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "GitHub · Stirling-Tools/Stirling-PDF",
        "href": "https://github.com/Stirling-Tools/Stirling-PDF"
      },
      {
        "label": "Official guide",
        "href": "https://docs.stirlingpdf.com"
      }
    ],
    "zh": {
      "audience": "需要整理 PDF、扫描件和提交附件的人",
      "difficulty": "入门操作 · 自部署需要 Docker 基础",
      "access": "桌面客户端，或自部署的浏览器工具",
      "cost": "核心许可与特殊目录分开；服务器和高级方案另计",
      "result": "处理后的 PDF 文件",
      "steps": [
        {
          "title": "选择本地入口",
          "body": "按官方文档安装桌面应用，或由有经验的人部署服务后打开浏览器界面。",
          "href": "https://docs.stirlingpdf.com"
        },
        {
          "title": "只处理一类问题",
          "body": "先选合并、拆分、压缩或 OCR 之一，导入副本；合并时调整页序，OCR 时核对语言。"
        },
        {
          "title": "逐页检查再提交",
          "body": "下载结果，检查缺页、清晰度、文字识别及文件大小，再按要求命名。"
        }
      ],
      "cautions": [
        "OCR 可能识别错误，压缩可能降低图片质量，不能替代人工核对。",
        "不要把私密证件传到不可信的公共实例；商业能力按对应目录许可与方案确认。"
      ]
    },
    "en": {
      "audience": "People preparing PDFs, scanned documents and submission attachments",
      "difficulty": "Beginner use · Docker knowledge for self-hosting",
      "access": "Desktop client or self-hosted browser interface",
      "cost": "Core and special-directory licenses differ; servers and advanced plans are separate",
      "result": "Processed PDF files",
      "steps": [
        {
          "title": "Choose a local entry",
          "body": "Install the desktop application using official docs, or have an experienced person deploy a server.",
          "href": "https://docs.stirlingpdf.com"
        },
        {
          "title": "Handle one task first",
          "body": "Select merge, split, compress or OCR and import copies; check page order and recognition language."
        },
        {
          "title": "Inspect before submitting",
          "body": "Download and inspect every page, readability, OCR text and file size, then name the final file."
        }
      ],
      "cautions": [
        "OCR can make errors and compression can reduce image quality; inspect the result.",
        "Avoid untrusted public instances for private IDs; commercial features have separate terms."
      ]
    }
  },
  {
    "slug": "formbricks",
    "sourceUrl": "https://github.com/formbricks/formbricks",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "GitHub · formbricks/formbricks",
        "href": "https://github.com/formbricks/formbricks"
      },
      {
        "label": "Official guide",
        "href": "https://formbricks.com/docs"
      }
    ],
    "zh": {
      "audience": "做需求验证、校园活动或用户调研的团队",
      "difficulty": "入门 · 先做链接问卷",
      "access": "官方云端账号，或按文档自部署",
      "cost": "核心可自部署；云端有方案限制，企业能力另计",
      "result": "问卷链接与真实回收结果",
      "steps": [
        {
          "title": "选一个要验证的问题",
          "body": "围绕目标用户遇到的一个具体困难建问卷，只保留能影响决策的问题。",
          "href": "https://formbricks.com/docs"
        },
        {
          "title": "自己先填一遍",
          "body": "检查手机显示、必填项、跳转和隐私说明，再把发布链接发给目标人群。"
        },
        {
          "title": "按证据改产品",
          "body": "查看真实回答，把共同困难与个人偏好分开；记录修改项，不捏造样本量。"
        }
      ],
      "cautions": [
        "方便样本不代表整个市场，结果需结合访谈与实际行为解读。",
        "自部署核心与付费企业功能分开，公开问卷不能泄露受访者个人资料。"
      ]
    },
    "en": {
      "audience": "Teams validating ideas, campus activities or user needs",
      "difficulty": "Beginner · start with a link survey",
      "access": "Official cloud account or documented self-hosting",
      "cost": "Self-hostable core; cloud limits and enterprise features are separate",
      "result": "Survey link and real responses",
      "steps": [
        {
          "title": "Pick one decision to inform",
          "body": "Choose a concrete user problem and create a link survey containing questions that affect a decision.",
          "href": "https://formbricks.com/docs"
        },
        {
          "title": "Complete it yourself first",
          "body": "Check mobile layout, required fields, routing and privacy notice before sharing the published link."
        },
        {
          "title": "Revise from evidence",
          "body": "Read actual responses, separate recurring problems from preferences and record changes without inventing a sample size."
        }
      ],
      "cautions": [
        "A convenience sample does not represent a whole market; interpret it with interviews and behavior.",
        "Self-hosted core and paid enterprise features differ; avoid exposing respondent data."
      ]
    }
  },
  {
    "slug": "actual-budget",
    "sourceUrl": "https://github.com/actualbudget/actual",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "GitHub · actualbudget/actual",
        "href": "https://github.com/actualbudget/actual"
      },
      {
        "label": "Official guide",
        "href": "https://actualbudget.org/docs/"
      }
    ],
    "zh": {
      "audience": "想管理生活费、个人开支和目标储蓄的人",
      "difficulty": "入门 · 理解分类预算",
      "access": "本地桌面应用；跨设备同步可自部署或选择托管",
      "cost": "MIT 工具；托管和第三方银行连接可能另收费",
      "result": "个人预算、账户和收支记录",
      "steps": [
        {
          "title": "先建立本地预算",
          "body": "按官方安装文档选择桌面或同步方案，建立预算文件并保存备份。",
          "href": "https://actualbudget.org/docs/"
        },
        {
          "title": "录入余额与分类",
          "body": "创建账户，输入真实余额；按餐饮、交通等实际需要设置预算分类。"
        },
        {
          "title": "每周对一次账",
          "body": "手动记录或导入支持的交易文件，核对账户余额，再调整剩余预算。"
        }
      ],
      "cautions": [
        "不是投资建议或自动记账保证；银行连接取决于地区和第三方。",
        "财务文件要独立备份，开启同步不代表已完成加密或灾难恢复配置。"
      ]
    },
    "en": {
      "audience": "People managing personal spending, living costs and savings goals",
      "difficulty": "Beginner · category budgeting concepts",
      "access": "Local desktop app; optional self-hosted or managed synchronization",
      "cost": "MIT tool; hosting, synchronization providers and bank connections may cost extra",
      "result": "Personal budget, accounts and transaction records",
      "steps": [
        {
          "title": "Create a local budget",
          "body": "Choose a desktop or synchronization option in official installation docs and back up the budget file.",
          "href": "https://actualbudget.org/docs/"
        },
        {
          "title": "Enter balances and categories",
          "body": "Create accounts with real balances and categories such as food and transport."
        },
        {
          "title": "Reconcile weekly",
          "body": "Enter transactions manually or import a supported file, reconcile balances and adjust remaining allocations."
        }
      ],
      "cautions": [
        "This is not investment advice or guaranteed automatic bookkeeping; bank connections depend on region and providers.",
        "Back up financial files independently; synchronization alone does not establish encryption or recovery."
      ]
    }
  },
  {
    "slug": "linkwarden",
    "sourceUrl": "https://github.com/linkwarden/linkwarden",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "GitHub · linkwarden/linkwarden",
        "href": "https://github.com/linkwarden/linkwarden"
      },
      {
        "label": "Official guide",
        "href": "https://docs.linkwarden.app/"
      }
    ],
    "zh": {
      "audience": "做论文选题、竞品研究和项目资料收集的人",
      "difficulty": "入门操作 · 自部署需服务器基础",
      "access": "官方演示先体验；正式使用选择云端或自部署",
      "cost": "AGPL-3.0 自部署；官方云端为订阅服务",
      "result": "分类链接库、注释与成功保存的网页副本",
      "steps": [
        {
          "title": "先建一个主题集合",
          "body": "在正式账号或自己的实例中创建集合，为本次研究命名。",
          "href": "https://docs.linkwarden.app/"
        },
        {
          "title": "收藏并写一句理由",
          "body": "添加真实链接、标签和摘要，记录它回答什么问题，检查副本是否保存成功。"
        },
        {
          "title": "检索并维护",
          "body": "用搜索找回资料，标出失效或不再适用的来源；共享前检查集合权限。"
        }
      ],
      "cautions": [
        "登录墙、动态页面和站点限制可能使归档失败，保留原始出处。",
        "网页副本的分享仍受原内容权利限制，公开演示不适合存私密材料。"
      ]
    },
    "en": {
      "audience": "People gathering thesis, competitor or project research",
      "difficulty": "Beginner use · server knowledge for self-hosting",
      "access": "Try the official demo; use cloud or self-hosting for real work",
      "cost": "AGPL-3.0 self-hosting; official cloud is a subscription",
      "result": "Organized links, annotations and successfully captured copies",
      "steps": [
        {
          "title": "Create one focused collection",
          "body": "Create a named collection in a real account or your own instance.",
          "href": "https://docs.linkwarden.app/"
        },
        {
          "title": "Save links with a reason",
          "body": "Add actual links, tags and a short note about the question each source answers; inspect preservation status."
        },
        {
          "title": "Retrieve and maintain",
          "body": "Search saved material, mark stale sources and inspect collection permissions before sharing."
        }
      ],
      "cautions": [
        "Login walls, dynamic sites and restrictions can prevent capture; keep the original source.",
        "Sharing archived pages remains subject to content rights; demos are unsuitable for private research."
      ]
    }
  },
  {
    "slug": "immich",
    "sourceUrl": "https://github.com/immich-app/immich",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "GitHub · immich-app/immich",
        "href": "https://github.com/immich-app/immich"
      },
      {
        "label": "Official guide",
        "href": "https://docs.immich.app/install/docker-compose/"
      }
    ],
    "zh": {
      "audience": "愿意维护家庭服务器或 NAS 的摄影与生活记录者",
      "difficulty": "进阶 · Docker、存储与备份",
      "access": "需要自己的服务器或 NAS；提供官方体验入口",
      "cost": "AGPL-3.0 工具；硬盘、服务器、网络与备份自理",
      "result": "自管理相册与照片视频库",
      "steps": [
        {
          "title": "先准备存储与备份",
          "body": "核对官方要求，用少量照片副本起步，为原文件、数据库和配置准备独立备份。",
          "href": "https://docs.immich.app/"
        },
        {
          "title": "按 Compose 文档安装",
          "body": "使用同一发布版本的 Compose 与环境示例，设置存储目录、口令和版本后启动。",
          "href": "https://docs.immich.app/install/docker-compose/"
        },
        {
          "title": "小范围同步后再扩大",
          "body": "创建自己的账号，连接手机应用，验证上传、原图下载与恢复方式，再扩大相册。"
        }
      ],
      "cautions": [
        "不能作为照片唯一副本，原图和数据库都需要备份。",
        "后台索引和视频转码占用资源；升级前阅读发布说明并确认备份可用。"
      ]
    },
    "en": {
      "audience": "Photographers and everyday record keepers willing to maintain a server or NAS",
      "difficulty": "Intermediate · Docker, storage and backups",
      "access": "Your own server or NAS; official experience entry available",
      "cost": "AGPL-3.0 tool; disks, hosting, network and backups are your responsibility",
      "result": "Self-managed albums and a photo/video library",
      "steps": [
        {
          "title": "Plan storage and backups",
          "body": "Check official requirements, start with copies of a few photos and back up originals, database and configuration.",
          "href": "https://docs.immich.app/"
        },
        {
          "title": "Install with the Compose guide",
          "body": "Use matching release files, set storage paths, credentials and version, then start the service.",
          "href": "https://docs.immich.app/install/docker-compose/"
        },
        {
          "title": "Validate a small sync first",
          "body": "Create an account, connect the mobile app and verify upload, original downloads and recovery before expanding."
        }
      ],
      "cautions": [
        "Do not use it as the only copy of your photos; back up originals and database.",
        "Indexing and transcoding use resources; read release notes and verify backups before upgrading."
      ]
    }
  },
  {
    "slug": "uptime-kuma",
    "sourceUrl": "https://github.com/louislam/uptime-kuma",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "GitHub · louislam/uptime-kuma",
        "href": "https://github.com/louislam/uptime-kuma"
      },
      {
        "label": "Official guide",
        "href": "https://github.com/louislam/uptime-kuma/wiki"
      }
    ],
    "zh": {
      "audience": "已经发布作品网站、小工具或服务的人",
      "difficulty": "进阶 · 基础部署和通知配置",
      "access": "自部署；官方临时演示可体验",
      "cost": "MIT 工具；持续运行机器和通知渠道可能另收费",
      "result": "监测面板、故障通知与可选状态页",
      "steps": [
        {
          "title": "部署独立监测点",
          "body": "按 README 选择 Docker 或官方支持的安装方法，持久化数据目录。",
          "href": "https://github.com/louislam/uptime-kuma#-how-to-install"
        },
        {
          "title": "添加一个 HTTPS 监测",
          "body": "填写自己的公开网址、检查间隔和预期响应，再配置可接收的通知渠道。"
        },
        {
          "title": "确认通知与公开范围",
          "body": "发送配置内的通知验证消息，核对状态页只公开合适的监测项，并保存运维记录。"
        }
      ],
      "cautions": [
        "可达性监测不代表业务正确，不能替代错误日志和完整观测。",
        "与被监测站点同机部署会同时失联；官方演示会删除数据，不应用于长期监测。"
      ]
    },
    "en": {
      "audience": "People who have published a portfolio, small tool or service",
      "difficulty": "Intermediate · deployment and notification setup",
      "access": "Self-hosted; temporary official demo for exploration",
      "cost": "MIT tool; a running machine and notification services may cost extra",
      "result": "Monitoring dashboard, failure alerts and optional status page",
      "steps": [
        {
          "title": "Deploy an independent monitor",
          "body": "Use Docker or an officially supported installation method and persist the data directory.",
          "href": "https://github.com/louislam/uptime-kuma#-how-to-install"
        },
        {
          "title": "Add an HTTPS monitor",
          "body": "Enter your public URL, interval and expected response, then configure a reachable notification destination."
        },
        {
          "title": "Check alerts and visibility",
          "body": "Send the configured notification check, ensure a status page exposes only suitable monitors and keep maintenance records."
        }
      ],
      "cautions": [
        "Availability does not prove business correctness or replace logs and observability.",
        "A monitor on the same machine can fail together with the site; demo data is temporary."
      ]
    }
  },
  {
    "slug": "docusaurus",
    "sourceUrl": "https://github.com/facebook/docusaurus",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "GitHub · facebook/docusaurus",
        "href": "https://github.com/facebook/docusaurus"
      },
      {
        "label": "Official guide",
        "href": "https://docusaurus.io/docs/installation"
      }
    ],
    "zh": {
      "audience": "需要项目文档、教程或团队知识网站的开发者",
      "difficulty": "进阶 · Node.js、Markdown；定制需要 React",
      "access": "本地创建项目，构建后部署静态站",
      "cost": "MIT 代码；域名与托管另计，无需 AI",
      "result": "文档网站、Markdown 原稿与构建文件",
      "steps": [
        {
          "title": "创建 classic 项目",
          "body": "按官方安装文档建立 classic 模板并启动本地预览。",
          "href": "https://docusaurus.io/docs/installation"
        },
        {
          "title": "替换模板内容",
          "body": "在 docs 中写快速开始、常见问题和实际教程，按 sidebar 与配置整理入口。"
        },
        {
          "title": "构建并发布文档",
          "body": "检查构建结果的图片、基础路径和失效链接，再部署到自己的托管平台。"
        }
      ],
      "cautions": [
        "文档站不自动提供登录、收费或业务后端，需要另外实现。",
        "复制官方文档需按 CC-BY-4.0 保留署名，自己的资料也要注明适用版本。"
      ]
    },
    "en": {
      "audience": "Developers building project docs, tutorials or team documentation",
      "difficulty": "Intermediate · Node.js and Markdown; React for customization",
      "access": "Create locally, build and deploy a static site",
      "cost": "MIT code; domain and hosting separate; no AI required",
      "result": "Documentation website, Markdown and build output",
      "steps": [
        {
          "title": "Create a classic project",
          "body": "Follow the installation guide to create a classic template and start its local preview.",
          "href": "https://docusaurus.io/docs/installation"
        },
        {
          "title": "Replace the sample content",
          "body": "Write a quick start, FAQ and real tutorial in docs, then arrange sidebars and navigation."
        },
        {
          "title": "Build and publish",
          "body": "Build the static output, inspect images, base paths and broken links, then deploy to your chosen host."
        }
      ],
      "cautions": [
        "A documentation site does not automatically include authentication, payments or an application backend.",
        "Reusing official docs requires CC-BY-4.0 attribution; record the version your own instructions apply to."
      ]
    }
  },
  {
    "slug": "open-webui",
    "sourceUrl": "https://github.com/open-webui/open-webui",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "GitHub · open-webui/open-webui",
        "href": "https://github.com/open-webui/open-webui"
      },
      {
        "label": "Official guide",
        "href": "https://docs.openwebui.com/"
      }
    ],
    "zh": {
      "audience": "能配置模型服务、希望自己管理 AI 工作区的人",
      "difficulty": "进阶 · 部署、模型服务与权限配置",
      "access": "自部署界面；需要另行连接可用模型",
      "cost": "界面许可与模型费用分开；API、硬件、存储可能收费",
      "result": "连接实际模型的聊天界面与个人知识资料",
      "steps": [
        {
          "title": "先确认模型可用",
          "body": "确认自己的推理入口和模型使用许可，再按官方文档部署 WebUI 并挂载数据目录。",
          "href": "https://docs.openwebui.com/"
        },
        {
          "title": "连接后做一个小任务",
          "body": "在设置中配置模型连接，发送非敏感问题，确认回复来自实际服务。"
        },
        {
          "title": "少量资料逐步加入",
          "body": "仅添加有权处理的文档，核对问答引用和账号权限；需要工具时逐项授权。"
        }
      ],
      "cautions": [
        "界面本身不附送模型额度；联网 API 和本地推理成本由实际配置决定。",
        "当前许可含品牌保留要求，资料上传与工具执行前需核对数据去向和权限。"
      ]
    },
    "en": {
      "audience": "People who can configure model services and want to manage an AI workspace",
      "difficulty": "Intermediate · deployment, models and access controls",
      "access": "Self-hosted interface; a working model connection is separate",
      "cost": "Interface terms and model costs differ; APIs, hardware and storage may cost extra",
      "result": "Chat interface connected to real models and your knowledge documents",
      "steps": [
        {
          "title": "Confirm the model works first",
          "body": "Check your inference endpoint and model terms, then deploy WebUI using official docs with persistent data.",
          "href": "https://docs.openwebui.com/"
        },
        {
          "title": "Connect and try a small task",
          "body": "Configure the chosen model in settings and ask a non-sensitive question to confirm a real reply."
        },
        {
          "title": "Add documents gradually",
          "body": "Add only documents you may process, inspect cited answers and account access, and authorize tools individually."
        }
      ],
      "cautions": [
        "The interface includes no model credits; API and local inference costs depend on your setup.",
        "Current terms include branding conditions; check data destinations and permissions before uploads or tool execution."
      ]
    }
  },
  {
    "slug": "mermaid-live",
    "sourceUrl": "https://github.com/mermaid-js/mermaid-live-editor",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "GitHub · mermaid-js/mermaid-live-editor",
        "href": "https://github.com/mermaid-js/mermaid-live-editor"
      },
      {
        "label": "Official guide",
        "href": "https://github.com/mermaid-js/mermaid-live-editor#features"
      }
    ],
    "zh": {
      "audience": "需要在方案书、README 或报告中说明流程的人",
      "difficulty": "入门 · 学一点 Mermaid 语法",
      "access": "官方在线编辑器；也可自行部署",
      "cost": "MIT 工具；基础绘图无需模型，自托管另计",
      "result": "图形与 Mermaid 文本源码",
      "steps": [
        {
          "title": "从简单流程开始",
          "body": "在官方编辑器选择 flowchart 示例，将节点替换成自己的输入、处理和结果。",
          "href": "https://mermaid.live"
        },
        {
          "title": "检查关系",
          "body": "按真实顺序连接节点，标注分支条件；查看右侧错误提示，修正语法。"
        },
        {
          "title": "保留源码再导出",
          "body": "复制文本到项目文档，导出 SVG 或分享链接，检查公开内容范围。"
        }
      ],
      "cautions": [
        "它不会执行图中的流程，也不会判断逻辑正确性。",
        "分享链接可能包含源码；部分导出会使用外部渲染服务，私密内容先核对。"
      ]
    },
    "en": {
      "audience": "People explaining processes in proposals, READMEs or reports",
      "difficulty": "Beginner · a little Mermaid syntax",
      "access": "Official online editor or self-hosted instance",
      "cost": "MIT tool; basic diagrams need no model; self-hosting separate",
      "result": "Diagram and Mermaid text source",
      "steps": [
        {
          "title": "Start with a simple flow",
          "body": "Choose a flowchart example in the official editor and replace nodes with your inputs, processing and outputs.",
          "href": "https://mermaid.live"
        },
        {
          "title": "Check the relationships",
          "body": "Connect steps in actual order, label conditions and resolve syntax errors shown in the preview."
        },
        {
          "title": "Keep source before exporting",
          "body": "Keep the Mermaid text in your project docs, export SVG or share a link and inspect what becomes public."
        }
      ],
      "cautions": [
        "The editor explains a flow; it does not execute it or verify its logic.",
        "Share links may contain diagram source; some exports use external renderers, so check before using private text."
      ]
    },
    "experienceUrl": "https://mermaid.live"
  },
  {
    "slug": "reactive-resume",
    "sourceUrl": "https://github.com/reactive-resume/reactive-resume",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "GitHub",
        "href": "https://github.com/reactive-resume/reactive-resume"
      },
      {
        "label": "Official guide",
        "href": "https://docs.rxresu.me/getting-started"
      }
    ],
    "zh": {
      "audience": "正在投递实习、工作或准备不同岗位简历的人",
      "difficulty": "入门 · 准备真实经历即可",
      "access": "官方在线编辑器；也可自部署",
      "cost": "简历编辑与导出免费；可选 AI 与自己的部署成本另计",
      "result": "可继续编辑的简历与 PDF，或自选公开分享链接",
      "steps": [
        {
          "title": "先准备事实",
          "body": "列出教育、项目、职责、成果证据和联系方式，删除不能证明的夸大表述。"
        },
        {
          "title": "建立岗位版本",
          "body": "在官方编辑器创建简历，选择模板并录入内容，优先保留和岗位相关的项目。",
          "href": "https://docs.rxresu.me/getting-started"
        },
        {
          "title": "检查导出与隐私",
          "body": "导出 PDF 后检查分页、字体和链接，保留可修改文件，决定分享范围。"
        }
      ],
      "cautions": [
        "工具排版不能保证通过招聘筛选，内容必须由你核对。",
        "在线服务会处理个人资料，AI 辅助需另配供应商并确认数据范围。"
      ]
    },
    "en": {
      "audience": "People applying for internships or jobs with role-specific resumes",
      "difficulty": "Beginner · factual experience",
      "access": "Official online editor or self-hosting",
      "cost": "Editing and export are free; optional AI and hosting cost extra",
      "result": "Editable resume and PDF or a chosen sharing link",
      "steps": [
        {
          "title": "Prepare facts",
          "body": "Collect education, projects, responsibilities and supported achievements; remove unprovable claims."
        },
        {
          "title": "Create a role-specific version",
          "body": "Create a resume, choose a template and prioritize relevant experience.",
          "href": "https://docs.rxresu.me/getting-started"
        },
        {
          "title": "Inspect export and privacy",
          "body": "Inspect PDF pagination, fonts and links, keep editable source and decide sharing scope."
        }
      ],
      "cautions": [
        "Layout does not guarantee hiring-screen success; verify all facts.",
        "Online services process personal data; optional AI requires its own provider and data-scope decision."
      ]
    }
  },
  {
    "slug": "comfyui",
    "sourceUrl": "https://github.com/Comfy-Org/ComfyUI",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "Official getting-started guide",
        "href": "https://docs.comfy.org/get_started/first_generation"
      }
    ],
    "zh": {
      "audience": "希望控制图像生成过程，愿意学习模型与节点的创作者",
      "difficulty": "进阶 · 模型文件、硬件与节点基础",
      "access": "官方桌面应用或按设备选择的手动安装",
      "cost": "程序与模型许可分开；硬件、电费和可选 API 另计",
      "result": "实际生成的图像与可复用节点工作流",
      "steps": [
        {
          "title": "核对设备和安装方式",
          "body": "按 README 选择支持的安装方式，核对硬件与空间。",
          "href": "https://github.com/Comfy-Org/ComfyUI#installing"
        },
        {
          "title": "从官方模板起步",
          "body": "按首张图教程下载模型并放到指定目录，载入基础模板。",
          "href": "https://docs.comfy.org/get_started/first_generation"
        },
        {
          "title": "逐项调整后保存",
          "body": "用有权处理的提示或素材，逐项调整参数，保存图像和工作流并记录模型来源。"
        }
      ],
      "cautions": [
        "模型有单独使用条件和硬件要求，程序许可不等于模型商用授权。",
        "第三方节点可能执行代码，安装前核对来源；API 节点可能收费。"
      ]
    },
    "en": {
      "audience": "Creators learning models and nodes for controlled image generation",
      "difficulty": "Intermediate · model files, hardware and graph basics",
      "access": "Official desktop application or supported manual installation",
      "cost": "Software and model terms differ; hardware, power and optional APIs cost separately",
      "result": "Actual images and a reusable node workflow",
      "steps": [
        {
          "title": "Check hardware and installation",
          "body": "Choose a supported route in the README and check hardware and disk requirements.",
          "href": "https://github.com/Comfy-Org/ComfyUI#installing"
        },
        {
          "title": "Start with an official template",
          "body": "Follow the first-generation guide, place model files in documented folders and load the template.",
          "href": "https://docs.comfy.org/get_started/first_generation"
        },
        {
          "title": "Adjust and retain source",
          "body": "Use permitted prompts or assets, change parameters individually and retain image, workflow and model provenance."
        }
      ],
      "cautions": [
        "Models have separate terms and hardware needs; software licensing does not grant model rights.",
        "Custom nodes can execute code; verify sources and check API-node charges."
      ]
    }
  },
  {
    "slug": "astro-starlight",
    "sourceUrl": "https://github.com/withastro/starlight",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "Official getting-started guide",
        "href": "https://starlight.astro.build/getting-started/"
      }
    ],
    "zh": {
      "audience": "想把课程笔记、教程或公开知识写成网站的人",
      "difficulty": "进阶 · Markdown 与 Node.js",
      "access": "官方浏览器模板；本地创建项目后部署",
      "cost": "MIT 工具；域名与托管另计",
      "result": "可检索文档站、Markdown 与静态构建文件",
      "steps": [
        {
          "title": "先列读者问题",
          "body": "按快速开始、核心概念与常见问题整理内容，确定可以公开的资料。"
        },
        {
          "title": "创建模板并写正文",
          "body": "按官方命令创建项目，启动预览，在内容目录加入自己的 Markdown 或 MDX。",
          "href": "https://starlight.astro.build/getting-started/"
        },
        {
          "title": "构建后检查搜索和导航",
          "body": "构建站点，检查侧栏、链接、手机显示与搜索，再部署到自己的地址。"
        }
      ],
      "cautions": [
        "开发预览不能代替构建后搜索和部署路径的核对。",
        "发布后文档会公开，先清理不适合分享的个人或内部资料。"
      ]
    },
    "en": {
      "audience": "People publishing course notes, tutorials or public knowledge",
      "difficulty": "Intermediate · Markdown and Node.js",
      "access": "Official browser template or locally created project",
      "cost": "MIT tool; domain and hosting separate",
      "result": "Searchable docs site, Markdown and static build files",
      "steps": [
        {
          "title": "List reader questions",
          "body": "Organize a quick start, concepts and FAQs and decide what may be public."
        },
        {
          "title": "Create a template and write",
          "body": "Use official setup, start preview and add Markdown or MDX in the content directory.",
          "href": "https://starlight.astro.build/getting-started/"
        },
        {
          "title": "Build and inspect navigation",
          "body": "Check sidebars, links, mobile layout and search in the build before deployment."
        }
      ],
      "cautions": [
        "A development preview does not verify built search or deployment paths.",
        "Published docs are public; remove private and internal material first."
      ]
    }
  },
  {
    "slug": "excalidraw",
    "sourceUrl": "https://github.com/excalidraw/excalidraw",
    "experienceUrl": "https://excalidraw.com/",
    "checkedAt": "2026-10-14",
    "evidence": [
      {
        "label": "Official repository and online editor",
        "href": "https://github.com/excalidraw/excalidraw#excalidrawcom"
      }
    ],
    "zh": {
      "audience": "需要快速向队友说明方案、用户流程或架构的人",
      "difficulty": "入门 · 无需编程",
      "access": "官方在线白板；开发者可用开源组件",
      "cost": "基础在线白板可使用；Excalidraw+ 为单独服务",
      "result": "可编辑白板文件与 PNG 或 SVG 图",
      "steps": [
        {
          "title": "先画关键路径",
          "body": "用方框表示参与者或步骤，用箭头表达输入与结果。",
          "href": "https://excalidraw.com/"
        },
        {
          "title": "补上必要解释",
          "body": "标清边界、分支和责任人，需要讨论时开启协作，先确认分享范围。"
        },
        {
          "title": "保存可编辑文件",
          "body": "除导出图片外，保存 .excalidraw 文件，关闭前检查文件可以重新打开。"
        }
      ],
      "cautions": [
        "浏览器自动保存不是独立备份，清除数据或换设备可能丢失本地内容。",
        "图只表达方案，不能证明已实现，共享素材仍要确认使用权。"
      ]
    },
    "en": {
      "audience": "People explaining proposals, journeys or architecture to teammates",
      "difficulty": "Beginner · no programming required",
      "access": "Official online whiteboard or open-source component",
      "cost": "Basic online whiteboard available; Excalidraw+ is separate",
      "result": "Editable drawing and PNG or SVG exports",
      "steps": [
        {
          "title": "Draw an essential path",
          "body": "Use boxes for participants or steps and arrows for inputs and outcomes.",
          "href": "https://excalidraw.com/"
        },
        {
          "title": "Add necessary explanations",
          "body": "Label boundaries, branches and owners; check sharing scope before collaboration."
        },
        {
          "title": "Retain editable source",
          "body": "Save a .excalidraw file as well as an image and check it can reopen."
        }
      ],
      "cautions": [
        "Browser autosave is not a separate backup; clearing storage or changing devices may lose data.",
        "A diagram is not proof of implementation; check rights to shared assets."
      ]
    }
  }
];
