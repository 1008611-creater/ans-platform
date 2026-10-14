import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CatalogEditor } from "@/components/catalog/catalog-editor";
import { CatalogError, listCatalogAdmin } from "@/server/catalog/service";
import { builtinCatalogDrafts } from "@/server/catalog/builtin-drafts";
import { listPublishedWorkflows } from "@/server/workflows/service";
import { listMarketListings } from "@/server/marketplace/listings";
export const dynamic = "force-dynamic";
export default async function CatalogAdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fadmin%2Fcatalog");
  const t = await getTranslations("product.catalogAdmin");
  let entries;
  try { entries = await listCatalogAdmin(session.user.id); }
  catch (error) { if (error instanceof CatalogError && error.code === "FORBIDDEN") return <div className="ans-product-container py-12"><p role="alert">{t("errors.FORBIDDEN")}</p></div>; throw error; }
  const [builtins, workflows, offers] = await Promise.all([builtinCatalogDrafts(), listPublishedWorkflows({ take: 60 }), listMarketListings()]);
  return <div className="ans-product-shell"><div className="ans-product-container py-10 sm:py-14"><header className="mb-8 max-w-3xl"><p className="ans-eyebrow">{t("eyebrow")}</p><h1 className="mt-4 text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-4 leading-8 text-muted-foreground">{t("body")}</p></header><CatalogEditor entries={entries} builtins={builtins} workflowChoices={workflows.map(workflow => ({ slug: workflow.slug, title: workflow.title }))} offerChoices={offers.map(offer => ({ slug: offer.slug, title: offer.listing.title }))} /></div></div>;
}