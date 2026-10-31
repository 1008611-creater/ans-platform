"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Flag, Waves } from "lucide-react";
import { BOTTLE_BODY_MAX, BOTTLE_REPLY_MAX, COMMUNITY_REPORT_REASONS } from "@/contracts/community-posts";
import { useCommunityRequest } from "@/components/community/use-community-request";
import { Button } from "@/components/ui/button";

export function ThrowBottleForm() {
  const t = useTranslations("product.communityBottle");
  const { send, pending } = useCommunityRequest();
  const [body, setBody] = useState("");
  const ready = body.trim().length >= 2;

  return <form className="space-y-3" onSubmit={async (event) => {
    event.preventDefault();
    if (!ready) return;
    if (await send("/api/community/bottles", { action: "throw", body })) {
      setBody("");
      toast.success(t("thrown"));
    }
  }}>
    <label htmlFor="bottle-body" className="sr-only">{t("throwLabel")}</label>
    <textarea id="bottle-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={BOTTLE_BODY_MAX} rows={4} placeholder={t("throwPlaceholder")}
      className="w-full resize-none rounded-xl border bg-background px-3.5 py-3 text-[15px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs tabular-nums text-muted-foreground">{body.length}/{BOTTLE_BODY_MAX}</span>
      <Button type="submit" disabled={!ready || pending}>{t("throw")}</Button>
    </div>
  </form>;
}

export function PickBottleButton() {
  const t = useTranslations("product.communityBottle");
  const { send, pending } = useCommunityRequest();
  return <Button type="button" variant="outline" disabled={pending} className="gap-2" onClick={async () => {
    const result = await send<{ bottle: { id: string } | null }>("/api/community/bottles", { action: "pick" });
    if (result && !result.bottle) toast(t("seaEmpty"));
    if (result?.bottle) document.getElementById("picked")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }}>
    <Waves className="h-4 w-4" aria-hidden="true" />{t("pick")}
  </Button>;
}

export function BottleReplyForm({ bottleId }: { bottleId: string }) {
  const t = useTranslations("product.communityBottle");
  const { send, pending } = useCommunityRequest();
  const [body, setBody] = useState("");
  return <form className="flex gap-2" onSubmit={async (event) => {
    event.preventDefault();
    if (!body.trim()) return;
    if (await send(`/api/community/bottles/${bottleId}`, { action: "reply", body })) {
      setBody("");
      toast.success(t("replied"));
    }
  }}>
    <label htmlFor={`bottle-reply-${bottleId}`} className="sr-only">{t("replyLabel")}</label>
    <input id={`bottle-reply-${bottleId}`} value={body} onChange={(event) => setBody(event.target.value)} maxLength={BOTTLE_REPLY_MAX} placeholder={t("replyPlaceholder")}
      className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    <Button type="submit" size="sm" disabled={!body.trim() || pending}>{t("reply")}</Button>
  </form>;
}

export function ReportBottle({ bottleId }: { bottleId: string }) {
  const t = useTranslations("product.communityBottle");
  const reasons = useTranslations("product.communityPost.detail.reportReasons");
  const { send, pending } = useCommunityRequest();
  const [reason, setReason] = useState<(typeof COMMUNITY_REPORT_REASONS)[number]>("SPAM");
  const [sent, setSent] = useState(false);
  if (sent) return <p className="text-xs text-muted-foreground">{t("reported")}</p>;
  return <details className="group text-sm">
    <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Flag className="h-3.5 w-3.5" aria-hidden="true" />{t("report")}</summary>
    <form className="mt-2 space-y-2 rounded-xl border bg-background p-3" onSubmit={async (event) => {
      event.preventDefault();
      if (await send(`/api/community/bottles/${bottleId}`, { action: "report", reason })) { setSent(true); toast.success(t("reported")); }
    }}>
      <fieldset className="flex flex-wrap gap-x-4 gap-y-1.5">
        <legend className="sr-only">{t("report")}</legend>
        {COMMUNITY_REPORT_REASONS.map((value) => <label key={value} className="flex items-center gap-1.5">
          <input type="radio" name={`bottle-report-${bottleId}`} value={value} checked={reason === value} onChange={() => setReason(value)} />{reasons(value)}
        </label>)}
      </fieldset>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>{t("reportSubmit")}</Button>
    </form>
  </details>;
}
