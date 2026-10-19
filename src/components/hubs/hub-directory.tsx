import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Clapperboard, Code2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { HubDefinition } from "@/domain/hubs/registry";
import { hubProjects, hubWorkflowRecipes } from "@/domain/hubs/registry";
import type { CatalogWorkflowId } from "@/contracts/catalog";
import type { CatalogProject } from "@/domain/catalog/projects";
import styles from "./hubs.module.css";

const icons = { cauhub: GraduationCap, vibehub: BookOpen, aigc: Clapperboard, "full-stack": Code2 };
export async function HubDirectory({ hubs, published, publishedRecipeIds, memberCounts }: { memberCounts?: Readonly<Record<string,number|null>>; hubs: readonly HubDefinition[]; published: readonly CatalogProject[] | null; publishedRecipeIds: readonly CatalogWorkflowId[] | null }) {
  const t = await getTranslations("hubs");
  return <div className={styles.directory}>{hubs.map(hub => {
    const Icon = icons[hub.slug];
    const recipes = hubWorkflowRecipes(hub, publishedRecipeIds);
    return <article key={hub.slug} className={styles.hub}><div className={styles.identity}><Icon aria-hidden="true" /><span>{t(`types.${hub.organization.type}`)}</span></div><h2><Link href={`/hubs/${hub.slug}`}>{t(`items.${hub.slug}.name`)}<ArrowRight className="size-5" aria-hidden="true" /></Link></h2><p>{t(`items.${hub.slug}.description`)}</p><dl className={styles.counts}><div><dt>{t("counts.workflows")}</dt><dd>{recipes === null || memberCounts?.[hub.slug]===null ? t("unavailable") : recipes.length+(memberCounts?.[hub.slug]??0)}</dd></div><div><dt>{t("counts.projects")}</dt><dd>{published ? hubProjects(hub, published).length : t("unavailable")}</dd></div><div><dt>{t("counts.resources")}</dt><dd>{hub.resources.length}</dd></div></dl></article>;
  })}</div>;
}
