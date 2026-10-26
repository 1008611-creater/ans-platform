import Link from "next/link";
import type { Metadata } from "next";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { getAdminAiConfig, buildPublicAiConfig } from "@/server/admin/ai-config";
import { AiConfigForm } from "@/components/admin/ai-config-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AI 初审配置 · ANS" };

export default async function AdminAiConfigPage() {
  const admin = await requireAdminPermission("PROMPTS_MANAGE");
  if (!admin) return <div className="container py-16"><h1 className="text-2xl font-bold">没有内容管理权限</h1><p className="mt-3 text-muted-foreground">请使用具备初审管理权限的管理员账号访问。</p></div>;
  const config = await getAdminAiConfig();
  return <div className="container max-w-4xl space-y-6 py-10">
    <Link href="/admin" className="text-sm text-primary underline">返回管理后台</Link>
    <header><h1 className="text-3xl font-bold tracking-tight">AI 初审与上游模型</h1><p className="mt-2 text-sm text-muted-foreground">这里的配置同时用于工作流和模板的 AI 初审。修改后只影响后续发起的初审。</p></header>
    <AiConfigForm initialConfig={buildPublicAiConfig(config)} />
  </div>;
}
