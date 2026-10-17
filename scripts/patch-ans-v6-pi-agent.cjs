#!/usr/bin/env node
/**
 * Hot-patch compiled Next.js bundles in /app/.next on haika-1757 (ans-platform-app)
 * to enable Little Dino Pi Agent (1-click zero-confirmation actions + 4 server tools).
 */
const fs = require("fs");

// 1. Patch /app/.next/server/app/api/mascot/agent/route.js
const routePath = "/app/.next/server/app/api/mascot/agent/route.js";
let routeCode = fs.readFileSync(routePath, "utf8");

if (!routeCode.includes("executePiAgentActionProd")) {
  // 1a. Patch module 18214 to handle action === "pi_action" before zod schema parse
  const target18214 =
    'let c=b.user.id;(0,g.vt)(a,c);let d=f.O.safeParse(await (0,g.Nd)(a));if(!d.success)throw new i.Yv("INVALID_INPUT",400);';
  const replacement18214 =
    'let c=b.user.id;let rawPiBody=await (0,g.Nd)(a);if(rawPiBody&&"pi_action"===rawPiBody.action)return Response.json(await (0,h.pA)(c,rawPiBody),{headers:l});(0,g.vt)(a,c);let d=f.O.safeParse(rawPiBody);if(!d.success)throw new i.Yv("INVALID_INPUT",400);';
  if (!routeCode.includes(target18214)) {
    throw new Error("Could not find target18214 in route.js");
  }
  routeCode = routeCode.replace(target18214, replacement18214);

  // 1b. Export pA from module 90098
  const targetExport90098 = "90098:(a,b,c)=>{c.d(b,{Vk:()=>D,jY:()=>z,kT:()=>B});";
  const replacementExport90098 =
    "90098:(a,b,c)=>{c.d(b,{Vk:()=>D,jY:()=>z,kT:()=>B,pA:()=>executePiAgentActionProd});";
  if (!routeCode.includes(targetExport90098)) {
    throw new Error("Could not find targetExport90098 in route.js");
  }
  routeCode = routeCode.replace(targetExport90098, replacementExport90098);

  // 1c. Add 4 Pi tools to tool descriptions `s` in 90098
  const targetToolsDesc =
    'credits:"Read this member\'s current balance when privateAccess is granted; otherwise only return public fixed conversion and billing destination."}';
  const replacementToolsDesc =
    'credits:"Read this member\'s current balance when privateAccess is granted; otherwise only return public fixed conversion and billing destination.",claim_daily_benefit:"Execute daily check-in for this authenticated member right now (+5 points and +1 free claw machine pull). Query may be empty.",play_claw_arcade:"Execute one 3D claw machine pull for this authenticated member right now (uses free daily pull first, then 5 points per extra pull; can win up to 888-point Koi Jackpot). Query may be empty.",search_market:"Search published listings in the ANS Market (/market) with prices in points and categories. Query can be a keyword or empty string to list top items.",scaffold_project_draft:"Create a new active project workspace draft for this authenticated member right now. Pass the desired project title in query (or empty string for default competition template)."}';
  if (!routeCode.includes(targetToolsDesc)) {
    throw new Error("Could not find targetToolsDesc in route.js");
  }
  routeCode = routeCode.replace(targetToolsDesc, replacementToolsDesc);

  // 1d. Add 4 Pi tool handlers inside `u(a,b,c,d)` right before `let t=d.privateAccess?await e.db.user.findUnique`
  const targetCreditsFallback =
    "let t=d.privateAccess?await e.db.user.findUnique({where:{id:c},select:{quotaPoints:!0}}):null;";
  const replacementCreditsFallback = `if("claim_daily_benefit"===a){let r=await piClaimDailyBenefit(c,d.locale);return{ok:r.ok,data:r.data,links:r.links}}if("play_claw_arcade"===a){let r=await piPlayClawArcade(c,d.locale);return{ok:r.ok,data:r.data,links:r.links}}if("search_market"===a){let r=await piSearchMarket(f,d.locale);return{ok:r.ok,data:r.data,links:r.links}}if("scaffold_project_draft"===a){let r=await piScaffoldProjectDraft(c,f,d.locale);return{ok:r.ok,data:r.data,links:r.links}}${targetCreditsFallback}`;
  if (!routeCode.includes(targetCreditsFallback)) {
    throw new Error("Could not find targetCreditsFallback in route.js");
  }
  routeCode = routeCode.replace(targetCreditsFallback, replacementCreditsFallback);

  // 1e. Update LLM system instructions in 90098 to allow Pi tool execution
  const targetReadOnlyPrompt =
    "This version only reads data. It cannot create, modify, delete, submit, buy, publish, generate files or run workflows. Offer a concrete link for the user to review inputs, authorize fees and execute on the existing page. Never say you did any of those actions.";
  const replacementReadOnlyPrompt =
    "You are equipped with real Pi Agent executable tools (claim_daily_benefit, play_claw_arcade, search_market, scaffold_project_draft). When the user asks to check in, play the claw machine, search the market, or create a project draft, call the corresponding tool immediately and report the real result.";
  if (routeCode.includes(targetReadOnlyPrompt)) {
    routeCode = routeCode.replace(targetReadOnlyPrompt, replacementReadOnlyPrompt);
  }

  // 1f. Append Pi Agent implementation functions at the end of module 90098
  const targetEnd90098 = 'e({type:"receipt",receipts:await A(a,f)})}}},92280:';
  const piHelpersCode = `e({type:"receipt",receipts:await A(a,f)})}}
const { randomUUID: piRandomUUID } = require("crypto");
const PI_DAILY_POINTS = 5;
const PI_CLAW_EXTRA_COST = 5;
const PI_CLAW_PRIZES = [
  { id: "koi_888", nameZh: "👑 农大锦鲤免单大奖 (+888积分)", nameEn: "👑 CAU Koi Grand Jackpot (+888 pts)", points: 888, weight: 0.25, rarity: "JACKPOT" },
  { id: "legend_188", nameZh: "💎 传世星耀盲盒 (+188积分)", nameEn: "💎 Mythic Star Capsule (+188 pts)", points: 188, weight: 1.25, rarity: "LEGENDARY" },
  { id: "ssr_66", nameZh: "🔥 SSR 算力金砖 (+66积分)", nameEn: "🔥 SSR Compute Gold Brick (+66 pts)", points: 66, weight: 4.5, rarity: "SSR" },
  { id: "sr_18", nameZh: "✨ SR 灵龙能量罐 (+18积分)", nameEn: "✨ SR Dino Energy Can (+18 pts)", points: 18, weight: 18, rarity: "SR" },
  { id: "r_8", nameZh: "🎁 R 幸运星豆袋 (+8积分)", nameEn: "🎁 R Lucky Star Pouch (+8 pts)", points: 8, weight: 42, rarity: "R" },
  { id: "n_3", nameZh: "🍬 暖心安慰糖果 (+3积分)", nameEn: "🍬 Cozy Comfort Candy (+3 pts)", points: 3, weight: 34, rarity: "N" }
];
function piPickPrize() {
  const total = PI_CLAW_PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of PI_CLAW_PRIZES) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return PI_CLAW_PRIZES[PI_CLAW_PRIZES.length - 1];
}
function piUtcDayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}
async function piClaimDailyBenefit(actor, locale = "zh") {
  const isZh = locale === "zh";
  const dayKey = piUtcDayKey();
  const idempotencyKey = "benefit:daily_checkin:" + actor + ":" + dayKey;
  const existing = await e.db.creditLedger.findUnique({ where: { idempotencyKey }, select: { id: true } });
  const userBefore = await e.db.user.findUnique({ where: { id: actor }, select: { quotaPoints: true } });
  if (!userBefore) return { ok: false, summary: isZh ? "未找到当前账户。" : "Account not found.", data: { code: "ACCOUNT_NOT_FOUND" }, links: [] };
  if (existing) {
    const bal = Number(userBefore.quotaPoints);
    return {
      ok: true,
      summary: isZh
        ? "📅 今日已完成签到（+" + PI_DAILY_POINTS + " 积分已到账），当前可用余额 " + bal + " 积分！快去抓娃娃或逛市场吧~"
        : "📅 Already checked in today (+" + PI_DAILY_POINTS + " pts credited). Current balance: " + bal + " pts!",
      data: { alreadyClaimed: true, pointsAdded: 0, balance: bal, dayKey },
      links: [
        { href: "/workspace/benefits#arcade", title: isZh ? "去 3D 抓娃娃机搏 888 锦鲤" : "Play 3D Claw Machine", detail: isZh ? "每日免费 1 局，5 积分无限续局" : "1 free daily pull + 5 pts extra pulls", icon: "credits" },
        { href: "/market", title: isZh ? "去积分市场挑工具" : "Browse ANS Market", detail: isZh ? "5~20 积分直兑科研/AIGC/面试神器" : "Redeem tools with points", icon: "discover" }
      ]
    };
  }
  const updated = await e.db.$transaction(async (tx) => {
    const u = await tx.user.update({ where: { id: actor }, data: { quotaPoints: { increment: PI_DAILY_POINTS } }, select: { quotaPoints: true } });
    await tx.creditLedger.create({
      data: {
        userId: actor,
        delta: PI_DAILY_POINTS,
        balanceAfter: u.quotaPoints,
        reason: "DAILY_CHECKIN_REWARD",
        idempotencyKey,
        meta: { dayKey, points: PI_DAILY_POINTS, source: "pi-agent-companion" }
      }
    });
    return u;
  });
  const bal = Number(updated.quotaPoints);
  return {
    ok: true,
    summary: isZh
      ? "🎉 小恐龙 Pi Agent 已帮你完成今日签到！到账 +" + PI_DAILY_POINTS + " 积分（外加今日 1 次免费抓娃娃机会），当前余额 " + bal + " 积分！"
      : "🎉 Pi Agent completed your daily check-in! +" + PI_DAILY_POINTS + " pts credited. Current balance: " + bal + " pts!",
    data: { alreadyClaimed: false, pointsAdded: PI_DAILY_POINTS, balance: bal, dayKey },
    links: [
      { href: "/workspace/benefits#arcade", title: isZh ? "去 3D 抓娃娃机搏 888 锦鲤" : "Play 3D Claw Machine", detail: isZh ? "已解锁今日免费局 + 积分续局" : "Free pull ready", icon: "credits" },
      { href: "/market", title: isZh ? "去市场花积分" : "Spend Points in Market", detail: isZh ? "10 款官方工作流与科研工具包即买即用" : "10 official tools ready", icon: "discover" }
    ]
  };
}
async function piPlayClawArcade(actor, locale = "zh") {
  const isZh = locale === "zh";
  const dayKey = piUtcDayKey();
  const freePrefix = "benefit:claw_arcade:" + actor + ":" + dayKey;
  const usedPlays = await e.db.creditLedger.count({
    where: { userId: actor, reason: "CLAW_ARCADE_REWARD", idempotencyKey: { startsWith: freePrefix } }
  });
  const isFreePlay = usedPlays < 1;
  const costPoints = isFreePlay ? 0 : PI_CLAW_EXTRA_COST;
  const userBefore = await e.db.user.findUnique({ where: { id: actor }, select: { quotaPoints: true } });
  if (!userBefore) return { ok: false, summary: isZh ? "未找到账户。" : "Account not found.", data: { code: "ACCOUNT_NOT_FOUND" }, links: [] };
  const currentBalance = Number(userBefore.quotaPoints);
  if (!isFreePlay && currentBalance < costPoints) {
    return {
      ok: false,
      summary: isZh
        ? "余额不足 " + costPoints + " 积分（当前 " + currentBalance + " 积分），先让本龙帮你每日签到领 +5 积分吧！"
        : "Insufficient balance (" + currentBalance + " pts). Claim daily check-in (+5 pts) first!",
      data: { code: "INSUFFICIENT_POINTS", balance: currentBalance, requiredPoints: costPoints },
      links: [{ href: "/workspace/benefits", title: isZh ? "前往福利中心签到" : "Go to Benefits Hub", detail: isZh ? "每日免费领积分" : "Claim daily points", icon: "credits" }]
    };
  }
  const prize = piPickPrize();
  const netDelta = prize.points - costPoints;
  const idempotencyKey = isFreePlay
    ? freePrefix + ":free:1"
    : freePrefix + ":paid:" + Date.now() + ":" + piRandomUUID().slice(0, 8);
  const updated = await e.db.$transaction(async (tx) => {
    const u = await tx.user.update({ where: { id: actor }, data: { quotaPoints: { increment: netDelta } }, select: { quotaPoints: true } });
    await tx.creditLedger.create({
      data: {
        userId: actor,
        delta: netDelta,
        balanceAfter: u.quotaPoints,
        reason: "CLAW_ARCADE_REWARD",
        idempotencyKey,
        meta: { dayKey, prizeId: prize.id, prizePoints: prize.points, costPoints, netDelta, isFreePlay, rarity: prize.rarity, source: "pi-agent-companion" }
      }
    });
    return u;
  });
  const balance = Number(updated.quotaPoints);
  const prizeTitle = isZh ? prize.nameZh : prize.nameEn;
  const costLabel = isFreePlay ? (isZh ? "今日免费局（0 积分）" : "Daily Free Pull (0 pts)") : (isZh ? "消耗 " + costPoints + " 积分" : "Spent " + costPoints + " pts");
  return {
    ok: true,
    summary: isZh
      ? "🕹️ 小恐龙伸出机械爪（" + costLabel + "）—— 抓中【" + prizeTitle + "】！净变动 " + (netDelta >= 0 ? "+" + netDelta : netDelta) + " 积分，当前余额 " + balance + " 积分！"
      : "🕹️ Pi Agent pulled the claw (" + costLabel + ") and caught [" + prizeTitle + "]! Net " + (netDelta >= 0 ? "+" + netDelta : netDelta) + " pts, balance: " + balance + " pts!",
    data: { prizeId: prize.id, prizeTitle, rarity: prize.rarity, prizePoints: prize.points, costPoints, netDelta, isFreePlay, balance },
    links: [
      { href: "/workspace/benefits#arcade", title: isZh ? "打开 3D 抓娃娃机游乐场" : "Open 3D Claw Arcade", detail: isZh ? "体验完整物理引擎抓爪与转盘" : "Full 3D physics claw & roulette", icon: "credits" },
      { href: "/market", title: isZh ? "用积分逛市场" : "Spend Points in Market", detail: isZh ? "当前可用 " + balance + " 积分" : "Balance: " + balance + " pts", icon: "discover" }
    ]
  };
}
async function piSearchMarket(query = "", locale = "zh") {
  const isZh = locale === "zh";
  const q = query.trim();
  const rows = await e.db.marketListing.findMany({
    where: {
      status: "published",
      publishedVersionId: { not: null },
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }] } : {})
    },
    orderBy: [{ official: "desc" }, { updatedAt: "desc" }],
    take: 4,
    select: { slug: true, title: true, summary: true, category: true, fulfillmentType: true, priceMinor: true, official: true }
  });
  const items = rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    summary: (r.summary || "").slice(0, 140),
    category: r.category,
    fulfillmentType: r.fulfillmentType,
    pointsPrice: Math.max(1, Math.round(r.priceMinor / 100)),
    official: r.official,
    href: "/market/" + r.slug
  }));
  const links = items.map((item) => ({
    href: item.href,
    title: item.title + " · " + item.pointsPrice + (isZh ? "积分" : "pts"),
    detail: item.summary,
    icon: "discover"
  }));
  if (!links.length) {
    links.push({
      href: "/market",
      title: isZh ? "进入 ANS 交易市场 (/market)" : "Open ANS Market (/market)",
      detail: isZh ? "浏览全部 8 大分类官方工具与工作流" : "Browse all 8 categories of tools & workflows",
      icon: "discover"
    });
  }
  return {
    ok: true,
    summary: items.length
      ? isZh
        ? "🛒 在市场找到 " + items.length + " 款即买即用商品：" + items.map((i) => "《" + i.title + "》（" + i.pointsPrice + "积分）").join("、") + "。点击下方卡片可直接查看或兑换！"
        : "🛒 Found " + items.length + " market listings: " + items.map((i) => i.title + " (" + i.pointsPrice + " pts)").join(", ") + "."
      : isZh
        ? "🛒 暂未找到完全匹配「" + q + "」的商品，已为你打开完整市场目录。"
        : "🛒 No exact match for '" + q + "'. Browse the full market catalog below.",
    data: { items, totalReturned: items.length },
    links: links.slice(0, 4)
  };
}
async function piScaffoldProjectDraft(actor, query = "", locale = "zh") {
  const isZh = locale === "zh";
  const rawTitle = query.trim();
  const title = rawTitle.length >= 2 ? rawTitle.slice(0, 80) : isZh ? "农大 AI 创新赛实战项目 · " + piUtcDayKey() : "CAU AI Innovation Project · " + piUtcDayKey();
  const goal = isZh
    ? "由小恐龙 Pi Agent 一键初始化：包含项目定位、核心工作流选型与立项路演检查清单。"
    : "Initialized by Little Dino Pi Agent with project positioning, workflow selection, and pitch checklist.";
  const created = await e.db.project.create({
    data: {
      ownerId: actor,
      title,
      goal,
      context: isZh
        ? "1. 痛点与目标受众\\n2. 核心 AI 工作流链路（可在 /market 或 /workflows 选用）\\n3. 实测数据与对比结论\\n4. 10页路演答辩提纲"
        : "1. Problem & audience\\n2. Core AI workflow pipeline\\n3. Benchmark data\\n4. 10-slide pitch outline",
      status: "ACTIVE"
    },
    select: { id: true, title: true }
  });
  return {
    ok: true,
    summary: isZh
      ? "🚀 小恐龙 Pi Agent 已为你创建立项草稿《" + created.title + "》！点击下方按钮即可直接进入项目工作台继续编辑。"
      : "🚀 Pi Agent created project draft '" + created.title + "'! Click below to open your project workspace.",
    data: { projectId: created.id, title: created.title, href: "/projects/" + created.id },
    links: [
      { href: "/projects/" + created.id, title: isZh ? "打开《" + created.title + "》" : "Open " + created.title, detail: isZh ? "已自动填入立项结构框架" : "Project scaffold ready", icon: "project" },
      { href: "/projects", title: isZh ? "查看我的全部项目" : "View All My Projects", detail: isZh ? "管理私有立项与参赛作品" : "Manage private projects", icon: "project" }
    ]
  };
}
function piDetectIntent(intent, query) {
  if (intent && intent !== "auto") return intent;
  const q = (query || "").toLowerCase();
  if (/签到|领积分|每日福利|checkin|check-in|daily/.test(q)) return "checkin";
  if (/抓娃娃|娃娃机|锦鲤|抽奖|盲盒|claw|arcade|gacha/.test(q)) return "claw";
  if (/立项|新建项目|创建项目|参赛|scaffold|create project|new project/.test(q)) return "scaffold";
  return "market";
}
async function executePiAgentActionProd(actor, rawBody) {
  const locale = rawBody && rawBody.locale === "en" ? "en" : "zh";
  const query = typeof (rawBody && rawBody.query) === "string" ? rawBody.query.trim().slice(0, 120) : "";
  const resolved = piDetectIntent(rawBody && rawBody.intent, query);
  let result;
  let toolName;
  if (resolved === "checkin") {
    toolName = "claim_daily_benefit";
    result = await piClaimDailyBenefit(actor, locale);
  } else if (resolved === "claw") {
    toolName = "play_claw_arcade";
    result = await piPlayClawArcade(actor, locale);
  } else if (resolved === "scaffold") {
    toolName = "scaffold_project_draft";
    result = await piScaffoldProjectDraft(actor, query, locale);
  } else {
    toolName = "search_market";
    const cleanedQuery = query.replace(/^(逛市场|找工具|市场|搜索市场|search market)\\s*/i, "");
    result = await piSearchMarket(cleanedQuery, locale);
  }
  const userAfter = await e.db.user.findUnique({ where: { id: actor }, select: { quotaPoints: true } });
  return {
    ok: result.ok,
    intent: resolved,
    toolName,
    reply: result.summary,
    balance: userAfter ? Number(userAfter.quotaPoints) : null,
    data: result.data,
    links: result.links
  };
}
},92280:`;
  if (!routeCode.includes(targetEnd90098)) {
    throw new Error("Could not find targetEnd90098 in route.js");
  }
  routeCode = routeCode.replace(targetEnd90098, piHelpersCode);
  fs.writeFileSync(routePath, routeCode, "utf8");
  console.log("Patched", routePath);
} else {
  console.log("Already patched", routePath);
}

