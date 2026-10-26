#!/usr/bin/env node
/**
 * 客户端文案按需下发检查。
 *
 * 根布局只把外壳（顶栏、页脚、底部导航、Agent 入口）用到的文案交给浏览器；
 * 页面或分区布局用 <RouteMessages scope="..."> 再包一层，只下发自己子树用到的文案。
 * 各 scope 需要哪些文案路径由本脚本从 import 闭包里静态算出，写进
 * src/lib/i18n/client-messages.json，运行时按清单裁剪。
 *
 * 检查项（任一失败都会让 `npm run verify` 失败）：
 *   1. 每个 page.tsx 都被 RouteMessages 覆盖：页面自身，或它所在目录及上级目录（根目录除外）的 layout.tsx。
 *   2. RouteMessages 的 scope 必须等于所在文件路径，清单里每个 scope 都有对应文件。
 *   3. 清单与源码算出的结果一致；改了组件里的 useTranslations 却没重新生成 → 失败。
 *
 * 规则：useTranslations("ns") 的变量只以字面量 key 调用时按 key 下发；
 * key 是变量、或者 t 被传出去，则下发整个 ns。不带 ns 的 useTranslations() 必须全部用字面量 key。
 *
 * 用法：node scripts/check-client-messages.mjs
 *       node scripts/check-client-messages.mjs --write   # 重新生成清单
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(repoRoot, "src");
const appRoot = path.join(srcRoot, "app");
const manifestPath = path.join(srcRoot, "lib", "i18n", "client-messages.json");
const SPECIAL_FILES = new Set(["error.tsx", "loading.tsx", "not-found.tsx", "template.tsx", "default.tsx"]);

const relOf = file => path.relative(srcRoot, file).replace(/\\/g, "/");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "__tests__") walk(full, out);
    } else if (/\.(ts|tsx|mts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function importSpecsOf(text) {
  const specs = new Set();
  for (const re of [/from\s*["']([^"']+)["']/g, /^\s*import\s+["']([^"']+)["']/gm, /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g, /require\(\s*["']([^"']+)["']\s*\)/g]) {
    for (const m of text.matchAll(re)) specs.add(m[1]);
  }
  return [...specs];
}

function resolveSpec(fromFile, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join(srcRoot, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.mts`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const errors = [];
const infoCache = new Map();
function infoOf(file) {
  if (infoCache.has(file)) return infoCache.get(file);
  const text = fs.readFileSync(file, "utf8");
  const info = {
    text,
    deps: importSpecsOf(text).map(spec => resolveSpec(file, spec)).filter(Boolean),
    paths: translationPathsOf(text, relOf(file)),
  };
  infoCache.set(file, info);
  return info;
}

/** Message paths that one file can read through useTranslations. */
function translationPathsOf(text, rel) {
  const out = new Set();
  if (!text.includes("useTranslations")) return out;
  const bindings = [...text.matchAll(/(?:const|let)\s+(\w+)\s*=\s*useTranslations\(\s*(?:["']([^"']*)["'])?\s*\)/g)];
  const unbound = (text.match(/useTranslations\(/g) ?? []).length - (text.match(/import\s*\{[^}]*\buseTranslations\b/g) ?? []).length - bindings.length;
  if (unbound > 0) errors.push(`${rel}: useTranslations 的返回值必须赋给 const 变量`);
  for (const [declaration, name, ns = ""] of bindings) {
    const keys = [];
    let whole = false;
    for (const m of text.matchAll(new RegExp(`(?<![\\w.$])${name}\\b(\\s*(?:\\.(?:rich|raw|markup|has))?\\s*\\(\\s*(["'\`])?)?`, "g"))) {
      const at = m.index;
      if (text.startsWith(declaration, at - declaration.indexOf(name)) && text.slice(at - declaration.indexOf(name), at - declaration.indexOf(name) + declaration.length) === declaration) continue;
      if (!m[1]) {
        // Dependency arrays only re-run effects; anything else hands t to code we cannot see.
        if (/[[,]\s*$/.test(text.slice(Math.max(0, at - 40), at)) && /^\w+\s*[\],]/.test(text.slice(at))) continue;
        whole = true;
        continue;
      }
      if (!m[2]) { whole = true; continue; }
      const rest = text.slice(at + m[0].length);
      const close = rest.indexOf(m[2]);
      let key = rest.slice(0, close);
      if (m[2] === "`" && key.includes("${")) key = key.slice(0, key.indexOf("${")).split(".").slice(0, -1).join(".");
      if (!key) { whole = true; continue; }
      keys.push(key);
    }
    if (whole && !ns) errors.push(`${rel}: 不带命名空间的 useTranslations() 只能用字面量 key 调用，请改成 useTranslations("<ns>")`);
    if (whole) out.add(ns);
    else for (const key of keys) out.add(ns ? `${ns}.${key}` : key);
  }
  return out;
}

function closurePaths(entries) {
  const seen = new Set();
  const paths = new Set();
  const stack = [...entries];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const info = infoOf(file);
    for (const p of info.paths) paths.add(p);
    stack.push(...info.deps);
  }
  return paths;
}

