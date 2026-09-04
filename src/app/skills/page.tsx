import { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { Plus, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfinitePromptList } from "@/components/prompts/infinite-prompt-list";
import { SkillFilters } from "@/components/prompts/skill-filters";
import { ResponsiveFilters } from "@/components/prompts/responsive-filters";
import { FilterProvider } from "@/components/prompts/filter-context";
import { db } from "@/lib/db";
import { localizedSkillTitle, localizedSkillDescription, localizedSkillContent } from "@/lib/skill-bilingual";

export const metadata: Metadata = {
  title: "Skills",
  description: "Browse and discover AI agent skills",
};

// Query for skills list (cached)
function getCachedSkills(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orderBy: any,
  perPage: number,
  searchQuery?: string,
  categoryId?: string,
  tagSlugs?: string,
  locale = "zh"
) {
  const cacheKey = JSON.stringify({ orderBy, perPage, searchQuery, categoryId, tagSlugs, locale });
  
  return unstable_cache(
    async () => {
      const where: Record<string, unknown> = {
        type: "SKILL",
        isPrivate: false,
        isUnlisted: false,
        deletedAt: null,
      };

      if (searchQuery) {
        where.OR = [
          { title: { contains: searchQuery, mode: "insensitive" } },
          { titleZh: { contains: searchQuery, mode: "insensitive" } },
          { titleEn: { contains: searchQuery, mode: "insensitive" } },
          { content: { contains: searchQuery, mode: "insensitive" } },
          { contentZh: { contains: searchQuery, mode: "insensitive" } },
          { contentEn: { contains: searchQuery, mode: "insensitive" } },
          { description: { contains: searchQuery, mode: "insensitive" } },
          { descriptionZh: { contains: searchQuery, mode: "insensitive" } },
          { descriptionEn: { contains: searchQuery, mode: "insensitive" } },
        ];
      }
      if (categoryId) {
        where.categoryId = categoryId;
      }
      if (tagSlugs) {
        where.AND = tagSlugs.split(",").filter(Boolean).map((slug) => ({
          tags: { some: { tag: { slug } } },
        }));
      }

      const [skillsRaw, totalCount] = await Promise.all([
        db.prompt.findMany({
          where,
          orderBy,
          skip: 0,
          take: perPage,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
                verified: true,
              },
            },
            category: {
              include: {
                parent: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
            tags: {
              include: {
                tag: true,
              },
            },
            contributors: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true,
              },
            },
            _count: {
              select: {
                votes: true,
                contributors: true,
                outgoingConnections: { where: { label: { not: "related" } } },
                incomingConnections: { where: { label: { not: "related" } } },
              },
            },
          },
        }),
        db.prompt.count({ where }),
      ]);

      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        skills: skillsRaw.map((p: any) => ({
          ...p,
          title: localizedSkillTitle(p, locale),
          description: localizedSkillDescription(p, locale),
          content: localizedSkillContent(p, locale),
          voteCount: p._count.votes,
          contributorCount: p._count.contributors,
          contributors: p.contributors,
        })),
        total: totalCount,
      };
    },
    ["skills", cacheKey],
    // 导入脚本在 Next 进程之外直接写库，无法调用 revalidateTag，
    // 因此这里给一个兜底过期时间，保证数据最多滞后 5 分钟。
    { tags: ["prompts"], revalidate: 300 }
  )();
}

interface SkillsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    tag?: string;
    sort?: string;
  }>;
}

export default async function SkillsPage({ searchParams }: SkillsPageProps) {
  const t = await getTranslations("prompts");
  const tNav = await getTranslations("nav");
  const tSearch = await getTranslations("search");
  const locale = await getLocale();
  const params = await searchParams;
  const [categories, tags] = await Promise.all([
    db.category.findMany({
      // 只列真正挂了技能的分类：用户给提示词自建的分类、以及被清空的层不该出现在技能筛选器里
      where: {
        prompts: { some: { type: "SKILL", isPrivate: false, isUnlisted: false, deletedAt: null } },
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, parentId: true },
    }),
    db.tag.findMany({ orderBy: { name: "asc" } }),
  ]);
  
  const perPage = 24;

  // Build order by clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any = { createdAt: "desc" };
  if (params.sort === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (params.sort === "upvotes") {
    orderBy = { votes: { _count: "desc" } };
  }

  const result = await getCachedSkills(orderBy, perPage, params.q, params.category, params.tag, locale);
  const skills = result.skills;
  const total = result.total;

  return (
    <div className="container py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold">{tNav("skills")}</h1>
          <span className="text-xs text-muted-foreground">{tSearch("found", { count: total })}</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button size="sm" variant="outline" className="h-8 text-xs w-full sm:w-auto" asChild>
            <Link href="/skills/map">
              <Network className="h-3.5 w-3.5 mr-1" />
              {t("skillRouteMap")}
            </Link>
          </Button>
          <Button size="sm" className="h-8 text-xs w-full sm:w-auto" asChild>
            <Link href="/prompts/new?type=SKILL">
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t("createSkill")}
            </Link>
          </Button>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground mb-6">
        {t("skillsDescription")}
      </p>

      <FilterProvider>
        <div className="flex flex-col lg:flex-row gap-6">
          <ResponsiveFilters title={tSearch("filterSkills")} resultLabel={tSearch("viewResults")}>
            <SkillFilters
              categories={categories}
              tags={tags}
              currentFilters={params}
            />
          </ResponsiveFilters>
          <main className="flex-1 min-w-0">
            <InfinitePromptList
              initialPrompts={skills}
              initialTotal={total}
              filters={{
                q: params.q,
                type: "SKILL",
                category: params.category,
                categorySlug: categories.find((c) => c.id === params.category)?.slug,
                tag: params.tag,
                sort: params.sort,
              }}
            />
          </main>
        </div>
      </FilterProvider>
    </div>
  );
}
