import { cache } from "react";
import { notFound } from "next/navigation";
import { readMarketPage } from "@/server/marketplace/product-read";
import { MarketRuleError } from "@/domain/marketplace/order";
import { ResumeWebsiteMarketProduct } from "@/components/marketplace/resume-website-market-product";

export const dynamic = "force-dynamic";

const publishedResume = cache(async () => {
  try { return await readMarketPage("resume-website"); }
  catch (error) {
    if (error instanceof MarketRuleError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
});

export async function generateMetadata() {
  const { offer } = await publishedResume();
  return { title: offer.listing.title, description: offer.listing.summary, alternates: { canonical: "/market/resume-website" } };
}

export default async function ResumeWebsiteMarketPage() {
  const { session, offer, runnable } = await publishedResume();
  return <ResumeWebsiteMarketProduct offer={offer} session={session} runnable={runnable} />;
}