/** Same message tree as src/i18n/request.ts builds, used to drop paths that do not exist. */
function loadMessages(locale) {
  const root = JSON.parse(fs.readFileSync(path.join(repoRoot, "messages", `${locale}.json`), "utf8"));
  const request = fs.readFileSync(path.join(srcRoot, "i18n", "request.ts"), "utf8");
  for (const [, ns, dir] of request.matchAll(/(\w+):\s*\(await import\(`@\/\.\.\/messages\/([\w-]+)\//g)) {
    root[ns] = JSON.parse(fs.readFileSync(path.join(repoRoot, "messages", dir, `${locale}.json`), "utf8"));
  }
  return root;
}
const localeMessages = ["zh", "en"].map(loadMessages);
const exists = p => localeMessages.some(messages => p.split(".").reduce((node, part) => node && typeof node === "object" ? node[part] : undefined, messages) !== undefined);

/** Sorted, existing paths with anything already covered by a shorter prefix removed. */
function normalize(paths) {
  const sorted = [...paths].filter(exists).sort((a, b) => a.split(".").length - b.split(".").length || a.localeCompare(b));
  const kept = [];
  for (const p of sorted) if (!kept.some(k => p === k || p.startsWith(`${k}.`))) kept.push(p);
  return kept.sort();
}

const appFiles = walk(appRoot);
const scopeFiles = appFiles.filter(file => /<RouteMessages\b/.test(fs.readFileSync(file, "utf8")));
const scopeDirs = new Set(scopeFiles.filter(file => path.basename(file) === "layout.tsx").map(file => path.dirname(file)));
const coveredByLayout = file => {
  for (let dir = path.dirname(file); dir.startsWith(appRoot) && dir !== appRoot; dir = path.dirname(dir)) if (scopeDirs.has(dir)) return true;
  return false;
};

const manifest = {};
for (const file of scopeFiles) {
  const rel = relOf(file);
  const scopes = [...fs.readFileSync(file, "utf8").matchAll(/<RouteMessages\s+scope="([^"]*)"/g)].map(m => m[1]);
  if (!scopes.length || scopes.some(scope => scope !== rel)) errors.push(`${rel}: RouteMessages 的 scope 必须写成 "${rel}"`);
  const entries = path.basename(file) === "layout.tsx"
    ? appFiles.filter(f => f.startsWith(path.dirname(file) + path.sep) && !/[\\/]route\.ts$/.test(f))
    : [file];
  manifest[rel] = normalize(closurePaths(entries));
}
// The root layout and special files outside every scope render under the shell provider.
const shellEntries = [path.join(appRoot, "layout.tsx"), ...appFiles.filter(f => SPECIAL_FILES.has(path.basename(f)) && !coveredByLayout(f))];
manifest.shell = normalize(closurePaths(shellEntries));

for (const file of appFiles) {
  if (path.basename(file) !== "page.tsx" || scopeFiles.includes(file) || coveredByLayout(file)) continue;
  errors.push(`${relOf(file)}: 页面没有被 RouteMessages 覆盖（在页面或所在分区的 layout.tsx 里包一层）`);
}

const sortedManifest = Object.fromEntries(Object.keys(manifest).sort().map(key => [key, manifest[key]]));
const serialized = JSON.stringify(sortedManifest, null, 2) + "\n";
if (process.argv.includes("--write")) {
  fs.writeFileSync(manifestPath, serialized);
  console.log(`[client-messages] 已写入 ${relOf(manifestPath)}（${Object.keys(sortedManifest).length} 个 scope）`);
} else if (!fs.existsSync(manifestPath) || fs.readFileSync(manifestPath, "utf8").replace(/\r\n/g, "\n") !== serialized) {
  errors.push(`${relOf(manifestPath)} 与源码不一致，运行 node scripts/check-client-messages.mjs --write 重新生成`);
}

if (errors.length) {
  console.error(`[client-messages] ${errors.length} 个问题：\n` + errors.map(e => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`[client-messages] OK：${Object.keys(sortedManifest).length} 个 scope`);
