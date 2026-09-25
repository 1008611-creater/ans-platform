/** 一次性演练：验证遗留 collections → content_favorites 回填迁移的真实行为与幂等性。 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const db = new PrismaClient();
const sql = readFileSync(
  "prisma/migrations/20260921030000_backfill_collections_into_favorites/migration.sql",
  "utf8",
);

async function main() {
  const student = await db.user.findFirstOrThrow({
    where: { email: { startsWith: "student-" } },
    orderBy: { createdAt: "desc" },
  });
  const author = await db.user.findFirstOrThrow({
    where: { email: { startsWith: "author-" } },
    orderBy: { createdAt: "desc" },
  });

  const prompt = await db.prompt.create({
    data: {
      title: "遗留收藏目标",
      content: "内容",
      authorId: author.id,
      slug: `legacy-target-${Date.now()}`,
    },
  });
  await db.collection.create({ data: { userId: student.id, promptId: prompt.id } });

  const where = { userId: student.id, targetType: "PROMPT" as const, targetId: prompt.id };
  const before = await db.contentFavorite.count({ where });
  await db.$executeRawUnsafe(sql);
  const afterOnce = await db.contentFavorite.count({ where });
  await db.$executeRawUnsafe(sql);
  const afterTwice = await db.contentFavorite.count({ where });

  const migrated = await db.contentFavorite.findFirst({ where });
  const keepsDate =
    migrated?.id.startsWith("fav_migrated_") === true &&
    Math.abs((migrated.createdAt.getTime() ?? 0) - Date.now()) < 60_000;

  console.log(`回填前 content_favorites 行数: ${before}`);
  console.log(`回填一次后: ${afterOnce}`);
  console.log(`回填两次后（幂等）: ${afterTwice}`);
  console.log(`迁移行保留原收藏时间与可识别前缀: ${keepsDate ? "是" : "否"}`);
  console.log(
    before === 0 && afterOnce === 1 && afterTwice === 1 && keepsDate
      ? "PASS 遗留收藏回填正确且幂等"
      : "FAIL 遗留收藏回填不符合预期",
  );
}

main()
  .catch((error) => {
    console.error("演练异常", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
