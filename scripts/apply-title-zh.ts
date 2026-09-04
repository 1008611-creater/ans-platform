/**
 * 把人工补译的中文标题批量写回 titleZh。
 *
 * 背景：有一批技能的 titleZh 仍是英文（源 SKILL.md 的 name 本就是英文目录名），
 * 切到中文视图时标题显示成 "Laoda Perspective" 这类英文。译文由人工逐条定名后
 * 存成 JSON（键 = prompt.slug，值 = 中文标题），本脚本负责落库。
 *
 * 安全性：
 *  - 默认只预览，加 --apply 才写库；
 *  - 只覆盖 JSON 里出现的 slug；
 *  - 已经含中文的 titleZh 视为已处理，直接跳过（不用译文覆盖）；
 *
 * 用法（仓库根目录）：
 *   npx tsx scripts/apply-title-zh.ts ./tmp-title-zh.json [--apply]
 */

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const force = args.includes("--force");
const fileArg = args.find((a) => !a.startsWith("--")) ?? "";

if (!fileArg) {
  console.error("用法: npx tsx scripts/apply-title-zh.ts <translations.json> [--apply] [--force]");
  process.exit(1);
}

const CJK = /[㐀-鿿]/;

async function main() {
  const translations = JSON.parse(readFileSync(fileArg, "utf8")) as Record<string, string>;
  const entries = Object.entries(translations);

  const found = await prisma.prompt.findMany({
    where: { slug: { in: entries.map(([slug]) => slug) } },
    select: { id: true, slug: true, titleZh: true },
  });
  const bySlug = new Map(found.map((p) => [p.slug, p]));

  const missing: string[] = [];
  const updates: Array<{ id: string; slug: string; before: string; after: string }> = [];
  let skipped = 0;

  for (const [slug, zh] of entries) {
    const row = bySlug.get(slug);
    if (!row) {
      missing.push(slug);
      continue;
    }
    const before = row.titleZh ?? "";
    // 已有中文标题时默认不动，除非显式 --force
    if (!force && CJK.test(before)) {
      skipped += 1;
      continue;
    }
    if (zh.trim() === before.trim()) continue;
    updates.push({ id: row.id, slug, before, after: zh.trim() });
  }

  console.log(`译文条目: ${entries.length}`);
  console.log(`命中记录: ${found.length}`);
  console.log(`未匹配 slug: ${missing.length}${missing.length ? " -> " + missing.join(", ") : ""}`);
  console.log(`将更新: ${updates.length}`);
  console.log(`跳过（已有中文标题）: ${skipped}`);

  for (const u of updates.slice(0, 12)) {
    console.log(`  ${u.before || "(空)"}  ->  ${u.after}`);
  }
  if (updates.length > 12) console.log(`  ... 其余 ${updates.length - 12} 条`);

  if (apply) {
    for (const u of updates) {
      await prisma.prompt.update({ where: { id: u.id }, data: { titleZh: u.after } });
    }
    console.log(`\n已写入 ${updates.length} 条 titleZh。`);
  } else {
    console.log("\n（预览模式，未写库；加 --apply 生效）");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
