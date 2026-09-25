import Link from "next/link";
import type { Metadata } from "next";
import { Bookmark, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FavoriteListItem } from "@/components/favorites/favorite-list-item";
import { auth } from "@/lib/auth";
import { listFavorites } from "@/server/favorites/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "我的收藏 · ANS",
  description: "把提示词、模板和工作流收藏到一处，下次直接运行。",
};

/**
 * 统一收藏页。
 *
 * Prompt、模板、工作流共用一张收藏表，所以这里能一次看全三类内容。
 * 已下架或不再公开的对象会被服务层过滤掉，避免收藏夹里出现死链。
 */
export default async function CollectionPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="container max-w-2xl space-y-4 py-16">
        <h1 className="text-2xl font-bold">我的收藏</h1>
        <p className="text-muted-foreground">查看收藏需要先登录。</p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent("/collection")}`}
          className="text-sm text-primary underline"
        >
          前往登录
        </Link>
      </div>
    );
  }

  const favorites = await listFavorites(session.user.id);

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Bookmark className="h-6 w-6" /> 我的收藏
        </h1>
        <p className="text-sm text-muted-foreground">
          提示词、模板和工作流的收藏都在这里，按收藏时间倒序。已下架的内容会自动从列表消失。
        </p>
      </header>

      {favorites.length === 0 ? (
        <div className="space-y-4 rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground">还没有收藏。看到好用的能力，点一下「收藏」就会出现在这里。</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/prompts">浏览提示词</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/templates">浏览模板</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/workflows">
                <Compass className="me-1.5 h-3.5 w-3.5" />
                浏览工作流
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {favorites.map((favorite) => (
            <FavoriteListItem
              key={`${favorite.targetType}:${favorite.targetId}`}
              targetType={favorite.targetType}
              targetId={favorite.targetId}
              title={favorite.title}
              href={favorite.href}
              subtitle={favorite.subtitle}
              authorName={favorite.authorName}
              costPoints={favorite.costPoints}
            />
          ))}
        </div>
      )}
    </div>
  );
}