// 2. Build shared PiAgentCopilotPod component factory for SSR (9060.js) and Client (layout.js)
function buildPiComponentCode(fnName, reactVar, jsxVar) {
  return `function ${fnName}({isZh:c,onSpeak:a}){let[open,setOpen]=(0,${reactVar}.useState)(!1),[piBusy,setPiBusy]=(0,${reactVar}.useState)(!1),[piQuery,setPiQuery]=(0,${reactVar}.useState)(""),[piResult,setPiResult]=(0,${reactVar}.useState)(null);async function runPi(intent,customQuery){if(piBusy)return;setOpen(!0),setPiBusy(!0);try{let res=await fetch("/api/mascot/agent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"pi_action",intent,query:(customQuery??piQuery).trim(),locale:c?"zh":"en"})}),data=await res.json();if(!res.ok||!data||"string"!=typeof data.reply){let msg=c?"⚠️ 请先登录账号后再使用小恐龙 Pi Agent 一键代办哦！":"⚠️ Please sign in to use Little Dino Pi Agent actions!";setPiResult({ok:!1,toolName:intent,reply:msg,balance:null,links:[{href:"/login",title:c?"前往登录":"Sign in",detail:"",icon:"credits"}]}),a?.(msg);return}setPiResult(data),a?.(data.reply),window.dispatchEvent(new CustomEvent("ans:sanctuary-updated"))}catch{let msg=c?"⚠️ Pi Agent 通信波动，请稍后重试。":"⚠️ Pi Agent network hiccup, please retry.";setPiResult({ok:!1,toolName:intent,reply:msg,balance:null,links:[]})}finally{setPiBusy(!1)}}return(0,${jsxVar}.jsxs)("div",{className:"mt-1.5","data-testid":"pi-agent-wrapper",children:[(0,${jsxVar}.jsxs)("div",{"data-testid":"pi-agent-quickbar",className:"flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-emerald-500/35 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 px-2.5 py-1.5",children:[(0,${jsxVar}.jsxs)("span",{className:"inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300",children:["⚡ ",c?"Pi Agent 免确认代办：":"Pi Agent 1-Click:"]}),(0,${jsxVar}.jsxs)("div",{className:"flex flex-wrap items-center gap-1",children:[(0,${jsxVar}.jsxs)("button",{type:"button","data-testid":"pi-action-checkin",disabled:piBusy,onClick:()=>runPi("checkin",""),className:"rounded-lg border border-emerald-500/40 bg-background/90 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-50 dark:text-emerald-300",children:["📅 ",c?"代签到 (+5分)":"Check-in (+5pt)"]}),(0,${jsxVar}.jsxs)("button",{type:"button","data-testid":"pi-action-claw",disabled:piBusy,onClick:()=>runPi("claw",""),className:"rounded-lg border border-amber-500/40 bg-background/90 px-2 py-0.5 text-[10px] font-bold text-amber-700 shadow-sm transition hover:bg-amber-500 hover:text-slate-950 disabled:opacity-50 dark:text-amber-300",children:["🕹️ ",c?"代抓娃娃搏锦鲤":"Claw Pull"]}),(0,${jsxVar}.jsxs)("button",{type:"button","data-testid":"pi-action-market",disabled:piBusy,onClick:()=>runPi("market",""),className:"rounded-lg border border-sky-500/40 bg-background/90 px-2 py-0.5 text-[10px] font-bold text-sky-700 shadow-sm transition hover:bg-sky-500 hover:text-slate-950 disabled:opacity-50 dark:text-sky-300",children:["🛒 ",c?"挑市场工具":"Market"]}),(0,${jsxVar}.jsxs)("button",{type:"button","data-testid":"pi-action-scaffold",disabled:piBusy,onClick:()=>runPi("scaffold",piQuery),className:"rounded-lg border border-purple-500/40 bg-background/90 px-2 py-0.5 text-[10px] font-bold text-purple-700 shadow-sm transition hover:bg-purple-500 hover:text-white disabled:opacity-50 dark:text-purple-300",children:["📝 ",c?"一键建参赛项目":"New Project"]}),(0,${jsxVar}.jsxs)("button",{type:"button","data-testid":"pi-agent-tab-toggle",onClick:()=>setOpen(v=>!v),className:"rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-500/30 dark:text-emerald-200",children:["🤖 ",c?open?"收起指令舱":"指令舱":open?"Hide Pod":"Pod"]})]})]}),open&&(0,${jsxVar}.jsxs)("div",{"data-testid":"pi-agent-pod",className:"mt-2 space-y-2 rounded-xl border border-emerald-500/40 bg-background/90 p-2.5",children:[(0,${jsxVar}.jsxs)("div",{className:"flex items-center justify-between gap-2",children:[(0,${jsxVar}.jsx)("span",{className:"font-bold text-emerald-700 dark:text-emerald-300",children:c?"🤖 小恐龙 Pi 实权副驾驶 · 零确认直连数据库":"🤖 Dino Pi Action Copilot · Zero-Confirmation Execution"}),(0,${jsxVar}.jsx)("span",{className:"rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300",children:piBusy?c?"执行中...":"Running...":c?"4 项实权工具已就绪":"4 Live Tools Ready"})]}),(0,${jsxVar}.jsxs)("form",{onSubmit:e=>{e.preventDefault(),runPi("auto",piQuery)},className:"flex items-center gap-1.5",children:[(0,${jsxVar}.jsx)("input",{type:"search","data-testid":"pi-agent-search-input",value:piQuery,onChange:e=>setPiQuery(e.target.value),placeholder:c?"输入指令或课题名称，如：帮我签到 / 抓娃娃 / 润色论文 / 新建农大参赛项目":"Type a command or project title: check in / claw / paper / new project",className:"min-w-0 flex-1 rounded-lg border border-border/70 bg-background px-2.5 py-1 text-[11px] text-foreground outline-none focus:border-emerald-500"}),(0,${jsxVar}.jsx)("button",{type:"submit",disabled:piBusy,className:"shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50",children:c?"⚡ 执行":"⚡ Run"})]}),piResult&&(0,${jsxVar}.jsxs)("div",{"data-testid":"pi-agent-result",className:"space-y-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-[11px]",children:[(0,${jsxVar}.jsxs)("div",{className:"flex flex-wrap items-center justify-between gap-1",children:[(0,${jsxVar}.jsxs)("span",{className:"rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200",children:["✓ Pi Tool: ",piResult.toolName]}),"number"==typeof piResult.balance&&(0,${jsxVar}.jsxs)("span",{className:"text-[10px] font-bold text-amber-600 dark:text-amber-300",children:["💰 ",c?"当前余额: ":"Balance: ",piResult.balance,c?" 积分":" pts"]})]}),(0,${jsxVar}.jsx)("p",{className:"leading-relaxed text-foreground",children:piResult.reply}),piResult.links&&piResult.links.length>0&&(0,${jsxVar}.jsx)("div",{className:"flex flex-wrap gap-1.5 pt-0.5",children:piResult.links.map(l=>(0,${jsxVar}.jsxs)("a",{href:l.href,className:"inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-background px-2 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300",children:["👉 ",l.title]},l.href))})]})]})]})}`;
}

