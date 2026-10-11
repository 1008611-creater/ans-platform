import { updateVibeProvenance } from "./update-vibehub-provenance.mjs";
﻿import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { parse } = require("@babel/parser");
// Default to the pinned public chunks used by this content snapshot. Call with
// local downloaded files or new public chunk URLs when the upstream build changes:
// node scripts/extract-vibehub-public-data.mjs <patterns-file-or-url> <updates-file-or-url>
const defaults = [
  "https://vibe-hub.org/_next/static/chunks/8977.11597d0f49a72e89.js",
  "https://vibe-hub.org/_next/static/chunks/5278.575f0fa9aa3380dd.js",
];
async function readSource(location) {
  if (!location.startsWith("https://")) return fs.readFileSync(location, "utf8");
  const url = new URL(location);
  if (url.hostname !== "vibe-hub.org") throw new Error("Only the official VibeHub source is supported");
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Public chunk unavailable (${response.status}). Supply the current public chunk URL or a saved file as a CLI argument.`);
  return response.text();
}
const [source, changesSource] = await Promise.all(defaults.map((location, index) => readSource(process.argv[index + 2] || location)));
const ast = parse(source);
const vars = new Map();
function value(node) {
  if (!node) return null;
  if (["StringLiteral", "NumericLiteral", "BooleanLiteral"].includes(node.type)) return node.value;
  if (node.type === "NullLiteral") return null;
  if (node.type === "ArrayExpression") return node.elements.map(value);
  if (node.type === "ObjectExpression") return Object.fromEntries(node.properties.filter(p=>p.type==='ObjectProperty').map(p => [p.key.name || p.key.value, value(p.value)]));
  if (node.type === "TemplateLiteral" && !node.expressions.length) return node.quasis.map(p=>p.value.cooked).join('');
  return null;
}
function walk(node) {
  if(!node || typeof node !== 'object')return;
  if(node.type === 'VariableDeclarator' && ['ArrayExpression','ObjectExpression'].includes(node.init?.type))vars.set(node.id.name,value(node.init));
  for(const child of Object.values(node)) if(Array.isArray(child))child.forEach(walk);else if(child && typeof child==='object')walk(child);
}
walk(ast);
const entries = [...vars.values()].find(v => Array.isArray(v) && v.some(item => item?.id === 'abstract-boosters'));
const english = [...vars.values()].find(v => v && typeof v === 'object' && v['abstract-boosters']?.avoid);
const labels = [...vars.values()].find(v => v?.en?.boundaryTitle);
const categories = [...vars.values()].find(v => v?.en?.ui?.description);
if(!entries || !english)throw new Error('Expected public pattern data not found');
fs.writeFileSync('src/data/vibehub/anti-ai-details.json',JSON.stringify({entries,english,labels,categories,sourceUrl:'https://vibe-hub.org/en/anti-ai-flavor'}));
const changes = parse(changesSource);
let updates;
function findJson(node) {
 if(!node || typeof node !=='object')return;
 if(node.type==='CallExpression' && node.callee?.type==='MemberExpression' && node.callee.object?.name==='JSON' && node.callee.property?.name==='parse' && node.arguments[0]?.type==='StringLiteral') {
  const payload=JSON.parse(node.arguments[0].value);if(payload.days && payload.totalTermsTracked)updates=payload;
 }
 for(const child of Object.values(node))if(Array.isArray(child))child.forEach(findJson);else if(child && typeof child==='object')findJson(child);
}
findJson(changes);if(!updates)throw new Error('Expected public changelog data not found');
fs.writeFileSync('src/data/vibehub/updates.json',JSON.stringify(updates));
console.log('Extracted',entries.length,'public AI slop entries and',updates.days.length,'update days without executing upstream scripts.');


updateVibeProvenance();
