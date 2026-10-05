import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { projectPackWorkflowIds, type ProjectGoal } from "@/contracts/projects";
import { listProjects } from "@/server/projects/service";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("learning");
  return { title: t("projectsTitle"), description: t("projectsDescription") };
}

export default async function ProjectsPage({ searchParams }: { searchParams?: Promise<{ goal?: string | string[] }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/projects");
  const [projects, t] = await Promise.all([listProjects(session.user.id), getTranslations("learning")]);
  const requestedGoal = (await searchParams)?.goal;
  const goal = Array.isArray(requestedGoal) ? requestedGoal[0] : requestedGoal;
  const initialGoal: ProjectGoal = goal === "contest" || goal === "portfolio" ? goal : "career";
  return (
    <div className="container space-y-8 py-10">
      <header className="max-w-3xl space-y-3"><h1 className="text-3xl font-bold">{t("projectsTitle")}</h1><p className="text-muted-foreground">{t("projectsDescription")}</p><Link className="inline-block text-sm text-primary underline" href="/#first-lesson">{t("viewLesson")}</Link></header>
      <div className="grid gap-3 md:grid-cols-3">{[1, 2, 3].map((step) => <Card key={step}><CardHeader><CardTitle className="text-base">{t(`step${step}Title`)}</CardTitle><CardDescription>{t(`step${step}Body`)}</CardDescription></CardHeader></Card>)}</div>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card id="new-project" className="scroll-mt-20"><CardHeader><CardTitle>{t("newProject")}</CardTitle></CardHeader><CardContent><CreateProjectForm key={initialGoal} initialGoal={initialGoal} /></CardContent></Card>
        <div className="space-y-3">{projects.length === 0 ? <Card className="border-dashed"><CardContent className="space-y-2 py-10"><p className="font-medium">{t("emptyTitle")}</p><p className="text-sm text-muted-foreground">{t("emptyBody")}</p></CardContent></Card> : projects.map((project) => <Link key={project.id} href={`/projects/${project.id}`} className="block"><Card><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="text-base">{project.title}</CardTitle><Badge variant="secondary">{t(project.goal)}</Badge></div><CardDescription>{t("progress", { count: projectPackWorkflowIds.filter((id) => project.artifacts.some((artifact) => artifact.workflowId === id && artifact.versions.length > 0)).length })}</CardDescription></CardHeader></Card></Link>)}</div>
      </div>
    </div>
  );
}
