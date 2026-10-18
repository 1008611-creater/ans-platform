import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DinoAdoptionPod } from "@/components/mascot/dino-adoption-pod";
import { ComputeBenefits } from "@/components/workspace/compute-benefits";
import { ComputeQuestArcade } from "@/components/workspace/claw-arcade-pod";
import type { ComputeBenefitsSummary } from "@/contracts/compute-benefits";
import { getComputeBenefits } from "@/server/compute-benefits/service";
import { getArcadeServerBalance } from "@/server/compute-benefits/arcade";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("product.computeBenefits");
  return { title: t("title"), robots: { index: false, follow: false } };
}

const GUEST_BENEFITS_PREVIEW: ComputeBenefitsSummary = {
  enabled: true,
  questionnaireVersion: "onboarding-v1",
  applicationVersion: "agri-v1",
  onboarding: null,
  application: null,
  activity: [],
  grants: [
    {
      id: "guest-preview-onboarding",
      kind: "DEEPSEEK_ONBOARDING",
      campaignId: "onboarding-v1",
      modelIds: ["deepseek-v4.1-flash", "gpt-6-astra", "gpt-6.1-sol"],
      totalUsdMicros: "15000000",
      usedUsdMicros: "2500000",
      reservedUsdMicros: "0",
      availableUsdMicros: "12500000",
      expiredUsdMicros: "0",
      grantedAt: "2026-10-15T00:00:00.000Z",
      expiresAt: "2026-12-31T23:59:59.000Z",
      status: "ACTIVE",
    },
    {
      id: "guest-preview-agri",
      kind: "GPT_AGRI",
      campaignId: "agri-v1",
      modelIds: ["gpt-6-astra", "gpt-6.1-sol"],
      totalUsdMicros: "6000000",
      usedUsdMicros: "0",
      reservedUsdMicros: "0",
      availableUsdMicros: "6000000",
      expiredUsdMicros: "0",
      grantedAt: "2026-10-15T00:00:00.000Z",
      expiresAt: "2026-12-31T23:59:59.000Z",
      status: "ACTIVE",
    },
  ],
};

export default async function BenefitsPage() {
  if (process.env.ANS_COMPUTE_BENEFITS_ENABLED === "0") notFound();
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  const isEn = locale.startsWith("en");
  const userId = session?.user?.id ?? null;
  const [initialBenefits, arcadeBalance] = userId
    ? await Promise.all([
        getComputeBenefits(userId).catch(() => undefined),
        getArcadeServerBalance(userId).catch(() => null),
      ])
    : [GUEST_BENEFITS_PREVIEW, null];

  return (
    <div className="ans-product-shell">
      <div className="ans-product-container space-y-8 py-8 sm:py-12">
        {!userId && (
          <section
            data-testid="benefits-guest-banner"
            className="flex flex-col justify-between gap-4 rounded-3xl border border-emerald-500/35 bg-gradient-to-r from-emerald-500/10 via-amber-500/5 to-cyan-500/10 p-5 sm:flex-row sm:items-center sm:px-7"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-500">
                  {isEn
                    ? "3D Interactive Guest Mode · 125 Demo Points Loaded"
                    : "🎮 3D 盲盒与小龙展台 · 免登录互动试玩模式（已预载 125 体验积分）"}
                </Badge>
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  正态分布 N(125, 10²) 人均 100~150 积分 + 0.1% 概率 1000 积分（¥100）天选锦鲤大奖
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {isEn
                  ? "Try the 3D claw machine, dragon wardrobe, and feeding stage right now. Sign in to claim 100–150 real compute points into your permanent ledger."
                  : "您现在可直接操纵下方 3D 抓娃娃机摇杆、给小龙换装/投喂/挥鞭加速；登录后即可将正态随机抽中的 100–150 算力积分永久写入真实账户账本。"}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              <Button asChild size="sm" className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-500">
                <Link href="/login?callbackUrl=%2Fworkspace%2Fbenefits">
                  {isEn ? "Sign in & Lock Real Points →" : "🔐 登录并锁定真实算力积分 →"}
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link href="/register?callbackUrl=%2Fworkspace%2Fbenefits">🦖 免费注册领养小龙</Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="rounded-xl">
                <Link href="/workspace/credits">{isEn ? "Compute Center" : "💳 查看算力中心"}</Link>
              </Button>
            </div>
          </section>
        )}

        <ComputeQuestArcade
          actorId={userId ?? "guest-preview"}
          initialServerPoints={userId ? (arcadeBalance ? arcadeBalance.balancePoints : undefined) : 125}
        />

        <section
          id="ans-dragon-sanctuary-showcase"
          aria-label="3D 小龙展台与基因养成舱"
        >
          <DinoAdoptionPod compact={false} />
        </section>

        <ComputeBenefits actorId={userId ?? "guest-preview"} initialData={initialBenefits} />
      </div>
    </div>
  );
}
