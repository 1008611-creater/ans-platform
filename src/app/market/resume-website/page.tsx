import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMarketListing } from "@/server/marketplace/listings";
import { MarketRuleError } from "@/domain/marketplace/order";
import { ResumeWebsiteMarketProduct } from "@/components/marketplace/resume-website-market-product";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  try {
    const offer = await getMarketListing("resume-website");
    return { title: offer.listing.title, description: offer.listing.summary, alternates: { canonical: "/market/resume-website" } };
  } catch (error) {
    if (error instanceof MarketRuleError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

export default async function ResumeWebsiteMarketPage() {
  const session = await auth();
  let offer;
  try {
    offer = await getMarketListing("resume-website", session?.user?.id);
  } catch (error) {
    if (error instanceof MarketRuleError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  return <ResumeWebsiteMarketProduct offer={offer} session={session} />;
}
