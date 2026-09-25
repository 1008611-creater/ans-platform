import { db } from "@/lib/db";

/** 分类（category）的后台读写。路由只负责鉴权、解析和缓存失效。 */

export type CategoryCreateInput = {
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: string | null;
  pinned: boolean;
};

export type CategoryPatch = {
  name?: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  parentId?: string | null;
  pinned?: boolean;
};

export function createCategory(input: CategoryCreateInput) {
  return db.category.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      icon: input.icon,
      parentId: input.parentId,
      pinned: input.pinned,
    },
  });
}

export function updateCategory(id: string, patch: CategoryPatch) {
  return db.category.update({
    where: { id },
    data: {
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.slug ? { slug: patch.slug } : {}),
      description: patch.description ?? undefined,
      icon: patch.icon ?? undefined,
      parentId: patch.parentId === null ? null : (patch.parentId || undefined),
      ...(typeof patch.pinned === "boolean" ? { pinned: patch.pinned } : {}),
    },
  });
}

export function deleteCategory(id: string) {
  return db.category.delete({ where: { id } });
}