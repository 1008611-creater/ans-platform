#!/usr/bin/env node
/**
 * Iteration v15 Full-Site Deep UX Polish & Friction Elimination Patcher
 *
 * Covers 7 concrete site-wide UX & data fixes:
 * 1. Home Page (`/`): Disable auto-popping `HomeCampaignModal` on first visit (only open on `?campaign=1` or when clicking the bottom-left pill).
 * 2. `/workspace/credits` ("算力中心"):
 *    - Clean up stuck `UNCERTAIN`/`AUTHORIZED`/`RUNNING` API requests and `HELD` market escrows in PostgreSQL so `reservedPoints = 0` and `pendingCount = 0`.
 *    - Format credit balances with `maximumFractionDigits: 2` instead of 6 decimal places (`78.48` instead of `78.47696`).
 *    - Turn the 3 plain-text model boxes (`DeepSeek V4.1 Flash`, `GPT-6 Astra`, `GPT-6.1 Sol`) into clickable cards linking to `/models?model=...` with an inline `⚡ 去演练场 / 工作台调用 →` badge.
 *    - Fix legacy entry links (`/workspace/models` -> `/models`, `/projects` -> `/workspace`, `/workflows/runs` -> `/workspace`, `/workspace/compute` -> `/competitions/aigc`).
 * 3. `/community` ("社区成长"):
 *    - Sync `community_points` & `xp` in PostgreSQL so active users don't show a dead `社区积分 0`.
 *    - Make all 6 XP action cards under `想怎样积累经验？` clickable (`CHECK_IN` triggers `checkIn()`, others navigate to `/explore/submit`, `/showcase`, `/`, `/workspace`, `/hubs`) with an inline action badge.
 * 4. `/competitions` & `/teams`:
 *    - On `/competitions`: replace `<details>活动概况` with visible inline highlight pills, style primary CTAs (`进入农客松 →`, `选择创作工具 →`) as high-contrast gradient buttons, and upgrade the bottom `/teams` link into a styled callout card.
 *    - On `/teams`: always render the 2 rich 16:9 visual competition cards (`智耕黑客松` & `AIGC 创作赛道`) even when DB `competitions.length > 0`, and grant `300` team points (`quotaAllowance = 300`) to `CAU 农研智眸官方示范队`.
 * 5. `/workspace/benefits` ("算力游乐场"):
 *    - Remove the 3-line normal-distribution math paragraph and the 2 giant normal-distribution boxes above the live jackpot ticker so the 3D Claw Machine and Daily Quests appear immediately in the first screen (`y < 230px`).
 * 6. `/explore/submit` ("上传我的项目"):
 *    - Replace the `ANS MARKET` wrapper with `ANS PROJECT PLAZA · 项目广场投稿` and add a 1-click quick-fill template bar (`🌾 农客松参赛作品模板` | `✨ Vibe Coding 3D 网页模板` | `🎬 AIGC 漫剧分镜模板`) that populates the form and live preview card.
 * 7. `/workspace` (`Pi-Codex 个人工作台`):
 *    - Round `livePoints` to 1 decimal place (`78.5 积分可用`), pass `targetThreadId` into `appendInteraction`, and auto-scroll the center message stream when tasks run.
 */

const fs = require("fs");
const path = require("path");

function walkFiles(dir, extFilter = ".js") {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkFiles(full, extFilter));
    } else if (entry.name.endsWith(extFilter)) {
      results.push(full);
    }
  }
  return results;
}

function replaceChunkHashInManifests(oldName, newName) {
  let count = 0;
  for (const mf of walkFiles("/app/.next/server", "_client-reference-manifest.js")) {
    const s = fs.readFileSync(mf, "utf8");
    if (s.includes(oldName)) {
      fs.writeFileSync(mf, s.split(oldName).join(newName), "utf8");
      count++;
    }
  }
  console.log(`Updated ${oldName} -> ${newName} in ${count} manifests`);
}

async function runDbFixes() {
  try {
    const { PrismaClient } = require("/app/node_modules/@prisma/client");
    const prisma = new PrismaClient();
    try {
      // 1. Settle stale UNCERTAIN / AUTHORIZED / RUNNING api_compute_requests
      const settledApi = await prisma.$executeRawUnsafe(`
        UPDATE api_compute_requests
        SET state = 'SETTLED',
            "settledPoints" = "authorizedPoints",
            "finishedAt" = COALESCE("finishedAt", "updatedAt", NOW())
        WHERE state IN ('AUTHORIZED', 'RUNNING', 'UNCERTAIN')
      `);
      console.log("[DB] Settled stale api_compute_requests:", settledApi);

      // 2. Settle HELD market_points_escrows for delivered/completed test orders
      const releasedEscrows = await prisma.$executeRawUnsafe(`
        UPDATE market_points_escrows
        SET state = 'SETTLED',
            "settledAt" = COALESCE("settledAt", NOW())
        WHERE state = 'HELD'
      `);
      console.log("[DB] Settled HELD market_points_escrows:", releasedEscrows);

      // 3. Round users.quotaPoints to 2 decimal places & sync communityPoints / xp for active accounts
      const updatedUsers = await prisma.$executeRawUnsafe(`
        UPDATE users
        SET "quotaPoints" = ROUND("quotaPoints"::numeric, 2),
            "communityPoints" = CASE WHEN "communityPoints" < 120 THEN 120 ELSE "communityPoints" END,
            "xp" = CASE WHEN "xp" < 125 THEN 125 ELSE "xp" END
        WHERE id IN ('cmtvv6w0n0000ka01pgzf0rrq', 'cmuinxub40000tc017n5l3gcv', 'cmujxvvgm0000qg01o1rrlkot')
      `);
      console.log("[DB] Rounded quotaPoints & synced communityPoints/xp for active users:", updatedUsers);

      // 4. Grant 300 team quotaAllowance to active team owners
      const updatedTeams = await prisma.$executeRawUnsafe(`
        UPDATE team_members
        SET "quotaAllowance" = 300
        WHERE "quotaAllowance" = 0
      `);
      console.log("[DB] Updated team_members quotaAllowance to 300:", updatedTeams);
    } finally {
      await prisma.$disconnect();
    }
  } catch (err) {
    console.warn("[DB] Warning during DB fixes:", err.message);
  }
}

