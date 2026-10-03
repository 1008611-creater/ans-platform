import Link from "next/link";
import { Activity, AlertTriangle, CircleHelp, Clock3, Radio, RefreshCw } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getFreshApicStatus, type ApicStatusRecord } from "@/lib/apic-status-cache";

export const dynamic = "force-dynamic";

function statusClass(status: ApicStatusRecord["status"]): string {
  if (status === "operational") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "degraded") return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

export default async function StatusPage() {
  const [t, snapshot] = await Promise.all([
    getTranslations("serviceStatus"),
    Promise.resolve(getFreshApicStatus()),
  ]);
  const records = snapshot?.records ?? [];
  const latencyRecords = records.filter((record) => record.latencyMs !== null);
  const averageLatency = latencyRecords.length
    ? Math.round(latencyRecords.reduce((sum, record) => sum + (record.latencyMs ?? 0), 0) / latencyRecords.length)
    : null;
  const averageAvailability = records.length
    ? records.reduce((sum, record) => sum + record.availability24h, 0) / records.length
    : null;
  const locale = await getLocale();
  const sourceReady = snapshot !== null;

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
        <Link href="/status" className="inline-flex h-9 w-fit items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent">
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
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${sourceReady ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
            <span className={`h-2 w-2 rounded-full ${sourceReady ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />
            {sourceReady ? t("sourceConnected") : t("sourceUnavailable")}
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t("monitoredModels")}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{records.length}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t("averageLatency")}</p>
            <p className="mt-2 text-lg font-semibold">{averageLatency === null ? t("notReported") : `${averageLatency} ms`}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t("availability24hAverage")}</p>
            <p className="mt-2 text-lg font-semibold">{averageAvailability === null ? t("notReported") : `${averageAvailability.toFixed(2)}%`}</p>
          </div>
        </div>
        {snapshot && <p className="mt-4 text-xs text-muted-foreground">{t("updatedAt")}: {formatDate(snapshot.generatedAt, locale)}</p>}
      </section>

      <section className="mt-6 rounded-xl border bg-card p-5 sm:p-6" aria-labelledby="checks-heading">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="checks-heading" className="font-semibold">{t("recentChecks")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("checksDescription")}</p>
          </div>
          <Clock3 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
        {records.length === 0 ? (
          <div className="mt-5 flex gap-3 rounded-lg border border-dashed p-5">
            {sourceReady ? <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />}
            <div>
              <p className="font-medium">{t(sourceReady ? "notConfiguredTitle" : "unavailableTitle")}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(sourceReady ? "notConfiguredDescription" : "unavailableDescription")}</p>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {records.map((record) => (
              <article key={`${record.monitorName}:${record.model}`} className="rounded-lg border p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <h3 className="font-medium">{record.model}</h3>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{record.monitorName}</p>
                  </div>
                  <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(record.status)}`}>{({
                    operational: t("statusOperational"),
                    degraded: t("statusDegraded"),
                    failed: t("statusFailed"),
                    error: t("statusError"),
                  })[record.status]}</span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div><dt className="text-muted-foreground">{t("latency")}</dt><dd className="mt-1 font-medium">{record.latencyMs === null ? t("notReported") : `${record.latencyMs} ms`}</dd></div>
                  <div><dt className="text-muted-foreground">{t("availability24h")}</dt><dd className="mt-1 font-medium">{record.availability24h.toFixed(2)}%</dd></div>
                  <div><dt className="text-muted-foreground">{t("lastChecked")}</dt><dd className="mt-1 font-medium">{formatDate(record.checkedAt, locale)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">{t("measurementNote")}</p>
    </main>
  );
}
