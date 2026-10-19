#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const oilOutDir = path.join(root, "public", "catalog", "oil-v1");
const sketchOutDir = path.join(root, "public", "catalog", "sketch-v1");
const gitglowOutDir = path.join(root, "public", "catalog", "gitglow-v1");
fs.mkdirSync(oilOutDir, { recursive: true });
fs.mkdirSync(sketchOutDir, { recursive: true });
fs.mkdirSync(gitglowOutDir, { recursive: true });

function parseProjectsFromTs(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const jsonText = raw
    .replace(/^import[^\n]+\n/gm, "")
    .replace(/^\/\/[^\n]+\n/gm, "")
    .replace(/export const \w+\s*=\s*/, "")
    .replace(/\s*satisfies\s+readonly\s+CatalogEntry\[\]\s*;?\s*$/, "")
    .replace(/;\s*$/, "");
  return JSON.parse(jsonText);
}

const realProjects = parseProjectsFromTs(path.join(root, "src/domain/catalog/real-projects.ts"));
const curatedProjects = parseProjectsFromTs(path.join(root, "src/domain/catalog/curated-projects.ts"));
const allCatalog = [...realProjects, ...curatedProjects];

const extraEntries = [
  {
    slug: "showcase-agri-uav",
    category: "competition",
    subcategory: "agri-wall",
    preview: "agent",
    source: "official",
    content: {
      zh: {
        title: "农田多光谱无人机巡检 · Agri-Vision",
        summary: "多光谱航拍切片与视觉诊断流，亚米级定位冬小麦条锈病并直出农艺处方图。",
      },
    },
  },
  {
    slug: "showcase-toonflow",
    category: "aigc",
    subcategory: "video",
    preview: "video",
    source: "official",
    content: {
      zh: {
        title: "《星际麦田》4K 赛博漫剧 · ToonFlow",
        summary: "12 镜分镜脚本自动拆解、主角三视图特征锁定与动态运镜合成。",
      },
    },
  },
  {
    slug: "showcase-scholar-portal",
    category: "career",
    subcategory: "portfolio",
    preview: "site",
    source: "official",
    content: {
      zh: {
        title: "遥感视觉课题组双语门户 · Dr. Lin Lab",
        summary: "通过 ORCID 与论文 BibTeX 自动构建响应式学术主页与数据集预览。",
      },
    },
  },
  {
    slug: "showcase-dragon-arcade",
    category: "web",
    subcategory: "personal-site",
    preview: "site",
    source: "official",
    content: {
      zh: {
        title: "3D 算力抓娃娃机与神龙进化 · Compute Quest",
        summary: "Three.js 物理碰撞抓娃娃机与五阶神龙养成，将创作 XP 转化为算力盲盒。",
      },
    },
  },
  {
    slug: "showcase-greenhouse-os",
    category: "competition",
    subcategory: "agri-wall",
    preview: "agent",
    source: "official",
    content: {
      zh: {
        title: "温室水肥光热多智能体调控 · GreenHouse-OS",
        summary: "接入物联网传感器时序流，多 Agent 博弈动态优化滴灌配比，节水 23%。",
      },
    },
  },
  {
    slug: "showcase-guyu-film",
    category: "aigc",
    subcategory: "video",
    preview: "video",
    source: "official",
    content: {
      zh: {
        title: "《二十四节气·谷雨》东方水墨短片",
        summary: "融合传统水墨笔触控制网与环境音轨生成，呈现谷雨茶山采摘物候之美。",
      },
    },
  },
  {
    slug: "guide-media-pipeline",
    category: "aigc",
    subcategory: "video",
    preview: "video",
    source: "official",
    content: {
      zh: {
        title: "口播粗剪·字幕校对·双尺寸封面流水线",
        summary: "从一镜到底录屏出发，串联静音切分、OCR 术语字幕与横竖双封面生成。",
      },
    },
  },
  {
    slug: "guide-agent-team",
    category: "github",
    subcategory: "agents",
    preview: "agent",
    source: "official",
    content: {
      zh: {
        title: "多智能体小队分工与代码审查工作流",
        summary: "轻量 Explorer 摸底路径 + Executor 边界实现 + 无上下文 Reviewer 挑刺。",
      },
    },
  },
  {
    slug: "guide-ui-design",
    category: "web",
    subcategory: "personal-site",
    preview: "site",
    source: "official",
    content: {
      zh: {
        title: "去 AI 味高质感网页与三方向同屏探索",
        summary: "先出 3 套字体与版式截然不同的首屏方案并排对比，拒绝蓝紫渐变模板。",
      },
    },
  },
  {
    slug: "course-product-website",
    category: "learning",
    subcategory: "methods",
    preview: "site",
    source: "official",
    content: {
      zh: {
        title: "从零做出可上线产品网站 · 实战课",
        summary: "拆解真实网站结构、响应式断点、三态反馈与一键部署上线全流程。",
      },
    },
  },
  {
    slug: "course-agri-ai",
    category: "competition",
    subcategory: "proposal",
    preview: "plan",
    source: "official",
    content: {
      zh: {
        title: "农客松多模态诊断与参赛路演 · 实战课",
        summary: "绑定真实指标 Grounding、构建 3 组冒烟测试样本并输出 60 秒路演稿。",
      },
    },
  },
];

