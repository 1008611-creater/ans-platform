import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { readQuotaHistory } from "@/server/quota/history";
import { QuotaError } from "@/server/quota/service";
import { Button } from "@/components/ui/button";
import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import { ComputeBenefits } from "@/components/workspace/compute-benefits";
import { CreditsCenter } from "@/components/workspace/credits-center";
import { CreditGiftClaim } from "@/components/workspace/credit-gift-claim";
import { readCreditGiftOffer } from "@/server/quota/gift-offer";
import { getCreditProducts } from "@/lib/credits-catalog";
import { readPersonalApiHistory } from "@/server/quota/api-history";
import { getComputeBenefits } from "@/server/compute-benefits/service";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("product.quotaHistory");
  return { title: t("centerTitle"), robots: { index: false, follow: false } };
}

const GUEST_CREDITS_HISTORY = {
  availablePoints: 125,
  reservedPoints: 0,
  pendingCount: 0,
  nextCursor: null as string | null,
  billing: {
    rechargeYuanPerPoint: 0.1,
    usdQuotaPerPoint: 0.1,
    gptConsumptionMultiplier: 0.16,
    deepseekConsumptionMultiplier: 1,
    rechargeEnabled: false,
  },
  entries: [
    {
      id: "guest-ledger-1",
      createdAt: "2026-10-18T02:30:00.000Z",
      category: "CLAIM",
      amount: 50,
      balanceAfter: 50,
    },
    {
      id: "guest-ledger-2",
      createdAt: "2026-10-18T02:45:00.000Z",
      category: "GRANT",
      amount: 60,
      balanceAfter: 110,
    },
    {
      id: "guest-ledger-3",
      createdAt: "2026-10-18T03:00:00.000Z",
      category: "CLAIM",
      amount: 15.5,
      balanceAfter: 125.5,
    },
    {
      id: "guest-ledger-4",
      createdAt: "2026-10-18T03:15:00.000Z",
      category: "RUN_COST",
      amount: -0.5,
      balanceAfter: 125,
    },
  ],
  voiceUsage: [] as Array<{
    id: string;
    createdAt: string;
    state: string;
    maxUnits: number;
    settledPoints: number | null;
  }>,
};

