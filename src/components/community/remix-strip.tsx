import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { listRemixPosts } from "@/server/community/remix";

/** 项目广场详情页上的「社区里的同款」：附了这个项目的社区笔记，加一个去晒自己同款的入口。 */
export async function RemixStrip({ slug, accountId }: { slug: string; accountId: string | null }) {
  const [{ posts, total }, d] = await Promise.all([listRemixPosts(slug), getTranslations("product.projectDetail")]);
  const shareHref = `/community?project=${encodeURIComponent(slug)}`;
  const href = accountId ? shareHref : `/login?callbackUrl=${encodeURIComponent(shareHref)}`;
  return <section id="remix" aria-labelledby="remix-title" className="mt-12 scroll-mt-24 space-y-5">
    <div className="flex items-center justify-between gap-4">
      <h2 id="remix-title" className="text-2xl font-semibold">{d("remixHeading")}{total > 0 && <span className="ans-num ml-3 text-sm font-normal text-muted-foreground">{d("remixCount", { count: total })}</span>}</h2>
      <Link href={href} className="ans-text-link inline-flex shrink-0 items-center gap-1 text-sm">{d("remixShare")}<ArrowRight size={15} aria-hidden="true" /></Link>
    </div>
    {posts.length === 0
      ? <p className="rounded-xl bg-muted px-5 py-6 text-sm text-muted-foreground">{d("remixEmpty")}</p>
      : <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {posts.map((post) => <li key={post.id}>
          <Link href={`/community/posts/${post.id}`} className="flex h-full flex-col overflow-hidden rounded-xl bg-card shadow-[inset_0_0_0_0.5px_var(--hairline)] transition-colors hover:bg-muted">
            {post.images[0]
              ? <img src={post.images[0]} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-[4/3] w-full object-cover" />
              : <span className="flex aspect-[4/3] items-end bg-muted p-3 text-base font-semibold leading-snug"><span className="line-clamp-3">{post.title || post.body}</span></span>}
            <span className="flex flex-col gap-1 p-3">
              {post.images[0] && <span className="line-clamp-2 text-sm font-semibold leading-snug">{post.title || post.body}</span>}
              <span className="truncate text-xs text-muted-foreground">{post.author.nickname || post.author.username}</span>
            </span>
          </Link>
        </li>)}
      </ul>}
  </section>;
}
