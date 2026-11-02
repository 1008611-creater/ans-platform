"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BadgeCheck, Check, Flag, Heart, Pin, PinOff } from "lucide-react";
import { toast } from "sonner";
import { COMMUNITY_REPORT_REASONS, HELP_REWARD_XP } from "@/contracts/community-posts";
import { Button } from "@/components/ui/button";
import { useCommunityRequest } from "./use-community-request";
import { imeSubmitGuard } from "@/lib/ui/ime-enter-guard";

const FIELD = "h-10 w-full rounded-lg bg-card px-3 text-sm outline-none shadow-[inset_0_0_0_0.5px_var(--hairline)] transition-shadow focus-visible:shadow-[inset_0_0_0_0.5px_var(--hairline),var(--focus-ring)]";
type Person = { id: string; username: string; nickname: string | null; avatar: string | null };
const nameOf = (user: Person) => user.nickname || user.username;

function usePostAction(postId: string) {
  const { send, pending } = useCommunityRequest();
  return { pending, run: <T extends Record<string, unknown>>(body: Record<string, unknown>) => send<T>(`/api/community/posts/${postId}`, body) };
}

export function LikeButton({ postId, liked, count }: { postId: string; liked: boolean; count: number }) {
  const t = useTranslations("product.communityPost.detail");
  const { run, pending } = usePostAction(postId);
  // 点赞用欠阻尼弹簧微弹一下（key 随状态变化，重新挂载才会重播动画）。
  return <Button type="button" variant="outline" size="sm" aria-pressed={liked} disabled={pending} onClick={() => void run({ action: "like" })}>
    <Heart key={String(liked)} className={`h-4 w-4 ${liked ? "ans-pop fill-current text-rose-600" : ""}`} aria-hidden="true" /><span className="ans-num">{count}</span><span className="sr-only"> {liked ? t("unlike") : t("like")}</span>
  </Button>;
}

export function ReplyForm({ postId }: { postId: string }) {
  const t = useTranslations("product.communityPost.detail");
  const { run, pending } = usePostAction(postId);
  const id = useId();
  const [body, setBody] = useState("");
  return <form className="flex gap-2" onSubmit={async (event) => { event.preventDefault(); if (body.trim() && await run({ action: "reply", body })) setBody(""); }}>
    <label htmlFor={id} className="sr-only">{t("replyLabel")}</label>
    <input onKeyDown={imeSubmitGuard} id={id} value={body} maxLength={1000} placeholder={t("replyPlaceholder")} onChange={(event) => setBody(event.target.value)} className={FIELD} />
    <Button type="submit" variant="outline" disabled={pending || !body.trim()}>{t("send")}</Button>
  </form>;
}

export function HelpForm({ postId, verb, done }: { postId: string; verb: "help" | "want"; done: boolean }) {
  const t = useTranslations("product.communityPost.detail");
  const { run, pending } = usePostAction(postId);
  const id = useId();
  const [message, setMessage] = useState("");
  if (done) return <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"><Check className="h-4 w-4" aria-hidden="true" />{t(verb === "want" ? "wantDone" : "helpDone")}</p>;
  return <form className="flex flex-col gap-2 rounded-xl bg-muted p-4 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); void run({ action: "help", message: message || undefined }); }}>
    <div className="flex flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">{t("helpMessage")}</label>
      <input onKeyDown={imeSubmitGuard} id={id} value={message} maxLength={200} onChange={(event) => setMessage(event.target.value)} className={FIELD} />
    </div>
    <Button type="submit" disabled={pending}>{t(verb === "want" ? "wantSubmit" : "helpSubmit")}</Button>
    {verb === "help" && <p className="text-xs text-muted-foreground text-pretty sm:basis-full">{t("helpHint", { xp: HELP_REWARD_XP })}</p>}
  </form>;
}

