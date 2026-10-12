"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { analyticsFavorite } from "@/lib/analytics";
import type { FavoriteTargetType } from "@/contracts/favorites";

type FavoriteButtonProps = {
  targetType: FavoriteTargetType; targetId: string; initialFavorited: boolean; accountId: string | null;
  size?: "sm" | "default" | "lg" | "icon"; variant?: "outline" | "ghost" | "default" | "secondary"; className?: string;
};
export function FavoriteButton(props: FavoriteButtonProps) {
  const { data, status } = useSession();
  return <FavoriteButtonState key={`${status}:${data?.user?.id ?? "guest"}:${props.targetType}:${props.targetId}:${props.initialFavorited}`} {...props} />;
}
function FavoriteButtonState({ targetType, targetId, initialFavorited, accountId, size = "sm", variant = "outline", className }: FavoriteButtonProps) {
  const router = useRouter(); const { data: session, status } = useSession(); const t = useTranslations("favorites");
  const actor = status === "authenticated" ? session?.user?.id ?? null : null;
  const currentActor = useRef(actor); currentActor.current = actor;
  const control = useRef<AbortController | null>(null); const locked = useRef(false);
  const [favorited, setFavorited] = useState(initialFavorited); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { control.current?.abort(); return () => { control.current?.abort(); }; }, [actor, targetId, targetType]);
  const bound = status === "authenticated" && actor === accountId;
  async function toggle() {
    if (locked.current || status === "loading") return;
    if (status === "unauthenticated") { router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`); return; }
    if (!bound || !actor) { router.refresh(); return; }
    const expected = actor; const next = !favorited; const controller = new AbortController();
    control.current = controller; locked.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(next ? "/api/favorites" : `/api/favorites?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`, {
        method: next ? "POST" : "DELETE", headers: { "Content-Type": "application/json", "x-vibehub-account-id": expected },
        ...(next ? { body: JSON.stringify({ targetType, targetId }) } : {}), signal: controller.signal,
      });
      if (controller.signal.aborted || currentActor.current !== expected) return;
      if (!response.ok) throw new Error(t("error"));
      setFavorited(next); if (next) analyticsFavorite.add(targetType, targetId); else analyticsFavorite.remove(targetType, targetId);
      router.refresh();
    } catch { if (!controller.signal.aborted && currentActor.current === expected) setError(t("error")); }
    finally { locked.current = false; if (!controller.signal.aborted && currentActor.current === expected) setBusy(false); }
  }
  // A stale server render never exposes the previous account's saved state.
  if (status === "authenticated" && !bound) return <Button variant="outline" size={size} onClick={() => router.refresh()}>{t("accountChanged")}</Button>;
  const saved = bound && favorited; const Icon = saved ? BookmarkCheck : Bookmark;
  return <div className={cn("inline-flex flex-col gap-1", className)}><Button type="button" size={size} variant={saved ? "default" : variant} disabled={busy || status === "loading"} onClick={toggle} aria-pressed={saved}>
    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}{t(saved ? "saved" : "save")}
  </Button>{error && bound && <span role="alert" className="text-xs text-destructive">{error}</span>}</div>;
}
