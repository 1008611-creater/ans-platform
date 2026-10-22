import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProjectServiceError, getProject } from "@/server/projects/service";
import { ProjectStudio } from "@/components/projects/project-studio";
import { ProjectAgentChat } from "@/components/agent/project-agent-chat";
import { resolveProjectSelection, studioSelectionHref } from "@/domain/catalog/selection";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("learning");
  return { title: t("studioTitle") };
}

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ workflow?: string | string[] }> }) {
  const selection = resolveProjectSelection(await searchParams);
  const session = await auth();
  const { id } = await params;
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(studioSelectionHref(id, selection.workflowId))}`);
  if (selection.workflowId === "resume-website") redirect(studioSelectionHref(id, selection.workflowId));
  const t = await getTranslations("learning");
  let project;
  try {
    project = await getProject(id, session.user.id);
  } catch (error) {
    if (error instanceof ProjectServiceError && error.status === 404) notFound();
    throw error;
  }
  const locale = (await getLocale()) === "en" ? "en" : "zh";
  return (
    <div className="container space-y-6 py-10">
      <Link href="/projects" className="text-sm text-muted-foreground">{t("back")}</Link>
      {/* 图文介绍（ProjectStudio）+ 这个项目专属的 Agent：右侧常驻，滚动时跟随。 */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <ProjectStudio project={project} initialWorkflowId={selection.workflowId} />
        <div className="xl:sticky xl:top-6">
          <ProjectAgentChat actor={session.user.id} pathname={`/projects/${id}`} locale={locale} projectTitle={project.title} />
        </div>
      </div>
    </div>
  );
}
