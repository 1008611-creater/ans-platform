#!/usr/bin/env node
/**
 * Iteration v12: Full-Site Zero-Middleman & 1-Click Direct Entry Patch
 */
const fs = require("fs");

function replaceExact(filePath, target, replacement, label) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARN] File not found: ${filePath}`);
    return false;
  }
  const src = fs.readFileSync(filePath, "utf8");
  if (!src.includes(target)) {
    if (src.includes(replacement)) {
      console.log(`[SKIP] Already patched: ${label} in ${filePath}`);
      return true;
    }
    throw new Error(`[FAIL] Target not found for ${label} in ${filePath}`);
  }
  const out = src.replace(target, replacement);
  fs.writeFileSync(filePath, out, "utf8");
  console.log(`[OK] Patched ${label} in ${filePath}`);
  return true;
}

// 1. Patch /app/.next/server/app/page.js (ProjectCoverflow direct href + sceneStrip broken image & /workspace/benefits)
replaceExact(
  "/app/.next/server/app/page.js",
  `projects:(G.length?G:[p]).map(a=>({slug:a.slug,href:a.memberHref??\`/explore/\${a.slug}\`,title:(0,x.Xs)(a,m,"title",n),summary:(0,x.Xs)(a,m,"summary",n),category:m(\`categories.\${a.category}\`),coverUrl:a.coverUrl}))`,
  `projects:(G.length?G:[p]).map(a=>({slug:a.slug,href:a.memberHref??("resume-website"===a.workflowId?"/market/resume-website":"easel"===a.workflowId?"/competitions/aigc":"hypit"===a.workflowId?"/workflows/hypit":"toonflow"===a.workflowId?"https://toonflow.cauai.fun":a.workflowId?\`/projects?goal=\${a.goal}&workflow=\${a.workflowId}#new-project\`:a.sourceUrl??\`/explore/\${a.slug}\`),title:(0,x.Xs)(a,m,"title",n),summary:(0,x.Xs)(a,m,"summary",n),category:m(\`categories.\${a.category}\`),coverUrl:a.coverUrl}))`,
  "HomePage ProjectCoverflow direct href"
);

replaceExact(
  "/app/.next/server/app/page.js",
  `[{href:"/competitions/agrihackathon",img:"/catalog/agrihackathon-v1/gitglow-hub.webp",tag:L?"Hackathon":"赛事主舞台",label:L?"AgriHackathon \\xb7 Compute & Datasets":"智耕黑客松 \\xb7 团队算力与农情挑战"},{href:"/benefits",img:"/catalog/gitglow-v1/ans-3d-showcase.svg",tag:L?"3D Arcade & Pet":"3D 互动工坊",label:L?"3D Claw Machine & Dino Wardrobe":"3D 抓娃娃机 \\xb7 小龙换装投喂圣殿"}`,
  `[{href:"/competitions/agrihackathon",img:"/competitions/agrihackathon/gitglow-hub.webp",tag:L?"Hackathon":"赛事主舞台",label:L?"AgriHackathon \\xb7 Compute & Datasets":"智耕黑客松 \\xb7 团队算力与农情挑战"},{href:"/workspace/benefits",img:"/catalog/gitglow-v1/ans-3d-showcase.svg",tag:L?"3D Arcade & Pet":"3D 互动工坊",label:L?"3D Claw Machine & Dino Wardrobe":"3D 抓娃娃机 \\xb7 小龙换装投喂圣殿"}`,
  "HomePage sceneStrip broken image & /workspace/benefits"
);

// Also fix broken image in /app/.next/server/app/teams/page.js
replaceExact(
  "/app/.next/server/app/teams/page.js",
  `src:"/catalog/agrihackathon-v1/gitglow-hub.webp"`,
  `src:"/competitions/agrihackathon/gitglow-hub.webp"`,
  "TeamsPage agrihackathon cover image"
);

// 2. Patch ProjectCard (35406 in /app/.next/server/chunks/35969.js) for 1-click direct launch + visible summary + secondary guide link
replaceExact(
  "/app/.next/server/chunks/35969.js",
  `async function o({project:a,compact:b=!1}){let[c,f]=await Promise.all([(0,h.A)("product"),(0,i.A)()]);if(b){let b=(0,e.Xs)(a,c,"title",f),h=\`project-\${a.slug}-info\`;return(0,d.jsx)(l.RevealDetails,{id:h,label:c("catalogBrowse.info",{title:b}),className:n().card,details:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsxs)("div",{className:n().metadata,children:[(0,d.jsx)("span",{children:c(\`categories.\${a.category}\`)}),(0,d.jsx)("span",{children:c((0,e.dQ)(a.source))})]}),a.creator&&(0,d.jsx)("p",{children:a.creator}),(0,d.jsx)("p",{children:(0,e.Xs)(a,c,"summary",f)}),(0,d.jsx)("p",{children:c(a.workflowId?"ready":a.memberHref?"realProject.member":"official"===a.source?"realProject.externalProduct":"reference")})]}),children:(0,d.jsxs)(g(),{href:\`/explore/\${a.slug}\`,prefetch:!1,className:n().link,"aria-describedby":h,children:[(0,d.jsx)(k.q,{project:a}),(0,d.jsxs)("div",{className:n().title,children:[(0,d.jsx)("h3",{children:b}),(0,d.jsx)(j.A,{"aria-hidden":"true"})]})]})})}return(0,d.jsx)("article",{className:"ans-project-card",children:(0,d.jsxs)(g(),{href:\`/explore/\${a.slug}\`,className:"ans-card-link",children:[(0,d.jsx)(k.q,{project:a}),(0,d.jsxs)("div",{className:"p-5 sm:p-6",children:[(0,d.jsxs)("div",{className:"mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground",children:[(0,d.jsx)("span",{children:c(\`categories.\${a.category}\`)}),(0,d.jsx)("span",{"aria-hidden":"true",children:"/"}),(0,d.jsx)("span",{children:c((0,e.dQ)(a.source))})]}),a.creator&&(0,d.jsx)("p",{className:"mb-2 text-xs text-muted-foreground",children:a.creator}),(0,d.jsx)("h3",{className:"text-pretty text-lg font-semibold leading-7",children:(0,e.Xs)(a,c,"title",f)}),(0,d.jsx)("p",{className:"mt-2 text-sm leading-6 text-muted-foreground",children:(0,e.Xs)(a,c,"summary",f)}),(0,d.jsxs)("div",{className:"mt-6 flex items-center justify-between gap-2",children:[(0,d.jsx)("span",{className:"ans-status",children:c(a.workflowId?"ready":a.memberHref?"realProject.member":"official"===a.source?"realProject.externalProduct":"reference")}),(0,d.jsx)(j.A,{className:"h-5 w-5 shrink-0","aria-hidden":"true"})]})]})]})})}`,
  `async function o({project:a,compact:b=!1}){let[c,f]=await Promise.all([(0,h.A)("product"),(0,i.A)()]);let p=a.memberHref??("resume-website"===a.workflowId?"/market/resume-website":"easel"===a.workflowId?"/competitions/aigc":"hypit"===a.workflowId?"/workflows/hypit":"toonflow"===a.workflowId?"https://toonflow.cauai.fun":a.workflowId?\`/projects?goal=\${a.goal}&workflow=\${a.workflowId}#new-project\`:a.sourceUrl??\`/explore/\${a.slug}\`),q=/^https?:\\/\\//.test(p),r=f.startsWith("en"),s=(0,e.Xs)(a,c,"title",f),t=(0,e.Xs)(a,c,"summary",f),u=a.memberHref||a.workflowId?r?"⚡ Launch Now":"⚡ 立即进入":"official"===a.source?r?"🚀 Open App ↗":"🚀 直达体验 ↗":r?"📦 Open Project ↗":"📦 直达项目 ↗",v=(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(k.q,{project:a}),(0,d.jsxs)("div",{className:"p-3.5 sm:p-4",children:[(0,d.jsxs)("div",{className:"mb-1.5 flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground",children:[(0,d.jsx)("span",{children:c(\`categories.\${a.category}\`)}),(0,d.jsx)("span",{className:"rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary",children:u})]}),(0,d.jsxs)("div",{className:n().title,children:[(0,d.jsx)("h3",{children:s}),(0,d.jsx)(j.A,{"aria-hidden":"true"})]}),(0,d.jsx)("p",{className:"mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground",children:t})]})]});return(0,d.jsxs)("article",{className:b?\`\${n().card} flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card transition hover:border-primary/50\`:"ans-project-card flex flex-col justify-between",children:[q?(0,d.jsx)("a",{href:p,target:"_blank",rel:"noopener noreferrer",className:b?n().link:"ans-card-link",children:v}):(0,d.jsx)(g(),{href:p,prefetch:!1,className:b?n().link:"ans-card-link",children:v}),p!==\`/explore/\${a.slug}\`&&(0,d.jsxs)("div",{className:"flex items-center justify-between border-t border-border/50 bg-muted/20 px-3.5 py-2 text-[11px]",children:[q?(0,d.jsx)("a",{href:p,target:"_blank",rel:"noopener noreferrer",className:"font-semibold text-primary hover:underline",children:u}):(0,d.jsx)(g(),{href:p,prefetch:!1,className:"font-semibold text-primary hover:underline",children:u}),(0,d.jsx)(g(),{href:\`/explore/\${a.slug}\`,prefetch:!1,className:"text-muted-foreground hover:text-foreground hover:underline",children:r?"Guide & Info →":"项目指南 →"})]})]})}`,
  "ProjectCard 1-click direct entry + visible summary + guide footer"
);

// 3. Patch /explore/[slug]/page.js (clickable 16:9 large preview + deduplicated fallback steps when !H)
replaceExact(
  "/app/.next/server/app/explore/[slug]/page.js",
  `(0,d.jsx)("div",{className:z().showcase,children:(0,d.jsx)(v.q,{project:a,large:!0})})`,
  `(0,d.jsx)("div",{className:z().showcase,children:L?M?(0,d.jsxs)("a",{href:L,target:"_blank",rel:"noopener noreferrer",className:"group relative block overflow-hidden rounded-2xl",children:[(0,d.jsx)(v.q,{project:a,large:!0}),(0,d.jsxs)("span",{className:" position-bottom-right absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-slate-950/85 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-xs transition group-hover:bg-primary",children:[N,(0,d.jsx)(j.A,{size:14,"aria-hidden":"true"})]})]}):(0,d.jsxs)(f(),{href:L,className:"group relative block overflow-hidden rounded-2xl",children:[(0,d.jsx)(v.q,{project:a,large:!0}),(0,d.jsxs)("span",{className:"absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-slate-950/85 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-xs transition group-hover:bg-primary",children:[N,(0,d.jsx)(k.A,{size:14,"aria-hidden":"true"})]})]}):(0,d.jsx)(v.q,{project:a,large:!0})})`,
  "CatalogProjectDetail clickable 16:9 large preview"
);

replaceExact(
  "/app/.next/server/app/explore/[slug]/page.js",
  `(0,d.jsxs)("section",{id:"project-path",className:z().section,children:[(0,d.jsxs)("p",{className:z().kicker,children:["02 / ",D("path")]}),(0,d.jsx)("h2",{children:D("firstResult")}),(0,d.jsx)("ol",{className:z().steps,children:Q.map((a,b)=>(0,d.jsxs)("li",{children:[(0,d.jsx)("span",{className:z().stepNumber,"aria-hidden":"true",children:String(b+1).padStart(2,"0")}),(0,d.jsxs)("div",{children:[(0,d.jsx)("h3",{children:a.title}),(0,d.jsx)("p",{children:a.body}),a.href&&(0,d.jsxs)("a",{href:a.href,target:"_blank",rel:"noopener noreferrer",className:"ans-text-link",children:[D("openStep"),(0,d.jsx)(o.A,{size:14,"aria-hidden":"true"})]})]})]},a.title))})]})`,
  `H&&(0,d.jsxs)("section",{id:"project-path",className:z().section,children:[(0,d.jsxs)("p",{className:z().kicker,children:["02 / ",D("path")]}),(0,d.jsx)("h2",{children:D("firstResult")}),(0,d.jsx)("ol",{className:z().steps,children:Q.map((a,b)=>(0,d.jsxs)("li",{children:[(0,d.jsx)("span",{className:z().stepNumber,"aria-hidden":"true",children:String(b+1).padStart(2,"0")}),(0,d.jsxs)("div",{children:[(0,d.jsx)("h3",{children:a.title}),(0,d.jsx)("p",{children:a.body}),a.href&&(0,d.jsxs)("a",{href:a.href,target:"_blank",rel:"noopener noreferrer",className:"ans-text-link",children:[D("openStep"),(0,d.jsx)(o.A,{size:14,"aria-hidden":"true"})]})]})]},a.title))})]})`,
  "CatalogProjectDetail hide duplicate fallback steps when !guide"
);

// 4. Patch /workspace CreationTools (/app/.next/server/app/workspace/page.js) + /workflows/toonflow + /workflows/easel
replaceExact(
  "/app/.next/server/app/workspace/page.js",
  `async function o(){let a=await (0,g.A)("product"),b=await (0,g.A)("product.workspace"),c=await (0,g.A)("easel"),e=[{href:"/workflows/mine",note:b("toolNotes.workflows"),label:a("myWorkflows"),icon:i.A},{href:"/workflows/toonflow",note:b("toolNotes.toonflow"),label:a("toonflow.title"),icon:j.A},{href:"/workflows/easel",note:b("toolNotes.easel"),label:c("title"),icon:k.A},{href:"/explore/submit",note:b("toolNotes.submit"),label:a("realProject.submit"),icon:k.A},{href:"/market/creator",note:b("toolNotes.uploads"),label:a("realProject.myUploads"),icon:l.A},{href:"/projects",note:b("toolNotes.projects"),label:a("myProjects"),icon:l.A},{href:"/teams",note:b("toolNotes.teams"),label:a("teamEntry"),icon:m.A},{href:"/market",note:b("toolNotes.market"),label:a("market.browse"),icon:k.A},{href:"/market/orders",note:b("toolNotes.orders"),label:a("market.orders"),icon:n.A}];return(0,d.jsxs)("section",{className:"ans-creation-tools",children:[(0,d.jsx)("h2",{className:"text-xl font-semibold",children:b("toolsQuestion")}),(0,d.jsx)("div",{className:"ans-tool-grid",children:e.map(({href:b,label:c,note:e,icon:g})=>{let i="workspace-tool-"+b.slice(1).replaceAll("/","-");return(0,d.jsx)(h.RevealDetails,{id:i,label:a("catalogBrowse.info",{title:c}),details:(0,d.jsx)("p",{children:e}),children:(0,d.jsxs)(f(),{href:b,"aria-describedby":i,"data-primary":"/projects"===b||void 0,className:"ans-tool-link h-full",style:{paddingInlineEnd:"4rem"},children:[(0,d.jsx)(g,{className:"h-5 w-5 shrink-0 text-primary","aria-hidden":"true"}),(0,d.jsx)("span",{className:"min-w-0 text-sm font-medium",children:c})]})},b)})})]})}`,
  `async function o(){let a=await (0,g.A)("product"),b=await (0,g.A)("product.workspace");await (0,g.A)("easel");let e=[{href:"/workspace/models",note:"DeepSeek / Qwen / 视觉模型零配置在线对话演练",label:"⚡ 模型广场与在线演练",icon:i.A,primary:!0},{href:"/market/resume-website",note:"交互式 3D 角色与双语个人作品集即开即改",label:"🎨 3D 个人网站工作坊",icon:k.A,primary:!0},{href:"/workflows/hypit",note:"AI 创意视频制作与脚本生成工作台",label:"🎬 Hypit 视频工作台",icon:j.A},{href:"https://toonflow.cauai.fun",note:"小说转分镜与 AI 漫剧独立创作站（直达）",label:"🎭 Toonflow 短剧工坊 ↗",icon:j.A,external:!0},{href:"/vibe-hub",note:"全栈 AI 编程教程、提示词与实战路线图",label:"📚 VibeHub 知识库",icon:l.A},{href:"/workspace/benefits",note:"免费领 100~150 积分、3D 抓娃娃抽 ¥100 锦鲤",label:"🎁 3D 抓娃娃与算力福利",icon:k.A},{href:"/market",note:b("toolNotes.market"),label:a("market.browse"),icon:k.A},{href:"/teams",note:b("toolNotes.teams"),label:a("teamEntry"),icon:m.A},{href:"/explore/submit",note:b("toolNotes.submit"),label:a("realProject.submit"),icon:l.A},{href:"/projects",note:b("toolNotes.projects"),label:a("myProjects"),icon:l.A},{href:"/market/orders",note:b("toolNotes.orders"),label:a("market.orders"),icon:n.A},{href:"/market/creator",note:b("toolNotes.uploads"),label:a("realProject.myUploads"),icon:l.A}];return(0,d.jsxs)("section",{className:"ans-creation-tools",children:[(0,d.jsx)("h2",{className:"text-xl font-semibold",children:b("toolsQuestion")}),(0,d.jsx)("div",{className:"ans-tool-grid",children:e.map(({href:a,label:b,note:c,icon:e,primary:h,external:i})=>{let j=(0,d.jsxs)("div",{className:"flex w-full items-start gap-3",children:[(0,d.jsx)(e,{className:"mt-0.5 h-5 w-5 shrink-0 text-primary","aria-hidden":"true"}),(0,d.jsxs)("div",{className:"min-w-0 flex-1",children:[(0,d.jsx)("div",{className:"text-sm font-semibold text-foreground",children:b}),(0,d.jsx)("p",{className:"mt-0.5 line-clamp-1 text-xs text-muted-foreground",children:c})]})]});return i?(0,d.jsx)("a",{href:a,target:"_blank",rel:"noopener noreferrer",className:"ans-tool-link h-full",children:j},a):(0,d.jsx)(f(),{href:a,"data-primary":h||void 0,className:"ans-tool-link h-full",children:j},a)})})]})}`,
  "Workspace CreationTools direct working tools + visible subtitles"
);

// Patch /workflows/toonflow/page.js: redirect directly to connector.url when !embed
replaceExact(
  "/app/.next/server/app/workflows/toonflow/page.js",
  `let c=p.OT.find(a=>"toonflow"===a.id);return(0,e.jsx)("div",{className:"ans-product-shell"`,
  `let c=p.OT.find(a=>"toonflow"===a.id);if(c?.url)(0,h.redirect)(c.url);return(0,e.jsx)("div",{className:"ans-product-shell"`,
  "Toonflow direct redirect when embed disabled"
);

// Patch /workflows/easel/page.js: redirect directly to /competitions/aigc when embed disabled (instead of forcing login to show a dead Pending box)
replaceExact(
  "/app/.next/server/app/workflows/easel/page.js",
  `async function t(){let a=await (0,m.j2)();a?.user?.id||(0,h.redirect)("/login?callbackUrl=/workflows/easel");let b=await (0,i.A)("easel"),c=(0,n.e)(a.user.id);`,
  `async function t(){if("1"!==process.env.ANS_EASEL_ENABLED)(0,h.redirect)("/competitions/aigc");let a=await (0,m.j2)();a?.user?.id||(0,h.redirect)("/login?callbackUrl=/workflows/easel");let b=await (0,i.A)("easel"),c=(0,n.e)(a.user.id);`,
  "Easel direct redirect to /competitions/aigc when embed disabled"
);

// 5. Patch /competitions/aigc/page.js (clickable cover & title + remove 1-sentence <details>)
replaceExact(
  "/app/.next/server/app/competitions/aigc/page.js",
  `(0,d.jsx)("div",{className:"overflow-hidden border-b bg-slate-950/90",children:(0,d.jsx)("img",{src:a.cover,alt:"",loading:"lazy",className:"aspect-[16/9] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"})}),(0,d.jsxs)(r.aR,{className:"relative gap-4",children:[(0,d.jsxs)("div",{className:"flex items-start justify-between gap-4",children:[(0,d.jsx)("div",{className:\`flex h-11 w-11 items-center justify-center rounded-2xl \${a.iconClass}\`,children:(0,d.jsx)(c,{className:"h-5 w-5","aria-hidden":"true"})}),(0,d.jsx)(p.E,{variant:"outline",className:"rounded-full bg-background/60 text-[11px]",children:e})]}),(0,d.jsxs)("div",{className:"space-y-2",children:[(0,d.jsxs)("div",{className:"flex items-center gap-2",children:[(0,d.jsx)(r.ZB,{className:"text-xl",children:a.name}),(0,d.jsx)(l.A,{className:"h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"})]}),(0,d.jsx)("p",{className:"break-all text-xs text-muted-foreground",children:a.host}),(0,d.jsx)(r.BT,{className:"text-sm font-medium text-foreground/80",children:a.role})]})]}),(0,d.jsxs)(r.Wu,{className:"relative space-y-5",children:[(0,d.jsx)("p",{className:"text-sm leading-6 text-muted-foreground",children:a.description}),(0,d.jsxs)("details",{children:[(0,d.jsx)("summary",{className:"min-h-11 cursor-pointer rounded py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",children:b("toolDetails")}),(0,d.jsxs)("p",{className:"mt-2 text-sm leading-6 text-muted-foreground",children:[a.status,". ",a.detail]})]}),(0,d.jsx)(q.$,{asChild:!0,className:"h-auto min-h-11 w-full whitespace-normal",variant:"outline",children:(0,d.jsxs)("a",{href:a.url,target:"_blank",rel:"noopener noreferrer","aria-label":b("openNamedTool",{name:a.name}),children:[b("openTool"),(0,d.jsx)(m.A,{className:"h-4 w-4 shrink-0","aria-hidden":"true"})]})})]})`,
  `(0,d.jsx)("a",{href:a.url,target:"_blank",rel:"noopener noreferrer",className:"block overflow-hidden border-b bg-slate-950/90",children:(0,d.jsx)("img",{src:a.cover,alt:"",loading:"lazy",className:"aspect-[16/9] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"})}),(0,d.jsxs)(r.aR,{className:"relative gap-3",children:[(0,d.jsxs)("div",{className:"flex items-start justify-between gap-4",children:[(0,d.jsx)("div",{className:\`flex h-10 w-10 items-center justify-center rounded-2xl \${a.iconClass}\`,children:(0,d.jsx)(c,{className:"h-5 w-5","aria-hidden":"true"})}),(0,d.jsx)(p.E,{variant:"outline",className:"rounded-full bg-background/60 text-[11px]",children:e})]}),(0,d.jsxs)("a",{href:a.url,target:"_blank",rel:"noopener noreferrer",className:"space-y-1.5 hover:underline",children:[(0,d.jsxs)("div",{className:"flex items-center gap-2",children:[(0,d.jsx)(r.ZB,{className:"text-xl",children:a.name}),(0,d.jsx)(l.A,{className:"h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"})]}),(0,d.jsx)(r.BT,{className:"text-sm font-medium text-foreground/80",children:a.role})]})]}),(0,d.jsxs)(r.Wu,{className:"relative space-y-4",children:[(0,d.jsx)("p",{className:"text-sm leading-6 text-muted-foreground",children:a.description}),(0,d.jsx)(q.$,{asChild:!0,className:"h-auto min-h-11 w-full whitespace-normal",children:(0,d.jsxs)("a",{href:a.url,target:"_blank",rel:"noopener noreferrer","aria-label":b("openNamedTool",{name:a.name}),children:[b("openTool"),(0,d.jsx)(m.A,{className:"h-4 w-4 shrink-0","aria-hidden":"true"})]})})]})`,
  "AIGC Competition clickable covers & titles + primary CTA"
);

// 6. Patch /competitions/agrihackathon/page.js (clickable visual showcase posters)
replaceExact(
  "/app/.next/server/app/competitions/agrihackathon/page.js",
  `(0,d.jsxs)("div",{className:"grid gap-4 md:grid-cols-2",children:[(0,d.jsx)("figure",{className:K,children:(0,d.jsx)(e.default,{src:"/competitions/agrihackathon/gitglow-hub.webp",alt:"",width:1440,height:900,unoptimized:!0,className:"aspect-[16/10] w-full object-cover"})}),(0,d.jsx)("figure",{className:K,children:(0,d.jsx)(e.default,{src:"/competitions/agrihackathon/gitglow-wall.webp",alt:"",width:1440,height:900,unoptimized:!0,className:"aspect-[16/10] w-full object-cover"})})]})`,
  `(0,d.jsxs)("div",{className:"grid gap-4 md:grid-cols-2",children:[(0,d.jsxs)(g(),{href:"/competitions/agrihackathon/tasks",className:\`\${K} group relative block transition hover:border-primary/60\`,children:[(0,d.jsx)(e.default,{src:"/competitions/agrihackathon/gitglow-hub.webp",alt:"",width:1440,height:900,unoptimized:!0,className:"aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-[1.02]"}),(0,d.jsx)("span",{className:"absolute bottom-3 right-3 rounded-full bg-slate-950/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xs",children:"🎯 进入赛事任务 →"})]}),(0,d.jsxs)(g(),{href:"/explore/submit?event=agrihackathon",className:\`\${K} group relative block transition hover:border-primary/60\`,children:[(0,d.jsx)(e.default,{src:"/competitions/agrihackathon/gitglow-wall.webp",alt:"",width:1440,height:900,unoptimized:!0,className:"aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-[1.02]"}),(0,d.jsx)("span",{className:"absolute bottom-3 right-3 rounded-full bg-slate-950/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xs",children:"🚀 提交参赛作品 →"})]})]})`,
  "AgriHackathon clickable visual posters"
);

// 7. Patch /market/resume-website (ResumeWebsiteMarketProduct in /app/.next/server/chunks/79717.js): collapse #market-details by default
replaceExact(
  "/app/.next/server/chunks/79717.js",
  `(0,e.jsxs)("details",{id:"market-details",className:w().section,open:!0,children:`,
  `(0,e.jsxs)("details",{id:"market-details",className:w().section,children:`,
  "ResumeWebsiteMarketProduct collapse 4-step details by default"
);

console.log("[DONE] All v12 zero-middleman patches applied successfully.");