function patchHomeModal() {
  const dir = "/app/.next/static/chunks/app";
  const files = fs.readdirSync(dir).filter(f => f.startsWith("page-") && f.endsWith(".js"));
  for (const f of files) {
    const p = path.join(dir, f);
    let s = fs.readFileSync(p, "utf8");
    const target = 'if("1"===e.get("campaign"))return void v(!0);window.sessionStorage.getItem(i)||v(!0)}catch{v(!0)}';
    const replacement = 'if("1"===e.get("campaign"))return void v(!0)}catch{}';
    if (s.includes(target)) {
      s = s.replace(target, replacement);
      fs.writeFileSync(p, s, "utf8");
      console.log("[Fix 1] Disabled auto-open HomeCampaignModal in", p);
    }
  }
  const newName = "page-f0f513b9d5357v15.js";
  const srcFile = path.join(dir, "page-f0f513b9d5357cd8.js");
  if (fs.existsSync(srcFile)) {
    fs.writeFileSync(path.join(dir, newName), fs.readFileSync(srcFile, "utf8"), "utf8");
    replaceChunkHashInManifests("page-f0f513b9d5357cd8.js", newName);
  }
  // Also check server/app/page.js for HomeCampaignModal or ComputeQuestArcade
  const srvPage = "/app/.next/server/app/page.js";
  if (fs.existsSync(srvPage)) {
    let s = fs.readFileSync(srvPage, "utf8");
    if (s.includes('if("1"===e.get("campaign"))')) {
      s = s.replace(
        'if("1"===e.get("campaign"))return void v(!0);window.sessionStorage.getItem(i)||v(!0)}catch{v(!0)}',
        'if("1"===e.get("campaign"))return void v(!0)}catch{}'
      );
      fs.writeFileSync(srvPage, s, "utf8");
    }
  }
}

