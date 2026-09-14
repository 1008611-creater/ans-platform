"use client";

import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TemplateFavoriteButton({ slug }: { slug: string }) {
  const [favorited, setFavorited] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/templates/" + encodeURIComponent(slug) + "/favorite", { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (response.ok) {
          const data = await response.json();
          setFavorited(Boolean(data.favorited));
        } else if (response.status !== 401) {
          setMessage("收藏状态读取失败");
        }
      })
      .catch(() => {
        if (active) setMessage("收藏状态读取失败");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  async function toggle() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/templates/" + encodeURIComponent(slug) + "/favorite", {
        method: favorited ? "DELETE" : "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || (response.status === 401 ? "请先登录" : "操作失败"));
      setFavorited(Boolean(data.favorited));
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant={favorited ? "default" : "outline"} size="sm" disabled={busy} onClick={toggle} aria-pressed={favorited}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Heart className="mr-2 h-4 w-4" fill={favorited ? "currentColor" : "none"} />}
        {favorited ? "已收藏" : "收藏"}
      </Button>
      {message && <span className="text-xs text-destructive">{message}</span>}
    </div>
  );
}
