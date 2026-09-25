"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { analyticsFavorite } from "@/lib/analytics";
import type { FavoriteTargetType } from "@/contracts/favorites";

/**
 * 统一收藏按钮：Prompt / 模板 / 工作流共用。
 * 未登录时引导到登录页并带上回跳地址，避免用户丢失当前上下文。
 */
export function FavoriteButton({
  targetType,
  targetId,
  initialFavorited,
  size = "sm",
  variant = "outline",
  className,
}: {
  targetType: FavoriteTargetType;
  targetId: string;
  initialFavorited: boolean;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "outline" | "ghost" | "default" | "secondary";
  className?: string;
}) {
  const router = useRouter();
  const { status } = useSession();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    setError("");
    const next = !favorited;
    setFavorited(next);
    try {
      const response = await fetch(
        next
          ? "/api/favorites"
          : `/api/favorites?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`,
        next
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ targetType, targetId }),
            }
          : { method: "DELETE" },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error?.message ?? "收藏操作失败，请稍后重试");
      }
      if (next) analyticsFavorite.add(targetType, targetId);
      else analyticsFavorite.remove(targetType, targetId);
      startTransition(() => router.refresh());
    } catch (cause) {
      setFavorited(!next);
      setError(cause instanceof Error ? cause.message : "收藏操作失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  const Icon = favorited ? BookmarkCheck : Bookmark;

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <Button
        type="button"
        size={size}
        variant={favorited ? "default" : variant}
        disabled={busy || pending}
        onClick={toggle}
        aria-pressed={favorited}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
        {favorited ? "已收藏" : "收藏"}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