export function ApplyForm({ postId, roles, application }: { postId: string; roles: string[]; application: { role: string; status: string } | null }) {
  const t = useTranslations("product.communityPost.detail");
  const { run, pending } = usePostAction(postId);
  const id = useId();
  const [role, setRole] = useState(roles[0] ?? "");
  const [message, setMessage] = useState("");
  if (application) {
    const text = application.status === "ACCEPTED" ? t("applyAccepted") : application.status === "DECLINED" ? t("applyDeclined") : t("applied", { role: application.role });
    return <p className="rounded-xl bg-muted px-4 py-3 text-sm font-semibold">{text}</p>;
  }
  if (!roles.length) return null;
  return <form className="flex flex-col gap-3 rounded-xl bg-muted p-4 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); void run({ action: "apply", role, message: message || undefined }); }}>
    {roles.length > 1 && <div className="flex flex-col gap-1.5 sm:w-36">
      <label htmlFor={`${id}-role`} className="text-sm font-semibold">{t("applyRole")}</label>
      <select id={`${id}-role`} value={role} onChange={(event) => setRole(event.target.value)} className={FIELD}>{roles.map((name) => <option key={name}>{name}</option>)}</select>
    </div>}
    <div className="flex flex-1 flex-col gap-1.5">
      <label htmlFor={`${id}-msg`} className="text-sm font-semibold">{t("applyMessage")}</label>
      <input onKeyDown={imeSubmitGuard} id={`${id}-msg`} value={message} maxLength={300} onChange={(event) => setMessage(event.target.value)} className={FIELD} />
    </div>
    <Button type="submit" disabled={pending || !role}>{t("applySubmit")}</Button>
  </form>;
}

export function ApplicationList({ postId, applications }: { postId: string; applications: Array<{ id: string; role: string; message: string | null; status: string; applicant: Person }> }) {
  const t = useTranslations("product.communityPost.detail");
  const { run, pending } = usePostAction(postId);
  const waiting = applications.filter((item) => item.status === "PENDING");
  return <section aria-labelledby="applications-heading" className="space-y-3 rounded-2xl border border-foreground/60 bg-card p-5" data-testid="community-applications">
    <div className="flex items-baseline justify-between gap-2">
      <h2 id="applications-heading" className="text-sm font-semibold">{t("applications", { count: waiting.length })}</h2>
      <span className="text-xs text-muted-foreground">{t("onlyAuthor")}</span>
    </div>
    {waiting.length === 0 && <p className="text-sm text-muted-foreground">{t("noApplications")}</p>}
    <ul className="divide-y">
      {waiting.map((item) => <li key={item.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
        <div className="flex items-center gap-2 text-sm"><span className="flex flex-1 items-center gap-2"><span className="font-semibold">{nameOf(item.applicant)}</span><span className="rounded-md bg-muted px-1.5 text-xs">{item.role}</span></span><Link href={`/@${item.applicant.username}`} className="text-xs text-muted-foreground hover:text-foreground">@{item.applicant.username}</Link></div>
        {item.message && <p className="text-sm leading-relaxed text-foreground/80">{item.message}</p>}
        <div className="flex gap-2">
          <Button type="button" size="sm" className="flex-1" disabled={pending} onClick={() => void run({ action: "decide", applicationId: item.id, decision: "ACCEPT" })}>{t("accept")}</Button>
          <Button type="button" size="sm" variant="outline" className="flex-1" disabled={pending} onClick={() => void run({ action: "decide", applicationId: item.id, decision: "DECLINE" })}>{t("decline")}</Button>
        </div>
      </li>)}
    </ul>
  </section>;
}

export function OfferList({ postId, verb, offers, open }: { postId: string; verb: "help" | "want"; offers: Array<{ id: string; message: string | null; user: Person }>; open: boolean }) {
  const t = useTranslations("product.communityPost.detail");
  const { run, pending } = usePostAction(postId);
  return <section aria-labelledby="offers-heading" className="space-y-3 rounded-2xl border border-foreground/60 bg-card p-5" data-testid="community-offers">
    <div className="flex items-baseline justify-between gap-2">
      <h2 id="offers-heading" className="text-sm font-semibold">{t(verb === "want" ? "wantOffers" : "offers", { count: offers.length })}</h2>
      <span className="text-xs text-muted-foreground">{t("onlyAuthor")}</span>
    </div>
    {offers.length === 0 && <p className="text-sm text-muted-foreground">{t("noOffers")}</p>}
    <ul className="divide-y">
      {offers.map((offer) => <li key={offer.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0 flex-1 space-y-1">
          <Link href={`/@${offer.user.username}`} className="text-sm font-semibold hover:underline">{nameOf(offer.user)}</Link>
          {offer.message && <p className="text-sm leading-relaxed text-foreground/80">{offer.message}</p>}
        </div>
        {open && <Button type="button" size="sm" disabled={pending} title={verb === "help" ? t("helpedXp", { xp: HELP_REWARD_XP }) : undefined} onClick={() => void run({ action: "resolve", helperId: offer.user.id })}>{verb === "help" ? t("markHelped") : t("done")}</Button>}
      </li>)}
    </ul>
    {open && <div className="flex flex-wrap gap-2 border-t pt-3">
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => void run({ action: "resolve" })}>{t("resolveSelf")}</Button>
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => void run({ action: "close" })}>{t("closePost")}</Button>
    </div>}
  </section>;
}