const allItems = [...allCatalog, ...extraEntries];

const OIL_THEMES = {
  learning: { bg: "#f6f3ec", card: "#fffdf8", ink: "#141413", accent: "#0f766e", soft: "#ccfbf1", tag: "LEARNING · 知识图谱" },
  career: { bg: "#f7f3ee", card: "#fffdf9", ink: "#18181b", accent: "#d94e28", soft: "#ffedd5", tag: "CAREER · 个人门面" },
  aigc: { bg: "#f5f1ec", card: "#fffcf7", ink: "#171412", accent: "#c2410c", soft: "#fed7aa", tag: "AIGC · 影像与分镜" },
  web: { bg: "#f2f5f3", card: "#fcfefd", ink: "#111827", accent: "#1d4ed8", soft: "#dbeafe", tag: "WEB CRAFT · 交互网页" },
  github: { bg: "#f4f4f0", card: "#fafaf7", ink: "#18181b", accent: "#4338ca", soft: "#e0e7ff", tag: "OPEN SOURCE · 开源工程" },
  business: { bg: "#f6f4ee", card: "#fffef9", ink: "#1c1917", accent: "#b45309", soft: "#fef3c7", tag: "BUSINESS · 业务系统" },
  productivity: { bg: "#f3f5f1", card: "#fbfdfa", ink: "#141413", accent: "#15803d", soft: "#dcfce7", tag: "WORKFLOW · 效率画布" },
  competition: { bg: "#f6f2eb", card: "#fffdf7", ink: "#141413", accent: "#b91c1c", soft: "#fee2e2", tag: "COMPETITION · 赛事标杆" },
};

function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function splitTitleParts(rawTitle) {
  const cleaned = rawTitle.replace(/\s+/g, " ").trim();
  if (cleaned.includes(" · ")) {
    const [left, right] = cleaned.split(" · ");
    return { main: left.trim(), sub: right.trim() };
  }
  if (cleaned.length <= 10) {
    return { main: cleaned, sub: "ANS 精选可复现工程" };
  }
  return {
    main: cleaned.slice(0, 10),
    sub: cleaned.slice(10, 22),
  };
}

