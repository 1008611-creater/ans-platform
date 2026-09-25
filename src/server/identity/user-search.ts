import { db } from "@/lib/db";

/**
 * 用户搜索：只返回公开身份字段（id / username / name / avatar）。
 *
 * 刻意不做邮箱、角色等敏感字段的投影，避免搜索结果成为账号枚举的入口。
 */
export const USER_SEARCH_LIMIT = 10;

export async function searchUsers(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return db.user.findMany({
    where: {
      OR: [
        { username: { contains: trimmed, mode: "insensitive" } },
        { name: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: { id: true, username: true, name: true, avatar: true },
    take: USER_SEARCH_LIMIT,
    orderBy: { username: "asc" },
  });
}