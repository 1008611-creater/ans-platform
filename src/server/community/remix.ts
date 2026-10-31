import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { catalogText } from "@/domain/catalog/content";
import { projectStartHref, resolveProjectCovers, type CatalogProject } from "@/domain/catalog/projects";
import { findPublishedCatalog, listPublishedCatalog } from "@/server/catalog/service";

/** 发帖弹窗里一次最多给几个候选项目。 */
export const REMIX_SEARCH_MAX = 8;

/** 帖子上附的项目广场项目。「做同款」直接去这个项目的开始入口，和项目详情页的主按钮一致。 */
export type RemixProject = { slug: string; title: string; summary: string; href: string; cover: string | null };

const authorSelect = { id: true, username: true, nickname: true, avatar: true } as const;
const VISIBLE = ["OPEN", "RESOLVED"] as const;

async function catalogTranslator() {
  const [t, locale] = await Promise.all([getTranslations("product"), getLocale().catch(() => "zh")]);
  return (project: CatalogProject, field: "title" | "summary") => catalogText(project, t, field, locale);
}

function toRemix(project: CatalogProject, text: (project: CatalogProject, field: "title" | "summary") => string): RemixProject {
  return {
    slug: project.slug,
    title: text(project, "title"),
    summary: text(project, "summary"),
    href: projectStartHref(project) ?? `/explore/${project.slug}`,
    cover: resolveProjectCovers(project).outerCoverUrl ?? null,
  };
}

/** 只认已经上架的项目；下架或不存在的项目不能附到帖子上。 */
export async function isPublishedCatalogSlug(slug: string) {
  return Boolean(await findPublishedCatalog(slug));
}

/** 信息流和详情页一次查好用到的项目；项目下架了就不再显示「做同款」。 */
export async function loadRemixProjects(slugs: Array<string | null | undefined>) {
  const wanted = new Set(slugs.filter((slug): slug is string => Boolean(slug)));
  const projects = new Map<string, RemixProject>();
  if (wanted.size === 0) return projects;
  const [catalog, text] = await Promise.all([listPublishedCatalog(), catalogTranslator()]);
  for (const project of catalog) if (wanted.has(project.slug)) projects.set(project.slug, toRemix(project, text));
  return projects;
}

/** 发帖弹窗搜项目：按标题和简介匹配；没输入时先给能直接开始做的官方项目。 */
export async function searchRemixProjects(query: string) {
  const [catalog, text] = await Promise.all([listPublishedCatalog(), catalogTranslator()]);
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? catalog.filter((project) => `${text(project, "title")} ${text(project, "summary")} ${project.slug}`.toLowerCase().includes(needle))
    : [...catalog].sort((a, b) => Number(Boolean(projectStartHref(b))) - Number(Boolean(projectStartHref(a))));
  return matches.slice(0, REMIX_SEARCH_MAX).map((project) => ({ slug: project.slug, title: text(project, "title") }));
}

/** 项目详情页上「社区里的同款」：附了这个项目、还看得到的帖子。 */
export async function listRemixPosts(slug: string, take = 6) {
  const where = { catalogSlug: slug, status: { in: [...VISIBLE] } };
  const [posts, total] = await Promise.all([
    db.communityPost.findMany({ where, orderBy: { createdAt: "desc" }, take, select: { id: true, title: true, body: true, images: true, author: { select: authorSelect } } }),
    countRemixPosts(slug),
  ]);
  return { posts, total };
}
export type RemixPost = Awaited<ReturnType<typeof listRemixPosts>>["posts"][number];

export async function countRemixPosts(slug: string) {
  return db.communityPost.count({ where: { catalogSlug: slug, status: { in: [...VISIBLE] } } });
}
