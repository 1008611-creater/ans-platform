#!/usr/bin/env node
/**
 * Hot-patch ANS v8 on haika-1757 (ans-platform-app):
 * 1. /market/[slug] client chunk (`page-aabf303e4ee3643f.js` -> `page-aabf303e4ee36430.js`):
 *    1-click auto-chain `POST /api/market/orders` + `POST /api/market/orders/[id]/pay` so clicking
 *    "使用 ANS 积分下单" immediately pays points, auto-delivers the Markdown toolkit, and lands on DELIVERED order.
 * 2. /market/orders/[id] server (`page.js`) and client (`page-e2a522e99616b4d4.js` -> `page-e2a522e99616b4d0.js`):
 *    - Add interactive delivery toolbar (`📋 一键复制完整 Markdown`, `⬇️ 下载 .md 工具包`, `🚀 去模型工作台运行 →`).
 *    - Put `"accept"` before `"request_revision"` in `availableMarketActions` so DELIVERED orders default to "确认验收并完成订单".
 */
const fs = require("fs");
const path = require("path");

function patchSlugClientChunk() {
  const dir = "/app/.next/static/chunks/app/market/[slug]";
  const oldName = "page-aabf303e4ee3643f.js";
  const newName = "page-aabf303e4ee36430.js";
  const oldPath = path.join(dir, oldName);
  const newPath = path.join(dir, newName);
  let code = fs.readFileSync(oldPath, "utf8");

  const target = 'let e=await x("/api/market/orders","POST",P.current);f.push(`/market/orders/${e.order.id}`)';
  const replacement =
    'let e=await x("/api/market/orders","POST",P.current);try{await x(`/api/market/orders/${e.order.id}/pay`,"POST",{expectedRevision:e.order.revision??0,operationKey:crypto.randomUUID()})}catch{}f.push(`/market/orders/${e.order.id}`)';

  if (!code.includes("operationKey:crypto.randomUUID()")) {
    if (!code.includes(target)) {
      throw new Error("Could not find target in " + oldPath);
    }
    code = code.replace(target, replacement);
  }
  fs.writeFileSync(oldPath, code, "utf8");
  fs.writeFileSync(newPath, code, "utf8");
  console.log("Patched 1-click checkout + pay in", newPath);
  return { oldName, newName };
}

function buildDeliveryToolbar(jsxVar, tVar, itemVar) {
  return `(0,${jsxVar}.jsxs)("div",{className:"mb-3 flex flex-wrap items-center justify-between gap-2",children:[(0,${jsxVar}.jsxs)("p",{className:"text-xs text-muted-foreground",children:[${tVar}("deliveryVersion",{version:${itemVar}.revision})," \\xb7 ",(0,${jsxVar}.jsx)("time",{children:${itemVar}.createdAt})]}),(0,${jsxVar}.jsxs)("div",{className:"flex flex-wrap items-center gap-2",children:[(0,${jsxVar}.jsx)("button",{type:"button","data-testid":"copy-delivery-md",onClick:ev=>{try{navigator.clipboard&&navigator.clipboard.writeText(${itemVar}.markdown);ev.currentTarget.innerText="✅ 已复制完整 Markdown！"}catch{}},className:"inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500 hover:text-slate-950 dark:text-emerald-300",children:"📋 一键复制完整 Markdown"}),(0,${jsxVar}.jsx)("button",{type:"button","data-testid":"download-delivery-md",onClick:()=>{let b=new Blob([${itemVar}.markdown],{type:"text/markdown;charset=utf-8"}),u=URL.createObjectURL(b),l=document.createElement("a");l.href=u,l.download="ans-toolkit-v"+${itemVar}.revision+".md",l.click(),URL.revokeObjectURL(u)},className:"inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-sky-700 transition hover:bg-sky-500 hover:text-slate-950 dark:text-sky-300",children:"⬇️ 下载 .md 工具包"}),(0,${jsxVar}.jsx)("a",{href:"/workspace/models",className:"inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 transition hover:bg-amber-500 hover:text-slate-950 dark:text-amber-300",children:"🚀 去模型工作台运行 →"})]})]})`;
}

function patchOrderServerAndClient() {
  const oldActions = '["submit_requirements","deliver","request_revision","accept","cancel","dispute"]';
  const newActions = '["submit_requirements","deliver","accept","request_revision","cancel","dispute"]';

  // 1. Server page.js
  const serverPath = "/app/.next/server/app/market/orders/[id]/page.js";
  let ssrCode = fs.readFileSync(serverPath, "utf8");
  if (ssrCode.includes(oldActions)) {
    ssrCode = ssrCode.replaceAll(oldActions, newActions);
  }
  const oldSsrHeader =
    '(0,d.jsxs)("p",{className:"mb-3 text-xs text-muted-foreground",children:[r("deliveryVersion",{version:a.revision})," \\xb7 ",(0,d.jsx)("time",{children:a.createdAt})]})';
  if (!ssrCode.includes("copy-delivery-md")) {
    if (!ssrCode.includes(oldSsrHeader)) {
      throw new Error("Could not find oldSsrHeader in " + serverPath);
    }
    ssrCode = ssrCode.replace(oldSsrHeader, buildDeliveryToolbar("d", "r", "a"));
  }
  fs.writeFileSync(serverPath, ssrCode, "utf8");
  console.log("Patched order server bundle:", serverPath);

  // 2. Client page chunk
  const dir = "/app/.next/static/chunks/app/market/orders/[id]";
  const oldName = "page-e2a522e99616b4d4.js";
  const newName = "page-e2a522e99616b4d0.js";
  const oldPath = path.join(dir, oldName);
  const newPath = path.join(dir, newName);
  let clientCode = fs.readFileSync(oldPath, "utf8");
  if (clientCode.includes(oldActions)) {
    clientCode = clientCode.replaceAll(oldActions, newActions);
  }
  const oldClientHeader =
    '(0,s.jsxs)("p",{className:"mb-3 text-xs text-muted-foreground",children:[a("deliveryVersion",{version:e.revision})," \\xb7 ",(0,s.jsx)("time",{children:e.createdAt})]})';
  if (!clientCode.includes("copy-delivery-md")) {
    if (!clientCode.includes(oldClientHeader)) {
      throw new Error("Could not find oldClientHeader in " + oldPath);
    }
    clientCode = clientCode.replace(oldClientHeader, buildDeliveryToolbar("s", "a", "e"));
  }
  fs.writeFileSync(oldPath, clientCode, "utf8");
  fs.writeFileSync(newPath, clientCode, "utf8");
  console.log("Patched order client chunk:", newPath);
  return { oldName, newName };
}

function rotateChunkReferences(rotations) {
  function walk(dir) {
    let results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(walk(full));
      } else if (/\.(js|json|html|rsc|meta)$/.test(entry.name)) {
        results.push(full);
      }
    }
    return results;
  }

  let count = 0;
  for (const file of walk("/app/.next")) {
    let text = fs.readFileSync(file, "utf8");
    let modified = false;
    for (const { oldName, newName } of rotations) {
      if (text.includes(oldName)) {
        text = text.replaceAll(oldName, newName);
        modified = true;
      }
    }
    if (modified) {
      fs.writeFileSync(file, text, "utf8");
      count++;
    }
  }
  console.log("Updated chunk references in", count, "files.");
}

function main() {
  const r1 = patchSlugClientChunk();
  const r2 = patchOrderServerAndClient();
  rotateChunkReferences([r1, r2]);
  console.log("All v8 market UX patches applied successfully!");
}

main();
