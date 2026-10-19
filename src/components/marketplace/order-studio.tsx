"use client";
import { useMarketRequest, MarketAccountBoundary } from "./account-boundary";
import { CashPayment } from "./cash-payment";
import { ProjectUsageEntry } from "./project-usage-entry";
import { Github } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { marketMessageSchema, marketOrderActionSchema, marketOrderStatusSchema, marketReviewSchema } from "@/contracts/marketplace";
import { nextOrderStatus } from "@/domain/marketplace/order";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MarketOrderView } from "@/contracts/marketplace-view";
import { availableMarketActions, marketPrice } from "@/domain/marketplace/presentation";
import { OrderHistory } from "./order-history";
import { PointsPayment } from "./points-payment";
import { MarketRequestRejection } from "./request";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
type PendingOrderCommand = { url: string; form: HTMLFormElement } & (
  | { kind: "message"; body: z.infer<typeof marketMessageSchema> }
  | { kind: "action"; body: z.infer<typeof marketOrderActionSchema>; expectedStatus: MarketOrderView["status"] }
  | { kind: "review"; body: z.infer<typeof marketReviewSchema> }
);
const savedRecordSchema = z.object({ id: z.string().min(1).max(128) });

export function OrderStudio({ order, userId }: { order: MarketOrderView; userId: string }) {
  return <MarketAccountBoundary actorId={userId}><OrderStudioSession key={JSON.stringify([order.id, userId])} order={order} userId={userId} /></MarketAccountBoundary>;
}

