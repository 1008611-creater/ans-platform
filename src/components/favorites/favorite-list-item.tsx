"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { favoriteTargetLabels, type FavoriteTargetType } from "@/contracts/favorites";

/**
 * 收藏列表里的一条。
 *
 * 移除按钮直接调用统一收藏接口；成功后本地把这条从列表里摘掉并刷新，
 * 让「取消收藏」在长列表里也有即时反馈。
 */
export function FavoriteListItem({
  targetType,
  targetId,
  title,
  href,
  subtitle,
  authorName,
  costPoints,
}: {
  targetType: FavoriteTargetType;
  targetId: string;
  title: string;
  href: string;
  subtitle: string | null;
  authorName: string | null;
  costPoints: number | null;
}) {
  const router = useRouter();
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/favorites?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? "移除失败，请稍后重试。");
      }
      setRemoved(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "移除失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  if (removed) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-sm text-muted-foreground">
          已从收藏中移除「{title}」。
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">
            <Link href={href} className="hover:underline">
              {title}
            </Link>
          </CardTitle>
          <Badge variant="secondary">{favoriteTargetLabels[targetType]}</Badge>
        </div>
        {subtitle ? <p className="line-clamp-2 text-sm text-muted-foreground">{subtitle}</p> : null}
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {authorName && <span>{authorName}</span>}
          {costPoints !== null && <Badge variant="outline">{Math.max(1, costPoints)} 点/次</Badge>}
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <span role="alert" className="text-xs text-destructive">
              {error}
            </span>
          )}
          <Button variant="ghost" size="sm" disabled={busy} onClick={remove}>
            {busy ? (
              <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="me-1.5 h-3.5 w-3.5" />
            )}
            取消收藏
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
