import { getLocale, getTranslations } from "next-intl/server";
import { FolderKanban, Heart, Users, Zap } from "lucide-react";
import { WorkspaceLink as Link } from "@/components/providers/workspace-navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Account = { name?: string | null; username: string; image?: string | null };

const SHORTCUTS = [
  { href: "/projects", key: "projects", icon: FolderKanban },
  { href: "/teams", key: "teams", icon: Users },
  { href: "/collection", key: "favorites", icon: Heart },
  { href: "/workspace/models", key: "models", icon: Zap },
] as const;

/** Phones open the credits page as their "me" page: who you are, what you can spend, and where your things live. */
export async function MobileAccountCard({ account, availablePoints }: { account: Account; availablePoints: number }) {
  const [t, locale] = await Promise.all([getTranslations("hubs.me"), getLocale()]);
  const points = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(availablePoints);
  return <section aria-labelledby="mobile-account-name" className="space-y-3 md:hidden">
    <div className="rounded-[24px] bg-card p-4 shadow-[inset_0_0_0_0.5px_var(--hairline)]">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={account.image || undefined} alt="" />
          <AvatarFallback>{(account.name || account.username).charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 id="mobile-account-name" className="truncate text-base font-semibold">{account.name || account.username}</h2>
          <p className="truncate text-xs text-muted-foreground">@{account.username}</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{t("available")}</p>
      <p className="text-xl font-semibold tabular-nums">{points}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link href="/workspace/benefits" className="flex min-h-11 items-center justify-center rounded-[8px] bg-muted text-sm font-medium active:scale-[0.97] motion-reduce:transform-none">{t("claim")}</Link>
        <a href="#credit-ledger-heading" className="flex min-h-11 items-center justify-center rounded-[8px] bg-muted text-sm font-medium active:scale-[0.97] motion-reduce:transform-none">{t("ledger")}</a>
      </div>
    </div>
    <nav aria-label={t("shortcuts")} className="grid grid-cols-2 gap-3">
      {SHORTCUTS.map(({ href, key, icon: Icon }) => <Link key={href} href={href} className="flex min-h-20 flex-col justify-between rounded-[20px] bg-card p-4 text-sm font-medium shadow-[inset_0_0_0_0.5px_var(--hairline)] active:bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        {t(key)}
      </Link>)}
    </nav>
  </section>;
}
