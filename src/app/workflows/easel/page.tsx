import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ExternalLink, Film, PanelsTopLeft, Sparkles, Zap } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  buildInfiniteCanvasSsoUrl,
  getEaselEmbedConfig,
  INFINITE_CANVAS_ORIGIN,
  PAI_VIDEO_CANVAS_MODELS,
} from "@/server/integrations/easel";
import { EaselWorkspace } from "@/components/workspace/easel-workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("easel");
  return { title: `无限画布 · ANS 官方 AIGC 创作者平台 | ${t("title")}`, description: t("body") };
}

export default async function EaselPage() {
  const enabled = process.env.ANS_EASEL_ENABLED === "1";
  const session = await auth();
  if (enabled && !session?.user?.id) redirect("/login?callbackUrl=/workflows/easel");
  const t = await getTranslations("easel");
  const config = enabled && session?.user?.id ? getEaselEmbedConfig(session.user.id) : null;
  const ssoUrl = buildInfiniteCanvasSsoUrl(session?.user ?? null);

  return (
    <div className="ans-product-container space-y-6 py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link className="ans-text-link mb-3 w-fit" href="/workspace/credits">
            <ArrowLeft className="size-4" aria-hidden="true" />
            返回 ANS 算力中心
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="flex items-center gap-3 text-2xl font-semibold sm:text-3xl">
              <PanelsTopLeft className="size-7 text-primary" aria-hidden="true" />
              无限画布 · ANS 官方 AIGC 创作者平台
            </h1>
            <span className="rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              🟢 拍我AI 15,180 尊享视频池 + 火山方舟 + OpenLux 已并网
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            开源无限画布已与 ANS 算力积分体系深度打通：账号免密直连、共享 ANS 积分账本，支持分镜排布、文生/图生视频、首尾帧控制与多图融合创作。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-500">
            <a href={ssoUrl} target="_blank" rel="noopener noreferrer">
              <Sparkles className="me-1.5 size-4" aria-hidden="true" />
              {session?.user?.email ? "一键免密进入无限画布 (hb.cauai.fun)" : "打开无限画布工作台 (hb.cauai.fun)"}
              <ExternalLink className="ms-1.5 size-3.5" aria-hidden="true" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/workspace/credits">⚡ 查看算力账本</Link>
          </Button>
        </div>
      </div>

      <section
        aria-label="拍我AI与火山方舟视频算力矩阵"
        className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4 sm:p-5"
      >
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
              <Film className="size-3.5" aria-hidden="true" />
              官方视频与生图算力渠道
            </span>
            <span className="text-xs text-muted-foreground">
              画布内默认绑定 <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">ANS 官方算力渠道 (/api/ziyu)</code> · 统一扣减 ANS 积分，失败全额自动退回
            </span>
          </div>
          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <Zap className="size-3.5" aria-hidden="true" />
            拍我AI 尊享池 15,180 点 + 365天免积分生图
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PAI_VIDEO_CANVAS_MODELS.map((model) => (
            <div
              key={model.id}
              className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-3.5 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{model.label}</p>
                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    {model.badge}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  模型 ID：{model.id} · {model.provider}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">{model.modesLabel}</p>
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-xs">
                <span className="font-semibold text-primary">{model.costLabel}</span>
                <a
                  href={ssoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                >
                  在画布中调用 →
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {config && session?.user?.id ? (
        <>
          <details className="rounded-xl border bg-muted/20 p-4">
            <summary className="cursor-pointer text-sm font-medium">{t("setupTitle")}</summary>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{t("setupBody")}</p>
          </details>
          <EaselWorkspace {...config} userId={session.user.id} />
        </>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b bg-muted/20 py-3.5">
            <CardTitle className="flex items-center gap-2 text-base">
              <span>🎨 无限画布在线工作台 ({INFINITE_CANVAS_ORIGIN})</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={ssoUrl} target="_blank" rel="noopener noreferrer">
                  全屏独立窗口创作
                  <ExternalLink className="ms-1.5 size-3.5" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <iframe
              src={INFINITE_CANVAS_ORIGIN}
              title="ANS 官方 AIGC 无限画布创作者平台"
              className="h-[720px] w-full border-0 bg-background"
              allow="clipboard-read; clipboard-write; fullscreen"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