export function ClosePostButton({ postId }: { postId: string }) {
  const t = useTranslations("product.communityPost.detail");
  const { run, pending } = usePostAction(postId);
  return <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => void run({ action: "close" })}>{t("closePost")}</Button>;
}

export function ReportPost({ postId }: { postId: string }) {
  const t = useTranslations("product.communityPost.detail");
  const { run, pending } = usePostAction(postId);
  const id = useId();
  const [reason, setReason] = useState<typeof COMMUNITY_REPORT_REASONS[number]>("SPAM");
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(false);
  if (sent) return <p className="text-xs text-muted-foreground">{t("reported")}</p>;
  return <details className="ans-details text-sm">
    <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Flag className="h-3.5 w-3.5" aria-hidden="true" />{t("report")}</summary>
    <form className="mt-3 space-y-3 rounded-xl border p-4" onSubmit={async (event) => {
      event.preventDefault();
      if (await run({ action: "report", reason, details: details || undefined })) { setSent(true); toast.success(t("reported")); }
    }}>
      <fieldset className="space-y-1.5">
        <legend className="mb-1 font-semibold">{t("reportTitle")}</legend>
        {COMMUNITY_REPORT_REASONS.map((value) => <label key={value} className="flex items-center gap-2"><input type="radio" name={`${id}-reason`} value={value} checked={reason === value} onChange={() => setReason(value)} />{t(`reportReasons.${value}`)}</label>)}
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor={`${id}-details`} className="font-semibold">{t("reportDetails")}</label>
        <input onKeyDown={imeSubmitGuard} id={`${id}-details`} value={details} maxLength={500} onChange={(event) => setDetails(event.target.value)} className={FIELD} />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>{t("reportSubmit")}</Button>
    </form>
  </details>;
}

/** 管理员置顶 / 取消置顶。只在管理员看帖子详情时出现。 */
export function OfficialPostButton({ postId, official }: { postId: string; official: boolean }) {
  const t = useTranslations("product.communityPost.detail");
  const { run, pending } = usePostAction(postId);
  return <Button type="button" variant="ghost" size="sm" aria-pressed={official} disabled={pending} onClick={() => void run({ action: "official", official: !official })}>
    <BadgeCheck className="h-4 w-4" aria-hidden="true" />{official ? t("unofficial") : t("official")}
  </Button>;
}

export function PinPostButton({ postId, pinned }: { postId: string; pinned: boolean }) {
  const t = useTranslations("product.communityPost.detail");
  const { run, pending } = usePostAction(postId);
  return <Button type="button" variant="ghost" size="sm" aria-pressed={pinned} disabled={pending} onClick={() => void run({ action: "pin", pinned: !pinned })}>
    {pinned ? <PinOff className="h-4 w-4" aria-hidden="true" /> : <Pin className="h-4 w-4" aria-hidden="true" />}{pinned ? t("unpin") : t("pin")}
  </Button>;
}
