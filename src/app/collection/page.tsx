import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FavoriteListItem } from "@/components/favorites/favorite-list-item";
import { auth } from "@/lib/auth";
import { listFavorites } from "@/server/favorites/service";

export const dynamic = "force-dynamic";
export async function generateMetadata() { const t = await getTranslations("favorites"); return { title: `${t("title")} · ANS`, description: t("description") }; }
export default async function CollectionPage() {
  const session = await auth(); const accountId = session?.user?.id; const t = await getTranslations("favorites");
  if (!accountId) return <div className="container max-w-2xl space-y-4 py-16"><h1 className="text-2xl font-bold">{t("title")}</h1><p className="text-muted-foreground">{t("loginNote")}</p><Link href="/login?callbackUrl=%2Fcollection" className="text-sm text-primary underline">{t("login")}</Link></div>;
  const favorites = await listFavorites(accountId, 100, undefined, await getLocale());
  return <div className="ans-product-shell"><div className="ans-product-container max-w-4xl space-y-8 py-10 sm:py-14"><header className="space-y-3"><p className="ans-eyebrow">ANS / COLLECTION</p><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl"><Bookmark className="h-7 w-7" aria-hidden="true" />{t("title")}</h1><p className="text-sm leading-7 text-muted-foreground">{t("description")}</p></header>{favorites.length === 0 ? <div className="space-y-6 rounded-2xl border border-dashed p-8 text-center sm:p-12"><p className="text-muted-foreground">{t("empty")}</p><div className="flex flex-wrap justify-center gap-3"><Button asChild className="rounded-full"><Link href="/explore">{t("explore")}</Link></Button><Button asChild variant="outline" className="rounded-full"><Link href="/hubs">{t("hubs")}</Link></Button></div></div> : <div className="space-y-4">{favorites.map(favorite => <FavoriteListItem key={`${accountId}:${favorite.targetType}:${favorite.targetId}`} accountId={accountId} {...favorite} />)}</div>}</div></div>;
}