// 3. Patch /app/.next/server/chunks/9060.js
const ssrChunkPath = "/app/.next/server/chunks/9060.js";
let ssrCode = fs.readFileSync(ssrChunkPath, "utf8");
if (!ssrCode.includes("pi-agent-quickbar")) {
  const ssrFnDef = buildPiComponentCode("sPiCopilot", "e", "d");
  const targetAyStart = "function ay({onSpeak:a,onInjectPrompt:b}){";
  if (!ssrCode.includes(targetAyStart)) {
    throw new Error("Could not find targetAyStart in 9060.js");
  }
  ssrCode = ssrCode.replace(targetAyStart, ssrFnDef + targetAyStart);

  const targetAyMsg =
    ',m&&(0,d.jsx)("p",{className:"mt-1.5 rounded-lg bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground",children:m}),';
  const replacementAyMsg =
    `,(0,d.jsx)(sPiCopilot,{isZh:c,onSpeak:a})${targetAyMsg}`;
  if (!ssrCode.includes(targetAyMsg)) {
    throw new Error("Could not find targetAyMsg in 9060.js");
  }
  ssrCode = ssrCode.replace(targetAyMsg, replacementAyMsg);
  fs.writeFileSync(ssrChunkPath, ssrCode, "utf8");
  console.log("Patched", ssrChunkPath);
} else {
  console.log("Already patched", ssrChunkPath);
}

