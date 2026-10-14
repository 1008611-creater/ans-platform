import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { publicationConfig } from "@/server/visual-portfolio/publication";
import { VisualWebsiteExperience } from "@/components/projects/visual-website-experience";
import { MarketWorkflowRun } from "@/components/marketplace/workflow-run";
import { marketWorkflowDetails } from "@/server/marketplace/workflows";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { CreateCashOrder } from "@/components/marketplace/cash-payment";
import { CreatePointsOrder } from "@/components/marketplace/create-points-order";
import { ProjectUsageEntry } from "@/components/marketplace/project-usage-entry";
import { MarketStar } from "@/components/marketplace/market-star";
import { MarketDetailPreview } from "@/components/marketplace/market-detail-preview";
import { getMarketListing } from "@/server/marketplace/listings";
import { marketCheckoutAvailability, marketCashOffer } from "@/server/marketplace/orders";
import { MarketRuleError } from "@/domain/marketplace/order";
import { Button } from "@/components/ui/button";
import styles from "@/components/marketplace/market-detail.module.css";

export const dynamic = "force-dynamic";
type MarketDetailProps = { params: Promise<{ slug: string }> };

const publishedListing = cache(async (slug: string, viewerId?: string) => {
  try { return await getMarketListing(slug, viewerId); }
  catch (error) {
    if (error instanceof MarketRuleError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
});

export async function generateMetadata({ params }: MarketDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const offer = await publishedListing(slug);
  return {
    title: offer.listing.title,
    description: offer.listing.summary,
    openGraph: {
      title: offer.listing.title,
      description: offer.listing.summary,
      ...(offer.listing.coverUrl ? { images: [{ url: offer.listing.coverUrl, alt: offer.listing.title }] } : {}),
    },
  };
}

export default async function MarketDetail({ params }: MarketDetailProps) {
  const { slug } = await params;
  const [t, tp, p, td, w, session] = await Promise.all([
    getTranslations("product.market"), getTranslations("product.marketProject"),
    getTranslations("product"), getTranslations("product.marketDetail"),
    getTranslations("marketWorkflow"), auth(),
  ]);
  const offer = await publishedListing(slug, session?.user?.id);
  const runnable = await marketWorkflowDetails(offer);
  const listing = offer.listing;
  const tiers = listing.pricingTiers ?? [];
  const minimum = tiers.length ? Math.min(...tiers.map(tier => tier.priceMinor)) : listing.priceMinor;
  const isFree = minimum === 0;
  const isOwner = session?.user?.id === offer.seller.id;
  const availability = marketCheckoutAvailability();
  const cashOffer = runnable ? null : marketCashOffer(offer.id, offer.version, offer.seller.id);
  const freeUrl = listing.usageUrl ?? listing.sourceUrl ?? listing.githubUrl ?? listing.previewUrl;
  const loginHref = "/login?callbackUrl=" + encodeURIComponent("/market/" + slug);
  const sellerName = offer.seller.nickname || offer.seller.username;
  const purchaseHeading = runnable ? td("runHeading") : isFree ? td("freeHeading") : td("purchaseHeading");
  const purchaseAnchor = runnable ? "market-run" : "market-checkout";

  // This reviewed recipe retains its complete editor and existing account/run boundary.
  if (runnable?.available && runnable.recipe === "resume-website-v1") {
    const editor = <VisualWebsiteExperience publicationAvailable={publicationConfig().available} execution={{ listingId: offer.id, version: offer.version, details: runnable }} licenseTerms={listing.licenseTerms} />;
    return session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}>{editor}</MarketAccountBoundary> : editor;
  }

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
    <div className={styles.layout}>
      <div className={styles.content}>
        <MarketDetailPreview listing={listing} />
        <nav className={styles.jumpLinks} aria-label={td("sectionNavigation")}>
          <a href="#market-deliverables">{td("deliverablesTitle")}</a>
          <a href="#market-details">{td("detailsTitle")}</a>
          {tiers.length > 0 && <a href="#market-tiers">{td("tiersTitle")}</a>}
          <a href="#market-terms">{td("termsTitle")}</a>
        </nav>
        <section id="market-deliverables" className={styles.section}>
          <h2>{td("deliverablesTitle")}</h2>
          <ul className={styles.deliverables}>{listing.deliverables.map((item, index) => <li key={index}><span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{item}</span></li>)}</ul>
        </section>
        <section id="market-details" className={styles.section}>
          <h2>{td("detailsTitle")}</h2>
          <p className={`${styles.body} mt-5 whitespace-pre-wrap`}>{listing.description}</p>
          {listing.sourceUrl && <a href={listing.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4">{td("originalSource")}<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></a>}
        </section>
        {tiers.length > 0 && <section id="market-tiers" className={styles.section}>
          <h2>{td("tiersTitle")}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{td("tiersNote")}</p>
          <div className="mt-3">{tiers.map(tier => <article key={tier.id} className={styles.tier}>
            <div className="flex flex-wrap items-baseline justify-between gap-3"><h3 className="min-w-0 break-words text-base font-semibold">{tier.title}</h3><p className="shrink-0 text-base font-semibold tabular-nums">{t("pointsUnit", { amount: tier.priceMinor / 100 })}</p></div>
            <p className={`${styles.body} mt-3 text-muted-foreground`}>{tier.description}</p>
            <ul className="mt-4 space-y-2">{tier.deliverables.map((item, index) => <li key={index} className="flex items-start gap-2 text-sm leading-7"><Check aria-hidden="true" className="mt-1.5 h-3.5 w-3.5 shrink-0 text-primary" /><span className="min-w-0 break-words">{item}</span></li>)}</ul>
          </article>)}</div>
        </section>}
        <section id="market-terms" className={styles.section}>
          <h2>{td("termsTitle")}</h2>
          <dl className={styles.terms}>
            <div><dt>{td("licenseTitle")}</dt><dd className="whitespace-pre-wrap">{listing.licenseTerms}</dd></div>
            <div><dt>{td("costBoundaryTitle")}</dt><dd>{runnable ? td("runCostBoundary") : isFree ? td("freeCostBoundary") : t(listing.computeIncluded ? "computeYes" : "computeNo")}</dd></div>
            {!runnable && !isFree && <>
              <div><dt>{td("deliveryTitle")}</dt><dd>{t("delivery", { days: listing.deliveryDays })} · {t("revisions", { count: listing.revisionLimit })}. {td("deliveryNote")}</dd></div>
              <div><dt>{td("orderProcessTitle")}</dt><dd>{td("orderProcessNote")}</dd></div>
            </>}
            <div><dt>{td("versionTitle")}</dt><dd>{td("versionNote", { version: offer.version })}{runnable && <> {td("workflowVersionNote", { version: runnable.version })}</>}</dd></div>
          </dl>
        </section>
        {(runnable || !isFree) && <section id={purchaseAnchor} className={styles.section}>
          <h2>{purchaseHeading}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{runnable ? td("runPreparation") : td("purchasePreparation")}</p>
          <div className={styles.checkout}>
            {runnable ? runnable.available ? session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}><MarketWorkflowRun listingId={offer.id} version={offer.version} details={runnable} /></MarketAccountBoundary> : <Button asChild className="w-full"><Link href={loginHref}>{td("loginToPrepare")}</Link></Button> : <p className="text-sm leading-7 text-muted-foreground">{w("unavailable")}</p> : session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}>
              <CreatePointsOrder key={`${offer.id}-${offer.version}`} listingId={offer.id} version={offer.version} available={availability.checkoutAvailable} tiers={tiers} priceMinor={listing.priceMinor} isOwner={isOwner} />
              {cashOffer && !isOwner && <CreateCashOrder listingId={offer.id} version={offer.version} offer={cashOffer} />}
            </MarketAccountBoundary> : <Button asChild className="w-full"><Link href={loginHref}>{tp("loginToBuy")}</Link></Button>}
          </div>
        </section>}
      </div>
      <aside className={styles.decision} aria-label={td("decisionTitle")}>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium"><span className="rounded-full bg-muted px-3 py-1.5">{runnable ? td("workflowProduct") : t(listing.fulfillment)}</span><span className="text-muted-foreground">{t("version", { version: offer.version })}</span></div>
        <h1>{listing.title}</h1><p className={styles.summary}>{listing.summary}</p>
        <p className={styles.price}>{runnable ? w("computeOnRun") : isFree ? p("realProject.freeShare") : tiers.length > 1 ? tp("fromPoints", { amount: minimum / 100 }) : t("pointsUnit", { amount: minimum / 100 })}</p>
        <p className="text-xs leading-6 text-muted-foreground">{runnable ? td("runPriceNote") : isFree ? td("freePriceNote") : td("pointsPriceNote")}</p>
        <dl className={styles.facts}>
          <div><dt>{td("deliverablesCount")}</dt><dd>{td("itemsCount", { count: listing.deliverables.length })}</dd></div>
          {runnable ? <div><dt>{td("executionMode")}</dt><dd>{runnable.available ? td("readyToRun") : td("notReadyToRun")}</dd></div> : !isFree && <><div><dt>{td("deliveryTitle")}</dt><dd>{t("delivery", { days: listing.deliveryDays })}</dd></div><div><dt>{td("revisionTitle")}</dt><dd>{t("revisions", { count: listing.revisionLimit })}</dd></div></>}
          <div><dt>{td("licenseShortTitle")}</dt><dd><a href="#market-terms" className="underline underline-offset-4">{td("readTerms")}</a></dd></div>
        </dl>
        <div className="space-y-3">
          {runnable ? runnable.available ? <Button asChild className="w-full"><a href={`#${purchaseAnchor}`}>{td("prepareRun")}<ChevronRight aria-hidden="true" /></a></Button> : <p className="text-sm leading-7 text-muted-foreground">{w("unavailable")}</p> : isFree && freeUrl ? <Button asChild className="w-full"><a href={freeUrl} target="_blank" rel="noopener noreferrer">{p("realProject.visitProduct")}<ArrowUpRight aria-hidden="true" /></a></Button> : <Button asChild className="w-full"><a href={`#${purchaseAnchor}`}>{isOwner ? tp("ownProject") : td(tiers.length ? "chooseAndBuy" : "viewAndBuy")}<ChevronRight aria-hidden="true" /></a></Button>}
          {session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}><MarketStar listingId={offer.id} initialCount={offer.starCount ?? 0} initialStarred={offer.starred ?? false} /></MarketAccountBoundary> : <Button asChild variant="outline" className="w-full"><Link href={loginHref}><Star aria-hidden="true" />{tp("loginToStar", { count: offer.starCount ?? 0 })}</Link></Button>}
          {!runnable && !isFree && listing.usageUrl && <ProjectUsageEntry usageUrl={listing.usageUrl} />}
          {!runnable && isOwner && <Button asChild variant="outline" className="w-full"><Link href={`/market/creator/${offer.id}/integration`}>{tp("integrationAction")}</Link></Button>}
          <p className="text-xs leading-6 text-muted-foreground">{runnable ? td("runPriceNote") : isFree ? p("realProject.freeNote") : t("paymentNotice")}</p>
        </div>
        <Link href={"/@" + offer.seller.username} className={styles.seller}>
          {offer.seller.avatar ? <Image unoptimized src={offer.seller.avatar} width={40} height={40} alt="" className={styles.sellerAvatar} /> : <span className={styles.avatarFallback} aria-hidden="true">{sellerName.slice(0, 1)}</span>}
          <span className="min-w-0"><span className="block text-xs text-muted-foreground">{offer.official ? p("official") : td("sellerTitle")}</span><span className="mt-1 block break-words text-sm font-medium">{sellerName}</span></span><ArrowUpRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      </aside>
    </div>
  </div></div>;
}
