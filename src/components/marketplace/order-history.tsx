"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { MarketOrderView } from "@/contracts/marketplace-view";
import { marketOrderHistorySchema, type MarketOrderHistory } from "@/contracts/marketplace-history";
import { useMarketRequest } from "./account-boundary";
import { Button } from "@/components/ui/button";

type Props = { orderId: string; userId: string } & (
  | { kind: "messages"; initial: MarketOrderView["messages"]; before: string | null }
  | { kind: "events"; initial: MarketOrderView["events"]; before: string | null }
);

/** A refreshed server window starts a new pagination session, not a mix of cursors. */
export function OrderHistory(props: Props) {
  const windowKey = JSON.stringify([props.orderId, props.userId, props.kind, props.initial.map(item => item.id), props.before]);
  return <OrderHistorySession key={windowKey} {...props} />;
}
function OrderHistorySession(props: Props) {
  const request = useMarketRequest(); const t = useTranslations("product.market");
  const [pages, setPages] = useState<MarketOrderHistory[]>([]);
  const [cursor, setCursor] = useState(props.before);
  const [loading, setLoading] = useState(false); const [error, setError] = useState(false);
  const flight = useRef(false); const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function more() {
    if (!cursor || flight.current || !alive.current) return;
    flight.current = true; setLoading(true); setError(false);
    try {
      const query = new URLSearchParams({ kind: props.kind, before: cursor });
      const data = marketOrderHistorySchema.parse(await request<unknown>(`/api/market/orders/${encodeURIComponent(props.orderId)}/history?${query}`, "GET", undefined));
      if (data.orderId !== props.orderId || data.kind !== props.kind || data.nextCursor === cursor) throw new Error("UNCONFIRMED_RESPONSE");
      if (!alive.current) return;
      setPages(previous => [data, ...previous]); setCursor(data.nextCursor);
    } catch { if (alive.current) setError(true); }
    finally { flight.current = false; if (alive.current) setLoading(false); }
  }
  const controls = <>{cursor && <Button type="button" variant="outline" disabled={loading} onClick={() => void more()}>{t(loading ? "historyLoading" : props.kind === "messages" ? "olderMessages" : "olderEvents")}</Button>}{error && <p role="alert" className="text-sm text-destructive">{t("historyLoadError")}</p>}</>;
  if (props.kind === "messages") {
    const items = [...pages.flatMap(page => page.kind === "messages" ? page.items : []), ...props.initial];
    return <div className="mt-5 space-y-4" aria-busy={loading}>{controls}{items.map(message => <article key={message.id} className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{t(message.authorId === props.userId ? "you" : "counterparty")} · <time dateTime={message.createdAt}>{message.createdAt}</time></p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{message.content}</p></article>)}</div>;
  }
  const items = [...pages.flatMap(page => page.kind === "events" ? page.items : []), ...props.initial];
  return <div className="mt-5 space-y-4" aria-busy={loading}>{controls}<ol className="space-y-4">{items.map(event => <li className="border-s-2 ps-4" key={event.id}><p className="text-sm font-medium">{t("orderStatus." + event.toStatus)}</p><time dateTime={event.createdAt} className="text-xs text-muted-foreground">{event.createdAt}</time>{event.message && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{event.message}</p>}</li>)}</ol></div>;
}
