import {
  ArrowRight,
  BarChart3,
  Bell,
  Bookmark,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Gift,
  Grid3X3,
  ImagePlus,
  LayoutGrid,
  Menu,
  PackageCheck,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  UploadCloud,
  WandSparkles,
  Zap
} from "lucide-react";
import styles from "./image2-social-commerce-site.module.css";

const assets = {
  product: "/image2/social-commerce/product-cleanser-white-01.png",
  bathroom: "/image2/social-commerce/scene-bathroom-main-01.png",
  xiaohongshu: "/image2/social-commerce/scene-xiaohongshu-cover-01.png",
  detail: "/image2/social-commerce/scene-detail-texture-01.png",
  kitchen: "/image2/social-commerce/template-kitchen-01.png",
  breakfast: "/image2/social-commerce/template-breakfast-01.png",
  picnic: "/image2/social-commerce/template-picnic-01.png",
  office: "/image2/social-commerce/template-office-01.png"
};

export type Image2SocialCommerceSection =
  | "home"
  | "workbench"
  | "templates"
  | "case"
  | "pricing"
  | "ops";

export type Image2SocialCommerceFocusTarget = Image2SocialCommerceSection | "results";

export type Image2SocialCommercePageMode =
  | "landing"
  | "workbench"
  | "templates"
  | "case"
  | "pricing"
  | "ops"
  | "all";

const image2LinkSiteUrl = process.env.NEXT_PUBLIC_IMAGE2_LINK_SITE_URL || process.env.NEXT_PUBLIC_IMAGE2_SITE_URL || "https://image2.cauai.fun";

type NavItem = {
  key: Image2SocialCommerceSection | "image2-link-site";
  label: string;
  href: string;
  external?: boolean;
};

const navItems: NavItem[] = [
  { key: "home", label: "首页", href: "/image2-social-commerce" },
  { key: "workbench", label: "AI创作", href: "/image2-social-commerce/workbench" },
  { key: "templates", label: "场景模板", href: "/image2-social-commerce/templates" },
  { key: "case", label: "配方库", href: "/image2-cases" },
  { key: "pricing", label: "价格方案", href: "/image2-social-commerce/pricing" },
  { key: "ops", label: "运营台", href: "/image2-social-commerce/admin-template-ops" },
  { key: "image2-link-site", label: "Image2联动站", href: image2LinkSiteUrl, external: true }
];

const pageTitles: Record<Image2SocialCommercePageMode, string> = {
  landing: "白底商品图，一键变卖货场景图",
  workbench: "AI 创作工作台",
  templates: "场景模板",
  case: "洁面乳自然光浴室台面案例",
  pricing: "图片额度价格方案",
  ops: "场景模板运营台",
  all: "白底商品图，一键变卖货场景图"
};

const templateCards = [
  { id: "01", title: "浴室台面 · 自然光", meta: "美妆护肤 / 主图", goal: "突出成分可信", output: "主图 + 详情页 + 种草封面", cost: "4 张额度", save: "68.6%", runs: "21.8w", image: assets.bathroom },
  { id: "02", title: "奶油厨房 · 温柔居家", meta: "家居日用 / 详情页", goal: "展示真实使用场景", output: "详情页 + 首帧", cost: "3 张额度", save: "66.3%", runs: "18.6w", image: assets.kitchen },
  { id: "03", title: "法式早餐 · 精致生活", meta: "食品饮料 / 小红书", goal: "提升生活方式感", output: "小红书封面 + 主图", cost: "4 张额度", save: "63.9%", runs: "8.2w", image: assets.breakfast },
  { id: "04", title: "户外野餐 · 自然活力", meta: "饮料冲调 / 活动图", goal: "强化活动氛围", output: "活动海报 + 首帧", cost: "3 张额度", save: "61.2%", runs: "7.6w", image: assets.picnic },
  { id: "05", title: "极简办公 · 高效氛围", meta: "数码配件 / 首帧", goal: "突出效率和质感", output: "短视频首帧 + 详情页", cost: "3 张额度", save: "59.8%", runs: "6.3w", image: assets.office },
  { id: "06", title: "高级暗调 · 质感氛围", meta: "香氛美妆 / 礼盒", goal: "提升高级感", output: "礼盒主图 + 种草图", cost: "4 张额度", save: "57.4%", runs: "5.9w", image: assets.detail },
  { id: "07", title: "礼盒开箱 · 仪式感", meta: "礼品套装 / 促销", goal: "突出赠礼感", output: "活动图 + 详情页", cost: "4 张额度", save: "56.1%", runs: "5.2w", image: assets.xiaohongshu },
  { id: "08", title: "直播间背景 · 专业带货", meta: "全类目 / 直播封面", goal: "提升直播专业感", output: "直播封面 + 首帧", cost: "3 张额度", save: "55.3%", runs: "4.8w", image: assets.bathroom }
];

const resultCards = [
  { title: "自然光浴室台面", tag: "主图", score: "96分", use: "1:1 主图，可直接上架", metric: "预计保存率 68.6%", action: "推荐设为默认主图", image: assets.bathroom },
  { title: "小红书封面", tag: "小红书", score: "94分", use: "4:5 封面，适合种草", metric: "种草点击 +18%", action: "适合加标题贴片", image: assets.xiaohongshu },
  { title: "详情页材质特写", tag: "详情页", score: "95分", use: "3:4 细节图，突出质感", metric: "停留提升 +12%", action: "放在详情页第二屏", image: assets.detail },
  { title: "短视频首帧", tag: "首帧", score: "93分", use: "9:16 首帧，保留安全区", metric: "首帧吸引力 91", action: "用于短视频封面", image: assets.bathroom }
];