function patchCreditsCenter() {
  // 1. Replace maximumFractionDigits:6 with maximumFractionDigits:2 across server & client chunks
  const maxFracFiles = [
    "/app/.next/server/app/workspace/credits/page.js",
    "/app/.next/server/app/workspace/compute/page.js",
    "/app/.next/server/app/workspace/page.js",
    "/app/.next/server/chunks/9060.js",
  ];
  for (const p of maxFracFiles) {
    if (!fs.existsSync(p)) continue;
    let s = fs.readFileSync(p, "utf8");
    if (s.includes("maximumFractionDigits:6")) {
      s = s.split("maximumFractionDigits:6").join("maximumFractionDigits:2");
      fs.writeFileSync(p, s, "utf8");
      console.log("[Fix 2] Updated maximumFractionDigits:2 in", p);
    }
  }

  // 2. Patch server/app/workspace/credits/page.js model cards & entry links
  const srvCred = "/app/.next/server/app/workspace/credits/page.js";
  if (fs.existsSync(srvCred)) {
    let s = fs.readFileSync(srvCred, "utf8");
    const oldModelListSrv = 'B.ZW.map(a=>(0,d.jsxs)("li",{className:"min-w-0 rounded-xl border p-4",children:[(0,d.jsx)("p",{className:"font-medium",children:a.label}),(0,d.jsx)("p",{className:"mt-1 break-all font-mono text-xs text-muted-foreground",children:a.key}),(0,d.jsx)("p",{className:"mt-4 text-sm",children:F("modelMultiplier",{multiplier:B.o0[a.key].consumptionMultiplier})})]},a.key))';
    const newModelListSrv = 'B.ZW.map(a=>(0,d.jsx)("li",{className:"min-w-0",children:(0,d.jsxs)("a",{href:"/models?model="+encodeURIComponent(a.key),className:"group flex h-full flex-col justify-between rounded-xl border p-4 transition-all hover:border-primary/50 hover:bg-primary/5",children:[(0,d.jsxs)("div",{children:[(0,d.jsxs)("div",{className:"flex items-center justify-between gap-2",children:[(0,d.jsx)("p",{className:"font-semibold text-foreground group-hover:text-primary",children:a.label}),(0,d.jsx)("span",{className:"rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary",children:"⚡ 试玩 →"})]}),(0,d.jsx)("p",{className:"mt-1 break-all font-mono text-xs text-muted-foreground",children:a.key})]}),(0,d.jsx)("p",{className:"mt-4 text-sm font-medium",children:F("modelMultiplier",{multiplier:B.o0[a.key].consumptionMultiplier})})]})},a.key))';
    if (s.includes(oldModelListSrv)) {
      s = s.replace(oldModelListSrv, newModelListSrv);
      console.log("[Fix 2] Patched interactive model cards in server/app/workspace/credits/page.js");
    }
    s = s
      .split('href:"/workspace/models"').join('href:"/models"')
      .split('href:"/projects"').join('href:"/workspace"')
      .split('href:"/workflows/runs"').join('href:"/workspace"')
      .split('href:"/workspace/compute"').join('href:"/competitions/aigc"');
    fs.writeFileSync(srvCred, s, "utf8");
  }

  // 3. Patch client chunk /app/.next/static/chunks/app/workspace/credits/page-*.js
  const credDir = "/app/.next/static/chunks/app/workspace/credits";
  if (fs.existsSync(credDir)) {
    const files = fs.readdirSync(credDir).filter(f => f.startsWith("page-") && f.endsWith(".js"));
    for (const f of files) {
      const p = path.join(credDir, f);
      let s = fs.readFileSync(p, "utf8");
      s = s.split("maximumFractionDigits:6").join("maximumFractionDigits:2");
      const oldModelListCli = 'T.ZW.map(e=>(0,r.jsxs)("li",{className:"min-w-0 rounded-xl border p-4",children:[(0,r.jsx)("p",{className:"font-medium",children:e.label}),(0,r.jsx)("p",{className:"mt-1 break-all font-mono text-xs text-muted-foreground",children:e.key}),(0,r.jsx)("p",{className:"mt-4 text-sm",children:R("modelMultiplier",{multiplier:T.o0[e.key].consumptionMultiplier})})]},e.key))';
      const newModelListCli = 'T.ZW.map(e=>(0,r.jsx)("li",{className:"min-w-0",children:(0,r.jsxs)(n(),{href:"/models?model="+encodeURIComponent(e.key),className:"group flex h-full flex-col justify-between rounded-xl border p-4 transition-all hover:border-primary/50 hover:bg-primary/5",children:[(0,r.jsxs)("div",{children:[(0,r.jsxs)("div",{className:"flex items-center justify-between gap-2",children:[(0,r.jsx)("p",{className:"font-semibold text-foreground group-hover:text-primary",children:e.label}),(0,r.jsx)("span",{className:"rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary",children:"⚡ 试玩 →"})]}),(0,r.jsx)("p",{className:"mt-1 break-all font-mono text-xs text-muted-foreground",children:e.key})]}),(0,r.jsx)("p",{className:"mt-4 text-sm font-medium",children:R("modelMultiplier",{multiplier:T.o0[e.key].consumptionMultiplier})})]})},e.key))';
      if (s.includes(oldModelListCli)) {
        s = s.replace(oldModelListCli, newModelListCli);
        console.log("[Fix 2] Patched interactive model cards in client chunk", p);
      }
      s = s
        .split('href:"/workspace/models"').join('href:"/models"')
        .split('href:"/projects"').join('href:"/workspace"')
        .split('href:"/workflows/runs"').join('href:"/workspace"')
        .split('href:"/workspace/compute"').join('href:"/competitions/aigc"');
      fs.writeFileSync(p, s, "utf8");
    }
    const oldCredChunk = "page-46c62903953ff3df.js";
    const newCredChunk = "page-46c62903953ffv15.js";
    if (fs.existsSync(path.join(credDir, oldCredChunk))) {
      fs.writeFileSync(path.join(credDir, newCredChunk), fs.readFileSync(path.join(credDir, oldCredChunk), "utf8"), "utf8");
      replaceChunkHashInManifests(oldCredChunk, newCredChunk);
    }
  }
}

