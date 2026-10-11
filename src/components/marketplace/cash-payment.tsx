"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { marketCashCheckoutSchema, type MarketCashCheckout, type MarketCashOffer } from "@/contracts/marketplace-cash";
import { marketRequest } from "./request";

function useCashError() {
  const t = useTranslations("marketCash");
  return (error: unknown) => {
    const code = error instanceof Error ? error.message : "";
    return t(code === "PAYMENT_CHECKOUT_EXPIRED" ? "expired" : code === "PAYMENT_RECONCILIATION_REQUIRED" ? "reconcile" : ["PAYMENT_NOT_CONFIGURED", "SELLER_CASH_NOT_ENABLED", "CASH_PRICE_NOT_APPROVED"].includes(code) ? "unavailable" : "error");
  };
}
export function CreateCashOrder({ listingId, version, offer }: { listingId: string; version: number; offer: MarketCashOffer }) {
  const t = useTranslations("marketCash"); const errorText = useCashError(); const router = useRouter();
  const flight = useRef(false); const pending = useRef<{ provider: "wechat" | "alipay"; key: string } | null>(null);
  const [provider, setProvider] = useState(offer.providers[0]); const [busy,setBusy] = useState(false); const [error,setError] = useState("");
  if (!provider) return null;
  return <form className="space-y-4 border-t pt-5" onSubmit={async event => {
    event.preventDefault(); if (flight.current) return; flight.current = true; setBusy(true);setError("");
    pending.current ??= {provider,key:crypto.randomUUID()};
    try { const result=await marketRequest<{order:{id:string}}>("/api/market/orders","POST",{listingId,expectedVersion:version,idempotencyKey:pending.current.key,paymentMethod:pending.current.provider.toUpperCase(),requirements:""});
      if (!result?.order?.id || !/^[A-Za-z0-9_-]{1,100}$/.test(result.order.id)) throw new Error("INVALID_ACKNOWLEDGEMENT"); router.push(`/market/orders/${result.order.id}`);
    } catch (caught) {setError(errorText(caught));} finally {flight.current=false;setBusy(false);}
  }}><div className="flex items-center justify-between"><span className="text-sm font-medium">{t("title")}</span><span className="text-xl font-semibold tabular-nums">{t("price",{amount:(offer.priceMinor/100).toFixed(2)})}</span></div>
    <fieldset disabled={busy || pending.current !== null} className="flex flex-wrap gap-3"><legend className="sr-only">{t("title")}</legend>{offer.providers.map(value=><label key={value} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><input type="radio" name="cash-provider" checked={provider===value} onChange={()=>setProvider(value)}/>{t(value)}</label>)}</fieldset>
    <label className="flex items-start gap-3 text-xs leading-6"><input type="checkbox" required disabled={busy} className="mt-1.5"/>{t("confirm")}</label><Button className="w-full" disabled={busy}>{t("buy")}</Button><p className="text-xs leading-6 text-muted-foreground">{t("notice")}</p>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}
  </form>;
}

export function CashPayment({ orderId, revision, method, amountMinor }: { orderId:string; revision:number; method:"WECHAT"|"ALIPAY"; amountMinor:number }) {
  const t=useTranslations("marketCash"); const errorText=useCashError(); const router=useRouter(); const flight=useRef(false);
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [note,setNote]=useState("");const [checkout,setCheckout]=useState<MarketCashCheckout|null>(null);
  const provider=method === "WECHAT" ? "wechat" : "alipay";
  async function run(action:"checkout"|"reconcile") {
    if(flight.current)return;flight.current=true;setBusy(true);setError("");setNote("");
    try {
      if(action === "checkout") {const result=marketCashCheckoutSchema.parse(await marketRequest(`/api/market/orders/${orderId}/checkout`,"POST",{expectedRevision:revision}));
        if(result.provider !== provider || new Date(result.expiresAt).getTime() <= Date.now()) throw new Error("PAYMENT_CHECKOUT_EXPIRED");setCheckout(result);
      } else {const result=await marketRequest<{paid:boolean}>(`/api/market/orders/${orderId}/reconcile`,"POST",{});if(result?.paid===true)router.refresh();else if(result?.paid===false)setNote(t("pending"));else throw new Error("INVALID_ACKNOWLEDGEMENT");}
    }catch(caught){setError(errorText(caught));}finally{flight.current=false;setBusy(false);}
  }
  return <section className="ans-detail-block space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{t(provider)}</h2><p className="text-2xl font-semibold tabular-nums">{t("price",{amount:(amountMinor/100).toFixed(2)})}</p></div>
    {!checkout && <form className="space-y-4" onSubmit={event=>{event.preventDefault();void run("checkout");}}><label className="flex gap-3 text-sm leading-6"><input type="checkbox" required disabled={busy} className="mt-1.5"/>{t("confirm")}</label><Button className="w-full" disabled={busy}>{t("start",{provider:t(provider)})}</Button></form>}
    {checkout && <div className="space-y-4">{checkout.mode === "qr" ? <div className="flex flex-col items-center gap-3"><div className="rounded-2xl border bg-white p-3"><QRCodeSVG value={checkout.url} size={220} level="M" marginSize={4} title={t("qrTitle")} className="max-w-full"/></div><p className="text-sm">{t("qr")}</p></div> : <Button asChild className="w-full"><a href={checkout.url} rel="noreferrer">{t("start",{provider:t("alipay")})}</a></Button>}<p className="text-xs text-muted-foreground">{t("expires",{time:new Date(checkout.expiresAt).toLocaleString()})}</p></div>}
    <Button type="button" className="w-full" variant="outline" disabled={busy} onClick={()=>void run("reconcile")}>{t("verify")}</Button><p className="text-xs leading-6 text-muted-foreground">{t("recovery")}</p>{note && <p className="text-sm" role="status">{note}</p>}{error && <p className="text-sm text-destructive" role="alert">{error}</p>}
  </section>;
}
