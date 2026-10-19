import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import { MarketFrame } from "@/components/marketplace/frame";
import { ListingEditor } from "@/components/marketplace/listing-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NewOfferPage() {
  const [session, t] = await Promise.all([auth(), getTranslations("product.market")]);
  const userId = session?.user?.id ?? null;
  return (
    <MarketFrame title={t("create")} description={t("creatorBody")}>
      {!userId && (
        <div
          data-testid="market-creator-new-guest-banner"
          className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-4 sm:flex-row sm:items-center sm:px-6"
        >
          <div className="space-y-1">
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-500">
              商品与工作流上架工坊 · 免登实时预览模式
            </Badge>
            <p className="text-xs sm:text-sm text-muted-foreground">
              免登录可体验商品卡片与积分阶梯定价；登录后保存即可正式上架并享 80% 算力积分分成。
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500">
            <Link href="/login?callbackUrl=%2Fmarket%2Fcreator%2Fnew">🔐 登录并保存上架 →</Link>
          </Button>
        </div>
      )}
      <MarketAccountBoundary actorId={userId ?? "guest-preview"}>
        <ListingEditor />
      </MarketAccountBoundary>
    </MarketFrame>
  );
}
