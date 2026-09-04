import { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { localizedSkillTitle, localizedSkillDescription } from "@/lib/skill-bilingual";
import { unstable_cache } from "next/cache";
import { Network, ArrowRight, FolderTree } from "lucide-react";
import { db } from "@/lib/db";
import {
  SKILL_LAYERS,
  SKILL_DIR_LAYER,
  SKILL_ROUTES,
  SKILL_LAYER_EN,
} from "@/data/ai-video-skill-route";

export const metadata: Metadata = {
  title: "技能路由图",
  description: "全站技能分层路由图：AI 视频生产门、短剧链路、渠道、社媒运营、网页设计、工程与工具，及下游衔接关系。",
};

// 防止构建期静态预渲染触发数据库查询（无 DB 时会失败）
export const dynamic = "force-dynamic";

interface SkillNode {
  id: string;
  title: string;
  description: string | null;
  titleZh?: string | null;
  titleEn?: string | null;
  descriptionZh?: string | null;
  descriptionEn?: string | null;
  dir: string;
}

interface LayerBlock {
  key: string;
  label: string;
  labelEn?: string;
  description: string;
  descriptionEn?: string;
  skills: SkillNode[];
}

function getRoutingData(locale: string) {
  return unstable_cache(
  async (): Promise<LayerBlock[]> => {
    const layerKeys = SKILL_LAYERS.map((l) => l.key);

    const categories = await db.category.findMany({
      where: { slug: { in: layerKeys } },
      select: { id: true, slug: true, name: true, description: true, order: true },
    });

    // dir -> prompt id 映射，用于下游链接
    const dirToId = new Map<string, string>();

    const blocks: LayerBlock[] = [];
    for (const layer of SKILL_LAYERS) {
      const cat = categories.find((c) => c.slug === layer.key);
      // 空层（已被清理或尚未导入任何技能）不占版面，避免地图里出现空白块
      if (!cat) continue;
      const prompts = await db.prompt.findMany({
        where: {
          type: "SKILL",
          categoryId: cat.id,
          deletedAt: null,
          isUnlisted: false,
          isPrivate: false,
        },
        select: { id: true, title: true, titleZh: true, titleEn: true, description: true, descriptionZh: true, descriptionEn: true, slug: true },
        orderBy: { title: "asc" },
      });
      const skills: SkillNode[] = prompts.map((p) => {
        const dir = (p.slug || "").replace(/^skill-/, "");
        dirToId.set(dir, p.id);
        return {
          id: p.id,
          title: localizedSkillTitle(p, locale),
          description: localizedSkillDescription(p, locale),
          titleZh: p.titleZh,
          titleEn: p.titleEn,
          descriptionZh: p.descriptionZh,
          descriptionEn: p.descriptionEn,
          dir,
        };
      });
      if (skills.length > 0) {
        blocks.push({
          ...layer,
          label: locale === "en" ? (SKILL_LAYER_EN[layer.key]?.label || layer.label) : layer.label,
          description: locale === "en" ? (SKILL_LAYER_EN[layer.key]?.description || layer.description) : layer.description,
          skills,
        });
      }
    }

    return blocks;
  },
  ["skill-routing-map", locale],
  { tags: ["prompts"], revalidate: 300 }
  )();
}

export default async function SkillMapPage() {
  const locale = await getLocale();
  const blocks = await getRoutingData(locale);
  const totalSkills = blocks.reduce((n, b) => n + b.skills.length, 0);
  const hasData = totalSkills > 0;

  // 从 blocks 重建 dirToId 映射（下游链路跳转用）
  const dirToId = new Map<string, string>();
  for (const block of blocks) {
    for (const skill of block.skills) {
      dirToId.set(skill.dir, skill.id);
    }
  }

  return (
    <div className="container py-6">
      <div className="flex items-center gap-2 mb-1">
        <FolderTree className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">{locale === "en" ? "Skill Routing Map" : "技能路由图"}</h1>
        <span className="text-xs text-muted-foreground">
          {hasData ? (locale === "en" ? `${totalSkills} skills · ${blocks.length} layers` : `共 ${totalSkills} 套技能 · ${blocks.length} 层`) : ""}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {locale === "en"
          ? "All skills are organized by responsibility: AI video production, short drama, generation channels, social operations, web design, engineering, and productivity tools. Downstream links show the next recommended skill."
          : "全部技能按职责分层组织，从 AI 视频生产门、短剧链路、生成渠道，到社媒运营、网页设计、工程与效率工具。卡片上的「下游」指向衔接的下一步技能；点击任意技能进入详情，可在站内与提示词库共用搜索、标签与版本。"}
      </p>

      {!hasData && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          尚未导入技能数据。请先运行导入脚本：
          <code className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">
            npx tsx scripts/import-ai-video-skills.ts
          </code>
        </div>
      )}

      <div className="space-y-8">
        {blocks.map((block) => (
          <section key={block.key}>
            <div className="flex items-baseline gap-2 mb-3">
              <Network className="h-4 w-4 text-primary" />
              <h2 className="text-base font-medium">{block.label}</h2>
              <span className="text-xs text-muted-foreground">{locale === "en" ? `${block.skills.length} skills` : `${block.skills.length} 套`}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{block.description}</p>

            {block.skills.length === 0 ? (
              <p className="text-xs text-muted-foreground/70">（本层暂无技能）</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {block.skills.map((skill) => {
                  const downstream = (SKILL_ROUTES[skill.dir] || []).filter(
                    (d) => d !== skill.dir
                  );
                  return (
                    <div
                      key={skill.id}
                      className="rounded-lg border p-4 flex flex-col gap-2 hover:border-primary/50 transition-colors"
                    >
                      <Link
                        href={`/prompts/${skill.id}`}
                        className="font-medium text-sm hover:text-primary"
                      >
                        {skill.title}
                      </Link>
                      {skill.description && (
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {skill.description}
                        </p>
                      )}
                      {downstream.length > 0 && (
                        <div className="mt-auto pt-2">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground/70 mb-1">
                            {locale === "en" ? "Downstream" : "下游"}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {downstream.map((d) => {
                              const targetId = dirToId.get(d);
                              return targetId ? (
                                <Link
                                  key={d}
                                  href={`/prompts/${targetId}`}
                                  className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                >
                                  {locale === "en" ? d : d.replace(/-/g, " ")}
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              ) : (
                                <span
                                  key={d}
                                  className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground/60"
                                >
                                  {d}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
