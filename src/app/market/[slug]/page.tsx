import { publicationConfig } from "@/server/visual-portfolio/publication";
import { VisualWebsiteExperience } from "@/components/projects/visual-website-experience";
import { MarketWorkflowRun } from "@/components/marketplace/workflow-run";
import { marketWorkflowDetails } from "@/server/marketplace/workflows";
import { auth } from "@/lib/auth";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { CreateCashOrder } from "@/components/marketplace/cash-payment";
import { CreatePointsOrder } from "@/components/marketplace/create-points-order";
import { ProjectUsageEntry } from "@/components/marketplace/project-usage-entry";
import { MarketStar } from "@/components/marketplace/market-star";
import Link from "next/link";
import Image from "next/image";
import { Check, ExternalLink, Github, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMarketListing } from "@/server/marketplace/listings";
import { marketCheckoutAvailability, marketCashOffer } from "@/server/marketplace/orders";
import { MarketRuleError } from "@/domain/marketplace/order";
import { MarketFrame } from "@/components/marketplace/frame";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";

export default async function MarketDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const [t, tp, p, session] = await Promise.all([getTranslations("product.market"), getTranslations("product.marketProject"), getTranslations("product"), auth()]);
  const offer = await getMarketListing(slug, session?.user?.id).catch(error => { if (error instanceof MarketRuleError && error.code === "NOT_FOUND") notFound(); throw error; });
  const w = await getTranslations("marketWorkflow");
  const runnable = await marketWorkflowDetails(offer);
  const listing = offer.listing; const tiers = listing.pricingTiers ?? [];
  const minimum = tiers.length ? Math.min(...tiers.map(tier => tier.priceMinor)) : listing.priceMinor;
  const isFree = minimum === 0; const isOwner = session?.user?.id === offer.seller.id;
  const availability = marketCheckoutAvailability(); const cashOffer = runnable ? null : marketCashOffer(offer.id, offer.version, offer.seller.id);
  const freeUrl = listing.usageUrl ?? listing.sourceUrl ?? listing.githubUrl ?? listing.previewUrl;
  const loginHref = "/login?callbackUrl=" + encodeURIComponent("/market/" + slug);
  if (runnable?.available && runnable.recipe === "resume-website-v1") {
    const editor = <VisualWebsiteExperience publicationAvailable={publicationConfig().available} execution={{ listingId: offer.id, version: offer.version, details: runnable }} licenseTerms={listing.licenseTerms}/>;
    return session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}>{editor}</MarketAccountBoundary> : editor;
  }
  return <MarketFrame title={listing.title} description={listing.summary} actions={<Button asChild variant="outline"><Link href="/market">{tp("backToMarket")}</Link></Button>}>
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.65fr)]"><div className="min-w-0 space-y-6">
      {listing.coverUrl && <div className="overflow-hidden rounded-2xl border bg-muted/30"><Image unoptimized src={listing.coverUrl} width={1200} height={675} alt={tp("projectCover", { title: listing.title })} className="aspect-video w-full object-cover" priority/></div>}
      {(listing.githubUrl || listing.previewUrl || (isFree && listing.usageUrl)) && <div className="flex flex-wrap gap-3">{listing.githubUrl && <Button asChild variant="outline"><a href={listing.githubUrl} target="_blank" rel="noopener noreferrer"><Github aria-hidden="true"/>{tp("viewGithub")}</a></Button>}{listing.previewUrl && <Button asChild variant="outline"><a href={listing.previewUrl} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true"/>{t("preview")}</a></Button>}{isFree && listing.usageUrl && <Button asChild variant="outline"><a href={listing.usageUrl} target="_blank" rel="noopener noreferrer">{tp("useProject")}</a></Button>}</div>}
      <section className="ans-detail-block"><h2 className="text-xl font-semibold">{t("whatYouGet")}</h2><ul className="mt-5 space-y-3">{listing.deliverables.map((item,index) => <li key={index} className="flex gap-3 text-sm leading-7"><Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-primary"/><span className="min-w-0 break-words">{item}</span></li>)}</ul></section>
      <section className="ans-detail-block"><h2 className="text-xl font-semibold">{t("details")}</h2><p className="mt-5 whitespace-pre-wrap break-words text-sm leading-8">{listing.description}</p>{listing.sourceUrl && <a href={listing.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-sm text-primary underline">{t("source")}</a>}</section>
      <section className="ans-detail-block"><h2 className="text-xl font-semibold">{t("license")}</h2><p className="mt-5 whitespace-pre-wrap break-words text-sm leading-8">{listing.licenseTerms}</p></section>
    </div><aside className="min-w-0"><section className="ans-detail-block space-y-5 lg:sticky lg:top-24"><p className="text-sm text-primary">{p("categories." + listing.category)} · {p("children." + listing.subcategory)}</p><p className="text-3xl font-semibold tabular-nums">{runnable ? w("computeOnRun") : isFree ? p("realProject.freeShare") : tiers.length > 1 ? tp("fromPoints", { amount: minimum / 100 }) : t("pointsUnit", { amount: minimum / 100 })}</p><p className="text-sm">{runnable ? w("runnable") : <>{t(listing.fulfillment)} · {t("delivery", { days: listing.deliveryDays })} · {t("revisions", { count: listing.revisionLimit })}</>}</p><p className="text-sm text-muted-foreground">{t(listing.computeIncluded ? "computeYes" : "computeNo")}</p><Link href={"/@" + offer.seller.username} className="block text-sm text-primary underline">{offer.official ? p("official") : offer.seller.nickname || offer.seller.username}</Link>
      {!runnable && !isFree && listing.usageUrl && <ProjectUsageEntry usageUrl={listing.usageUrl}/>}
      {session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}><div className="space-y-5"><MarketStar listingId={offer.id} initialCount={offer.starCount ?? 0} initialStarred={offer.starred ?? false}/>{!runnable && !isFree && <><CreatePointsOrder key={`${offer.id}-${offer.version}`} listingId={offer.id} version={offer.version} available={availability.checkoutAvailable} tiers={tiers} priceMinor={listing.priceMinor} isOwner={isOwner}/>{cashOffer && <CreateCashOrder listingId={offer.id} version={offer.version} offer={cashOffer}/>}</>}</div></MarketAccountBoundary> : <><Button asChild variant="outline" className="w-full"><Link href={loginHref}><Star aria-hidden="true"/>{tp("loginToStar", { count: offer.starCount ?? 0 })}</Link></Button>{!runnable && !isFree && <Button asChild className="w-full"><Link href={loginHref}>{tp("loginToBuy")}</Link></Button>}</>}
      {runnable && <>{runnable.available ? session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}><MarketWorkflowRun listingId={offer.id} version={offer.version} details={runnable}/></MarketAccountBoundary> : <Button asChild className="w-full"><Link href={loginHref}>{t("errors.UNAUTHORIZED")}</Link></Button> : <p className="text-sm text-muted-foreground">{w("unavailable")}</p>}</>}
      {!runnable && isFree && freeUrl && <><Button asChild className="w-full"><a href={freeUrl} target="_blank" rel="noopener noreferrer">{p("realProject.visitProduct")}</a></Button><p className="text-xs leading-6 text-muted-foreground">{p("realProject.freeNote")}</p></>}{!runnable && !isFree && <p className="text-xs leading-6 text-muted-foreground">{t("paymentNotice")}</p>}{!runnable && isOwner && <Button asChild variant="outline" className="w-full"><Link href={`/market/creator/${offer.id}/integration`}>{tp("integrationAction")}</Link></Button>}<p className="text-xs text-muted-foreground">{t("version", { version: offer.version })}</p>
    </section></aside></div>
  </MarketFrame>;
}
