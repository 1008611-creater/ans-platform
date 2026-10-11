"use client";
import { useEffect,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Coins,KeyRound,Loader2,ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import { Input } from "@/components/ui/input";
type Billing={rechargeYuanPerPoint:number;usdQuotaPerPoint:number;gptConsumptionMultiplier:number;deepseekConsumptionMultiplier:number;rechargeEnabled:boolean};
type CreditsProps={actorId:string;billing:Billing;availablePoints:number};
export function CreditsCenter(props:CreditsProps){return <AccountContentBoundary actorId={props.actorId}><CreditsCenterSession key={props.actorId} {...props}/></AccountContentBoundary>;}
function CreditsCenterSession({actorId,billing,availablePoints}:CreditsProps){
 const t=useTranslations("product.vouchers");const router=useRouter();const flight=useRef(false);const alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const [code,setCode]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [ok,setOk]=useState(false);
 async function redeem(){if(flight.current)return;flight.current=true;setBusy(true);setMessage("");setOk(false);try{const r=await fetch("/api/quota/redeem",{method:"POST",headers:{"Content-Type":"application/json","x-ans-actor":actorId},body:JSON.stringify({code})});const d=await r.json();if(!alive.current)return;if(!r.ok)throw new Error(d.error);setOk(true);setMessage(t(d.duplicate?"duplicate":"success",{points:d.points}));setCode("");router.refresh();}catch(e){if(!alive.current)return;const k=e instanceof Error?e.message:"";setMessage(t(["VOUCHER_INVALID","VOUCHER_USED","RATE_LIMITED"].includes(k)?k:"failed"));}finally{flight.current=false;if(alive.current)setBusy(false);}}
 return <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-3xl border bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8"><p className="flex items-center gap-2 text-sm text-primary"><Coins className="size-4"/>{t("balance")}</p><p className="mt-4 text-5xl font-semibold tabular-nums">{availablePoints.toLocaleString()}</p><p className="mt-4 text-sm text-muted-foreground">{t("rules",{gpt:billing.gptConsumptionMultiplier,deepseek:billing.deepseekConsumptionMultiplier})}</p></section><section className="rounded-3xl border bg-card p-6 sm:p-8"><h2 className="flex items-center gap-2 font-semibold"><KeyRound className="size-5 text-primary"/>{t("title")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("description")}</p><form className="mt-5 space-y-3" onSubmit={e=>{e.preventDefault();void redeem();}}><label className="grid gap-2 text-sm">{t("code")}<Input value={code} onChange={e=>setCode(e.target.value)} autoComplete="off" spellCheck={false} maxLength={100} placeholder="ANS-…" required disabled={busy}/></label><Button className="w-full" disabled={busy||!code.trim()}>{busy&&<Loader2 className="animate-spin"/>}{t(busy?"busy":"redeem")}</Button></form>{message&&<p role={ok?"status":"alert"} className={ok?"mt-3 text-sm text-emerald-600":"mt-3 text-sm text-destructive"}>{message}</p>}<a className="mt-5 inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline" href="https://wzyp.cn/item/zkm211" target="_blank" rel="noopener noreferrer">{t("shop")}<ArrowUpRight className="size-4"/></a><p className="mt-2 text-xs text-muted-foreground">{t("shopNote")}</p></section></div>;
}
