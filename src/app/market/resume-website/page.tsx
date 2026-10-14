import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMarketListing } from "@/server/marketplace/listings";
import { marketWorkflowDetails } from "@/server/marketplace/workflows";
import { MarketRuleError } from "@/domain/marketplace/order";
import { ResumeWebsiteMarketProduct } from "@/components/marketplace/resume-website-market-product";

export const dynamic = "force-dynamic";

export default async function ResumeWebsiteMarketPage() {
  const session = await auth();
  let offer;
  try {
    offer = await getMarketListing("resume-website", session?.user?.id);
  } catch (error) {
    if (error instanceof MarketRuleError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const runnable = await marketWorkflowDetails(offer);
  if (!runnable?.available || runnable.recipe !== "resume-website-v1") notFound();
  return <ResumeWebsiteMarketProduct offer={offer} session={session} />;
}
