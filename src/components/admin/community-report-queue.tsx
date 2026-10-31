"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Person = { id: string; username: string; nickname: string | null };
type Report = { id: string; reason: string; createdAt: string; reporter: Person; details?: string | null };
export type CommunityReportItem = {
  target: "post" | "bottle";
  id: string;
  title: string | null;
  body: string;
  status: string;
  createdAt: string;
  author: Person;
  reports: Report[];
};

const nameOf = (user: Person) => user.nickname || user.username;

function ReviewButtons({ item }: { item: CommunityReportItem }) {
  const t = useTranslations("product.communityReports");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const review = async (decision: "restore" | "remove") => {
    setPending(true);
    try {
      const response = await fetch("/api/admin/community-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: item.target, id: item.id, decision }) });
      if (!response.ok) throw new Error("REVIEW_FAILED");
      toast.success(t(decision === "restore" ? "restored" : "removed"));
      router.refresh();
    } catch {
      toast.error(t("failed"));
    } finally {
      setPending(false);
    }
  };
  return <div className="flex flex-wrap gap-2">
    <Button size="sm" variant="destructive" disabled={pending} onClick={() => review("remove")}>{t("remove")}</Button>
    <Button size="sm" variant="outline" disabled={pending} onClick={() => review("restore")}>{t("restore")}</Button>
  </div>;
}

export function CommunityReportQueue({ items }: { items: CommunityReportItem[] }) {
  const t = useTranslations("product.communityReports");
  const reasons = useTranslations("product.communityPost.detail.reportReasons");
  if (items.length === 0) return <p className="rounded-2xl border border-dashed px-5 py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>;
  return <ul className="space-y-4">
    {items.map((item) => <li key={`${item.target}:${item.id}`} className="space-y-3 rounded-2xl border bg-card p-5" data-testid="community-report-item">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-muted px-2 py-0.5 font-semibold">{t(item.target === "post" ? "targetPost" : "targetBottle")}</span>
        {item.status === "HIDDEN" && <span className="rounded-md bg-amber-100 px-2 py-0.5 font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-100">{t("autoHidden")}</span>}
        <span className="text-muted-foreground">{t("author", { name: nameOf(item.author) })}</span>
        {item.target === "post" && <Link href={`/community/posts/${item.id}`} className="ml-auto text-primary hover:underline">{t("open")}</Link>}
      </div>
      {item.title && <p className="font-semibold">{item.title}</p>}
      <p className="line-clamp-6 whitespace-pre-wrap break-words text-sm leading-relaxed">{item.body}</p>
      <ul className="space-y-1 rounded-xl bg-muted/60 px-3 py-2 text-sm">
        {item.reports.map((report) => <li key={report.id}>
          <span className="font-medium">{reasons(report.reason)}</span>
          <span className="text-muted-foreground"> · {nameOf(report.reporter)}</span>
          {report.details && <span className="text-muted-foreground"> · {report.details}</span>}
        </li>)}
      </ul>
      <ReviewButtons item={item} />
    </li>)}
  </ul>;
}
