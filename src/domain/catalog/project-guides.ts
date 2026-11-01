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
  },
  {
    "slug": "diagram-design",
    "sourceUrl": "https://github.com/cathrynlavery/diagram-design",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · cathrynlavery/diagram-design",
        "href": "https://github.com/cathrynlavery/diagram-design"
      },
      {
        "label": "Official site",
        "href": "https://diagramdesign.dev"
      }
    ],
    "zh": {
      "audience": "要在作品集、比赛方案或 README 里放架构图、流程图的人",
      "difficulty": "入门 · 会用 Agent 就行",
      "access": "装进 Claude Code、Codex、Cursor 等支持 Agent Skills 的工具",
      "cost": "MIT 开源；画图消耗你 Agent 的模型额度",
      "result": "独立的 HTML + SVG 图表文件",
      "steps": [
        {
          "title": "安装技能",
          "body": "运行 npx skills add cathrynlavery/diagram-design；Claude Code 也可以用 /plugin marketplace add cathrynlavery/diagram-design。"
        },
        {
          "title": "换成自己的配色",
          "body": "对 Agent 说「onboard diagram-design to <你的网站>」，它会提取配色和字体，确认后生效。"
        },
        {
          "title": "开始画图",
          "body": "直接描述要画的系统或流程；想先看 45 种图表长什么样，打开官网示例。",
          "href": "https://diagramdesign.dev"
        }
      ],
      "cautions": [
        "它负责把图画好看，图里的结构和数据是否正确要自己核对。",
        "官方版本只在这个仓库发布，其他名字下的插件是非官方副本。"
      ]
    },
    "en": {
      "audience": "People who need architecture or flow diagrams for portfolios, pitches or READMEs",
      "difficulty": "Beginner · just use your agent",
      "access": "Install into Claude Code, Codex, Cursor or another Agent Skills host",
      "cost": "MIT open source; drawing uses your agent's model quota",
      "result": "A self-contained HTML + SVG diagram file",
      "steps": [
        {
          "title": "Install the skill",
          "body": "Run npx skills add cathrynlavery/diagram-design, or /plugin marketplace add cathrynlavery/diagram-design in Claude Code."
        },
        {
          "title": "Use your own palette",
          "body": "Tell your agent \"onboard diagram-design to <your site>\"; it extracts colors and fonts and applies them after you approve."
        },
        {
          "title": "Draw",
          "body": "Describe the system or flow you want; to see all 45 diagram types first, visit the official site.",
          "href": "https://diagramdesign.dev"
        }
      ],
      "cautions": [
        "It makes diagrams look good; check the structure and figures yourself.",
        "Official builds come only from this repository; listings under other names are unofficial copies."
      ]
    },
    "experienceUrl": "https://diagramdesign.dev"
  },
  {
    "slug": "word-atlas",
    "sourceUrl": "https://github.com/designfuchen/word-atlas",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · designfuchen/word-atlas",
        "href": "https://github.com/designfuchen/word-atlas"
      },
      {
        "label": "Live site",
        "href": "https://0xlei.tech/words/"
      }
    ],
    "zh": {
      "audience": "备考雅思、想做一个自己的背词工具的人",
      "difficulty": "进阶 · 需要 Node.js，换词库要处理数据",
      "access": "在线直接用，或本地运行开源版",
      "cost": "代码 MIT、词库 CC BY 4.0；换词库生成插画和录音另计",
      "result": "插画词卡、发音、间隔复习和词汇星图的背词网站",
      "steps": [
        {
          "title": "先在线体验",
          "body": "打开在线版，看一遍词卡、每日计划和星图。",
          "href": "https://0xlei.tech/words/"
        },
        {
          "title": "本地跑起来",
          "body": "git clone --depth 1 https://github.com/designfuchen/word-atlas.git，进入目录后 npm ci && npm run dev，打开 http://localhost:5188。"
        },
        {
          "title": "换成自己的词库",
          "body": "读 docs/dataset.md 了解词条字段，按 docs/pipeline.md 生成自己的词条、例句和插画，先做几十个词试效果。"
        }
      ],
      "cautions": [
        "原项目说明内容经过自动校验，尚未逐条人工审校，释义可能有误。",
        "在线版独立迭代，功能和仓库开源版可能不同。"
      ]
    },
    "en": {
      "audience": "IELTS learners who want to build their own vocabulary tool",
      "difficulty": "Intermediate · needs Node.js; new word lists need data work",
      "access": "Use online or run the open-source version locally",
      "cost": "Code MIT, vocabulary CC BY 4.0; generating new illustrations and audio costs extra",
      "result": "A vocabulary site with illustrated cards, audio, spaced repetition and a word star map",
      "steps": [
        {
          "title": "Try it online",
          "body": "Open the live site and look through the cards, daily plan and star map.",
          "href": "https://0xlei.tech/words/"
        },
        {
          "title": "Run it locally",
          "body": "git clone --depth 1 https://github.com/designfuchen/word-atlas.git, then npm ci && npm run dev and open http://localhost:5188."
        },
        {
          "title": "Use your own words",
          "body": "Read docs/dataset.md for entry fields and follow docs/pipeline.md to generate entries, examples and illustrations; start with a few dozen words."
        }
      ],
      "cautions": [
        "Content is automatically checked but not yet reviewed entry by entry; definitions may contain errors.",
        "The live site evolves separately and may differ from the repository."
      ]
    },
    "experienceUrl": "https://0xlei.tech/words/"
  },
  {
    "slug": "future-periodic-table",
    "sourceUrl": "https://github.com/SeanWong17/Future-Style-Periodic-Table",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · SeanWong17/Future-Style-Periodic-Table",
        "href": "https://github.com/SeanWong17/Future-Style-Periodic-Table"
      },
      {
        "label": "Live demo",
        "href": "https://seanwong17.github.io/Future-Style-Periodic-Table/"
      }
    ],
    "zh": {
      "audience": "想做一个酷炫学科可视化网页放进作品集的人",
      "difficulty": "入门 · 会一点 TypeScript 和 CSS",
      "access": "在线体验，或本地运行后改造",
      "cost": "MIT 开源；不需要 AI 模型",
      "result": "带热力图和 3D 原子模型的交互式周期表网页",
      "steps": [
        {
          "title": "先在线体验",
          "body": "点开几个元素，拖动 3D 原子模型，切换热力图。",
          "href": "https://seanwong17.github.io/Future-Style-Periodic-Table/"
        },
        {
          "title": "本地跑起来",
          "body": "git clone https://github.com/SeanWong17/Future-Style-Periodic-Table.git，进入目录后 npm install && npm run dev，打开 http://localhost:5173/。"
        },
        {
          "title": "改成你的版本",
          "body": "改 src/config/categories.ts 换分类和颜色，改 src/css/styles.css 换主题，或把数据换成别的学科。"
        }
      ],
      "cautions": [
        "元素数据来自原项目，用在报告里前请对照权威资料核对。"
      ]
    },
    "en": {
      "audience": "People who want a striking subject visualisation for their portfolio",
      "difficulty": "Beginner · a little TypeScript and CSS",
      "access": "Try the live demo or run and modify it locally",
      "cost": "MIT open source; no AI model required",
      "result": "An interactive periodic table with heat maps and 3D atom models",
      "steps": [
        {
          "title": "Try the demo",
          "body": "Open a few elements, drag the 3D atom and switch heat maps.",
          "href": "https://seanwong17.github.io/Future-Style-Periodic-Table/"
        },
        {
          "title": "Run it locally",
          "body": "git clone https://github.com/SeanWong17/Future-Style-Periodic-Table.git, then npm install && npm run dev and open http://localhost:5173/."
        },
        {
          "title": "Make it yours",
          "body": "Edit src/config/categories.ts for categories and colors, src/css/styles.css for the theme, or swap in data from another subject."
        }
      ],
      "cautions": [
        "Element data comes from the original project; verify it against authoritative sources before citing it."
      ]
    },
    "experienceUrl": "https://seanwong17.github.io/Future-Style-Periodic-Table/"
  },
  {
    "slug": "hyperframes",
    "sourceUrl": "https://github.com/heygen-com/hyperframes",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · heygen-com/hyperframes",
        "href": "https://github.com/heygen-com/hyperframes"
      },
      {
        "label": "Official site",
        "href": "https://hyperframes.heygen.com"
      }
    ],
    "zh": {
      "audience": "想用代码做视频、有编程 Agent 的人",
      "difficulty": "入门 · 会用 Agent 就能开始",
      "access": "官网 Studio 在线体验；本地用 CLI 或 Agent 技能",
      "cost": "Apache-2.0；渲染不需要模型，Agent 用量另计",
      "result": "用 HTML 写出来的 MP4 视频",
      "steps": [
        {
          "title": "先看效果",
          "body": "打开官网，看 Showcase 和 Playground 里的样例。",
          "href": "https://hyperframes.heygen.com"
        },
        {
          "title": "给 Agent 装技能",
          "body": "在视频项目目录运行 npx hyperframes skills update，或者 npx hyperframes init my-video 手动开始。"
        },
        {
          "title": "预览并导出",
          "body": "npx hyperframes preview 在浏览器里预览，满意后 npx hyperframes render 导出 MP4。"
        }
      ],
      "cautions": [
        "视频里用到的图片、视频和音乐要有使用授权。"
      ]
    },
    "en": {
      "audience": "People with a coding agent who want to make videos in code",
      "difficulty": "Beginner · if you can use an agent you can start",
      "access": "Studio online; CLI or agent skills locally",
      "cost": "Apache-2.0; rendering needs no model, agent usage costs extra",
      "result": "An MP4 video written in HTML",
      "steps": [
        {
          "title": "See examples",
          "body": "Open the site and browse Showcase and Playground.",
          "href": "https://hyperframes.heygen.com"
        },
        {
          "title": "Install the skills",
          "body": "In your video folder run npx hyperframes skills update, or start by hand with npx hyperframes init my-video."
        },
        {
          "title": "Preview and export",
          "body": "npx hyperframes preview in the browser, then npx hyperframes render to export MP4."
        }
      ],
      "cautions": [
        "Make sure you have rights to the images, clips and music you use."
      ]
    },
    "experienceUrl": "https://hyperframes.heygen.com"
  },
  {
    "slug": "hallmark",
    "sourceUrl": "https://github.com/Nutlope/hallmark",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · Nutlope/hallmark",
        "href": "https://github.com/Nutlope/hallmark"
      },
      {
        "label": "Theme gallery",
        "href": "https://www.usehallmark.com/"
      }
    ],
    "zh": {
      "audience": "想做个人主页、作品集或活动页的人",
      "difficulty": "入门 · 需要 Node.js 和编程 Agent",
      "access": "官网看主题；本地装成 Agent 技能",
      "cost": "MIT；Agent 用量另计",
      "result": "一个有设计感的独立 HTML 页面",
      "steps": [
        {
          "title": "挑主题",
          "body": "在官网浏览 50 套主题，找一两套喜欢的。",
          "href": "https://www.usehallmark.com/"
        },
        {
          "title": "装技能",
          "body": "运行 npx skills add nutlope/hallmark -g，浏览器检查还要装 Chrome 和 puppeteer-core。"
        },
        {
          "title": "做页面",
          "body": "告诉 Agent 页面给谁看、要访客做什么，提供真实照片和数字，从三套候选主题里挑一套。"
        }
      ],
      "cautions": [
        "它不会替你编数字和照片，素材要自己准备。"
      ]
    },
    "en": {
      "audience": "People building a personal site, portfolio or event page",
      "difficulty": "Beginner · needs Node.js and a coding agent",
      "access": "Browse themes online; install as an agent skill",
      "cost": "MIT; agent usage costs extra",
      "result": "A self-contained HTML page that looks designed",
      "steps": [
        {
          "title": "Pick a theme",
          "body": "Browse the 50 themes on the site.",
          "href": "https://www.usehallmark.com/"
        },
        {
          "title": "Install the skill",
          "body": "Run npx skills add nutlope/hallmark -g; browser checks also need Chrome and puppeteer-core."
        },
        {
          "title": "Build the page",
          "body": "Tell your agent who the page is for and what visitors should do, give it real photos and numbers, and pick one of three themes."
        }
      ],
      "cautions": [
        "It will not invent numbers or photos; bring your own material."
      ]
    },
    "experienceUrl": "https://www.usehallmark.com/"
  },
  {
    "slug": "anatomy",
    "sourceUrl": "https://github.com/wheresryan22/anatomy",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · wheresryan22/anatomy",
        "href": "https://github.com/wheresryan22/anatomy"
      },
      {
        "label": "Gallery",
        "href": "https://skills.wheresryan.sh/anatomy"
      }
    ],
    "zh": {
      "audience": "要做课程汇报、想把抽象概念讲清楚的人",
      "difficulty": "入门 · 一条命令装好",
      "access": "在线图库看样例；本地装成 Agent 技能",
      "cost": "MIT；不需要 API Key，Agent 用量另计",
      "result": "一张能交互的机械解释图",
      "steps": [
        {
          "title": "看图库",
          "body": "打开在线图库，拖一拖火箭发动机、水波槽这些样例。",
          "href": "https://skills.wheresryan.sh/anatomy"
        },
        {
          "title": "装技能",
          "body": "运行 npx skills add wheresryan22/anatomy -g，选你用的 Agent。"
        },
        {
          "title": "讲你的概念",
          "body": "在 Agent 里输入 /anatomy 加一个课上学过的概念，说明要不要能交互。"
        }
      ],
      "cautions": []
    },
    "en": {
      "audience": "People preparing course presentations who need to explain abstract ideas",
      "difficulty": "Beginner · one command to install",
      "access": "Gallery online; install as an agent skill",
      "cost": "MIT; no API key, agent usage costs extra",
      "result": "An interactive mechanical explainer",
      "steps": [
        {
          "title": "Browse the gallery",
          "body": "Open the gallery and play with the rocket engine and ripple tank examples.",
          "href": "https://skills.wheresryan.sh/anatomy"
        },
        {
          "title": "Install the skill",
          "body": "Run npx skills add wheresryan22/anatomy -g and choose your agent."
        },
        {
          "title": "Explain your concept",
          "body": "Type /anatomy plus a concept from your courses and say whether it should be interactive."
        }
      ],
      "cautions": []
    },
    "experienceUrl": "https://skills.wheresryan.sh/anatomy"
  },
  {
    "slug": "kami",
    "sourceUrl": "https://github.com/tw93/Kami",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · tw93/Kami",
        "href": "https://github.com/tw93/Kami"
      },
      {
        "label": "Official site",
        "href": "https://kami.tw93.fun"
      }
    ],
    "zh": {
      "audience": "要写简历、做一页纸介绍或报告的人",
      "difficulty": "入门 · 一条命令装好",
      "access": "官网看样张；本地装成 Agent 技能",
      "cost": "MIT；Agent 用量另计",
      "result": "排好版的 PDF、PNG 或可编辑 PPT",
      "steps": [
        {
          "title": "看样张",
          "body": "在官网看简历、一页纸、信件等样张。",
          "href": "https://kami.tw93.fun"
        },
        {
          "title": "装技能",
          "body": "运行 npx skills add tw93/kami -a claude-code codex cursor -g -y。Windows 要在 WSL 里用。"
        },
        {
          "title": "做文档",
          "body": "在 Agent 里输入 /kami，说清用哪种模板、放哪些内容；缺中文字体时运行 ensure-fonts.sh。"
        }
      ],
      "cautions": [
        "Windows 原生环境不支持，要用 WSL。"
      ]
    },
    "en": {
      "audience": "People writing resumes, one-pagers or reports",
      "difficulty": "Beginner · one command to install",
      "access": "Samples online; install as an agent skill",
      "cost": "MIT; agent usage costs extra",
      "result": "Laid-out PDF, PNG or editable PPT",
      "steps": [
        {
          "title": "See samples",
          "body": "Look at the resume, one-pager and letter samples.",
          "href": "https://kami.tw93.fun"
        },
        {
          "title": "Install the skill",
          "body": "Run npx skills add tw93/kami -a claude-code codex cursor -g -y. On Windows use WSL."
        },
        {
          "title": "Make a document",
          "body": "Type /kami in your agent with the template and content; run ensure-fonts.sh if CJK fonts are missing."
        }
      ],
      "cautions": [
        "Native Windows is not supported; use WSL."
      ]
    },
    "experienceUrl": "https://kami.tw93.fun"
  },
  {
    "slug": "gitfut",
    "sourceUrl": "https://github.com/Younesfdj/gitfut",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · Younesfdj/gitfut",
        "href": "https://github.com/Younesfdj/gitfut"
      },
      {
        "label": "Live site",
        "href": "https://gitfut.com/"
      }
    ],
    "zh": {
      "audience": "想做一张能晒的数据卡片、给个人主页加点料的人",
      "difficulty": "进阶 · 改数据来源要会 Next.js",
      "access": "在线直接生成；本地跑开源版",
      "cost": "MIT；不需要模型",
      "result": "会随数据更新的球星卡和球探报告",
      "steps": [
        {
          "title": "看自己的卡",
          "body": "打开官网输入 GitHub 用户名。",
          "href": "https://gitfut.com/"
        },
        {
          "title": "本地跑起来",
          "body": "git clone https://github.com/Younesfdj/gitfut，进入目录 npm install，按 CONTRIBUTING.md 配好 GITHUB_TOKEN 后 npm run dev。"
        },
        {
          "title": "换成你的数据",
          "body": "把六项属性的数据来源换成刷题、运动或别的数据，卡片样式沿用。"
        }
      ],
      "cautions": [
        "GitHub Token 只给读权限，不要提交进仓库。"
      ]
    },
    "en": {
      "audience": "People who want a shareable stats card for their profile",
      "difficulty": "Intermediate · changing data sources needs Next.js",
      "access": "Generate online; run the open-source version locally",
      "cost": "MIT; no model needed",
      "result": "A live-updating player card and scout report",
      "steps": [
        {
          "title": "See your card",
          "body": "Open the site and enter a GitHub username.",
          "href": "https://gitfut.com/"
        },
        {
          "title": "Run it locally",
          "body": "git clone https://github.com/Younesfdj/gitfut, npm install, set GITHUB_TOKEN as in CONTRIBUTING.md, then npm run dev."
        },
        {
          "title": "Use your own data",
          "body": "Point the six attributes at practice, workout or other data and keep the card style."
        }
      ],
      "cautions": [
        "Give the GitHub token read-only access and never commit it."
      ]
    },
    "experienceUrl": "https://gitfut.com/"
  },
  {
    "slug": "ian-xiaohei-illustrations",
    "sourceUrl": "https://github.com/helloianneo/ian-xiaohei-illustrations",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · helloianneo/ian-xiaohei-illustrations",
        "href": "https://github.com/helloianneo/ian-xiaohei-illustrations"
      }
    ],
    "zh": {
      "audience": "写公众号、博客，想给文章配图的人",
      "difficulty": "入门 · 复制一个文件夹就装好",
      "access": "装进 Codex 使用",
      "cost": "MIT；生图模型用量另计",
      "result": "一组白底手绘的文章配图",
      "steps": [
        {
          "title": "装技能",
          "body": "git clone 仓库，把 ian-xiaohei-illustrations 目录复制到 ~/.codex/skills/。"
        },
        {
          "title": "先做规划",
          "body": "在 Codex 里让它先不生图，分析文章哪里值得配图，给出 4–8 张图的规划。"
        },
        {
          "title": "再生图",
          "body": "规划满意后再生成 PNG，想换风格就把小黑换成自己的角色。"
        }
      ],
      "cautions": [
        "样例图只用来校准风格，不要照抄构图。"
      ]
    },
    "en": {
      "audience": "People who write articles or blogs and need illustrations",
      "difficulty": "Beginner · copy one folder to install",
      "access": "Use inside Codex",
      "cost": "MIT; image-model usage costs extra",
      "result": "A set of hand-drawn article illustrations",
      "steps": [
        {
          "title": "Install the skill",
          "body": "Clone the repository and copy the ian-xiaohei-illustrations folder into ~/.codex/skills/."
        },
        {
          "title": "Plan first",
          "body": "Ask Codex not to generate yet and to plan 4–8 illustrations for your article."
        },
        {
          "title": "Then generate",
          "body": "Once the plan is right, generate the PNGs; swap Xiaohei for your own character to change the style."
        }
      ],
      "cautions": [
        "The samples calibrate style only; do not copy their compositions."
      ]
    }
  },
  {
    "slug": "effective-html",
    "sourceUrl": "https://github.com/plannotator/effective-html",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · plannotator/effective-html",
        "href": "https://github.com/plannotator/effective-html"
      },
      {
        "label": "Guide",
        "href": "https://www.effectivehtml.com/"
      }
    ],
    "zh": {
      "audience": "要给课程项目、比赛作品画原型或做汇报页的人",
      "difficulty": "入门 · 一条命令装好",
      "access": "在线看指南；本地装成 Agent 技能",
      "cost": "MIT；Agent 用量另计",
      "result": "一个能直接打开的 HTML 原型或说明页",
      "steps": [
        {
          "title": "看指南",
          "body": "打开 Effective HTML 指南，了解八个技能各做什么。",
          "href": "https://www.effectivehtml.com/"
        },
        {
          "title": "装技能",
          "body": "运行 npx skills add plannotator/effective-html，也可以不装，直接把仓库给 Agent 当参考。"
        },
        {
          "title": "做一个原型",
          "body": "选 html-wireframe、html-prototype 或 one-pager，说清页面和内容，用浏览器打开生成的 HTML。"
        }
      ],
      "cautions": []
    },
    "en": {
      "audience": "People prototyping course or competition projects",
      "difficulty": "Beginner · one command to install",
      "access": "Guide online; install as an agent skill",
      "cost": "MIT; agent usage costs extra",
      "result": "An HTML prototype or explainer you can open directly",
      "steps": [
        {
          "title": "Read the guide",
          "body": "Open the Effective HTML guide to see what the eight skills do.",
          "href": "https://www.effectivehtml.com/"
        },
        {
          "title": "Install the skills",
          "body": "Run npx skills add plannotator/effective-html, or just give the repository to your agent as reference."
        },
        {
          "title": "Build a prototype",
          "body": "Pick html-wireframe, html-prototype or one-pager, describe the pages, and open the HTML in your browser."
        }
      ],
      "cautions": []
    },
    "experienceUrl": "https://www.effectivehtml.com/"
  },
  {
    "slug": "manimgx",
    "sourceUrl": "https://github.com/academa-labs/manimgx",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · academa-labs/manimgx",
        "href": "https://github.com/academa-labs/manimgx"
      },
      {
        "label": "Documentation",
        "href": "https://manimgx.academa.ai"
      }
    ],
    "zh": {
      "audience": "想做数学、物理讲解视频的人",
      "difficulty": "进阶 · 要会一点 Python",
      "access": "本地 pip 安装；也可以让 Agent 按官网说明装",
      "cost": "MIT；渲染不需要模型",
      "result": "1080p60 的数学动画视频",
      "steps": [
        {
          "title": "看文档和样例",
          "body": "打开官网看 Quickstart 和 Examples。",
          "href": "https://manimgx.academa.ai"
        },
        {
          "title": "安装",
          "body": "Python 3.13 以上运行 pip install manimgx，字体和视频编码已包含。"
        },
        {
          "title": "写一个场景",
          "body": "照 Quickstart 写 scene.py，manimgx render scene.py 得到 MP4。"
        }
      ],
      "cautions": [
        "需要 Python 3.13 或更高版本。"
      ]
    },
    "en": {
      "audience": "People making math or physics explainer videos",
      "difficulty": "Intermediate · some Python needed",
      "access": "pip install locally, or let an agent follow the site's instructions",
      "cost": "MIT; rendering needs no model",
      "result": "A 1080p60 math animation",
      "steps": [
        {
          "title": "Read the docs",
          "body": "Open the Quickstart and Examples on the site.",
          "href": "https://manimgx.academa.ai"
        },
        {
          "title": "Install",
          "body": "With Python 3.13+ run pip install manimgx; fonts and encoding are included."
        },
        {
          "title": "Write a scene",
          "body": "Follow the Quickstart to write scene.py, then manimgx render scene.py."
        }
      ],
      "cautions": [
        "Requires Python 3.13 or later."
      ]
    },
    "experienceUrl": "https://manimgx.academa.ai"
  },
  {
    "slug": "god-agent-town",
    "sourceUrl": "https://github.com/XiaoLuoLYG/GOD",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · XiaoLuoLYG/GOD",
        "href": "https://github.com/XiaoLuoLYG/GOD"
      },
      {
        "label": "Public site",
        "href": "https://xiaoluolyg.github.io/GOD/"
      }
    ],
    "zh": {
      "audience": "对多智能体、AI 小镇感兴趣的人",
      "difficulty": "进阶 · 本地跑要配模型 API",
      "access": "浏览器看回放；本地一键启动",
      "cost": "Apache-2.0；本地运行按模型调用计费",
      "result": "能回放、能干预的 AI 小镇",
      "steps": [
        {
          "title": "看回放",
          "body": "打开公开站点，不用安装和 API Key。",
          "href": "https://xiaoluolyg.github.io/GOD/"
        },
        {
          "title": "本地启动",
          "body": "git clone https://github.com/XiaoLuoLYG/GOD.git，进入目录运行 ./scripts/god.sh start，按向导填模型信息。"
        },
        {
          "title": "换居民和地图",
          "body": "把居民换成你的同学或角色，写好性格和关系，再换一张地图。"
        }
      ],
      "cautions": [
        "原项目说明它用来观察语言模型智能体，不代表真实社会。"
      ]
    },
    "en": {
      "audience": "People curious about multi-agent towns",
      "difficulty": "Intermediate · local runs need a model API",
      "access": "Replays in the browser; one-command local start",
      "cost": "Apache-2.0; local runs pay for model calls",
      "result": "A replayable, steerable AI town",
      "steps": [
        {
          "title": "Watch replays",
          "body": "Open the public site; no install or API key.",
          "href": "https://xiaoluolyg.github.io/GOD/"
        },
        {
          "title": "Start locally",
          "body": "git clone https://github.com/XiaoLuoLYG/GOD.git, run ./scripts/god.sh start and fill in your model."
        },
        {
          "title": "Swap residents and map",
          "body": "Turn residents into your classmates or characters, write their traits and relationships, and change the map."
        }
      ],
      "cautions": [
        "The project inspects language-agent societies and does not claim social realism."
      ]
    },
    "experienceUrl": "https://xiaoluolyg.github.io/GOD/"
  },
  {
    "slug": "ai-engineering-from-scratch",
    "sourceUrl": "https://github.com/rohitg00/ai-engineering-from-scratch",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · rohitg00/ai-engineering-from-scratch",
        "href": "https://github.com/rohitg00/ai-engineering-from-scratch"
      },
      {
        "label": "Course site",
        "href": "https://aiengineeringfromscratch.com"
      }
    ],
    "zh": {
      "audience": "想系统学 AI 工程、准备相关实习的人",
      "difficulty": "进阶 · 要会 Python",
      "access": "网站在线学；也可以克隆到本地跑",
      "cost": "MIT；部分课程要 GPU 或模型 API",
      "result": "跟着课程写出的代码和实验结果",
      "steps": [
        {
          "title": "在线开始",
          "body": "打开课程网站，从开发环境那一课开始。",
          "href": "https://aiengineeringfromscratch.com"
        },
        {
          "title": "克隆到本地",
          "body": "git clone https://github.com/rohitg00/ai-engineering-from-scratch.git，运行 verify.py --route beginner 检查环境。"
        },
        {
          "title": "选一条路线",
          "body": "挑一条学习路线和一个项目挑战，把结果整理成作品集。"
        }
      ],
      "cautions": [
        "部分课程需要 GPU 或付费模型 API。"
      ]
    },
    "en": {
      "audience": "People learning AI engineering or preparing for internships",
      "difficulty": "Intermediate · Python required",
      "access": "Learn online or run locally",
      "cost": "MIT; some lessons need a GPU or model API",
      "result": "Course code and experiment results",
      "steps": [
        {
          "title": "Start online",
          "body": "Open the course site and begin with the dev environment lesson.",
          "href": "https://aiengineeringfromscratch.com"
        },
        {
          "title": "Clone locally",
          "body": "git clone https://github.com/rohitg00/ai-engineering-from-scratch.git and run verify.py --route beginner."
        },
        {
          "title": "Pick a route",
          "body": "Choose a learning route and a project challenge, and collect the results as a portfolio."
        }
      ],
      "cautions": [
        "Some lessons need a GPU or a paid model API."
      ]
    },
    "experienceUrl": "https://aiengineeringfromscratch.com"
  },
  {
    "slug": "text-to-cad",
    "sourceUrl": "https://github.com/earthtojake/text-to-cad",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · earthtojake/text-to-cad",
        "href": "https://github.com/earthtojake/text-to-cad"
      },
      {
        "label": "Official site",
        "href": "https://www.texttocad.dev"
      }
    ],
    "zh": {
      "audience": "做课程设计、比赛样机、想 3D 打印的人",
      "difficulty": "入门 · 一条命令装好",
      "access": "本地装进 Agent 使用",
      "cost": "MIT；Agent 用量另计，打印和加工另计",
      "result": "能打印或加工的 3D 模型文件",
      "steps": [
        {
          "title": "看官网",
          "body": "打开官网看示例模型。",
          "href": "https://www.texttocad.dev"
        },
        {
          "title": "安装",
          "body": "macOS / Linux 运行 curl -fsSL https://texttocad.dev/install.sh | sh，Windows 用官网的 PowerShell 命令。"
        },
        {
          "title": "做一个零件",
          "body": "告诉 Agent 零件、尺寸和加工方式，在 CAD 预览里检查后导出文件。"
        }
      ],
      "cautions": []
    },
    "en": {
      "audience": "People doing design courses, competition prototypes or 3D printing",
      "difficulty": "Beginner · one command to install",
      "access": "Install into your agent",
      "cost": "MIT; agent usage, printing and machining cost extra",
      "result": "Printable or machinable 3D files",
      "steps": [
        {
          "title": "Visit the site",
          "body": "See example models on the site.",
          "href": "https://www.texttocad.dev"
        },
        {
          "title": "Install",
          "body": "On macOS / Linux run curl -fsSL https://texttocad.dev/install.sh | sh; Windows uses the PowerShell command on the site."
        },
        {
          "title": "Make a part",
          "body": "Tell your agent the part, size and fabrication method, check it in the viewer and export."
        }
      ],
      "cautions": []
    },
    "experienceUrl": "https://www.texttocad.dev"
  },
  {
    "slug": "tiny-world-builder",
    "sourceUrl": "https://github.com/jasonkneen/tiny-world-builder",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · jasonkneen/tiny-world-builder",
        "href": "https://github.com/jasonkneen/tiny-world-builder"
      },
      {
        "label": "Live site",
        "href": "https://tinyworld.build"
      }
    ],
    "zh": {
      "audience": "想做一个可玩网页作品的人",
      "difficulty": "入门 · 在线就能玩",
      "access": "在线直接用；本地 npm run dev",
      "cost": "AGPL-3.0；不需要模型",
      "result": "能编辑、能飞进去看的 3D 体素世界",
      "steps": [
        {
          "title": "在线玩",
          "body": "打开在线版搭一块地试试。",
          "href": "https://tinyworld.build"
        },
        {
          "title": "本地跑起来",
          "body": "git clone https://github.com/jasonkneen/tiny-world-builder.git，进入目录 npm run dev，打开 http://localhost:3000/tiny-world-builder。"
        },
        {
          "title": "换成你的主题",
          "body": "加一组自己的道具和配色，搭出校园或家乡。"
        }
      ],
      "cautions": [
        "AGPL-3.0：改版公开部署时也要开源。"
      ]
    },
    "en": {
      "audience": "People who want a playable web project",
      "difficulty": "Beginner · playable online",
      "access": "Use online; npm run dev locally",
      "cost": "AGPL-3.0; no model needed",
      "result": "An editable 3D voxel world you can fly through",
      "steps": [
        {
          "title": "Play online",
          "body": "Open the live site and build a patch of land.",
          "href": "https://tinyworld.build"
        },
        {
          "title": "Run locally",
          "body": "git clone https://github.com/jasonkneen/tiny-world-builder.git, npm run dev, open http://localhost:3000/tiny-world-builder."
        },
        {
          "title": "Make it yours",
          "body": "Add your own props and colours to build your campus or hometown."
        }
      ],
      "cautions": [
        "AGPL-3.0: a publicly deployed remix must also be open source."
      ]
    },
    "experienceUrl": "https://tinyworld.build"
  },
  {
    "slug": "open-design",
    "sourceUrl": "https://github.com/nexu-io/open-design",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · nexu-io/open-design",
        "href": "https://github.com/nexu-io/open-design"
      },
      {
        "label": "Official site",
        "href": "https://open-design.ai"
      }
    ],
    "zh": {
      "audience": "要给项目出界面设计稿的人",
      "difficulty": "进阶 · 自己部署要 Docker 或 Node",
      "access": "云端版；或本地 Docker 部署",
      "cost": "Apache-2.0；云端版收费，模型用量另计",
      "result": "按设计规范生成的界面原型",
      "steps": [
        {
          "title": "看官网",
          "body": "打开官网了解云端版和下载版。",
          "href": "https://open-design.ai"
        },
        {
          "title": "本地部署",
          "body": "git clone https://github.com/nexu-io/open-design.git，cd open-design/deploy && docker compose up -d。"
        },
        {
          "title": "出一套原型",
          "body": "写清楚项目和页面，定好颜色和字体，让它生成原型。"
        }
      ],
      "cautions": [
        "云端版收费；开源版自己部署免费，但模型调用要付费。"
      ]
    },
    "en": {
      "audience": "People who need interface designs for a project",
      "difficulty": "Intermediate · self-hosting needs Docker or Node",
      "access": "Cloud version, or self-host with Docker",
      "cost": "Apache-2.0; cloud is paid, model usage extra",
      "result": "Interface prototypes that follow a design system",
      "steps": [
        {
          "title": "Visit the site",
          "body": "Read about the cloud and desktop versions.",
          "href": "https://open-design.ai"
        },
        {
          "title": "Self-host",
          "body": "git clone https://github.com/nexu-io/open-design.git, then cd open-design/deploy && docker compose up -d."
        },
        {
          "title": "Make prototypes",
          "body": "Describe the project and screens, set colours and type, and generate."
        }
      ],
      "cautions": [
        "The cloud version is paid; self-hosting is free but model calls cost money."
      ]
    },
    "experienceUrl": "https://open-design.ai"
  },
  {
    "slug": "impeccable",
    "sourceUrl": "https://github.com/pbakaus/impeccable",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · pbakaus/impeccable",
        "href": "https://github.com/pbakaus/impeccable"
      },
      {
        "label": "Docs",
        "href": "https://impeccable.style/docs"
      }
    ],
    "zh": {
      "audience": "做了网页、想改得更有设计感的人",
      "difficulty": "入门 · 一条命令装好",
      "access": "本地装进项目和 Agent",
      "cost": "Apache-2.0；检查规则不需要模型",
      "result": "改过一版的界面和问题清单",
      "steps": [
        {
          "title": "看前后对比",
          "body": "打开官网看同一份需求用和不用的对比。",
          "href": "https://impeccable.style"
        },
        {
          "title": "装进项目",
          "body": "在项目根目录运行 npx impeccable install，重启 Agent 后运行 /impeccable init。"
        },
        {
          "title": "检查并修改",
          "body": "npx impeccable detect src/ 扫一遍，再用 /impeccable critique、polish 改。"
        }
      ],
      "cautions": []
    },
    "en": {
      "audience": "People who built a site and want it to look designed",
      "difficulty": "Beginner · one command to install",
      "access": "Install into your project and agent",
      "cost": "Apache-2.0; the detector needs no model",
      "result": "A revised interface and an issue list",
      "steps": [
        {
          "title": "See before and after",
          "body": "Open the site to compare the same brief with and without it.",
          "href": "https://impeccable.style"
        },
        {
          "title": "Install",
          "body": "Run npx impeccable install in your project root, reload your agent, run /impeccable init."
        },
        {
          "title": "Check and fix",
          "body": "Scan with npx impeccable detect src/, then use /impeccable critique and polish."
        }
      ],
      "cautions": []
    },
    "experienceUrl": "https://impeccable.style"
  },
  {
    "slug": "openmontage",
    "sourceUrl": "https://github.com/calesthio/OpenMontage",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · calesthio/OpenMontage",
        "href": "https://github.com/calesthio/OpenMontage"
      },
      {
        "label": "Official site",
        "href": "https://www.openmontage.video/"
      }
    ],
    "zh": {
      "audience": "要做宣传片、汇报视频的人",
      "difficulty": "进阶 · 要配 Python 环境",
      "access": "本地安装，在 Agent 里使用",
      "cost": "AGPL-3.0；接入付费生成服务另计",
      "result": "一支剪好的视频",
      "steps": [
        {
          "title": "看官网",
          "body": "打开官网看样片和支持的服务。",
          "href": "https://www.openmontage.video/"
        },
        {
          "title": "安装",
          "body": "git clone https://github.com/calesthio/OpenMontage.git，进入目录运行 make setup。"
        },
        {
          "title": "做一支视频",
          "body": "在 .env 填需要的 API Key（只用免费素材也行），在 Agent 里描述你要的视频。"
        }
      ],
      "cautions": [
        "AGPL-3.0：改版公开部署时也要开源。",
        "用到的素材要符合各素材库的授权条款。"
      ]
    },
    "en": {
      "audience": "People making promos or presentation videos",
      "difficulty": "Intermediate · needs a Python setup",
      "access": "Install locally and use through your agent",
      "cost": "AGPL-3.0; paid generation services cost extra",
      "result": "An edited video",
      "steps": [
        {
          "title": "Visit the site",
          "body": "See sample videos and supported services.",
          "href": "https://www.openmontage.video/"
        },
        {
          "title": "Install",
          "body": "git clone https://github.com/calesthio/OpenMontage.git and run make setup."
        },
        {
          "title": "Make a video",
          "body": "Add the API keys you need to .env (free footage alone works) and describe the video to your agent."
        }
      ],
      "cautions": [
        "AGPL-3.0: a publicly deployed remix must also be open source.",
        "Follow each stock library's licence for the footage you use."
      ]
    },
    "experienceUrl": "https://www.openmontage.video/"
  },
  {
    "slug": "how-to-live-better",
    "sourceUrl": "https://github.com/eternity4719/HowToLiveBetter",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · eternity4719/HowToLiveBetter",
        "href": "https://github.com/eternity4719/HowToLiveBetter"
      },
      {
        "label": "Online search page",
        "href": "https://eternity4719.github.io/HowToLiveBetter/"
      }
    ],
    "zh": {
      "audience": "想写一本自己的指南或手册的人",
      "difficulty": "入门 · 写内容为主",
      "access": "在线检索；本地预览",
      "cost": "正文 CC BY 4.0；不需要模型",
      "result": "能检索的指南网站和电子书",
      "steps": [
        {
          "title": "在线看",
          "body": "打开在线检索页，搜几条感兴趣的建议。",
          "href": "https://eternity4719.github.io/HowToLiveBetter/"
        },
        {
          "title": "本地预览",
          "body": "git clone https://github.com/eternity4719/HowToLiveBetter.git，进入目录 python -m http.server 8000。"
        },
        {
          "title": "写你的版本",
          "body": "沿用它的条目格式和证据分级，写一本新生手册或专业入门指南。"
        }
      ],
      "cautions": [
        "内容可能过时或有错，法律、医疗问题以当地部门和专业人士为准。",
        "转载改编要写明出处。"
      ]
    },
    "en": {
      "audience": "People who want to write their own guide or handbook",
      "difficulty": "Beginner · mostly writing",
      "access": "Search online; preview locally",
      "cost": "Text CC BY 4.0; no model needed",
      "result": "A searchable guide site and e-book",
      "steps": [
        {
          "title": "Read online",
          "body": "Open the search page and look up a few entries.",
          "href": "https://eternity4719.github.io/HowToLiveBetter/"
        },
        {
          "title": "Preview locally",
          "body": "git clone https://github.com/eternity4719/HowToLiveBetter.git, then python -m http.server 8000."
        },
        {
          "title": "Write your version",
          "body": "Reuse the entry format and evidence grades for a freshman handbook or subject primer."
        }
      ],
      "cautions": [
        "Content may be outdated or wrong; follow local authorities and professionals on legal and medical matters.",
        "Attribute the source when you adapt it."
      ]
    },
    "experienceUrl": "https://eternity4719.github.io/HowToLiveBetter/"
  },
  {
    "slug": "ai-agent-book",
    "sourceUrl": "https://github.com/bojieli/ai-agent-book",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · bojieli/ai-agent-book",
        "href": "https://github.com/bojieli/ai-agent-book"
      },
      {
        "label": "Read online",
        "href": "https://bojieli.github.io/ai-agent-book/astro/"
      }
    ],
    "zh": {
      "audience": "想搞懂 Agent 原理、自己做一个 Agent 的人",
      "difficulty": "进阶 · 跑实验要 Python 和模型 API",
      "access": "在线阅读；本地跑实验",
      "cost": "Apache-2.0；实验按模型调用计费",
      "result": "读完能跑通的实验和自己的 Agent",
      "steps": [
        {
          "title": "在线读",
          "body": "打开在线版，先读第一章。",
          "href": "https://bojieli.github.io/ai-agent-book/astro/"
        },
        {
          "title": "跑第一个实验",
          "body": "git clone https://github.com/bojieli/ai-agent-book.git，uv sync --locked --extra ch1 后运行 chapter1/context/main.py。"
        },
        {
          "title": "改成你的场景",
          "body": "挑一个实验，改成课程答疑之类自己关心的场景。"
        }
      ],
      "cautions": [
        "大部分实验要配置模型 API Key，会产生费用。"
      ]
    },
    "en": {
      "audience": "People who want to understand agents and build one",
      "difficulty": "Intermediate · experiments need Python and a model API",
      "access": "Read online; run experiments locally",
      "cost": "Apache-2.0; experiments pay for model calls",
      "result": "Working experiments and your own agent",
      "steps": [
        {
          "title": "Read online",
          "body": "Open the online edition and start with chapter 1.",
          "href": "https://bojieli.github.io/ai-agent-book/astro/"
        },
        {
          "title": "Run the first experiment",
          "body": "git clone https://github.com/bojieli/ai-agent-book.git, uv sync --locked --extra ch1, then run chapter1/context/main.py."
        },
        {
          "title": "Adapt it",
          "body": "Take one experiment and turn it into a scenario you care about, such as course Q&A."
        }
      ],
      "cautions": [
        "Most experiments need a model API key and cost money."
      ]
    },
    "experienceUrl": "https://bojieli.github.io/ai-agent-book/astro/"
  },
  {
    "slug": "train-llm-from-scratch",
    "sourceUrl": "https://github.com/FareedKhan-dev/train-llm-from-scratch",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · FareedKhan-dev/train-llm-from-scratch",
        "href": "https://github.com/FareedKhan-dev/train-llm-from-scratch"
      },
      {
        "label": "Documentation",
        "href": "https://fareedkhan-dev.github.io/train-llm-from-scratch/"
      }
    ],
    "zh": {
      "audience": "想亲手训练一个语言模型的人",
      "difficulty": "进阶 · 要会 Python",
      "access": "本地运行，笔记本 CPU 就能开始",
      "cost": "MIT；不需要外部模型，大模型要 GPU",
      "result": "一个自己训练的小语言模型",
      "steps": [
        {
          "title": "看文档",
          "body": "打开文档站，先读笔记本 CPU 那一节。",
          "href": "https://fareedkhan-dev.github.io/train-llm-from-scratch/"
        },
        {
          "title": "训练小模型",
          "body": "git clone 后 pip install -e .，运行 prepare_tiny_data.py，再 train_transformer.py --preset tiny --arch modern，约 5 分钟。"
        },
        {
          "title": "换成你的语料",
          "body": "把 TinyStories 换成诗歌、笔记或某位作家的文章，再训练一次。"
        }
      ],
      "cautions": [
        "大模型版本需要 GPU。"
      ]
    },
    "en": {
      "audience": "People who want to train a language model by hand",
      "difficulty": "Intermediate · Python required",
      "access": "Run locally; a laptop CPU is enough to start",
      "cost": "MIT; no external model, larger runs need a GPU",
      "result": "A small language model you trained",
      "steps": [
        {
          "title": "Read the docs",
          "body": "Open the docs and start with the laptop CPU section.",
          "href": "https://fareedkhan-dev.github.io/train-llm-from-scratch/"
        },
        {
          "title": "Train a tiny model",
          "body": "Clone, pip install -e ., run prepare_tiny_data.py, then train_transformer.py --preset tiny --arch modern (about 5 minutes)."
        },
        {
          "title": "Use your own corpus",
          "body": "Replace TinyStories with poems, notes or an author's essays and train again."
        }
      ],
      "cautions": [
        "Larger models need a GPU."
      ]
    },
    "experienceUrl": "https://fareedkhan-dev.github.io/train-llm-from-scratch/"
  },
  {
    "slug": "echo-loop",
    "sourceUrl": "https://github.com/echo-loop/Echo-Loop",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · echo-loop/Echo-Loop",
        "href": "https://github.com/echo-loop/Echo-Loop"
      },
      {
        "label": "Official site",
        "href": "https://www.echo-loop.top"
      }
    ],
    "zh": {
      "audience": "在练英语听说、想做学习类 App 的人",
      "difficulty": "进阶 · 改代码要 Flutter",
      "access": "下载 App 直接用；本地 Flutter 运行",
      "cost": "AGPL-3.0；部分 AI 功能要付费会员",
      "result": "一个英语听说训练 App",
      "steps": [
        {
          "title": "下载体验",
          "body": "从官网下载 App，导入一段音频练一轮。",
          "href": "https://www.echo-loop.top"
        },
        {
          "title": "本地运行",
          "body": "git clone https://github.com/echo-loop/Echo-Loop.git，进入目录 flutter pub get，再 flutter run。"
        },
        {
          "title": "改训练流程",
          "body": "换成你的练习材料，调整训练步骤和复习间隔。"
        }
      ],
      "cautions": [
        "AGPL-3.0：改版公开发布时也要开源。",
        "部分 AI 功能调用大模型，需要付费。"
      ]
    },
    "en": {
      "audience": "People practising English or building a learning app",
      "difficulty": "Intermediate · changes need Flutter",
      "access": "Download the app; run locally with Flutter",
      "cost": "AGPL-3.0; some AI features need a paid membership",
      "result": "An English listening and speaking app",
      "steps": [
        {
          "title": "Try the app",
          "body": "Download it from the site and practise one round with your audio.",
          "href": "https://www.echo-loop.top"
        },
        {
          "title": "Run locally",
          "body": "git clone https://github.com/echo-loop/Echo-Loop.git, flutter pub get, then flutter run."
        },
        {
          "title": "Change the flow",
          "body": "Use your own material and adjust the steps and review intervals."
        }
      ],
      "cautions": [
        "AGPL-3.0: a publicly released remix must also be open source.",
        "Some AI features call paid model services."
      ]
    },
    "experienceUrl": "https://www.echo-loop.top"
  },
  {
    "slug": "shiguang-schedule",
    "sourceUrl": "https://github.com/ShiGuangSchedule/shiguangschedule",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · ShiGuangSchedule/shiguangschedule",
        "href": "https://github.com/ShiGuangSchedule/shiguangschedule"
      },
      {
        "label": "Releases",
        "href": "https://github.com/ShiGuangSchedule/shiguangschedule/releases"
      }
    ],
    "zh": {
      "audience": "想要一个好用课表、或想给学校写适配的人",
      "difficulty": "入门 · 下载即用；写适配要会一点脚本",
      "access": "下载安装包使用",
      "cost": "Apache-2.0；不需要模型",
      "result": "能一键导入教务课表的课程表 App",
      "steps": [
        {
          "title": "下载安装",
          "body": "在仓库 Releases 下载对应平台的安装包。",
          "href": "https://github.com/ShiGuangSchedule/shiguangschedule/releases"
        },
        {
          "title": "打开开发者功能",
          "body": "在「更多」页面连点应用图标 5 次。"
        },
        {
          "title": "给学校写适配",
          "body": "参考项目的开源适配仓库，给自己学校写一个教务导入适配。"
        }
      ],
      "cautions": [
        "电脑版目前还在实验阶段。"
      ]
    },
    "en": {
      "audience": "Students who want a good timetable or to write an adapter for their school",
      "difficulty": "Beginner · download and use; adapters need some scripting",
      "access": "Download a build",
      "cost": "Apache-2.0; no model needed",
      "result": "A timetable app that imports from your academic system",
      "steps": [
        {
          "title": "Install",
          "body": "Download a build for your platform from Releases.",
          "href": "https://github.com/ShiGuangSchedule/shiguangschedule/releases"
        },
        {
          "title": "Enable developer features",
          "body": "Tap the app icon 5 times on the More page."
        },
        {
          "title": "Write an adapter",
          "body": "Use the project's open adapter repository to write one for your school."
        }
      ],
      "cautions": [
        "The desktop version is still experimental."
      ]
    }
  },
  {
    "slug": "models-dev",
    "sourceUrl": "https://github.com/anomalyco/models.dev",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · anomalyco/models.dev",
        "href": "https://github.com/anomalyco/models.dev"
      },
      {
        "label": "Live site",
        "href": "https://models.dev"
      }
    ],
    "zh": {
      "audience": "想做一个速查站、整理一类数据的人",
      "difficulty": "入门 · 需要 Bun",
      "access": "在线查；本地跑开源版",
      "cost": "MIT；不需要模型",
      "result": "能搜索的速查网站和数据接口",
      "steps": [
        {
          "title": "在线查",
          "body": "打开 models.dev 查几个模型的价格和上下文。",
          "href": "https://models.dev"
        },
        {
          "title": "本地跑起来",
          "body": "git clone https://github.com/anomalyco/models.dev.git，bun install 后在 packages/web 里 bun run dev。"
        },
        {
          "title": "换成你的数据",
          "body": "沿用「一个条目一个文件」的组织方式，换成竞赛、院校或奖学金数据。"
        }
      ],
      "cautions": []
    },
    "en": {
      "audience": "People who want to build a lookup site for one kind of data",
      "difficulty": "Beginner · needs Bun",
      "access": "Look up online; run the open-source version locally",
      "cost": "MIT; no model needed",
      "result": "A searchable lookup site and data API",
      "steps": [
        {
          "title": "Look it up",
          "body": "Open models.dev and check a few models' prices and context.",
          "href": "https://models.dev"
        },
        {
          "title": "Run locally",
          "body": "git clone https://github.com/anomalyco/models.dev.git, bun install, then bun run dev in packages/web."
        },
        {
          "title": "Use your data",
          "body": "Keep the one-file-per-entry layout and swap in competitions, programmes or scholarships."
        }
      ],
      "cautions": []
    },
    "experienceUrl": "https://models.dev"
  },
  {
    "slug": "chinese-poetry-api",
    "sourceUrl": "https://github.com/palemoky/chinese-poetry-api",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · palemoky/chinese-poetry-api",
        "href": "https://github.com/palemoky/chinese-poetry-api"
      },
      {
        "label": "Live site",
        "href": "https://poetry.palemoky.com"
      }
    ],
    "zh": {
      "audience": "想做一个数据接口、练后端的人",
      "difficulty": "入门 · 一条 Docker 命令",
      "access": "在线用；本地 Docker 部署",
      "cost": "GPL-3.0；不需要模型",
      "result": "能搜索的诗词接口服务",
      "steps": [
        {
          "title": "在线用",
          "body": "打开在线版搜几首诗。",
          "href": "https://poetry.palemoky.com"
        },
        {
          "title": "本地部署",
          "body": "docker run -d -p 1279:1279 palemoky/chinese-poetry-api:latest，再 curl http://localhost:1279/api/v1/stats 看数据。"
        },
        {
          "title": "换成你的数据",
          "body": "克隆仓库，把诗词库换成你的术语或题库，make process-data && make run-server。"
        }
      ],
      "cautions": []
    },
    "en": {
      "audience": "People building a data API or practising backend work",
      "difficulty": "Beginner · one Docker command",
      "access": "Use online; self-host with Docker",
      "cost": "GPL-3.0; no model needed",
      "result": "A searchable poetry API service",
      "steps": [
        {
          "title": "Use it online",
          "body": "Open the live site and search a few poems.",
          "href": "https://poetry.palemoky.com"
        },
        {
          "title": "Self-host",
          "body": "docker run -d -p 1279:1279 palemoky/chinese-poetry-api:latest, then curl http://localhost:1279/api/v1/stats."
        },
        {
          "title": "Use your data",
          "body": "Clone the repository, swap in your terms or questions, then make process-data && make run-server."
        }
      ],
      "cautions": []
    },
    "experienceUrl": "https://poetry.palemoky.com"
  },
  {
    "slug": "dashi-ppt-skill",
    "sourceUrl": "https://github.com/chuspeeism/dashi-ppt-skill",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · chuspeeism/dashi-ppt-skill",
        "href": "https://github.com/chuspeeism/dashi-ppt-skill"
      }
    ],
    "zh": {
      "audience": "要做答辩、路演、课堂汇报 PPT 的人",
      "difficulty": "入门 · 一条命令装好",
      "access": "本地装成 Agent 技能",
      "cost": "AGPL-3.0；Agent 用量另计",
      "result": "可编辑的 PPTX 或 PDF",
      "steps": [
        {
          "title": "安装",
          "body": "运行 npx dashi-ppt-skill@latest，国内网络加 --registry=https://registry.npmmirror.com。"
        },
        {
          "title": "生成 PPT",
          "body": "把文档交给 Agent，选一套主题生成。"
        },
        {
          "title": "改完导出",
          "body": "在浏览器里改不满意的页，再导出 PPTX 或 PDF。"
        }
      ],
      "cautions": [
        "AGPL-3.0：改版公开发布时也要开源。"
      ]
    },
    "en": {
      "audience": "People preparing defences, pitches or class presentations",
      "difficulty": "Beginner · one command to install",
      "access": "Install as an agent skill",
      "cost": "AGPL-3.0; agent usage costs extra",
      "result": "Editable PPTX or PDF",
      "steps": [
        {
          "title": "Install",
          "body": "Run npx dashi-ppt-skill@latest (in mainland China add --registry=https://registry.npmmirror.com)."
        },
        {
          "title": "Generate slides",
          "body": "Give your document to the agent and pick a theme."
        },
        {
          "title": "Edit and export",
          "body": "Fix slides in the browser, then export PPTX or PDF."
        }
      ],
      "cautions": [
        "AGPL-3.0: a publicly released remix must also be open source."
      ]
    }
  },
  {
    "slug": "figures4papers",
    "sourceUrl": "https://github.com/ChenLiu-1996/figures4papers",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · ChenLiu-1996/figures4papers",
        "href": "https://github.com/ChenLiu-1996/figures4papers"
      }
    ],
    "zh": {
      "audience": "写论文、课程报告需要画图的人",
      "difficulty": "入门 · 会运行 Python 脚本即可",
      "access": "本地运行脚本",
      "cost": "CC BY-NC 4.0：仅限非商用",
      "result": "风格统一的论文配图",
      "steps": [
        {
          "title": "下载脚本",
          "body": "git clone https://github.com/ChenLiu-1996/figures4papers.git。"
        },
        {
          "title": "找最像的图",
          "body": "在仓库里找到和你要画的图最像的脚本。"
        },
        {
          "title": "换数据出图",
          "body": "换上自己的数据和配色，运行脚本出图。"
        }
      ],
      "cautions": [
        "CC BY-NC 4.0：仅限非商用。",
        "用在论文里时，按学术规范引用相关论文。"
      ]
    },
    "en": {
      "audience": "People writing papers or course reports",
      "difficulty": "Beginner · just run Python scripts",
      "access": "Run scripts locally",
      "cost": "CC BY-NC 4.0: non-commercial only",
      "result": "Consistent paper-quality figures",
      "steps": [
        {
          "title": "Get the scripts",
          "body": "git clone https://github.com/ChenLiu-1996/figures4papers.git."
        },
        {
          "title": "Find the closest figure",
          "body": "Pick the script closest to the figure you need."
        },
        {
          "title": "Swap in your data",
          "body": "Use your data and colours and run the script."
        }
      ],
      "cautions": [
        "CC BY-NC 4.0: non-commercial only.",
        "Cite the related papers where academically appropriate."
      ]
    }
  },
  {
    "slug": "flint-chart",
    "sourceUrl": "https://github.com/microsoft/flint-chart",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · microsoft/flint-chart",
        "href": "https://github.com/microsoft/flint-chart"
      },
      {
        "label": "Project site",
        "href": "https://microsoft.github.io/flint-chart/"
      }
    ],
    "zh": {
      "audience": "要做数据图表、课程统计的人",
      "difficulty": "入门 · 装 MCP 或 npm 包",
      "access": "在线图库和编辑器；本地装 MCP 或 npm 包",
      "cost": "MIT；Agent 用量另计",
      "result": "可交互的图表",
      "steps": [
        {
          "title": "看图库",
          "body": "打开项目站，看图库，在编辑器里改一张图。",
          "href": "https://microsoft.github.io/flint-chart/"
        },
        {
          "title": "接到 Agent",
          "body": "按官网说明装好 MCP 服务器。"
        },
        {
          "title": "画你的数据",
          "body": "把一份自己的数据交给 Agent，说清要几张图、什么类型。"
        }
      ],
      "cautions": []
    },
    "en": {
      "audience": "People charting data or course statistics",
      "difficulty": "Beginner · install the MCP server or npm package",
      "access": "Gallery and editor online; MCP or npm locally",
      "cost": "MIT; agent usage costs extra",
      "result": "Interactive charts",
      "steps": [
        {
          "title": "Browse the gallery",
          "body": "Open the project site and edit a chart in the editor.",
          "href": "https://microsoft.github.io/flint-chart/"
        },
        {
          "title": "Connect your agent",
          "body": "Install the MCP server as described on the site."
        },
        {
          "title": "Chart your data",
          "body": "Give your agent your data and say how many charts and which types."
        }
      ],
      "cautions": []
    },
    "experienceUrl": "https://microsoft.github.io/flint-chart/"
  },
  {
    "slug": "numbat",
    "sourceUrl": "https://github.com/sharkdp/numbat",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · sharkdp/numbat",
        "href": "https://github.com/sharkdp/numbat"
      },
      {
        "label": "Try online",
        "href": "https://numbat.dev"
      }
    ],
    "zh": {
      "audience": "理工科学生、常算带单位题目的人",
      "difficulty": "入门 · 在线就能用",
      "access": "在线直接用；本地 cargo 安装",
      "cost": "MIT / Apache-2.0；不需要模型",
      "result": "能自动换算单位的计算器",
      "steps": [
        {
          "title": "在线试",
          "body": "打开 numbat.dev，输入 3 km/h -> m/s 试试。",
          "href": "https://numbat.dev"
        },
        {
          "title": "学基本写法",
          "body": "照官网 Tutorial 学单位、变量和函数的写法。"
        },
        {
          "title": "做你的计算集",
          "body": "写一组专业课常用计算，或者 cargo install -f --path numbat-cli 装到本地。"
        }
      ],
      "cautions": []
    },
    "en": {
      "audience": "Science and engineering students who calculate with units",
      "difficulty": "Beginner · works online",
      "access": "Use online; install locally with cargo",
      "cost": "MIT / Apache-2.0; no model needed",
      "result": "A calculator that converts units",
      "steps": [
        {
          "title": "Try online",
          "body": "Open numbat.dev and type 3 km/h -> m/s.",
          "href": "https://numbat.dev"
        },
        {
          "title": "Learn the basics",
          "body": "Follow the Tutorial for units, variables and functions."
        },
        {
          "title": "Build your set",
          "body": "Write common course calculations, or install locally with cargo install -f --path numbat-cli."
        }
      ],
      "cautions": []
    },
    "experienceUrl": "https://numbat.dev"
  },
  {
    "slug": "asciline",
    "sourceUrl": "https://github.com/YusufB5/ASCILINE",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · YusufB5/ASCILINE",
        "href": "https://github.com/YusufB5/ASCILINE"
      },
      {
        "label": "Official site",
        "href": "https://asciline.dev"
      }
    ],
    "zh": {
      "audience": "想做创意视频、玩视觉效果的人",
      "difficulty": "入门 · 会装 Python 包即可",
      "access": "本地运行",
      "cost": "服务端 AGPL-3.0、播放器 MIT；不需要模型",
      "result": "浏览器里播放的字符画视频",
      "steps": [
        {
          "title": "看官网",
          "body": "打开官网看字符画效果。",
          "href": "https://asciline.dev"
        },
        {
          "title": "安装",
          "body": "git clone https://github.com/YusufB5/ASCILINE.git，进入目录 pip install .。"
        },
        {
          "title": "转你的视频",
          "body": "python stream_server.py video.mp4 --cols 240，用浏览器打开终端里的地址。"
        }
      ],
      "cautions": [
        "改服务端并公开部署时要开源（AGPL-3.0）。"
      ]
    },
    "en": {
      "audience": "People making creative video or visual effects",
      "difficulty": "Beginner · just install a Python package",
      "access": "Run locally",
      "cost": "Server AGPL-3.0, player MIT; no model needed",
      "result": "An ASCII-art video in the browser",
      "steps": [
        {
          "title": "Visit the site",
          "body": "See the ASCII effect on the site.",
          "href": "https://asciline.dev"
        },
        {
          "title": "Install",
          "body": "git clone https://github.com/YusufB5/ASCILINE.git, then pip install .."
        },
        {
          "title": "Convert your video",
          "body": "python stream_server.py video.mp4 --cols 240 and open the address shown."
        }
      ],
      "cautions": [
        "A publicly deployed server remix must be open source (AGPL-3.0)."
      ]
    },
    "experienceUrl": "https://asciline.dev"
  },
  {
    "slug": "book-to-skill",
    "sourceUrl": "https://github.com/virgiliojr94/book-to-skill",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · virgiliojr94/book-to-skill",
        "href": "https://github.com/virgiliojr94/book-to-skill"
      }
    ],
    "zh": {
      "audience": "要复习、想把教材变成随身助手的人",
      "difficulty": "入门 · 一条命令装好",
      "access": "本地装成 Agent 技能",
      "cost": "MIT；Agent 用量另计",
      "result": "Agent 能随时查阅的技能包",
      "steps": [
        {
          "title": "安装",
          "body": "运行 npx skills add virgiliojr94/book-to-skill。"
        },
        {
          "title": "喂资料",
          "body": "在 Agent 里运行 /book-to-skill 加教材、讲义的文件或文件夹路径。"
        },
        {
          "title": "开始提问",
          "body": "生成后直接向 Agent 提问，让它注明出自哪一章。"
        }
      ],
      "cautions": [
        "只处理你有权使用的资料。"
      ]
    },
    "en": {
      "audience": "Students who want their textbooks as an on-call assistant",
      "difficulty": "Beginner · one command to install",
      "access": "Install as an agent skill",
      "cost": "MIT; agent usage costs extra",
      "result": "A skill your agent can consult",
      "steps": [
        {
          "title": "Install",
          "body": "Run npx skills add virgiliojr94/book-to-skill."
        },
        {
          "title": "Feed it sources",
          "body": "Run /book-to-skill with the path to your textbook or notes."
        },
        {
          "title": "Ask questions",
          "body": "Ask your agent and have it cite chapters."
        }
      ],
      "cautions": [
        "Only process material you have the right to use."
      ]
    }
  },
  {
    "slug": "gittype",
    "sourceUrl": "https://github.com/unhappychoice/gittype",
    "checkedAt": "2026-10-31",
    "evidence": [
      {
        "label": "GitHub · unhappychoice/gittype",
        "href": "https://github.com/unhappychoice/gittype"
      }
    ],
    "zh": {
      "audience": "写代码、想练打字速度的人",
      "difficulty": "入门 · 一条命令装好",
      "access": "本地终端运行",
      "cost": "MIT；不需要模型",
      "result": "终端里的打字游戏",
      "steps": [
        {
          "title": "安装",
          "body": "运行 cargo install gittype。"
        },
        {
          "title": "进入项目",
          "body": "cd 到你自己的一个代码项目。"
        },
        {
          "title": "开始练",
          "body": "运行 gittype，想换练习内容就改成单词或术语。"
        }
      ],
      "cautions": []
    },
    "en": {
      "audience": "Programmers who want to type faster",
      "difficulty": "Beginner · one command to install",
      "access": "Run in your terminal",
      "cost": "MIT; no model needed",
      "result": "A terminal typing game",
      "steps": [
        {
          "title": "Install",
          "body": "Run cargo install gittype."
        },
        {
          "title": "Open a project",
          "body": "cd into one of your own code projects."
        },
        {
          "title": "Start typing",
          "body": "Run gittype; swap the content for words or terms if you like."
        }
      ],
      "cautions": []
    }
  }

];
