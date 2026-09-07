"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, KeyRound, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Resolver } from "react-hook-form";

const createSchema = z.object({
  maxUses: z.coerce.number().int().min(1, "至少 1 次").max(100, "最多 100 次"),
  expiresDays: z.coerce.number().int().min(1, "至少 1 天").max(365, "最多 365 天"),
});
type CreateValues = z.infer<typeof createSchema>;
type ResolverContext = Record<string, unknown>;
// zod v4 input/output 分离：显式声明 Resolver 输入输出均为 CreateValues。
const createResolver = zodResolver(createSchema) as Resolver<CreateValues, ResolverContext, CreateValues>;

type InviteItem = {
  id: string;
  code: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
  creator?: { nickname?: string | null; username?: string | null; email?: string | null };
  redemptions?: { id: string; usedAt: string; usedBy?: { nickname?: string | null; username?: string | null; email?: string | null } }[];
};
type RedemptionItem = {
  id: string;
  usedAt: string;
  usedBy?: { nickname?: string | null; username?: string | null; email?: string | null };
  code?: { code: string; creator?: { nickname?: string | null; username?: string | null } };
};
type ListResponse = { view: "invites" | "redemptions"; items: InviteItem[] | RedemptionItem[]; total: number; page: number; totalPages: number };

function displayName(item: { nickname?: string | null; username?: string | null; email?: string | null } | undefined) {
  if (!item) return "已注销";
  return item.nickname ?? item.username ?? item.email ?? "已注销";
}

export function InvitesManagement() {
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const form = useForm<CreateValues, ResolverContext, CreateValues>({ resolver: createResolver, defaultValues: { maxUses: 5, expiresDays: 30 } });

  const load = useCallback(async (view: "invites" | "redemptions" = "invites", page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/invites?view=${view}&page=${page}`, { cache: "no-store" });
      if (!response.ok) throw new Error("加载失败");
      setList(await response.json());
    } catch {
      toast.error("邀请记录加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load("invites"); }, [load]);

  async function onCreate(values: CreateValues) {
    setCreating(true);
    try {
      const response = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.message || "生成失败");
        return;
      }
      toast.success(`邀请码 ${result.code} 已生成`);
      void load("invites");
    } catch {
      toast.error("生成失败，请重试");
    } finally {
      setCreating(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`已复制 ${code}`);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  }

  const expiresText = (expiresAt: string | null) => {
    if (!expiresAt) return "永不过期";
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "已过期";
    return `${Math.ceil(diff / 86400000)} 天后过期`;
  };

  const items = list?.items ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" /> 生成邀请码</CardTitle>
          <CardDescription className="text-xs">邀请码仅管理员可生成与审计；非 cau.edu.cn 邮箱注册时必填，单码默认可用 5 次、30 天有效。</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
              <FormField control={form.control} name="maxUses" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">单码可用次数（1-100）</FormLabel>
                  <FormControl><Input type="number" min={1} max={100} {...field} className="h-8 text-sm" /></FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
              <FormField control={form.control} name="expiresDays" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">有效期（1-365 天）</FormLabel>
                  <FormControl><Input type="number" min={1} max={365} {...field} className="h-8 text-sm" /></FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
              <Button type="submit" className="w-full h-8 text-sm" disabled={creating}>
                {creating ? "生成中…" : "生成邀请码"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> 邀请关系审计</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="invites" onValueChange={(v) => void load(v as "invites" | "redemptions")}>
            <TabsList>
              <TabsTrigger value="invites">邀请码</TabsTrigger>
              <TabsTrigger value="redemptions">核销明细</TabsTrigger>
            </TabsList>

            <TabsContent value="invites" className="space-y-2 pt-3">
              {loading && <p className="text-sm text-muted-foreground">加载中…</p>}
              {!loading && items.length === 0 && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">暂无邀请码。</p>}
              {!loading && (items as InviteItem[]).map((invite) => (
                <div key={invite.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-base font-semibold">{invite.code}</span>
                    <span className="text-xs text-muted-foreground">已用 {invite.usedCount}/{invite.maxUses} · {expiresText(invite.expiresAt)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>创建：{displayName(invite.creator)}（{new Date(invite.createdAt).toLocaleString("zh-CN")}）</span>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => void copyCode(invite.code)}><Copy className="mr-1 h-3 w-3" />复制</Button>
                  </div>
                  {invite.redemptions && invite.redemptions.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t pt-2 text-xs">
                      {invite.redemptions.map((r) => (
                        <li key={r.id} className="flex justify-between gap-2 text-muted-foreground">
                          <span>{displayName(r.usedBy)}</span>
                          <span>{new Date(r.usedAt).toLocaleString("zh-CN")}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="redemptions" className="space-y-2 pt-3">
              {loading && <p className="text-sm text-muted-foreground">加载中…</p>}
              {!loading && items.length === 0 && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">暂无核销记录。</p>}
              {!loading && (items as RedemptionItem[]).map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <span>{displayName(r.usedBy)} 使用了 <span className="font-mono">{r.code?.code}</span></span>
                  <span className="text-xs text-muted-foreground">{new Date(r.usedAt).toLocaleString("zh-CN")}</span>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          {list && list.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-muted-foreground">共 {list.total} 条 · 第 {list.page}/{list.totalPages} 页</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" disabled={list.page <= 1} onClick={() => void load(list.view, list.page - 1)}>上一页</Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" disabled={list.page >= list.totalPages} onClick={() => void load(list.view, list.page + 1)}>下一页</Button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void load(list?.view ?? "invites")}><RefreshCw className="mr-1 h-3 w-3" />刷新</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}