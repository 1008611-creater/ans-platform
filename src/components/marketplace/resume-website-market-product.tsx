import { Suspense } from "react";
import { ArrowLeft, ArrowUpRight, ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { marketWorkflowDetails } from "@/server/marketplace/workflows";
import { generationConfig } from "@/server/visual-portfolio/jobs";
import { publicationConfig } from "@/server/visual-portfolio/publication";
import { VisualWebsiteExperience } from "@/components/projects/visual-website-experience";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { MarketStar } from "@/components/marketplace/market-star";
import { MarketProductConnections } from "@/components/marketplace/market-product-connections";
import { Button } from "@/components/ui/button";
import type { MarketOfferView } from "@/contracts/marketplace-view";
import styles from "./market-detail.module.css";

type WorkflowDetails = Awaited<ReturnType<typeof marketWorkflowDetails>>;

type SessionLike = { user?: { id?: string | null } | null } | null;

/** A truthful marketplace contract surrounds the full-width specialist studio. */
export async function ResumeWebsiteMarketProduct({ offer, session, runnable }: { offer: MarketOfferView; session: SessionLike; runnable: WorkflowDetails }) {
  const [t, tp, p, td, ts] = await Promise.all([
    getTranslations("product.market"), getTranslations("product.marketProject"),
    getTranslations("product"), getTranslations("product.marketDetail"),
    getTranslations("product.marketStudio"),
  ]);
  const listing = offer.listing;
  const readyDetails = runnable?.available && runnable.recipe === "resume-website-v1" ? runnable : null;
  const sellerName = offer.seller.nickname || offer.seller.username;
  const publicationAvailable = publicationConfig().available;
  const editor = <VisualWebsiteExperience embedded publicationAvailable={publicationAvailable} modelGenerationAvailable={generationConfig().available}
    execution={readyDetails ? { listingId: offer.id, version: offer.version, details: readyDetails } : undefined}
    licenseTerms={listing.licenseTerms} />;
  const loginHref = "/login?callbackUrl=" + encodeURIComponent("/market/resume-website");

  return <div className="ans-product-shell" data-market-studio><div className="ans-product-container ans-page-content ans-market-page">
    <nav className={styles.breadcrumb} aria-label={td("breadcrumb")}>
      <Link href="/market" className="inline-flex items-center gap-2"><ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />{tp("backToMarket")}</Link>
      <ChevronRight aria-hidden="true" className="h-3 w-3" /><span>{p("categories." + listing.category)}</span>
      <ChevronRight aria-hidden="true" className="h-3 w-3" /><span>{ts("title")}</span>
    </nav>
    <header className={styles.studioOverview}>
      <div>
        <div className={styles.workflowMeta}><span className={styles.workflowBadge}>{td("workflowProduct")}</span><span>{t("version", { version: offer.version })}</span><span>{offer.official ? p("official") : sellerName}</span></div>
        <h1>{ts("title")}</h1><p className={styles.studioLead}>{ts("summary")}</p>
        <div className={styles.studioActions}>
          <Button asChild><a href="#market-run">{ts("tryEditor")}<ArrowUpRight aria-hidden="true" /></a></Button>
          <a href="#market-terms" className="text-sm underline underline-offset-4">{td("termsTitle")}</a>
        </div>
      </div>
      <aside className={styles.studioContract} aria-label={td("decisionTitle")}>
        <strong>{ts("freeEditing")}</strong><p>{ts("costNote")}</p>
        <dl><div><dt>{ts("aiCopy")}</dt><dd>{ts(readyDetails ? "copyReady" : "copyUnavailable")}</dd></div><div><dt>{ts("sharing")}</dt><dd>{ts(publicationAvailable ? "sharingReady" : "sharingUnavailable")}</dd></div></dl>
        <div className={styles.studioPublisher}>
          <Link href={"/@" + offer.seller.username} className="flex min-w-0 items-center gap-2">
            {offer.seller.avatar ? <Image unoptimized src={offer.seller.avatar} width={28} height={28} alt="" className="rounded-full" /> : <span className={styles.avatarFallback} aria-hidden="true">{sellerName.slice(0, 1)}</span>}
            <span className="break-words text-sm">{sellerName}</span>
          </Link>
          {session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}><MarketStar listingId={offer.id} initialCount={offer.starCount ?? 0} initialStarred={offer.starred ?? false} /></MarketAccountBoundary> : <Button asChild variant="ghost" size="sm"><Link href={loginHref}><Star aria-hidden="true" />{tp("loginToStar", { count: offer.starCount ?? 0 })}</Link></Button>}
        </div>
      </aside>
    </header>
    {!readyDetails && <p className={styles.studioAvailability} role="status">{ts("copyUnavailableNote")}</p>}
    <section id="market-run" className={styles.workflowStage} aria-label={ts("editorTitle")}>
      {session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}>{editor}</MarketAccountBoundary> : editor}
    </section>
    <div className={styles.studioDetails}>
      <div>
        <section id="market-deliverables" className={styles.section}>
          <h2>{td("deliverablesTitle")}</h2>
          <ul className={styles.deliverables}>{["deliverableWebsite", "deliverableDraft", "deliverableAccount"].map((key, index) => <li key={key}><span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{ts(key)}</span></li>)}</ul>
        </section>
        <details id="market-details" className={styles.section} open>
          <summary className="cursor-pointer py-2 text-sm font-semibold">{ts("howTitle")}</summary>
          <ol className={styles.studioSteps}>{["avatar", "prepare", "compose", "deliver"].map((key, index) => <li key={key}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{ts(key + "Title")}</h3><p>{ts(key + "Body")}</p></div></li>)}</ol>
        </details>
        <Suspense fallback={null}><MarketProductConnections offer={offer} /></Suspense>
      </div>
      <section id="market-terms" className={styles.section}>
        <h2>{td("termsTitle")}</h2>
        <dl className={styles.terms}>
          <div><dt>{ts("inputTitle")}</dt><dd>{ts("inputNote")}</dd></div>
          <div><dt>{td("costBoundaryTitle")}</dt><dd>{ts("costBoundary")}</dd></div>
          <div><dt>{ts("privacyTitle")}</dt><dd>{ts("privacyNote")}</dd></div>
          <div><dt>{td("licenseTitle")}</dt><dd className="whitespace-pre-wrap">{listing.licenseTerms}</dd></div>
          <div><dt>{td("versionTitle")}</dt><dd>{ts("versionNote", { version: offer.version })}{readyDetails && <> {td("workflowVersionNote", { version: readyDetails.version })}</>}</dd></div>
        </dl>
        <details className="mt-6 text-sm"><summary className="cursor-pointer py-2 font-medium">{ts("publishedSpec")}</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{listing.description}</p><ul className="mt-3 list-inside list-disc text-sm leading-7">{listing.deliverables.map((item, index) => <li key={index}>{item}</li>)}</ul></details>
      </section>
    </div>
  </div></div>;
}
