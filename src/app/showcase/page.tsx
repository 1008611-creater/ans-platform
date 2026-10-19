import Link from "next/link";
import { getLocale } from "next-intl/server";
import { listPublishedArtifacts } from "@/server/projects/publication";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const CURATED_SHOWCASE = [
  {
    id: "curated-agri-uav",
    title: "Agri-Vision 农田多光谱无人机病虫害实时巡检系统",
    version: "v2.1",
    author: "农大智耕队 · 中国农业大学",
    competition: "神农杯 AI 农客松 · 智慧植保赛道",
    likes: 128,
    comments: 34,
    cover: "/catalog/ans-pro-v1/agri-uav.webp",
    summary: "结合多光谱航拍切片与 Qwen-VL 视觉诊断流，实现冬小麦条锈病与玉米螟虫害亚米级定位与处方图直出。",
    href: "/competitions/agrihackathon/showcase",
  },
  {
    id: "curated-infinite-canvas",
    title: "Infinite Canvas 《星际麦田》4K 多模态 AIGC 画布工程",
    version: "v1.8",
    author: "参考范例 · AIGC 视觉方向",
    competition: "AIGC 创意视觉赛道 · 参考范例",
    likes: 215,
    comments: 56,
    cover: "/catalog/ans-pro-v1/infinite-canvas.webp",
    summary: "基于 CAUAI 无限画布工作台实现 12 镜分镜脚本自动拆解、主角特征锁定与动态运镜合成。",
    href: "/competitions/aigc",
  },
  {
    id: "curated-scholar-portal",
    title: "Dr. Lin Lab 智慧农业与遥感视觉课题组双语学术门户",
    version: "v1.4",
    author: "参考范例 · 学术主页方向",
    competition: "ANS 科研主页共创计划 · 参考范例",
    likes: 94,
    comments: 19,
    cover: "/catalog/ans-pro-v1/magic-resume.webp",
    summary: "通过 ORCID 与论文 BibTeX 自动构建高颜值响应式学术主页，内置开源数据集下载与论文交互预览。",
    href: "/projects/resume-website",
  },
  {
    id: "curated-dragon-arcade",
    title: "Compute Quest 3D 算力盲盒抓娃娃机与小龙养成展台",
    version: "v3.0",
    author: "参考范例 · 互动 3D 方向",
    competition: "平台 3D 交互参考样板",
    likes: 312,
    comments: 82,
    cover: "/catalog/ans-pro-v1/dragon-arcade.webp",
    summary: "Three.js 物理刚体碰撞抓娃娃机与五阶神龙进化体系，将参赛与创作 XP 转化为可交互的算力盲盒奖励。",
    href: "/workspace/benefits",
  },
  {
    id: "curated-greenhouse-agent",
    title: "GreenHouse-OS 温室水肥光热多智能体协同调控沙盘",
    version: "v1.5",
    author: "参考范例 · 设施农业方向",
    competition: "神农杯 AI 农客松 · 设施农业赛道",
    likes: 106,
    comments: 27,
    cover: "/catalog/ans-pro-v1/greenhouse-os.webp",
    summary: "接入温室物联网传感器时序流，利用多 Agent 博弈策略动态优化滴灌配比与补光时长，节水率提升 23%。",
    href: "/competitions/agrihackathon",
  },
  {
    id: "curated-aigc-film",
    title: "《二十四节气·谷雨》东方美学 AI 实验短片与声画工程",
    version: "v1.2",
    author: "参考范例 · 短片创作方向",
    competition: "AIGC 创意视觉赛道 · 参考范例",
    likes: 164,
    comments: 41,
    cover: "/catalog/ans-pro-v1/ai-video-services.webp",
    summary: "融合传统水墨笔触控制网（ControlNet）与环境音轨生成，呈现谷雨时节茶山采摘与农耕物候之美。",
    href: "/competitions/aigc",
  },
];

