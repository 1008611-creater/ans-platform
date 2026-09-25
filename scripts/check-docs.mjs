// 文档检查：确保 docs/ 与根目录文档里的相对链接都指向真实存在的文件。
// 只做「链接可达性」这一件事，避免成为需要长期维护的规则集合。
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";

const roots = ["docs", "PROJECT_CONTEXT.md", "CONSTRAINTS.md", "README.md"];

function collect(path) {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) return collect(child);
    return entry.name.endsWith(".md") ? [child] : [];
  });
}

const linkPattern = /\]\(([^)\s]+)\)/g;
const problems = [];
let checked = 0;

for (const file of roots.flatMap(collect)) {
  const content = readFileSync(file, "utf8");
  for (const match of content.matchAll(linkPattern)) {
    const target = match[1];
    if (/^[a-z]+:/i.test(target) || target.startsWith("#")) continue;
    const clean = target.split("#")[0];
    if (!clean) continue;
    checked += 1;
    if (!existsSync(resolve(dirname(file), clean))) {
      problems.push(`${file} -> ${target}`);
    }
  }
}

if (problems.length > 0) {
  console.error("[check-docs] 以下文档链接指向不存在的文件：");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`[check-docs] ${checked} 个文档链接全部有效`);
}
