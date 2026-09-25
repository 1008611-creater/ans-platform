import { db } from "@/lib/db";
import {
  FAVORITE_TARGET_TYPES,
  type FavoriteTargetType,
} from "@/contracts/favorites";

/**
 * 统一收藏服务：Prompt / 模板 / 工作流共用一张 content_favorites 表。
 *
 * 规则：
 * - 只能收藏「当前可公开访问」的对象，避免收藏夹里出现死链；
 * - 收藏与取消收藏都写审计日志；
 * - 列表接口会重新校验目标可用性，已下架对象直接跳过。
 */

export class FavoriteServiceError extends Error {
  constructor(
    message: string,
    public readonly code = "FAVORITE_ERROR",
    public readonly status = 400,
  ) {
    super(message);
    this.name = "FavoriteServiceError";
  }
}

export function isFavoriteTargetType(value: unknown): value is FavoriteTargetType {
  return typeof value === "string" && (FAVORITE_TARGET_TYPES as readonly string[]).includes(value);
}

export type FavoriteTargetSummary = {
  targetType: FavoriteTargetType;
  targetId: string;
  title: string;
  href: string;
  subtitle: string | null;
  authorName: string | null;
  costPoints: number | null;
  favoritedAt: Date;
};

async function assertTargetVisible(targetType: FavoriteTargetType, targetId: string) {
  if (targetType === "PROMPT") {
    const prompt = await db.prompt.findFirst({
      where: { id: targetId, deletedAt: null, isPrivate: false },
      select: { id: true, slug: true, title: true, description: true, author: { select: { nickname: true } } },
    });
    if (!prompt) throw new FavoriteServiceError("提示词不存在或已下架。", "TARGET_UNAVAILABLE", 404);
    return {
      title: prompt.title,
      href: prompt.slug ? `/prompts/${prompt.slug}` : `/prompts/${prompt.id}`,
      subtitle: prompt.description ?? null,
      authorName: prompt.author?.nickname?.trim() || null,
      costPoints: null,
    };
  }

  if (targetType === "TEMPLATE") {
    const template = await db.template.findFirst({
      where: { id: targetId, status: "PUBLISHED" },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        estimatedCost: true,
        author: { select: { nickname: true } },
      },
    });
    if (!template) throw new FavoriteServiceError("模板不存在或尚未上架。", "TARGET_UNAVAILABLE", 404);
    return {
      title: template.title,
      href: `/templates/${template.slug}`,
      subtitle: template.summary ?? null,
      authorName: template.author?.nickname?.trim() || null,
      costPoints: template.estimatedCost,
    };
  }

  const workflow = await db.workflow.findFirst({
    where: { id: targetId, status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      estimatedCost: true,
      author: { select: { nickname: true } },
    },
  });
  if (!workflow) throw new FavoriteServiceError("工作流不存在或尚未发布。", "TARGET_UNAVAILABLE", 404);
  return {
    title: workflow.title,
    href: `/workflows/${workflow.slug}`,
    subtitle: workflow.summary ?? null,
    authorName: workflow.author?.nickname?.trim() || null,
    costPoints: workflow.estimatedCost,
  };
}

export async function addFavorite(userId: string, targetType: unknown, targetId: unknown) {
  if (!isFavoriteTargetType(targetType)) {
    throw new FavoriteServiceError("收藏类型无效。", "INVALID_TARGET_TYPE");
  }
  if (typeof targetId !== "string" || !targetId.trim()) {
    throw new FavoriteServiceError("缺少收藏对象。", "INVALID_TARGET_ID");
  }
  const id = targetId.trim();
  await assertTargetVisible(targetType, id);

  return db.$transaction(async (tx) => {
    const existing = await tx.contentFavorite.findUnique({
      where: { userId_targetType_targetId: { userId, targetType, targetId: id } },
      select: { id: true },
    });
    if (existing) return { favorited: true, created: false };

    await tx.contentFavorite.create({ data: { userId, targetType, targetId: id } });
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "FAVORITE_ADDED",
        resourceType: "content_favorite",
        resourceId: id,
        metadata: { targetType },
      },
    });
    return { favorited: true, created: true };
  });
}

