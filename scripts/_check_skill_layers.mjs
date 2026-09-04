/**
 * 分层校验（只读，不碰数据库）：按 SKILL_DIR_LAYER > SKILL_LAYER_RULES > other 的优先级
 * 对 ai-video-skills-source 下全部技能做一次归类，打印分布与未命中显式映射的技能。
 *
 * 用法： npx tsx scripts/_check_skill_layers.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  SKILL_LAYERS,
  SKILL_DIR_LAYER,
  SKILL_LAYER_RULES,
  SKILL_TAG_RULES,
} from "../src/data/ai-video-skill-route.ts";
import { parseSkillFrontmatter } from "./lib/skill-frontmatter.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const srcRoot = path.join(ROOT, "ai-video-skills-source");

function resolveLayer(dir, name, description) {
  const explicit = SKILL_DIR_LAYER[dir];
  if (explicit) return { layer: explicit, via: "explicit" };
  const hay = `${dir} ${name} ${description}`.toLowerCase();
  for (const rule of SKILL_LAYER_RULES) {
    if (rule.keywords.some((k) => hay.includes(k.toLowerCase()))) {
      return { layer: rule.layer, via: "rule" };
    }
  }
  return { layer: "other", via: "fallback" };
}

const dirs = fs
  .readdirSync(srcRoot, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith("."))
  .map((e) => e.name)
  .filter((d) => fs.existsSync(path.join(srcRoot, d, "SKILL.md")))
  .sort();

const labelByKey = Object.fromEntries(SKILL_LAYERS.map((l) => [l.key, l.label]));
const counts = new Map();
const byRule = [];
const unresolved = [];
let tagTotal = 0;

for (const dir of dirs) {
  const raw = fs.readFileSync(path.join(srcRoot, dir, "SKILL.md"), "utf-8").replace(/\r\n/g, "\n");
  const { name, description } = parseSkillFrontmatter(raw, dir);
  const { layer, via } = resolveLayer(dir, name, description);
  const label = labelByKey[layer] ?? layer;
  counts.set(label, (counts.get(label) ?? 0) + 1);
  if (via !== "explicit") byRule.push({ dir, label, via });

  const hay = `${dir} ${name} ${description}`.toLowerCase();
  const auto = SKILL_TAG_RULES.filter((r) => r.keywords.some((k) => hay.includes(k.toLowerCase())));
  tagTotal += auto.length;
  if (auto.length === 0) unresolved.push(dir);
}

console.log(`共 ${dirs.length} 套技能\n`);
console.log("分层分布（按 order）：");
for (const layer of [...SKILL_LAYERS].sort((a, b) => a.order - b.order)) {
  const n = counts.get(layer.label) ?? 0;
  const bar = "█".repeat(Math.min(n, 40));
  console.log(`  ${String(n).padStart(3)}  ${layer.label.padEnd(10)} ${bar}`);
}
const mapped = new Set(Object.keys(SKILL_DIR_LAYER));
console.log(`\n未命中显式映射、靠规则/兜底归类的：${byRule.length} 套`);
for (const r of byRule) console.log(`  · ${r.dir} -> ${r.label} (${r.via})`);
const orphan = dirs.filter((d) => !mapped.has(d));
if (orphan.length) console.log(`\n⚠️  完全未映射的目录：${orphan.join(", ")}`);
console.log(`\n自动标签命中总数：${tagTotal}；零自动标签的技能：${unresolved.length}`);
if (unresolved.length) console.log(`  ${unresolved.join(", ")}`);
