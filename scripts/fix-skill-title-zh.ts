/**
 * 定向修复：把"仍是英文"的中文标题补成中文。
 *
 * 只处理 titleZh 里完全不含汉字的技能（说明 humanizeSkillName 当时缺词表），
 * 用 slug 反推目录名后重新 humanize；若新结果依然不含汉字则跳过，避免越改越差。
 * 已经含汉字的人工校准标题一律不动。
 *
 * 用法（仓库根目录）：
 *   npx tsx scripts/fix-skill-title-zh.ts [--apply]
 */

import { PrismaClient } from "@prisma/client";
import { humanizeSkillName, normalizeCjkSpacing } from "../src/lib/skill-bilingual";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const CJK = /[\u3400-\u9fff]/;

/** slug 形如 skill-xiaohongshu-ops，去掉前缀即得技能目录名。 */
function dirFromSlug(slug: string): string {
  return slug.replace(/^skill-/, "");
}

async function main() {
  const skills = await prisma.prompt.findMany({
    where: { type: "SKILL", deletedAt: null },
    select: { id: true, slug: true, titleZh: true },
    orderBy: { createdAt: "desc" },
  });

  let translated = 0;
  let normalized = 0;
  let skipped = 0;
  const samples: Array<{ before: string; after: string }> = [];

  for (const skill of skills) {
    const current = skill.titleZh ?? "";
    const dir = dirFromSlug(skill.slug ?? "");
    if (!dir) continue;

    let next: string | null = null;

    if (!CJK.test(current)) {
      // 仍是英文：重新 humanize，只有翻出汉字才采用
      const candidate = humanizeSkillName(dir);
      if (CJK.test(candidate)) {
        next = candidate;
        translated += 1;
      } else {
        skipped += 1;
      }
    } else {
      // 已有汉字：优先用（可能带人工校准的）humanize 结果；
      // 结果没变化时退化为中文字之间的空格归一化。
      const candidate = humanizeSkillName(dir);
      if (CJK.test(candidate) && candidate !== current) {
        next = candidate;
        normalized += 1;
      } else {
        const spaced = normalizeCjkSpacing(current);
        if (spaced !== current) {
          next = spaced;
          normalized += 1;
        }
      }
    }

    if (next === null) continue;

    if (samples.length < 60) {
      samples.push({ before: current || "(null)", after: next });
    }
    if (apply) {
      await prisma.prompt.update({
        where: { id: skill.id },
        data: { titleZh: next },
      });
    }
  }

  console.log(`技能总数: ${skills.length}`);
  console.log(`补译中文: ${translated}，空格归一化: ${normalized}，仍无中文词可译: ${skipped}`);
  console.log(apply ? "已写入数据库。" : "（预览模式，未写库；加 --apply 生效）");
  for (const s of samples) {
    console.log(`  ${s.before}  ->  ${s.after}`);
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
