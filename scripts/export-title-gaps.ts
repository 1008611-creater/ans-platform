/**
 * 导出「中文标题仍为英文」的技能条目，供人工补译。
 * 用法：npx tsx scripts/export-title-gaps.ts > /tmp/title-gap.json
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CJK = /[㐀-鿿]/;

async function main() {
  const rows = await prisma.prompt.findMany({
    where: { deletedAt: null },
    select: { slug: true, titleZh: true, titleEn: true, descriptionZh: true, descriptionEn: true },
    orderBy: { slug: "asc" },
  });

  const gaps = rows
    .filter((r) => r.titleZh && !CJK.test(r.titleZh))
    .map((r) => ({
      slug: r.slug,
      titleEn: r.titleEn,
      hint: (r.descriptionZh || r.descriptionEn || "").replace(/\s+/g, " ").slice(0, 120),
    }));

  console.log(JSON.stringify(gaps, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
