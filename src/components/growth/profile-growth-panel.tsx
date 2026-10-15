"use client";
import { useCommunityRequest } from "@/components/community/account-request";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  ArrowUpRight,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Coins,
  Flame,
  Heart,
  Lock,
  MessageCircle,
  Rocket,
  Share2,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

import { LEVELS, getLevelProgress } from "@/domain/growth/levels";
import { AVATAR_FRAMES, CHAT_BUBBLES, getLevelPointReward } from "@/domain/growth/rewards";
import { communityCalendarDays, getCommunityDay, shiftCommunityDay } from "@/domain/growth/check-in";
import { useCommunityDay } from "./use-community-day";
import { XP_RULES } from "@/lib/level";
import { AvatarFrame } from "@/components/growth/avatar-frame";
import { ChatBubble } from "@/components/growth/chat-bubble";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GrowthEvent = { id: string; type: string; xp: number; points: number; sourceType: string; createdAt: string | Date };
type CheckInRecord = { id: string; day: string; streak: number; xpAwarded: number; createdAt: string | Date };

type ProfileGrowthProps = {
  user: {
    xp: number;
    communityPoints: number;
    checkInStreak: number;
    avatarFrameKey: string;
    chatBubbleKey: string;
    checkedInToday?: boolean;
    growthDay?: string;
    recentEvents?: GrowthEvent[];
    checkIns?: CheckInRecord[];
  };
  editable?: boolean;
  actorId?: string;
  avatarFallback?: string;
};

const eventMeta: Record<string, { labelKey: string; icon: typeof Sparkles; tone: string }> = {
  CHECK_IN: { labelKey: "CHECK_IN", icon: CalendarCheck2, tone: "text-emerald-500" },
  PUBLISH_PROMPT: { labelKey: "PUBLISH_PROMPT", icon: Rocket, tone: "text-sky-500" },
  PUBLISH_TEMPLATE: { labelKey: "PUBLISH_TEMPLATE", icon: Sparkles, tone: "text-violet-500" },
  COMMENT: { labelKey: "COMMENT", icon: MessageCircle, tone: "text-amber-500" },
  LEVEL_REWARD: { labelKey: "LEVEL_REWARD", icon: Trophy, tone: "text-amber-500" },
  LIKE: { labelKey: "LIKE", icon: Heart, tone: "text-rose-500" },
  RECEIVE_VOTE: { labelKey: "RECEIVE_VOTE", icon: Heart, tone: "text-rose-500" },
  RECEIVE_FAVORITE: { labelKey: "RECEIVE_FAVORITE", icon: Trophy, tone: "text-yellow-500" },
  RUN_COMPLETE: { labelKey: "RUN_COMPLETE", icon: CircleGauge, tone: "text-cyan-500" },
  SHARE: { labelKey: "SHARE", icon: Share2, tone: "text-indigo-500" },
};

const actionCards = [
  { key: "CHECK_IN", xp: XP_RULES.CHECK_IN.base, icon: CalendarCheck2, color: "from-emerald-500/15 to-emerald-500/5" },
  { key: "PUBLISH_TEMPLATE", xp: XP_RULES.PUBLISH_TEMPLATE.base, icon: Rocket, color: "from-violet-500/15 to-violet-500/5" },
  { key: "COMMENT", xp: XP_RULES.COMMENT.base, icon: MessageCircle, color: "from-amber-500/15 to-amber-500/5" },
  { key: "LIKE", xp: XP_RULES.LIKE.base, icon: Heart, color: "from-rose-500/15 to-rose-500/5" },
  { key: "RUN_COMPLETE", xp: XP_RULES.RUN_COMPLETE.base, icon: CircleGauge, color: "from-cyan-500/15 to-cyan-500/5" },
  { key: "SHARE", xp: XP_RULES.SHARE.base, icon: Share2, color: "from-sky-500/15 to-sky-500/5" },
] as const;

function formatShortDate(value: string | Date, locale: string) {
  return new Date(value).toLocaleDateString(locale, { month: "numeric", day: "numeric", timeZone: "Asia/Shanghai" });
}

