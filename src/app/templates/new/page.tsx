import Link from "next/link";
import { TemplateForm } from "@/components/templates/template-form";
import { requireTemplateAuthor, TemplateError } from "@/lib/template-access";
import { templateCategories } from "@/lib/template-service";

export const dynamic = "force-dynamic";
export const metadata = { title: "创建模板草稿 · ANS" };
export default async function NewTemplatePage() {
  try { await requireTemplateAuthor(); } catch (error) {
    if (!(error instanceof TemplateError)) throw error;
    return <div className="container py-10"><h1 className="text-2xl font-bold">创建模板草稿</h1><p className="my-4">{error.message}</p><Link href="/login" className="text-primary underline">前往登录</Link></div>;
  }
  return <div className="container space-y-6 py-10"><Link href="/templates/mine" className="text-sm text-primary">返回我的模板</Link><h1 className="text-3xl font-bold">创建模板草稿</h1><TemplateForm categories={await templateCategories()} /></div>;
}
