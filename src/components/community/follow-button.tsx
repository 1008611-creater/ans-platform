"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, Check, Plus } from "lucide-react";
import { useCommunityRequest } from "./use-community-request";

type Relation = { following: boolean; followedBy: boolean };

// 手机上可点区域不小于 44px，桌面再收回紧凑尺寸。
const SIZE = {
  sm: "h-11 gap-1 rounded-lg px-3 text-xs sm:h-8",
  md: "h-11 gap-1.5 rounded-lg px-3.5 text-sm sm:h-9",
  lg: "h-11 gap-1.5 rounded-full px-5 text-sm sm:h-10",
} as const;

/**
 * 关注按钮。没关注时是浅底按钮；关注后变成单层描边的「已关注 / 互相关注」，
 * 鼠标移上去或键盘聚焦时提示「取消关注」，点了直接生效，不弹确认。
 * `primary` 用在个人主页，那里关注就是唯一主操作。
 */
export function FollowButton({ userId, relation, size = "md", primary = false, className = "" }: { userId: string; relation: Relation; size?: keyof typeof SIZE; primary?: boolean; className?: string }) {
  const t = useTranslations("product.communityFollow");
  const { send, pending } = useCommunityRequest();
  const [following, setFollowing] = useState(relation.following);
  const [hovering, setHovering] = useState(false);

  const toggle = async () => {
    const next = !following;
    setFollowing(next);
    setHovering(false);
    const result = await send<{ following: boolean }>("/api/community/follows", { action: next ? "follow" : "unfollow", userId });
    setFollowing(result ? result.following : !next);
  };

  const base = `relative z-10 inline-flex shrink-0 items-center justify-center font-semibold transition-colors motion-reduce:transition-none disabled:opacity-60 ${SIZE[size]} ${className}`;
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (!following) {
    return <button type="button" aria-pressed={false} disabled={pending} onClick={() => void toggle()}
      className={`${base} ${primary ? "bg-foreground text-background hover:bg-foreground/90" : "bg-muted text-foreground hover:bg-[var(--surface-raised)]"}`}>
      <Plus className={icon} aria-hidden="true" />{relation.followedBy ? t("followBack") : t("follow")}
    </button>;
  }

  const label = hovering ? t("unfollow") : relation.followedBy ? t("mutual") : t("following");
  return <button type="button" aria-pressed={true} aria-label={relation.followedBy ? t("mutual") : t("following")} title={t("unfollow")} disabled={pending} onClick={() => void toggle()}
    onPointerEnter={() => setHovering(true)} onPointerLeave={() => setHovering(false)} onFocus={() => setHovering(true)} onBlur={() => setHovering(false)}
    className={`${base} bg-transparent font-normal text-muted-foreground shadow-[inset_0_0_0_0.5px_var(--hairline)] hover:bg-muted hover:text-foreground`}>
    {/* 对勾用欠阻尼弹簧弹一下；key 跟着状态变，重新挂载才会重播。 */}
    {relation.followedBy ? <ArrowLeftRight className={icon} aria-hidden="true" /> : <Check key="followed" className={`${icon} ans-pop`} aria-hidden="true" />}
    <span aria-hidden="true">{label}</span>
  </button>;
}
