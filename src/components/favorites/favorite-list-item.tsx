"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FavoriteTargetType } from "@/contracts/favorites";

type FavoriteListItemProps = {
  accountId: string; targetType: FavoriteTargetType; targetId: string; title: string; href: string;
  subtitle: string | null; authorName: string | null; costPoints: number | null;
};
export function FavoriteListItem(props: FavoriteListItemProps) {
  const { data, status } = useSession();
  if (status !== "authenticated" || data?.user?.id !== props.accountId) return null;
  return <FavoriteListItemState key={`${data.user.id}:${props.targetType}:${props.targetId}`} {...props} />;
}
function FavoriteListItemState({ accountId, targetType, targetId, title, href, subtitle, authorName, costPoints }: FavoriteListItemProps) {
  const router = useRouter(); const t = useTranslations("favorites"); const { data: session, status } = useSession();
  const actor = status === "authenticated" ? session?.user?.id ?? null : null;
  const currentActor = useRef(actor); currentActor.current = actor;
  const control = useRef<AbortController | null>(null); const locked = useRef(false);
  const [removed, setRemoved] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { control.current?.abort(); return () => { control.current?.abort(); }; }, [actor]);
  async function remove() {
    if (actor !== accountId || locked.current) return;
    const controller = new AbortController(); control.current = controller; locked.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/favorites?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`, { method: "DELETE", headers: { "x-vibehub-account-id": accountId }, signal: controller.signal });
      if (controller.signal.aborted || currentActor.current !== accountId) return;
      if (!response.ok) throw new Error(t("error"));
      setRemoved(true); router.refresh();
    } catch { if (!controller.signal.aborted && currentActor.current === accountId) setError(t("error")); }
    finally { locked.current = false; if (!controller.signal.aborted && currentActor.current === accountId) setBusy(false); }
  }
  if (actor !== accountId || removed) return null;
  return <Card><CardHeader className="pb-3"><div className="flex flex-wrap items-start justify-between gap-2"><CardTitle className="text-base"><Link href={href} className="hover:underline">{title}</Link></CardTitle><Badge variant="secondary">{t(`types.${targetType}`)}</Badge></div>{subtitle && <p className="line-clamp-2 text-sm text-muted-foreground">{subtitle}</p>}</CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-0"><div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{authorName && <span>{authorName}</span>}{costPoints !== null && <Badge variant="outline">{t("estimatedCost", { points: Math.max(0, costPoints) })}</Badge>}</div><div className="flex items-center gap-3">{error && <span role="alert" className="text-xs text-destructive">{error}</span>}<Button variant="ghost" size="sm" disabled={busy} onClick={remove}>{busy ? <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="me-1.5 h-3.5 w-3.5" />}{t("remove")}</Button></div></CardContent></Card>;
}
