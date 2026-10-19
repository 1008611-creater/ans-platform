import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RevealDetails } from "@/components/catalog/reveal-details";
import { FolderOpen, Users, Store, ReceiptText, Film, GitBranch } from "lucide-react";

export async function CreationTools() {
  const t = await getTranslations("product");
  const w = await getTranslations("product.workspace");
  const easel = await getTranslations("easel");
  const links = [
    { href: "/workflows/mine", note: w("toolNotes.workflows"), label: t("myWorkflows"), icon: GitBranch },
    { href: "https://hb.cauai.fun/", note: w("toolNotes.toonflow"), label: t("toonflow.title"), icon: Film, external: true },
    { href: "/workflows/easel", note: w("toolNotes.easel"), label: easel("title"), icon: Store },
    { href: "/explore/submit", note: w("toolNotes.submit"), label: t("realProject.submit"), icon: Store },
    { href: "/market/creator", note: w("toolNotes.uploads"), label: t("realProject.myUploads"), icon: FolderOpen },
    { href: "/projects", note: w("toolNotes.projects"), label: t("myProjects"), icon: FolderOpen },
    { href: "/teams", note: w("toolNotes.teams"), label: t("teamEntry"), icon: Users },
    { href: "/market", note: w("toolNotes.market"), label: t("market.browse"), icon: Store },
    { href: "/market/orders", note: w("toolNotes.orders"), label: t("market.orders"), icon: ReceiptText },
  ];
  return (
    <section className="ans-creation-tools">
      <h2 className="text-xl font-semibold">{w("toolsQuestion")}</h2>
      <div className="ans-tool-grid">
        {links.map(({ href, label, note, icon: Icon, external }) => {
          const detailsId = "workspace-tool-" + href.replace(/^https?:\/\//, "").replace(/^\/+/, "").replaceAll(/[^a-zA-Z0-9_-]/g, "-");
          return (
            <RevealDetails key={href} id={detailsId} label={t("catalogBrowse.info", { title: label })} details={<p>{note}</p>}>
              {external ? (
                <a href={href} target="_blank" rel="noopener noreferrer" aria-describedby={detailsId} className="ans-tool-link h-full" style={{ paddingInlineEnd: "4rem" }}>
                  <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 text-sm font-medium">{label}</span>
                </a>
              ) : (
                <Link href={href} aria-describedby={detailsId} data-primary={href === "/projects" || undefined} className="ans-tool-link h-full" style={{ paddingInlineEnd: "4rem" }}>
                  <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 text-sm font-medium">{label}</span>
                </Link>
              )}
            </RevealDetails>
          );
        })}
      </div>
    </section>
  );
}