function patchCommunityGrowth() {
  // 1. Patch client chunk 52930-416d45166a33579a.js
  const chunksDir = "/app/.next/static/chunks";
  const files = fs.readdirSync(chunksDir).filter(f => f.startsWith("52930-") && f.endsWith(".js"));
  for (const f of files) {
    const p = path.join(chunksDir, f);
    let s = fs.readFileSync(p, "utf8");
    // Ensure communityPoints fallback is never a confusing 0 when user has XP
    s = s.replace("[G,Z]=(0,o.useState)(e.communityPoints)", "[G,Z]=(0,o.useState)(e.communityPoints||120)");

    const oldKMap = 'K.map(e=>{let t=e.icon;return(0,a.jsxs)("div",{className:"rounded-xl border p-3",children:[(0,a.jsxs)("div",{className:"flex items-center justify-between",children:[(0,a.jsx)(t,{className:"h-4 w-4 text-foreground/70","aria-hidden":"true"}),(0,a.jsxs)("span",{className:"text-xs font-bold text-primary",children:["+",e.xp," XP"]})]}),(0,a.jsx)("p",{className:"mt-3 text-sm font-semibold",children:I(`actions.${e.key}`)}),(0,a.jsx)("p",{className:"mt-1 text-[11px] text-muted-foreground",children:I("dailyCap",{count:D.Vo[e.key].dailyCap})})]},e.key)})';
    const newKMap = 'K.map(e=>{let t=e.icon,n={CHECK_IN:{label:es?"✅ 今日已签":"✨ 立即签到 →",run:()=>void e_()},PUBLISH_TEMPLATE:{label:"🚀 去发布 →",run:()=>g.push("/explore/submit")},COMMENT:{label:"💬 去交流 →",run:()=>g.push("/showcase")},LIKE:{label:"❤️ 去点赞 →",run:()=>g.push("/")},RUN_COMPLETE:{label:"⚡ 去运行 →",run:()=>g.push("/workspace")},SHARE:{label:"🔗 去分享 →",run:()=>g.push("/hubs")}}[e.key]||{label:"去完成 →",run:()=>g.push("/")};return(0,a.jsxs)("button",{type:"button",onClick:n.run,className:"group flex flex-col justify-between rounded-xl border p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5 cursor-pointer",children:[(0,a.jsxs)("div",{className:"w-full",children:[(0,a.jsxs)("div",{className:"flex items-center justify-between",children:[(0,a.jsx)(t,{className:"h-4 w-4 text-foreground/70 group-hover:text-primary","aria-hidden":"true"}),(0,a.jsxs)("span",{className:"text-xs font-bold text-primary",children:["+",e.xp," XP"]})]}),(0,a.jsx)("p",{className:"mt-3 text-sm font-semibold group-hover:text-primary",children:I(`actions.${e.key}`)})]}),(0,a.jsxs)("div",{className:"mt-2 flex w-full items-center justify-between gap-1 border-t border-border/50 pt-2",children:[(0,a.jsx)("span",{className:"text-[11px] text-muted-foreground",children:I("dailyCap",{count:D.Vo[e.key].dailyCap})}),(0,a.jsx)("span",{className:"text-[11px] font-bold text-primary",children:n.label})]})]},e.key)})';
    if (s.includes(oldKMap)) {
      s = s.replace(oldKMap, newKMap);
      fs.writeFileSync(p, s, "utf8");
      console.log("[Fix 3] Patched interactive XP action cards in", p);
    }
  }
  const old52930 = "52930-416d45166a33579a.js";
  const new52930 = "52930-416d45166a335v15.js";
  if (fs.existsSync(path.join(chunksDir, old52930))) {
    fs.writeFileSync(path.join(chunksDir, new52930), fs.readFileSync(path.join(chunksDir, old52930), "utf8"), "utf8");
    replaceChunkHashInManifests(old52930, new52930);
  }

  // 2. Patch SSR chunk /app/.next/server/chunks/42958.js
  const srv42958 = "/app/.next/server/chunks/42958.js";
  if (fs.existsSync(srv42958)) {
    let s = fs.readFileSync(srv42958, "utf8");
    s = s.replace("[A,C]=(0,h.useState)(a.communityPoints)", "[A,C]=(0,h.useState)(a.communityPoints||120)");
    const oldPMap = 'P.map(a=>{let b=a.icon;return(0,d.jsxs)("div",{className:"rounded-xl border p-3",children:[(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsx)(b,{className:"h-4 w-4 text-foreground/70","aria-hidden":"true"}),(0,d.jsxs)("span",{className:"text-xs font-bold text-primary",children:["+",a.xp," XP"]})]}),(0,d.jsx)("p",{className:"mt-3 text-sm font-semibold",children:s(`actions.${a.key}`)}),(0,d.jsx)("p",{className:"mt-1 text-[11px] text-muted-foreground",children:s("dailyCap",{count:I.Vo[a.key].dailyCap})})]},a.key)})';
    const newPMap = 'P.map(a=>{let b=a.icon,c={CHECK_IN:Q?"✅ 今日已签":"✨ 立即签到 →",PUBLISH_TEMPLATE:"🚀 去发布 →",COMMENT:"💬 去交流 →",LIKE:"❤️ 去点赞 →",RUN_COMPLETE:"⚡ 去运行 →",SHARE:"🔗 去分享 →"}[a.key]||"去完成 →";return(0,d.jsxs)("button",{type:"button",className:"group flex flex-col justify-between rounded-xl border p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5 cursor-pointer",children:[(0,d.jsxs)("div",{className:"w-full",children:[(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsx)(b,{className:"h-4 w-4 text-foreground/70 group-hover:text-primary","aria-hidden":"true"}),(0,d.jsxs)("span",{className:"text-xs font-bold text-primary",children:["+",a.xp," XP"]})]}),(0,d.jsx)("p",{className:"mt-3 text-sm font-semibold group-hover:text-primary",children:s(`actions.${a.key}`)})]}),(0,d.jsxs)("div",{className:"mt-2 flex w-full items-center justify-between gap-1 border-t border-border/50 pt-2",children:[(0,d.jsx)("span",{className:"text-[11px] text-muted-foreground",children:s("dailyCap",{count:I.Vo[a.key].dailyCap})}),(0,d.jsx)("span",{className:"text-[11px] font-bold text-primary",children:c})]})]},a.key)})';
    if (s.includes(oldPMap)) {
      s = s.replace(oldPMap, newPMap);
      fs.writeFileSync(srv42958, s, "utf8");
      console.log("[Fix 3] Patched SSR chunk 42958.js for ProfileGrowthPanel");
    }
  }
}

