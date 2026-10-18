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
    badge: "📖 引导模板 2 · AIGC 短剧赛道",
    title: "AIGC 短剧项目",
    defaultTitle: "AI 漫剧四格分镜与视频生成脚本项目",
    goal: "portfolio" as ProjectGoal,
    workflow: "project-one-pager",
    summary: "适合参加 AIGC 视频/漫剧创作的同学：帮你整理故事梗概、固定角色特征词与分镜脚本。",
    coverUrl: "/catalog/gitglow-v1/niannian-drama.webp",
    sandboxHref: "/workspace?thread=thread-toonflow",
  },
  {
    id: "resume",
    badge: "📖 引导模板 3 · 求职与个人主页",
    title: "3D 个人简历站",
    defaultTitle: "我的 3D 交互个人简历与作品集网站",
    goal: "career" as ProjectGoal,
    workflow: "resume-website",
    summary: "适合做保研/求职作品集：填写个人经历后直接生成带 3D 互动效果的双语个人网站源码。",
    coverUrl: "/catalog/gitglow-v1/cauai-one.webp",
    sandboxHref: "/workspace?thread=thread-portfolio",
  },
] as const;

const PUBLIC_DEMO_PROJECTS = [
  {
    id: "demo-agri",
    title: "【新手参考范例 1】温室作物病虫害识别终端（农客松参赛范例）",
    goalLabel: "参赛范例",
    stageLabel: "包含：立项说明 + 演示网页 + 答辩大纲",
    summary: "不知道农客松项目怎么写？点开这个参考范例，看看完整的痛点描述、功能页面和路演提纲长什么样。",
    sandboxHref: "/workspace?thread=thread-agri",
    guideHref: "/competitions/agrihackathon",
  },
  {
    id: "demo-aigc",
    title: "【新手参考范例 2】AI 漫剧四镜头故事板（AIGC 创作范例）",
    goalLabel: "短剧范例",
    stageLabel: "包含：4 镜头分镜卡 + 视频生成提示词",
    summary: "展示如何把一段文字故事拆成 4 个具体镜头，并写出能直接放进视频生成工具的提示词。",
    sandboxHref: "/workspace?thread=thread-toonflow",
    guideHref: "/competitions/aigc",
  },
  {
    id: "demo-resume",
    title: "【新手参考范例 3】3D 双语个人作品集微站（求职简历范例）",
    goalLabel: "简历范例",
    stageLabel: "包含：可交互 3D 网页 + 完整 HTML 源码",
    summary: "展示生成后的个人简历网站效果，支持在工作台里直接修改文字和代码并导出单文件 HTML。",
    sandboxHref: "/workspace?thread=thread-portfolio",
    guideHref: "/market/resume-website",
  },
] as const;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ goal?: string | string[]; workflow?: string | string[]; preset?: string | string[] }>;
}) {
  const rawParams = (await searchParams) ?? {};
  const selection = resolveProjectSelection(rawParams);
  const presetParam = typeof rawParams.preset === "string" ? rawParams.preset : undefined;
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
  const initialTitle = matchedPreset?.defaultTitle ?? "";

  return (
    <div className="ans-product-container ans-page-content ans-projects-page space-y-7">
      <div className="space-y-2">
        <PageHeading
          title={`${t("projectsTitle")} · 项目立项与作品集`}
          description="在这里创建并管理你自己的比赛项目、课程课题或个人简历网站。第一次使用不知道怎么填？可先点选下方新手引导模板。"
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
          className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:flex-row sm:items-center"
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-500">
                📖 新手立项引导 · 免登录预览
              </Badge>
              <span className="text-xs font-semibold text-foreground">
                当前未登录（我的项目列表为空）
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              你可以先在下方填写项目名称，或点击 3 个引导模板自动填入；点击「创建项目」时会引导登录并保存到你的个人账号下。
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild size="sm" className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-500">
              <Link href={`/login?callbackUrl=${encodeURIComponent(selection.callbackPath)}`}>🔐 登录并管理我的项目 →</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Real Project Creation & User's Real Projects First */}
      <div className="ans-private-project-grid">
        <Card id="new-project" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>{t("newProject")}</CardTitle>
            <CardDescription>
              {userId
                ? "直接输入你的课题/比赛名称创建真实项目；如果还没想好怎么写，可以点击下方「新手引导模板」一键填入。"
                : "免登录试填：输入你想做的项目名称与方向（或点下方新手模板自动填入），点击创建即可登录后保存。"}
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
                <CardHeader className="py-6 text-center">
                  <p className="text-sm font-medium text-foreground">
                    {userId ? "你还没有创建过项目" : "登录后这里会显示你创建的真实项目"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    在左侧表单输入名称即可创建你的第一个项目，或参考下方的新手引导范例。
                  </p>
                </CardHeader>
              </Card>
            )}
          </div>

          <div className="space-y-2.5 pt-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              📖 新手参考范例（仅供了解完整项目结构，非你的账户数据）
            </h2>
            {PUBLIC_DEMO_PROJECTS.map((demo) => (
              <Card key={demo.id} className="border-border/70 bg-card/60">
                <CardHeader className="space-y-1.5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-sm">{demo.title}</CardTitle>
                    <Badge variant="outline">{demo.goalLabel}</Badge>
                  </div>
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">{demo.stageLabel}</p>
                  <CardDescription className="text-xs leading-relaxed">{demo.summary}</CardDescription>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link href={demo.sandboxHref}>👁️ 查看此范例效果 →</Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                      <Link href={demo.guideHref}>查看赛道说明</Link>
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Onboarding Quick Templates */}
      <section aria-label="3 大快速立项卡片" className="space-y-3 border-t pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight">📖 新手不知道怎么填？点选下方引导模板一键填入左侧表单</h2>
          <span className="text-xs text-muted-foreground">填入后你可以随意修改标题与内容，变成你自己的真实项目</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {QUICK_KICKOFF_CARDS.map((card) => (
            <div
              key={card.id}
              data-testid={`kickoff-card-${card.id}`}
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
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                    {card.badge}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-foreground">{card.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.summary}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5">
                <Link
                  href={`/projects?goal=${card.goal}&workflow=${card.workflow}&preset=${card.id}#new-project`}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-2xs transition hover:brightness-105"
                >
                  填入此模板到上方表单 →
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
      </section>
    </div>
  );
}
