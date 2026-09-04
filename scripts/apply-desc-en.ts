/**
 * 把人工审校过的英文描述批量写回 descriptionEn。
 *
 * 背景：200 套技能里有一批 descriptionEn 仍然是中文（源 SKILL.md 由中文撰写），
 * 切到英文视图时描述一栏还是中文。译文由人工逐条审校后存成 JSON
 * （键 = prompt.slug，值 = 英文描述），本脚本负责落库。
 *
 * 安全性：
 *  - 默认只预览，加 --apply 才写库；
 *  - 只覆盖 JSON 里出现的 slug，其它记录一律不动；
 *  - 跳过译文为空或仍为纯中文的条目（打印出来供人工复核）；
 *
 * 用法（仓库根目录）：
 *   npx tsx scripts/apply-desc-en.ts ./tmp-desc-en.json [--apply]
 */

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const fileArg = args.find((a) => !a.startsWith("--")) ?? "";

if (!fileArg) {
  console.error("用法: npx tsx scripts/apply-desc-en.ts <translations.json> [--apply]");
  process.exit(1);
}

const CJK = /[㐀-鿿]/;

function hasChinese(text: string): boolean {
  return CJK.test(text);
}

/** 粗略判断：已经像英文（中文占比低于 12%）就允许写入 */
function looksTranslated(cn: string, en: string): boolean {
  if (!en || !en.trim()) return false;
  if (!hasChinese(cn)) return true; // 原文没中文，本来就不用翻
  const cnCount = (en.match(/[㐀-鿿]/g) ?? []).length;
  const total = en.replace(/\s/g, "").length || 1;
  return cnCount / total < 0.12;
}

async function main() {
  const raw = readFileSync(fileArg, "utf8");
  const translations = JSON.parse(raw) as Record<string, string>;
  const entries = Object.entries(translations);

  const slugs = entries.map(([slug]) => slug);
  const found = await prisma.prompt.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, descriptionEn: true },
  });
  const bySlug = new Map(found.map((p) => [p.slug, p]));

  const missing: string[] = [];
  const skippedSample: Array<{ slug: string; reason: string }> = [];
  let toUpdate = 0;
  let skipped = 0;
  const updates: Array<{ id: string; slug: string; before: string; after: string }> = [];

  for (const [slug, en] of entries) {
    const row = bySlug.get(slug);
    if (!row) {
      missing.push(slug);
      continue;
    }
    const before = row.descriptionEn ?? "";
    if (!looksTranslated(before, en)) {
      skipped += 1;
      if (skippedSample.length < 10) {
        skippedSample.push({ slug, reason: "译文仍以中文为主" });
      }
      continue;
    }
    if (en.trim() === before.trim()) continue;
    toUpdate += 1;
    updates.push({ id: row.id, slug, before, after: en.trim() });
  }

  console.log(`译文条目: ${entries.length}`);
  console.log(`命中记录: ${found.length}`);
  console.log(`未匹配 slug: ${missing.length}${missing.length ? " -> " + missing.join(", ") : ""}`);
  console.log(`将更新: ${toUpdate}`);
  console.log(`跳过（译文仍中文）: ${skipped}`);
  for (const s of skippedSample) console.log(`  skip ${s.slug}: ${s.reason}`);

  for (const u of updates.slice(0, 8)) {
    console.log(`\n[${u.slug}]`);
    console.log(`  before: ${u.before.slice(0, 90)}`);
    console.log(`  after : ${u.after.slice(0, 90)}`);
  }

  if (apply) {
    for (const u of updates) {
      await prisma.prompt.update({
        where: { id: u.id },
        data: { descriptionEn: u.after },
      });
    }
    console.log(`\n已写入 ${updates.length} 条 descriptionEn。`);
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
