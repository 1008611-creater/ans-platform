#!/usr/bin/env node
/**
 * 分层边界检查（import boundary）。
 *
 * 架构文档承诺的依赖方向必须有工具强制，否则会随时间腐化：
 *
 *   app → components → contracts/domain
 *   app/api → contracts → domain → server
 *   server → db / auth / integrations
 *
 * 检查项（任一条失败都会让 `npm run verify` 失败）：
 *
 *   1. 客户端边界：带 "use client" 的文件不能（直接或间接）依赖服务端模块，
 *      包括 @/server 服务、@/lib/db、Prisma 和 next/headers 这类服务端 API。
 *      这类问题不会在单元测试里暴露，但会把数据库/凭证代码拖进浏览器 bundle。
 *   2. 组件数据边界：src/components 下任何文件都不能（直接或间接）到达数据库
 *      （@/lib/db、@prisma/*）。服务端组件可以通过 @/server 服务取数，
 *      这正是本仓库的目标写法；但不能自己查库。
 *   3. contracts 纯净：只允许 zod 与同层相对导入。
 *   4. domain 纯净：只允许 contracts 与同层相对导入。
 *   5. server 纯净：不得反向依赖 components/app。
 *   6. app 数据边界（棘轮）：src/app 下的文件不得（直接或间接）到达数据库，
 *      历史存量记录在 scripts/boundaries-app-baseline.json 里逐条豁免。
 *      基线之外出现新的越界 → 失败；基线里的条目已经修好却忘了同步收紧 → 也失败。
 *      这样豁免清单只会变小，不会随开发悄悄变胖。
 *
 * 检查 1、2、6 是传递闭包分析；3–5 是直接的层级箭头。
 *
 * 用法：node scripts/check-boundaries.mjs
 *       node scripts/check-boundaries.mjs --write-app-baseline   # 重新生成棘轮基线
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(scriptDir, "..", "src");

/** 服务端专属 npm 包。 */
const SERVER_ONLY_PACKAGES = ["@prisma/client", "@prisma/adapter-pg", "pg", "server-only"];
/** 只在客户端组件里非法的服务端 API 包（服务端组件可以用）。 */
const CLIENT_FORBIDDEN_PACKAGES = ["next/headers", "next/server"];

/**
 * app 层数据边界的「已认可鉴权基建」。
 *
 * 这三个模块本身就是「读一次会话 / 查一次权限」的基础设施，内部用 db 是设计如此。
 * 从它们继续往下追会把整片 app 目录都算成越界，反而掩盖真正的业务查询，
 * 因此闭包分析在此停下，与 @/server 同等对待。
 */
const APP_AUTH_INFRA = new Set([
  "lib/auth/index.ts",
  "lib/admin-permissions.ts",
  "lib/template-access.ts",
]);

/** app 层数据边界的历史存量台账。 */
const appBaselinePath = path.resolve(scriptDir, "boundaries-app-baseline.json");
const writeAppBaseline = process.argv.includes("--write-app-baseline");

/** 数据库入口（永远不允许出现在组件依赖闭包里）。 */
function isDatabaseModule(rel) {
  return rel === "lib/db.ts";
}
/** 服务端专属内部模块（含整棵子树）。 */
function isServerModule(rel) {
  return rel === "lib/auth/index.ts" || rel === "server" || rel.startsWith("server/");
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      walk(full, out);
    } else if (/\.(ts|tsx|mts)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const relOf = (file) => path.relative(srcRoot, file).replace(/\\/g, "/");

/** 提取一个文件里的全部 import/require 说明符。 */
function importSpecsOf(text) {
  const specs = new Set();
  const patterns = [
    /from\s*["']([^"']+)["']/g,
    /^\s*import\s+["']([^"']+)["']/gm,
    /^\s*import\s*\(\s*["']([^"']+)["']\s*\)/gm,
    /require\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) specs.add(m[1]);
  }
  return [...specs];
}

