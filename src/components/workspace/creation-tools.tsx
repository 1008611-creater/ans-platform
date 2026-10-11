import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FolderOpen, GitBranch, Film, Users, Store, ReceiptText } from "lucide-react";

export async function CreationTools() {
  const t = await getTranslations("product");
  const links = [{ href: "/explore/submit", label: t("realProject.submit"), icon: Store }, { href: "/market/creator", label: t("realProject.myUploads"), icon: FolderOpen }, { href: "/projects", label: t("myProjects"), icon: FolderOpen }, { href: "/workflows", label: t("nav.workflows"), icon: GitBranch }, { href: "/workflows/toonflow", label: t("toonflow.title"), icon: Film }, { href: "/teams", label: t("teamEntry"), icon: Users }, { href: "/market", label: t("market.browse"), icon: Store }, { href: "/market/orders", label: t("market.orders"), icon: ReceiptText }];
  return <section className="mb-10"><h2 className="text-xl font-semibold">{t("workspaceTools")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("workspaceToolsBody")}</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex min-h-20 items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"><Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><span className="text-sm font-medium">{label}</span></Link>)}</div></section>;
}
