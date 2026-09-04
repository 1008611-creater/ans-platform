import Link from "next/link";
import { Blocks, ExternalLink, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * ANS 站群入口（用户的 10 个站点，按领域归组）
 * 定位待补：各站一句话介绍由用户确认后补全
 */
const SITE_CLUSTER = [
  { group: "提示词与对话", sites: [{ name: "prompts", url: "https://prompts.cauai.fun", desc: "提示词库主站（本站点）" }] },
  { group: "AI 通用能力", sites: [{ name: "ai", url: "https://ai.cauai.fun", desc: "AI 能力聚合入口" }] },
  { group: "图像生成", sites: [
    { name: "sd2", url: "https://sd2.cauai.fun", desc: "Stable Diffusion 绘图" },
    { name: "image2", url: "https://image2.lsb0713.online", desc: "图像生成与处理" },
  ] },
  { group: "视频生成", sites: [{ name: "video", url: "https://video.cauai.fun", desc: "AI 视频创作" }] },
  { group: "工具与开发", sites: [
    { name: "app", url: "https://app.cauai.fun", desc: "应用工作台" },
    { name: "api", url: "https://api.cauai.fun", desc: "API 网关" },
    { name: "hb", url: "https://hb.cauai.fun", desc: "工具集合" },
  ] },
  { group: "学习与其他", sites: [
    { name: "tutor", url: "https://tutor.cauai.fun", desc: "AI 辅导" },
    { name: "dh", url: "https://dh.cauai.fun", desc: "综合服务" },
  ] },
];

export const metadata = {
  title: "模板广场 · ANS",
  description: "按领域组织的 AI 模板集群，点开即用，直接在工作台运行。",
};

export default async function TemplatesPage() {
  const [domains, templates] = await Promise.all([
    db.category.findMany({
      where: { parentId: null },
      orderBy: { order: "asc" },
      select: { id: true, name: true, slug: true, description: true, icon: true },
    }),
    db.template.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        icon: true,
        outputType: true,
        estimatedCost: true,
        useCount: true,
        category: { select: { name: true, slug: true } },
      },
    }),
  ]);

  return (
    <div className="container py-10">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Blocks className="h-4 w-4" />
          <span>ANS 模板广场</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">按领域找模板，点开就用</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          模板是提示词的「可执行外壳」——填好参数就能直接运行，产出会留在你的工作台里。
        </p>
      </header>

      {/* 领域卡片墙 */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">领域分类</h2>
        {domains.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              还没有领域分类，管理员可在后台创建（分类支持两级：领域 → 场景）。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {domains.map((d) => (
              <Link key={d.id} href={`/templates?domain=${d.slug}`}>
                <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span aria-hidden>{d.icon ?? "📦"}</span>
                      {d.name}
                    </CardTitle>
                    {d.description ? (
                      <CardDescription className="line-clamp-2">
                        {d.description}
                      </CardDescription>
                    ) : null}
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 模板卡片墙 */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">最新模板</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/templates/new">
              <Sparkles className="me-2 h-3.5 w-3.5" />
              发布模板
            </Link>
          </Button>
        </div>

        {templates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                还没有已上架的模板。发布后需通过 AI 审核才会出现在这里。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Link key={t.id} href={`/templates/${t.slug}`}>
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{t.title}</CardTitle>
                      <span aria-hidden className="text-xl">
                        {t.icon ?? "🧩"}
                      </span>
                    </div>
                    {t.summary ? (
                      <CardDescription className="line-clamp-2">{t.summary}</CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2 pt-0">
                    <Badge variant="secondary">{t.outputType}</Badge>
                    {t.category ? (
                      <Badge variant="outline">{t.category.name}</Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {t.estimatedCost} 点 / 已用 {t.useCount} 次
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 站群入口 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">ANS 站群</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SITE_CLUSTER.map((g) => (
            <Card key={g.group}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">{g.group}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {g.sites.map((s) => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                  >
                    <span>
                      <span className="font-medium">{s.name}</span>
                      <span className="ms-2 text-xs text-muted-foreground">{s.desc}</span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </a>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