function levelColor(index: number) {
  return ["from-slate-500 to-slate-700", "from-emerald-400 to-teal-600", "from-sky-400 to-indigo-600", "from-fuchsia-400 to-violet-600", "from-amber-400 to-orange-600", "from-cyan-400 to-blue-700", "from-rose-400 to-purple-700", "from-violet-400 to-pink-600"][index] ?? "from-primary to-violet-500";
}

export function ProfileGrowthPanel(props: ProfileGrowthProps) {
  if (props.editable) return props.actorId ? <MarketAccountBoundary actorId={props.actorId}><ProfileGrowthState key={props.actorId} {...props} /></MarketAccountBoundary> : null;
  return <ProfileGrowthState {...props} editable={false} />;
}
function ProfileGrowthState({ user, editable = false, avatarFallback = "A", actorId }: ProfileGrowthProps) {
  const request = useCommunityRequest(actorId); const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const router = useRouter();
  const t = useTranslations("product.growth");
  const locale = useLocale();
  const [xp, setXp] = useState(user.xp);
  const [points, setPoints] = useState(user.communityPoints);
  const initialDay = user.growthDay ?? getCommunityDay(new Date());
  const today = useCommunityDay(initialDay);
  const [streakSnapshot, setStreakSnapshot] = useState({ count: user.checkInStreak, validThrough: shiftCommunityDay(initialDay, user.checkedInToday ? 1 : 0) });
  const streak = today <= streakSnapshot.validThrough ? streakSnapshot.count : 0;
  const [frame, setFrame] = useState(user.avatarFrameKey);
  const [bubble, setBubble] = useState(user.chatBubbleKey);
  const [checkedDay, setCheckedDay] = useState<string | null>(user.checkedInToday ? initialDay : null);
  const checked = checkedDay === today;
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>(user.checkIns ?? []);
  const [recentEvents, setRecentEvents] = useState<GrowthEvent[]>(user.recentEvents ?? []);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const progress = useMemo(() => getLevelProgress(xp), [xp]);
  const checkInMap = useMemo(() => new Map(checkIns.map((entry) => [entry.day, entry])), [checkIns]);
  const calendarDays = useMemo(() => communityCalendarDays(today), [today]);
  const levelName = t(`levels.${progress.level.key}.name`);
  const nextLevelName = progress.nextLevel ? t(`levels.${progress.nextLevel.key}.name`) : null;
  const rewardLabel = (key: string) => t(`rewards.${key}.label`);
  const rewardDescription = (key: string) => t(`rewards.${key}.description`);
  const levelPointsBetween = (previousXp: number, nextXp: number) => {
    const before = getLevelProgress(previousXp).level.index;
    const after = getLevelProgress(nextXp).level.index;
    let total = 0;
    for (let index = before + 1; index <= after; index += 1) total += getLevelPointReward(index);
    return total;
  };

  async function checkIn() {
    if (busy || checked) return;
    setBusy(true); setNotice("");
    try {
      const data = await request<Record<string, unknown>>("/api/community/check-in", "POST", {});
      if (!alive.current) return;
      const alreadyCheckedIn = Boolean(data.alreadyCheckedIn);
      const record = data.checkIn as CheckInRecord | undefined;
      const xpAwarded = Number(record?.xpAwarded ?? 0);
      if (record) {
        setCheckedDay(record.day);
        setStreakSnapshot({ count: record.streak, validThrough: shiftCommunityDay(record.day, 1) });
        setCheckIns((current) => current.some((entry) => entry.id === record.id || entry.day === record.day)
          ? current
          : [record, ...current].slice(0, 35));
      }
      if (!alreadyCheckedIn) {
        const previousXp = xp;
        setXp((current) => current + xpAwarded);
        setPoints((current) => current + levelPointsBetween(previousXp, previousXp + xpAwarded));
        if (record) {
          setRecentEvents((current) => [{ id: record.id, type: "CHECK_IN", xp: xpAwarded, points: levelPointsBetween(previousXp, previousXp + xpAwarded), sourceType: "check_in", createdAt: record.createdAt }, ...current].slice(0, 12));
        }
      }
      // Reload balances and ledgers from the committed server state. Another tab
      // may have earned XP while this page was open.
      try {
        const profile = await request<{ xp: number; communityPoints: number; checkInStreak: number; growthDay?: string; checkIns: CheckInRecord[]; recentEvents: GrowthEvent[] }>("/api/community/growth", "GET", undefined);
        if (!alive.current) return;
        const profileDay = profile.growthDay ?? getCommunityDay(new Date());
        const checkedOnProfileDay = profile.checkIns.some(entry => entry.day === profileDay);
        setXp(profile.xp); setPoints(profile.communityPoints);
        setCheckedDay(checkedOnProfileDay ? profileDay : null);
        setStreakSnapshot({ count: profile.checkInStreak, validThrough: shiftCommunityDay(profileDay, checkedOnProfileDay ? 1 : 0) });
        setCheckIns(profile.checkIns); setRecentEvents(profile.recentEvents);
      } catch { /* The committed check-in remains visible using its response. */ }
      if (!alive.current) return;
      setNotice(alreadyCheckedIn ? t("alreadyCheckedIn") : t("checkInSuccess", { xp: xpAwarded }));
      router.refresh();
    } catch {
      if (alive.current) setNotice(t("checkInFailed"));
    } finally { if (alive.current) setBusy(false); }
  }

  async function equip(kind: "avatar-frame" | "chat-bubble", key: string) {
    if (busy) return;
    setBusy(true); setNotice("");
    try {
      const data = await request<{ key?: string }>("/api/community/growth/equip", "POST", { kind, key });
      if (!alive.current) return;
      if (kind === "avatar-frame") setFrame(data.key ?? key); else setBubble(data.key ?? key);
      setNotice(t("applied"));
      router.refresh();
    } catch { if (alive.current) setNotice(t("equipFailed")); } finally { if (alive.current) setBusy(false); }
  }

  return (
    <section className="relative mb-10 overflow-hidden rounded-[32px] border border-primary/15 bg-card shadow-[0_20px_70px_-30px_rgba(79,70,229,.45)]" aria-labelledby="profile-growth-title">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,hsl(var(--primary)/.16),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(236,72,153,.12),transparent_28%)]" aria-hidden="true" />
      <div className="relative grid gap-0 xl:grid-cols-[1.2fr_.8fr]">
        <div className="p-5 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.24em] text-primary"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />ANS GROWTH SYSTEM</p>
              <h2 id="profile-growth-title" className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{levelName}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><span className={cn("rounded-full bg-gradient-to-r px-2.5 py-1 text-xs font-bold text-white", levelColor(progress.level.index))}>LV.{progress.level.index + 1}</span>{progress.level.nameEn}{progress.gradeLabel ? <><span className="text-border">/</span><span>{progress.gradeLabel}</span></> : null}</p>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-background/75 px-4 py-3 text-right backdrop-blur"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("availablePoints")}</p><p className="mt-1 text-2xl font-black tabular-nums">{points.toLocaleString()}</p><p className="text-[11px] text-muted-foreground">{t("pointsUnit")}</p></div>
          </div>

          <div className="mt-8 rounded-3xl border bg-background/55 p-4 md:p-5">
            <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold text-muted-foreground">{t("levelProgress")}</p><p className="mt-1 text-xl font-black tabular-nums">{xp.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">XP</span></p></div><p className="text-right text-xs text-muted-foreground">{progress.nextLevel ? <>{t("nextLevel", { level: nextLevelName ?? "", xp: progress.xpToNext })}</> : t("maxLevel")}</p></div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-primary/10" role="progressbar" aria-label={t("xp")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.progress * 100)}><div className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700 motion-reduce:transition-none", levelColor(progress.level.index))} style={{ width: `${Math.round(progress.progress * 100)}%` }} /></div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground"><span>{Math.round(progress.progress * 100)}% {t("completed")}</span>{progress.nextLevel ? <span>{t("nextRewardAt", { level: progress.nextLevel.index + 1 })}</span> : <span>{t("topLevel")}</span>}</div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 md:gap-3">
            <div className="rounded-2xl border bg-background/55 p-3"><Flame className="h-4 w-4 text-orange-500" aria-hidden="true" /><p className="mt-3 text-xl font-black tabular-nums">{streak}</p><p className="text-[11px] text-muted-foreground">{t("streakDays")}</p></div>
            <div className="rounded-2xl border bg-background/55 p-3"><Zap className="h-4 w-4 text-primary" aria-hidden="true" /><p className="mt-3 text-xl font-black tabular-nums">{progress.xpToNext || "—"}</p><p className="text-[11px] text-muted-foreground">{t("xpToNext")}</p></div>
            <div className="rounded-2xl border bg-background/55 p-3"><Coins className="h-4 w-4 text-amber-500" aria-hidden="true" /><p className="mt-3 text-xl font-black tabular-nums">{getLevelPointReward(progress.level.index)}</p><p className="text-[11px] text-muted-foreground">{t("currentReward")}</p></div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {editable ? <Button type="button" onClick={checkIn} disabled={busy || checked} className="h-11 rounded-full px-5 shadow-lg shadow-primary/20"><CalendarCheck2 className="mr-2 h-4 w-4" aria-hidden="true" />{checked ? t("checkedIn") : t("checkIn")}</Button> : <div className="flex items-center gap-2 rounded-full border bg-background/60 px-4 py-2 text-sm text-muted-foreground"><CalendarCheck2 className="h-4 w-4 text-primary" aria-hidden="true" />{t("streak", { days: streak })}</div>}
            {notice && <p className="text-sm text-muted-foreground" role="status" aria-live="polite">{notice}</p>}
          </div>
        </div>

        <div className="border-t bg-background/35 p-5 xl:border-l xl:border-t-0 md:p-8">
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">{t("checkInCalendarEyebrow")}</p><h3 className="mt-2 text-lg font-bold">{t("checkInCalendarTitle")}</h3></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{editable ? `${checkIns.length} ${t("recentCheckIns")}` : t("privateGrowth")}</span></div>
          {editable ? <>
            <div className="mt-5 grid grid-cols-7 gap-1.5" role="list" aria-label={t("checkInCalendarTitle")}>
              {calendarDays.map((day) => { const record = checkInMap.get(day); const isToday = day === today; return <div key={day} title={record ? `${day} · ${record.xpAwarded} XP` : day} role="listitem" aria-current={isToday ? "date" : undefined} aria-label={record ? t("calendarDayChecked", { day, xp: record.xpAwarded }) : t("calendarDayEmpty", { day })} className={cn("relative aspect-square rounded-md border bg-muted/35", record && "border-emerald-400/50 bg-emerald-400/75", isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background")}><span className="sr-only">{record ? t("calendarDayChecked", { day, xp: record.xpAwarded }) : t("calendarDayEmpty", { day })}</span>{record && <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white" aria-hidden="true" />}</div>; })}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground"><span>{t("calendarHint")}</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-muted" />{t("notCheckedIn")}<span className="ml-2 h-2.5 w-2.5 rounded-sm bg-emerald-400" />{t("checkedInShort")}</span></div>
          </> : <p className="mt-5 rounded-2xl border border-dashed bg-background/40 px-4 py-6 text-sm leading-6 text-muted-foreground">{t("privateGrowthHint")}</p>}
          <div className="mt-6 rounded-2xl border border-orange-400/20 bg-orange-400/5 p-4"><div className="flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500" aria-hidden="true" /><p className="text-sm font-bold">{t("streakHeadline", { days: streak })}</p></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{t("streakHint")}</p></div>
        </div>
      </div>

      <div className="relative grid gap-6 border-t p-5 md:p-8 xl:grid-cols-[1.05fr_.95fr]">
        <div>
          <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">{t("earnEyebrow")}</p><h3 className="mt-2 text-xl font-bold">{t("earnTitle")}</h3></div><Target className="h-5 w-5 text-primary" aria-hidden="true" /></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {actionCards.map((action) => { const Icon = action.icon; return <div key={action.key} className={cn("rounded-2xl border bg-gradient-to-br p-3", action.color)}><div className="flex items-center justify-between"><Icon className="h-4 w-4 text-foreground/70" aria-hidden="true" /><span className="text-xs font-bold text-primary">+{action.xp} XP</span></div><p className="mt-3 text-sm font-semibold">{t(`actions.${action.key}`)}</p><p className="mt-1 text-[11px] text-muted-foreground">{t("dailyCap", { count: XP_RULES[action.key].dailyCap })}</p></div>; })}
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs text-muted-foreground"><ArrowUpRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{t("qualityHint")}</div>
        </div>

        <div>
          <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">{t("activityEyebrow")}</p><h3 className="mt-2 text-xl font-bold">{t("activityTitle")}</h3></div><Activity className="h-5 w-5 text-primary" aria-hidden="true" /></div>
          {editable ? <div className="mt-4 divide-y rounded-2xl border bg-background/45">
            {recentEvents.slice(0, 5).map((event) => { const meta = eventMeta[event.type] ?? { labelKey: "UNKNOWN", icon: Sparkles, tone: "text-primary" }; const Icon = meta.icon; return <div key={event.id} className="flex items-center gap-3 px-4 py-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-muted"><Icon className={cn("h-4 w-4", meta.tone)} aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t(`events.${meta.labelKey}`)}</p><p className="text-[11px] text-muted-foreground">{formatShortDate(event.createdAt, locale)}</p></div><span className="text-sm font-bold text-primary">{event.xp > 0 ? `+${event.xp} XP` : `+${event.points} ${t("pointsUnit")}`}</span></div>; })}
            {recentEvents.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t("noActivity")}</div>}
          </div> : <p className="mt-4 rounded-2xl border border-dashed bg-background/40 px-4 py-6 text-sm leading-6 text-muted-foreground">{t("privateGrowthHint")}</p>}
        </div>
      </div>

      <div className="relative border-t p-5 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">{t("roadmapEyebrow")}</p><h3 className="mt-2 text-xl font-bold">{t("roadmapTitle")}</h3></div><p className="text-xs text-muted-foreground">{t("roadmapHint")}</p></div>
        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
          {LEVELS.map((level) => { const reached = level.index <= progress.level.index; const current = level.index === progress.level.index; return <div key={level.key} className={cn("relative rounded-2xl border p-3 transition", reached && "border-primary/25 bg-primary/5", current && "border-primary bg-primary/10 shadow-sm")}><div className="flex items-center justify-between"><span className={cn("grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br text-[10px] font-black text-white", levelColor(level.index))}>L{level.index + 1}</span>{reached ? <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}</div><p className="mt-3 text-xs font-semibold">{t(`levels.${level.key}.name`)}</p><p className="mt-1 text-[10px] text-foreground">{level.minXp.toLocaleString()} XP</p>{getLevelPointReward(level.index) > 0 && <p className="mt-1 text-[10px] font-medium text-primary">+{getLevelPointReward(level.index)} {t("pointsUnit")}</p>}{current && <span className="mt-2 inline-flex rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">{t("currentLevel")}</span>}</div>; })}
        </div>
      </div>

      <div className="relative grid gap-6 border-t p-5 md:p-8 lg:grid-cols-2">
        <div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /><h3 className="font-bold">{t("unlockedTitle")}</h3></div><div className="mt-4 flex items-center gap-4"><AvatarFrame frameKey={frame} className="h-16 w-16"><span className="grid h-full w-full place-items-center rounded-full bg-muted text-xl" aria-hidden="true">{avatarFallback}</span></AvatarFrame><ChatBubble bubbleKey={bubble} className="flex-1">{t("identityPreview")}</ChatBubble></div>{editable && <div className="mt-5 space-y-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("avatarFrames")}</p><div className="grid grid-cols-3 gap-2">{AVATAR_FRAMES.map((reward) => { const unlocked = reward.levelIndex <= progress.level.index; const label = rewardLabel(reward.key); return <button key={reward.key} type="button" disabled={!unlocked || busy} aria-pressed={frame === reward.key} aria-label={`${label}${unlocked ? "" : `, ${t("locked")}`}`} title={`${rewardDescription(reward.key)} · Lv.${reward.levelIndex + 1}`} onClick={() => equip("avatar-frame", reward.key)} className={cn("rounded-xl border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", frame === reward.key && "border-primary bg-primary/5", !unlocked && "cursor-not-allowed opacity-45")}><div className="flex items-center gap-2"><AvatarFrame frameKey={reward.key}><span className="block h-7 w-7 rounded-full bg-muted" aria-hidden="true" /></AvatarFrame>{unlocked ? frame === reward.key ? <Check className="ml-auto h-3.5 w-3.5 text-primary" aria-hidden="true" /> : null : <Lock className="ml-auto h-3.5 w-3.5" aria-hidden="true" />}</div><p className="mt-1 text-[11px] font-medium">{label}</p></button>; })}</div></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("chatBubbles")}</p><div className="grid grid-cols-2 gap-2">{CHAT_BUBBLES.map((reward) => { const unlocked = reward.levelIndex <= progress.level.index; const label = t(`bubbleLabels.${reward.key}`); return <button key={reward.key} type="button" disabled={!unlocked || busy} aria-pressed={bubble === reward.key} aria-label={`${label}${unlocked ? "" : `, ${t("locked")}`}`} title={`${rewardDescription(reward.key)} · Lv.${reward.levelIndex + 1}`} onClick={() => equip("chat-bubble", reward.key)} className={cn("rounded-xl border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", bubble === reward.key && "border-primary bg-primary/5", !unlocked && "cursor-not-allowed opacity-45")}><ChatBubble bubbleKey={reward.key} className="truncate px-2 py-1 text-xs">{label}</ChatBubble><div className="mt-1 flex justify-end">{unlocked ? bubble === reward.key ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> : null : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}</div></button>; })}</div></div></div>}</div>
        <div className="rounded-3xl border bg-gradient-to-br from-primary/10 via-background/60 to-fuchsia-500/10 p-5"><div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" /><h3 className="font-bold">{t("nextRewardTitle")}</h3></div>{progress.nextLevel ? <><p className="mt-4 text-2xl font-black">{t(`levels.${progress.nextLevel.key}.name`)}</p><p className="mt-2 text-sm text-muted-foreground">{t("nextRewardDescription", { xp: progress.xpToNext, points: getLevelPointReward(progress.nextLevel.index) })}</p><div className="mt-5 space-y-2">{[...AVATAR_FRAMES, ...CHAT_BUBBLES].filter((reward) => reward.levelIndex === progress.nextLevel?.index).map((reward) => <div key={`${reward.kind}-${reward.key}`} className="flex items-center gap-3 rounded-2xl border bg-background/60 px-3 py-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-muted">{reward.kind === "avatar-frame" ? <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> : <MessageCircle className="h-4 w-4 text-fuchsia-500" aria-hidden="true" />}</span><div><p className="text-sm font-semibold">{reward.kind === "chat-bubble" ? t(`bubbleLabels.${reward.key}`) : rewardLabel(reward.key)}</p><p className="text-[11px] text-muted-foreground">{rewardDescription(reward.key)}</p></div><ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden="true" /></div>)}<div className="flex items-center justify-between rounded-2xl bg-primary/10 px-3 py-2 text-sm"><span>{t("levelReward", { points: getLevelPointReward(progress.nextLevel.index) })}</span><span className="font-black text-primary">+{getLevelPointReward(progress.nextLevel.index)}</span></div></div></> : <p className="mt-4 text-sm text-muted-foreground">{t("maxLevel")}</p>}</div>
      </div>
    </section>
  );
}
