import { cache } from "react";
import { marketProductPath } from "@/domain/marketplace/product-route";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import type { ProductConnection, ProductConnections } from "@/contracts/product-connections";
import type { MarketOfferView } from "@/contracts/marketplace-view";
import type { CatalogProject } from "@/domain/catalog/projects";
import { catalogText } from "@/domain/catalog/content";
import { workflowDefinitionSchema } from "@/contracts/workflow";
import { validateWorkflow } from "@/domain/workflows/graph";
import { assertSupportedRecipe } from "@/domain/workflows/recipes";
import { getPlatformRecipe } from "@/domain/workflows/platform-recipes";
import { findPublishedPlatformRecipe } from "@/server/workflows/platform-recipes";
import { getPublishedWorkflow } from "@/server/workflows/service";
import { listRelatedPublishedMarketListings } from "@/server/marketplace/listings";
import { marketHash } from "@/server/marketplace/shared";
import { workflowDefinitionHash } from "@/server/marketplace/workflow-binding";
import { marketWorkflowDetails } from "@/server/marketplace/workflows";
import { listPublishedCatalog } from "./service";

type PublicWorkflow = NonNullable<Awaited<ReturnType<typeof getPublishedWorkflow>>>;
const getRequestCatalog = cache(() => listPublishedCatalog());
export function warmCatalogForRequest() {
  void getRequestCatalog().catch(() => null);
}
const readWorkflow = cache(async (slug: string) => {
  const workflow = await getPublishedWorkflow(slug);
  if (!workflow) return null;
  if (!getPlatformRecipe(slug)) {
    const actor = await db.user.findFirst({ where: { id: workflow.author.id, deletedAt: null, flagged: false }, select: { id: true } });
    if (!actor) return null;
  }
  const parsed = workflowDefinitionSchema.safeParse(workflow.publishedDefinition);
  if (!parsed.success || !validateWorkflow(parsed.data).ok) return null;
  try { assertSupportedRecipe(parsed.data); } catch { return null; }
  return workflow;
});
const resolveWorkflowId = cache(async (id: string) => {
  const platform = await findPublishedPlatformRecipe(id);
  if (platform) return readWorkflow(platform.workflow.slug);
  const row = await db.workflow.findUnique({ where: { id }, select: { slug: true } });
  return row ? readWorkflow(row.slug) : null;
});
const readableOffer = cache(async (offer: MarketOfferView) => {
  const exec = offer.listing.execution;
  if (exec) {
    const platform = await findPublishedPlatformRecipe(exec.workflowId);
    if (
      platform &&
      platform.workflow.author.id === offer.seller.id &&
      platform.version.id === exec.versionId &&
      platform.version.version === exec.version &&
      platform.recipe.definitionHash === exec.definitionHash
    ) {
      return offer;
    }
    if (!(await marketWorkflowDetails(offer))?.available) return null;
  }
  return offer;
});
function marketSlugs(projects: CatalogProject[]) {
  return [...new Set(projects.flatMap(project => [
    ...(project.marketSlugs ?? []),
    ...(project.memberHref?.startsWith("/market/") ? [project.memberHref.slice("/market/".length)] : []),
  ]))];
}
async function workflowsFor(projects: CatalogProject[]) {
  const slugs = [...new Set(projects.flatMap(project => project.workflowSlugs ?? []))];
  return (await Promise.all(slugs.map(readWorkflow))).filter(workflow => workflow !== null);
}
async function offersFor(projects: CatalogProject[], workflows: PublicWorkflow[], excludeOffer?: MarketOfferView) {
  const excludedSlugs = new Set<string>();
  if (excludeOffer) {
    excludedSlugs.add(excludeOffer.slug);
    const canonicalPath = marketProductPath(excludeOffer);
    if (canonicalPath.startsWith("/market/")) excludedSlugs.add(canonicalPath.slice("/market/".length));
  }
  const platformSlugs = workflows
    .filter(w => Boolean(getPlatformRecipe(w.slug)) && w.publishedVersion !== null)
    .map(w => `workflow-${marketHash(w.id).slice(0, 24)}-v${w.publishedVersion}`);
  const slugs = [...new Set([...marketSlugs(projects), ...platformSlugs])].filter(s => !excludedSlugs.has(s));
  const workflowIds = workflows
    .filter(w => !getPlatformRecipe(w.slug) || !platformSlugs.length)
    .map(workflow => workflow.id)
    .filter(id => !(excludeOffer?.listing.execution?.workflowId === id && excludeOffer.official));
  const offers = await listRelatedPublishedMarketListings({ slugs, workflowIds });
  return (await Promise.all(offers.map(async offer => {
    const exec = offer.listing.execution;
    if (exec) {
      const matched = workflows.find(
        w =>
          w.id === exec.workflowId &&
          w.author.id === offer.seller.id &&
          w.publishedVersion === exec.version &&
          workflowDefinitionHash(w.publishedDefinition) === exec.definitionHash,
      );
      if (matched) return offer;
    }
    return readableOffer(offer);
  }))).filter(offer => offer !== null);
}
function workflowLink(workflow: PublicWorkflow): ProductConnection {
  return { slug: workflow.slug, title: workflow.title, summary: workflow.summary, version: workflow.publishedVersion ?? undefined,
    kind: "workflow", href: `/workflows/${workflow.slug}#workflow-run` };
}
function offerLink(offer: MarketOfferView): ProductConnection {
  const tiers = offer.listing.pricingTiers ?? [];
  const points = (tiers.length ? Math.min(...tiers.map(tier => tier.priceMinor)) : offer.listing.priceMinor) / 100;
  const kind = offer.listing.execution ? "workflow-offer" : offer.listing.fulfillment === "service" ? "service" : "resource";
  const anchor = kind === "workflow-offer" ? "market-run" : points > 0 ? "market-checkout" : "market-deliverables";
  return { slug: offer.slug, title: offer.listing.title, summary: offer.listing.summary, version: offer.version,
    kind, pricePoints: points, href: `${marketProductPath(offer)}#${anchor}` };
}
async function connections(projects: CatalogProject[], workflows: PublicWorkflow[], offers: MarketOfferView[]): Promise<ProductConnections> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("product")]);
  return {
    projects: projects.map(project => ({ slug: project.slug, title: catalogText(project, t, "title", locale),
      summary: catalogText(project, t, "summary", locale), kind: "project", href: `/explore/${project.slug}` })),
    workflows: workflows.map(workflowLink), offers: offers.map(offerLink),
  };
}
export const getProjectConnections = cache(async (project: CatalogProject) => {
  const workflows = await workflowsFor([project]);
  const offers = await offersFor([project], workflows);
  // An explicitly associated market workflow can expose its reviewed source too.
  const knownIds = new Set(workflows.map(workflow => workflow.id));
  const bound = (await Promise.all(offers.flatMap(offer => offer.listing.execution && !knownIds.has(offer.listing.execution.workflowId) ? [resolveWorkflowId(offer.listing.execution.workflowId)] : []))).filter(workflow => workflow !== null);
  return connections([], [...new Map([...workflows, ...bound].map(workflow => [workflow.slug, workflow])).values()], offers);
});
export async function getWorkflowConnections(workflow: PublicWorkflow) {
  if (!await readWorkflow(workflow.slug)) return connections([], [], []);
  const [boundOffers, catalog] = await Promise.all([offersFor([], [workflow]), getRequestCatalog()]);
  const boundSlugs = new Set(boundOffers.map(offer => offer.slug));
  const projects = catalog.filter(project => project.workflowSlugs?.includes(workflow.slug) || marketSlugs([project]).some(slug => boundSlugs.has(slug)));
  const offers = await offersFor(projects, [workflow]);
  return connections(projects, [], offers);
}
export const getMarketConnections = cache(async (offer: MarketOfferView) => {
  const [validOffer, bound, catalog] = await Promise.all([
    readableOffer(offer),
    offer.listing.execution ? resolveWorkflowId(offer.listing.execution.workflowId) : Promise.resolve(null),
    getRequestCatalog(),
  ]);
  if (!validOffer) return connections([], [], []);
  const projects = catalog.filter(project => marketSlugs([project]).includes(offer.slug) || Boolean(bound && project.workflowSlugs?.includes(bound.slug)));
  const workflows = await workflowsFor(projects);
  if (bound && !workflows.some(workflow => workflow.slug === bound.slug)) workflows.unshift(bound);
  const offers = (await offersFor(projects, workflows, offer)).filter(item => item.slug !== offer.slug);
  return connections(projects, workflows, offers);
});
