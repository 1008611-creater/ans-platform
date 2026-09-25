import { db } from "@/lib/db";

/**
 * Slug 批量生成的后台查询。
 *
 * 真正的逐条更新仍然由路由里的 SSE 流驱动（需要逐条回推进度），
 * 这里只负责「取哪批数据」与「写一条」这两件事。
 */

export function listPromptsNeedingSlugs(regenerateAll: boolean) {
  const whereClause = regenerateAll ? { deletedAt: null } : { slug: null, deletedAt: null };
  return db.prompt.findMany({
    where: whereClause,
    select: { id: true, title: true },
  });
}

export function countSlugStatus() {
  return Promise.all([
    db.prompt.count({ where: { slug: null, deletedAt: null } }),
    db.prompt.count({ where: { deletedAt: null } }),
  ]).then(([promptsWithoutSlugs, totalPrompts]) => ({ promptsWithoutSlugs, totalPrompts }));
}

export function setPromptSlug(id: string, slug: string) {
  return db.prompt.update({ where: { id }, data: { slug } });
}