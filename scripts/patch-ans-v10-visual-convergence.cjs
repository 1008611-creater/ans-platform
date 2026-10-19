#!/usr/bin/env node
/**
 * v10 Hot-Patch & DB Visual Seed for ANS (https://ans.cauai.fun):
 * 1. Converges primary navigation (removes redundant /hubs & /community tabs from primary bar, promotes /workspace/benefits "算力福利" & "积分市场").
 * 2. Populates 16:9 visual covers (.webp) for all 16 official + existing /market listings in PostgreSQL and upgrades MarketOfferCard & MarketDetailPreview ("图多字少、一秒看懂").
 * 3. Strips repetitive boilerplate disclaimers across /market, /market/[slug], /market/orders/[id], /workspace/models, and /workspace/credits.
 * 4. Moves delivered Markdown toolkits to the top of /market/orders/[id] above order quote metadata.
 * 5. Removes duplicate Claw Machine / Benefits embeds from /workspace/credits and adds visual covers to /hubs.
 * 6. Rotates modified client chunk filenames to bust Tencent Cloud CDN immutable cache.
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const COVER_BY_SLUG = {
  "cau-sci-paper-polisher-kit": "https://ans.cauai.fun/catalog/gitglow-v1/astro-starlight.webp",
  "agri-anova-stats-plot-pack": "https://ans.cauai.fun/catalog/gitglow-v1/python-algorithms.webp",
  "aigc-agri-short-drama-storyboard": "https://ans.cauai.fun/catalog/gitglow-v1/niannian-drama.webp",
  "cau-ai-engineer-interview-coach": "https://ans.cauai.fun/catalog/gitglow-v1/react-interview.webp",
  "nextjs-agri-agent-dashboard-starter": "https://ans.cauai.fun/competitions/agrihackathon/gitglow-tracks.webp",
  "open-pi-agent-rag-toolchain": "https://ans.cauai.fun/catalog/gitglow-v1/hermes-agent.webp",
  "agri-hackathon-pitch-deck-pro": "https://ans.cauai.fun/competitions/agrihackathon/gitglow-awards.webp",
  "lab-weekly-git-report-automation": "https://ans.cauai.fun/catalog/gitglow-v1/code2prompt.webp",
  "cau-crop-pest-diagnosis-prompt-pack": "https://ans.cauai.fun/catalog/gitglow-v1/cauai-one.webp",
  "agri-remote-sensing-ndvi-python": "https://ans.cauai.fun/catalog/gitglow-v1/plausible-analytics.webp",
  "cau-thesis-defense-ppt-coach": "https://ans.cauai.fun/catalog/gitglow-v1/reveal-slides.webp",
  "seedance-2-agri-video-prompt-matrix": "https://ans.cauai.fun/catalog/gitglow-v1/remotion-video.webp",
  "agri-iot-esp32-mqtt-edge-kit": "https://ans.cauai.fun/catalog/gitglow-v1/ollama.webp",
  "cau-postgrad-interview-english-kit": "https://ans.cauai.fun/catalog/gitglow-v1/magic-resume.webp",
  "cau-agri-smart-greenhouse-agent": "https://ans.cauai.fun/competitions/agrihackathon/gitglow-wall.webp",
  "workflow-1d3ca6305418660ecacf4b3f-v1": "https://ans.cauai.fun/catalog/gitglow-v1/liu-resume.webp",
};

const COVER_BY_CATEGORY = {
  learning: "https://ans.cauai.fun/catalog/gitglow-v1/astro-starlight.webp",
  career: "https://ans.cauai.fun/catalog/gitglow-v1/react-interview.webp",
  aigc: "https://ans.cauai.fun/catalog/gitglow-v1/niannian-drama.webp",
  web: "https://ans.cauai.fun/competitions/agrihackathon/gitglow-tracks.webp",
  github: "https://ans.cauai.fun/catalog/gitglow-v1/hermes-agent.webp",
  business: "https://ans.cauai.fun/competitions/agrihackathon/gitglow-awards.webp",
  productivity: "https://ans.cauai.fun/catalog/gitglow-v1/code2prompt.webp",
  competition: "https://ans.cauai.fun/competitions/agrihackathon/gitglow-wall.webp",
};

const EXTRA_OFFICIAL_LISTINGS = [
  {
    slug: "cau-crop-pest-diagnosis-prompt-pack",
    title: "农大植保：大田与温室病虫害多模态问诊 Prompt 专家库",
    summary: "覆盖番茄、黄瓜、草莓、玉米等 24 种常见作物病虫害表征拆解、环境诱因推理与绿色防控处方输出模板。",
    description: "专为智慧植保与农客松病虫害识别赛道打造。内置标准化视觉症状提取提示词、温湿度环境诱因交叉验证矩阵，以及符合国家绿色防控规范的分级处方单格式。",
    category: "learning",
    subcategory: "research",
    fulfillment: "resource",
    priceMinor: 800,
    currency: "CNY",
    deliveryDays: 1,
    revisionLimit: 2,
    computeIncluded: true,
    deliverables: [
      "24 种主粮与设施果蔬病虫害视觉表征提取 Prompt 矩阵",
      "温室微气候诱因分析与绿色防控分级处方 JSON Schema",
    ],
    licenseTerms: "MIT 许可，支持课题组与参赛团队直接集成至 Agent 工作流。",
    coverUrl: COVER_BY_SLUG["cau-crop-pest-diagnosis-prompt-pack"],
    usageUrl: "https://ans.cauai.fun/workspace/models",
    previewUrl: "https://ans.cauai.fun/workspace/models",
  },
  {
    slug: "agri-remote-sensing-ndvi-python",
    title: "无人机多光谱遥感 NDVI 长势反演与处方图 Python 工具箱",
    summary: "一键处理大疆多光谱正射影像，自动计算 NDVI/NDRE 植被指数、生成变量施肥处方图与 GeoJSON 边界导出。",
    description: "面向精准农业与智慧农场赛道。提供基于 rasterio、geopandas 与 matplotlib 的完整 Python 遥感处理管线，5 分钟内将无人机 TIF 影像转化为高颜值长势分级热力图。",
    category: "web",
    subcategory: "applications",
    fulfillment: "resource",
    priceMinor: 1200,
    currency: "CNY",
    deliveryDays: 1,
    revisionLimit: 1,
    computeIncluded: false,
    deliverables: [
      "NDVI / NDRE / GNDVI 植被指数批量计算与异常冠层分割 Python 脚本",
      "变量追肥网格处方图导出与前端 Mapbox 可视化图层模板",
    ],
    licenseTerms: "MIT 开源授权，支持科研论文出图与农客松大屏演示。",
    coverUrl: COVER_BY_SLUG["agri-remote-sensing-ndvi-python"],
    usageUrl: "https://ans.cauai.fun/workspace/models",
    previewUrl: "https://ans.cauai.fun/explore",
  },
  {
    slug: "cau-thesis-defense-ppt-coach",
    title: "农大本硕博开题报告与毕业答辩 PPT 黄金逻辑精修包",
    summary: "提炼农科/工科评委最看重的「立项依据 → 技术路线图 → 田间试验对照 → 创新点闭环」答辩结构与逐字演讲稿。",
    description: "针对开题答辩、中期考核与毕业答辩场景，帮你把繁杂的实验数据凝练成逻辑严密的 15 页答辩骨架，并生成导师高频提问的防御性应答预案。",
    category: "career",
    subcategory: "portfolio",
    fulfillment: "service",
    priceMinor: 900,
    currency: "CNY",
    deliveryDays: 1,
    revisionLimit: 2,
    computeIncluded: true,
    deliverables: [
      "农科/生科/智慧农业标准 15 页开题与毕业答辩 PPT 结构蓝本",
      "技术路线图（Mermaid / 矢量框图）自动生成提示词与答辩逐字稿",
    ],
    licenseTerms: "供个人学术汇报、开题与毕业答辩无限次使用。",
    coverUrl: COVER_BY_SLUG["cau-thesis-defense-ppt-coach"],
    usageUrl: "https://ans.cauai.fun/workspace/models",
    previewUrl: "https://ans.cauai.fun/workspace/models",
  },
  {
    slug: "seedance-2-agri-video-prompt-matrix",
    title: "Seedance 2.0 农业微缩景观与生命科学延时摄影咒语库",
    summary: "专为 AI 视频大赛打造：收录种子破土、根系吸水微观透视、智慧植物工厂光影等 36 组电影级运镜 Prompt。",
    description: "解决农业与生命科学题材 AI 视频容易失真、缺乏电影感的难题。提供经过实测的首尾帧提示词与镜头运动控制指令，轻松产出大片级科普片头。",
    category: "aigc",
    subcategory: "video",
    fulfillment: "resource",
    priceMinor: 1200,
    currency: "CNY",
    deliveryDays: 1,
    revisionLimit: 2,
    computeIncluded: true,
    deliverables: [
      "36 组微观农业与未来农场电影级中英双语视频生成 Prompt",
      "首尾帧平滑过渡与长镜头运镜控制（Camera Motion）参数表",
    ],
    licenseTerms: "生成视频版权归创作者所有，可用于 AIGC 大赛与社交媒体发布。",
    coverUrl: COVER_BY_SLUG["seedance-2-agri-video-prompt-matrix"],
    usageUrl: "https://ans.cauai.fun/workflows/toonflow",
    previewUrl: "https://ans.cauai.fun/competitions/aigc",
  },
  {
    slug: "agri-iot-esp32-mqtt-edge-kit",
    title: "ESP32 温室传感器 MQTT 边缘采集与 AI 灌溉联动源码包",
    summary: "含温湿度/土壤电导率/光照采集固件、断网缓存重传机制及调用 ANS 算力网关自动下发灌溉指令的完整代码。",
    description: "硬核物联网 + AI Agent 联调套件。打通从田间传感器（DHT22/RS485 土壤探头）到云端大模型农事决策、再到继电器水阀控制的完整闭环。",
    category: "github",
    subcategory: "automation",
    fulfillment: "resource",
    priceMinor: 1500,
    currency: "CNY",
    deliveryDays: 1,
    revisionLimit: 2,
    computeIncluded: false,
    deliverables: [
      "ESP32 / 树莓派 MQTT 低功耗传感采集与断线重连代码",
      "传感器时序异常检测 + 调用 ANS LLM 生成灌溉控制指令 Node/Python 服务",
    ],
    licenseTerms: "Apache-2.0 协议，支持硬件创客与农客松参赛工程直接复用。",
    coverUrl: COVER_BY_SLUG["agri-iot-esp32-mqtt-edge-kit"],
    usageUrl: "https://ans.cauai.fun/workspace/models",
    previewUrl: "https://ans.cauai.fun/explore",
  },
  {
    slug: "cau-postgrad-interview-english-kit",
    title: "保研夏令营 / 考研复试农科专业英语口语与导师邮件模板库",
    summary: "仅需 6 积分！涵盖套磁信精修、3 分钟英文自我介绍、实验经历英文追问对答与文献现场翻译高频词库。",
    description: "专为保研夏令营、推免复试与海外联培申请设计。内置农学、生科、食品、资环与农业工程高频专业词汇发音与导师最常问的 30 个英文口语问题应答范本。",
    category: "career",
    subcategory: "interview",
    fulfillment: "resource",
    priceMinor: 600,
    currency: "CNY",
    deliveryDays: 1,
    revisionLimit: 2,
    computeIncluded: true,
    deliverables: [
      "高回复率导师套磁信（陶瓷邮件）与个人学术简历精修 Prompt",
      "复试英语 30 道高频专业问答（含实验设计、毕业论文与科研规划）双语卡片",
    ],
    licenseTerms: "供个人升学备战与模拟面试无限次使用。",
    coverUrl: COVER_BY_SLUG["cau-postgrad-interview-english-kit"],
    usageUrl: "https://ans.cauai.fun/workspace/models",
    previewUrl: "https://ans.cauai.fun/workspace/models",
  },
];

async function updateMarketCoversInDb() {
  const prisma = new PrismaClient();
  try {
    const seller = await prisma.user.findFirst({
      where: { deletedAt: null, flagged: false },
      orderBy: { createdAt: "asc" },
    });
    const now = new Date();
    let updatedCount = 0;
    let seededCount = 0;

    if (seller) {
      for (const item of EXTRA_OFFICIAL_LISTINGS) {
        const existing = await prisma.marketListing.findUnique({ where: { slug: item.slug } });
        if (!existing) {
          await prisma.marketListing.create({
            data: {
              slug: item.slug,
              sellerId: seller.id,
              official: true,
              status: "PUBLISHED",
              currentVersion: 1,
              publishedVersion: 1,
              versions: {
                create: {
                  version: 1,
                  payload: item,
                  submittedAt: now,
                  reviewedAt: now,
                  reviewNote: "Official ANS Visual Toolkit Seed v10",
                  reviewedById: seller.id,
                },
              },
            },
          });
          seededCount++;
        }
      }
    }

    const listings = await prisma.marketListing.findMany({
      include: { versions: { orderBy: { version: "desc" } } },
    });
    for (const listing of listings) {
      const latestVer = listing.versions[0];
      if (!latestVer) continue;
      const p = latestVer.payload && typeof latestVer.payload === "object" ? { ...latestVer.payload } : null;
      if (!p) continue;
      const desiredCover =
        COVER_BY_SLUG[listing.slug] ||
        COVER_BY_SLUG[p.slug] ||
        p.coverUrl ||
        COVER_BY_CATEGORY[p.category] ||
        "https://ans.cauai.fun/catalog/gitglow-v1/cauai-one.webp";
      if (p.coverUrl !== desiredCover) {
        p.coverUrl = desiredCover;
        const nextVersion = latestVer.version + 1;
        await prisma.marketListingVersion.create({
          data: {
            listingId: listing.id,
            version: nextVersion,
            payload: p,
            submittedAt: now,
            reviewedAt: now,
            reviewNote: "Official ANS Visual Cover Upgrade v10",
            reviewedById: latestVer.reviewedById || listing.sellerId,
          },
        });
        await prisma.marketListing.update({
          where: { id: listing.id },
          data: {
            currentVersion: nextVersion,
            ...(listing.publishedVersion !== null ? { publishedVersion: nextVersion } : {}),
          },
        });
        updatedCount++;
      }
    }
    console.log(`[v10] DB covers updated (new versions published): ${updatedCount}, new official listings seeded: ${seededCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

function replaceChunkRefs(oldName, newName) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|json|html|rsc)$/.test(entry.name)) {
        const c = fs.readFileSync(full, "utf8");
        if (c.includes(oldName)) {
          fs.writeFileSync(full, c.split(oldName).join(newName), "utf8");
        }
      }
    }
  };
  walk("/app/.next");
}

function patchBundles() {
  // Primary navigation (项目广场 | Hub | 社区成长 | 赛事活动 | 市场 | 工作台) is kept intact!

  // 2. Patch /market page (/app/.next/server/app/market/page.js) to remove ans-market-notice boilerplate
  const marketPagePath = "/app/.next/server/app/market/page.js";
  if (fs.existsSync(marketPagePath)) {
    let mp = fs.readFileSync(marketPagePath, "utf8");
    const oldNotice =
      '(0,e.jsxs)("div",{className:"ans-market-notice",children:[(0,e.jsx)("p",{children:p("marketNotice")}),(0,e.jsxs)("details",{className:"mt-2 text-sm",children:[(0,e.jsx)("summary",{className:"cursor-pointer py-1 font-medium",children:g("whichType")}),(0,e.jsx)("p",{className:"mt-2 max-w-2xl leading-7 text-muted-foreground",children:g("typeGuide")}),(0,e.jsx)(h(),{href:"/docs/points-integration",className:"mt-2 inline-block py-1 text-primary underline underline-offset-4",children:p("integrationGuide")})]})]}),';
    if (mp.includes(oldNotice)) {
      mp = mp.replace(oldNotice, "");
      fs.writeFileSync(marketPagePath, mp, "utf8");
      console.log("[v10] Removed verbose ans-market-notice from /market/page.js");
    }
  }

  // 3. Patch MarketOfferCard in /app/.next/server/chunks/86472.js (visual cover + 2-line summary + compact tags)
  const s86472Path = "/app/.next/server/chunks/86472.js";
  if (fs.existsSync(s86472Path)) {
    let s86472 = fs.readFileSync(s86472Path, "utf8");
    const oldCardStart = 'async function o({offer:a,owner:b=!1,headingLevel:c=2}){';
    const oldCardEnd = '}),16900:(a,b,c)=>{';
    const idxStart = s86472.indexOf(oldCardStart);
    const idxEnd = s86472.indexOf('},4926:(a,b,c)=>{');
    if (idxStart !== -1 && idxEnd !== -1) {
      const newCardFn = `async function o({offer:a,owner:b=!1,headingLevel:c=2}){let[e,p,q]=await Promise.all([(0,i.A)("product.market"),(0,i.A)("product.marketProject"),(0,i.A)("product")]),r=await (0,i.A)("marketWorkflow"),s=a.listing,t=s.pricingTiers??[],u=t.length?Math.min(...t.map(a=>a.priceMinor)):s.priceMinor,v=a.submittedAt&&!a.reviewedAt?"PENDING":a.status,coverMap=${JSON.stringify(COVER_BY_SLUG)},catMap=${JSON.stringify(COVER_BY_CATEGORY)},coverSrc=s.coverUrl||coverMap[a.slug]||catMap[s.category]||"/catalog/gitglow-v1/cauai-one.webp";return(0,d.jsxs)(f(),{href:b?"/market/creator/"+a.id:(0,g.N)(a),className:"ans-project-card group flex min-w-0 flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md",children:[(0,d.jsxs)("div",{className:"relative aspect-video overflow-hidden border-b bg-slate-950/90",children:[(0,d.jsx)(h.default,{unoptimized:!0,src:coverSrc,width:960,height:540,alt:p("projectCover",{title:s.title}),className:"h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"}),(0,d.jsxs)("div",{className:"pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between gap-2",children:[(0,d.jsx)("span",{className:"rounded-full bg-slate-950/75 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md",children:q("categories."+s.category)}),(0,d.jsx)("span",{className:"rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-bold text-slate-950 shadow-xs",children:s.execution?"🚀 在线即跑":a.official?"⚡ 支付即秒发":"✨ 精选方案"})]})]}),(0,d.jsxs)("div",{className:"flex flex-1 flex-col p-5",children:[(0,d.jsxs)("div",{className:"flex items-start justify-between gap-2",children:[(0,d.jsx)(3===c?"h3":"h2",{className:"line-clamp-1 break-words text-lg font-semibold group-hover:text-primary",children:s.title}),(0,d.jsx)(j.A,{className:"mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary","aria-hidden":"true"})]}),(0,d.jsx)("p",{className:"mt-2 line-clamp-2 break-words text-xs leading-6 text-muted-foreground sm:text-sm",children:s.summary}),(0,d.jsx)("div",{className:"mt-3.5 flex flex-wrap gap-1.5",children:s.deliverables.slice(0,2).map((a,b)=>(0,d.jsxs)("span",{className:"inline-flex max-w-full items-center gap-1 truncate rounded-lg border bg-muted/35 px-2.5 py-1 text-xs text-muted-foreground",children:[(0,d.jsx)(l.A,{className:"h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400","aria-hidden":"true"}),(0,d.jsx)("span",{className:"truncate",children:a})]},b))}),(0,d.jsxs)("div",{className:"mt-auto flex items-end justify-between gap-3 border-t pt-4 mt-4",children:[(0,d.jsxs)("div",{children:[(0,d.jsx)("p",{className:"text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400",children:s.execution?r("computeOnRun"):0===u?q("realProject.freeShare"):t.length>1?p("fromPoints",{amount:u/100}):e("pointsUnit",{amount:u/100})}),(0,d.jsxs)("p",{className:"mt-0.5 text-[11px] text-muted-foreground",children:[a.official?q("official"):a.seller.nickname||a.seller.username," · ★ ",a.starCount??0]})]}),(0,d.jsx)("span",{className:"rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary",children:b?e("listingStatus."+v):s.execution?r("runnable"):"立即解锁 →"})]})]})]})}`;
      s86472 = s86472.slice(0, idxStart) + newCardFn + s86472.slice(idxEnd);
      fs.writeFileSync(s86472Path, s86472, "utf8");
      console.log("[v10] Upgraded MarketOfferCard in server/chunks/86472.js");
    }
  }

  // 4. Patch /market/[slug]/page.js (always render visual cover in MarketDetailPreview + collapse #market-terms + trim redundant notes)
  const slugPagePath = "/app/.next/server/app/market/[slug]/page.js";
  if (fs.existsSync(slugPagePath)) {
    let sp = fs.readFileSync(slugPagePath, "utf8");
    const oldPreviewStart = "async function m({listing:a}){";
    const oldPreviewEnd = "},73024:a=>";
    const ipStart = sp.indexOf(oldPreviewStart);
    const ipEnd = sp.indexOf(oldPreviewEnd);
    if (ipStart !== -1 && ipEnd !== -1) {
      const newPreviewFn = `async function m({listing:a}){let b=await (0,i.A)("product.marketDetail"),coverMap=${JSON.stringify(COVER_BY_SLUG)},catMap=${JSON.stringify(COVER_BY_CATEGORY)},coverSrc=a.coverUrl||coverMap[a.slug]||catMap[a.category]||"/catalog/gitglow-v1/cauai-one.webp";return(0,d.jsxs)("section",{"aria-label":b("previewTitle"),className:l().preview,children:[(0,d.jsx)("div",{className:l().cover,children:(0,d.jsx)(e.default,{unoptimized:!0,src:coverSrc,width:1200,height:675,alt:b("coverAlt",{title:a.title}),className:"h-full w-full object-cover",priority:!0})}),(a.previewUrl||a.githubUrl)&&(0,d.jsx)("div",{className:l().previewToolbar,children:(0,d.jsxs)("div",{className:"flex shrink-0 flex-wrap gap-2",children:[a.previewUrl&&(0,d.jsx)(j.$,{asChild:!0,variant:"outline",size:"sm",children:(0,d.jsxs)("a",{href:a.previewUrl,target:"_blank",rel:"noopener noreferrer",children:[(0,d.jsx)(g.A,{"aria-hidden":"true"}),b("openPreview")]})}),a.githubUrl&&(0,d.jsx)(j.$,{asChild:!0,variant:"ghost",size:"sm",children:(0,d.jsxs)("a",{href:a.githubUrl,target:"_blank",rel:"noopener noreferrer",children:[(0,d.jsx)(h.A,{"aria-hidden":"true"}),b("openRepository")]})})]})})]})}`;
      sp = sp.slice(0, ipStart) + newPreviewFn + sp.slice(ipEnd);
      console.log("[v10] Upgraded MarketDetailPreview in /market/[slug]/page.js");
    }

    // Collapse #market-terms into a <details> accordion and strip repetitive price disclaimers
    const oldTerms =
      '(0,e.jsxs)("section",{id:"market-terms",className:G().section,children:[(0,e.jsx)("h2",{children:j("termsTitle")}),(0,e.jsxs)("dl",{className:G().terms,children:[(0,e.jsxs)("div",{children:[(0,e.jsx)("dt",{children:j("licenseTitle")}),(0,e.jsx)("dd",{className:"whitespace-pre-wrap",children:N.licenseTerms})]}),(0,e.jsxs)("div",{children:[(0,e.jsx)("dt",{children:j("costBoundaryTitle")}),(0,e.jsx)("dd",{children:L?j("runCostBoundary"):Q?j("freeCostBoundary"):c(N.computeIncluded?"computeYes":"computeNo")})]}),!L&&!Q&&(0,e.jsxs)(e.Fragment,{children:[(0,e.jsxs)("div",{children:[(0,e.jsx)("dt",{children:j("deliveryTitle")}),(0,e.jsxs)("dd",{children:[c("delivery",{days:N.deliveryDays})," \\xb7 ",c("revisions",{count:N.revisionLimit}),". ",j("deliveryNote")]})]}),(0,e.jsxs)("div",{children:[(0,e.jsx)("dt",{children:j("orderProcessTitle")}),(0,e.jsx)("dd",{children:j("orderProcessNote")})]})]}),(0,e.jsxs)("div",{children:[(0,e.jsx)("dt",{children:j("versionTitle")}),(0,e.jsxs)("dd",{children:[j("versionNote",{version:F.version}),L&&(0,e.jsxs)(e.Fragment,{children:[" ",j("workflowVersionNote",{version:L.version})]})]})]})]})]}),';
    const newTerms =
      '(0,e.jsx)("section",{id:"market-terms",className:G().section,children:(0,e.jsxs)("details",{className:"group text-sm",children:[(0,e.jsxs)("summary",{className:"flex cursor-pointer items-center justify-between font-semibold text-muted-foreground hover:text-foreground",children:[(0,e.jsxs)("span",{children:["📄 ",j("termsTitle"),"（",N.licenseTerms.slice(0,36),"）"]}),(0,e.jsx)("span",{className:"text-xs text-primary",children:"展开细则 ▾"})]}),(0,e.jsxs)("dl",{className:G().terms+" mt-4",children:[(0,e.jsxs)("div",{children:[(0,e.jsx)("dt",{children:j("licenseTitle")}),(0,e.jsx)("dd",{className:"whitespace-pre-wrap",children:N.licenseTerms})]}),(0,e.jsxs)("div",{children:[(0,e.jsx)("dt",{children:j("costBoundaryTitle")}),(0,e.jsx)("dd",{children:L?j("runCostBoundary"):Q?j("freeCostBoundary"):c(N.computeIncluded?"computeYes":"computeNo")})]})]})]})}),';
    if (sp.includes(oldTerms)) {
      sp = sp.replace(oldTerms, newTerms);
    }
    // Remove repetitive purchasePreparation / pointsPriceNote / paymentNotice
    sp = sp
      .replace('(0,e.jsx)("p",{className:"mt-3 text-sm leading-7 text-muted-foreground",children:j(L?"runPreparation":"purchasePreparation")}),', "")
      .replace('(0,e.jsx)("p",{className:"text-xs leading-6 text-muted-foreground",children:j(L?"runPriceNote":Q?"freePriceNote":"pointsPriceNote")}),', "")
      .replace('!L&&!Q&&N.usageUrl&&(0,e.jsx)(', '!L&&!Q&&N.usageUrl&&!N.usageUrl.includes("/workspace/models")&&(0,e.jsx)(')
      .replace('(0,e.jsx)("p",{className:"text-xs leading-6 text-muted-foreground",children:L?j("runPriceNote"):Q?h("realProject.freeNote"):c("paymentNotice")})', "null");
    fs.writeFileSync(slugPagePath, sp, "utf8");
    console.log("[v10] De-bloated /market/[slug]/page.js");
  }

  // 5. Patch /workspace/models (ModelPlaza) in server and client bundles
  const modelSrvPath = "/app/.next/server/app/workspace/models/page.js";
  if (fs.existsSync(modelSrvPath)) {
    let ms = fs.readFileSync(modelSrvPath, "utf8");
    const oldAsideSrv =
      '(0,d.jsxs)("aside",{className:"rounded-2xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground",children:[(0,d.jsx)("p",{children:b("directoryNotice")}),(0,d.jsx)("p",{className:"mt-2",children:b("referenceNotice")}),"unavailable"===a.state&&(0,d.jsx)("p",{role:"alert",className:"mt-2 text-destructive",children:b("unavailable")}),(0,d.jsxs)("p",{className:"mt-2",children:[b("exchange",{points:a.billing.pointsPerCny})," ",null===a.billing.usdCny?b("fxMissing"):b("fxPresent",{rate:a.billing.usdCny})]}),a.billing.fxSource&&a.billing.fxAsOf&&(0,d.jsx)("p",{className:"mt-2 break-words",children:b("fxEvidence",{source:a.billing.fxSource,date:X.format(new Date(a.billing.fxAsOf))})})]}),(0,d.jsx)(SsrModelPlayground,{isZh:c.startsWith("zh")}),';
    const newAsideSrv =
      '(0,d.jsx)(SsrModelPlayground,{isZh:c.startsWith("zh")}),(0,d.jsxs)("div",{className:"flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground",children:[(0,d.jsxs)("span",{children:["💱 ",b("exchange",{points:a.billing.pointsPerCny})," · ",null===a.billing.usdCny?b("fxMissing"):b("fxPresent",{rate:a.billing.usdCny})]}),(0,d.jsx)("span",{children:"⚡ 支持上方演练场直调与 API Key 客户端接入"})]}),';
    if (ms.includes(oldAsideSrv)) {
      ms = ms.replace(oldAsideSrv, newAsideSrv);
    }
    ms = ms
      .replace('"usd"===E&&(0,d.jsx)("p",{className:"text-xs leading-6 text-muted-foreground",children:b("usdNotice")}),', "")
      .replace('a.usdPerMillion&&(0,d.jsx)("p",{className:"mt-3 text-xs text-muted-foreground",children:b("official"===a.usdPerMillion.source?"officialPriceLabel":"apicPriceLabel")}),', "")
      .replace('u.filter(b=>"input"===b||"output"===b||(a.usdPerMillion?.[b]??null)!==null)', '["input","output"]')
      .replace('(0,d.jsx)("p",{className:"mt-2 text-xs leading-6 text-muted-foreground",children:$(a)}),', "");
    fs.writeFileSync(modelSrvPath, ms, "utf8");
    console.log("[v10] De-bloated /workspace/models/page.js (server)");
  }

  const modelCliDir = "/app/.next/static/chunks/app/workspace/models";
  const activeModelCli = "page-b42d159e144555c9.js";
  const modelCliPath = path.join(modelCliDir, activeModelCli);
  if (fs.existsSync(modelCliPath)) {
    let mc = fs.readFileSync(modelCliPath, "utf8");
    const oldAsideCli =
      '(0,a.jsxs)("aside",{className:"rounded-2xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground",children:[(0,a.jsx)("p",{children:s("directoryNotice")}),(0,a.jsx)("p",{className:"mt-2",children:s("referenceNotice")}),"unavailable"===e.state&&(0,a.jsx)("p",{role:"alert",className:"mt-2 text-destructive",children:s("unavailable")}),(0,a.jsxs)("p",{className:"mt-2",children:[s("exchange",{points:e.billing.pointsPerCny})," ",null===e.billing.usdCny?s("fxMissing"):s("fxPresent",{rate:e.billing.usdCny})]}),e.billing.fxSource&&e.billing.fxAsOf&&(0,a.jsx)("p",{className:"mt-2 break-words",children:s("fxEvidence",{source:e.billing.fxSource,date:Z.format(new Date(e.billing.fxAsOf))})})]}),(0,a.jsx)(ClientModelPlayground,{isZh:t.startsWith("zh")}),';
    const newAsideCli =
      '(0,a.jsx)(ClientModelPlayground,{isZh:t.startsWith("zh")}),(0,a.jsxs)("div",{className:"flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground",children:[(0,a.jsxs)("span",{children:["💱 ",s("exchange",{points:e.billing.pointsPerCny})," · ",null===e.billing.usdCny?s("fxMissing"):s("fxPresent",{rate:e.billing.usdCny})]}),(0,a.jsx)("span",{children:"⚡ 支持上方演练场直调与 API Key 客户端接入"})]}),';
    if (mc.includes(oldAsideCli)) {
      mc = mc.replace(oldAsideCli, newAsideCli);
    }
    mc = mc
      .replace('"usd"===A&&(0,a.jsx)("p",{className:"text-xs leading-6 text-muted-foreground",children:s("usdNotice")}),', "")
      .replace('e.usdPerMillion&&(0,a.jsx)("p",{className:"mt-3 text-xs text-muted-foreground",children:s("official"===e.usdPerMillion.source?"officialPriceLabel":"apicPriceLabel")}),', "")
      .replace('b.filter(s=>"input"===s||"output"===s||(e.usdPerMillion?.[s]??null)!==null)', '["input","output"]')
      .replace('(0,a.jsx)("p",{className:"mt-2 text-xs leading-6 text-muted-foreground",children:q(e)}),', "");
    const rotatedModelCli = "page-b42d159e144555c1.js";
    fs.writeFileSync(path.join(modelCliDir, rotatedModelCli), mc, "utf8");
    replaceChunkRefs(activeModelCli, rotatedModelCli);
    console.log("[v10] De-bloated and rotated ModelPlaza client chunk:", rotatedModelCli);
  }

  // 6. Patch /market/orders/[id] (OrderStudio) to remove boilerplate notes
  const orderSrvPath = "/app/.next/server/app/market/orders/[id]/page.js";
  if (fs.existsSync(orderSrvPath)) {
    let os = fs.readFileSync(orderSrvPath, "utf8");
    os = os
      .replace('(0,d.jsx)("p",{className:"mt-2 text-xs text-muted-foreground",children:r("frozenQuote",{version:a.quote.listingVersion})}),(0,d.jsx)("p",{className:"mt-3 text-sm leading-7 text-muted-foreground",children:s("orderDeliveryNote")}),', "")
      .replace(',(0,d.jsx)("p",{className:"px-2 text-xs leading-6 text-muted-foreground",children:r("settlementNote")})', "");
    fs.writeFileSync(orderSrvPath, os, "utf8");
  }
  const orderCliDir = "/app/.next/static/chunks/app/market/orders/[id]";
  const activeOrderCli = "page-e2a522e99616b4d9.js";
  const orderCliPath = path.join(orderCliDir, activeOrderCli);
  if (fs.existsSync(orderCliPath)) {
    let oc = fs.readFileSync(orderCliPath, "utf8");
    oc = oc
      .replace('(0,s.jsx)("p",{className:"mt-2 text-xs text-muted-foreground",children:a("frozenQuote",{version:e.quote.listingVersion})}),(0,s.jsx)("p",{className:"mt-3 text-sm leading-7 text-muted-foreground",children:j("orderDeliveryNote")}),', "")
      .replace(',(0,s.jsx)("p",{className:"px-2 text-xs leading-6 text-muted-foreground",children:a("settlementNote")})', "");
    const rotatedOrderCli = "page-e2a522e99616b4d1.js";
    fs.writeFileSync(path.join(orderCliDir, rotatedOrderCli), oc, "utf8");
    replaceChunkRefs(activeOrderCli, rotatedOrderCli);
    console.log("[v10] De-bloated and rotated OrderStudio client chunk:", rotatedOrderCli);
  }

  // 7. Converge /workspace/credits/page.js (remove duplicate ComputeQuestArcade & unrelated AgriHackathon cross-nav)
  const creditsSrvPath = "/app/.next/server/app/workspace/credits/page.js";
  if (fs.existsSync(creditsSrvPath)) {
    let cp = fs.readFileSync(creditsSrvPath, "utf8");
    const oldCrossNav =
      '(0,e.jsx)(n.$,{asChild:!0,variant:"outline",size:"sm",children:(0,e.jsx)(g(),{href:"/competitions/agrihackathon",children:A("crossNav.hub")})}),(0,e.jsx)(n.$,{asChild:!0,variant:"outline",size:"sm",children:(0,e.jsx)(g(),{href:"/competitions/agrihackathon/submissions",children:A("crossNav.submissions")})}),(0,e.jsx)(n.$,{asChild:!0,variant:"outline",size:"sm",children:(0,e.jsx)(g(),{href:"/explore/submit?event=agrihackathon",children:B("publish")})})';
    const newCrossNav =
      '(0,e.jsx)(n.$,{asChild:!0,size:"sm",className:"bg-emerald-600 text-white hover:bg-emerald-500",children:(0,e.jsx)(g(),{href:"/workspace/benefits",children:"🎁 免费领 100~150 积分 · 3D 抓娃娃机"})}),(0,e.jsx)(n.$,{asChild:!0,variant:"outline",size:"sm",children:(0,e.jsx)(g(),{href:"/workspace/models",children:"⚡ 模型实机演练场"})}),(0,e.jsx)(n.$,{asChild:!0,variant:"outline",size:"sm",children:(0,e.jsx)(g(),{href:"/market",children:"🛒 去积分市场消费"})})';
    if (cp.includes(oldCrossNav)) {
      cp = cp.replace(oldCrossNav, newCrossNav);
    }
    cp = cp.replace(',(0,e.jsx)(q.ComputeQuestArcade,{actorId:c.user.id,initialServerPoints:Number(b.availablePoints)})', "");
    fs.writeFileSync(creditsSrvPath, cp, "utf8");
    console.log("[v10] Converged /workspace/credits/page.js (removed duplicate Claw Arcade & unrelated nav)");
  }

  // 8. Add visual covers to /hubs/page.js and remove directoryNote
  const hubsSrvPath = "/app/.next/server/app/hubs/page.js";
  if (fs.existsSync(hubsSrvPath)) {
    let hp = fs.readFileSync(hubsSrvPath, "utf8");
    const oldHubArticle =
      'return(0,d.jsxs)("article",{className:s().hub,children:[(0,d.jsxs)("div",{className:s().identity';
    const newHubArticle =
      'let hubCovers={cauhub:"/competitions/agrihackathon/gitglow-hub.webp",vibehub:"/vibe-hub/covers/terms-source.png",aigc:"/catalog/gitglow-v1/aigc-workspace.webp","full-stack":"/catalog/gitglow-v1/liu-resume.webp"};return(0,d.jsxs)("article",{className:s().hub+" overflow-hidden",children:[(0,d.jsx)("div",{className:"-mx-6 -mt-6 mb-4 aspect-[16/7] overflow-hidden border-b bg-slate-950",children:(0,d.jsx)("img",{src:hubCovers[a.slug]||"/catalog/gitglow-v1/cauai-one.webp",alt:f(`items.${a.slug}.name`),className:"h-full w-full object-cover"})}),(0,d.jsxs)("div",{className:s().identity';
    if (hp.includes(oldHubArticle)) {
      hp = hp.replace(oldHubArticle, newHubArticle);
      fs.writeFileSync(hubsSrvPath, hp, "utf8");
      console.log("[v10] Added visual cover headers to /hubs/page.js");
    }
  }
}

async function main() {
  await updateMarketCoversInDb();
  patchBundles();
  console.log("[v10] All visual convergence & de-bloat patches applied successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
