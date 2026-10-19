#!/usr/bin/env node
/**
 * i18n 缺口报告：数一数 Agent 相关界面里还剩多少"硬编码中文"。
 *
 * 用途：
 *   - 把「还差多少」变成一条命令，而不是靠人肉 grep；
 *   - 为账本规则（例如 A-AGENT-06 用 countMax 锁住剩余中文字面量）提供准确上限。
 *
 * 用法：
 *   node scripts/report-i18n-gaps.mjs            # 人类可读表格
 *   node scripts/report-i18n-gaps.mjs --json     # 机器可读
 *   node scripts/report-i18n-gaps.mjs --dir src/components/mascot
 *
 * 统计口径（只数"用户可见的硬编码中文"，不数注释/词条文件）：
 *   - 跳过整行注释（//、/*、*）与行尾 // 注释；
 *   - 跳过 `messages/**`（那是词条本身）；
 *   - 命中：行内出现在 "…"、'…'、`…` 里，或 JSX 文本里的中文字符；
 *   - 另列 `isZh ?` / `locale === "zh"` 这类"双语三元/数据选择"的数量，供人工判断。
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const dirArg = (() => { const i = argv.indexOf("--dir"); return i >= 0 ? argv[i + 1] : null; })();
const roots = dirArg ? [dirArg] : ["src/components/mascot", "src/components/workspace", "src/server/companion", "src/domain/mascot"];
const EXTRA = [".ts", ".tsx"];

function walk(dir) {
  let out = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out = out.concat(walk(path));
    else if (EXTRA.some(ext => path.endsWith(ext))) out.push(path);
  }
  return out;
}

const stripLineComment = (line) => {
  // 简单地把行尾 // 注释去掉（不处理字符串里的 //，够用于统计）
  const idx = line.indexOf("//");
  return idx >= 0 ? line.slice(0, idx) : line;
};
const hasChinese = (text) => /[\u4e00-\u9fa5]/.test(text);

const files = roots.flatMap(walk).sort();
const report = [];
let totalZh = 0, totalTernary = 0;
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  let zh = 0, ternary = 0;
  const samples = [];
  lines.forEach((raw, index) => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) return;
    if (/isZh\s*\?|locale\s*===\s*"zh"/.test(trimmed)) ternary += 1;
    const code = stripLineComment(raw);
    if (!hasChinese(code)) return;
    // 跳过词条调用（key 里含中文是异常写法，这里只是兜底）
    zh += 1;
    if (samples.length < 3) samples.push(`${index + 1}: ${trimmed.slice(0, 100)}`);
  });
  if (zh || ternary) {
    totalZh += zh; totalTernary += ternary;
    report.push({ file: relative(process.cwd(), file).replace(/\\/g, "/"), zh, ternary, samples });
  }
}

report.sort((a, b) => b.zh - a.zh || b.ternary - a.ternary);
if (asJson) {
  console.log(JSON.stringify({ roots, files: report.length, totalHardcodedChineseLines: totalZh, totalLocaleBranches: totalTernary, report }, null, 2));
} else {
  console.log(`[i18n] 扫描：${roots.join(", ")}`);
  console.log(`[i18n] 文件 ${report.length} 个｜硬编码中文行 ${totalZh}｜isZh/locale 分支 ${totalTernary}`);
  console.log("");
  for (const row of report) {
    console.log(`  ${String(row.zh).padStart(4)} 中文 | ${String(row.ternary).padStart(3)} 分支 | ${row.file}`);
  }
  const worst = report.slice(0, 3);
  if (worst.length) {
    console.log("\n[i18n] 前三个文件的样例：");
    for (const row of worst) for (const sample of row.samples.slice(0, 2)) console.log(`  ${row.file} → ${sample}`);
  }
}
