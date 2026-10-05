import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProjectServiceError, getProject } from "@/server/projects/service";
import { ProjectStudio } from "@/components/projects/project-studio";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("learning");
  return { title: t("studioTitle") };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/projects/${id}`)}`);
  const t = await getTranslations("learning");
  let project;
  try {
    project = await getProject(id, session.user.id);
  } catch (error) {
    if (error instanceof ProjectServiceError && error.status === 404) notFound();
    throw error;
  }
  return <div className="container space-y-6 py-10"><Link href="/projects" className="text-sm text-muted-foreground">{t("back")}</Link><ProjectStudio project={project} /></div>;
}
