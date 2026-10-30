import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getResumeWebsiteState, ResumeWebsiteError } from "@/server/projects/resume-website";
import { ResumeWebsiteStudio } from "@/components/projects/resume-website-studio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function generateMetadata() { const t = await getTranslations("product.website"); return { title: t("title"), robots: { index: false, follow: false } }; }
export default async function WebsitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/projects/${encodeURIComponent(id)}/website`)}`);
  let initial;
  try { initial = await getResumeWebsiteState(id, session.user.id); }
  catch (error) { if (error instanceof ResumeWebsiteError && error.status === 404) notFound(); throw error; }
  return <ResumeWebsiteStudio initial={initial} />;
}
