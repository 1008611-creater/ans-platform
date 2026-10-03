import Link from "next/link";
import { Activity, CircleHelp, Clock3, Radio, RefreshCw } from "lucide-react";
import { getTranslations } from "next-intl/server";

const STATUS_FEED_URL = "https://apic.cauai.fun/api/uptime/status";

interface StatusFeedResult {
  reachable: boolean;
  itemCount: number;
}

async function readStatusFeed(): Promise<StatusFeedResult> {
  try {
    const response = await fetch(STATUS_FEED_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: { accept: "application/json" },
    });
    if (!response.ok) return { reachable: false, itemCount: 0 };

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || !("data" in payload)) {
      return { reachable: true, itemCount: 0 };
    }
    const data = (payload as { data?: unknown }).data;
    return { reachable: true, itemCount: Array.isArray(data) ? data.length : 0 };
  } catch {
    return { reachable: false, itemCount: 0 };
  }
}

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const [t, feed] = await Promise.all([
    getTranslations("serviceStatus"),
    readStatusFeed(),
  ]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Activity className="h-4 w-4" aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t("description")}</p>
        </div>
        <Link
          href="/status"
          className="inline-flex h-9 w-fit items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t("refresh")}
        </Link>
      </div>

      <section className="mt-8 rounded-xl border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="feed-heading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Radio className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <div>
              <h2 id="feed-heading" className="font-medium">{t("sourceLabel")}</h2>
              <p className="text-sm text-muted-foreground">APIC · apic.cauai.fun</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${feed.reachable ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
            <span className={`h-2 w-2 rounded-full ${feed.reachable ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />
            {feed.reachable ? t("sourceConnected") : t("sourceUnavailable")}
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t("monitoredModels")}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{feed.itemCount}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t("latency")}</p>
            <p className="mt-2 text-lg font-semibold">{t("notReported")}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t("availability")}</p>
            <p className="mt-2 text-lg font-semibold">{t("notReported")}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-card p-5 sm:p-6" aria-labelledby="checks-heading">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="checks-heading" className="font-semibold">{t("recentChecks")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("checksDescription")}</p>
          </div>
          <Clock3 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>

        {feed.itemCount === 0 ? (
          <div className="mt-5 flex gap-3 rounded-lg border border-dashed p-5">
            <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="font-medium">{t(feed.reachable ? "notConfiguredTitle" : "unavailableTitle")}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t(feed.reachable ? "notConfiguredDescription" : "unavailableDescription")}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
            {t("feedFormatPending", { count: feed.itemCount })}
          </p>
        )}
      </section>

      <p className="mt-5 text-xs leading-5 text-muted-foreground">{t("measurementNote")}</p>
    </main>
  );
}