export default async function CreditsPage({ searchParams }: { searchParams?: Promise<{ cursor?: string | string[] }> }) {
  const [session, t, locale, query] = await Promise.all([
    auth(),
    getTranslations("product.quotaHistory"),
    getLocale(),
    searchParams ?? Promise.resolve({} as { cursor?: string | string[] }),
  ]);
  const isEn = locale.startsWith("en");
  const userId = session?.user?.id ?? null;
  const actorId = userId ?? "guest-preview";
  const voiceText = await getTranslations("product.voiceUsage");
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai" });
  let history: typeof GUEST_CREDITS_HISTORY | Awaited<ReturnType<typeof readQuotaHistory>> | undefined =
    userId ? undefined : GUEST_CREDITS_HISTORY;
  let invalid = Array.isArray(query.cursor);
  if (userId && !invalid) {
    try {
      history = await readQuotaHistory(userId, query.cursor === undefined ? {} : { cursor: query.cursor });
    } catch (error) {
      if (error instanceof QuotaError && error.status === 404) redirect("/login?callbackUrl=%2Fworkspace%2Fcredits");
      invalid = error instanceof QuotaError && error.status === 400;
    }
  }
  const [giftOffer, apiHistory, initialBenefits] =
    userId && history
      ? await Promise.all([
          process.env.ANS_COMPUTE_BENEFITS_ENABLED === "1"
            ? Promise.resolve(null)
            : readCreditGiftOffer(userId).catch(() => null),
          readPersonalApiHistory(userId).catch(() => null),
          process.env.ANS_COMPUTE_BENEFITS_ENABLED === "1"
            ? getComputeBenefits(userId).catch(() => undefined)
            : Promise.resolve(undefined),
        ])
      : [null, [], undefined];

  const roundedAvailable = history ? Math.round(Number(history.availablePoints) * 100) / 100 : 0;
  const roundedReserved = history ? Math.round(Number(history.reservedPoints ?? 0) * 100) / 100 : 0;

  return (
    <AccountContentBoundary actorId={actorId}>
      <div className="ans-product-shell" data-testid={!userId ? "credits-guest-preview" : undefined}>
        <div className="ans-product-container space-y-7 py-8 sm:py-12">
          {!userId && (
            <section
              data-testid="credits-guest-banner"
              className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-emerald-500/35 bg-gradient-to-r from-emerald-500/10 via-amber-500/5 to-cyan-500/10 p-5 sm:px-7"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white">
                    {isEn ? "ANS Compute Economy · Guest Preview (1 Point = ¥0.10)" : "ANS 算力积分中心 · 免登录预览模式（1 积分 = ¥0.10）"}
                  </span>
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    1 积分 = ¥0.10 元 = $0.10 USD APIC 标称额度（10 积分 = $1）
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isEn
                    ? "Preview live model multipliers, voucher redemption, and 100–150 pts normal-distribution claw grants. Sign in to view your personal ledger."
                    : "新用户与农大参赛同学可通过 3D 抓娃娃机正态随机领取 100–150 算力积分（价值 ¥10–¥15），队长组队最高享 750 积分池。下方展示三大主力模型倍率与透明流水账本样例。"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button asChild size="sm" className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-500">
                  <Link href="/login?callbackUrl=%2Fworkspace%2Fcredits">
                    {isEn ? "Sign in to Account →" : "🔐 登录查看我的算力账本 →"}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-xl">
                  <Link href="/workspace/benefits">🎁 {isEn ? "Try 3D Claw Machine" : "免登录试玩 3D 抓娃娃机"}</Link>
                </Button>
              </div>
            </section>
          )}
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href="/workspace" className="text-xs font-medium text-muted-foreground hover:text-foreground">
                ← {t("back")}
              </Link>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t("centerTitle")}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("centerDescription")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500">
                <Link href="/workspace/benefits">🎁 免费领 100~150 积分 · 3D 抓娃娃机</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/workspace/models">⚡ 模型实机演练场</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/market">🛒 去积分市场消费</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/workspace/credits" prefetch={false}>
                  {t("refresh")}
                </Link>
              </Button>
            </div>
          </header>
          {!history ? (
            <p role="alert" className="rounded-[var(--radius)] border p-5">
              {t(invalid ? "invalid" : "unavailable")}
            </p>
          ) : (
            <>
              {userId && giftOffer && <CreditGiftClaim actorId={userId} offer={giftOffer} />}
              <CreditsCenter
                actorId={actorId}
                billing={history.billing}
                availablePoints={roundedAvailable}
                reservedPoints={roundedReserved}
                pendingCount={history.pendingCount}
                apiHistory={apiHistory}
                products={getCreditProducts(process.env)}
              />
              {userId && process.env.ANS_COMPUTE_BENEFITS_ENABLED === "1" && (
                <ComputeBenefits actorId={userId} compact initialData={initialBenefits} />
              )}
              <section aria-labelledby="credit-ledger-heading" className="space-y-4">
                <div>
                  <h2 id="credit-ledger-heading" className="text-xl font-semibold">
                    {t("title")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("ledgerDescription")}</p>
                </div>
                {history.entries.length === 0 ? (
                  <p className="border-t py-8 text-muted-foreground">{t("empty")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <caption className="sr-only">{t("title")}</caption>
                      <thead>
                        <tr className="border-b text-start">
                          {["date", "reason", "amount", "balance"].map(key => (
                            <th key={key} scope="col" className="whitespace-nowrap px-3 py-3 text-start font-medium">
                              {t(key)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {history.entries.map(entry => (
                          <tr key={entry.id} className="border-b">
                            <td className="whitespace-nowrap px-3 py-4">
                              <time dateTime={entry.createdAt}>{dates.format(new Date(entry.createdAt))}</time>
                            </td>
                            <td className="px-3 py-4">{t(`reasons.${entry.category}`)}</td>
                            <td className="whitespace-nowrap px-3 py-4 font-medium tabular-nums">
                              {entry.amount > 0 ? "+" : ""}
                              {numbers.format(entry.amount)}
                            </td>
                            <td className="px-3 py-4 tabular-nums">
                              {entry.balanceAfter === null ? "-" : numbers.format(entry.balanceAfter)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
              {history.voiceUsage.length > 0 && (
                <section className="space-y-3 rounded-[var(--radius)] border p-5" aria-labelledby="voice-usage-title">
                  <h2 id="voice-usage-title" className="font-semibold">
                    {voiceText("title")}
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">{voiceText("description")}</p>
                  <ul className="divide-y">
                    {history.voiceUsage.map(call => (
                      <li key={call.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                        <time dateTime={call.createdAt}>{dates.format(new Date(call.createdAt))}</time>
                        <span>{voiceText(`states.${call.state}`)}</span>
                        <span>{voiceText("characters", { count: call.maxUnits })}</span>
                        <span className="font-medium">
                          {voiceText(call.settledPoints === null ? "reserved" : "zero")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <nav className="flex gap-3" aria-label={t("title")}>
                <Button asChild variant="outline">
                  <Link href="/workspace/credits">{t("first")}</Link>
                </Button>
                {history.nextCursor && (
                  <Button asChild variant="outline">
                    <Link href={`/workspace/credits?cursor=${encodeURIComponent(history.nextCursor)}`}>{t("next")}</Link>
                  </Button>
                )}
              </nav>
            </>
          )}
        </div>
      </div>
    </AccountContentBoundary>
  );
}
