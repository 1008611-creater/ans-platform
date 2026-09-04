"use client";

import { useCallback, useEffect, useState } from "react";
import { ArchiveRestore, History, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
  actor: { username: string; name: string | null } | null;
}

interface RecycleItem {
  id: string;
  title?: string;
  type?: string;
  slug?: string | null;
  username?: string;
  name?: string | null;
  email?: string;
  role?: string;
  deletedAt: string;
  author?: { username: string; name: string | null };
}

export function GovernanceManagement() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingRecycle, setLoadingRecycle] = useState(false);
  const [recycleType, setRecycleType] = useState<"PROMPT" | "SKILL" | "USER">("PROMPT");
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/admin/audit-logs?limit=50");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载审计日志失败");
      setLogs(data.logs);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载审计日志失败");
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const fetchRecycle = useCallback(async () => {
    setLoadingRecycle(true);
    try {
      const res = await fetch(`/api/admin/recycle-bin?limit=50&type=${recycleType}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载回收站失败");
      setItems(data.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载回收站失败");
    } finally {
      setLoadingRecycle(false);
    }
  }, [recycleType]);

  useEffect(() => {
    fetchLogs();
    fetchRecycle();
  }, [fetchLogs, fetchRecycle]);

  const restore = async (item: RecycleItem) => {
    setRestoring(item.id);
    try {
      const res = await fetch("/api/admin/recycle-bin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, type: recycleType === "USER" ? "USER" : "PROMPT" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "恢复失败");
      toast.success("内容已恢复");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      fetchLogs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "恢复失败");
    } finally {
      setRestoring(null);
    }
  };

  return (
    <Tabs defaultValue="recycle" className="space-y-4">
      <TabsList>
        <TabsTrigger value="recycle" className="gap-2"><ArchiveRestore className="h-4 w-4" />回收站</TabsTrigger>
        <TabsTrigger value="audit" className="gap-2"><History className="h-4 w-4" />审计日志</TabsTrigger>
      </TabsList>
      <TabsContent value="recycle">
        <Card>
          <CardHeader>
            <CardTitle>回收站</CardTitle>
            <p className="text-sm text-muted-foreground">已删除的 Prompt 和 Skill 会保留在这里，可恢复；当前不提供不可逆永久删除。</p>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              {(["PROMPT", "SKILL", "USER"] as const).map((value) => (
                <Button key={value} size="sm" variant={recycleType === value ? "default" : "outline"} onClick={() => setRecycleType(value)}>
                  {value === "PROMPT" ? "Prompt" : value === "SKILL" ? "Skill" : "用户"}
                </Button>
              ))}
            </div>
            {loadingRecycle ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : items.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">回收站为空</p> : <div className="space-y-2">{items.map((item) => {
              const label = recycleType === "USER" ? (item.name || item.username || item.email || item.id) : (item.title || item.id);
              const owner = recycleType === "USER" ? item.email : item.author ? `作者 @${item.author.username}` : "";
              return <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate font-medium">{label}</span><Badge variant="outline">{recycleType === "USER" ? "用户" : item.type === "SKILL" ? "Skill" : "Prompt"}</Badge></div><p className="text-xs text-muted-foreground">{owner}{owner ? " · " : ""}删除于 {new Date(item.deletedAt).toLocaleString()}</p></div><Button size="sm" variant="outline" onClick={() => restore(item)} disabled={restoring === item.id}>{restoring === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}恢复</Button></div>;
            })}</div>}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="audit">
        <Card>
          <CardHeader>
            <CardTitle>审计日志</CardTitle>
            <p className="text-sm text-muted-foreground">记录管理员对用户、Prompt、Skill、举报和回收站的关键操作。</p>
          </CardHeader>
          <CardContent>
            {loadingLogs ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : logs.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">暂无审计记录</p> : <div className="space-y-2">{logs.map((log) => <div key={log.id} className="rounded-lg border p-3"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{log.action}</Badge><Badge variant="outline">{log.resourceType}</Badge><span className="text-sm">{log.actor ? `@${log.actor.username}` : "系统"}</span><span className="ml-auto text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span></div>{log.resourceId && <p className="mt-1 text-xs text-muted-foreground">资源：{log.resourceId}</p>}</div>)}</div>}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
