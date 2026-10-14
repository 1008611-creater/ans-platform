import { ArrowLeft, ArrowUpRight, ChevronRight, CircleCheck, FileText, LockKeyhole, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { getMarketConnections } from "@/server/catalog/connections";
import { marketWorkflowDetails } from "@/server/marketplace/workflows";
import { publicationConfig } from "@/server/visual-portfolio/publication";
import { VisualWebsiteExperience } from "@/components/projects/visual-website-experience";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { MarketStar } from "@/components/marketplace/market-star";
import { ProductConnectionsSection } from "@/components/catalog/product-connections";
import type { MarketOfferView } from "@/contracts/marketplace-view";
import styles from "./market-detail.module.css";

/** The first executable marketplace product keeps its visual editor, but makes the product contract visible around it. */
type SessionLike = { user?: { id?: string | null } | null } | null;

export async function ResumeWebsiteMarketProduct({ offer, session }: { offer: MarketOfferView; session: SessionLike }) {
  const [t, tp, p, td, w, connections, runnable] = await Promise.all([
    getTranslations("product.market"),
    getTranslations("product.marketProject"),
    getTranslations("product"),
    getTranslations("product.marketDetail"),
    getTranslations("marketWorkflow"),
    getMarketConnections(offer),
    marketWorkflowDetails(offer),
  ]);
  const listing = offer.listing;
  const readyDetails = runnable?.available && runnable.recipe === "resume-website-v1" ? runnable : null;
  const isReady = Boolean(readyDetails);
  const sellerName = offer.seller.nickname || offer.seller.username;
  const editor = <VisualWebsiteExperience publicationAvailable={publicationConfig().available} execution={readyDetails ? { listingId: offer.id, version: offer.version, details: readyDetails } : undefined} licenseTerms={listing.licenseTerms} />;
  const loginHref = "/login?callbackUrl=" + encodeURIComponent("/market/resume-website");
  const minimum = listing.pricingTiers?.length ? Math.min(...listing.pricingTiers.map(tier => tier.priceMinor)) : listing.priceMinor;
  const priceLabel = isReady ? w("computeOnRun") : minimum === 0 ? p("realProject.freeShare") : t("pointsUnit", { amount: minimum / 100 });

  return <div className="ans-product-shell"><div className="ans-product-container ans-page-content ans-market-page">
    <nav aria-label={t("navigation")} className="ans-market-nav">
      <Link className="ans-subcategory" href="/market">{t("browse")}</Link>
      <Link className="ans-subcategory" href="/market/creator">{t("creator")}</Link>
      <Link className="ans-subcategory" href="/market/orders">{t("orders")}</Link>
      <Link className="ans-subcategory" href="/workspace">{t("workspace")}</Link>
    </nav>
    <nav className={styles.breadcrumb} aria-label={td("breadcrumb")}>
      <Link href="/market" className="inline-flex items-center gap-2"><ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />{tp("backToMarket")}</Link>
      <ChevronRight aria-hidden="true" className="h-3 w-3" /><span>{p("categories." + listing.category)}</span>
      <ChevronRight aria-hidden="true" className="h-3 w-3" /><span>{p("children." + listing.subcategory)}</span>
    </nav>
    <ProductConnectionsSection connections={connections} />
    <div className={styles.layout}>
      <div className={styles.content}>
        <section className={styles.workflowIntro} aria-labelledby="resume-market-title">
          <div className={styles.workflowMeta}><span className={styles.workflowBadge}><Sparkles aria-hidden="true" />{td("workflowProduct")}</span><span>{t("version", { version: offer.version })}</span><span>{offer.official ? p("official") : sellerName}</span></div>
          <h1 id="resume-market-title">{listing.title}</h1>
          <p>{listing.summary}</p>
          <div className={styles.workflowSignals}>
            <span><CircleCheck aria-hidden="true" />{td(isReady ? "readyToRun" : "notReadyToRun")}</span>
            <span><FileText aria-hidden="true" />{td("itemsCount", { count: listing.deliverables.length })}</span>
            <span><LockKeyhole aria-hidden="true" />{td("licenseShortTitle")}</span>
          </div>
        </section>
        <section id="market-run" className={styles.workflowStage} aria-labelledby="resume-market-preview-title">
          <div className={styles.workflowStageBar}><div><p className={styles.workflowStageKicker}>{td("previewTitle")}</p><h2 id="resume-market-preview-title">{isReady ? td("runHeading") : td("unavailableTitle")}</h2></div><span className={styles.workflowStageVersion}>{t("version", { version: offer.version })}</span></div>
          {isReady ? session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}>{editor}</MarketAccountBoundary> : editor : <div className="rounded-2xl border border-dashed p-8"><p className="font-medium">{td("unavailableTitle")}</p><p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{td("unavailableBody")}</p></div>}
        </section>
        <section id="market-deliverables" className={styles.section}>
          <h2>{td("deliverablesTitle")}</h2>
          <ul className={styles.deliverables}>{listing.deliverables.map((item, index) => <li key={index}><span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{item}</span></li>)}</ul>
        </section>
        <section id="market-details" className={styles.section}>
          <h2>{td("detailsTitle")}</h2>
          <p className={`${styles.body} mt-5 whitespace-pre-wrap`}>{listing.description}</p>
        </section>
        <section id="market-terms" className={styles.section}>
          <h2>{td("termsTitle")}</h2>
          <dl className={styles.terms}>
            <div><dt>{td("licenseTitle")}</dt><dd className="whitespace-pre-wrap">{listing.licenseTerms}</dd></div>
            <div><dt>{td("costBoundaryTitle")}</dt><dd>{isReady ? td("runCostBoundary") : td("freeCostBoundary")}</dd></div>
            <div><dt>{td("versionTitle")}</dt><dd>{td("versionNote", { version: offer.version })}{isReady && <> {td("workflowVersionNote", { version: readyDetails?.version ?? offer.version })}</>}</dd></div>
          </dl>
        </section>
      </div>
      <aside className={styles.decision} aria-label={td("decisionTitle")}>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium"><span className="rounded-full bg-muted px-3 py-1.5">{td("workflowProduct")}</span><span className="text-muted-foreground">{t("version", { version: offer.version })}</span></div>
        <h2>{listing.title}</h2><p className={styles.summary}>{listing.summary}</p>
        <p className={styles.price}>{priceLabel}</p><p className="text-xs leading-6 text-muted-foreground">{isReady ? td("runPriceNote") : td("freePriceNote")}</p>
        <dl className={styles.facts}>
          <div><dt>{td("deliverablesCount")}</dt><dd>{td("itemsCount", { count: listing.deliverables.length })}</dd></div>
          <div><dt>{td("executionMode")}</dt><dd>{td(isReady ? "readyToRun" : "notReadyToRun")}</dd></div>
          <div><dt>{td("licenseShortTitle")}</dt><dd><a href="#market-terms" className="underline underline-offset-4">{td("readTerms")}</a></dd></div>
        </dl>
        <div className="space-y-3">
          {isReady ? session?.user?.id ? <ButtonLink href="#market-run" label={td("prepareRun")} /> : <ButtonLink href={loginHref} label={td("loginToPrepare")} /> : <p className="text-sm leading-7 text-muted-foreground">{td("unavailableBody")}</p>}
          {session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}><MarketStar listingId={offer.id} initialCount={offer.starCount ?? 0} initialStarred={offer.starred ?? false} /></MarketAccountBoundary> : <ButtonLink href={loginHref} label={tp("loginToStar", { count: offer.starCount ?? 0 })} outline icon={<Star aria-hidden="true" />} />}
          <p className="text-xs leading-6 text-muted-foreground">{td("versionNote", { version: offer.version })}</p>
        </div>
        <Link href={"/@" + offer.seller.username} className={styles.seller}>
          {offer.seller.avatar ? <Image unoptimized src={offer.seller.avatar} width={40} height={40} alt="" className={styles.sellerAvatar} /> : <span className={styles.avatarFallback} aria-hidden="true">{sellerName.slice(0, 1)}</span>}
          <span className="min-w-0"><span className="block text-xs text-muted-foreground">{offer.official ? p("official") : td("sellerTitle")}</span><span className="mt-1 block break-words text-sm font-medium">{sellerName}</span></span><ArrowUpRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      </aside>
    </div>
  </div></div>;
}

function ButtonLink({ href, label, outline = false, icon }: { href: string; label: string; outline?: boolean; icon?: ReactNode }) {
  return <Link href={href} className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-center text-sm font-medium transition-colors ${outline ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>{icon}{label}<ChevronRight aria-hidden="true" className="h-4 w-4" /></Link>;
}