const resultStats = [
  { label: "素材包", value: "4 张", note: "主图 / 详情 / 种草 / 首帧" },
  { label: "预计保存率", value: "68.6%", note: "基于浴室台面模板" },
  { label: "本次扣费", value: "4 张额度", note: "保存成功结果才扣" }
];

const opsRows = [
  { name: "浴室台面 · 自然光", category: "美妆护肤", save: "68.6%", runs: "21.8w", pay: "12.3%", status: "推荐上架", image: assets.bathroom },
  { name: "奶油厨房 · 温柔居家", category: "家居日用", save: "66.3%", runs: "18.6w", pay: "10.8%", status: "放大曝光", image: assets.kitchen },
  { name: "法式早餐 · 精致生活", category: "食品饮料", save: "63.9%", runs: "8.2w", pay: "9.6%", status: "继续测试", image: assets.breakfast },
  { name: "野餐时光 · 自然活力", category: "饮料冲调", save: "61.2%", runs: "7.6w", pay: "9.1%", status: "补充样张", image: assets.picnic },
  { name: "极简办公 · 高效氛围", category: "数码配件", save: "59.8%", runs: "6.3w", pay: "8.4%", status: "降权观察", image: assets.office }
];

const opsDecisionCards = [
  {
    label: "推荐上架",
    value: "3 个模板",
    copy: "保存率高于 64%，且付费转化连续两周上涨。",
    tone: "decisionGood",
    Icon: TrendingUp
  },
  {
    label: "继续测试",
    value: "5 个模板",
    copy: "点击生成高，但保存率未稳定，继续跑 200 次样本。",
    tone: "decisionTest",
    Icon: RefreshCcw
  },
  {
    label: "降权观察",
    value: "2 个模板",
    copy: "生成成功率低于 86%，先移出首页推荐位。",
    tone: "decisionWatch",
    Icon: ShieldCheck
  },
  {
    label: "需要重做",
    value: "1 个模板",
    copy: "商品边缘变形或文字误改，进入提示词重写队列。",
    tone: "decisionFix",
    Icon: Zap
  }
];

const opsQueue = [
  { title: "浴室台面 · 自然光", action: "推到首页第 1 位", owner: "今日", reason: "保存率 68.6%，付费转化 12.3%" },
  { title: "法式早餐 · 精致生活", action: "增加食品类样张", owner: "明日", reason: "点击高，样张覆盖不足" },
  { title: "极简办公 · 高效氛围", action: "下调推荐权重", owner: "本周", reason: "保存率低于同类均值 4.1%" }
];

const opsFunnel = [
  { label: "看模板", value: "42.8w" },
  { label: "上传商品", value: "33.5w" },
  { label: "点击生成", value: "24.6w" },
  { label: "保存结果", value: "16.8w" },
  { label: "额度耗尽", value: "2.45w" }
];

const flowSteps = [
  { index: "01", title: "选配方", copy: "从高保存率场景模板开始，确定类目、平台和转化目标。", Icon: LayoutGrid },
  { index: "02", title: "传商品", copy: "上传白底图或普通商品图，识别商品轮廓、材质和主体。", Icon: UploadCloud },
  { index: "03", title: "出结果", copy: "生成主图、详情页、小红书封面和短视频首帧变体。", Icon: WandSparkles },
  { index: "04", title: "用额度", copy: "已接入 ANS 统一算力积分（2 积分/张），生成、批量变体和高清导出统一按张结算。", Icon: Gift }
];

const commerceMetrics = [
  {
    label: "一图多平台",
    value: "主图 / 详情 / 小红书 / 首帧",
    copy: "同一张商品图，按平台比例和构图自动拆成可上架素材。"
  },
  {
    label: "模板按数据排序",
    value: "68.6% 保存率",
    copy: "后台沉淀生成次数、保存率、额度耗尽率，优先展示高转化配方。"
  },
  {
    label: "唯一付费点",
    value: "¥9.9 起买图片额度",
    copy: "普通配方浏览和基础提示词完全开放，在线生图统一消耗 2 ANS 积分/张。"
  }
];

const heroOutputPresets = [
  { label: "主图", ratio: "1:1", note: "直接上架", value: "96分" },
  { label: "详情页", ratio: "3:4", note: "突出质感", value: "95分" },
  { label: "小红书", ratio: "4:5", note: "适合种草", value: "+18%" },
  { label: "短视频首帧", ratio: "9:16", note: "保留安全区", value: "93分" }
];

const recipeMatrix = [
  { category: "美妆护肤", scene: "浴室台面", goal: "突出成分", output: "主图 / 详情页", metric: "保存率 68.6%" },
  { category: "家居日用", scene: "奶油厨房", goal: "展示使用场景", output: "详情页 / 首帧", metric: "生成 18.6w" },
  { category: "食品饮料", scene: "法式早餐", goal: "提升生活感", output: "小红书封面", metric: "保存率 63.9%" },
  { category: "数码配件", scene: "极简办公", goal: "突出效率感", output: "短视频首帧", metric: "付费转化 8.4%" }
];

