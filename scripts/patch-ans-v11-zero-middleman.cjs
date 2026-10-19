#!/usr/bin/env node
/**
 * ANS Iteration v11: Eliminate Redundant Middleman Pages & Make Full Cards Clickable
 * 1. /hubs:
 *    - Clicking "ANS VibeHub" goes directly to /vibe-hub (no intermediate /hubs/vibehub page).
 *    - Clicking "CAUHub" goes directly to /competitions/agrihackathon (no empty /hubs/cauhub page).
 *    - Whole card (cover image + title + bottom action bar) is clickable.
 *    - Replaces meaningless "可运行 0 / 项目 0 / 入口 1" counters with clear highlight + direct CTA.
 * 2. /hubs/[slug]:
 *    - Direct visits to /hubs/vibehub redirect("/vibe-hub").
 *    - Direct visits to /hubs/cauhub redirect("/competitions/agrihackathon").
 *    - On /hubs/aigc and /hubs/full-stack: reorder Resources & Projects to the top, add 16:9 covers
 *      to resource cards, make full cards clickable, and hide empty "暂无官方工作流" / "暂无成员工作流" boxes.
 * 3. /competitions:
 *    - Wrap cover image and event title in <Link href={href}> and upgrade primary CTA to a button.
 * 4. /workflows/hypit:
 *    - Move <HypitWorkspace /> above the static 3-step preparation block.
 */
const fs = require("fs");

