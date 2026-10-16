"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MarketAccountBoundary, useMarketRequest } from "@/components/marketplace/account-boundary";
import { MarketStar } from "@/components/marketplace/market-star";

interface StarState { starCount: number; starred: boolean; eventVote?: { open: boolean; eligible: boolean; voted: boolean } }
export function AgriWallShareStar({ listingId, href }: { listingId: string; href: string }) {
  const { data, status } = useSession();
  const t = useTranslations("agriWall");
  if (status === "loading") return <p role="status">{t("loading")}</p>;
  if (!data?.user?.id) return <Button asChild className="w-full"><Link href={`/login?callbackUrl=${encodeURIComponent(href)}`}>{t("loginStar")}</Link></Button>;
  return <MarketAccountBoundary key={data.user.id} actorId={data.user.id}><ShareStarState listingId={listingId} /></MarketAccountBoundary>;
}
function ShareStarState({ listingId }: { listingId: string }) {
  const t = useTranslations("agriWall");
  const request = useMarketRequest();
  const router = useRouter();
  const [load] = useState(() => request);
  const [state, setState] = useState<StarState | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void load<StarState>(`/api/market/listings/${listingId}/star`, "GET", undefined)
      .then(result => { if (active) { setState(result); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [listingId, load, revision]);
  useEffect(() => {
    const update = (event: Event) => {
      if ((event as CustomEvent<{ listingId?: string }>).detail?.listingId === listingId) router.refresh();
    };
    window.addEventListener("ans:market-star-changed", update);
    const timer = window.setInterval(() => router.refresh(), 60_000);
    return () => { window.removeEventListener("ans:market-star-changed", update); window.clearInterval(timer); };
  }, [listingId, router]);
  if (failed) return <Button variant="outline" onClick={() => { setFailed(false); setRevision(value => value + 1); }}>{t("retry")}</Button>;
  if (!state) return <p role="status">{t("loading")}</p>;
  return <MarketStar listingId={listingId} initialCount={state.starCount} initialStarred={state.starred} initialEventVote={state.eventVote} />;
}
