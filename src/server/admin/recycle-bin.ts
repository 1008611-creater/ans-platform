import { db } from "@/lib/db";

/**
 * 回收站：列出已软删除的用户 / 内容，并支持恢复。
 *
 * 恢复动作本身只改 `deletedAt`；审计日志由路由层写入，
 * 因为那里才有请求上下文（actorId）。
 */

export const RECYCLE_BIN_MAX_LIMIT = 100;
export const RECYCLE_BIN_DEFAULT_LIMIT = 20;

export type RecycleBinType = "PROMPT" | "SKILL" | "USER";

export function normalizeRecycleBinType(raw: string | null | undefined): RecycleBinType {
  if (raw === "USER") return "USER";
  if (raw === "SKILL") return "SKILL";
  return "PROMPT";
}

export function normalizePagination(page: number, limit: number) {
  return {
    page: Math.max(1, page || 1),
    limit: Math.min(RECYCLE_BIN_MAX_LIMIT, Math.max(1, limit || RECYCLE_BIN_DEFAULT_LIMIT)),
  };
}

const userSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  role: true,
  deletedAt: true,
} as const;

const promptSelect = {
  id: true,
  title: true,
  type: true,
  slug: true,
  deletedAt: true,
  author: { select: { username: true, name: true } },
} as const;

export async function listDeletedUsers(page: number, limit: number) {
  const where = { deletedAt: { not: null } };
  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { deletedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: userSelect,
    }),
    db.user.count({ where }),
  ]);
  return { items, total };
}

export async function listDeletedPrompts(type: RecycleBinType, page: number, limit: number) {
  const where = {
    deletedAt: { not: null },
    ...(type === "SKILL" ? { type: "SKILL" as const } : { type: { not: "SKILL" as const } }),
  };
  const [items, total] = await Promise.all([
    db.prompt.findMany({
      where,
      orderBy: { deletedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: promptSelect,
    }),
    db.prompt.count({ where }),
  ]);
  return { items, total };
}

export async function findDeletedUser(id: string) {
  return db.user.findFirst({ where: { id, deletedAt: { not: null } }, select: userSelect });
}

export async function restoreUser(id: string) {
  return db.user.update({ where: { id }, data: { deletedAt: null }, select: userSelect });
}

export async function findDeletedPrompt(id: string) {
  return db.prompt.findFirst({
    where: { id, deletedAt: { not: null } },
    select: { id: true, title: true, type: true, deletedAt: true },
  });
}

export async function restorePrompt(id: string) {
  return db.prompt.update({
    where: { id },
    data: { deletedAt: null },
    select: { id: true, title: true, type: true, deletedAt: true },
  });
}