"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Category = { id: string; name: string; children: { id: string; name: string }[] };
type Draft = { id: string; title: string; summary: string | null; description: string | null; categoryId: string | null; promptBody: string; formSchema: unknown; outputType: string };
export function TemplateForm({ categories, template }: { categories: Category[]; template?: Draft }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const fields = new FormData(event.currentTarget);
      let formSchema: unknown;
      try { formSchema = JSON.parse(String(fields.get("formSchema"))); } catch { throw new Error("输入表单必须是有效的 JSON 数组"); }
      const response = await fetch(template ? `/api/templates/${template.id}` : "/api/templates", {
        method: template ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fields.get("title"), summary: fields.get("summary"), description: fields.get("description"),
          categoryId: fields.get("categoryId") || null, promptBody: fields.get("promptBody"), outputType: fields.get("outputType"), formSchema,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存失败");
      router.push("/templates/mine"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "保存失败，请稍后重试"); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="max-w-3xl space-y-5">
    <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">保存后为私人草稿。在“我的模板”提交后正文将冻结，需经过 AI 初审和管理员复核。不限等级。</p>
    <label className="block space-y-2 text-sm font-medium">模板标题<Input name="title" required minLength={2} maxLength={120} defaultValue={template?.title} /></label>
    <label className="block space-y-2 text-sm font-medium">简短摘要<Input name="summary" maxLength={300} defaultValue={template?.summary ?? ""} /></label>
    <label className="block space-y-2 text-sm font-medium">使用说明<Textarea name="description" rows={4} maxLength={8000} defaultValue={template?.description ?? ""} /></label>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="block space-y-2 text-sm font-medium">领域 / 场景
        <select name="categoryId" defaultValue={template?.categoryId ?? ""} className="block w-full rounded-md border bg-background p-2">
          <option value="">未分类</option>
          {categories.map((domain) => <optgroup key={domain.id} label={domain.name}>
            <option value={domain.id}>{domain.name} / 通用</option>
            {domain.children.map((scene) => <option key={scene.id} value={scene.id}>{domain.name} / {scene.name}</option>)}
          </optgroup>)}
        </select>
      </label>
      <label className="block space-y-2 text-sm font-medium">输出类型
        <select name="outputType" defaultValue={template?.outputType ?? "TEXT"} className="block w-full rounded-md border bg-background p-2">
          <option value="TEXT">文本</option><option value="IMAGE">图像</option><option value="VIDEO">视频</option><option value="AUDIO">音频</option>
        </select>
      </label>
    </div>
    <label className="block space-y-2 text-sm font-medium">提示词正文<Textarea name="promptBody" required minLength={10} maxLength={30000} rows={12} defaultValue={template?.promptBody} placeholder="写出完整提示词，可使用 {{text}} 等变量占位。" /></label>
    <label className="block space-y-2 text-sm font-medium">输入表单（JSON）<Textarea name="formSchema" required rows={5} className="font-mono text-sm" defaultValue={JSON.stringify(template?.formSchema ?? [], null, 2)} /></label>
    <p className="text-xs text-muted-foreground">无变量时保留 []。示例：{`[{"key":"text","label":"原文","type":"textarea","required":true}]`}。type 支持 text、textarea、number、select。</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={busy}>{busy ? "正在保存…" : "保存草稿"}</Button>
  </form>;
}
