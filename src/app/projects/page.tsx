import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProjects } from "@/server/projects/service";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "学生项目包", description: "把真实项目事实整理成可保存、可导出的材料。" };
const GOAL_LABEL = { career: "求职", contest: "比赛", portfolio: "作品" };

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/projects");
  const projects = await listProjects(session.user.id);
  return (
    <div className="container space-y-8 py-10">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-bold">学生项目包</h1>
        <p className="text-muted-foreground">先写清一个真实项目的事实，再生成简历、README、项目介绍和比赛材料。缺失内容会保留为“暂无”或“待确认”。</p>
      </header>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["1. 写事实", "只填写做过的事、使用的方法和能证明的结果。"],
          ["2. 生成材料", "先完成简历条目、README 和一页介绍。"],
          ["3. 检查导出", "确认内容后保存版本，再导出继续修改。"],
        ].map(([title, description]) => <Card key={title}><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader></Card>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card><CardHeader><CardTitle>新建项目</CardTitle><CardDescription>选择这份材料的用途，项目默认只有自己可见。</CardDescription></CardHeader><CardContent><CreateProjectForm /></CardContent></Card>
        <div className="space-y-3">{projects.length === 0 ? <Card className="border-dashed"><CardContent className="space-y-2 py-10"><p className="font-medium">从一份真实项目开始</p><p className="text-sm text-muted-foreground">例如课程作业、比赛作品或实习项目。创建后先填写五项事实。</p></CardContent></Card> : projects.map((project) => <Link key={project.id} href={`/projects/${project.id}`} className="block"><Card><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="text-base">{project.title}</CardTitle><Badge variant="secondary">{GOAL_LABEL[project.goal]}</Badge></div><CardDescription>已完成 {project.artifacts.length}/8 份材料</CardDescription></CardHeader></Card></Link>)}</div>
      </div>
    </div>
  );
}