/** 把 import 说明符解析到 src 下的真实文件；外部包返回 null。 */
function resolveSpec(fromFile, spec) {
  let base = null;
  if (spec.startsWith("@/")) base = path.join(srcRoot, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const fileCache = new Map();
function infoOf(file) {
  if (fileCache.has(file)) return fileCache.get(file);
  const text = fs.readFileSync(file, "utf8");
  const specs = importSpecsOf(text);
  const internal = [];
  const external = [];
  for (const spec of specs) {
    const resolved = resolveSpec(file, spec);
    if (resolved) internal.push({ spec, file: resolved });
    else if (!spec.startsWith(".")) external.push(spec);
  }
  const info = {
    specs,
    internal,
    external,
    isClient: /^\s*["']use client["']/m.test(text),
    rel: relOf(file),
  };
  fileCache.set(file, info);
  return info;
}

/**
 * 从 file 出发寻找违规依赖链。
 * @param {{allowServerServices: boolean, allowDatabase: boolean}} opts
 *        allowServerServices=true 时允许到达 @/server（服务端组件取数）；
 *        allowDatabase 目前没有调用方设为 true。
 */
function violationChain(file, opts, trail = []) {
  // 用路径判断环，而不是全局 seen：共享 seen 会让兄弟分支互相遮蔽，
  // 从而漏掉真正的违规链。
  if (trail.includes(file)) return null;
  const info = infoOf(file);
  const chain = [...trail, info.rel];

  if (isDatabaseModule(info.rel) && !opts.allowDatabase) return chain;
  if (isServerModule(info.rel)) {
    // @/server 是受认可的数据访问边界：服务端组件调用它是目标写法。
    // 允许时到此为止，不再向下追踪（server 内部用 db 是合法的）。
    return opts.allowServerServices ? null : chain;
  }
  if (opts.stopAtAppAuthInfra && APP_AUTH_INFRA.has(info.rel)) {
    // 鉴权基建：内部读库是设计如此，不再向下追踪。
    return null;
  }

  for (const spec of info.external) {
    if (SERVER_ONLY_PACKAGES.some((p) => spec === p || spec.startsWith(`${p}/`))) {
      return [...trail, `${info.rel}  (imports ${spec})`];
    }
    if (!opts.allowServerServices && CLIENT_FORBIDDEN_PACKAGES.some((p) => spec === p || spec.startsWith(`${p}/`))) {
      return [...trail, `${info.rel}  (imports ${spec})`];
    }
  }
  for (const dep of info.internal) {
    const found = violationChain(dep.file, opts, chain);
    if (found) return found;
  }
  return null;
}

const allFiles = walk(srcRoot);
const violations = [];

// 空扫描保护：如果 src/ 不存在或没有被扫到任何文件，说明检查本身失效了。
// 这种「看起来全绿、其实什么都没查」的假绿比真正的越界更危险，必须直接失败。
if (allFiles.length === 0) {
  console.error(`[boundaries] 没有扫描到任何源文件（期望目录：${srcRoot}）`);
  console.error("[boundaries] 检查未生效，按失败处理。");
  process.exit(1);
}

const clientFiles = allFiles.filter((f) => infoOf(f).isClient);
if (clientFiles.length === 0) {
  console.error('[boundaries] 没有扫描到任何客户端组件（缺少 "use client" 判定），按失败处理。');
  process.exit(1);
}

// ---- 1. 客户端边界（传递闭包，禁止一切服务端依赖） ----------------------
for (const file of clientFiles) {
  const chain = violationChain(file, { allowServerServices: false, allowDatabase: false });
  if (chain) {
    violations.push({
      rule: "client-boundary",
      file: relOf(file),
      detail: `客户端组件依赖了服务端模块：${chain.join(" → ")}`,
    });
  }
}

// ---- 2. 组件数据边界（允许 @/server 服务，禁止直接查库） -----------------
for (const file of allFiles.filter((f) => relOf(f).startsWith("components/"))) {
  const chain = violationChain(file, { allowServerServices: true, allowDatabase: false });
  if (chain) {
    violations.push({
      rule: "components-data",
      file: relOf(file),
      detail: `组件层不得（直接或间接）访问数据库：${chain.join(" → ")}；请改走 @/server 服务或 @/contracts 类型`,
    });
  }
}

// ---- 3. contracts 纯净 ----------------------------------------------------
const CONTRACT_ALLOWED = new Set(["zod"]);
for (const file of allFiles.filter((f) => relOf(f).startsWith("contracts/"))) {
  const info = infoOf(file);
  for (const spec of info.specs) {
    if (CONTRACT_ALLOWED.has(spec)) continue;
    if (spec.startsWith(".")) {
      const resolved = resolveSpec(file, spec);
      if (resolved && relOf(resolved).startsWith("contracts/")) continue;
      violations.push({ rule: "contracts-purity", file: info.rel, detail: `contracts 层不得引用 ${spec}` });
      continue;
    }
    violations.push({
      rule: "contracts-purity",
      file: info.rel,
      detail: `contracts 层不得引用 ${spec}（只允许 zod 与同层相对导入）`,
    });
  }
}

// ---- 4. domain 纯净 -------------------------------------------------------
for (const file of allFiles.filter((f) => relOf(f).startsWith("domain/"))) {
  const info = infoOf(file);
  for (const spec of info.specs) {
    if (spec.startsWith("./") || spec.startsWith("../")) continue;
    if (spec.startsWith("@/contracts/") || spec.startsWith("@/domain/")) continue;
    violations.push({
      rule: "domain-purity",
      file: info.rel,
      detail: `domain 层只允许 contracts 与同层导入，实际引用了 ${spec}`,
    });
  }
}

// ---- 5. server 不得反向依赖 UI -------------------------------------------
for (const file of allFiles.filter((f) => relOf(f).startsWith("server/"))) {
  const info = infoOf(file);
  for (const spec of info.specs) {
    if (spec.startsWith("@/components/") || spec.startsWith("@/app/")) {
      violations.push({ rule: "server-purity", file: info.rel, detail: `server 层不得依赖 UI：${spec}` });
    }
  }
}

// ---- 6. app 数据边界（棘轮：只允许基线内的历史存量） ---------------------
const appFiles = allFiles.filter((f) => relOf(f).startsWith("app/"));
const appViolators = [];
for (const file of appFiles) {
  const chain = violationChain(file, {
    allowServerServices: true,
    allowDatabase: false,
    stopAtAppAuthInfra: true,
  });
  if (chain) appViolators.push({ file: relOf(file), chain });
}
const currentAppViolations = appViolators.map((v) => v.file).sort();

if (writeAppBaseline) {
  const payload = {
    $comment:
      "src/app 下仍直接/间接访问数据库的历史文件。此清单只能变小：修好一个就从这里删掉一行；" +
      "新增越界会被 npm run check:boundaries 拦下。用 node scripts/check-boundaries.mjs --write-app-baseline 重新生成。",
    count: currentAppViolations.length,
    files: currentAppViolations,
  };
  fs.writeFileSync(appBaselinePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[boundaries] 已写入 app 数据边界基线：${currentAppViolations.length} 个文件 → ${path.relative(process.cwd(), appBaselinePath)}`);
  process.exit(0);
}

let appBaseline = [];
if (fs.existsSync(appBaselinePath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(appBaselinePath, "utf8"));
    appBaseline = Array.isArray(parsed?.files) ? parsed.files : [];
  } catch (error) {
    console.error(`[boundaries] 无法解析 ${path.relative(process.cwd(), appBaselinePath)}：${error.message}`);
    process.exit(1);
  }
} else {
  console.error(`[boundaries] 缺少 app 数据边界基线：${appBaselinePath}`);
  console.error("[boundaries] 用 node scripts/check-boundaries.mjs --write-app-baseline 生成。");
  process.exit(1);
}

const baselineSet = new Set(appBaseline);
const duplicateEntries = appBaseline.filter((rel, index) => appBaseline.indexOf(rel) !== index);
if (duplicateEntries.length > 0) {
  console.error(`[boundaries] ${path.relative(process.cwd(), appBaselinePath)} 存在重复条目：${[...new Set(duplicateEntries)].join(", ")}`);
  console.error("[boundaries] 台账必须一条一文件，请运行 node scripts/check-boundaries.mjs --write-app-baseline 重新生成。");
  process.exit(1);
}
const newlyViolating = appViolators.filter((v) => !baselineSet.has(v.file));
const fixedButStale = appBaseline.filter((rel) => !currentAppViolations.includes(rel));

for (const v of newlyViolating) {
  violations.push({
    rule: "app-data",
    file: v.file,
    detail: `app 层不得（直接或间接）访问数据库：${v.chain.join(" → ")}；请把查询搬进 @/server 服务`,
  });
}
for (const rel of fixedButStale) {
  violations.push({
    rule: "app-data-stale",
    file: rel,
    detail:
      "该文件已不再访问数据库，但仍留在 scripts/boundaries-app-baseline.json 里；" +
      "请运行 node scripts/check-boundaries.mjs --write-app-baseline 收紧基线",
  });
}

// ---- 报告 ---------------------------------------------------------------
const RULE_LABEL = {
  "client-boundary": "客户端边界",
  "components-data": "组件数据边界",
  "contracts-purity": "contracts 纯净",
  "domain-purity": "domain 纯净",
  "server-purity": "server 纯净",
  "app-data": "app 数据边界",
  "app-data-stale": "app 数据边界（台账过期）",
};

const countOf = (prefix) => allFiles.filter((f) => relOf(f).startsWith(prefix)).length;
console.log("[boundaries] 扫描 src/ 下的分层依赖");
console.log(
  `[boundaries] 文件 ${allFiles.length} 个（客户端组件 ${clientFiles.length} 个）；` +
    `contracts ${countOf("contracts/")} 个，domain ${countOf("domain/")} 个，server ${countOf("server/")} 个`,
);
console.log(
  `[boundaries] app 数据边界：${currentAppViolations.length} 个文件仍在基线内` +
    `（app 共 ${appFiles.length} 个文件，基线已收口 ${appBaseline.length - currentAppViolations.length} 个）`,
);

if (violations.length === 0) {
  console.log("[boundaries] 六类检查全部通过");
  process.exit(0);
}

console.error(`\n[boundaries] 发现 ${violations.length} 处越界：`);
for (const v of violations) {
  console.error(`  ✗ [${RULE_LABEL[v.rule] ?? v.rule}] ${v.file}`);
  console.error(`      ${v.detail}`);
}
console.error("\n[boundaries] 分层规则见 docs/architecture.md「目标边界」一节。");
process.exit(1);
