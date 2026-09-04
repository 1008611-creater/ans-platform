"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw, Search, Loader2, ExternalLink, EyeOff, ListPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Skill {
  id: string;
  title: string;
  titleZh: string | null;
  titleEn: string | null;
  description: string | null;
  slug: string | null;
  isPrivate: boolean;
  isUnlisted: boolean;
  deletedAt: string | null;
  updatedAt: string;
  author: { username: string; name: string | null };
}

export function SkillsManagement() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [search, setSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50", ...(search && { search }), ...(includeDeleted && { includeDeleted: "true" }) });
      const res = await fetch(`/api/admin/skills?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载 Skill 失败");
      setSkills(data.skills);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载 Skill 失败");
    } finally {
      setLoading(false);
    }
  }, [includeDeleted, search]);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  const updateSkill = async (skill: Skill, action: "restore" | "unlist" | "relist") => {
    try {
      const res = await fetch(`/api/admin/skills/${skill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("操作失败");
      toast.success(action === "restore" ? "Skill 已恢复" : action === "unlist" ? "Skill 已下架" : "Skill 已重新上架");
      fetchSkills();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Skill 管理</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">独立查看、下架和恢复 Agent Skill，不与普通提示词混在一起。</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} />
            显示回收站
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索 Skill 标题或描述..." onKeyDown={(e) => e.key === "Enter" && fetchSkills()} />
          </div>
          <Button variant="outline" onClick={fetchSkills} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "搜索"}</Button>
        </div>
        {skills.length === 0 ? <div className="py-10 text-center text-sm text-muted-foreground">暂无 Skill</div> : (
          <div className="space-y-2">
            {skills.map((skill) => (
              <div key={skill.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{skill.titleZh || skill.title}</span>
                    {skill.titleEn && <span className="text-sm text-muted-foreground">/ {skill.titleEn}</span>}
                    {skill.deletedAt && <Badge variant="destructive">已删除</Badge>}
                    {skill.isUnlisted && !skill.deletedAt && <Badge variant="outline">已下架</Badge>}
                    {skill.isPrivate && <Badge variant="secondary">私密</Badge>}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{skill.description || "无描述"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">作者 @{skill.author.username} · 更新于 {new Date(skill.updatedAt).toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!skill.deletedAt && <Link href={`/prompts/${skill.id}`} prefetch={false}><Button size="icon" variant="ghost" title="查看"><ExternalLink className="h-4 w-4" /></Button></Link>}
                  {skill.deletedAt ? <Button size="icon" variant="ghost" title="恢复" onClick={() => updateSkill(skill, "restore")}><RotateCcw className="h-4 w-4" /></Button> : skill.isUnlisted ? <Button size="icon" variant="ghost" title="重新上架" onClick={() => updateSkill(skill, "relist")}><ListPlus className="h-4 w-4" /></Button> : <Button size="icon" variant="ghost" title="下架" onClick={() => updateSkill(skill, "unlist")}><EyeOff className="h-4 w-4" /></Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
