import { auth } from "@/lib/auth";
import { VisualWebsiteExperience } from "@/components/projects/visual-website-experience";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
export const dynamic = "force-dynamic";
export default async function Page() {
 const session = await auth();
 const editor = <VisualWebsiteExperience/>;
 return session?.user?.id ? <MarketAccountBoundary actorId={session.user.id}>{editor}</MarketAccountBoundary> : editor;
}