// 4. Patch /app/.next/static/chunks/app/layout-23d5c1557ee44a3e.js
const clientChunkPath = "/app/.next/static/chunks/app/layout-23d5c1557ee44a3e.js";
let clientCode = fs.readFileSync(clientChunkPath, "utf8");
if (!clientCode.includes("pi-agent-quickbar")) {
  const clientFnDef = buildPiComponentCode("ePiCopilot", "s", "r");
  const targetEoStart = "function eO(e){";
  if (!clientCode.includes(targetEoStart)) {
    throw new Error("Could not find targetEoStart in layout.js");
  }
  clientCode = clientCode.replace(targetEoStart, clientFnDef + targetEoStart);

  const targetEoChildren = "children:[g,x,b,v,w,y,N,E]";
  const replacementEoChildren =
    "children:[g,x,b,(0,r.jsx)(ePiCopilot,{isZh:_,onSpeak:C}),v,w,y,N,E]";
  if (!clientCode.includes(targetEoChildren)) {
    throw new Error("Could not find targetEoChildren in layout.js");
  }
  clientCode = clientCode.replace(targetEoChildren, replacementEoChildren);
  fs.writeFileSync(clientChunkPath, clientCode, "utf8");
  console.log("Patched", clientChunkPath);
} else {
  console.log("Already patched", clientChunkPath);
}