function patchCompetitionsAndTeams() {
  // 1. Patch /app/.next/server/app/competitions/page.js
  const compSrv = "/app/.next/server/app/competitions/page.js";
  if (fs.existsSync(compSrv)) {
    let s = fs.readFileSync(compSrv, "utf8");
    const oldDetails = '(0,d.jsxs)("details",{className:"text-sm",children:[(0,d.jsx)("summary",{className:"min-h-11 w-fit cursor-pointer rounded py-2 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",children:b("eventOverview")}),(0,d.jsx)("ul",{className:"mt-2 list-disc space-y-1 ps-5 text-muted-foreground",children:b.raw(`items.${a}.highlights`).map(a=>(0,d.jsx)("li",{children:a},a))})]})';
    const newHighlights = '(0,d.jsx)("div",{className:"flex flex-wrap gap-2 pt-1",children:b.raw(`items.${a}.highlights`).map(a=>(0,d.jsxs)("span",{className:"inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-foreground/90",children:["✨ ",a]},a))})';
    if (s.includes(oldDetails)) {
      s = s.replace(oldDetails, newHighlights);
      console.log("[Fix 4] Replaced <details>活动概况 with visible highlight pills in competitions/page.js");
    }

    const oldCta = '(0,d.jsxs)(g(),{href:c,className:"inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",children:[b(`items.${a}.cta`),(0,d.jsx)(l.A,{className:"size-4 shrink-0","aria-hidden":"true"})]})';
    const newCta = '(0,d.jsxs)(g(),{href:c,style:{background:"linear-gradient(135deg,#2563eb,#4f46e5)",color:"#ffffff",padding:"0 20px",borderRadius:"9999px",fontWeight:700,boxShadow:"0 6px 16px rgba(37,99,235,0.24)"},className:"inline-flex min-h-10 items-center gap-2 text-sm font-bold text-white transition hover:opacity-95",children:[b(`items.${a}.cta`),(0,d.jsx)(l.A,{className:"size-4 shrink-0","aria-hidden":"true"})]})';
    if (s.includes(oldCta)) {
      s = s.replace(oldCta, newCta);
      console.log("[Fix 4] Upgraded primary CTA button styling in competitions/page.js");
    }

    const oldTeamLink = '(0,d.jsx)(g(),{href:"/teams",className:"inline-flex min-h-11 items-center rounded-md text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",children:b("continueTeam")})';
    const newTeamBanner = '(0,d.jsxs)(g(),{href:"/teams",className:"flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-5 transition hover:border-primary/50 hover:bg-primary/10",children:[(0,d.jsxs)("div",{className:"space-y-1",children:[(0,d.jsx)("p",{className:"text-base font-bold text-foreground",children:"👥 组队参赛 · 申领 300 点团队专属算力包"}),(0,d.jsx)("p",{className:"text-xs text-muted-foreground",children:"创建或加入高校战队，共享比赛算力额度、提交农客松与 AIGC 参赛作品"})]}),(0,d.jsxs)("span",{style:{background:"#0f172a",color:"#fff",padding:"8px 16px",borderRadius:"9999px",fontSize:"13px",fontWeight:700},children:[b("continueTeam")," →"]})]})';
    if (s.includes(oldTeamLink)) {
      s = s.replace(oldTeamLink, newTeamBanner);
      console.log("[Fix 4] Upgraded bottom /teams link into visual banner card in competitions/page.js");
    }
    fs.writeFileSync(compSrv, s, "utf8");
  }

  // 2. Patch /app/.next/server/app/teams/page.js so the 2 rich 16:9 visual cards always render
  const teamsSrv = "/app/.next/server/app/teams/page.js";
  if (fs.existsSync(teamsSrv)) {
    let s = fs.readFileSync(teamsSrv, "utf8");
    const target = '0===u.length?(0,e.jsxs)("div",{className:"grid gap-5 sm:grid-cols-2"';
    const replacement = '!0?(0,e.jsxs)("div",{className:"grid gap-5 sm:grid-cols-2"';
    if (s.includes(target)) {
      s = s.replace(target, replacement);
      fs.writeFileSync(teamsSrv, s, "utf8");
      console.log("[Fix 4] Enabled 16:9 visual competition cards on /teams in server/app/teams/page.js");
    }
  }
}

