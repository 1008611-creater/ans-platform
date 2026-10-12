import productEn from "@/../messages/product/en.json";
import { findPublishedCatalog, listPublishedCatalog } from "@/server/catalog/service";
import { catalogText } from "@/domain/catalog/content";
import productZh from "@/../messages/product/zh.json";
import { safeAwardGrowthEvent } from "@/server/growth/service";
import { db } from "@/lib/db";
import { findPublishedPlatformRecipe } from "@/server/workflows/platform-recipes";
import vibeTerms from "@/data/vibehub/terms.json";
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
  if (targetType === "PROJECT") {
    const project = await findPublishedCatalog(targetId);
    if (!project) throw new FavoriteServiceError("Project is unavailable.", "TARGET_UNAVAILABLE", 404);
    return { title: project.slug, href: `/explore/${project.slug}`, subtitle: null, authorName: null, costPoints: null };
  }
  if (targetType === "PROMPT") {
    const prompt = await db.prompt.findFirst({
      where: { id: targetId, deletedAt: null, isPrivate: false },
      select: { id: true, slug: true, title: true, description: true, author: { select: { id: true, nickname: true } } },
    });
    if (!prompt) throw new FavoriteServiceError("提示词不存在或已下架。", "TARGET_UNAVAILABLE", 404);
    return {
      title: prompt.title,
      href: prompt.slug ? `/prompts/${prompt.slug}` : `/prompts/${prompt.id}`,
      subtitle: prompt.description ?? null,
      authorId: prompt.author?.id,
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
        author: { select: { id: true, nickname: true } },
      },
    });
    if (!template) throw new FavoriteServiceError("模板不存在或尚未上架。", "TARGET_UNAVAILABLE", 404);
    return {
      title: template.title,
      href: `/templates/${template.slug}`,
      subtitle: template.summary ?? null,
      authorId: template.author?.id,
      authorName: template.author?.nickname?.trim() || null,
      costPoints: template.estimatedCost,
    };
  }

  if (targetType === "VIBEHUB_TERM") {
    const term = vibeTerms.find((item) => item.slug === targetId);
    if (!term) throw new FavoriteServiceError("VibeHub term not found.", "TARGET_UNAVAILABLE", 404);
    return {
      title: term.name,
      href: `/vibe-hub/${term.slug}`,
      subtitle: term.description ?? null,
      authorName: "VibeHub",
      costPoints: null,
    };
  }

  let workflow = await db.workflow.findFirst({
    where: { id: targetId, status: "PUBLISHED", publishedVersion: { not: null }, isOfficial: false, author: { deletedAt: null, flagged: false } },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      estimatedCost: true,
      author: { select: { id: true, nickname: true } },
    },
  });
  if (!workflow) {
    const platform = await findPublishedPlatformRecipe(targetId);
    if (platform?.workflow.id === targetId) workflow = platform.workflow;
  }
  if (!workflow) throw new FavoriteServiceError("工作流不存在或尚未发布。", "TARGET_UNAVAILABLE", 404);
  return {
    title: workflow.title,
    href: `/workflows/${workflow.slug}`,
    subtitle: workflow.summary ?? null,
    authorId: workflow.author?.id,
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
  const target = await assertTargetVisible(targetType, id);

  return db.$transaction(async (tx) => {
    const inserted = await tx.contentFavorite.createMany({ data: [{ userId, targetType, targetId: id }], skipDuplicates: true });
    if (inserted.count === 0) return { favorited: true, created: false };

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
  }).then(async (result) => {
    if (result.created && target.authorId && target.authorId !== userId) await safeAwardGrowthEvent({ userId: target.authorId, type: "RECEIVE_FAVORITE", reason: "RECEIVE_FAVORITE", sourceType: `favorite:${targetType}`, sourceId: `${userId}:${id}` });
    return result;
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

/** Retired favorites remain stored; filter before taking a page to avoid starvation. */
export async function listFavorites(userId: string, take = 100, targetType?: FavoriteTargetType, locale = "zh"): Promise<FavoriteTargetSummary[]> {
  const active: FavoriteTargetType[] = ["PROJECT", "WORKFLOW", "VIBEHUB_TERM"];
  if (targetType && !active.includes(targetType)) return [];
  const rows = await db.contentFavorite.findMany({
    where: { userId, targetType: targetType ?? { in: active } },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(Number.isFinite(take) ? Math.floor(take) : 100, 1), targetType === "VIBEHUB_TERM" ? vibeTerms.length : 200),
  });
  if (!rows.length) return [];
  const [projects, workflows] = await Promise.all([
    rows.some(row => row.targetType === "PROJECT") ? listPublishedCatalog() : Promise.resolve([]),
    db.workflow.findMany({
      where: { id: { in: rows.filter(row => row.targetType === "WORKFLOW").map(row => row.targetId) }, status: "PUBLISHED", publishedVersion: { not: null }, isOfficial: false, author: { deletedAt: null, flagged: false } },
      select: { id: true, slug: true, title: true, summary: true, estimatedCost: true, author: { select: { nickname: true } } },
    }),
  ]);
  const wantedPlatform = rows.some(row => row.targetType === "WORKFLOW" && !workflows.some(w => w.id === row.targetId));
  if (wantedPlatform) {
    const platform = await findPublishedPlatformRecipe();
    if (platform && rows.some(row => row.targetType === "WORKFLOW" && row.targetId === platform.workflow.id)) workflows.push(platform.workflow);
  }
  const projectBySlug = new Map(projects.map(project => [project.slug, project]));
  const workflowById = new Map(workflows.map(workflow => [workflow.id, workflow]));
  const translate = (key: string): string => {
    let value: unknown = locale.startsWith("zh") ? productZh : productEn;
    for (const part of key.split(".")) value = value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined;
    return typeof value === "string" ? value : key;
  };
  return rows.flatMap<FavoriteTargetSummary>(row => {
    const base = { targetType: row.targetType as FavoriteTargetType, targetId: row.targetId, favoritedAt: row.createdAt };
    if (row.targetType === "PROJECT") {
      const project = projectBySlug.get(row.targetId);
      return project ? [{ ...base, title: catalogText(project, translate, "title", locale), href: `/explore/${project.slug}`, subtitle: catalogText(project, translate, "summary", locale), authorName: project.creator ?? null, costPoints: null }] : [];
    }
    if (row.targetType === "VIBEHUB_TERM") {
      const term = vibeTerms.find(item => item.slug === row.targetId);
      return term ? [{ ...base, title: term.name, href: `/vibe-hub/${term.slug}`, subtitle: term.description ?? null, authorName: "VibeHub", costPoints: null }] : [];
    }
    if (row.targetType !== "WORKFLOW") return [];
    const workflow = workflowById.get(row.targetId);
    return workflow ? [{ ...base, title: workflow.title, href: `/workflows/${workflow.slug}`, subtitle: workflow.summary ?? null, authorName: workflow.author?.nickname?.trim() || null, costPoints: workflow.estimatedCost }] : [];
  });
}
