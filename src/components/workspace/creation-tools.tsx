import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FolderOpen, Users, Store, ReceiptText, Film, GitBranch } from "lucide-react";

export async function CreationTools() {
  const t = await getTranslations("product");
  const w = await getTranslations("product.workspace");
  const links = [
    { href: "/workspace/models", note: "DeepSeek / Qwen / 视觉模型零配置在线对话演练", label: "⚡ 模型广场与在线演练", icon: GitBranch, primary: true },
    { href: "/market/resume-website", note: "交互式 3D 角色与双语个人作品集即开即改", label: "🎨 3D 个人网站工作坊", icon: Store, primary: true },
    { href: "/workflows/hypit", note: "AI 创意视频制作与脚本生成工作台", label: "🎬 Hypit 视频工作台", icon: Film },
    { href: "https://toonflow.cauai.fun", note: "小说转分镜与 AI 漫剧独立创作站（直达）", label: "🎭 Toonflow 短剧工坊 ↗", icon: Film, external: true },
    { href: "/vibe-hub", note: "全栈 AI 编程教程、提示词与实战路线图", label: "📚 VibeHub 知识库", icon: FolderOpen },
    { href: "/workspace/benefits", note: "免费领 100~150 积分与 3D 抓娃娃体验", label: "🎁 3D 抓娃娃与算力福利", icon: Store },
    { href: "/market", note: w("toolNotes.market"), label: t("market.browse"), icon: Store },
    { href: "/teams", note: w("toolNotes.teams"), label: t("teamEntry"), icon: Users },
    { href: "/explore/submit", note: w("toolNotes.submit"), label: t("realProject.submit"), icon: FolderOpen },
    { href: "/projects", note: w("toolNotes.projects"), label: t("myProjects"), icon: FolderOpen },
    { href: "/market/orders", note: w("toolNotes.orders"), label: t("market.orders"), icon: ReceiptText },
    { href: "/market/creator", note: w("toolNotes.uploads"), label: t("realProject.myUploads"), icon: FolderOpen },
  ];
  return <section className="ans-creation-tools"><h2 className="text-xl font-semibold">{w("toolsQuestion")}</h2><div className="ans-tool-grid">{links.map(({ href, label, note, icon: Icon, primary, external }) => {
    const inner = <div className="flex w-full items-start gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-foreground">{label}</div><p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{note}</p></div></div>;
    return external ? <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="ans-tool-link h-full">{inner}</a> : <Link key={href} href={href} data-primary={primary || undefined} className="ans-tool-link h-full">{inner}</Link>;
  })}</div></section>;
}
