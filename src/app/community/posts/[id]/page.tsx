import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Check, ChevronLeft, ChevronRight, Clock, Trophy } from "lucide-react";
import { auth } from "@/lib/auth";
import { helpVerb } from "@/contracts/community-posts";
import { BOARD_CHANNEL } from "@/server/community/feed";
import { getCommunityPost } from "@/server/community/posts";
import { BOARD_CHIP } from "@/components/community/community-feed";
import { ApplicationList, ApplyForm, ClosePostButton, HelpForm, LikeButton, OfferList, ReplyForm, ReportPost } from "@/components/community/post-actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type Person = { username: string; nickname: string | null; avatar: string | null };

const nameOf = (user: Person) => user.nickname || user.username;

function Avatar({ user, size = "h-8 w-8" }: { user: Person; size?: string }) {
  return user.avatar
    ? <img src={user.avatar} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
    : <span aria-hidden="true" className={`${size} grid shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold`}>{nameOf(user).charAt(0).toUpperCase()}</span>;
}

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const post = await getCommunityPost(id, null).catch(() => null);
  const t = await getTranslations("product.communityPage");
  return { title: `${post?.title || post?.body.slice(0, 30) || t("title")}` };
}

export default async function CommunityPostPage({ params }: { params: Params }) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const post = await getCommunityPost(id, viewerId);
  if (!post) notFound();
  const [t, page, locale] = await Promise.all([getTranslations("product.communityPost.detail"), getTranslations("product.communityPage"), getLocale().catch(() => "zh")]);
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", { month: "short", day: "numeric", timeZone: "Asia/Shanghai" });
  const time = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" });
  const channel = BOARD_CHANNEL[post.board];
  const verb = helpVerb(post.stall);
  const isTeam = post.stall === "TEAM";
  const openRoles = post.vacancies.filter((role) => role.filled < role.slots).map((role) => role.name);
  const isMember = Boolean(viewerId && post.team?.members.some((member) => member.user.id === viewerId));
  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/community/posts/${post.id}`)}`;

  return <div className="ans-product-container ans-page-content space-y-4">
    <Link href={`/community?c=${channel}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" aria-hidden="true" />{page(`channels.${channel}`)}</Link>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <article className="space-y-5 rounded-2xl border bg-card p-5 sm:p-7">
          {post.status === "HIDDEN" && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{t("hiddenNote")}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {post.kind === "STALL" && <span className="rounded-md bg-foreground px-2 py-0.5 text-xs font-bold text-background">{page(`stall.${post.stall ?? "SEEK"}`)}</span>}
            {!(isTeam && post.board === "TEAM") && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BOARD_CHIP[post.board]}`}>{page(`channels.${channel}`)}</span>}
            {post.active && post.expiresAt && <span className="ml-auto flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-4 w-4" aria-hidden="true" />{t(isTeam ? "deadlineTeam" : "deadlineNote", { date: date.format(post.expiresAt) })}</span>}
          </div>
          {post.title && <h1 className="text-2xl font-bold leading-snug tracking-tight sm:text-[26px]">{post.title}</h1>}
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Avatar user={post.author} />
            <Link href={`/@${post.author.username}`} className="font-semibold text-foreground hover:underline">{nameOf(post.author)}</Link>
            <span>{time.format(post.createdAt)}</span>
          </div>
          {post.body && <p className={`whitespace-pre-wrap break-words leading-relaxed ${post.kind === "TEXT" ? "text-xl font-semibold" : "text-[15px] text-foreground/90"}`}>{post.body}</p>}
          {post.images.length > 0 && <div className="grid grid-cols-2 gap-2">{post.images.map((url) => <img key={url} src={url} alt="" referrerPolicy="no-referrer" className="w-full rounded-xl border object-cover" />)}</div>}

          {isTeam && post.vacancies.length > 0 && <section aria-labelledby="roles-heading" className="space-y-2.5">
            <h2 id="roles-heading" className="text-sm font-semibold">{t("roles")}</h2>
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {post.vacancies.map((role) => {
                const left = role.slots - role.filled;
                return <li key={role.name} className={`space-y-0.5 rounded-xl p-3.5 ${left > 0 ? "border-2 border-foreground" : "bg-muted text-muted-foreground"}`}>
                  <p className="text-sm font-semibold">{role.name}</p>
                  <p className="text-xs">{left > 0 ? t("vacancyLeft", { count: left }) : t("roleFull")}</p>
                </li>;
              })}
            </ul>
          </section>}

          {post.competition && <Link href={`/competitions`} className="flex items-center gap-3 rounded-xl border px-4 py-3 hover:bg-muted/60">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"><Trophy className="h-5 w-5" aria-hidden="true" /></span>
            <span className="flex-1 text-sm font-semibold">{post.competition.title}</span>
            <span className="text-sm text-muted-foreground">{t("competitionLink")}</span><ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </Link>}

          {post.status === "RESOLVED" && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
            <Check className="h-4 w-4" aria-hidden="true" />{isTeam ? t("teamFull") : post.helper ? t("resolvedBy", { name: nameOf(post.helper) }) : t("resolved")}
          </p>}
          {post.status !== "RESOLVED" && !post.active && post.kind === "STALL" && <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">{t("closedNote")}</p>}

          <div id="act" className="scroll-mt-24 space-y-3">
            {post.active && !post.isAuthor && (viewerId
              ? isTeam ? !isMember && <ApplyForm postId={post.id} roles={openRoles} application={post.myApplication} />
                : verb && <HelpForm postId={post.id} verb={verb} done={post.myHelpOffer} />
              : (isTeam || verb) && <Button asChild><Link href={loginHref}>{t("loginToAct")}</Link></Button>)}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            {viewerId ? <LikeButton postId={post.id} liked={post.liked} count={post._count.likes} /> : <span className="text-sm text-muted-foreground">{page("likes")} {post._count.likes}</span>}
            <span className="flex-1" />
            {viewerId && !post.isAuthor && <ReportPost postId={post.id} />}
          </div>
        </article>

        <section aria-labelledby="replies-heading" className="space-y-4 rounded-2xl border bg-card p-5 sm:p-7">
          <h2 id="replies-heading" className="text-sm font-semibold">{t("replies", { count: post.replies.length })}</h2>
          <ul className="space-y-4">
            {post.replies.map((reply) => <li key={reply.id} className="flex gap-3">
              <Avatar user={reply.author} />
              <div className="min-w-0 space-y-1">
                <p className="text-sm"><Link href={`/@${reply.author.username}`} className="font-semibold hover:underline">{nameOf(reply.author)}</Link> <span className="ml-1.5 text-xs text-muted-foreground ans-num">{time.format(reply.createdAt)}</span></p>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{reply.body}</p>
              </div>
            </li>)}
          </ul>
          {viewerId ? post.status !== "HIDDEN" && <ReplyForm postId={post.id} /> : <Link href={loginHref} className="text-sm font-semibold hover:underline">{t("loginToAct")}</Link>}
        </section>
      </div>

      <aside className="space-y-4">
        {post.team && <section aria-labelledby="team-heading" className="space-y-3 rounded-2xl border bg-card p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="team-heading" className="text-sm font-semibold">{post.team.name}</h2>
            <span className="text-xs text-muted-foreground">{t("teamMembers", { count: post.team.members.length })}</span>
          </div>
          <ul className="space-y-2.5">
            {post.team.members.map((member) => <li key={member.user.id} className="flex items-center gap-2.5 text-sm">
              <Avatar user={member.user} />
              <span className="flex-1 truncate">{nameOf(member.user)}</span>
              <span className="text-xs text-muted-foreground">{t(`roleNames.${member.role}`)}</span>
            </li>)}
            {post.active && openRoles.map((role) => <li key={role} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full border-2 border-dashed">+</span>{t("waitingRole", { role })}
            </li>)}
          </ul>
        </section>}
        {post.isAuthor && isTeam && <ApplicationList postId={post.id} applications={post.applications} />}
        {post.isAuthor && isTeam && post.active && <ClosePostButton postId={post.id} />}
        {post.isAuthor && verb && <OfferList postId={post.id} verb={verb} offers={post.helpOffers} open={post.active} />}
        {post.isAuthor && post.kind === "STALL" && !isTeam && !verb && post.active && <ClosePostButton postId={post.id} />}
      </aside>
    </div>
  </div>;
}
