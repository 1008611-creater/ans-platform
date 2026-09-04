/**
 * 一次性校验脚本：扫描 ai-video-skills-source 下所有 SKILL.md，
 * 用 scripts/lib/skill-frontmatter.ts 解析，统计仍然「畸形」的描述。
 * 用法：npx tsx scripts/_check_skill_meta.mjs（需 tsx 支持 .ts 导入）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseSkillFrontmatter, isBadDescription } from "./lib/skill-frontmatter.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const srcRoot = process.env.AI_VIDEO_SKILLS_SRC
  ? path.resolve(process.env.AI_VIDEO_SKILLS_SRC)
  : path.resolve(ROOT, "ai-video-skills-source");

const dirs = fs
  .readdirSync(srcRoot, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith("."))
  .map((e) => e.name)
  .filter((d) => fs.existsSync(path.join(srcRoot, d, "SKILL.md")))
  .sort();

let bad = 0;
const badList = [];
for (const dir of dirs) {
  const raw = fs.readFileSync(path.join(srcRoot, dir, "SKILL.md"), "utf-8").replace(/\r\n/g, "\n");
  const { name, description } = parseSkillFrontmatter(raw, dir);
  const isBad = isBadDescription(description, name, dir);
  if (isBad) {
    bad++;
    badList.push(`${dir} -> ${JSON.stringify(description)}`);
  }
}

console.log(`共 ${dirs.length} 套技能，畸形描述 ${bad} 条`);
for (const b of badList.slice(0, 40)) console.log("  ❌", b);

// 打印几个样本看看效果
for (const d of ["website-to-video", "web-typography", "xiaohongshu-ops", "tk-subtitles"]) {
  if (!dirs.includes(d)) continue;
  const raw = fs.readFileSync(path.join(srcRoot, d, "SKILL.md"), "utf-8").replace(/\r\n/g, "\n");
  const m = parseSkillFrontmatter(raw, d);
  console.log(`\n[样本] ${d}\n  name: ${m.name}\n  desc: ${m.description.slice(0, 120)}`);
}
