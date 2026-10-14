import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Clock3, Coins, ReceiptText } from "lucide-react";
import type { ComputeHistory as History, ComputeHistoryFilter } from "@/server/compute/member-history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ComputeDeliveryStatus } from "@/components/workspace/compute-delivery-status";

const filters: ComputeHistoryFilter[] = ["all", "active", "settled", "released"];
const stateVariants = { AUTHORIZED: "outline", RUNNING: "secondary", UNCERTAIN: "outline", SETTLED: "default", RELEASED: "secondary" } as const;

export async function ComputeHistory({ history, filter, paged, userId }: { userId: string; history: History; filter: ComputeHistoryFilter; paged: boolean }) {
  const [t, locale] = await Promise.all([getTranslations("product.computeHistory"), getLocale()]);
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 });
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai" });
  const points = (value: number) => t("points", { value: numbers.format(value) });
  const { tasks, summary } = history;
  const stats = [
    { name: "reserved", value: summary.reservedPoints, icon: Clock3 },
    { name: "consumed", value: summary.consumedPoints, icon: ArrowUpRight },
    { name: "refunded", value: summary.refundedPoints, icon: ArrowDownLeft },
  ] as const;
  const firstPage = `/workspace/compute?filter=${filter}`;
  return <div className="ans-product-shell"><div className="ans-product-container space-y-8 py-8 sm:py-12">
    <header className="flex flex-wrap items-start justify-between gap-5">
      <div className="max-w-2xl">
        <Link href="/workspace" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" />{t("back")}</Link>
        <p className="ans-eyebrow mt-7">{t("eyebrow")}</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1>
        <p className="mt-4 max-w-xl leading-7 text-muted-foreground">{t("description")}</p>
      </div>
      <Button asChild variant="outline" className="sm:mt-2"><a href={firstPage}>{t("refresh")}</a></Button>
    </header>
    <section aria-label={t("summaryLabel")} className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
      <Card className="border-primary/25 bg-primary/5"><CardContent className="flex h-full flex-col justify-between gap-5">
        <p className="flex items-center gap-2 text-sm font-medium"><Coins className="size-4 text-primary" aria-hidden="true" />{t("available")}</p>
        <p className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">{numbers.format(summary.availablePoints)}<span className="ms-2 text-base font-normal text-muted-foreground">{t("pointUnit")}</span></p>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">{t("availableBody")}</p>
      </CardContent></Card>
      <Card><CardContent className="grid h-full gap-6 sm:grid-cols-3">
        {stats.map(({ name, value, icon: Icon }) => <div key={name} className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium"><Icon className="size-4 text-muted-foreground" aria-hidden="true" />{t(name)}</p>
          <p className="text-2xl font-semibold tabular-nums">{points(value)}</p>
          <p className="text-xs leading-6 text-muted-foreground">{t(`${name}Body`)}</p>
        </div>)}
        <p className="text-xs leading-6 text-muted-foreground sm:col-span-3">{t("summaryScope", { count: summary.taskCount })}</p>
      </CardContent></Card>
    </section>
    {summary.reservedPoints > 0 && <aside className="flex gap-3 rounded-[var(--radius)] border border-primary/20 bg-primary/5 p-5">
      <Clock3 className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
      <div><h2 className="text-sm font-semibold">{t("holdTitle")}</h2><p className="mt-1 max-w-3xl text-sm leading-7 text-muted-foreground">{t("holdBody")}</p></div>
    </aside>}
    <aside className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border p-5">
      <div className="max-w-3xl"><h2 className="text-sm font-semibold">{t("deliveryTitle")}</h2><p className="mt-1 text-sm leading-7 text-muted-foreground">{t("deliveryBody")}</p></div>
      <Button asChild variant="outline" size="sm"><Link href="/workflows/toonflow">{t("viewResults")}</Link></Button>
    </aside>
    <section aria-labelledby="compute-history-heading" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="compute-history-heading" className="flex items-center gap-2 text-lg font-semibold"><ReceiptText className="size-5" aria-hidden="true" />{t("records")}</h2>
        <p className="text-xs text-muted-foreground">{t("timezone")}</p>
      </div>
      <nav aria-label={t("filtersLabel")} className="flex flex-wrap gap-2">
        {filters.map(value => <Button key={value} asChild variant={value === filter ? "default" : "outline"} size="sm"><Link prefetch={false} href={`/workspace/compute?filter=${value}`} aria-current={value === filter ? "page" : undefined}>{t(`filters.${value}`)}</Link></Button>)}
      </nav>
      {tasks.length === 0 ? <Card className="border-dashed"><CardContent className="py-6">
        <h3 className="font-medium">{t(filter === "all" && !paged ? "emptyTitle" : "filteredEmptyTitle")}</h3>
        <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">{t(filter === "all" && !paged ? "emptyBody" : "filteredEmptyBody")}</p>
        <Button asChild variant="outline" className="mt-5"><Link href="/workflows/toonflow">{t("openWorkspace")}</Link></Button>
      </CardContent></Card> : <ol className="space-y-3">
        {tasks.map(task => <li key={task.taskId}><Card className="gap-0"><CardContent>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1"><h3 className="break-words text-base font-semibold [overflow-wrap:anywhere]">{task.modelId}</h3><p className="mt-1 text-xs text-muted-foreground"><time dateTime={task.createdAt}>{dates.format(new Date(task.createdAt))}</time></p></div>
            <Badge variant={stateVariants[task.state]}>{t(`states.${task.state}`)}</Badge>
          </div>
          <dl className="mt-5 grid gap-4 border-t pt-4 sm:grid-cols-3">
            <div><dt className="text-xs text-muted-foreground">{t("authorized")}</dt><dd className="mt-1 font-medium tabular-nums">{points(task.authorizedPoints)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{t("actual")}</dt><dd className="mt-1 font-medium tabular-nums">{task.settledPoints === null ? t("pending") : points(task.settledPoints)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{t("returned")}</dt><dd className="mt-1 font-medium tabular-nums">{points(task.refundedPoints)}</dd></div>
          </dl>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{t(`stateBody.${task.state}`)}</p>
          {(task.unit === "image" || task.unit === "second") && <ComputeDeliveryStatus userId={userId} taskId={task.taskId} unit={task.unit} />}
          <details className="mt-3 text-xs"><summary className="w-fit cursor-pointer py-2 text-muted-foreground">{t("details")}</summary>
            <dl className="grid gap-3 rounded-[var(--radius)] bg-muted/40 p-4 sm:grid-cols-2">
              <div className="min-w-0"><dt className="text-muted-foreground">{t("taskId")}</dt><dd className="mt-1 break-all font-mono">{task.taskId}</dd></div>
              <div><dt className="text-muted-foreground">{t("usage")}</dt><dd className="mt-1">{task.state === "RELEASED" ? t("noUsage") : task.units === null ? t("pending") : t(`units.${task.unit}`, { count: task.units })}</dd></div>
              <div><dt className="text-muted-foreground">{t("budget")}</dt><dd className="mt-1">{t(`units.${task.unit}`, { count: task.maxUnits })}</dd></div>
              <div><dt className="text-muted-foreground">{t("outcome")}</dt><dd className="mt-1">{task.state === "RELEASED" ? t("noUsage") : task.outcome ? t(`outcomes.${task.outcome}`) : t("pending")}</dd></div>
              {task.startedAt && <div><dt className="text-muted-foreground">{t("startedAt")}</dt><dd className="mt-1"><time dateTime={task.startedAt}>{dates.format(new Date(task.startedAt))}</time></dd></div>}
              {task.finishedAt && <div><dt className="text-muted-foreground">{t("finishedAt")}</dt><dd className="mt-1"><time dateTime={task.finishedAt}>{dates.format(new Date(task.finishedAt))}</time></dd></div>}
            </dl>
          </details>
        </CardContent></Card></li>)}
      </ol>}
      <div className="flex flex-wrap gap-3">
        {paged && <Button asChild variant="outline"><Link prefetch={false} href={firstPage}>{t("newest")}</Link></Button>}
        {history.nextCursor && <Button asChild variant="outline"><Link prefetch={false} href={`${firstPage}&cursor=${encodeURIComponent(history.nextCursor)}`}>{t("older")}</Link></Button>}
      </div>
    </section>
  </div></div>;
}
