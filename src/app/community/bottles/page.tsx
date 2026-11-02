import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { countFloatingBottles, listMyBottles, listMyPicks } from "@/server/community/bottles";
import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import { BottleReplyForm, PickBottleButton, ReportBottle, ThrowBottleForm } from "@/components/community/bottle-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("product.communityBottle");
  return { title: t("title") };
}

const NOTE = "rounded-2xl border border-sky-200/70 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/30";

export default async function CommunityBottlesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const [t, locale] = await Promise.all([getTranslations("product.communityBottle"), getLocale().catch(() => "zh")]);
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", { month: "short", day: "numeric", timeZone: "Asia/Shanghai" });
  const [floating, mine, picks] = await Promise.all([
    countFloatingBottles(),
    userId ? listMyBottles(userId) : [],
    userId ? listMyPicks(userId) : [],
  ]);

  return <div className="ans-product-container ans-page-content space-y-5">
    <Link href="/community" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" aria-hidden="true" />{t("back")}</Link>
    <header className="space-y-1.5">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
    </header>

    {!userId ? (
      <section aria-labelledby="bottle-throw" className="space-y-3 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="bottle-throw" className="font-semibold">{t("throwTitle")}</h2>
          <p className="text-sm text-muted-foreground ans-num">{t("floating", { count: floating })}</p>
        </div>
        <ThrowBottleForm guest />
        <p className="text-xs text-muted-foreground">{t("guestNote")}</p>
      </section>
    ) : <AccountContentBoundary actorId={userId}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="bottle-throw" className="space-y-3 rounded-2xl border bg-card p-5">
            <h2 id="bottle-throw" className="font-semibold">{t("throwTitle")}</h2>
            <ThrowBottleForm />
          </section>

          <section id="picked" aria-labelledby="bottle-picked" className="scroll-mt-20 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="bottle-picked" className="font-semibold">{t("pickedTitle")}</h2>
                <p className="text-sm text-muted-foreground">{t("floating", { count: floating })}</p>
              </div>
              <PickBottleButton />
            </div>
            {picks.length === 0 ? <p className="rounded-2xl border border-dashed px-5 py-6 text-sm text-muted-foreground">{t("pickedEmpty")}</p> : (
              <ul className="space-y-3">
                {picks.map((bottle) => <li key={bottle.id} className={`${NOTE} space-y-3`} data-testid="picked-bottle">
                  <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{bottle.body}</p>
                  <p className="text-xs text-muted-foreground">{t("thrownOn", { date: date.format(bottle.createdAt) })}</p>
                  {bottle.myReply
                    ? <p className="rounded-xl bg-background px-3 py-2 text-sm"><span className="font-semibold">{t("myReply")}</span> {bottle.myReply}</p>
                    : <BottleReplyForm bottleId={bottle.id} />}
                  <ReportBottle bottleId={bottle.id} />
                </li>)}
              </ul>
            )}
          </section>
        </div>

        <section id="mine" aria-labelledby="bottle-mine" className="scroll-mt-20 space-y-3">
          <h2 id="bottle-mine" className="font-semibold">{t("mineTitle")}</h2>
          {mine.length === 0 ? <p className="rounded-2xl border border-dashed px-5 py-6 text-sm text-muted-foreground">{t("mineEmpty")}</p> : (
            <ul className="space-y-3">
              {mine.map((bottle) => <li key={bottle.id} className="space-y-3 rounded-2xl border bg-card p-4" data-testid="my-bottle">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{bottle.body}</p>
                <p className="text-xs text-muted-foreground">
                  {date.format(bottle.createdAt)} {bottle._count.picks > 0 ? t("pickedBy", { count: bottle._count.picks }) : t("stillFloating")}
                </p>
                {bottle.status === "HIDDEN" && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">{t("hiddenNote")}</p>}
                {bottle.replies.length > 0 && <ul className="space-y-2 border-t pt-3">
                  {bottle.replies.map((reply) => <li key={reply.id} className={`${NOTE} px-3 py-2 text-sm`}>{reply.body}</li>)}
                </ul>}
              </li>)}
            </ul>
          )}
        </section>
      </div>
    </AccountContentBoundary>}
  </div>;
}