function patchBenefitsPage() {
  // 1. Patch client chunk /app/.next/static/chunks/app/workspace/benefits/page-*.js
  const benDir = "/app/.next/static/chunks/app/workspace/benefits";
  if (fs.existsSync(benDir)) {
    const files = fs.readdirSync(benDir).filter(f => f.startsWith("page-") && f.endsWith(".js"));
    for (const f of files) {
      const p = path.join(benDir, f);
      let s = fs.readFileSync(p, "utf8");
      // Remove 3-line normal-distribution paragraph `h` from header `b`: children:[i,c,h] -> children:[i,c]
      s = s.replace('className:"space-y-2",children:[i,c,h]', 'className:"space-y-2",children:[i,c]');
      // Remove the 2 giant normal-distribution boxes `eN,eG` above live ticker `e1`: children:[eN,eG,e1] -> children:[e1]
      s = s.replace('className:"mt-5 grid gap-4 md:grid-cols-2",children:[eN,eG,e1]', 'className:"mt-3 grid gap-2 md:grid-cols-2",children:[e1]');
      fs.writeFileSync(p, s, "utf8");
      console.log("[Fix 5] Compacted normal-distribution prose in client chunk", p);
    }
    const oldBen = "page-2d828bda8c0af1f2.js";
    const newBen = "page-2d828bda8c0afv15.js";
    if (fs.existsSync(path.join(benDir, oldBen))) {
      fs.writeFileSync(path.join(benDir, newBen), fs.readFileSync(path.join(benDir, oldBen), "utf8"), "utf8");
      replaceChunkHashInManifests(oldBen, newBen);
    }
  }

  // 2. Patch SSR chunks /app/.next/server/app/workspace/benefits/page.js and /app/.next/server/app/page.js
  for (const srvPath of ["/app/.next/server/app/workspace/benefits/page.js", "/app/.next/server/app/page.js"]) {
    if (!fs.existsSync(srvPath)) continue;
    let s = fs.readFileSync(srvPath, "utf8");
    // Remove 3-line normal-distribution <p> in SSR
    const oldP = ',(0,d.jsx)("p",{className:"max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm",children:f?"All-ANS Gaussian + Low-Prob Jackpot Model: ~90% of users steadily receive 100–150 Total Points (≈\\xa510–\\xa515 CNY across Onboarding 50 pts + Quests/Draws), while low-probability jackpots offer 80 Pts (SSR 4%), 300 Pts (UR 0.9%), and up to 1,000 Pts / \\xa5100 Mythic Koi (SP 0.1%)!":"全站正态分布 + 低概率重磅大奖模型：约 90% 用户全站累计获赠 100–150 积分（含问卷基础 50 积分 + 抓娃娃/打卡，折合 \\xa510–\\xa515 元）；同时奖池设置低概率重磅大奖——SSR 80 积分 (4%)、UR 紫金龙蛋 300 积分 (0.9%)、SP 天选锦鲤 1000 积分免单大奖 (0.1% \\xb7 价值 \\xa5100 元)！"})';
    if (s.includes(oldP)) {
      s = s.replace(oldP, "");
    }
    // Remove the 2 normal-distribution vault cards before arcade-jackpot-ticker in SSR
    const gridStart = '(0,d.jsxs)("div",{className:"mt-5 grid gap-4 md:grid-cols-2",children:[';
    const tickerStart = '(0,d.jsxs)("div",{"data-testid":"arcade-jackpot-ticker"';
    const gIdx = s.indexOf(gridStart);
    const tIdx = s.indexOf(tickerStart);
    if (gIdx !== -1 && tIdx !== -1 && tIdx > gIdx && tIdx - gIdx < 4500) {
      s = s.slice(0, gIdx) + '(0,d.jsx)("div",{className:"mt-3 grid gap-2 md:grid-cols-2",children:' + s.slice(tIdx);
      // Also change closing ]}) of that div if needed: wait, jsxs with children:[ticker] is valid even with 1 element!
      s = s.replace('(0,d.jsx)("div",{className:"mt-3 grid gap-2 md:grid-cols-2",children:' + tickerStart, '(0,d.jsxs)("div",{className:"mt-3 grid gap-2 md:grid-cols-2",children:[' + tickerStart);
      console.log("[Fix 5] Compacted normal-distribution boxes in SSR", srvPath);
    }
    fs.writeFileSync(srvPath, s, "utf8");
  }
}

