import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { VisualWebsiteStudio } from "@/components/projects/visual-website-studio";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { getVisualWebsite } from "@/server/projects/visual-website";
import { ProjectServiceError } from "@/server/projects/service";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params; const session = await auth();
 if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/projects/${id}/visual-website`)}`);
 const initial = await getVisualWebsite(id, session.user.id).catch(error => { if (error instanceof ProjectServiceError && error.code === "NOT_FOUND") notFound(); throw error; });
 return <div><div><MarketAccountBoundary actorId={session.user.id}><div data-visual-editor><VisualWebsiteStudio initial={initial} immersive/></div></MarketAccountBoundary></div></div>;
}
