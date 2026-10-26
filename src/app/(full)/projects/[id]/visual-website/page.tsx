import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { VisualWebsiteStudio } from "@/components/projects/visual-website-studio";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { getVisualWebsite } from "@/server/projects/visual-website";
import { ProjectServiceError } from "@/server/projects/service";
import { getMarketListing } from "@/server/marketplace/listings";
import { marketWorkflowDetails } from "@/server/marketplace/workflows";
import { MarketRuleError } from "@/domain/marketplace/order";

// Resuming a private artifact keeps the same reviewed copy assistant as its market editor.
// Withdrawal of the public product must not prevent editing or exporting a saved artifact.
async function copyExecution(actorId: string) {
 try {
  const offer = await getMarketListing("resume-website", actorId);
  const details = await marketWorkflowDetails(offer);
  return details?.available && details.recipe === "resume-website-v1"
   ? { listingId: offer.id, version: offer.version, details } : undefined;
 } catch (error) {
  if (error instanceof MarketRuleError && error.code === "NOT_FOUND") return undefined;
  throw error;
 }
}
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params; const session = await auth();
 if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/projects/${id}/visual-website`)}`);
 const initial = await getVisualWebsite(id, session.user.id).catch(error => { if (error instanceof ProjectServiceError && error.code === "NOT_FOUND") notFound(); throw error; });
 const execution = await copyExecution(session.user.id);
 return <div><div><MarketAccountBoundary actorId={session.user.id}><div data-visual-editor><VisualWebsiteStudio initial={initial} execution={execution} immersive/></div></MarketAccountBoundary></div></div>;
}
