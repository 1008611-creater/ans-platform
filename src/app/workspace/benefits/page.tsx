import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
  const session = await auth();
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
            className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-emerald-500/35 bg-gradient-to-r from-emerald-500/10 via-amber-500/5 to-cyan-500/10 p-5 sm:px-7"
          >
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2">
                <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white">
                  🔓 免登可试玩 · 访客体验模式
                </span>
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  正态分布 N(125, 10²) 人均 100~150 积分 + 0.1% 概率 1000 积分（¥100）天选锦鲤大奖
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                你现在可以直接免费试玩下方 <strong className="text-foreground">3D 抓娃娃机</strong>、体验{" "}
                <strong className="text-foreground">3D 小龙圣殿换装</strong> 并预览算力任务；点击入账、签到或提交问卷时登录即可将奖励写入真实账户。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500">
                <Link href="/login?callbackUrl=%2Fworkspace%2Fbenefits">🔐 立即登录领 100~150 积分 →</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/register?callbackUrl=%2Fworkspace%2Fbenefits">🦖 免费注册领养小龙</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/workspace/credits">💳 算力账本与计费透明说明 →</Link>
              </Button>
            </div>
          </section>
        )}

        <ComputeQuestArcade
          actorId={userId ?? "guest"}
          initialServerPoints={arcadeBalance ? arcadeBalance.balancePoints : 125}
        />

        <section
          id="ans-dragon-sanctuary-showcase"
          aria-label="3D 小龙圣殿与基因养成舱"
          className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                🐉 3D DRAGON SANCTUARY · 3D 小龙圣殿
              </span>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
                3D 灵龙圣殿 · 四大基因形态与潮玩挂件实时预览
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                支持薄荷星龙、赛博金龙、樱花麻薯龙、极光冰龙 4 种 3D 形态切换与衣橱装扮；抓娃娃机掉落的灵感星豆可直接解锁限定挂件。
              </p>
            </div>
            {!userId && (
              <Button asChild size="sm" variant="outline">
                <Link href="/register?callbackUrl=%2Fworkspace%2Fbenefits">✨ 注册并绑定专属灵龙 →</Link>
              </Button>
            )}
          </div>
          <DinoAdoptionPod compact={false} />
        </section>

        <ComputeBenefits actorId={userId ?? "guest"} initialData={initialBenefits} />
      </div>
    </div>
  );
}

