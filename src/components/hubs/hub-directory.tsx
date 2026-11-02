import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Clapperboard, Code2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { HubDefinition } from "@/domain/hubs/registry";
import { hubProjects, hubShortcut, hubWorkflowRecipes } from "@/domain/hubs/registry";
import type { CatalogWorkflowId } from "@/contracts/catalog";
import type { CatalogProject } from "@/domain/catalog/projects";
import styles from "./hubs.module.css";

const icons = { cauhub: GraduationCap, vibehub: BookOpen, aigc: Clapperboard, "full-stack": Code2 };
export async function HubDirectory({ hubs, published, publishedRecipeIds, memberCounts }: { memberCounts?: Readonly<Record<string,number|null>>; hubs: readonly HubDefinition[]; published: readonly CatalogProject[] | null; publishedRecipeIds: readonly CatalogWorkflowId[] | null }) {
  const t = await getTranslations("hubs");
  return <div className={styles.directory}>{hubs.map(hub => {
    const Icon = icons[hub.slug];
    const recipes = hubWorkflowRecipes(hub, publishedRecipeIds);
    const members = memberCounts?.[hub.slug];
    // Unknown counts are left out rather than shown as zero; zero is left out too.
    const workflows = recipes === null || members === null ? null : recipes.length + (members ?? 0);
    const projects = published ? hubProjects(hub, published).length : null;
    const href = hubShortcut(hub, members) ?? `/hubs/${hub.slug}`;
    const summary = [
      workflows ? t("summary.workflows", { count: workflows }) : null,
      projects ? t("summary.projects", { count: projects }) : null,
      href === `/hubs/${hub.slug}` && hub.resources.length ? t("summary.resources", { count: hub.resources.length }) : null,
    ].filter(Boolean);
    return <article key={hub.slug} className={styles.hub}><div className={styles.identity}><Icon aria-hidden="true" /><span>{t(`types.${hub.organization.type}`)}</span></div><h2><Link href={href}>{t(`items.${hub.slug}.name`)}<ArrowRight className="size-5" aria-hidden="true" /></Link></h2><p>{t(`items.${hub.slug}.description`)}</p>{summary.length > 0 && <p className={styles.summary}>{summary.join(t("summary.separator"))}</p>}</article>;
  })}</div>;
}
