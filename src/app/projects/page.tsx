import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
  return { title: `${t("projectsTitle")} · ANS 项目立项与作品集工坊`, description: t("projectsDescription") };
}

const QUICK_KICKOFF_CARDS = [
  {
    id: "agri",
    badge: "📖 引导模板 1 · 农客松赛道",
    title: "农客松参赛项目",
    defaultTitle: "智慧农业作物病虫害识别与防治建议系统",
    goal: "contest" as ProjectGoal,
    workflow: "contest-mvp",
    summary: "适合参加中国农大智耕黑客松的同学：自动帮你生成立项书、基础代码结构与答辩提纲。",
    coverUrl: "/competitions/agrihackathon/gitglow-hub.webp",
    sandboxHref: "/workspace?thread=thread-agri",
  },
  {
    id: "aigc",
    badge: "📖 引导模板 2 · AIGC 视觉与视频赛道",
    title: "AIGC 多模态创作项目",
    defaultTitle: "多模态无限画布视觉与视频生成项目",
    goal: "portfolio" as ProjectGoal,
    workflow: "project-one-pager",
    summary: "适合参加 AIGC 视觉与视频创作的同学：帮你整理创意梗概、视觉风格参考与分镜脚本。",
    coverUrl: "/catalog/gitglow-v1/infinite-canvas.webp",
    sandboxHref: "/workspace?thread=thread-aigc",
  },
  {
    id: "resume",
    badge: "📖 引导模板 3 · 求职与个人主页",
    title: "3D 个人简历站",
    defaultTitle: "我的 3D 交互个人简历与作品集网站",
    goal: "career" as ProjectGoal,
    workflow: "resume-website",
    summary: "适合做保研/求职作品集：填写个人经历后直接生成带 3D 互动效果的双语个人网站源码。",
    coverUrl: "/catalog/gitglow-v1/magic-resume.webp",
    sandboxHref: "/workspace?thread=thread-portfolio",
  },
] as const;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ goal?: string | string[]; workflow?: string | string[]; preset?: string | string[]; title?: string | string[] }>;
}) {
  const rawParams = (await searchParams) ?? {};
  const selection = resolveProjectSelection(rawParams);
  const presetParam = typeof rawParams.preset === "string" ? rawParams.preset : undefined;
  const rawTitleParam = Array.isArray(rawParams.title) ? rawParams.title[0] : rawParams.title;
  const matchedPreset = QUICK_KICKOFF_CARDS.find((item) => item.id === presetParam);
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const [projects, t, p, v] = await Promise.all([
    userId ? listProjects(userId) : Promise.resolve([]),
    getTranslations("learning"),
    getTranslations("product"),
    getTranslations("visualWebsite"),
  ]);
  const initialGoal: ProjectGoal = matchedPreset?.goal ?? selection.goal;
  const initialTitle = rawTitleParam?.trim() || matchedPreset?.defaultTitle || "";

  return (
    <div className="ans-product-container ans-page-content ans-projects-page space-y-7">
      <div className="space-y-2">
        <PageHeading
          title={`${t("projectsTitle")} · 项目立项与作品集`}
          description="创建并管理你的比赛项目、课程课题或个人简历网站。"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500">
                <Link href="/workspace">🛠️ 打开个人工作台</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/explore">{p("nav.explore")}</Link>
              </Button>
            </div>
          }
        />
      </div>

      {!userId && (
        <div
          data-testid="projects-guest-banner"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 sm:flex-row sm:items-center"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-500">
              📖 免登录立项预览
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">
              当前未登录 · 可直接试填或点下方模板自动带入，提交时引导登录保存
            </span>
          </div>
          <Button asChild size="sm" className="shrink-0 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500">
            <Link href={`/login?callbackUrl=${encodeURIComponent(selection.callbackPath)}`}>🔐 登录管理项目 →</Link>
          </Button>
        </div>
      )}

      {/* Real Project Creation & User's Real Projects First */}
      <div className="ans-private-project-grid">
        <Card id="new-project" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>{t("newProject")}</CardTitle>
            <CardDescription>
              输入课题名称即可立项，或点选下方引导模板一键填入。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateProjectForm
              key={`${initialGoal}-${selection.workflowId ?? "none"}-${initialTitle}`}
              initialGoal={initialGoal}
              initialWorkflowId={selection.workflowId}
              initialTitle={initialTitle}
              guestMode={!userId}
              callbackPath={selection.callbackPath}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">
                📂 我的真实立项项目 ({userId ? projects.length : 0})
              </h2>
              {!userId && (
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(selection.callbackPath)}`}
                  className="text-xs font-semibold text-primary underline underline-offset-4"
                >
                  登录查看我的项目 →
                </Link>
              )}
            </div>
            {userId && projects.length > 0 ? (
              projects.map((project) => (
                <Link
                  key={project.id}
                  href={
                    project.artifacts.some((a) => a.workflowId === "visual-portfolio-v1")
                      ? `/projects/${project.id}/visual-website`
                      : `/projects/${project.id}`
                  }
                  className="block"
                >
                  <Card className="transition hover:border-primary/50">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-base">{project.title}</CardTitle>
                        <Badge variant="secondary">{t(project.goal)}</Badge>
                      </div>
                      <CardDescription>
                        {project.artifacts.some((a) => a.workflowId === "visual-portfolio-v1")
                          ? v("saved", {
                              version: project.artifacts.find((a) => a.workflowId === "visual-portfolio-v1")!
                                .currentVersion,
                            })
                          : t("progress", {
                              count: projectPackWorkflowIds.filter((id) =>
                                project.artifacts.some((artifact) => artifact.workflowId === id && artifact.versions.length > 0),
                              ).length,
                            })}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))
            ) : (
              <Card className="border-dashed bg-muted/20">
                <CardHeader className="py-8 text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    {userId ? "暂无立项项目" : "登录后显示你创建的真实项目"}
                  </p>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Onboarding Quick Templates (Collapsed on-demand reference cards) */}
      <details aria-label="3 大快速立项卡片" className="group rounded-2xl border border-dashed border-border/80 bg-muted/15 p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold tracking-tight text-foreground">
          <span>📖 查看 3 大赛道立项参考样板（可预览完整范例效果）</span>
          <span className="text-xs font-normal text-muted-foreground group-open:hidden">点击展开 ▾</span>
          <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">收起 ▴</span>
        </summary>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {QUICK_KICKOFF_CARDS.map((card) => (
            <div
              key={card.id}
              data-testid={`kickoff-card-${card.id}`}
              title={card.summary}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border bg-card shadow-2xs transition hover:border-primary/50"
            >
              <div>
                <div className="relative aspect-video overflow-hidden border-b bg-slate-950">
                  <Image
                    unoptimized
                    src={card.coverUrl}
                    width={640}
                    height={360}
                    alt={card.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                    {card.badge}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-foreground">{card.title}</h3>
                  <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-muted-foreground group-hover:line-clamp-none">{card.summary}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5">
                <Link
                  href={`/projects?goal=${card.goal}&workflow=${card.workflow}&preset=${card.id}#new-project`}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-2xs transition hover:brightness-105"
                >
                  填入此模板 →
                </Link>
                <Link
                  href={card.sandboxHref}
                  className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  看范例效果 ↗
                </Link>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
