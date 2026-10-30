#!/usr/bin/env node
/**
 * Seed 8 official ANS Market listings across all categories & fulfillment types
 * so users with 100-150 free compute points have rich tools to buy/run on /market.
 */
const { PrismaClient } = require("@prisma/client");

const OFFICIAL_MARKET_LISTINGS = [
  {
    slug: "ans-ecommerce-outbound-saas",
    status: "PUBLISHED",
    title: "ANS 电商智能外呼系统（全链路自动催付/邀评 + 360° 买家画像版）",
    summary: "帮电商商家全自动搞定未付款催付、物流异常提醒、签收好评返现邀约与老客复购召回，内置全店买家 360° 价值分层与黄金接听时段洞察。",
    description:
      "面向电商商家的全链路智能语音触达与买家 360° 画像增长系统（在线生产环境：https://waihu.cauai.fun）。\n\n支持 ANS (AI Never Stops) 统一账号一键免密登录，新商家默认零数据干净初始态并配备 4 步交互式新手引导。内置四大金牌电商客服声音在线试听与实时对话演练、12 大电商全链路自动化触达场景（下单未付催付、发货派送提醒、签收晒图邀评、售后安抚挽回、挂机利益点短信自动补发），以及全店买家 360° 价值分层（5 大核心人群 + 黄金接听时段锁定 + 高频退货号自动排集省话费）。",
    category: "business",
    subcategory: "services",
    fulfillment: "resource",
    priceMinor: 0,
    currency: "CNY",
    deliveryDays: 1,
    revisionLimit: 2,
    computeIncluded: false,
    deliverables: [
      "在线直达体验：https://waihu.cauai.fun（新商家 3 分钟快速上手引导 + ANS 账号一键登录）",
      "四大金牌电商客服声音在线试听与实时对话演练",
      "12 大电商全链路自动化触达场景（催付、发货、签收邀评、售后挽回、挂机短信联动）",
    ],
    licenseTerms: "ANS (AI Never Stops) 官方认证 SaaS 服务与专属部署交付，支持 ANS 账号一键免密登录直接体验。",
    coverUrl: "https://ans.cauai.fun/catalog/gitglow-v1/ans-ecommerce-outbound.webp",
    usageUrl: "https://waihu.cauai.fun",
    previewUrl: "https://waihu.cauai.fun",
    sourceUrl: "https://waihu.cauai.fun",
  },
  {
    slug: "cau-sci-paper-polisher-kit",
    title: "农学 SCI 论文摘要与文献综述精修工作台",
    summary: "面向智慧农业、植物保护、生物育种与资环方向，一键生成高水平英文 Abstract、Graphical Abstract 提示词与近五年文献对比矩阵。",
    description:
      "专为农业高校硕博研究生与科研团队打造。内置农学顶刊（Computers and Electronics in Agriculture、Plant Phenomics、Field Crops Research）高频学术句式库与审稿人关注点检查表。\n\n输入你的实验核心结论与中文初稿，即可输出符合地道学术规范的英文摘要、Highlights 三段论、科研机制图（Graphical Abstract）生图 Prompt 以及 Rebuttal 审稿回复模板。",
    category: "learning",
    subcategory: "research",
    fulfillment: "resource",
    priceMinor: 1500, // 15 积分
    currency: "CNY",
    deliveryDays: 1,
    revisionLimit: 2,
    computeIncluded: true,
    deliverables: [
      "农学顶刊 SCI 摘要与 Highlights 黄金结构 Prompt 模板包",
      "Graphical Abstract 科研机制图 AI 绘图提示词矩阵",
      "Reviewer 审稿意见逐条回复（Rebuttal Letter）双语范本",
    ],
    licenseTerms: "购买后供个人及所在课题组内部科研写作使用，支持在 ANS 工作台直接加载调用。",
    usageUrl: "https://ans.cauai.fun/workspace/models",
    previewUrl: "https://ans.cauai.fun/vibe-hub",
    githubUrl: "https://github.com/1008611-creater/ans-platform",
  },
  {
    slug: "agri-anova-stats-plot-pack",
    title: "田间试验方差分析 (ANOVA) 与 Nature 配色科研绘图包",
    summary: "输入正交试验或大田对照组数据，自动生成 R / Python 显著性检验（LSD/Duncan）、三线表导出与高分期刊箱线图/热力图代码。",
    description:
      "解决农学与生科实验数据处理中最繁琐的统计检验与出图痛点。无需手动查表或苦调 ggplot2 参数，直接根据你的试验设计（完全随机区组、裂区设计、多因素正交试验）生成可直接运行的 R 与 Python 脚本。\n\n自动标注 a/b/c 显著性字母、输出符合学位论文与期刊要求的三线表及 300 DPI 矢量图。",
    category: "learning",
    subcategory: "methods",
    fulfillment: "resource",
    priceMinor: 1000, // 10 积分
    currency: "CNY",
    deliveryDays: 1,
    revisionLimit: 1,
    computeIncluded: false,
    deliverables: [
      "R (ggplot2/agricolae) 与 Python (scipy/seaborn) 显著性字母自动标注脚本",
      "Nature / Science / Cell 顶刊无障碍科研配色方案库",
      "实验数据一键转 LaTeX / Word 标准三线表工具指令",
    ],
    licenseTerms: "MIT 许可，支持课题组与参赛战队无限次复用与二次修改。",
    usageUrl: "https://ans.cauai.fun/workspace/models",
    previewUrl: "https://ans.cauai.fun/explore",
  },
  {
    slug: "aigc-agri-short-drama-storyboard",
    title: "AI 科普短剧与农客松 60 秒路演视频分镜生成器",
    summary: "输入项目痛点或科普主题，自动拆解 12 镜高清分镜脚本、Image 2.5 首尾帧一致性生图 Prompt 与激昂路演旁白词。",
    description:
      "不知道怎么给农客松决赛做震撼的开场概念片？或者想做一条爆款农业科普 AI 短剧？\n\n本工具包结合 ANS Toonflow 短剧工作流与 Image 2.5 视觉规范，把枯燥的技术报告自动转化为「痛点特写 → AI 介入 → 数字孪生大屏 → 丰收实效」12 镜电影级分镜表，附带中英双语画面提示词与运镜指令。",
    category: "aigc",
    subcategory: "video",
    fulfillment: "resource",
    priceMinor: 1500, // 15 积分
    currency: "CNY",
    deliveryDays: 1,
    revisionLimit: 2,
    computeIncluded: true,
    deliverables: [
      "60 秒农客松路演先导片 12 镜标准分镜脚本模板",
      "角色与场景一致性（Character Seed & Style Lock）生图咒语库",
      "路演答辩金句与 TTS 情感语音播报台词稿",
    ],
    licenseTerms: "生成内容版权归创作者所有，可用于比赛路演、B站/小红书公开发布。",
    usageUrl: "https://ans.cauai.fun/workflows/toonflow",
    previewUrl: "https://ans.cauai.fun/workflows/hypit",
  },
  {
    slug: "cau-ai-engineer-interview-coach",
    title: "大厂 AI Agent 工程师与数智农业岗面试通关模拟包",
    summary: "汇总字节/阿里/美团大模型应用岗及中粮/先正达数智农业岗真实面经，含 RAG 调优、Multi-Agent 架构与 STAR 项目深挖应答库。",
    description:
      "针对秋招、春招与日常实习面试打造的实战弹药库。不仅收录最新大模型 Agent（Function Calling、MCP 协议、长上下文压缩、幻觉评测）高频真题，还专门提供「如何把校园科研/农客松比赛项目包装成大厂面试官眼前一亮的工业级案例」的一对一模拟追问清单。",
    category: "career",
    subcategory: "interview",
    fulfillment: "service",
    priceMinor: 1000, // 10 积分
    currency: "CNY",
    deliveryDays: 1,
    revisionLimit: 3,
    computeIncluded: true,
    deliverables: [
      "2026 最新 AI Agent / RAG / 多模态算法与工程岗 120 道真题解析",
      "参赛项目/科研课题转高含金量简历 Bullet 改写诊断",
      "模拟面试官连环追问（深挖技术选型与 Bad Case 处理）演练脚本",
    ],
    licenseTerms: "供购买者本人求职备战与模拟面试使用。",
    usageUrl: "https://ans.cauai.fun/projects",
    previewUrl: "https://ans.cauai.fun/explore",
  },
  {
    slug: "nextjs-agri-agent-dashboard-starter",
    title: "Next.js 15 + 智慧农业多模态监测大屏全栈参赛模板",
    summary: "开箱即用的农客松 Web 演示站脚手架：内置流式 Agent 对话舱、叶片病害拖拽识别、温室传感器时序折线图与响应式深色大屏。",
    description:
      "比赛时间紧迫，不想从零手搓前端页面？本全栈脚手架基于 Next.js App Router + Tailwind CSS + Shadcn UI 构建，专为农客松与高校 AI 大赛定制。\n\n内置三大核心模块：1) 多模态图像上传与病虫害置信度标注框展示；2) 温室气象/土壤墒情实时动态图表；3) 对接 ANS API 网关的流式农事处方 Agent 对话窗口。克隆即可在 10 分钟内跑起高颜值在线 Demo。",
    category: "web",
    subcategory: "applications",
    fulfillment: "resource",
    priceMinor: 2000, // 20 积分
    currency: "CNY",
    deliveryDays: 1,
    revisionLimit: 1,
    computeIncluded: false,
    deliverables: [
      "Next.js 15 + TypeScript 智慧农业监测大屏完整工程结构",
      "流式 Function Calling 对话组件与图像识别结果可视化卡片",
      "一键 Docker 容器化部署与 Nginx 反向代理配置清单",
    ],
    licenseTerms: "MIT 开源授权，允许直接用于农客松、挑战杯、互联网+等各类比赛开发。",
    usageUrl: "https://ans.cauai.fun/workspace",
    previewUrl: "https://ans.cauai.fun/competitions/agrihackathon",
    githubUrl: "https://github.com/1008611-creater/ans-platform",
  },
  {
    slug: "open-pi-agent-rag-toolchain",
    // 已下架：原文案宣传的 PDF 检索、向量化切片和飞书播报都没有交付。
    // 补齐 official-deliveries.ts 里的真实交付后，再改回 PUBLISHED。
    status: "WITHDRAWN",
    title: "Agent 多工具调用循环最小实现（TypeScript）",
    summary: "一段约 25 行的 TypeScript Agent 工具调用循环：模型决定调用哪个工具，结果回填对话；最多 3 轮工具调用，超出后返回步数上限提示。",
    description:
      "交付内容是一份可直接复制的 TypeScript 代码：定义工具接口，执行 think → tool_call → observe → answer 循环，并限制最大步数。\n\n不包含 PDF 检索、向量化切片、飞书播报或模型客户端封装，这些需要按自己的项目接入。",
    category: "github",
    subcategory: "agents",
    fulfillment: "resource",
    priceMinor: 2000, // 20 积分
    currency: "CNY",
    deliveryDays: 1,
    revisionLimit: 2,
    computeIncluded: true,
    deliverables: [
      "TypeScript 多工具 Agent 循环（约 25 行，含工具接口定义与最大步数限制）",
    ],
    licenseTerms: "Apache-2.0 协议，支持商业与竞赛项目自由集成。",
    usageUrl: "https://ans.cauai.fun/workspace/models",
    previewUrl: "https://ans.cauai.fun/hubs",
    githubUrl: "https://github.com/1008611-creater/ans-platform",
  },
  {
    slug: "agri-hackathon-pitch-deck-pro",
    title: "农客松 & 挑战杯国金级商业计划书与 10 页路演 PPT 蓝本",
    summary: "专为涉农科创与 AI 落地项目设计：含政策文件对齐库、大棚/农场降本增效 ROI 测算模型、10 页黄金逻辑框架与评委高频毒舌问答。",
    description:
      "很多技术极强的团队在路演时因为「讲不清商业闭环与田间真实算账逻辑」而痛失金奖。\n\n本套路演蓝本由往届国金团队与农业创投导师联合打磨，直接提供：1) 一号文件与智慧农业政策高频引用金句；2) 农户/合作社/B端农企三类客户的投入产出比（ROI）算账表格；3) 10 页路演 PPT 每页标题、视觉重心与 3 分钟演讲逐字稿模板。",
    category: "business",
    subcategory: "validation",
    fulfillment: "service",
    priceMinor: 1500, // 15 积分
    currency: "CNY",
    deliveryDays: 1,
    revisionLimit: 3,
    computeIncluded: false,
    deliverables: [
      "10 页国金级路演 PPT 逻辑骨架与视觉排版范式",
      "设施农业/大田巡检/生物育种三大赛道 ROI 财务测算表",
      "评委最爱问的 25 个犀利问题（数据来源、泛化能力、推广成本）标准应答卡",
    ],
    licenseTerms: "供购买个人及所属参赛团队在各类科创赛事中无限次使用。",
    usageUrl: "https://ans.cauai.fun/competitions/agrihackathon",
    previewUrl: "https://ans.cauai.fun/competitions",
  },
  {
    slug: "lab-weekly-git-report-automation",
    title: "课题组组会周报与 Git 代码进展一键汇总自动化流",
    summary: "仅需 5 积分！将本周凌乱的实验记录、阅读文献与 GitHub Commit 自动提炼成导师最爱的结构化组会汇报与下周排期表。",
    description:
      "每周日晚上写组会周报头秃？只需粘贴你本周的零散实验笔记或 Git 提交记录，工作流会在 10 秒内自动归纳出：【本周核心进展与数据结论】、【遇到的实验卡点与排查方案】、【文献阅读批注摘要】以及【下周具体实验排期】，支持一键导出为飞书文档或 Markdown。",
    category: "productivity",
    subcategory: "automation",
    fulfillment: "resource",
    priceMinor: 500, // 5 积分
    currency: "CNY",
    deliveryDays: 1,
    revisionLimit: 1,
    computeIncluded: true,
    deliverables: [
      "理工/农科实验室标准组会周报一键生成 Prompt 工作流",
      "Git Commit 日志自动转项目迭代周报脚本",
      "飞书云文档 / Notion 每日科研打卡双链模板",
    ],
    licenseTerms: "个人与团队日常科研办公无限次使用。",
    usageUrl: "https://ans.cauai.fun/workspace",
    previewUrl: "https://ans.cauai.fun/vibe-hub",
  },
];

