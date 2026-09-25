import { db } from "@/lib/db";

/** 标签（tag）的后台读写。 */

export type TagCreateInput = {
  name: string;
  slug: string;
  color: string;
};

export type TagPatch = {
  name?: string;
  slug?: string;
  color?: string;
};

export function createTag(input: TagCreateInput) {
  return db.tag.create({
    data: {
      name: input.name,
      slug: input.slug,
      color: input.color,
    },
  });
}

export function updateTag(id: string, patch: TagPatch) {
  return db.tag.update({
    where: { id },
    data: {
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.slug ? { slug: patch.slug } : {}),
      ...(patch.color ? { color: patch.color } : {}),
    },
  });
}

export function deleteTag(id: string) {
  return db.tag.delete({ where: { id } });
}