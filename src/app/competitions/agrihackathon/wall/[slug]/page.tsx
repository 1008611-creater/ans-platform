import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AgriContestantFlowBar } from "@/components/competitions/agri-contestant-flow-bar";
import { Button } from "@/components/ui/button";
import { AgriWallShareStar } from "@/components/competitions/agri-wall-share-star";
import { readAgriWallShare } from "@/server/competitions/agrihackathon/share";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await readAgriWallShare(slug);
  if (!data) notFound();
  const t = await getTranslations("agriWall");
  const { entry } = data;
  const title = `${entry.offer.listing.title} · ${entry.teamName}`;
  const description = `${t(data.round?.state === "CLOSED" ? "frozenStars" : "validStars")} ${entry.validStars} · ${entry.offer.listing.summary}`;
  const url = `/competitions/agrihackathon/wall/${encodeURIComponent(slug)}`;
  const images = entry.offer.listing.coverUrl ? [{ url: entry.offer.listing.coverUrl, alt: entry.offer.listing.title }] : [];
  return { title, description, alternates: { canonical: url },
    openGraph: { type: "website", title, description, url, images },
    twitter: { card: images.length ? "summary_large_image" : "summary", title, description, images },
  };
}
export default async function AgriWallSharePage({ params }: Props) {
  const { slug } = await params;
  const data = await readAgriWallShare(slug);
  if (!data) notFound();
  const t = await getTranslations("agriWall"), nav = await getTranslations("product.agrihackathon");
  const { entry, round } = data;
  const listing = entry.offer.listing;
  const href = `/competitions/agrihackathon/wall/${encodeURIComponent(slug)}`;
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:py-12">
    <AgriContestantFlowBar current="wall" backHref="/explore?category=competition&subcategory=agri-wall" backLabel={t("backWall")} nav={nav} />
    <article className="overflow-hidden rounded-2xl border bg-card">
      {listing.coverUrl && <Image src={listing.coverUrl} alt="" width={1200} height={750} unoptimized className="aspect-[8/5] w-full object-cover" />}
      <div className="space-y-6 p-6 sm:p-9"><header><p className="text-sm text-muted-foreground">{entry.teamName}</p><h1 className="mt-3 break-words text-3xl font-semibold">{listing.title}</h1><p className="mt-4 break-words leading-7 text-muted-foreground">{listing.summary}</p></header>
        <div className="flex items-center justify-between gap-4 rounded-xl border p-4"><span>{t(round?.state === "CLOSED" ? "frozenStars" : "validStars")}</span><strong className="text-3xl tabular-nums">{entry.validStars}</strong></div>
        <AgriWallShareStar listingId={entry.offer.id} href={href} />
        <div className="flex flex-wrap gap-3">{listing.githubUrl && <Button asChild variant="outline"><a href={listing.githubUrl} target="_blank" rel="noopener noreferrer">GitHub</a></Button>}{(listing.previewUrl || listing.usageUrl) && <Button asChild variant="outline"><a href={listing.previewUrl || listing.usageUrl} target="_blank" rel="noopener noreferrer">{t("demo")}</a></Button>}<Button asChild variant="outline"><Link href={`/explore/member-${entry.offer.slug}`}>{t("details")}</Link></Button></div>
      </div>
    </article>
  </main>;
}