const templatePipeline = [
  { label: "类目覆盖", value: "8 类", note: "美妆、食品、家居、数码持续扩展" },
  { label: "组合方式", value: "类目 x 场景 x 卖点", note: "不是单张案例，而是可复用配方" },
  { label: "运营排序", value: "按保存率 / 付费转化", note: "后台用数据决定展示优先级" }
];

const caseFitItems = [
  { label: "适合商品", value: "白色软管、瓶罐、洗护类包装" },
  { label: "转化目的", value: "突出干净、温和、成分可信" },
  { label: "生成风险", value: "强反光包装需降低高光，避免文字变形" }
];

const caseProofItems = [
  { label: "模板保存率", value: "68.6%", note: "高于美妆类平均值" },
  { label: "可产出素材", value: "4 张", note: "主图 / 详情 / 种草 / 首帧" },
  { label: "生成成本", value: "2 张额度", note: "保存成功结果才扣" }
];

const caseOutputKit = [
  { label: "主图", value: "1:1", note: "直接上架商品主图" },
  { label: "详情页", value: "3:4", note: "放在成分说明前" },
  { label: "小红书", value: "4:5", note: "适合封面和种草图" }
];

const casePathSteps = [
  "上传商品图",
  "套用浴室台面配方",
  "保存主图和详情页变体"
];

const caseActionOutputs = [
  { label: "主图", value: "1:1", note: "商品居中，适合淘宝/抖店" },
  { label: "详情页", value: "3:4", note: "突出质地与使用场景" },
  { label: "种草封面", value: "4:5", note: "保留标题贴片安全区" },
  { label: "短视频首帧", value: "9:16", note: "适合带货视频开头" }
];

const caseActionChecks = [
  "保留商品主体和包装比例",
  "自动套用浴室台面场景",
  "保存成功后才消耗额度"
];

const creditScenarios = [
  { label: "试做验证", value: "20 张", note: "适合 5 个商品各出 4 张基础素材" },
  { label: "稳定上新", value: "80 张", note: "适合每周上新、持续测模板" },
  { label: "团队批量", value: "350 张", note: "适合多店铺、多类目、批量变体" }
];

const creditMathItems = [
  { label: "商品主图", value: "1 张", note: "1:1，直接上架" },
  { label: "详情页场景", value: "1 张", note: "3:4，突出质感" },
  { label: "小红书封面", value: "1 张", note: "4:5，适合种草" },
  { label: "短视频首帧", value: "1 张", note: "9:16，保留安全区" }
];

const pricingProofItems = [
  { label: "统一定价", value: "2 积分/张", note: "接入 ANS 统一算力积分，合 ¥0.20/张" },
  { label: "扣费口径", value: "保存才扣", note: "生成失败、不可保存结果不消耗额度" },
  { label: "商业用途", value: "无二次收费", note: "生成图可用于店铺、详情页和内容封面" }
];

function ProductTube({ compact = false }: { compact?: boolean }) {
  return (
    <img
      className={`${styles.productImage} ${compact ? styles.productImageCompact : ""}`}
      src={assets.product}
      alt="白底洁面乳商品图"
    />
  );
}

function SceneMock({ image, label }: { image: string; label?: string }) {
  return (
    <div className={styles.sceneImageWrap}>
      {label ? <span className={styles.sceneBadge}>{label}</span> : null}
      <img src={image} alt={label ? `${label}场景图` : "电商场景图"} />
    </div>
  );
}

function OptionRow({ label, value }: { label: string; value: string }) {
  return (
    <button className={styles.selectRow}>
      <span>{label}</span>
      <strong>{value}</strong>
      <ChevronDown />
    </button>
  );
}

function Chips({ items, active = 0 }: { items: string[]; active?: number }) {
  return (
    <div className={styles.chips}>
      {items.map((item, index) => (
        <button className={index === active ? styles.chipActive : ""} key={item}>
          {item}
        </button>
      ))}
    </div>
  );
}