function verifySyntax(filePath, code) {
  try {
    new Function(code);
  } catch (err) {
    throw new Error(`Syntax validation failed for ${filePath}: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// 1. Patch /app/.next/server/app/hubs/page.js
// ---------------------------------------------------------------------------
function patchHubsPage() {
  const file = "/app/.next/server/app/hubs/page.js";
  let code = fs.readFileSync(file, "utf8");

  const startMarker = "async function u({hubs:a,published:b,publishedRecipeIds:c,memberCounts:e}){";
  const endMarker = "var v=c(45890),w=c(85939),x=c(59699);";
  const startIdx = code.indexOf(startMarker);
  const endIdx = code.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error(`Could not locate HubDirectory function in ${file}`);
  }

  const replacement = `async function u({hubs:a,published:b,publishedRecipeIds:c,memberCounts:e}){let f=await (0,i.A)("hubs"),v={"cauhub":"/competitions/agrihackathon/gitglow-hub.webp","vibehub":"/catalog/gitglow-v1/cauai-one.webp","aigc":"/catalog/gitglow-v1/aigc-workspace.webp","full-stack":"/catalog/gitglow-v1/ans-3d-showcase.svg"},directHref={vibehub:"/vibe-hub",cauhub:"/competitions/agrihackathon"};return(0,d.jsx)("div",{className:m().directory,children:a.map(a=>{let c=n[a.slug],h=directHref[a.slug]||\`/hubs/\${a.slug}\`,projCount=b?(0,j.cU)(a,b).length:0,ctaText="vibehub"===a.slug?"直达 VibeHub":"cauhub"===a.slug?"直达赛事会场":"进入专题工坊",highlight="vibehub"===a.slug?"📚 交互式 AI 编程词条、课程与实战练习":"cauhub"===a.slug?"🏆 ¥3,300 现金奖池 · 农大赛事与创客主会场":"aigc"===a.slug?\`🎬 \${a.resources.length} 款在线 AI 创作工作台 + \${projCount} 个精选项目\`:\`💻 \${projCount} 个全栈开源项目 + 3D 简历工作流\`;return(0,d.jsxs)("article",{className:m().hub,children:[(0,d.jsx)(g(),{href:h,className:"block overflow-hidden rounded-xl",tabIndex:-1,"aria-hidden":"true",children:(0,d.jsx)("img",{className:\`\${m().cover} transition-transform duration-300 hover:scale-[1.02]\`,src:v[a.slug]||"/catalog/gitglow-v1/cauai-one.webp",alt:"",loading:"lazy"})}),(0,d.jsxs)("div",{className:m().identity,children:[(0,d.jsx)(c,{"aria-hidden":"true"}),(0,d.jsx)("span",{children:f(\`types.\${a.organization.type}\`)})]}),(0,d.jsx)("h2",{children:(0,d.jsxs)(g(),{href:h,children:[f(\`items.\${a.slug}.name\`),(0,d.jsx)(h_arrow,{className:"size-5","aria-hidden":"true"})]})}),(0,d.jsx)("p",{children:f(\`items.\${a.slug}.description\`)}),(0,d.jsxs)(g(),{href:h,className:"mt-auto flex items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-2.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10",children:[(0,d.jsx)("span",{className:"truncate text-muted-foreground",children:highlight}),(0,d.jsxs)("span",{className:"inline-flex shrink-0 items-center gap-1 font-semibold text-primary",children:[ctaText,(0,d.jsx)(h_arrow,{className:"size-3.5","aria-hidden":"true"})]})]})]},a.slug)})})}`;

  // Wait: in hubs/page.js, what is the arrow icon variable? Let's check before replacing!
  const oldFn = code.slice(startIdx, endIdx);
  const arrowMatch = oldFn.match(/\(0,d\.jsx\)\(([a-zA-Z0-9_.]+),\{className:"size-5"/);
  const arrowIdent = arrowMatch ? arrowMatch[1] : "h.A";
  const finalReplacement = replacement.replace(/h_arrow/g, arrowIdent);

  const nextCode = code.slice(0, startIdx) + finalReplacement + code.slice(endIdx);
  verifySyntax(file, nextCode);
  fs.writeFileSync(file, nextCode, "utf8");
  console.log("[v11] Patched", file, "(arrowIdent:", arrowIdent + ")");
}

// ---------------------------------------------------------------------------
// 2. Patch /app/.next/server/app/hubs/[slug]/page.js
// ---------------------------------------------------------------------------
function patchHubSlugPage() {
  const file = "/app/.next/server/app/hubs/[slug]/page.js";
  let code = fs.readFileSync(file, "utf8");

  const startMarker = "async function I({params:a,searchParams:b}){";
  const endMarker = "},44708:a=>{\"use strict\";a.exports=require(\"node:https\")}";
  const startIdx = code.indexOf(startMarker);
  const endIdx = code.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error(`Could not locate HubDetailPage function I in ${file}`);
  }

  const replacement = `async function I({params:a,searchParams:b}){let{slug:c}=await a,d=(0,w.getHub)(c);if(!d)(0,u.notFound)();if("vibehub"===d.slug)(0,u.redirect)("/vibe-hub");if("cauhub"===d.slug)(0,u.redirect)("/competitions/agrihackathon");let[e,f,h]=await Promise.all([(0,v.A)("hubs"),(0,v.A)("product"),(0,v.getLocale)()]);let i=await b,j="string"==typeof i?.cursor&&80>=i.cursor.length?i.cursor:void 0,k=async()=>{if(!d.workflowRecipeIds.includes("resume-website"))return{platform:null,workflowsUnavailable:!1,marketPath:null,marketUnavailable:!1};let a;try{a=await (0,z.G)()}catch{return{platform:null,workflowsUnavailable:!0,marketPath:null,marketUnavailable:!1}}if(!a)return{platform:a,workflowsUnavailable:!1,marketPath:null,marketUnavailable:!1};try{let b=await (0,A.I)(a.workflow,a.version,a.recipe.definitionHash);return{platform:a,workflowsUnavailable:!1,marketPath:b,marketUnavailable:!1}}catch{return{platform:a,workflowsUnavailable:!1,marketPath:null,marketUnavailable:!0}}},[l,m,{platform:p,workflowsUnavailable:I,marketPath:J,marketUnavailable:K}]=await Promise.all([(0,x.listPublishedCatalog)().catch(()=>null),(0,n.readHubMemberWorkflows)(d.slug,j).catch(()=>null),k()]),L=l?(0,w.hubProjects)(d,l):[],M=(0,w.hubWorkflowRecipes)(d,I?null:p?[p.recipe.catalogRecipeId]:[]),resCovers={"agrihackathon":"/competitions/agrihackathon/gitglow-hub.webp","vibehub-knowledge":"/catalog/gitglow-v1/cauai-one.webp","aigc-workbench":"/catalog/gitglow-v1/niannian-drama.webp","hypit":"/catalog/gitglow-v1/niannian-edit.webp"},hasOfficial=null===M||M.length>0,hasMembers=Boolean(m&&Array.isArray(m.items)&&m.items.length>0);return(0,g.jsx)("div",{className:"ans-product-shell",children:(0,g.jsxs)("div",{className:\`ans-product-container \${G().container}\`,children:[(0,g.jsxs)(q(),{href:"/hubs",className:G().back,children:[(0,g.jsx)(s.A,{className:"size-4","aria-hidden":"true"}),e("back")]}),(0,g.jsx)("header",{className:"ans-page-heading",children:(0,g.jsxs)(D.RevealDetails,{id:"hub-description",kind:"heading",label:e("guideLabel"),className:"ans-page-heading-copy pe-12",details:(0,g.jsxs)(g.Fragment,{children:[(0,g.jsx)("p",{children:e(\`items.\${d.slug}.description\`)}),d.organization.university&&(0,g.jsx)("p",{children:e("universityNote",{university:e(d.organization.university.nameKey)})})]}),children:[(0,g.jsx)("p",{className:"ans-eyebrow",children:e(\`types.\${d.organization.type}\`)}),(0,g.jsx)("h1",{className:"ans-page-title",children:e(\`items.\${d.slug}.name\`)})]})}),d.resources.length>0&&(0,g.jsxs)("section",{className:G().section,"aria-labelledby":"hub-resources",children:[(0,g.jsx)("h2",{id:"hub-resources",children:e("resourcesTitle")}),(0,g.jsx)("div",{className:G().entries,children:d.resources.map(a=>(0,g.jsxs)("article",{className:G().entry,children:[(0,g.jsx)(q(),{href:a.href,className:"block overflow-hidden rounded-xl",tabIndex:-1,"aria-hidden":"true",children:(0,g.jsx)("img",{className:\`\${G().cover} transition-transform duration-300 hover:scale-[1.02]\`,src:resCovers[a.id]||"/catalog/gitglow-v1/aigc-workspace.webp",alt:"",loading:"lazy"})}),(0,g.jsx)("span",{className:G().kind,children:e(\`kinds.\${a.kind}\`)}),(0,g.jsx)("h3",{children:(0,g.jsxs)(q(),{href:a.href,children:[e(a.titleKey),(0,g.jsx)(t.A,{className:"size-4","aria-hidden":"true"})]})}),(0,g.jsx)("p",{children:e(a.descriptionKey)}),(0,g.jsxs)(q(),{href:a.href,className:"mt-auto inline-flex items-center gap-1.5 pt-2 text-xs font-semibold text-primary hover:underline",children:["立即进入工作台",(0,g.jsx)(t.A,{className:"size-3.5","aria-hidden":"true"})]})]},a.id))})]}),(0,g.jsxs)("section",{className:G().section,"aria-labelledby":"hub-projects",children:[(0,g.jsx)(D.RevealDetails,{id:"hub-project-guide",kind:"heading",className:"pe-12",label:e("projectGuideLabel"),details:(0,g.jsx)("p",{children:e("projectsNote")}),children:(0,g.jsx)("h2",{id:"hub-projects",children:e("projectsTitle")})}),null===l?(0,g.jsx)("p",{className:G().empty,role:"status",children:e("catalogUnavailable")}):L.length?(0,g.jsx)("div",{className:G().entries,children:L.map(a=>(0,g.jsxs)("article",{className:G().entry,children:[a.coverUrl&&(0,g.jsx)(q(),{href:\`/explore/\${a.slug}\`,className:"block overflow-hidden rounded-xl",tabIndex:-1,"aria-hidden":"true",children:(0,g.jsx)(r.default,{className:\`\${G().cover} transition-transform duration-300 hover:scale-[1.02]\`,src:a.coverUrl,width:640,height:360,alt:"",sizes:"(max-width:767px) 100vw, 50vw"})}),(0,g.jsx)("span",{className:G().kind,children:e("github"===a.source||"bilibili"===a.source||"web"===a.source?"kinds.reference":"kinds.external")}),(0,g.jsx)("h3",{children:(0,g.jsxs)(q(),{href:\`/explore/\${a.slug}\`,children:[(0,y.catalogText)(a,f,"title",h),(0,g.jsx)(t.A,{className:"size-4","aria-hidden":"true"})]})}),(0,g.jsx)("p",{children:(0,y.catalogText)(a,f,"summary",h)})]},a.slug))}):(0,g.jsx)("div",{className:G().empty,children:e("noProjects")})]}),hasOfficial&&(0,g.jsxs)("section",{className:G().section,"aria-labelledby":"hub-workflows",children:[(0,g.jsx)(D.RevealDetails,{id:"hub-workflow-guide",kind:"heading",className:"pe-12",label:e("workflowGuideLabel"),details:(0,g.jsx)("p",{children:e("runnableNote")}),children:(0,g.jsx)("h2",{id:"hub-workflows",children:e("officialWorkflowsTitle")})}),null===M?(0,g.jsx)("div",{className:G().empty,role:"status",children:e("workflowsUnavailable")}):(0,g.jsx)("div",{className:G().entries,children:M.map(a=>(0,g.jsxs)("article",{className:G().entry,children:[(0,g.jsx)("img",{className:G().cover,src:"/catalog/gitglow-v1/magic-resume.webp",alt:"",loading:"lazy"}),(0,g.jsx)("span",{className:G().kind,children:e("kinds.runnable")}),(0,g.jsx)("h3",{children:e(\`recipes.\${a}.title\`)}),(0,g.jsx)("p",{children:e(\`recipes.\${a}.description\`)}),(0,g.jsx)("p",{children:e((0,B.unifiedModelBilling)()?"recipeMeteredCost":"recipeCost",{points:C.RESUME_WEBSITE_COST_POINTS})}),K&&(0,g.jsx)("p",{role:"status",children:e("marketUnavailable")}),J&&(0,g.jsx)(E.$,{asChild:!0,variant:"ghost",className:"mt-4",children:(0,g.jsxs)(q(),{href:J,children:[e("viewMarketCard"),(0,g.jsx)(t.A,{className:"size-4","aria-hidden":"true"})]})})]},a))})]}),hasMembers&&(0,g.jsx)(o.HubMemberWorkflowList,{page:m,slug:d.slug})]})})}`;

  const nextCode = code.slice(0, startIdx) + replacement + code.slice(endIdx);
  verifySyntax(file, nextCode);
  fs.writeFileSync(file, nextCode, "utf8");
  console.log("[v11] Patched", file);
}

// ---------------------------------------------------------------------------
// 3. Patch /app/.next/server/app/competitions/page.js
// ---------------------------------------------------------------------------
function patchCompetitionsPage() {
  const file = "/app/.next/server/app/competitions/page.js";
  let code = fs.readFileSync(file, "utf8");

  const startMarker = "async function r(){";
  const endMarker = "},44708:a=>{\"use strict\";a.exports=require(\"node:https\")}";
  const startIdx = code.indexOf(startMarker);
  const endIdx = code.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error(`Could not locate CompetitionsPage function r in ${file}`);
  }

  const replacement = `async function r(){let a=await (0,h.A)(),b=await (0,i.A)({locale:"zh"===a?"zh":"en",namespace:"competitionsHub"});return(0,d.jsx)("div",{className:"ans-product-shell",children:(0,d.jsxs)("div",{className:"ans-product-container ans-page-content space-y-8",children:[(0,d.jsx)(n.A,{title:b("title"),description:b("description")}),(0,d.jsx)("section",{"aria-label":b("chooseEvent"),className:"divide-y rounded-2xl border",children:q.map(({id:a,href:c,icon:f,cover:h})=>(0,d.jsxs)("article",{className:"grid min-w-0 gap-5 p-5 sm:p-7 lg:grid-cols-[1.1fr_0.9fr] lg:items-center",children:[(0,d.jsxs)("div",{className:"space-y-4",children:[(0,d.jsxs)("div",{className:"flex flex-wrap items-center gap-3",children:[(0,d.jsx)(f,{className:"size-5 shrink-0 text-muted-foreground","aria-hidden":"true"}),(0,d.jsx)("h2",{className:"min-w-0 text-xl font-semibold",children:(0,d.jsx)(g(),{href:c,className:"hover:text-primary hover:underline",children:b(\`items.\${a}.name\`)})}),(0,d.jsx)(m.E,{variant:"secondary",children:b(\`items.\${a}.status\`)})]}),(0,d.jsx)("p",{className:"max-w-2xl text-sm leading-6 text-muted-foreground",children:b(\`items.\${a}.description\`)}),(0,d.jsxs)("details",{className:"text-sm",children:[(0,d.jsx)("summary",{className:"min-h-11 w-fit cursor-pointer rounded py-2 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",children:b("eventOverview")}),(0,d.jsx)("ul",{className:"mt-2 list-disc space-y-1 ps-5 text-muted-foreground",children:b.raw(\`items.\${a}.highlights\`).map(a=>(0,d.jsx)("li",{children:a},a))})]}),(0,d.jsxs)("div",{className:"flex flex-wrap items-center gap-4",children:[(0,d.jsxs)(g(),{href:c,className:"inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",children:[b(\`items.\${a}.cta\`),(0,d.jsx)(l.A,{className:"size-4 shrink-0","aria-hidden":"true"})]}),"agrihackathon"===a&&(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(g(),{href:"/explore?category=competition&subcategory=agri-wall",className:"inline-flex min-h-11 items-center rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",children:b("items.agrihackathon.wallCta")}),(0,d.jsx)(g(),{href:"/explore/submit?event=agrihackathon",className:"inline-flex min-h-11 items-center rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",children:b("items.agrihackathon.submitCta")})]})]})]}),(0,d.jsx)(g(),{href:c,className:"block overflow-hidden rounded-xl border bg-slate-950/90 shadow-sm transition-transform duration-300 hover:scale-[1.01]",children:(0,d.jsx)(e.default,{src:h,alt:b(\`items.\${a}.name\`),width:1440,height:900,unoptimized:!0,className:"aspect-[16/10] w-full object-cover"})})]},a))}),(0,d.jsx)(g(),{href:"/teams",className:"inline-flex min-h-11 items-center rounded-md text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",children:b("continueTeam")})]})})}`;

  const nextCode = code.slice(0, startIdx) + replacement + code.slice(endIdx);
  verifySyntax(file, nextCode);
  fs.writeFileSync(file, nextCode, "utf8");
  console.log("[v11] Patched", file);
}

// ---------------------------------------------------------------------------
// 4. Patch /app/.next/server/app/workflows/hypit/page.js
// ---------------------------------------------------------------------------
function patchHypitPage() {
  const file = "/app/.next/server/app/workflows/hypit/page.js";
  let code = fs.readFileSync(file, "utf8");

  const prepBlock = `,(0,d.jsxs)("section",{className:r().preparation,"aria-labelledby":"hypit-preparation-title",children:[(0,d.jsx)("h2",{id:"hypit-preparation-title",className:"text-xl font-semibold",children:a("preparation.title")}),(0,d.jsx)("ol",{className:r().steps,children:["brief","assets","review"].map((b,c)=>(0,d.jsxs)("li",{children:[(0,d.jsx)("span",{className:r().stepNumber,"aria-hidden":"true",children:c+1}),(0,d.jsxs)("div",{children:[(0,d.jsx)("h3",{className:"text-sm font-semibold",children:a(\`preparation.\${b}.title\`)}),(0,d.jsx)("p",{className:"mt-2 text-sm leading-6 text-muted-foreground",children:a(\`preparation.\${b}.body\`)})]})]},b))})]}),(0,d.jsx)("div",{id:"hypit-workspace",className:"scroll-mt-24",children:(0,d.jsx)(o.HypitWorkspace,{})})`;
  const reorderedBlock = `,(0,d.jsx)("div",{id:"hypit-workspace",className:"scroll-mt-24",children:(0,d.jsx)(o.HypitWorkspace,{})}),(0,d.jsxs)("section",{className:r().preparation,"aria-labelledby":"hypit-preparation-title",children:[(0,d.jsx)("h2",{id:"hypit-preparation-title",className:"text-xl font-semibold",children:a("preparation.title")}),(0,d.jsx)("ol",{className:r().steps,children:["brief","assets","review"].map((b,c)=>(0,d.jsxs)("li",{children:[(0,d.jsx)("span",{className:r().stepNumber,"aria-hidden":"true",children:c+1}),(0,d.jsxs)("div",{children:[(0,d.jsx)("h3",{className:"text-sm font-semibold",children:a(\`preparation.\${b}.title\`)}),(0,d.jsx)("p",{className:"mt-2 text-sm leading-6 text-muted-foreground",children:a(\`preparation.\${b}.body\`)})]})]},b))})]})`;

  if (code.includes(prepBlock)) {
    code = code.replace(prepBlock, reorderedBlock);
    verifySyntax(file, code);
    fs.writeFileSync(file, code, "utf8");
    console.log("[v11] Patched", file);
  } else if (code.includes(reorderedBlock)) {
    console.log("[v11] Already patched", file);
  } else {
    throw new Error(`Could not locate preparation/workspace block in ${file}`);
  }
}

patchHubsPage();
patchHubSlugPage();
patchCompetitionsPage();
patchHypitPage();
console.log("[v11] All patches completed successfully.");