function renderMotifIllustration(project, theme, idx) {
  const { accent, ink, soft, card } = theme;
  const cat = project.category;
  const slug = project.slug;

  if (slug.includes("3d") || slug.includes("dragon")) {
    return `
      <g transform="translate(568, 92)">
        <rect x="8" y="8" width="332" height="416" rx="18" fill="${ink}"/>
        <rect x="0" y="0" width="332" height="416" rx="18" fill="${card}" stroke="${ink}" stroke-width="3.5"/>
        <rect x="0" y="0" width="332" height="42" rx="18" fill="${soft}" stroke="${ink}" stroke-width="3.5"/>
        <circle cx="24" cy="21" r="6" fill="#ef4444"/><circle cx="44" cy="21" r="6" fill="#f59e0b"/><circle cx="64" cy="21" r="6" fill="#10b981"/>
        <text x="308" y="26" text-anchor="end" font-family="ui-monospace,monospace" font-size="13" font-weight="800" fill="${ink}">WEBGL · 3D</text>
        <circle cx="166" cy="205" r="96" fill="${soft}" stroke="${ink}" stroke-width="3" stroke-dasharray="8 6"/>
        <ellipse cx="166" cy="205" rx="118" ry="42" fill="none" stroke="${accent}" stroke-width="3.5" transform="rotate(-18 166 205)"/>
        <polygon points="166,118 236,162 236,248 166,292 96,248 96,162" fill="${accent}" fill-opacity="0.18" stroke="${ink}" stroke-width="3.5"/>
        <polyline points="96,162 166,205 236,162" fill="none" stroke="${ink}" stroke-width="3"/>
        <line x1="166" y1="205" x2="166" y2="292" stroke="${ink}" stroke-width="3"/>
        <circle cx="256" cy="148" r="16" fill="${accent}" stroke="${ink}" stroke-width="3"/>
        <rect x="28" y="338" width="276" height="48" rx="10" fill="${ink}"/>
        <text x="166" y="368" text-anchor="middle" font-family="ui-monospace,monospace" font-size="16" font-weight="800" fill="#ffffff">INTERACTIVE 3D STAGE</text>
      </g>`;
  }

  if (cat === "aigc" || project.preview === "video") {
    return `
      <g transform="translate(568, 92)">
        <rect x="8" y="8" width="332" height="416" rx="18" fill="${ink}"/>
        <rect x="0" y="0" width="332" height="416" rx="18" fill="${card}" stroke="${ink}" stroke-width="3.5"/>
        <rect x="0" y="0" width="332" height="42" rx="18" fill="${soft}" stroke="${ink}" stroke-width="3.5"/>
        <circle cx="24" cy="21" r="6" fill="#ef4444"/><circle cx="44" cy="21" r="6" fill="#f59e0b"/><circle cx="64" cy="21" r="6" fill="#10b981"/>
        <text x="308" y="26" text-anchor="end" font-family="ui-monospace,monospace" font-size="13" font-weight="800" fill="${ink}">STORYBOARD · 4K</text>
        <rect x="24" y="64" width="134" height="96" rx="10" fill="${soft}" stroke="${ink}" stroke-width="3"/>
        <text x="38" y="90" font-family="ui-monospace,monospace" font-size="13" font-weight="800" fill="${accent}">SHOT 01</text>
        <circle cx="91" cy="122" r="20" fill="${accent}" stroke="${ink}" stroke-width="2.5"/>
        <polygon points="86,113 86,131 102,122" fill="#fff"/>
        <rect x="174" y="64" width="134" height="96" rx="10" fill="#fff" stroke="${ink}" stroke-width="3"/>
        <text x="188" y="90" font-family="ui-monospace,monospace" font-size="13" font-weight="800" fill="${ink}">SHOT 02</text>
        <path d="M192 138 Q220 102 248 128 T292 110" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
        <rect x="24" y="178" width="284" height="132" rx="12" fill="${ink}"/>
        <rect x="42" y="198" width="110" height="16" rx="4" fill="${accent}"/>
        <rect x="42" y="226" width="210" height="12" rx="4" fill="#ffffff" opacity="0.85"/>
        <rect x="42" y="250" width="170" height="12" rx="4" fill="#ffffff" opacity="0.55"/>
        <circle cx="268" cy="244" r="24" fill="${accent}"/>
        <polygon points="262,233 262,255 280,244" fill="#ffffff"/>
        <rect x="24" y="332" width="284" height="54" rx="10" fill="${soft}" stroke="${ink}" stroke-width="3"/>
        <text x="166" y="365" text-anchor="middle" font-family="ui-monospace,monospace" font-size="15" font-weight="800" fill="${ink}">TIMELINE · SEEDANCE / REMUX</text>
      </g>`;
  }

  if (cat === "competition" || slug.includes("agri")) {
    return `
      <g transform="translate(568, 92)">
        <rect x="8" y="8" width="332" height="416" rx="18" fill="${ink}"/>
        <rect x="0" y="0" width="332" height="416" rx="18" fill="${card}" stroke="${ink}" stroke-width="3.5"/>
        <rect x="0" y="0" width="332" height="42" rx="18" fill="${soft}" stroke="${ink}" stroke-width="3.5"/>
        <circle cx="24" cy="21" r="6" fill="#ef4444"/><circle cx="44" cy="21" r="6" fill="#f59e0b"/><circle cx="64" cy="21" r="6" fill="#10b981"/>
        <text x="308" y="26" text-anchor="end" font-family="ui-monospace,monospace" font-size="13" font-weight="800" fill="${ink}">ROADSHOW · VERIFIED</text>
        <rect x="24" y="66" width="284" height="156" rx="12" fill="${soft}" stroke="${ink}" stroke-width="3"/>
        <line x1="24" y1="118" x2="308" y2="118" stroke="${ink}" stroke-width="1.5" stroke-dasharray="5 5"/>
        <line x1="24" y1="170" x2="308" y2="170" stroke="${ink}" stroke-width="1.5" stroke-dasharray="5 5"/>
        <polyline points="44,192 98,154 152,166 214,104 284,88" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="214" cy="104" r="8" fill="#fff" stroke="${ink}" stroke-width="3"/>
        <circle cx="284" cy="88" r="9" fill="${accent}" stroke="${ink}" stroke-width="3"/>
        <rect x="24" y="242" width="134" height="74" rx="10" fill="#fff" stroke="${ink}" stroke-width="3"/>
        <text x="40" y="270" font-family="ui-monospace,monospace" font-size="12" font-weight="700" fill="${ink}">BENCHMARK</text>
        <text x="40" y="300" font-family="ui-monospace,monospace" font-size="24" font-weight="900" fill="${accent}">98.4%</text>
        <rect x="174" y="242" width="134" height="74" rx="10" fill="#fff" stroke="${ink}" stroke-width="3"/>
        <text x="190" y="270" font-family="ui-monospace,monospace" font-size="12" font-weight="700" fill="${ink}">SMOKE TEST</text>
        <text x="190" y="300" font-family="ui-monospace,monospace" font-size="22" font-weight="900" fill="#0f766e">3 PRESETS</text>
        <rect x="24" y="336" width="284" height="50" rx="10" fill="${ink}"/>
        <text x="166" y="367" text-anchor="middle" font-family="ui-monospace,monospace" font-size="15" font-weight="800" fill="#ffffff">LIVE SANDBOX READY</text>
      </g>`;
  }

  if (cat === "career") {
    return `
      <g transform="translate(568, 92)">
        <rect x="8" y="8" width="332" height="416" rx="18" fill="${ink}"/>
        <rect x="0" y="0" width="332" height="416" rx="18" fill="${card}" stroke="${ink}" stroke-width="3.5"/>
        <rect x="0" y="0" width="332" height="42" rx="18" fill="${soft}" stroke="${ink}" stroke-width="3.5"/>
        <circle cx="24" cy="21" r="6" fill="#ef4444"/><circle cx="44" cy="21" r="6" fill="#f59e0b"/><circle cx="64" cy="21" r="6" fill="#10b981"/>
        <text x="308" y="26" text-anchor="end" font-family="ui-monospace,monospace" font-size="13" font-weight="800" fill="${ink}">PORTFOLIO · CV</text>
        <circle cx="76" cy="112" r="36" fill="${accent}" stroke="${ink}" stroke-width="3.5"/>
        <circle cx="76" cy="102" r="12" fill="#fff"/>
        <path d="M54 134 Q76 118 98 134" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
        <rect x="132" y="84" width="168" height="20" rx="6" fill="${ink}"/>
        <rect x="132" y="116" width="124" height="14" rx="5" fill="${accent}"/>
        <rect x="28" y="172" width="276" height="72" rx="10" fill="${soft}" stroke="${ink}" stroke-width="3"/>
        <rect x="46" y="192" width="140" height="12" rx="4" fill="${ink}"/>
        <rect x="46" y="214" width="220" height="10" rx="4" fill="${ink}" opacity="0.55"/>
        <rect x="28" y="260" width="132" height="64" rx="10" fill="#fff" stroke="${ink}" stroke-width="3"/>
        <text x="94" y="298" text-anchor="middle" font-family="ui-monospace,monospace" font-size="16" font-weight="900" fill="${ink}">PROJECTS</text>
        <rect x="172" y="260" width="132" height="64" rx="10" fill="#fff" stroke="${ink}" stroke-width="3"/>
        <text x="238" y="298" text-anchor="middle" font-family="ui-monospace,monospace" font-size="16" font-weight="900" fill="${accent}">EXPORT PDF</text>
        <rect x="28" y="342" width="276" height="46" rx="10" fill="${ink}"/>
        <text x="166" y="370" text-anchor="middle" font-family="ui-monospace,monospace" font-size="15" font-weight="800" fill="#fff">VERIFIED CAREER PACK</text>
      </g>`;
  }

  return `
    <g transform="translate(568, 92)">
      <rect x="8" y="8" width="332" height="416" rx="18" fill="${ink}"/>
      <rect x="0" y="0" width="332" height="416" rx="18" fill="${card}" stroke="${ink}" stroke-width="3.5"/>
      <rect x="0" y="0" width="332" height="42" rx="18" fill="${soft}" stroke="${ink}" stroke-width="3.5"/>
      <circle cx="24" cy="21" r="6" fill="#ef4444"/><circle cx="44" cy="21" r="6" fill="#f59e0b"/><circle cx="64" cy="21" r="6" fill="#10b981"/>
      <text x="308" y="26" text-anchor="end" font-family="ui-monospace,monospace" font-size="13" font-weight="800" fill="${ink}">ANS · WORKBENCH</text>
      <rect x="24" y="68" width="126" height="110" rx="12" fill="${soft}" stroke="${ink}" stroke-width="3"/>
      <text x="87" y="116" text-anchor="middle" font-family="ui-monospace,monospace" font-size="15" font-weight="900" fill="${ink}">INPUT</text>
      <text x="87" y="142" text-anchor="middle" font-family="ui-monospace,monospace" font-size="13" font-weight="700" fill="${accent}">GROUNDED</text>
      <rect x="182" y="68" width="126" height="110" rx="12" fill="#fff" stroke="${ink}" stroke-width="3"/>
      <text x="245" y="116" text-anchor="middle" font-family="ui-monospace,monospace" font-size="15" font-weight="900" fill="${accent}">OUTPUT</text>
      <text x="245" y="142" text-anchor="middle" font-family="ui-monospace,monospace" font-size="13" font-weight="700" fill="${ink}">VERIFIED</text>
      <path d="M150 123 H182" stroke="${ink}" stroke-width="4"/>
      <rect x="24" y="200" width="284" height="116" rx="12" fill="${ink}"/>
      <text x="44" y="236" font-family="ui-monospace,monospace" font-size="15" font-weight="700" fill="#6ee7b7">$ ans run ${esc(slug.slice(0, 18))}</text>
      <text x="44" y="266" font-family="ui-monospace,monospace" font-size="14" fill="#e2e8f0">✓ schema &amp; boundary verified</text>
      <text x="44" y="294" font-family="ui-monospace,monospace" font-size="14" fill="#fbbf24">✓ live preview ready (200 OK)</text>
      <rect x="24" y="336" width="284" height="50" rx="10" fill="${accent}" stroke="${ink}" stroke-width="3"/>
      <text x="166" y="367" text-anchor="middle" font-family="ui-monospace,monospace" font-size="15" font-weight="900" fill="#ffffff">CLICK TO OPEN DETAIL →</text>
    </g>`;
}