export default async function ShowcasePage() {
  const [artifacts, locale] = await Promise.all([listPublishedArtifacts(48), getLocale().catch(() => "zh")]);
  const isEn = locale === "en";
  return (
    <main className="container space-y-8 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">ANS · COMMUNITY SHOWCASE</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {isEn ? "Great works belong on stage, not just in folders." : "作品，不该只留在文件夹里。"}
          </h1>
          <p className="text-muted-foreground">
            {isEn
              ? "Explore reviewed and authorized project releases from the ANS community."
              : "这里展示经评审并获授权的真实作品版本。"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild>
            <Link href="/explore/submit">{isEn ? "Submit Your Work" : "发布我的作品"}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/competitions">{isEn ? "Explore Competitions" : "浏览赛事展厅"}</Link>
          </Button>
        </div>
      </header>

      {artifacts.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {artifacts.map((artifact, idx) => (
            <Link key={artifact.id} href={`/showcase/${artifact.id}`} className="group">
              <Card className="h-full overflow-hidden transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                <div className="relative aspect-[16/9] w-full overflow-hidden border-b bg-muted">
                  <img
                    src={CURATED_SHOWCASE[idx % CURATED_SHOWCASE.length].cover}
                    alt={artifact.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-3 text-white">
                    <Badge variant="secondary">{isEn ? `Reviewed · v${artifact.version}` : `评审通过 · v${artifact.version}`}</Badge>
                    <span className="text-xs">{isEn ? `${artifact.counts.reactions} likes` : `${artifact.counts.reactions} 赞`}</span>
                  </div>
                </div>
                <CardContent className="space-y-3 p-5">
                  <h2 className="line-clamp-1 text-lg font-bold tracking-tight group-hover:text-primary">{artifact.title}</h2>
                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{artifact.markdown}</p>
                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>{artifact.author.nickname || artifact.author.username}{artifact.project.team ? ` · ${artifact.project.team.name}` : ""}</span>
                    <span className="font-medium text-primary group-hover:underline">{isEn ? "Open work →" : "打开作品 →"}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed bg-muted/20 px-5 py-4 text-sm text-muted-foreground">
          <span>{isEn ? "No authorized user releases published yet · Reference track templates are shown below." : "当前暂无已授权公开的用户作品 · 下方为各赛道官方交付参考范例"}</span>
          <Link href="/explore/submit" className="font-semibold text-primary hover:underline">
            {isEn ? "Publish the first work →" : "成为首个发布作品的创作者 →"}
          </Link>
        </div>
      )}

      <section className="space-y-4" data-testid="showcase-curated-grid">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">
            {isEn ? "📖 Onboarding Guide: Reference Project Templates" : "📖 新手引导：参赛与作品交付参考范例"}
          </h2>
          <span className="text-xs text-muted-foreground">
            {isEn ? "Official reference examples across tracks" : "各赛道标准作品结构与交付参考样板"}
          </span>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {CURATED_SHOWCASE.map((item) => (
            <Link key={item.id} href={item.href} className="group">
              <Card className="h-full overflow-hidden transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                <div className="relative aspect-[16/9] w-full overflow-hidden border-b bg-muted">
                  <img
                    src={item.cover}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/65 to-transparent p-3.5 text-white">
                    <Badge variant="secondary">{isEn ? `📖 Guide Sample · ${item.version}` : `📖 官方参考范例 · ${item.version}`}</Badge>
                    <span className="text-xs font-medium">{isEn ? "Reference Template" : "可参考同款结构"}</span>
                  </div>
                </div>
                <CardContent className="space-y-3 p-5">
                  <h3 className="line-clamp-1 text-lg font-bold tracking-tight group-hover:text-primary">{item.title}</h3>
                  <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>
                  <div className="flex items-center justify-between border-t pt-3 text-xs">
                    <span className="text-muted-foreground">{item.author}</span>
                    <span className="font-medium text-primary group-hover:underline">{isEn ? "Open guide →" : "查看赛道与模板 →"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{`适用方向：${item.competition}`}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
