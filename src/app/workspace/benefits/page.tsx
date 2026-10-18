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
      <div className="ans-product-container space-y-6 py-6 sm:py-10">
        {!userId && (
          <section
            data-testid="benefits-guest-banner"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-500">
                {isEn ? "Guest Free Trial · 125 Pts" : "🎮 免登试玩模式"}
              </Badge>
              <span className="font-semibold text-foreground">
                {isEn
                  ? "Play the 3D Claw Machine now · Sign in to lock 100–150 free compute points"
                  : "可直接试玩下方 3D 抓娃娃机 · 登录后免费领 100~150 算力积分（0.1% 抽 1000 分锦鲤）"}
              </span>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button asChild size="sm" className="h-8 rounded-xl bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-500">
                <Link href="/login?callbackUrl=%2Fworkspace%2Fbenefits">
                  {isEn ? "Sign in & Claim →" : "🔐 登录领真实积分 →"}
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-8 rounded-xl px-3 text-xs">
                <Link href="/workspace/credits">{isEn ? "Compute Center" : "💳 算力账本"}</Link>
              </Button>
            </div>
          </section>
        )}

        <ComputeQuestArcade
          actorId={userId ?? "guest-preview"}
          initialServerPoints={userId ? (arcadeBalance ? arcadeBalance.balancePoints : undefined) : 125}
        />

        <ComputeBenefits actorId={userId ?? "guest-preview"} initialData={initialBenefits} />

        <details
          id="ans-dragon-sanctuary-showcase"
          aria-label="3D 小龙展台与基因养成舱"
          className="group rounded-3xl border border-border bg-card p-5 shadow-xs"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-foreground">
            <span>🥚 {isEn ? "Expand 3D Dragon Adoption & Lineage Pod (Optional)" : "展开 3D 灵龙契约与血统养成舱（可选彩蛋）"}</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground group-open:hidden">
              {isEn ? "Click to expand ↓" : "点击展开 ↓"}
            </span>
          </summary>
          <div className="mt-4">
            <DinoAdoptionPod compact />
          </div>
        </details>
      </div>
    </div>
  );
}