function buildOilSvg(project, idx) {
  const theme = OIL_THEMES[project.category] || OIL_THEMES.web;
  const zhTitle = project.content?.zh?.title || project.slug;
  const zhSummary = project.content?.zh?.summary || "ANS (AI Never Stops) 精选可交互工程与复现指南";
  const { main, sub } = splitTitleParts(zhTitle);
  const line1 = main.slice(0, 8);
  const line2 = main.slice(8, 16) || sub.slice(0, 9);
  const subtitle = (main.length > 8 ? sub : zhSummary).slice(0, 22);
  const sumLine1 = zhSummary.slice(0, 22);
  const sumLine2 = zhSummary.slice(22, 44);
  const numStr = String(idx + 1).padStart(2, "0");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600">
  <title>${esc(zhTitle)} · oil欧呦风格高反差封面</title>
  <defs>
    <pattern id="oil-grid-${esc(project.slug)}" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="${theme.ink}" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="960" height="600" fill="${theme.bg}"/>
  <rect width="960" height="600" fill="url(#oil-grid-${esc(project.slug)})"/>
  <rect x="20" y="20" width="920" height="560" rx="24" fill="none" stroke="${theme.ink}" stroke-width="4"/>

  <g transform="translate(48, 48)">
    <rect x="0" y="0" width="236" height="38" rx="19" fill="${theme.ink}"/>
    <circle cx="22" cy="19" r="6" fill="#10b981"/>
    <text x="38" y="24" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="800" fill="#fffdf8" letter-spacing="1">ANS · AI NEVER STOPS</text>

    <rect x="252" y="0" width="224" height="38" rx="19" fill="${theme.soft}" stroke="${theme.ink}" stroke-width="2.5"/>
    <text x="364" y="24" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="800" fill="${theme.ink}">${esc(theme.tag)}</text>
  </g>

  <g transform="translate(48, 132)">
    <rect x="0" y="6" width="14" height="136" rx="7" fill="${theme.accent}"/>
    <text x="30" y="64" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="56" font-weight="900" fill="${theme.ink}" letter-spacing="-1">${esc(line1)}</text>
    <text x="30" y="134" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="52" font-weight="900" fill="${theme.accent}" letter-spacing="-1">${esc(line2)}</text>
    <text x="30" y="182" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="22" font-weight="700" fill="${theme.ink}" opacity="0.78">${esc(subtitle)}</text>
  </g>

  <g transform="translate(48, 344)">
    <rect x="6" y="6" width="476" height="118" rx="16" fill="${theme.ink}"/>
    <rect x="0" y="0" width="476" height="118" rx="16" fill="${theme.card}" stroke="${theme.ink}" stroke-width="3"/>
    <rect x="20" y="20" width="56" height="28" rx="8" fill="${theme.accent}"/>
    <text x="48" y="39" text-anchor="middle" font-family="ui-monospace, monospace" font-size="14" font-weight="900" fill="#ffffff">#${numStr}</text>
    <text x="90" y="40" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="20" font-weight="800" fill="${theme.ink}">${esc(sumLine1)}</text>
    <text x="20" y="82" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="18" font-weight="600" fill="#57534e">${esc(sumLine2 || "点击卡片进入详情页，查看 GitGlow 3D 界面实景")}</text>
  </g>

  <g transform="translate(48, 494)">
    <rect x="0" y="0" width="168" height="40" rx="10" fill="${theme.card}" stroke="${theme.ink}" stroke-width="2.5"/>
    <text x="84" y="25" text-anchor="middle" font-family="ui-monospace, monospace" font-size="13" font-weight="800" fill="${theme.ink}">OIL 封面 · 外封海报</text>

    <rect x="182" y="0" width="216" height="40" rx="10" fill="${theme.soft}" stroke="${theme.ink}" stroke-width="2.5"/>
    <text x="290" y="25" text-anchor="middle" font-family="ui-monospace, monospace" font-size="13" font-weight="800" fill="${theme.accent}">点进看 GitGlow 3D 内封 →</text>
  </g>

  ${renderMotifIllustration(project, theme, idx)}
</svg>`;
}

function buildGitGlowExtraSvg(project) {
  const theme = OIL_THEMES[project.category] || OIL_THEMES.web;
  const zhTitle = project.content?.zh?.title || project.slug;
  const zhSummary = project.content?.zh?.summary || "";
  const { main, sub } = splitTitleParts(zhTitle);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <title>${esc(zhTitle)} · GitGlow 3D 详情内封</title>
  <defs>
    <linearGradient id="gg-bg-${esc(project.slug)}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#070b14"/>
      <stop offset="55%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#13262f"/>
    </linearGradient>
    <radialGradient id="gg-glow-${esc(project.slug)}" cx="78%" cy="28%" r="52%">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1280" height="800" fill="url(#gg-bg-${esc(project.slug)})"/>
  <rect width="1280" height="800" fill="url(#gg-glow-${esc(project.slug)})"/>
  <g transform="translate(76, 84)">
    <rect x="0" y="0" width="280" height="42" rx="21" fill="#1e293b" stroke="${theme.accent}" stroke-width="1.5"/>
    <text x="140" y="27" text-anchor="middle" font-family="ui-monospace, monospace" font-size="14" font-weight="800" fill="#6ee7b7">GITGLOW 3D · 详情实景内封</text>
    <text x="0" y="138" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="64" font-weight="900" fill="#f8fafc">${esc(main)}</text>
    <text x="0" y="218" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="48" font-weight="800" fill="${theme.accent}">${esc(sub)}</text>
    <text x="0" y="286" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="24" fill="#cbd5e1">${esc(zhSummary.slice(0, 26))}</text>
    <text x="0" y="324" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="24" fill="#94a3b8">${esc(zhSummary.slice(26, 52))}</text>
  </g>
  <g transform="translate(690, 130) skewY(-6)">
    <rect x="40" y="40" width="480" height="460" rx="22" fill="#090f1a" stroke="#334155" stroke-width="2"/>
    <rect x="0" y="0" width="480" height="460" rx="22" fill="#0f172a" stroke="${theme.accent}" stroke-width="3"/>
    <rect x="0" y="0" width="480" height="46" rx="22" fill="#1e293b"/>
    <circle cx="26" cy="23" r="7" fill="#ef4444"/><circle cx="48" cy="23" r="7" fill="#f59e0b"/><circle cx="70" cy="23" r="7" fill="#10b981"/>
    <text x="450" y="28" text-anchor="end" font-family="ui-monospace, monospace" font-size="13" fill="#94a3b8">ans.cauai.fun/${esc(project.slug)}</text>
    <rect x="28" y="76" width="424" height="160" rx="14" fill="#1e293b"/>
    <text x="52" y="122" font-family="ui-monospace, monospace" font-size="20" font-weight="800" fill="#38bdf8">ANS · AI NEVER STOPS</text>
    <text x="52" y="162" font-family="ui-monospace, monospace" font-size="16" fill="#e2e8f0">✓ Interactive Sandbox Ready</text>
    <text x="52" y="196" font-family="ui-monospace, monospace" font-size="16" fill="#6ee7b7">✓ Verified Deliverable &amp; Guide</text>
    <rect x="28" y="260" width="202" height="164" rx="14" fill="#111827" stroke="#334155"/>
    <text x="129" y="336" text-anchor="middle" font-family="ui-monospace, monospace" font-size="28" font-weight="900" fill="#f8fafc">100%</text>
    <text x="129" y="368" text-anchor="middle" font-family="ui-monospace, monospace" font-size="13" fill="#94a3b8">SMOKE TEST PASS</text>
    <rect x="250" y="260" width="202" height="164" rx="14" fill="#111827" stroke="#334155"/>
    <text x="351" y="336" text-anchor="middle" font-family="ui-monospace, monospace" font-size="26" font-weight="900" fill="${theme.accent}">200 OK</text>
    <text x="351" y="368" text-anchor="middle" font-family="ui-monospace, monospace" font-size="13" fill="#94a3b8">ZERO LOGIN WALL</text>
  </g>
</svg>`;
}

let oilCount = 0;
let sketchFilled = 0;
let gitglowFilled = 0;

for (let i = 0; i < allItems.length; i++) {
  const item = allItems[i];
  const svg = buildOilSvg(item, i);
  const oilPath = path.join(oilOutDir, `${item.slug}.svg`);
  fs.writeFileSync(oilPath, svg);
  oilCount++;

  const sketchPath = path.join(sketchOutDir, `${item.slug}.svg`);
  if (!fs.existsSync(sketchPath)) {
    fs.writeFileSync(sketchPath, svg);
    sketchFilled++;
  }

  const ggWebp = path.join(gitglowOutDir, `${item.slug}.webp`);
  const ggSvg = path.join(gitglowOutDir, `${item.slug}.svg`);
  if (!fs.existsSync(ggWebp) && !fs.existsSync(ggSvg)) {
    fs.writeFileSync(ggSvg, buildGitGlowExtraSvg(item));
    gitglowFilled++;
  }
}

console.log(JSON.stringify({ oilCount, sketchFilled, gitglowFilled }));
