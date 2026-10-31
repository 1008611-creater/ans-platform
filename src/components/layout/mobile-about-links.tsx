import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { WorkspaceLink as Link } from "@/components/providers/workspace-navigation";

/** Phones hide the web footer, so its links live at the bottom of the workspace tab. */
export async function MobileAboutLinks() {
  const [hub, footer] = await Promise.all([getTranslations("hubs"), getTranslations("footer")]);
  const links = [
    { href: "/app", label: hub("mobileApp"), className: "ans-app-install-link" },
    { href: "/privacy", label: footer("privacy") },
    { href: "/terms", label: footer("terms") },
    { href: "/support", label: footer("support") },
    { href: "https://github.com/1008611-creater/ans-platform", label: "GitHub", external: true },
  ];
  return <nav aria-labelledby="mobile-about-heading" className="mt-6 md:hidden">
    <h2 id="mobile-about-heading" className="px-1 pb-2 text-xs font-medium text-muted-foreground">{hub("aboutHelp")}</h2>
    <ul className="overflow-hidden rounded-2xl bg-card shadow-[inset_0_0_0_0.5px_var(--hairline)]">
      {links.map(link => <li key={link.href} className={link.className}>
        <Link href={link.href} {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="flex min-h-12 items-center justify-between px-4 text-sm active:bg-muted">
          {link.label}
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </Link>
      </li>)}
    </ul>
  </nav>;
}