export async function removeFavorite(userId: string, targetType: unknown, targetId: unknown) {
  if (!isFavoriteTargetType(targetType)) {
    throw new FavoriteServiceError("收藏类型无效。", "INVALID_TARGET_TYPE");
  }
  if (typeof targetId !== "string" || !targetId.trim()) {
    throw new FavoriteServiceError("缺少收藏对象。", "INVALID_TARGET_ID");
  }
  const id = targetId.trim();

  return db.$transaction(async (tx) => {
    const deleted = await tx.contentFavorite.deleteMany({
      where: { userId, targetType, targetId: id },
    });
    if (deleted.count !== 1) return { favorited: false, removed: false };
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "FAVORITE_REMOVED",
        resourceType: "content_favorite",
        resourceId: id,
        metadata: { targetType },
      },
    });
    return { favorited: false, removed: true };
  });
}

export function isFavorited(userId: string, targetType: FavoriteTargetType, targetId: string) {
  return db.contentFavorite
    .findUnique({
      where: { userId_targetType_targetId: { userId, targetType, targetId } },
      select: { id: true },
    })
    .then((row) => Boolean(row));
}

/** 收藏列表：按收藏时间倒序，并跳过已经不可访问的对象。 */
export async function listFavorites(userId: string, take = 100): Promise<FavoriteTargetSummary[]> {
  const rows = await db.contentFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(take, 1), 200),
  });
  if (rows.length === 0) return [];

  const byType = <T extends FavoriteTargetType>(type: T) =>
    rows.filter((row) => row.targetType === type).map((row) => row.targetId);

  const [prompts, templates, workflows] = await Promise.all([
    db.prompt.findMany({
      where: { id: { in: byType("PROMPT") }, deletedAt: null, isPrivate: false },
      select: { id: true, slug: true, title: true, description: true, author: { select: { nickname: true } } },
    }),
    db.template.findMany({
      where: { id: { in: byType("TEMPLATE") }, status: "PUBLISHED" },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        estimatedCost: true,
        author: { select: { nickname: true } },
      },
    }),
    db.workflow.findMany({
      where: { id: { in: byType("WORKFLOW") }, status: "PUBLISHED" },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        estimatedCost: true,
        author: { select: { nickname: true } },
      },
    }),
  ]);

  const promptById = new Map(prompts.map((item) => [item.id, item]));
  const templateById = new Map(templates.map((item) => [item.id, item]));
  const workflowById = new Map(workflows.map((item) => [item.id, item]));

  const items: FavoriteTargetSummary[] = [];
  for (const row of rows) {
    if (row.targetType === "PROMPT") {
      const prompt = promptById.get(row.targetId);
      if (!prompt) continue;
      items.push({
        targetType: "PROMPT",
        targetId: prompt.id,
        title: prompt.title,
        href: prompt.slug ? `/prompts/${prompt.slug}` : `/prompts/${prompt.id}`,
        subtitle: prompt.description ?? null,
        authorName: prompt.author?.nickname?.trim() || null,
        costPoints: null,
        favoritedAt: row.createdAt,
      });
      continue;
    }
    if (row.targetType === "TEMPLATE") {
      const template = templateById.get(row.targetId);
      if (!template) continue;
      items.push({
        targetType: "TEMPLATE",
        targetId: template.id,
        title: template.title,
        href: `/templates/${template.slug}`,
        subtitle: template.summary ?? null,
        authorName: template.author?.nickname?.trim() || null,
        costPoints: template.estimatedCost,
        favoritedAt: row.createdAt,
      });
      continue;
    }
    const workflow = workflowById.get(row.targetId);
    if (!workflow) continue;
    items.push({
      targetType: "WORKFLOW",
      targetId: workflow.id,
      title: workflow.title,
      href: `/workflows/${workflow.slug}`,
      subtitle: workflow.summary ?? null,
      authorName: workflow.author?.nickname?.trim() || null,
      costPoints: workflow.estimatedCost,
      favoritedAt: row.createdAt,
    });
  }

  return items;
}
