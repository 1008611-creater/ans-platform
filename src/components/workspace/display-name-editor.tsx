"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 公开展示名（昵称）修改：30 天可改一次，与 username 解耦、不收集真实姓名。
export function DisplayNameEditor({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  async function save() {
    const nickname = value.trim();
    if (nickname.length < 2 || nickname.length > 40) {
      toast.error("昵称需为 2-40 个字符");
      return;
    }
    if (nickname === current) { setOpen(false); return; }
    setSaving(true);
    try {
      // 兼容现有 PATCH 契约：先取回资料再连同昵称一并提交。
      const profileResponse = await fetch("/api/user/profile", { cache: "no-store" });
      if (!profileResponse.ok) throw new Error();
      const profile = await profileResponse.json();
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name ?? nickname,
          username: profile.username,
          nickname,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const retry = Number(response.headers.get("Retry-After") || 0);
        toast.error(`${result.message || "修改失败"}${retry ? `（约 ${Math.ceil(retry / 60)} 分钟后可再次修改）` : ""}`);
        return;
      }
      toast.success("昵称已更新（30 天后可再次修改）");
      setOpen(false);
      window.location.reload();
    } catch {
      toast.error("修改失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" className="ms-2 h-7 gap-1 text-xs text-muted-foreground" onClick={() => setOpen(true)}>
        <Pencil className="h-3 w-3" /> 改昵称
      </Button>
    );
  }

  return (
    <span className="ms-2 inline-flex items-center gap-1.5 align-middle">
      <Input
        value={value}
        maxLength={40}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter") void save(); if (event.key === "Escape") setOpen(false); }}
        className="h-7 w-40 text-sm"
        aria-label="新昵称"
      />
      <Button type="button" size="sm" className="h-7 px-2 text-xs" disabled={saving} onClick={() => void save()}>
        {saving ? "保存中…" : "保存"}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={saving} onClick={() => setOpen(false)}>取消</Button>
    </span>
  );
}