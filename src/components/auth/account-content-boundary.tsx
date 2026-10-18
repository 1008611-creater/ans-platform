"use client";

import type { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** Unmount private state immediately when the rendered account no longer matches. */
export function AccountContentBoundary({ actorId, children }: { actorId: string; children: ReactNode }) {
  const { data, status } = useSession();
  const router = useRouter();
  const t = useTranslations("product.accountBoundary");
  if (actorId === "guest") return children;
  if (status === "loading") return <p role="status">{t("loading")}</p>;
  if (status !== "authenticated" || data?.user?.id !== actorId) {
    return <div className="space-y-3 rounded-xl border p-5"><p role="alert" className="text-sm">{t("changed")}</p><Button variant="outline" onClick={() => router.refresh()}>{t("refresh")}</Button></div>;
  }
  return children;
}
