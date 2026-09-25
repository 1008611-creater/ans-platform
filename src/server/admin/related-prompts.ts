import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** 「相关提示词」批量生成：取出所有带向量的公开提示词。 */

export async function isAdminUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "ADMIN";
}

export function listPromptsWithEmbeddings() {
  return db.prompt.findMany({
    where: {
      isPrivate: false,
      isUnlisted: false,
      deletedAt: null,
      embedding: { not: Prisma.DbNull },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
}