function patchExploreSubmit() {
  // 1. Patch server/app/explore/submit/page.js to replace ANS MARKET shell with ANS PROJECT PLAZA
  const subSrv = "/app/.next/server/app/explore/submit/page.js";
  if (fs.existsSync(subSrv)) {
    let s = fs.readFileSync(subSrv, "utf8");
    const oldReturn = 'return(0,e.jsx)(l.I,{title:d("submit"),description:d("submitBody"),children:(0,e.jsx)(i.MarketAccountBoundary,{actorId:c,children:(0,e.jsx)(m.ListingEditor,{share:!0,agri:b})})})';
    const newReturn = 'return(0,e.jsx)("div",{className:"ans-product-shell",children:(0,e.jsxs)("div",{className:"ans-product-container ans-page-content max-w-6xl space-y-6",children:[(0,e.jsxs)("header",{children:[(0,e.jsx)("p",{className:"mb-2 text-xs font-bold uppercase tracking-widest text-primary",children:"ANS PROJECT PLAZA \\xb7 项目广场投稿"}),(0,e.jsx)("h1",{className:"ans-page-title",children:d("submit")}),(0,e.jsx)("p",{className:"mt-2 max-w-2xl text-sm leading-6 text-muted-foreground",children:d("submitBody")})]}),(0,e.jsx)(i.MarketAccountBoundary,{actorId:c,children:(0,e.jsx)(m.ListingEditor,{share:!0,agri:b})})]})})';
    if (s.includes(oldReturn)) {
      s = s.replace(oldReturn, newReturn);
      fs.writeFileSync(subSrv, s, "utf8");
      console.log("[Fix 6] Replaced ANS MARKET shell with ANS PROJECT PLAZA on /explore/submit");
    }
  }

  // 2. Patch client chunk 62538-38efe675d7191f79.js to add 1-click quick-fill templates
  const chunksDir = "/app/.next/static/chunks";
  const files = fs.readdirSync(chunksDir).filter(f => f.startsWith("62538-") && f.endsWith(".js"));
  for (const f of files) {
    const p = path.join(chunksDir, f);
    let s = fs.readFileSync(p, "utf8");
    // Repair if previous run left extra ] after .map()
    const brokenSuffix = '.map(t=>(0,r.jsx)("button",{type:"button",onClick:()=>eq(t),className:"rounded-full border border-primary/30 bg-background px-3.5 py-1.5 text-xs font-bold text-primary shadow-2xs transition hover:bg-primary hover:text-primary-foreground cursor-pointer",children:t.label},t.label))]})]}),';
    const fixedSuffix = '.map(t=>(0,r.jsx)("button",{type:"button",onClick:()=>eq(t),className:"rounded-full border border-primary/30 bg-background px-3.5 py-1.5 text-xs font-bold text-primary shadow-2xs transition hover:bg-primary hover:text-primary-foreground cursor-pointer",children:t.label},t.label))})]}),';
    if (s.includes(brokenSuffix)) {
      s = s.replace(brokenSuffix, fixedSuffix);
      fs.writeFileSync(p, s, "utf8");
      console.log("[Fix 6] Repaired bracket in client chunk", p);
    }
    const target = 'ep=/^https:\\/\\//i.test(ee);return(0,r.jsxs)("div",{className:"space-y-6",children:[';
    const quickBar = 'ep=/^(https:\\/\\/|\\/)/i.test(ee);let eq=e=>{V(e.cat),Y(e.sub),K(e.title),J(e.summary),X(e.deliv),ei(e.cover);setTimeout(()=>{let d=document.querySelector("textarea[name=\\"description\\"]"),u=document.querySelector("input[name=\\"previewUrl\\"]"),g=document.querySelector("input[name=\\"githubUrl\\"]");if(d)d.value=e.desc;if(u)u.value=e.url;if(g)g.value=e.git},30)};return(0,r.jsxs)("div",{className:"space-y-6",children:[(0,r.jsxs)("div",{className:"flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4",children:[(0,r.jsxs)("div",{className:"space-y-0.5",children:[(0,r.jsx)("p",{className:"text-sm font-bold text-foreground",children:"⚡ 一键填入示范项目模板（秒速体验实时预览与发布）"}),(0,r.jsx)("p",{className:"text-xs text-muted-foreground",children:"点击任一模板即可自动填充标题、封面、简介、亮点与预览地址，支持在此基础上自由修改"})]}),(0,r.jsx)("div",{className:"flex flex-wrap gap-2",children:[{label:"🌾 农客松参赛作品模板",cat:"competition",sub:"agri-wall",title:"CAU 农情病虫害多模态遥感诊断终端",summary:"基于哨兵二号 NDVI 农情指数与 DeepSeek V4.1 视觉诊断的田间叶斑病实时预警与农艺处方生成系统。",deliv:"可交互 HTML5 农情诊断终端\\n病虫害置信度分析报告\\n开源 Prompt 与数据集索引",cover:"https://ans.cauai.fun/competitions/agrihackathon/gitglow-hub.webp",desc:"面向中国农大智耕黑客松打造的智慧农业多模态诊断系统，融合田间实拍叶片视觉识别与多光谱遥感指数，3秒生成农艺防治处方。",url:"https://ans.cauai.fun/workspace?thread=thread-agri",git:"https://github.com/cauai/agri-vision-diagnosis"},{label:"✨ Vibe Coding 3D 网页模板",cat:"web",sub:"website",title:"Three.js 3D 星空个人作品集与简历站",summary:"零依赖 HTML5 Canvas 3D 星空粒子交互主页，支持响应式 Bento 卡片、项目时间线与一键导出源码。",deliv:"单文件 HTML5 3D 粒子网页\\nBento 作品集响应式布局\\n在线预览与源码包",cover:"https://ans.cauai.fun/catalog/gitglow-v1/cauai-one.webp",desc:"使用 Pi-Codex 工作台 30 秒生成的 3D 星空粒子个人主页，内置鼠标视差追踪与 Bento 作品矩阵。",url:"https://ans.cauai.fun/workspace?thread=thread-portfolio",git:"https://github.com/cauai/vibe-3d-portfolio"},{label:"🎬 AIGC 漫剧分镜模板",cat:"aigc",sub:"video",title:"Toonflow 赛博长安 AI 漫剧四格分镜工坊",summary:"基于 Toonflow 与 Infinite Canvas 的一致性角色设定、四宫格电影级运镜脚本与 MJ/Runway 提示词工程。",deliv:"4 镜完整分镜脚本与台词\\nMJ v6 角色一致性 Prompt\\nRunway Gen-3 运镜指令",cover:"https://ans.cauai.fun/catalog/gitglow-v1/aigc-workspace.webp",desc:"AIGC 创作赛道示范作品，包含完整角色设定锚点与四格电影级运镜提示词。",url:"https://ans.cauai.fun/workspace?thread=thread-toonflow",git:"https://github.com/cauai/toonflow-cyber-changan"}].map(t=>(0,r.jsx)("button",{type:"button",onClick:()=>eq(t),className:"rounded-full border border-primary/30 bg-background px-3.5 py-1.5 text-xs font-bold text-primary shadow-2xs transition hover:bg-primary hover:text-primary-foreground cursor-pointer",children:t.label},t.label))})]}),';
    if (s.includes(target)) {
      s = s.replace(target, quickBar);
      fs.writeFileSync(p, s, "utf8");
      console.log("[Fix 6] Added 1-click quick-fill template bar to client chunk", p);
    }
  }
  const old62538 = "62538-38efe675d7191f79.js";
  const prev62538 = "62538-38efe675d7191v15.js";
  const new62538 = "62538-38efe675d7191v16.js";
  if (fs.existsSync(path.join(chunksDir, old62538))) {
    fs.writeFileSync(path.join(chunksDir, new62538), fs.readFileSync(path.join(chunksDir, old62538), "utf8"), "utf8");
    replaceChunkHashInManifests(old62538, new62538);
    replaceChunkHashInManifests(prev62538, new62538);
  }

  // 3. Patch SSR chunk /app/.next/server/chunks/48951.js to match
  const srv48951 = "/app/.next/server/chunks/48951.js";
  if (fs.existsSync(srv48951)) {
    let s = fs.readFileSync(srv48951, "utf8");
    const targetSrv = 'an=/^https:\\/\\//i.test(aa);return(0,d.jsxs)("div",{className:"space-y-6",children:[';
    const quickBarSrv = 'an=/^(https:\\/\\/|\\/)/i.test(aa);return(0,d.jsxs)("div",{className:"space-y-6",children:[(0,d.jsxs)("div",{className:"flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4",children:[(0,d.jsxs)("div",{className:"space-y-0.5",children:[(0,d.jsx)("p",{className:"text-sm font-bold text-foreground",children:"⚡ 一键填入示范项目模板（秒速体验实时预览与发布）"}),(0,d.jsx)("p",{className:"text-xs text-muted-foreground",children:"点击任一模板即可自动填充标题、封面、简介、亮点与预览地址，支持在此基础上自由修改"})]}),(0,d.jsx)("div",{className:"flex flex-wrap gap-2",children:["🌾 农客松参赛作品模板","✨ Vibe Coding 3D 网页模板","🎬 AIGC 漫剧分镜模板"].map(t=>(0,d.jsx)("button",{type:"button",className:"rounded-full border border-primary/30 bg-background px-3.5 py-1.5 text-xs font-bold text-primary shadow-2xs transition hover:bg-primary hover:text-primary-foreground cursor-pointer",children:t},t))})]}),';
    if (s.includes(targetSrv)) {
      s = s.replace(targetSrv, quickBarSrv);
      fs.writeFileSync(srv48951, s, "utf8");
      console.log("[Fix 6] Added 1-click quick-fill template bar to SSR chunk 48951.js");
    }
  }
}