/** status is a seed directive, not part of the listing payload. */
function splitStatus(item) {
  const { status = "WITHDRAWN", ...payload } = item;
  return { status, payload };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.marketListing.updateMany({
      where: { slug: "cau-agri-smart-greenhouse-agent" },
      data: { status: "WITHDRAWN" },
    });
    const seller = await prisma.user.findFirst({
      where: { deletedAt: null, flagged: false },
      orderBy: { createdAt: "asc" },
    });
    if (!seller) {
      throw new Error("No active seller user found in database");
    }

    const now = new Date();
    const results = [];

    for (const entry of OFFICIAL_MARKET_LISTINGS) {
      const { status, payload: item } = splitStatus(entry);
      const existing = await prisma.marketListing.findUnique({
        where: { slug: item.slug },
        include: { versions: true },
      });

      if (!existing) {
        const created = await prisma.marketListing.create({
          data: {
            slug: item.slug,
            sellerId: seller.id,
            official: true,
            status,
            currentVersion: 1,
            publishedVersion: 1,
            versions: {
              create: {
                version: 1,
                payload: item,
                submittedAt: now,
                reviewedAt: now,
                reviewNote: "Official ANS Market Starter Pack Seed",
                reviewedById: seller.id,
              },
            },
          },
        });
        results.push({ slug: created.slug, action: "created", status });
      } else {
        await prisma.marketListingVersion.updateMany({
          where: { listingId: existing.id, version: existing.currentVersion },
          data: {
            payload: item,
            submittedAt: now,
            reviewedAt: now,
            reviewNote: "Official ANS Market Starter Pack Seed (Updated)",
            reviewedById: seller.id,
          },
        });
        await prisma.marketListing.update({
          where: { id: existing.id },
          data: {
            official: true,
            status,
            publishedVersion: existing.currentVersion,
          },
        });
        results.push({ slug: existing.slug, action: "updated", status });
      }
    }

    const totalPublished = await prisma.marketListing.count({ where: { status: "PUBLISHED" } });
    console.log(JSON.stringify({ ok: true, seeded: results.length, totalPublished, results }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
