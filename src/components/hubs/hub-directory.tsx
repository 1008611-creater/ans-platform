import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Clapperboard, Code2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { HubDefinition } from "@/domain/hubs/registry";
import { hubProjects, hubWorkflowRecipes } from "@/domain/hubs/registry";
import type { CatalogWorkflowId } from "@/contracts/catalog";
import type { CatalogProject } from "@/domain/catalog/projects";
import styles from "./hubs.module.css";

const icons = { cauhub: GraduationCap, vibehub: BookOpen, aigc: Clapperboard, "full-stack": Code2 };
const hubCovers: Record<HubDefinition["slug"], string> = {
  cauhub: "/competitions/agrihackathon/gitglow-hub.webp",
  vibehub: "/catalog/gitglow-v1/cauai-one.webp",
  aigc: "/catalog/gitglow-v1/aigc-workspace.webp",
  "full-stack": "/catalog/gitglow-v1/ans-3d-showcase.svg",
};
const directHref: Partial<Record<HubDefinition["slug"], string>> = {
  vibehub: "/vibe-hub",
  cauhub: "/competitions/agrihackathon",
};
export async function HubDirectory({ hubs, published }: { memberCounts?: Readonly<Record<string,number|null>>; hubs: readonly HubDefinition[]; published: readonly CatalogProject[] | null; publishedRecipeIds: readonly CatalogWorkflowId[] | null }) {
  const t = await getTranslations("hubs");
  return <div className={styles.directory}>{hubs.map(hub => {
    const Icon = icons[hub.slug];
    const href = directHref[hub.slug] ?? `/hubs/${hub.slug}`;
    const projCount = published ? hubProjects(hub, published).length : 0;
    const ctaText = hub.slug === "vibehub" ? "直达 VibeHub" : hub.slug === "cauhub" ? "直达赛事会场" : "进入专题工坊";
    const highlight = hub.slug === "vibehub"
      ? "📚 交互式 AI 编程词条、课程与实战练习"
      : hub.slug === "cauhub"
        ? "🏆 ¥3,300 现金奖池 · 农大赛事与创客主会场"
        : hub.slug === "aigc"
          ? `🎬 ${hub.resources.length} 款在线 AI 创作工作台 + ${projCount} 个精选项目`
          : `💻 ${projCount} 个全栈开源项目 + 3D 简历工作流`;
    return <article key={hub.slug} className={styles.hub}>
      <Link href={href} className="block overflow-hidden rounded-xl" tabIndex={-1} aria-hidden="true">
        <img className={`${styles.cover} transition-transform duration-300 hover:scale-[1.02]`} src={hubCovers[hub.slug]} alt="" loading="lazy" />
      </Link>
      <div className={styles.identity}><Icon aria-hidden="true" /><span>{t(`types.${hub.organization.type}`)}</span></div>
      <h2><Link href={href}>{t(`items.${hub.slug}.name`)}<ArrowRight className="size-5" aria-hidden="true" /></Link></h2>
      <p>{t(`items.${hub.slug}.description`)}</p>
      <Link href={href} className="mt-auto flex items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-2.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10">
        <span className="truncate text-muted-foreground">{highlight}</span>
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary">{ctaText}<ArrowRight className="size-3.5" aria-hidden="true" /></span>
      </Link>
    </article>;
  })}</div>;
}
