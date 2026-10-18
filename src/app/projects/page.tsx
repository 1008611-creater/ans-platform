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
    badge: "🌾 智耕黑客松 · AI + 农业赛道",
    title: "农客松参赛项目",
    defaultTitle: "CAU 农情病虫害多模态遥感诊断与农艺处方系统",
    goal: "contest" as ProjectGoal,
    workflow: "contest-mvp",
    summary: "面向中国农大智耕黑客松立项：预置温室病虫害视觉诊断、多光谱 NDVI 遥感指数与竞赛路演材料包。",
    coverUrl: "/competitions/agrihackathon/gitglow-hub.webp",
    sandboxHref: "/workspace?thread=thread-agri",
  },
  {
    id: "aigc",
    badge: "🎬 Toonflow · AI 漫剧与视频工坊",
    title: "AIGC 短剧项目",
    defaultTitle: "Toonflow 赛博长安 AI 漫剧四格分镜与视频生成工程",
    goal: "portfolio" as ProjectGoal,
    workflow: "project-one-pager",
    summary: "面向 AIGC 创作赛道立项：内置角色一致性 Seed 锚点、四宫格电影级运镜脚本与 Sora/Runway 提示词模板。",
    coverUrl: "/catalog/gitglow-v1/niannian-drama.webp",
    sandboxHref: "/workspace?thread=thread-toonflow",
  },
  {
    id: "resume",
    badge: "✨ Vibe Coding · 3D 交互作品集",
    title: "3D 个人简历站",
    defaultTitle: "Three.js 3D 星空个人作品集与全栈求职简历站",
    goal: "career" as ProjectGoal,
    workflow: "resume-website",
    summary: "面向求职与个人品牌立项：30 秒生成零依赖 HTML5 3D 星空粒子主页、Bento 项目矩阵与可独立部署源码。",
    coverUrl: "/catalog/gitglow-v1/cauai-one.webp",
    sandboxHref: "/workspace?thread=thread-portfolio",
  },
] as const;

