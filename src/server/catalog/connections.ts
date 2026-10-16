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
import { getPublishedWorkflow } from "@/server/workflows/service";
import { listRelatedPublishedMarketListings } from "@/server/marketplace/listings";
import { marketWorkflowDetails } from "@/server/marketplace/workflows";
import { listPublishedCatalog } from "./service";

type PublicWorkflow = NonNullable<Awaited<ReturnType<typeof getPublishedWorkflow>>>;
const readWorkflow = cache(async (slug: string) => {
  const workflow = await getPublishedWorkflow(slug);
  if (!workflow) return null;
  const actor = await db.user.findFirst({ where: { id: workflow.author.id, deletedAt: null, flagged: false }, select: { id: true } });
  if (!actor) return null;
  const parsed = workflowDefinitionSchema.safeParse(workflow.publishedDefinition);
  if (!parsed.success || !validateWorkflow(parsed.data).ok) return null;
  try { assertSupportedRecipe(parsed.data); } catch { return null; }
  return workflow;
});
const resolveWorkflowId = cache(async (id: string) => {
  const row = await db.workflow.findUnique({ where: { id }, select: { slug: true } });
  return row ? readWorkflow(row.slug) : null;
});
const readableOffer = cache(async (offer: MarketOfferView) => {
  if (offer.listing.execution && !(await marketWorkflowDetails(offer))?.available) return null;
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
async function offersFor(projects: CatalogProject[], workflows: PublicWorkflow[]) {
  const offers = await listRelatedPublishedMarketListings({ slugs: marketSlugs(projects), workflowIds: workflows.map(workflow => workflow.id) });
  return (await Promise.all(offers.map(readableOffer))).filter(offer => offer !== null);
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
export async function getProjectConnections(project: CatalogProject) {
  const workflows = await workflowsFor([project]);
  const offers = await offersFor([project], workflows);
  // An explicitly associated market workflow can expose its reviewed source too.
  const knownIds = new Set(workflows.map(workflow => workflow.id));
  const bound = (await Promise.all(offers.flatMap(offer => offer.listing.execution && !knownIds.has(offer.listing.execution.workflowId) ? [resolveWorkflowId(offer.listing.execution.workflowId)] : []))).filter(workflow => workflow !== null);
  return connections([], [...new Map([...workflows, ...bound].map(workflow => [workflow.slug, workflow])).values()], offers);
}
export async function getWorkflowConnections(workflow: PublicWorkflow) {
  if (!await readWorkflow(workflow.slug)) return connections([], [], []);
  const [boundOffers, catalog] = await Promise.all([offersFor([], [workflow]), listPublishedCatalog()]);
  const boundSlugs = new Set(boundOffers.map(offer => offer.slug));
  const projects = catalog.filter(project => project.workflowSlugs?.includes(workflow.slug) || marketSlugs([project]).some(slug => boundSlugs.has(slug)));
  const offers = await offersFor(projects, [workflow]);
  return connections(projects, [], offers);
}
export async function getMarketConnections(offer: MarketOfferView) {
  const [validOffer, bound, catalog] = await Promise.all([
    readableOffer(offer),
    offer.listing.execution ? resolveWorkflowId(offer.listing.execution.workflowId) : Promise.resolve(null),
    listPublishedCatalog(),
  ]);
  if (!validOffer) return connections([], [], []);
  const projects = catalog.filter(project => marketSlugs([project]).includes(offer.slug) || Boolean(bound && project.workflowSlugs?.includes(bound.slug)));
  const workflows = await workflowsFor(projects);
  if (bound && !workflows.some(workflow => workflow.slug === bound.slug)) workflows.unshift(bound);
  const offers = (await offersFor(projects, workflows)).filter(item => item.slug !== offer.slug);
  return connections(projects, workflows, offers);
}