export function Image2SocialCommerceSite({
  activeSection = "home",
  mode = "all"
}: {
  activeSection?: Image2SocialCommerceSection;
  mode?: Image2SocialCommercePageMode;
}) {
  const showLanding = mode === "all" || mode === "landing";
  const showWorkbench = mode === "all" || mode === "workbench";
  const showTemplates = mode === "all" || mode === "templates";
  const showCase = mode === "all" || mode === "case";
  const showPricing = mode === "all" || mode === "pricing";
  const showOps = mode === "all" || mode === "ops";
  const showFinalCta = mode !== "ops";

  return (
    <main className={styles.page}>
      {!showLanding ? <h1 className={styles.srOnly}>{pageTitles[mode]}</h1> : null}
      <header className={styles.nav}>
        <a className={styles.brand} href="/image2-social-commerce" aria-label="场景引擎 AI 首页">
          <span className={styles.brandMark}><Sparkles /></span>
          <span>
            <strong>场景引擎</strong>
            <em>AI</em>
          </span>
        </a>

        <nav className={styles.navLinks} aria-label="主导航">
          {navItems.map((item) => (
            <a
              className={activeSection === item.key ? styles.activeNav : ""}
              href={item.href}
              key={item.key}
              rel={item.external ? "noreferrer" : undefined}
              target={item.external ? "_blank" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.navActions}>
          <span className={styles.creditPill}><Gift />图片额度 1,280</span>
          <a className={styles.upgradeButton} href="/image2-social-commerce/pricing">补充额度</a>
          <button className={styles.iconButton} aria-label="通知"><Bell /></button>
          <button className={styles.storeButton}>店</button>
          <details className={styles.mobileMenu}>
            <summary className={styles.menuButton} aria-label="打开菜单"><Menu /></summary>
            <div className={styles.mobileMenuPanel}>
              {navItems.map((item) => (
                <a
                  className={activeSection === item.key ? styles.mobileActiveNav : ""}
                  href={item.href}
                  key={item.key}
                  rel={item.external ? "noreferrer" : undefined}
                  target={item.external ? "_blank" : undefined}
                >
                  <span>{item.label}</span>
                  <ChevronRight />
                </a>
              ))}
              <a className={styles.mobileUpgrade} href="/image2-social-commerce/pricing">
                <Gift />补充额度
              </a>
            </div>
          </details>
        </div>
      </header>

      {showLanding ? (
        <>
      <section className={styles.hero} id="home">
        <div className={styles.heroCopy}>
          <span className={styles.badge}><Sparkles />新一代 AI 场景生成引擎</span>
          <h1>白底商品图，<br /><span className={styles.titleLine}>一键变<span>卖货场景图</span></span></h1>
          <p>AI 精准还原材质与细节，生成适合主图、详情页、小红书、短视频首帧的高转化电商场景图。</p>

          <div className={styles.uploadCard}>
            <UploadCloud />
            <strong>上传商品图</strong>
            <span>支持 JPG / PNG / WEBP，建议白底、光线均匀、主体完整</span>
          </div>

          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="/image2-social-commerce/workbench"><Sparkles />生成同款场景</a>
            <a className={styles.secondaryButton} href="/image2-cases">浏览配方库</a>
          </div>

          <div className={styles.proofRow}>
            <span><Check />30 秒极速生成</span>
            <span><Check />高精度还原商品细节</span>
            <span><Check />商用授权无忧</span>
          </div>
        </div>

        <div className={styles.beforeAfter}>
          <article className={styles.productCard}>
            <span className={styles.cardTag}>上传图</span>
            <ProductTube />
            <small>白底商品图</small>
          </article>
          <span className={styles.flowArrow}><ArrowRight /></span>
          <article className={styles.sceneCardHero}>
            <SceneMock image={assets.bathroom} label="生成效果" />
            <small>卖货场景图</small>
          </article>
          <div className={styles.heroOutputDock} aria-label="多平台输出素材">
            {heroOutputPresets.map((preset) => (
              <article key={preset.label}>
                <span>{preset.label}</span>
                <strong>{preset.ratio}</strong>
                <small>{preset.note}</small>
                <em>{preset.value}</em>
              </article>
            ))}
          </div>
        </div>

        <aside className={styles.recipePanel} aria-label="场景配方">
          <div className={styles.panelTitle}>
            <h2>场景配方</h2>
            <a href="/image2-social-commerce/templates">如何选择？</a>
          </div>
          <OptionRow label="商品类目" value="美妆护肤 / 洁面" />
          <OptionRow label="使用场景" value="浴室台面 / 日常清洁" />
          <OptionRow label="营销目标" value="突出成分 / 温和保湿" />
          <label>输出用途</label>
          <Chips items={["主图", "详情页", "小红书", "短视频首帧"]} />
          <label>风格选择</label>
          <Chips items={["自然光", "清新日系", "高级质感", "简约纯净"]} />
          <label>画面比例</label>
          <Chips items={["1:1", "4:5", "3:4", "16:9", "9:16"]} />
          <a className={styles.fullButton} href="/image2-social-commerce/workbench"><Sparkles />生成同款场景</a>
          <small className={styles.remaining}>今日剩余生成次数：18 次</small>
        </aside>
      </section>

      <section className={styles.trustStrip} aria-label="商业化能力">
        <div className={styles.trustIntro}>
          <span>商业化路径</span>
          <strong>把配方库变成可量化的卖货工具</strong>
        </div>
        {commerceMetrics.map((metric) => (
          <article className={styles.trustMetric} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.copy}</p>
          </article>
        ))}
      </section>

      <section className={styles.flowBand} aria-label="商品场景图生成流程">
        <div className={styles.flowIntro}>
          <span className={styles.badge}><Zap />4 步完成上架素材</span>
          <h2>从一张白底图，到一组能卖货的场景图</h2>
          <p>不要求会写提示词，也不要求懂设计。先选场景配方，再上传商品图，生成后直接保存适合平台的图片变体。</p>
        </div>
        <div className={styles.flowSteps}>
          {flowSteps.map(({ index, title, copy, Icon }) => (
            <article className={styles.flowStep} key={title}>
              <span>{index}</span>
              <Icon />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
        </>
      ) : null}

      {showWorkbench ? (
      <section className={styles.workbench} id="workbench">
        <aside className={styles.uploadRail}>
          <h2><span />上传商品</h2>
          <div className={styles.uploadPreview}>
            <ProductTube compact />
          </div>
          <div className={styles.inlineActions}>
            <button><RefreshCcw />重新上传</button>
            <button>替换商品</button>
          </div>
          <div className={styles.costCard}>
            <span>本次生成预计消耗</span>
            <strong>4 张额度</strong>
            <small>图片额度 1,280</small>
          </div>
          <ol className={styles.stepList}>
            <li className={styles.done}>上传商品</li>
            <li className={styles.done}>选择配方</li>
            <li className={styles.done}>调整卖点</li>
            <li className={styles.current}>生成图片</li>
          </ol>
        </aside>

        <div className={styles.resultBoard} id="results">
          <div className={styles.boardTop}>
            <div>
              <strong>成功还原商品轮廓 98%</strong>
              <span className={styles.progress}><i /></span>
            </div>
            <div className={styles.boardMetrics} aria-label="生成结果指标">
              {resultStats.map((stat) => (
                <article key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <small>{stat.note}</small>
                </article>
              ))}
            </div>
            <p>商品识别：洁面乳 <button>重新识别</button></p>
          </div>
          <div className={styles.resultActionBar}>
            <div>
              <span><Check />4 张结果已生成</span>
              <strong>保存后进入素材库，继续变体或高清导出都会使用图片额度。</strong>
            </div>
            <div>
              <button><Download />保存全部</button>
              <button><PackageCheck />高清导出</button>
              <a href="/image2-social-commerce/pricing#credit-checkout"><Gift />补充额度</a>
            </div>
          </div>
          <div className={styles.mobileResultDock} aria-label="移动端结果操作">
            <div>
              <strong>4 张结果</strong>
              <span>保存成功后扣 4 张额度</span>
            </div>
            <button><Download />保存全部</button>
            <a href="/image2-social-commerce/pricing#credit-checkout"><Gift />补额度</a>
          </div>
          <div className={styles.compareWorkspace}>
            <article>
              <h3>原图</h3>
              <div className={styles.originalBox}><ProductTube compact /></div>
            </article>
            <span className={styles.workspaceArrow}><ArrowRight /></span>
            <article>
              <div className={styles.resultPackHeader}>
                <div>
                  <h3>生成结果（4/4）</h3>
                  <p>这不是单张效果图，而是一组可保存、可复用、可继续变体的商品素材包。</p>
                </div>
                <span><TrendingUp />按保存率排序</span>
              </div>
              <div className={styles.resultGrid}>
                {resultCards.map((card) => (
                  <div className={styles.resultCard} key={card.title}>
                    <SceneMock image={card.image} label={card.tag} />
                    <span className={styles.score}>{card.score}</span>
                    <div>
                      <span>
                        <strong>{card.title}</strong>
                        <small>{card.use}</small>
                        <em>{card.metric}</em>
                        <small>{card.action}</small>
                      </span>
                      <span>
                        <button aria-label="下载"><Download /></button>
                        <button aria-label="收藏"><Star /></button>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>

        <aside className={styles.parameterPanel}>
          <div className={styles.panelTitle}>
            <h2>场景参数</h2>
            <button><RefreshCcw />重置</button>
          </div>
          <OptionRow label="商品类目" value="美妆护肤 / 洁面" />
          <label>目标平台</label>
          <Chips items={["主图", "详情页", "小红书", "短视频首帧"]} />
          <label>营销卖点（已选 3/3）</label>
          <div className={styles.sliders}>
            <span>温和清洁 <i style={{ width: "88%" }} /></span>
            <span>氨基酸配方 <i style={{ width: "82%" }} /></span>
            <span>水润保湿 <i style={{ width: "78%" }} /></span>
          </div>
          <label>色彩风格</label>
          <Chips items={["自然清新", "高级质感", "温暖柔和", "极简纯净"]} />
          <label>画面比例</label>
          <Chips items={["1:1", "4:5", "3:4", "16:9", "9:16"]} />
          <a className={styles.fullButton} href="/image2-social-commerce/pricing">再生成 4 张</a>
          <small className={styles.remaining}>本次生成将消耗 4 张图片额度</small>
        </aside>
      </section>
      ) : null}

      {showTemplates ? (
      <section className={styles.templates} id="templates">
        <div className={styles.sectionHeader}>
          <div>
            <h2>场景模板</h2>
            <p>从成熟卖货场景开始，不从空白开始。</p>
          </div>
          <div className={styles.segmented}>
            <button className={styles.selected}>推荐</button>
            <button>高保存率</button>
            <button>新上架</button>
            <button>活动促销</button>
          </div>
        </div>

        <article className={styles.mobileTemplateSpotlight}>
          <SceneMock image={assets.bathroom} label="推荐模板" />
          <div>
            <span>美妆护肤 · 主图/详情页</span>
            <strong>浴室台面 · 自然光</strong>
            <p>保存率 68.6%，默认生成主图、详情页、小红书封面和短视频首帧。</p>
            <a href="/image2-social-commerce/workbench">用这个配方生成</a>
          </div>
        </article>

        <div className={styles.templateSystem}>
          <div className={styles.templateSystemIntro}>
            <span className={styles.badge}><SlidersHorizontal />配方矩阵</span>
            <h3>按类目、场景、卖点和平台组合扩展模板</h3>
            <p>每个模板不是单张好图，而是一组可复用的生成规则。运营后台用保存率、生成次数和付费转化决定排序。</p>
          </div>
          <div className={styles.recipeMatrix}>
            {recipeMatrix.map((item) => (
              <article key={`${item.category}-${item.scene}`}>
                <span>{item.category}</span>
                <strong>{item.scene}</strong>
                <p>{item.goal}</p>
                <small>{item.output}</small>
                <em>{item.metric}</em>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.templatePipeline} aria-label="模板规模化系统">
          <div>
            <span>模板生产线</span>
            <strong>把好看的案例沉淀成可复用、可排序、可付费转化的配方库</strong>
          </div>
          {templatePipeline.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.note}</small>
            </article>
          ))}
        </div>

        <div className={styles.templateLayout}>
          <aside className={styles.filterPanel}>
            <OptionRow label="商品类目" value="全部类目" />
            <OptionRow label="使用平台" value="全部平台" />
            <OptionRow label="转化目标" value="全部目标" />
            <label>画幅</label>
            <Chips items={["1:1", "4:5", "3:4", "16:9", "9:16"]} />
            <button className={styles.resetButton}>重置筛选</button>
          </aside>

          <div className={styles.templateGrid}>
            {templateCards.map((card) => (
              <article className={styles.templateCard} key={card.id}>
                <SceneMock image={card.image} label={card.id} />
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.meta}</p>
                  <div className={styles.templateCardPurpose}>
                    <span>转化目的</span>
                    <strong>{card.goal}</strong>
                  </div>
                  <div className={styles.templateCardKit}>
                    <span>默认素材包</span>
                    <strong>{card.output}</strong>
                    <small>{card.cost}</small>
                  </div>
                  <div className={styles.templateCardStats}>
                    <span>保存率 <strong>{card.save}</strong></span>
                    <span>生成次数 <strong>{card.runs}</strong></span>
                  </div>
                  <a href="/image2-social-commerce/workbench">用这个配方</a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      ) : null}

      {showCase ? (
      <section className={styles.caseDetail} id="case">
        <div className={styles.caseVisual}>
          <article className={styles.productCard}>
            <span className={styles.cardTag}>生成前 · 白底图</span>
            <ProductTube />
            <small>上传的商品图</small>
          </article>
          <span className={styles.flowArrow}><ArrowRight /></span>
          <article className={styles.caseScene}>
            <SceneMock image={assets.bathroom} label="生成后 · 场景图" />
            <small>生成的场景图</small>
          </article>
        </div>

        <div className={styles.caseCopy}>
          <span className={styles.categoryPill}>美妆护肤</span>
          <h2>洁面乳自然光浴室台面</h2>
          <div className={styles.caseTags}>
            <span>主图</span>
            <span>自然光</span>
            <span>突出成分</span>
          </div>
          <div className={styles.caseProofStrip}>
            {caseProofItems.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.note}</small>
              </article>
            ))}
          </div>
          <p>在自然光下的浴室台面场景中展示洁面乳，突出产品成分与温和清洁卖点，营造干净、温和的使用氛围。</p>
          <div className={styles.promptCard}>
            <h3>提示词配方（可复用）</h3>
            <dl>
              <div><dt>商品主体</dt><dd>洁面乳，白色软管包装，正面朝前</dd></div>
              <div><dt>场景</dt><dd>浴室台面，洗漱区，毛巾，洗手液，绿植</dd></div>
              <div><dt>光线</dt><dd>自然光，柔和侧光，光影清晰</dd></div>
              <div><dt>卖点</dt><dd>突出成分，温和清洁，敏感肌适用</dd></div>
            </dl>
          </div>
          <div className={styles.caseFitGrid}>
            {caseFitItems.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
          <div className={styles.caseOutputKit}>
            <h3>复制后默认生成的素材包</h3>
            <div>
              {caseOutputKit.map((item) => (
                <article key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.note}</small>
                </article>
              ))}
            </div>
          </div>
        </div>

        <aside className={styles.caseAction}>
          <span className={styles.caseActionEyebrow}>套用这个场景配方</span>
          <h3>用我的商品生成同款素材包</h3>
          <div className={styles.smallDrop}><UploadCloud />点击上传或拖拽图片</div>
          <div className={styles.caseActionOutputs} aria-label="默认生成素材">
            {caseActionOutputs.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.note}</small>
              </article>
            ))}
          </div>
          <ol className={styles.casePath}>
            {casePathSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className={styles.caseActionChecks}>
            {caseActionChecks.map((item) => (
              <span key={item}><Check />{item}</span>
            ))}
          </div>
          <label>已选比例</label>
          <Chips items={["1:1", "4:5", "3:4", "16:9", "9:16"]} />
          <p><span>预计消耗</span><strong>4 张额度</strong></p>
          <small className={styles.caseCostNote}>保存哪张扣哪张；生成失败或未保存结果不消耗额度。</small>
          <a className={styles.fullButton} href="/image2-social-commerce/workbench">生成同款场景</a>
          <button className={styles.saveRecipe}><Bookmark />保存为我的配方</button>
        </aside>
      </section>
      ) : null}

      {showPricing ? (
      <section className={styles.pricing} id="pricing">
        <div className={styles.pricingIntro}>
          <span className={styles.badge}><Gift />透明计费 · 按需购买</span>
          <h2>图片额度，用完再买，按张计费</h2>
          <p>按张计费，用多少买多少；继续生成、批量变体、高清导出都使用同一种图片额度。使用 ANS 统一算力积分（2 积分/张），按商品上新节奏灵活调用。</p>
          <div className={styles.pricingProofGrid}>
            {pricingProofItems.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.note}</small>
              </article>
            ))}
          </div>
          <article className={styles.mobileRecommendedPlan}>
            <span>最适合稳定上新</span>
            <div>
              <strong>80 张图片额度</strong>
              <em>¥29</em>
            </div>
            <p>约 20 个商品上新包，覆盖主图、详情页、小红书封面和短视频首帧。</p>
            <a href="/image2-social-commerce/pricing#credit-checkout">选择 80 张</a>
          </article>
        </div>
        <div className={styles.creditScenarioBand} aria-label="图片额度使用场景">
          <div>
            <span>额度选择</span>
            <strong>接入 ANS 统一算力积分（2 积分/张），按商品上新节奏灵活生成</strong>
          </div>
          {creditScenarios.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.note}</small>
            </article>
          ))}
        </div>
        <div className={styles.priceGrid}>
          <article className={styles.priceCard}>
            <h3>20 张</h3>
            <strong>¥9.9</strong>
            <span>约 ¥0.50 / 张</span>
            <div className={styles.planValueBox}>
              <b>能做约 5 个商品上新包</b>
              <small>每个商品生成主图、详情页、小红书封面、短视频首帧各 1 张。</small>
            </div>
            <p><Check />有效期：自购买之日起 1 年</p>
            <p><Check />可用于所有生成与导出操作</p>
            <a className={styles.planButton} href="/image2-social-commerce/pricing#credit-checkout">选择 20 张</a>
          </article>
          <article className={`${styles.priceCard} ${styles.recommendedPrice}`}>
            <em>推荐</em>
            <h3>80 张</h3>
            <strong>¥29</strong>
            <span>约 ¥0.36 / 张，立省 ¥4.8</span>
            <div className={styles.planValueBox}>
              <b>能做约 20 个商品上新包</b>
              <small>适合一周多次上新，持续测试不同模板和卖点。</small>
            </div>
            <p><Check />适合稳定上新商家</p>
            <p><Check />覆盖主图、详情页、小红书变体</p>
            <a className={styles.planButton} href="/image2-social-commerce/pricing#credit-checkout">选择 80 张</a>
          </article>
          <article className={styles.priceCard}>
            <h3>350 张</h3>
            <strong>¥99</strong>
            <span>约 ¥0.28 / 张，立省 ¥75.0</span>
            <div className={styles.planValueBox}>
              <b>能做约 87 个商品上新包</b>
              <small>适合带货团队按类目批量生成素材，并保留多套候选图。</small>
            </div>
            <p><Check />适合批量商品与带货团队</p>
            <p><Check />可用于高清导出和批量变体</p>
            <a className={styles.planButton} href="/image2-social-commerce/pricing#credit-checkout">选择 350 张</a>
          </article>
        </div>
        <div className={styles.creditMathBoard} aria-label="单品素材包额度计算">
          <div>
            <span>单品素材包扣费示例</span>
            <strong>1 个商品上新包 = 4 张图片额度</strong>
            <p>把一张白底商品图变成四个最常用电商场景：主图、详情页、小红书封面、短视频首帧。保存哪张扣哪张，没保存不扣。</p>
          </div>
          <div className={styles.creditMathItems}>
            {creditMathItems.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.note}</small>
              </article>
            ))}
          </div>
        </div>
        <div className={styles.pricingRules}>
          <span><ShieldCheck />生成成功才扣额度</span>
          <span><RefreshCcw />失败自动返还</span>
          <span><PackageCheck />商用授权无额外费用</span>
        </div>
        <div className={styles.creditGuide}>
          <div className={styles.creditUsage}>
            <article>
              <Zap />
              <strong>1 张结果 = 1 张额度</strong>
              <p>每保存一张成功生成的图片，消耗 1 张图片额度；预览失败不扣。</p>
            </article>
            <article>
              <ImagePlus />
              <strong>批量变体同样计入额度</strong>
              <p>一次生成 4 张不同场景或比例，就消耗 4 张额度，口径简单透明。</p>
            </article>
            <article>
              <Box />
              <strong>高清导出统一使用图片额度</strong>
              <p>继续生成、批量变体、高清导出都归到同一个图片额度体系。</p>
            </article>
          </div>

          <div className={styles.pricingFaq}>
            {[
              ["为什么只做图片额度？", "早期只验证最重要的付费点：图片额度。用户不用研究复杂规则，用完再买，更适合中小商家和带货团队。"],
              ["如何计费与获取积分？", "在线生图统一为 2 ANS 积分/张（¥0.20）；普通配方浏览和提示词复制不扣积分，可前往 ans.cauai.fun/workspace/credits 领取或充值。"],
              ["生成失败会扣额度吗？", "不会。只有成功生成并可保存的图片才扣额度，失败任务自动返还。"]
            ].map(([question, answer], index) => (
              <details open={index === 0} key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
        <div className={styles.creditCheckout} id="credit-checkout">
          <div>
            <span>本地样板购买入口</span>
            <h3>选择额度包后，进入卡密 / 余额兑换流程</h3>
            <p>已接入 ANS (AI Never Stops) 统一账户与算力积分账本，支持 ANS 兑换码直接充值。</p>
          </div>
          <div className={styles.checkoutActions}>
            <a className={styles.primaryButton} href="/image2-social-commerce/workbench"><Gift />兑换图片额度</a>
            <a className={styles.secondaryButton} href="/image2-social-commerce/templates">先看模板效果</a>
          </div>
        </div>
      </section>
      ) : null}

      {showOps ? (
      <section className={styles.ops} id="ops">
        <aside className={styles.opsSide}>
          <strong>场景引擎 <span>管理员</span></strong>
          {["模板列表", "模板分类", "标签管理", "审核管理", "批量管理", "回收站"].map((item, index) => (
            <a className={index === 0 ? styles.opsActive : ""} href="/image2-social-commerce/admin-template-ops" key={item}>
              <Grid3X3 />{item}{item === "审核管理" ? <em>12</em> : null}
            </a>
          ))}
        </aside>
        <div className={styles.opsMain}>
          <div className={styles.opsHeader}>
            <div>
              <h2>场景模板运营台</h2>
              <p>用保存率、生成成功率和图片额度耗尽率决定模板上架、放大、降权和重做。</p>
            </div>
            <div>
              <button><Search />搜索模板名称</button>
              <button><SlidersHorizontal />全部状态</button>
              <button className={styles.opsCreate}>新建模板</button>
            </div>
          </div>

          <div className={styles.opsDecisionGrid} aria-label="模板运营决策摘要">
            {opsDecisionCards.map(({ Icon, ...card }) => (
              <article className={`${styles.opsDecisionCard} ${styles[card.tone]}`} key={card.label}>
                <span><Icon />{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.copy}</p>
              </article>
            ))}
          </div>

          <div className={styles.opsLayout}>
            <div className={styles.opsTable}>
              <div className={styles.opsTableTitle}>
                <div>
                  <span>模板榜单</span>
                  <strong>按商业表现自动排序</strong>
                </div>
                <button>导出数据</button>
              </div>
              <div className={styles.tableHead}>
                <span>模板名称</span><span>类目</span><span>保存率</span><span>生成次数</span><span>付费转化</span><span>动作</span>
              </div>
              {opsRows.map((row, index) => (
                <div className={index === 0 ? styles.rowSelected : ""} key={row.name}>
                  <span>
                    <img className={styles.rowThumb} src={row.image} alt="" />
                    <strong>{row.name}</strong>
                  </span>
                  <span>{row.category}</span>
                  <span>{row.save}</span>
                  <span>{row.runs}</span>
                  <span>{row.pay}</span>
                  <span><em className={styles.opsStatus}>{row.status}</em></span>
                </div>
              ))}
            </div>

            <article className={styles.opsDetail}>
              <h3>浴室台面 · 自然光 <span>推荐上架</span></h3>
              <div className={styles.opsCompare}>
                <div><ProductTube compact /></div>
                <ArrowRight />
                <SceneMock image={assets.bathroom} />
              </div>
              <div className={styles.opsHealth}>
                <span><Check />商品还原稳定</span>
                <span><Check />主图安全区通过</span>
                <span><Check />文字区域干净</span>
              </div>
              <dl>
                <div><dt>商品主体</dt><dd>洁面乳，白色软管包装</dd></div>
                <div><dt>场景</dt><dd>浴室台面，洗漱区，绿植</dd></div>
                <div><dt>光线</dt><dd>自然光，柔和侧光</dd></div>
                <div><dt>运营结论</dt><dd>推到首页第一屏，并生成护肤、洗护、香氛 3 组同构样张。</dd></div>
              </dl>
            </article>

            <aside className={styles.opsMetrics}>
              <div className={styles.opsFunnel}>
                <span>本周转化漏斗</span>
                {opsFunnel.map((item, index) => (
                  <article key={item.label}>
                    <i style={{ width: `${100 - index * 13}%` }} />
                    <strong>{item.value}</strong>
                    <em>{item.label}</em>
                  </article>
                ))}
              </div>
              {[
                ["上传商品率", "78.3%", "+6.8%"],
                ["生成成功率", "91.2%", "+3.4%"],
                ["保存率", "68.6%", "+5.7%"],
                ["额度耗尽率", "14.6%", "+1.2%"]
              ].map((metric) => (
                <div key={metric[0]}>
                  <span>{metric[0]}</span>
                  <strong>{metric[1]}</strong>
                  <em>较上周 {metric[2]}</em>
                  <BarChart3 />
                </div>
              ))}
              <div className={styles.opsQueue}>
                <span>本周运营动作</span>
                {opsQueue.map((item) => (
                  <article key={item.title}>
                    <strong>{item.action}</strong>
                    <p>{item.title}</p>
                    <em>{item.owner} · {item.reason}</em>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>
      ) : null}

      {showFinalCta ? (
      <section className={styles.finalCta} aria-label="开始生成商品场景图">
        <div>
          <span className={styles.badge}><WandSparkles />从一张白底图开始</span>
          <h2>把商品图变成每天能复用的卖货资产</h2>
          <p>先选定配方看商品还原、场景质感和平台适配效果，再使用 ANS 算力积分（2 积分/张）批量生成更多变体。</p>
          <div className={styles.finalCtaActions}>
            <a className={styles.primaryButton} href="/image2-social-commerce/workbench"><Sparkles />立即生成场景图</a>
            <a className={styles.secondaryButton} href="/image2-social-commerce/templates">浏览场景模板</a>
          </div>
        </div>

        <div className={styles.finalMetrics}>
          <article>
            <ImagePlus />
            <strong>30 秒</strong>
            <span>生成商品场景图</span>
          </article>
          <article>
            <LayoutGrid />
            <strong>8 类</strong>
            <span>高转化场景模板</span>
          </article>
          <article>
            <TrendingUp />
            <strong>68.6%</strong>
            <span>标杆模板保存率</span>
          </article>
        </div>
      </section>
      ) : null}

      <footer className={styles.siteFooter}>
        <a className={styles.footerBrand} href="/image2-social-commerce">
          <span className={styles.brandMark}><Sparkles /></span>
          <span>
            <strong>场景引擎</strong>
            <em>AI</em>
          </span>
        </a>
        <nav aria-label="页脚导航">
          {navItems.map((item) => (
            <a href={item.href} key={item.key} rel={item.external ? "noreferrer" : undefined} target={item.external ? "_blank" : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
        <p>白底商品图转卖货场景图，本地样板预览。</p>
      </footer>
    </main>
  );
}