const PUBLIC_DEMO_PROJECTS = [
  {
    id: "demo-agri",
    title: "样板 01 · CAU 温室病虫害 AI 遥感诊断终端（农客松官方示范立项）",
    goalLabel: "赛事冲刺",
    stageLabel: "已完成 3/3 核心工件 · 含 HTML5 实时沙箱",
    summary: "融合哨兵二号 NDVI 叶面健康指数与 DeepSeek V4.1 视觉诊断，支持无人机多光谱巡检仿真与农艺处方一键生成。",
    sandboxHref: "/workspace?thread=thread-agri",
    guideHref: "/competitions/agrihackathon",
  },
  {
    id: "demo-aigc",
    title: "样板 02 · Toonflow 赛博长安 AI 漫剧四格导演台（AIGC 赛道示范立项）",
    goalLabel: "作品集沉淀",
    stageLabel: "已生成 4 幕分镜脚本 + 角色一致性 Seed #4092",
    summary: "提供远景推镜、特写环绕、跟随仰拍、航拍拉远 4 组完整运镜脚本与可直接复制的文生视频 Prompt。",
    sandboxHref: "/workspace?thread=thread-toonflow",
    guideHref: "/competitions/aigc",
  },
  {
    id: "demo-resume",
    title: "样板 03 · 3D 交互式双语个人简历与作品集微站（求职示范立项）",
    goalLabel: "求职简历",
    stageLabel: "已发布 v2 视觉站点 · 支持 .html 源码导出",
    summary: "内置 Canvas 3D 星轨粒子视差交互与响应式 Bento 卡片矩阵，支持在 Pi-Codex 工作台内实时改代码热预览。",
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
    <div className="ans-product-container ans-page-content ans-projects-page space-y-8">
      <div className="space-y-3">
        <div className="inline-flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            🚀 ANS PROJECT & PORTFOLIO STUDIO · ANS 项目立项与作品集工坊
          </span>
        </div>
        <PageHeading
          title={`${t("projectsTitle")} · ANS 项目立项与作品集工坊`}
          description={t("projectsDescription")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500">
                <Link href="/workspace">🛠️ 打开 Pi-Codex 实时工作台</Link>
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
          className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 sm:flex-row sm:items-center"
        >
          <div className="space-y-1">
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-500">
              AI 项目工作台 · 免登录预览模式
            </Badge>
            <p className="text-sm text-muted-foreground">
              支持一键初始化 3D 个人简历网站、农客松参赛 MVP 方案、AIGC 短剧项目与路演答辩 Q&A。点击提交立项时登录即可永久保存多版本工程产物。
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild size="sm" className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-500">
              <Link href={`/login?callbackUrl=${encodeURIComponent(selection.callbackPath)}`}>登录并创建专属项目 →</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link href="/market/resume-website">体验 3D 简历工作坊</Link>
            </Button>
          </div>
        </div>
      )}

      {/* 3 Major Quick Kickoff Cards */}
      <section aria-label="3 大快速立项卡片" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">⚡ 3 大黄金赛道快速立项（点击一键装填立项课题）</h2>
          <span className="text-xs text-muted-foreground">覆盖农客松参赛、AIGC 短剧创作与 3D 个人简历站</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {QUICK_KICKOFF_CARDS.map((card) => (
            <div
              key={card.id}
              data-testid={`kickoff-card-${card.id}`}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border bg-card shadow-2xs transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
            >
              <div>
                <div className="relative aspect-video overflow-hidden border-b bg-slate-950">
                  <Image
                    unoptimized
                    src={card.coverUrl}
                    width={640}
                    height={360}
                    alt={card.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                    {card.badge}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary">{card.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{card.summary}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-3">
                <Link
                  href={`/projects?goal=${card.goal}&workflow=${card.workflow}&preset=${card.id}#new-project`}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-2xs transition hover:brightness-105"
                >
                  🚀 选此模板立项 →
                </Link>
                <Link
                  href={card.sandboxHref}
                  className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  👁️ 预览实时沙箱 ↗
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <details className="rounded-2xl border bg-card px-4 py-2">
        <summary className="cursor-pointer py-2 text-sm font-medium">{t("projectGuideQuestion")}</summary>
        <ol className="ans-project-steps pb-3">
          {[1, 2, 3].map((step) => (
            <li key={step}>
              <span className="ans-project-step-number" aria-hidden="true">
                0{step}
              </span>
              <div>
                <h2>{t(`step${step}Title`)}</h2>
                <p>{t(`step${step}Body`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </details>

      <div className="ans-private-project-grid">
        <Card id="new-project" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>{t("newProject")}</CardTitle>
            <CardDescription>
              {userId
                ? "选择立项方向或点击上方模板一键填入，创建后直接进入工作流与作品集画布。"
                : "免登预览模式：你可以先填入课题名称与方向，点击创建时将自动引导登录并保存立项。"}
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
          {userId && projects.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">📁 我的已立项工程 ({projects.length})</h2>
              {projects.map((project) => (
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
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">🌟 公开示范项目（免登可直接试玩沙箱）</h2>
              {!userId && (
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(selection.callbackPath)}`}
                  className="text-xs font-semibold text-primary underline underline-offset-4"
                >
                  登录查看我的私有项目 →
                </Link>
              )}
            </div>
            {PUBLIC_DEMO_PROJECTS.map((demo) => (
              <Card key={demo.id} className="border-primary/20 bg-card/80">
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{demo.title}</CardTitle>
                    <Badge variant="secondary">{demo.goalLabel}</Badge>
                  </div>
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">✓ {demo.stageLabel}</p>
                  <CardDescription className="text-xs leading-relaxed">{demo.summary}</CardDescription>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button asChild size="sm" variant="default">
                      <Link href={demo.sandboxHref}>🛠️ 在 Pi-Codex 沙箱中打开 →</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={demo.guideHref}>📖 查看赛道/项目指南</Link>
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
