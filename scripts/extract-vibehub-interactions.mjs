import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { updateVibeProvenance } from "./update-vibehub-provenance.mjs";
const require = createRequire(import.meta.url);
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");
// Only reviewed presentation modules are imported; no webpack runtime is executed.
const chapters = {
  5593: ["5593.d1c61040bfed225a.js", "product-website", "01-page-structure", "n"],
  4041: ["4041.ed67faddb3090e68.js", "product-website", "02-visual-direction", "i"],
  5863: ["5863.c9c4fc93c5ab6cd3.js", "product-website", "03-hero-cta", "i"],
  3304: ["3304.ac29985a724965b2.js", "product-website", "04-content-structure", "n"],
  109: ["109.cde55c81a7f4792c.js", "product-website", "05-evidence-pricing-faq", "n"],
  1893: ["1893.378e71c6ea7d6fab.js", "product-website", "06-layout-surface", "n"],
  9699: ["9699.c4e40a43a179009a.js", "product-website", "07-form-and-interaction", "i"],
  6917: ["6917.bf71b1589eacc149.js", "product-website", "08-responsive", "n"],
  5074: ["5074.f3a615adb28af950.js", "product-website", "09-delivery-and-agent", "i"],
  301: ["301.325d572dc79a97c6.js", "git-workflow", "01-working-tree-and-commit", "n"],
  2652: ["2652.d16f75bfdf2ab221.js", "git-workflow", "02-diff-and-gitignore", "n"],
  8581: ["962.e8628eb4766c9c72.js", "git-workflow", "03-branch-and-head", "n"],
  9172: ["9172.4d21bf78f272a432.js", "git-workflow", "04-merge-and-conflicts", "n"],
  4829: ["4829.c63f8f32258800b4.js", "git-workflow", "05-remote-and-collaboration", "i"],
  7110: ["7110.0e3eb2cfea616990.js", "git-workflow", "06-restore-and-stash", "s"],
};
const sources = {
  ...Object.fromEntries(Object.entries(chapters).map(([id, info]) => [id, info[0]])),
  5842: "5842-a37af9e9c8f4465d.js", 4185: "5388-2ea231972c554b87.js", 5388: "5388-2ea231972c554b87.js",
  4203: "8335-50fb2330fbd5dae3.js", 9417: "5277-4d3cab0ece9b2812.js",
  1137: "5842-a37af9e9c8f4465d.js", 7905: "5277-4d3cab0ece9b2812.js", 5222: "5277-4d3cab0ece9b2812.js",
  101: "101.d2009221cfad5949.js", 5510: "5510.c11e07028153948c.js",
  1020: "5510.c11e07028153948c.js", 1094: "7098.c2c465cdaa186350.js",
  5323: "8335-50fb2330fbd5dae3.js", 7276: "101.d2009221cfad5949.js",
  8193: "8193.5bd5c009ad5b41d7.js", 395: "395.872116dd12abe6cd.js",
  9325: "9325.98a8175740dd0b08.js", 4066: "4066.16167a6c7ca6a7cd.js",
  6898: "8fc4c4dd-67f3c4fce6975c63.js", 3710: "8335-50fb2330fbd5dae3.js", 8884: "4902-0479db6f5ab05a08.js", 8977: "8977.11597d0f49a72e89.js", 9103: "8335-50fb2330fbd5dae3.js", 9558: "5277-4d3cab0ece9b2812.js", 7668: "5277-4d3cab0ece9b2812.js",
  5278: "5278.575f0fa9aa3380dd.js", 2008: "5277-4d3cab0ece9b2812.js", 3661: "5277-4d3cab0ece9b2812.js",
  1581: "101.d2009221cfad5949.js", 3766: "3766-9a959b8fa5c7361e.js",
};
const output = path.resolve("src/app/vibe-hub/official");
const cache = process.argv.slice(2).find(arg => !arg.startsWith("--"));
const modules = new Map(); const evidence = [];
for (const file of new Set(Object.values(sources))) {
  const url = `https://vibe-hub.org/_next/static/chunks/${file}`;
  const text = cache ? fs.readFileSync(path.join(cache, file), "utf8") : await (await fetch(url)).text();
  evidence.push({ url, sha256: createHash("sha256").update(text).digest("hex") });
  const ast = parse(text);
  traverse(ast, { ObjectProperty(p) {
    const id = p.node.key.value;
    if (!sources[id] || !t.isArrowFunctionExpression(p.node.value)) return;
    modules.set(String(id), p.node.value);
  }});
}
const specs = new Map([
  ["5842", { CoursePage: "ep" }],
  ["3710", { CatalogPreview: "y", TechnologyIcon: "p" }], ["8977", { AntiAiFlavorPage: "C" }], ["5278", { ChangelogView: "r" }], ["2008", { CommunityButton: "h", ThemePicker: "y", LanguagePicker: "w" }],
  ...Object.entries(chapters).map(([id, info]) => [id, {default:info[3]}]),
  ["101", { ConceptVisual: "e0", SkillGuide: "ss" }],
  ["8193", { default: "p" }], ["395", { default: "k" }],
  ["9325", { default: "g" }], ["4066", { default: "n" }],
  ["5510", { FlowDetails: "b" }], ["3766", { LearningLab: "H", VibeSkillPage: "k" }],
]);
const names = {6898: "technology-icons", 3710: "catalog-preview", 8884: "catalog-source", 8977: "anti-ai-flavor", 9103: "detail-actions", 9558: "view-transitions", 7668: "navigation-motion", 5278: "changelog", 2008: "navigation-controls", 3661: "themes", ...Object.fromEntries(Object.entries(chapters).map(([id, info])=>[id, "chapter-"+info[1]+"-"+info[2]])), 9417: "category-labels", 4203: "anatomy-copy", 5842: "course-page", 4185: "course-catalog", 5388: "course-cache", 1137: "course-terms", 7905: "prefetch-queue", 5222: "course-metadata", 8193: "web-foundation", 395: "foundation-lessons", 9325: "ai-tools", 4066: "example-visual", 101: "concept-visual", 5510: "flow-details", 3766: "learning-lab", 1020: "visual-state", 1094: "shuffle", 5323: "visual-kinds", 7276: "visual-shell", 1581: "visual-language"};
fs.mkdirSync(output, { recursive: true });
const processed = new Set();
function emit(id, roots) {
  if (processed.has(id)) return;
  processed.add(id);
  const factory = modules.get(id); if (!factory) throw new Error(`Unreviewed module dependency ${id}`);
  const requireName = factory.params[2].name;
  if (id === "5842") {
    traverse(t.file(t.program(factory.body.body)), { VariableDeclarator(p) {
      if (p.node.id.name === "er" && p.getFunctionParent() === null) p.node.init = t.identifier("EmbeddedCourseTerm");
    }});
  }
  if (id === "3766") {
    traverse(t.file(t.program(factory.body.body)), { FunctionDeclaration(p) {
      if (p.node.id.name === "v" && p.getFunctionParent() === null) p.replaceWith(t.variableDeclaration("const", [t.variableDeclarator(t.identifier("v"), t.identifier("SkillCopyButton"))]));
    }});
  }
  const statements = [];
  for (const node of factory.body.body) {
    if (t.isExpressionStatement(node) && (t.isCallExpression(node.expression) || t.isSequenceExpression(node.expression))) continue;
    if (t.isVariableDeclaration(node)) for (const d of node.declarations) statements.push(t.variableDeclaration(node.kind, [d]));
    else statements.push(node);
  }
  const ast = t.file(t.program(statements)); let program;
  traverse(ast, { Program(p) { program = p; }});
  const chosen = new Set();
  function include(name) {
    const binding = program.scope.getBinding(name); if (!binding) return;
    let statement = binding.path;
    while (statement.parentPath && !statement.parentPath.isProgram()) statement = statement.parentPath;
    if (chosen.has(statement.node)) return;
    chosen.add(statement.node);
    statement.traverse({ ReferencedIdentifier(p) {
      const b = p.scope.getBinding(p.node.name);
      if (b && b.scope === program.scope) include(p.node.name);
    }});
  }
  Object.values(roots).forEach(include);
  traverse(t.file(t.program(statements.filter(s => chosen.has(s)))), { CallExpression(p) {
    const callee = t.isSequenceExpression(p.node.callee) ? p.node.callee.expressions.at(-1) : p.node.callee;
    if (!t.isMemberExpression(callee) || callee.property.name !== "lazy") return;
    let target;
    p.traverse({ CallExpression(q) {
      if (t.isMemberExpression(q.node.callee) && q.node.callee.object.name === requireName && q.node.callee.property.name === "e") target = String(q.node.arguments[0].value);
    }});
    if (!target) return;
    if (!names[target]) throw new Error(`Unreviewed lazy dependency ${target}`);
    p.node.arguments = [t.arrowFunctionExpression([], t.callExpression(t.import(), [t.stringLiteral(`./${names[target]}.js`)]))];
  }});
  const imports = id === "3766" && !roots.searchTerms ? [t.importDeclaration([t.importSpecifier(t.identifier("SkillCopyButton"), t.identifier("SkillCopyButton"))], t.stringLiteral("../skill-copy-button"))] : id === "5842" ? [t.importDeclaration([t.importSpecifier(t.identifier("EmbeddedCourseTerm"), t.identifier("EmbeddedCourseTerm"))], t.stringLiteral("../courses/embedded-term"))] : []; const body = []; const dependencies = [];
  for (const statement of statements.filter(s => chosen.has(s))) {
    const d = t.isVariableDeclaration(statement) ? statement.declarations[0] : null;
    if (d && t.isCallExpression(d.init) && t.isIdentifier(d.init.callee, {name: requireName})) {
      const dependency = String(d.init.arguments[0].value);
      const source = dependency === "807" ? "react-dom" : dependency === "4902" ? "../courses/term-adapter" : dependency === "1234" ? "next/image" : dependency === "2092" ? "../courses/routing" : dependency === "8914" ? "react/jsx-runtime" : dependency === "9626" ? "react" : `./${names[dependency]}.js`;
      if (source.includes("undefined")) throw new Error(`Unreviewed dependency ${dependency}`);
      imports.push(t.importDeclaration([t.importNamespaceSpecifier(d.id)], t.stringLiteral(source)));
      if (!['807', '8914', '9626', '1234', '2092', '4902'].includes(dependency)) dependencies.push(dependency);
    } else body.push(statement);
  }
  traverse(t.file(t.program(body)), { CallExpression(p) {
    const c = p.node.callee;
    // Some official constants use inline require calls inside a Set or array.
    // Hoist those imports too; no webpack require binding may reach the app.
    if (t.isIdentifier(c, {name: requireName}) && p.node.arguments.length === 1 && t.isNumericLiteral(p.node.arguments[0])) {
      const dependency = String(p.node.arguments[0].value);
      if (!names[dependency]) throw new Error(`Unreviewed inline dependency ${dependency}`);
      const local = t.identifier(`upstream${dependency}`);
      if (!imports.some(item => item.specifiers.some(specifier => specifier.local.name === local.name))) {
        imports.push(t.importDeclaration([t.importNamespaceSpecifier(local)], t.stringLiteral(`./${names[dependency]}.js`)));
      }
      if (!dependencies.includes(dependency)) dependencies.push(dependency);
      p.replaceWith(local); return;
    }
    // Keep portals inside the scoped ANS feature so official dialog styles and
    // theme variables are inherited without affecting the surrounding platform.
    const portal = t.isSequenceExpression(c) ? c.expressions.at(-1) : c;
    if (id === "2008" && t.isMemberExpression(portal) && portal.property.name === "createPortal") {
      p.node.arguments[1] = t.logicalExpression("||", t.optionalCallExpression(t.optionalMemberExpression(t.memberExpression(t.identifier("c"), t.identifier("current")), t.identifier("closest"), false, true), [t.stringLiteral(".vibehub-source")], false), p.node.arguments[1]);
    }
    if (!t.isMemberExpression(c) || c.property.name !== "then") return;
    const bind = p.node.arguments[0];
    if (!t.isCallExpression(bind) || !t.isMemberExpression(bind.callee) || bind.callee.object.name !== requireName || bind.callee.property.name !== "bind") return;
    const target = String(bind.arguments[1].value);
    if (target !== "4902" && !names[target]) throw new Error(`Unreviewed dynamic dependency ${target}`);
    p.replaceWith(t.callExpression(t.import(), [t.stringLiteral(target === "4902" ? "../courses/term-adapter" : `./${names[target]}.js`)]));
  }, ObjectExpression(p) {
    if (id !== "3710") return;
    const className = p.node.properties.find(prop => t.isObjectProperty(prop) && (prop.key.name || prop.key.value) === "className");
    if (className && generate(className.value).code.includes("card-demo")) p.node.properties.push(t.objectProperty(t.identifier("inert"), t.booleanLiteral(true)));
  }, StringLiteral(p) { if(p.node.value.startsWith("/assets/")) p.node.value = "/vibe-hub/source" + p.node.value; },
  RegExpLiteral(p) { p.node.pattern = p.node.pattern.replace("^\\/assets\\/", "^\\/vibe-hub\\/source\\/assets\\/"); }});
  const exports = t.exportNamedDeclaration(null, Object.entries(roots).filter(([name]) => name !== "default").map(([name, local]) => t.exportSpecifier(t.identifier(local), t.identifier(name))));
  const result = t.program([...imports, ...body, exports, ...(roots.default ? [t.exportDefaultDeclaration(t.identifier(roots.default))] : [])]);
  result.directives = roots.searchTerms || id === "8884" ? [] : [t.directive(t.directiveLiteral("use client"))];
  fs.writeFileSync(path.join(output, `${names[id]}.js`), `// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.\n${generate(result).code}\n`);
  for (const dep of dependencies) {
    const f = modules.get(dep); const all = {};
    traverse(t.file(t.program(f.body.body)), { CallExpression(p) {
      if (t.isMemberExpression(p.node.callee) && p.node.callee.object.name === f.params[2].name && p.node.callee.property.name === 'd') {
        for (const prop of p.node.arguments[1].properties) all[prop.key.name || prop.key.value] = prop.value.body.name;
      }
    }});
    emit(dep, dep === "7668" ? { qs: all.qs } : dep === "4203" ? { R: all.R } : dep === "9417" ? { Zi: all.Zi } : all);
  }
}
for (const [id, roots] of specs) emit(id, roots);
// Search is pure shared logic: keep it usable by both the page and ANS API.
processed.delete("3766"); names[3766] = "search"; emit("3766", { searchTerms: "eE" }); names[3766] = "learning-lab";
// Chapter payloads are literal objects; parse them without executing upstream code.
function literal(node) {
  if (t.isStringLiteral(node) || t.isNumericLiteral(node) || t.isBooleanLiteral(node)) return node.value.startsWith?.("/assets/") ? "/vibe-hub/source" + node.value : node.value;
  if (t.isNullLiteral(node)) return null;
  if (t.isUnaryExpression(node) && node.operator === "!") return !literal(node.argument);
  if (t.isUnaryExpression(node) && node.operator === "-") return -literal(node.argument);
  if (t.isArrayExpression(node)) return node.elements.map(literal);
  if (t.isObjectExpression(node)) return Object.fromEntries(node.properties.map(p=>[p.key.name || p.key.value, literal(p.value)]));
  throw new Error(`Nonliteral chapter data: ${node?.type}`);
}
let common;
traverse(t.file(t.program(modules.get("8884").body.body)), { VariableDeclarator(p) { if (p.node.id.name === "n") common = literal(p.node.init); } });
if (!Array.isArray(common) || common.length !== 360) throw new Error("Incomplete official catalog previews");
fs.writeFileSync("src/data/vibehub/catalog-previews.json", JSON.stringify(Object.fromEntries(common.map(entry => [entry.id, { category: entry.cat, zh: entry.demo, en: entry.en?.demo || entry.demo }]))));
execFileSync("python", ["scripts/sync-vibehub.py", "--previews-only"], {stdio:"inherit"});
fs.mkdirSync("src/data/vibehub/courses", {recursive:true});
const courseIndex = [];
const assetUrls = new Set(["/assets/course-blueprints.svg", "/assets/vibehub-group-qr-8-20260927.png"]);
for (const [id, [, course, chapter, local]] of Object.entries(chapters)) {
  let payload;
  traverse(t.file(t.program(modules.get(id).body.body)), {VariableDeclarator(p) {if(p.node.id.name === local) payload = literal(p.node.init);}});
  if (!payload) throw new Error(`Missing chapter ${chapter}`);
  courseIndex.push({course,id:payload.id,title:payload.title,intro:payload.intro,order:payload.order});
  fs.mkdirSync(`src/data/vibehub/courses/${course}`, {recursive:true});
  fs.writeFileSync(`src/data/vibehub/courses/${course}/${chapter}.json`, JSON.stringify(payload));
}
fs.writeFileSync("src/data/vibehub/courses/index.json",JSON.stringify(courseIndex));
for (const id of ["8884","8977","4185","5222",...Object.keys(chapters)]) {
  traverse(t.file(t.program(modules.get(id).body.body)), {StringLiteral(p) { const v=p.node.value; if(v.startsWith("/assets/") || v.startsWith("/vibe-hub/source/assets/")) assetUrls.add(v.replace("/vibe-hub/source", ""));
    for (const match of v.matchAll(/(?:src|poster)=["'](\/assets\/[^"']+)["']/g)) assetUrls.add(match[1]); }});
}
for (const asset of assetUrls) {
  const file = "public/vibe-hub/source" + asset;
  if (fs.existsSync(file)) continue;
  const response = await fetch("https://vibe-hub.org" + asset);
  // List illustrations are SVG symbols instead of image files in the source UI.
  if (response.status === 404 && /-(?:route|chapter-\d+)-list(?:-en)?-v\d+\.webp$/.test(asset)) continue;
  if (!response.ok) throw new Error(`Course asset ${asset}: ${response.status}`);
  fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
}
const courseCss="5d27da8f1256694d.css";
const cssResponse=await fetch("https://vibe-hub.org/_next/static/css/"+courseCss);
if(!cssResponse.ok) throw new Error("Course stylesheet unavailable");
fs.writeFileSync("public/vibe-hub/source/"+courseCss,await cssResponse.text());
const sheetFile="public/vibe-hub/source/stylesheets.json";const sheets=JSON.parse(fs.readFileSync(sheetFile,"utf8"));
if(!sheets.includes(courseCss))fs.writeFileSync(sheetFile,JSON.stringify([...sheets,courseCss]));
fs.writeFileSync('src/data/vibehub/interaction-sources.json', JSON.stringify({ source: 'https://vibe-hub.org', modules: evidence, extraction: 'AST dependency closure; React is supplied by ANS. No upstream runtime, remote loading, analytics or authentication.' }, null, 2));
execFileSync(process.execPath, ["scripts/render-vibehub-specials.mjs"], { stdio: "inherit" });
if (process.argv.includes("--code-only")) { console.log(updateVibeProvenance()); process.exit(0); }
const catalog = JSON.parse(fs.readFileSync("src/data/vibehub/catalog.json", "utf8"));
fs.mkdirSync("src/data/vibehub/details", {recursive:true});
fs.mkdirSync("public/vibe-hub/source/audio/pronunciations", {recursive:true});
const audio = []; let cursor = 0;
await Promise.all(Array.from({length:8}, async () => {
  while (cursor < catalog.entries.length) {
    const {slug} = catalog.entries[cursor++];
    const detailUrl = `https://vibe-hub.org/catalog/details/${slug}.json`;
    const response = await fetch(detailUrl);
    if (!response.ok) throw new Error(`Detail ${slug}: ${response.status}`);
    const detail = await response.json();
    if (detail.__entryId !== slug || !detail.entry) throw new Error(`Invalid detail ${slug}`);
    fs.writeFileSync(`src/data/vibehub/details/${slug}.json`, JSON.stringify(detail));
    const audioUrl = `https://vibe-hub.org/audio/pronunciations/${slug}.mp3`;
    const sound = await fetch(audioUrl);
    if (sound.ok) {
      const bytes = Buffer.from(await sound.arrayBuffer());
      if (!sound.headers.get("content-type")?.includes("audio") || bytes.length < 100) throw new Error(`Invalid audio ${slug}`);
      fs.writeFileSync(`public/vibe-hub/source/audio/pronunciations/${slug}.mp3`, bytes);
      audio.push({id:slug, url:audioUrl, sha256:createHash("sha256").update(bytes).digest("hex")});
    } else if (sound.status !== 404) throw new Error(`Audio ${slug}: ${sound.status}`);
  }
}));
fs.writeFileSync("src/data/vibehub/pronunciations.json", JSON.stringify(audio.sort((a,b)=>a.id.localeCompare(b.id))));
console.log(JSON.stringify({ modules: [...processed], audio:audio.length, provenance: updateVibeProvenance() }));
