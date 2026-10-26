/**
 * 客户端文案路径分析。
 *
 * 根布局只给浏览器下发站点框架（顶栏、页脚、底部导航、Agent）用到的文案，
 * 其余路由由各自的布局补齐。这里从入口文件出发沿 import 图走到所有客户端模块，
 * 读出每个 useTranslations 绑定实际取用的文案路径（精确到键），
 * 供 src/__tests__/i18n/client-messages.test.ts 校验下发清单是否够用。
 *
 * 规则：
 *   - 从入口出发，遇到 "use client" 文件即进入客户端；客户端文件的全部依赖（含 import()）都算客户端。
 *   - const t = useTranslations("ns") 之后 t("key") / t.rich("key") 记为 ns.key；
 *     t(`nav.${id}`) 记为 ns.nav；三元两边都是字面量时两边都记。
 *   - 其他取法（变量键、把 t 传出去、解构）一律记为整个 ns，宁多勿少。
 *
 * 用法：node scripts/client-message-paths.mjs src/app/layout.tsx [更多入口...]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(repoRoot, "src");
const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];
const SOURCE_FILE = /\.(?:tsx?|jsx?|mjs)$/;
const parsed = new Map();

function parse(file) {
  if (!parsed.has(file)) {
    const text = fs.readFileSync(file, "utf8");
    parsed.set(file, ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.TSX));
  }
  return parsed.get(file);
}

function resolveImport(from, specifier) {
  let base;
  if (specifier.startsWith("@/")) base = path.join(srcRoot, specifier.slice(2));
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(from), specifier);
  else return null;
  for (const extension of EXTENSIONS) {
    const candidate = base + extension;
    if (SOURCE_FILE.test(candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function imports(file) {
  const found = [];
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      if (!(ts.isImportDeclaration(node) && node.importClause?.isTypeOnly) && !(ts.isExportDeclaration(node) && node.isTypeOnly)) found.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
      found.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(parse(file));
  return found.map(specifier => resolveImport(file, specifier)).filter(Boolean);
}

function isClientModule(file) {
  const first = parse(file).statements[0];
  return Boolean(first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === "use client");
}

/** Every module that ends up in the browser bundle when rendering from these entries. */
export function clientModules(entries) {
  const visited = new Set();
  const client = new Set();
  const queue = entries.map(entry => [path.resolve(repoRoot, entry), false]);
  while (queue.length) {
    const [file, inherited] = queue.pop();
    const inClient = inherited || isClientModule(file);
    const key = file + (inClient ? "#client" : "");
    if (visited.has(key)) continue;
    visited.add(key);
    if (inClient) client.add(file);
    for (const dependency of imports(file)) queue.push([dependency, inClient]);
  }
  return client;
}

const join = (namespace, key) => (namespace && key ? `${namespace}.${key}` : namespace || key);

const HOOKS_WITH_DEPENDENCIES = new Set(["useCallback", "useEffect", "useLayoutEffect", "useMemo", "useImperativeHandle"]);

/** `[t]` as a hook dependency list only reads the reference, not any message. */
function isHookDependency(node) {
  const list = node.parent;
  const call = list?.parent;
  return ts.isArrayLiteralExpression(list) && ts.isCallExpression(call) && call.arguments.includes(list)
    && ts.isIdentifier(call.expression) && HOOKS_WITH_DEPENDENCIES.has(call.expression.text);
}

function keyPaths(argument, namespace) {
  if (!argument) return [namespace];
  if (ts.isStringLiteralLike(argument)) return [join(namespace, argument.text)];
  if (ts.isTemplateExpression(argument)) {
    const prefix = argument.head.text.slice(0, argument.head.text.lastIndexOf(".") + 1).replace(/\.$/, "");
    return [join(namespace, prefix)];
  }
  if (ts.isConditionalExpression(argument)) {
    const sides = [argument.whenTrue, argument.whenFalse];
    if (sides.every(side => ts.isStringLiteralLike(side))) return sides.map(side => join(namespace, side.text));
  }
  if (ts.isParenthesizedExpression(argument)) return keyPaths(argument.expression, namespace);
  return [namespace];
}

function enclosingBlock(node) {
  let scope = node.parent;
  while (scope && !ts.isBlock(scope) && !ts.isSourceFile(scope) && !ts.isCaseBlock(scope) && !ts.isFunctionLike(scope)) scope = scope.parent;
  return scope;
}

/** Message paths one module reads through useTranslations. */
export function modulePaths(file) {
  const source = parse(file);
  const paths = new Set();
  // Several components in one file often each bind their own `t`; resolve every use to the
  // innermost enclosing block that declares that name.
  const translators = [];
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "useTranslations") {
      const argument = node.arguments[0];
      const namespace = !argument ? "" : ts.isStringLiteralLike(argument) ? argument.text : null;
      const binding = node.parent;
      if (namespace === null) paths.add("");
      else if (ts.isVariableDeclaration(binding) && ts.isIdentifier(binding.name) && binding.initializer === node) translators.push({ name: binding.name.text, namespace, declaration: binding.name, scope: enclosingBlock(binding) });
      else paths.add(namespace);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (!translators.length) return paths;
  const resolve = node => translators
    .filter(entry => entry.name === node.text && entry.scope.pos <= node.pos && node.end <= entry.scope.end)
    .sort((a, b) => (b.scope.pos - a.scope.pos) || (a.scope.end - b.scope.end))[0];
  const visitUses = node => {
    const translator = ts.isIdentifier(node) ? resolve(node) : undefined;
    if (translator) {
      const { namespace, declaration } = translator;
      if (node !== declaration && !isHookDependency(node)) {
        const parent = node.parent;
        if (ts.isCallExpression(parent) && parent.expression === node) keyPaths(parent.arguments[0], namespace).forEach(entry => paths.add(entry));
        else if (ts.isPropertyAccessExpression(parent) && parent.expression === node && ts.isCallExpression(parent.parent) && parent.parent.expression === parent) keyPaths(parent.parent.arguments[0], namespace).forEach(entry => paths.add(entry));
        else paths.add(namespace);
      }
    }
    ts.forEachChild(node, visitUses);
  };
  visitUses(source);
  return paths;
}

/** Message paths the browser needs to render these entries, with the module that reads each. */
export function clientMessagePaths(entries) {
  const needed = new Map();
  for (const file of clientModules(entries)) {
    for (const entry of modulePaths(file)) {
      if (!needed.has(entry)) needed.set(entry, path.relative(repoRoot, file).split(path.sep).join("/"));
    }
  }
  return needed;
}

/** A needed path is covered when it or one of its ancestors is provided. */
export function isCovered(needed, provided) {
  return provided.some(entry => needed === entry || needed.startsWith(entry + "."));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const entries = process.argv.slice(2);
  if (!entries.length) {
    console.error("用法：node scripts/client-message-paths.mjs <入口文件...>");
    process.exit(1);
  }
  for (const [entry, file] of [...clientMessagePaths(entries)].sort()) console.log(`${entry || "(全部文案)"}\t${file}`);
}