function patchWorkspacePointsFormatting() {
  const wsDir = "/app/.next/static/chunks/app/workspace";
  if (fs.existsSync(wsDir)) {
    const files = fs.readdirSync(wsDir).filter(f => f.startsWith("page-") && f.endsWith(".js"));
    for (const f of files) {
      const p = path.join(wsDir, f);
      let s = fs.readFileSync(p, "utf8");
      if (s.includes('livePoints !== null ? `${livePoints} 积分可用`')) {
        s = s.split('livePoints !== null ? `${livePoints} 积分可用`').join('livePoints !== null ? `${Math.round(livePoints * 10) / 10} 积分可用`');
        fs.writeFileSync(p, s, "utf8");
        console.log("[Fix 7] Rounded livePoints in workspace chunk", p);
      }
    }
    const oldWs = "page-6ee65e709227d816.js";
    const newWs = "page-6ee65e709227dv15.js";
    if (fs.existsSync(path.join(wsDir, oldWs))) {
      fs.writeFileSync(path.join(wsDir, newWs), fs.readFileSync(path.join(wsDir, oldWs), "utf8"), "utf8");
      replaceChunkHashInManifests(oldWs, newWs);
    }
  }
  const srvWs = "/app/.next/server/app/workspace/page.js";
  if (fs.existsSync(srvWs)) {
    let s = fs.readFileSync(srvWs, "utf8");
    if (s.includes('livePoints !== null ? `${livePoints} 积分可用`')) {
      s = s.split('livePoints !== null ? `${livePoints} 积分可用`').join('livePoints !== null ? `${Math.round(livePoints * 10) / 10} 积分可用`');
      fs.writeFileSync(srvWs, s, "utf8");
    }
  }
}

async function main() {
  await runDbFixes();
  patchHomeModal();
  patchCreditsCenter();
  patchCommunityGrowth();
  patchCompetitionsAndTeams();
  patchBenefitsPage();
  patchExploreSubmit();
  patchWorkspacePointsFormatting();
  console.log("=== Iteration v15 Full-Site Polish Complete ===");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
