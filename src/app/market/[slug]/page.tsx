import { marketProductPath } from "@/domain/marketplace/product-route";
import { MarketProductConnections } from "@/components/marketplace/market-product-connections";
import { warmCatalogForRequest } from "@/server/catalog/connections";
import { cache, Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Lock, Star } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MarketWorkflowRun } from "@/components/marketplace/workflow-run";
import { marketWorkflowDetails } from "@/server/marketplace/workflows";
import { CreatePointsOrder } from "@/components/marketplace/create-points-order";
import { CreateCashOrder } from "@/components/marketplace/cash-payment";
import { ProjectUsageEntry } from "@/components/marketplace/project-usage-entry";
import { MarketStar } from "@/components/marketplace/market-star";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { MarketDetailPreview } from "@/components/marketplace/market-detail-preview";
import { readMarketPage } from "@/server/marketplace/product-read";
import { marketCashOffer, marketCheckoutAvailability } from "@/server/marketplace/orders";
import { isMarketOfferPurchasable, getMarketSamplePreview } from "@/domain/marketplace/presentation";
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
  const tiers = listing.pricingTiers ?? [];
  const minimum = tiers.length ? Math.min(...tiers.map(tier => tier.priceMinor)) : listing.priceMinor;
  const points = Math.round(minimum / 100);
  const yuan = (points / 10).toFixed(points % 10 === 0 ? 0 : 1);
  const isFree = !runnable && minimum === 0;
  const purchasable = isMarketOfferPurchasable(offer);
  const sample = getMarketSamplePreview(listing);
  const availability = marketCheckoutAvailability();
  const cashOffer = purchasable ? marketCashOffer(offer.id, offer.version, offer.seller.id) : null;
  const isOwner = session?.user?.id === offer.seller.id;
  const freeUrl = listing.usageUrl ?? listing.previewUrl ?? listing.sourceUrl ?? listing.githubUrl ?? "/competitions/agrihackathon";
  const loginHref = "/login?callbackUrl=" + encodeURIComponent("/market/" + slug);
  const sellerName = offer.seller.nickname || offer.seller.username;
  const purchaseAnchor = runnable ? "market-run" : purchasable ? "market-purchase" : "market-deliverables";

  return <div className="ans-product-shell"><div className="ans-product-container ans-page-content ans-market-page">
    <nav className={styles.breadcrumb} aria-label={td("breadcrumb")}>
      <Link href="/market" className="inline-flex items-center gap-2"><ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />{tp("backToMarket")}</Link>
      <ChevronRight aria-hidden="true" className="h-3 w-3" /><span>{p("categories." + listing.category)}</span>
      <ChevronRight aria-hidden="true" className="h-3 w-3" /><span>{p("children." + listing.subcategory)}</span>
    </nav>
    <div className={styles.layout}>
      <div className={styles.content}>
        <MarketDetailPreview listing={listing} />
        <section id="market-deliverables" className={styles.section}>
          <h2>📦 {purchasable ? "交付物清单" : "方案大纲"}</h2>
          <ul className={styles.deliverables}>{listing.deliverables.map((item, index) => <li key={index}><span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{item}</span></li>)}</ul>
          <details className="mt-4 rounded-xl border border-emerald-500/25 bg-card/85 p-3.5">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">📦 查看交付物 Sample 样本预览 · {sample.badge}</span>
              <span className="font-mono text-muted-foreground">{sample.file} ▾</span>
            </summary>
            <pre className="mt-2.5 overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-xs leading-5 text-emerald-300">{sample.snippet}</pre>
          </details>
        </section>
        <section id="market-details" className={styles.section}>
          <h2>{td("detailsTitle")}</h2>
          <p className={`${styles.body} mt-4 whitespace-pre-wrap`}>{listing.description}</p>
        </section>
        {tiers.length > 0 && purchasable && <section id="market-tiers" className={styles.section}>
          <h2>{td("tiersTitle")}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{td("tiersNote")}</p>
          <div className="mt-3">{tiers.map(tier => <article key={tier.id} className={styles.tier}>
            <div className="flex flex-wrap items-baseline justify-between gap-3"><h3 className="min-w-0 break-words text-base font-semibold">{tier.title}</h3><p className="shrink-0 text-base font-semibold tabular-nums">{t("pointsUnit", { amount: tier.priceMinor / 100 })}</p></div>
            <p className={`${styles.body} mt-3 text-muted-foreground`}>{tier.description}</p>
            <ul className="mt-4 space-y-2">{tier.deliverables.map((item, index) => <li key={index} className="flex items-start gap-2 text-sm leading-7"><Check aria-hidden="true" className="mt-1.5 h-3.5 w-3.5 shrink-0 text-primary" /><span className="min-w-0 break-words">{item}</span></li>)}</ul>
          </article>)}</div>
        </section>}
        <section id="market-terms" className={styles.section}>
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-foreground">
              <span>{td("termsTitle")}</span>
              <span className="text-xs font-normal text-muted-foreground">计费标准与交付保障 ▾</span>
            </summary>
            <dl className={`${styles.terms} mt-4`}>
              <div><dt>汇率与定价基准</dt><dd>1 元人民币 = 10 积分（1 积分 = ¥0.10）。所有已开放购买商品均按真实研发/算力成本与市场价透明定价。</dd></div>
              <div><dt>{td("licenseTitle")}</dt><dd className="whitespace-pre-wrap">{listing.licenseTerms}</dd></div>
              <div><dt>交付保障</dt><dd>{runnable ? "在线工作台实时运行并保存结果" : isFree ? "免费打开在线体验或源码，不用购买，也不扣积分" : purchasable ? "官方已验真完整交付包：支付积分后系统立即自动秒发完整脚本、源码与配置文档" : "该方案涉及人工 1v1 定制或硬件/大体积数据集封装，当前处于内测阶段，暂不开放购买"}</dd></div>
            </dl>
          </details>
        </section>
        {(runnable || !isFree) && <section id={purchaseAnchor} className={styles.section}>
          <h2>{runnable ? td("runHeading") : purchasable ? "⚡ 立即使用积分购买并秒发交付包" : "🔒 暂未开放购买权限"}</h2>
          <div className={styles.checkout}>
            {runnable ? (
              runnable.available ? (
                session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}><MarketWorkflowRun listingId={offer.id} version={offer.version} details={runnable} /></MarketAccountBoundary> : <Button asChild className="h-auto min-h-10 w-full whitespace-normal py-2.5 text-center"><Link href={loginHref}>{td("loginToPrepare")}</Link></Button>
              ) : <p className="text-sm leading-7 text-muted-foreground">{w("unavailable")}</p>
            ) : purchasable ? (
              session?.user?.id ? (
                <MarketAccountBoundary actorId={session.user.id}>
                  <CreatePointsOrder key={`${offer.id}-${offer.version}`} listingId={offer.id} version={offer.version} available={availability.checkoutAvailable} tiers={tiers} priceMinor={listing.priceMinor} isOwner={isOwner} />
                  {cashOffer && !isOwner && <CreateCashOrder listingId={offer.id} version={offer.version} offer={cashOffer} />}
                </MarketAccountBoundary>
              ) : <Button asChild className="h-auto min-h-10 w-full whitespace-normal py-2.5 text-center"><Link href={loginHref}>{tp("loginToBuy")}</Link></Button>
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs leading-6 text-foreground">
                <p className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300"><Lock className="h-4 w-4 shrink-0" />交付物目前处于内测封装阶段，当前免费开放上方大纲与 Sample 样本预览。</p>
              </div>
            )}
          </div>
        </section>}
      </div>
      <aside className={styles.decision} aria-label={td("decisionTitle")}>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {purchasable ? (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-700 dark:text-emerald-300">{runnable ? "🚀 在线工作台" : isFree ? (listing.githubUrl ? "🌐 开源展示" : "🔗 免费体验") : "⚡ 支付即秒发完整包"}</span>
          ) : (
            <span className="rounded-full bg-amber-500/15 px-3 py-1 font-semibold text-amber-700 dark:text-amber-300">🔒 内测中 · 仅开放预览</span>
          )}
          <span className="rounded-full bg-muted px-3 py-1">{runnable ? td("workflowProduct") : t(listing.fulfillment)}</span>
        </div>
        <h1>{listing.title}</h1><p className={styles.summary}>{listing.summary}</p>
        {runnable ? (
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{w("computeOnRun")}</p>
        ) : purchasable ? (
          isFree ? (
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{p("realProject.freeShare")}</p>
          ) : (
            <div>
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{t("pointsUnit", { amount: points })} <span className="text-sm font-normal text-muted-foreground">（≈ ¥{yuan}）</span></p>
            </div>
          )
        ) : (
          <div>
            <p className="text-sm font-medium text-muted-foreground">参考价：{points} 积分（≈ ¥{yuan}）</p>
          </div>
        )}
        <dl className={styles.facts}>
          <div><dt>{td("deliverablesCount")}</dt><dd>{td("itemsCount", { count: listing.deliverables.length })}</dd></div>
        </dl>
        <div className="space-y-2.5">
          {runnable && runnable.available ? (
            <Button asChild className="h-auto min-h-11 w-full whitespace-normal py-3 text-center"><a href={`#${purchaseAnchor}`}>{td("prepareRun")}<ChevronRight aria-hidden="true" /></a></Button>
          ) : purchasable && isFree ? (
            <Button asChild className="h-auto min-h-11 w-full whitespace-normal py-3 text-center"><a href={freeUrl} target="_blank" rel="noopener noreferrer">{listing.usageUrl || listing.previewUrl ? "🔗 打开在线体验 / 应用" : listing.githubUrl ? "📦 访问 GitHub 开源仓库" : p("realProject.visitProduct")}<ArrowUpRight aria-hidden="true" /></a></Button>
          ) : purchasable ? (
            <Button asChild className="h-auto min-h-11 w-full whitespace-normal py-3 text-center"><a href={`#${purchaseAnchor}`}>{isOwner ? tp("ownProject") : `⚡ 立即用 ${points} 积分购买`}<ChevronRight aria-hidden="true" /></a></Button>
          ) : (
            <Button disabled variant="outline" className="h-auto min-h-11 w-full whitespace-normal py-3 text-center">🔒 交付包内测中 · 暂未开放购买</Button>
          )}
          {listing.previewUrl && listing.previewUrl !== freeUrl && (
            <Button asChild variant="outline" className="h-auto min-h-10 w-full whitespace-normal py-2.5 text-center">
              <a href={listing.previewUrl} target="_blank" rel="noopener noreferrer">🖥️ 查看演示预览 <ArrowUpRight aria-hidden="true" /></a>
            </Button>
          )}
          {listing.githubUrl && listing.githubUrl !== freeUrl && (
            <Button asChild variant="outline" className="h-auto min-h-10 w-full whitespace-normal py-2.5 text-center">
              <a href={listing.githubUrl} target="_blank" rel="noopener noreferrer">📦 查看 GitHub 源码仓库 <ArrowUpRight aria-hidden="true" /></a>
            </Button>
          )}
          {session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}><MarketStar listingId={offer.id} initialCount={offer.starCount ?? 0} initialStarred={offer.starred ?? false} /></MarketAccountBoundary> : <Button asChild variant="outline" className="h-auto min-h-10 w-full whitespace-normal py-2.5 text-center"><Link href={loginHref}><Star aria-hidden="true" />{tp("loginToStar", { count: offer.starCount ?? 0 })}</Link></Button>}
          {!runnable && purchasable && !(isFree && freeUrl === listing.usageUrl) && listing.usageUrl && !listing.usageUrl.includes("/workspace/models") && <ProjectUsageEntry usageUrl={listing.usageUrl} />}
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