function OrderStudioSession({ order, userId }: { order: MarketOrderView; userId: string }) {
  const marketRequest = useMarketRequest();
  const t = useTranslations("product.market"); const tp = useTranslations("product.marketProject"); const router = useRouter();
  const role = order.buyerId === userId ? "buyer" : "seller";
  const canOpenProject = role === "buyer" && order.paymentMethod === "POINTS" && Boolean(order.paidAt) && ["AWAITING_REQUIREMENTS", "IN_PROGRESS", "DELIVERED", "REVISION_REQUESTED", "COMPLETED"].includes(order.status);
  const actions = availableMarketActions({ ...order, revisionLimit: order.quote.revisionLimit }, role);
  const [selected, setSelected] = useState(actions[0]); const chosen = actions.includes(selected) ? selected : actions[0];
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [pending, setPending] = useState<PendingOrderCommand | null>(null);
  const pendingRef = useRef<PendingOrderCommand | null>(null);
  const inFlight = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  const locked = busy || pending !== null;
  function showError(caught: unknown) {
    const code = caught instanceof Error ? caught.message : "INTERNAL_ERROR";
    setError(t(t.has("errors." + code) ? "errors." + code : "errors.INTERNAL_ERROR"));
  }
  async function execute(command: PendingOrderCommand) {
    if (inFlight.current || !alive.current || pendingRef.current !== command) return;
    // State updates do not lock another submit in the same React batch.
    inFlight.current = true;
    setError(""); setBusy(true);
    try {
      const result = await marketRequest<unknown>(command.url, "POST", command.body);
      if (command.kind === "action") {
        const acknowledgement = z.object({ order: z.object({
          id: z.literal(order.id), buyerId: z.literal(order.buyerId), sellerId: z.literal(order.sellerId),
          revision: z.number().int().min(command.body.expectedRevision + 1), status: marketOrderStatusSchema,
        }) }).parse(result);
        if (acknowledgement.order.revision === command.body.expectedRevision + 1 && acknowledgement.order.status !== command.expectedStatus) {
          throw new Error("UNCONFIRMED_RESPONSE");
        }
      } else savedRecordSchema.parse(result);
      if (!alive.current || pendingRef.current !== command) return;
      pendingRef.current = null; setPending(null);
      command.form.reset(); router.refresh();
    } catch (caught) {
      // A missing response can follow a committed write. Retain the exact
      // command and forbid another write until this one is acknowledged.
      if (alive.current && pendingRef.current === command) {
        showError(caught);
        if (caught instanceof MarketRequestRejection) {
          // A validated 4xx rejection confirms that this command did not commit.
          // Preserve the form draft while refreshing stale order state.
          pendingRef.current = null; setPending(null); router.refresh();
        }
      }
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function submit(kind: PendingOrderCommand["kind"], form: HTMLFormElement) {
    if (inFlight.current || pendingRef.current || !alive.current) return;
    const fields = new FormData(form);
    const base = "/api/market/orders/" + order.id;
    let command: PendingOrderCommand;
    try {
      if (kind === "message") command = { kind, form, url: base + "/messages", body: marketMessageSchema.parse({
        content: String(fields.get("content") ?? ""), idempotencyKey: crypto.randomUUID(),
      }) };
      else if (kind === "action") {
        const body = marketOrderActionSchema.parse({ action: chosen, expectedRevision: order.revision,
          idempotencyKey: crypto.randomUUID(), message: String(fields.get("message") ?? ""),
        });
        command = { kind, form, url: base, body, expectedStatus: nextOrderStatus({
          status: order.status, revisionRequests: order.revisionRequests, revisionLimit: order.quote.revisionLimit,
        }, body.action, role) };
      } else command = { kind, form, url: base + "/review", body: marketReviewSchema.parse({
        rating: Number(fields.get("rating")), content: String(fields.get("content") ?? ""),
      }) };
    } catch { setError(t("errors.INVALID_INPUT")); return; }
    pendingRef.current = command; setPending(command);
    void execute(command);
  }
  return <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_0.7fr]">
    <div className="min-w-0 space-y-6"><section className="ans-detail-block"><h2 className="text-lg font-semibold">{order.quote.title}</h2>{order.quote.selectedTierTitle && <p className="mt-2 text-sm font-medium text-primary">{tp("purchasedTier", { title: order.quote.selectedTierTitle })}</p>}<p className="mt-3 text-sm text-muted-foreground">{t(role)} · {t("orderStatus." + order.status)}</p><p className="mt-4 text-3xl font-semibold">{order.paymentMethod === "POINTS" ? t("pointsUnit", { amount: order.quote.priceMinor / 100 }) : marketPrice(order.quote.priceMinor)}</p><p className="mt-2 text-xs text-muted-foreground">{t("frozenQuote", { version: order.quote.listingVersion })}</p><p className="mt-3 text-sm leading-7 text-muted-foreground">{tp("orderDeliveryNote")}</p>{order.quote.githubUrl && <Button asChild variant="outline" className="mt-4"><a href={order.quote.githubUrl} target="_blank" rel="noopener noreferrer"><Github aria-hidden="true"/>{tp("viewGithub")}</a></Button>}
      <ul className="mt-5 list-inside list-disc space-y-2 text-sm">{order.quote.deliverables.map((item,index) => <li className="break-words" key={index}>{item}</li>)}</ul><p className="mt-4 whitespace-pre-wrap break-words text-sm">{order.quote.licenseTerms}</p><p className="mt-3 text-sm text-muted-foreground">{t("delivery", { days: order.quote.deliveryDays })} · {t("revisions", { count: order.quote.revisionLimit })} · {t(order.quote.computeIncluded ? "computeYes" : "computeNo")}</p></section>
      <section className="ans-detail-block"><h2 className="text-lg font-semibold">{t("requirements")}</h2><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">{order.requirements || t("noRequirements")}</p></section>
      <section className="ans-detail-block"><h2 className="text-lg font-semibold">{t("deliveries")}</h2>{order.deliveries.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{t("noDelivery")}</p> : order.deliveries.map((delivery) => <article className="mt-5 border-t pt-5" key={delivery.id}><p className="mb-3 text-xs text-muted-foreground">{t("deliveryVersion", { version: delivery.revision })} · <time>{delivery.createdAt}</time></p><div className="prose prose-sm max-w-none break-words dark:prose-invert [&_pre]:max-w-full [&_pre]:overflow-auto [&_table]:block [&_table]:overflow-auto"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{delivery.markdown}</ReactMarkdown></div></article>)}</section>
      <section className="ans-detail-block"><h2 className="text-lg font-semibold">{t("messages")}</h2><OrderHistory orderId={order.id} userId={userId} kind="messages" initial={order.messages} before={order.history?.messagesBefore ?? null} />
        <form className="mt-5 space-y-3" onSubmit={(event) => { event.preventDefault(); submit("message", event.currentTarget); }}><label className="grid gap-2 text-sm"><span>{t("message")}</span><Textarea name="content" required maxLength={4000} disabled={locked}/></label><Button disabled={locked}>{t("send")}</Button></form>
      </section>
    </div>
    <div className="min-w-0 space-y-6">{pending && !busy && <div className="rounded-xl border p-4 text-sm" role="status"><p>{t("pendingRequest")}</p><Button type="button" className="mt-3" onClick={() => { const command = pendingRef.current; if (command) void execute(command); }}>{t("recoverRequest")}</Button></div>}{error && <p className="rounded-xl border border-destructive p-4 text-sm text-destructive" role="alert">{error}</p>}
      {canOpenProject && order.quote.usageUrl && <ProjectUsageEntry usageUrl={order.quote.usageUrl} purchased/>}
      {role === "buyer" && order.status === "AWAITING_PAYMENT" && (order.paymentMethod === "WECHAT" || order.paymentMethod === "ALIPAY") && <CashPayment orderId={order.id} revision={order.revision} method={order.paymentMethod} amountMinor={order.quote.priceMinor}/>}
      {role === "buyer" && order.status === "AWAITING_PAYMENT" && order.paymentMethod === "POINTS" && <PointsPayment orderId={order.id} revision={order.revision} amount={order.quote.priceMinor / 100}/>}
      {actions.length > 0 && <section className="ans-detail-block"><h2 className="text-lg font-semibold">{t("nextAction")}</h2><form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); submit("action", event.currentTarget); }}><fieldset disabled={locked} className="space-y-4"><label className="grid gap-2 text-sm"><span>{t("chooseAction")}</span><select className="h-10 w-full rounded-md border bg-background px-3" value={chosen} onChange={(event) => { setSelected(event.target.value as typeof chosen); }}>{actions.map((action) => <option key={action} value={action}>{t("actions." + action)}</option>)}</select></label><label className="grid gap-2 text-sm"><span>{t("actionMessage")}</span><Textarea name="message" maxLength={20000} required={["submit_requirements", "deliver", "request_revision", "dispute"].includes(chosen)} className="min-h-32"/></label>{chosen === "accept" && <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-primary"/>{t("acceptNote")}</label>}<Button disabled={locked}>{t("actions." + chosen)}</Button></fieldset></form></section>}
      {order.status === "COMPLETED" && role === "buyer" && !order.review && <section className="ans-detail-block"><h2 className="text-lg font-semibold">{t("writeReview")}</h2><form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); submit("review", event.currentTarget); }}><label className="grid gap-2 text-sm"><span>{t("rating")}</span><select name="rating" className="h-10 w-full rounded-md border bg-background px-3" disabled={locked}>{[5,4,3,2,1].map((rating) => <option value={rating} key={rating}>{t("stars", { count: rating })}</option>)}</select></label><label className="grid gap-2 text-sm"><span>{t("reviewContent")}</span><Textarea name="content" required maxLength={2000} disabled={locked}/></label><Button disabled={locked}>{t("writeReview")}</Button></form></section>}
      {order.review && <section className="ans-detail-block"><h2 className="text-lg font-semibold">{t("review")}</h2><p className="mt-4">{t("stars", { count: order.review.rating })}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm">{order.review.content}</p></section>}
      <section className="ans-detail-block"><h2 className="text-lg font-semibold">{t("timeline")}</h2><OrderHistory orderId={order.id} userId={userId} kind="events" initial={order.events} before={order.history?.eventsBefore ?? null} /></section><p className="px-2 text-xs leading-6 text-muted-foreground">{t("settlementNote")}</p>
    </div>
  </div>;
}
