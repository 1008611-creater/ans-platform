import { marketProductPath } from "@/domain/marketplace/product-route";
import { MarketProductConnections } from "@/components/marketplace/market-product-connections";
import { warmCatalogForRequest } from "@/server/catalog/connections";
import { cache, Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, ChevronRight, Star } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MarketWorkflowRun } from "@/components/marketplace/workflow-run";
import { marketWorkflowDetails } from "@/server/marketplace/workflows";
import { ProjectUsageEntry } from "@/components/marketplace/project-usage-entry";
import { MarketStar } from "@/components/marketplace/market-star";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { MarketDetailPreview } from "@/components/marketplace/market-detail-preview";
import { readMarketPage } from "@/server/marketplace/product-read";
import { MarketRuleError } from "@/domain/marketplace/order";
import { Button } from "@/components/ui/button";
import styles from "@/components/marketplace/market-detail.module.css";
import { ResumeWebsiteMarketProduct } from "@/components/marketplace/resume-website-market-product";

export const dynamic = "force-dynamic";
type MarketDetailProps = { params: Promise<{ slug: string }> };

const publishedListing = cache(async (slug: string) => {
  try {
    const page = await readMarketPage(slug);
    warmCatalogForRequest();
    return page;
  } catch (error) {
    if (error instanceof MarketRuleError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
});

export async function generateMetadata({ params }: MarketDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const { offer } = await publishedListing(slug);
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
  const [t, tp, p, td, w, { session, offer, runnable: precomputedRunnable }] = await Promise.all([
    getTranslations("product.market"), getTranslations("product.marketProject"),
    getTranslations("product"), getTranslations("product.marketDetail"),
    getTranslations("marketWorkflow"), publishedListing(slug),
  ]);
  const productPath = marketProductPath(offer);
  if (productPath !== `/market/${slug}`) redirect(productPath);
  const runnable = precomputedRunnable ?? await marketWorkflowDetails(offer);
  if (runnable?.available && runnable.recipe === "resume-website-v1") {
    return <ResumeWebsiteMarketProduct offer={offer} session={session} runnable={runnable} />;
  }
  const listing = offer.listing;
  const isOwner = session?.user?.id === offer.seller.id;
  const freeUrl = listing.usageUrl ?? listing.previewUrl ?? listing.sourceUrl ?? listing.githubUrl ?? "/vibe-hub/vibehub-skill";
  const isExternalFreeUrl = /^https?:\/\//i.test(freeUrl);
  const loginHref = "/login?callbackUrl=" + encodeURIComponent("/market/" + slug);
  const sellerName = offer.seller.nickname || offer.seller.username;
  const purchaseAnchor = runnable ? "market-run" : "market-deliverables";

  return <div className="ans-product-shell"><div className="ans-product-container ans-page-content ans-market-page">
    <nav aria-label={t("navigation")} className="ans-market-nav">
      <Link className="ans-subcategory" href="/market">{t("browse")}</Link>
      <Link className="ans-subcategory" href="/explore">{t("exploreProjects")}</Link>
      <Link className="ans-subcategory" href="/vibe-hub/guides">VibeHub 指南</Link>
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
        <section id="market-deliverables" className={styles.section}>
          <h2>📦 免费开放交付清单</h2>
          <ul className={styles.deliverables}>{listing.deliverables.map((item, index) => <li key={index}><span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{item}</span></li>)}</ul>
        </section>
        <section id="market-details" className={styles.section}>
          <h2>方案说明与使用方式</h2>
          <p className={`${styles.body} mt-4 whitespace-pre-wrap`}>{listing.description}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {isExternalFreeUrl ? (
              <Button asChild><a href={freeUrl} target="_blank" rel="noopener noreferrer">⚡ 立即打开在线版本 / 源码<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></a></Button>
            ) : (
              <Button asChild><Link href={freeUrl}>⚡ 立即免费使用该方案<ChevronRight aria-hidden="true" className="h-4 w-4" /></Link></Button>
            )}
            {listing.githubUrl && listing.githubUrl !== freeUrl && (
              <Button asChild variant="outline"><a href={listing.githubUrl} target="_blank" rel="noopener noreferrer">GitHub 开源仓库<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></a></Button>
            )}
          </div>
        </section>
        {runnable && <section id="market-run" className={styles.section}>
          <h2>{td("runHeading")}</h2>
          <div className={styles.checkout}>
            {runnable.available ? session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}><MarketWorkflowRun listingId={offer.id} version={offer.version} details={runnable} /></MarketAccountBoundary> : <Button asChild className="h-auto min-h-10 w-full whitespace-normal py-2.5 text-center"><Link href={loginHref}>{td("loginToPrepare")}</Link></Button> : <p className="text-sm leading-7 text-muted-foreground">{w("unavailable")}</p>}
          </div>
        </section>}
      </div>
      <aside className={styles.decision} aria-label={td("decisionTitle")}>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium"><span className="rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-700 dark:text-emerald-300">🎁 限时免费开放</span><span className="rounded-full bg-muted px-3 py-1">{runnable ? td("workflowProduct") : t(listing.fulfillment)}</span></div>
        <h1>{listing.title}</h1><p className={styles.summary}>{listing.summary}</p>
        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">0 积分 · 免费直达交付</p>
        <dl className={styles.facts}>
          <div><dt>{td("deliverablesCount")}</dt><dd>{td("itemsCount", { count: listing.deliverables.length })}</dd></div>
          <div><dt>获取方式</dt><dd>{runnable ? "在线工作台直接生成" : "在线预览 + 完整模板直达"}</dd></div>
        </dl>
        <div className="space-y-3">
          {runnable && runnable.available ? (
            <Button asChild className="h-auto min-h-11 w-full whitespace-normal py-3 text-center"><a href={`#${purchaseAnchor}`}>⚡ 立即在线生成<ChevronRight aria-hidden="true" /></a></Button>
          ) : isExternalFreeUrl ? (
            <Button asChild className="h-auto min-h-11 w-full whitespace-normal py-3 text-center"><a href={freeUrl} target="_blank" rel="noopener noreferrer">⚡ 立即免费打开 / 获取模板<ArrowUpRight aria-hidden="true" /></a></Button>
          ) : (
            <Button asChild className="h-auto min-h-11 w-full whitespace-normal py-3 text-center"><Link href={freeUrl}>⚡ 立即免费使用<ChevronRight aria-hidden="true" /></Link></Button>
          )}
          {session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}><MarketStar listingId={offer.id} initialCount={offer.starCount ?? 0} initialStarred={offer.starred ?? false} /></MarketAccountBoundary> : <Button asChild variant="outline" className="h-auto min-h-10 w-full whitespace-normal py-2.5 text-center"><Link href={loginHref}><Star aria-hidden="true" />{tp("loginToStar", { count: offer.starCount ?? 0 })}</Link></Button>}
          {!runnable && listing.usageUrl && !listing.usageUrl.includes("/workspace/models") && <ProjectUsageEntry usageUrl={listing.usageUrl} />}
          {!runnable && isOwner && <Button asChild variant="outline" className="h-auto min-h-10 w-full whitespace-normal py-2.5 text-center"><Link href={`/market/creator/${offer.id}/integration`}>{tp("integrationAction")}</Link></Button>}
        </div>
        <Link href={"/@" + offer.seller.username} className={styles.seller}>
          {offer.seller.avatar ? <Image unoptimized src={offer.seller.avatar} width={40} height={40} alt="" className={styles.sellerAvatar} /> : <span className={styles.avatarFallback} aria-hidden="true">{sellerName.slice(0, 1)}</span>}
          <span className="min-w-0"><span className="block text-xs text-muted-foreground">{offer.official ? p("official") : td("sellerTitle")}</span><span className="mt-1 block break-words text-sm font-medium">{sellerName}</span></span><ArrowUpRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      </aside>
    </div>
    <Suspense fallback={null}><MarketProductConnections offer={offer} /></Suspense>
  </div></div>;
}
