import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProjectServiceError, getProject } from "@/server/projects/service";
import { ProjectStudio } from "@/components/projects/project-studio";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "项目事实与成果" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  let project;
  try {
    project = await getProject(id, session.user.id);
  } catch (error) {
    if (error instanceof ProjectServiceError && error.status === 404) notFound();
    throw error;
  }
  return <div className="container space-y-6 py-10"><Link href="/projects" className="text-sm text-muted-foreground">返回项目列表</Link><ProjectStudio project={project} /></div>;
}
