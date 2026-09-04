/**
 * 导出仍需英文化的技能字段，供离线翻译后回填。
 *
 * 用法：
 *   npx tsx scripts/export-en-gaps.ts desc > /tmp/desc-gap.json
 *   npx tsx scripts/export-en-gaps.ts content > /tmp/content-gap.json
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const mode = process.argv[2] ?? "desc";

async function main() {
  const skills = await prisma.prompt.findMany({
    where: { type: "SKILL", deletedAt: null },
    select: { id: true, slug: true, titleEn: true, descriptionEn: true, contentEn: true },
    orderBy: { createdAt: "desc" },
  });

  const items = skills
    .filter((s) => /[\u3400-\u9fff]/.test(mode === "content" ? s.contentEn ?? "" : s.descriptionEn ?? ""))
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      titleEn: s.titleEn,
      text: (mode === "content" ? s.contentEn : s.descriptionEn) ?? "",
    }));

  process.stdout.write(JSON.stringify(items, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
