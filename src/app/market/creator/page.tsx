import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listMarketListings } from "@/server/marketplace/listings";
import { MarketFrame } from "@/components/marketplace/frame";
import { MarketOfferCard } from "@/components/marketplace/offer-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
export const dynamic = "force-dynamic";
export default async function CreatorPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const [offers, t] = await Promise.all([
    userId ? listMarketListings(userId) : Promise.resolve([]),
    getTranslations("product.market"),
  ]);
  return (
    <MarketFrame title={t("creator")} description={t("creatorBody")}>
      {!userId && (
        <div
          data-testid="market-creator-guest-preview"
          className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 sm:flex-row sm:items-center"
        >
          <div className="space-y-1">
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-500">
              创作者分成中心 · 80% 算力积分实时分润（1 积分 = ¥0.10）
            </Badge>
            <p className="text-sm text-muted-foreground">
              将您的 AI 工作流、农情模型、3D 简历模板或 ComfyUI 节点封装上架，每次被高校同学调用或复刻即自动结算 80% 算力积分收益。
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild size="sm" className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-500">
              <Link href="/login?callbackUrl=%2Fmarket%2Fcreator">登录入驻创作者中心 →</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link href="/docs/points-integration">查看积分支付 SDK 文档</Link>
            </Button>
          </div>
        </div>
      )}
      <MarketAccountBoundary actorId={userId ?? "guest-preview"}>
        <div className="mb-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={userId ? "/market/creator/new" : "/login?callbackUrl=%2Fmarket%2Fcreator%2Fnew"}>{t("create")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/explore/submit">免费发布开源作品上墙 →</Link>
          </Button>
        </div>
        {offers.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer) => <MarketOfferCard key={offer.id} offer={offer} owner />)}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="ans-empty">
              <h2 className="text-xl font-semibold">{t("noOwnOffers")}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{t("creatorBody")}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Step 01 · 封装标准工作流或模板",
                  desc: "支持 Web 应用、Python 农情分析脚本、提示词工程包或 3D 个人网站模板，配置定价（如 10–50 积分/次）。",
                },
                {
                  title: "Step 02 · 接入 ANS 积分支付 API",
                  desc: "通过单行 Webhook 或平台托管执行器完成鉴权与扣费，无需自建支付与账本系统。",
                },
                {
                  title: "Step 03 · 80% 算力积分实时入账",
                  desc: "每笔订单自动按 80% 划入创作者账本，可用于调用旗舰大模型或兑换赛事算力包。",
                },
              ].map((step, i) => (
                <div key={i} className="rounded-2xl border border-border/70 bg-card/85 p-5">
                  <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </MarketAccountBoundary>
    </MarketFrame>
  );
}
