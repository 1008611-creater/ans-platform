import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { projectPackWorkflowIds, type ProjectGoal } from "@/contracts/projects";
import { listProjects } from "@/server/projects/service";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { resolveProjectSelection } from "@/domain/catalog/selection";
import { Badge } from "@/components/ui/badge";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("learning");
  return { title: t("projectsTitle"), description: t("projectsDescription") };
}

export default async function ProjectsPage({ searchParams }: { searchParams?: Promise<{ goal?: string | string[]; workflow?: string | string[] }> }) {
  const selection = resolveProjectSelection(await searchParams ?? {});
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(selection.callbackPath)}`);
  const [projects, t, p, v] = await Promise.all([listProjects(session.user.id), getTranslations("learning"), getTranslations("product"), getTranslations("visualWebsite")]);
  const initialGoal: ProjectGoal = selection.goal;
  return (
    <div className="ans-product-container ans-page-content ans-projects-page">
      <PageHeading title={t("projectsTitle")} description={t("projectsDescription")}
        actions={<Button asChild variant="outline"><Link href="/explore">{p("nav.explore")}</Link></Button>} />
      <details className="mb-6"><summary className="cursor-pointer py-2 text-sm font-medium">{t("projectGuideQuestion")}</summary><ol className="ans-project-steps">{[1, 2, 3].map((step) => <li key={step}><span className="ans-project-step-number" aria-hidden="true">0{step}</span><div><h2>{t(`step${step}Title`)}</h2><p>{t(`step${step}Body`)}</p></div></li>)}</ol></details>
      <div className="ans-private-project-grid">
        <Card id="new-project" className="scroll-mt-20"><CardHeader><CardTitle>{t("newProject")}</CardTitle></CardHeader><CardContent><CreateProjectForm key={`${initialGoal}-${selection.workflowId}`} initialGoal={initialGoal} initialWorkflowId={selection.workflowId} /></CardContent></Card>
        <div className="space-y-3">{projects.length === 0 ? <Card className="border-dashed"><CardContent className="space-y-2 py-10"><p className="font-medium">{t("emptyTitle")}</p><p className="text-sm text-muted-foreground">{t("emptyBody")}</p></CardContent></Card> : projects.map((project) => <Link key={project.id} href={project.artifacts.some(a => a.workflowId === "visual-portfolio-v1") ? `/projects/${project.id}/visual-website` : `/projects/${project.id}`} className="block"><Card><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="text-base">{project.title}</CardTitle><Badge variant="secondary">{t(project.goal)}</Badge></div><CardDescription>{project.artifacts.some(a => a.workflowId === "visual-portfolio-v1") ? v("saved", {version: project.artifacts.find(a => a.workflowId === "visual-portfolio-v1")!.currentVersion}) : t("progress", { count: projectPackWorkflowIds.filter((id) => project.artifacts.some((artifact) => artifact.workflowId === id && artifact.versions.length > 0)).length })}</CardDescription></CardHeader></Card></Link>)}</div>
      </div>
    </div>
  );
}
