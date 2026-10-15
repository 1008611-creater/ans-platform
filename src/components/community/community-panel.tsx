"use client";
import { useCommunityRequest } from "./account-request";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CommunityContributions, CommunityMe } from "@/contracts/community";
import { formatLevel, XP_RULES } from "@/lib/level";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2 } from "lucide-react";

function errorMessage(status: number, fallback: string) {
  if (status === 401) return "请先登录后参与社区。";
  if (status === 403) return "请确认账号正常且邮箱已验证后参与社区。";
  return fallback;
}

export function CommunityPanel({ actorId, showGrowth = true }: { actorId?: string; showGrowth?: boolean }) {
  const request = useCommunityRequest(actorId);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const [me, setMe] = useState<CommunityMe | null>(null);
  const [contributions, setContributions] = useState<CommunityContributions | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [appealLedgerId, setAppealLedgerId] = useState("");
  const [appealMessage, setAppealMessage] = useState("");
  const submitting = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!alive.current) return;
    setLoading(true);
    setError("");
    try {
      const [meResponse, boardResponse] = await Promise.all([
        fetch("/api/community/me", { cache: "no-store", signal, headers: { "x-ans-actor": actorId ?? "" } }),
        fetch("/api/community/contributions", { cache: "no-store", signal, headers: { "x-ans-actor": actorId ?? "" } }),
      ]);
      if (!meResponse.ok || !boardResponse.ok) {
        throw new Error(errorMessage(!meResponse.ok ? meResponse.status : boardResponse.status, "社区数据加载失败，请重试。"));
      }
      const [meData, boardData] = await Promise.all([meResponse.json(), boardResponse.json()]);
      if (!signal?.aborted && alive.current) { setMe(meData); setContributions(boardData); }
    } catch (cause) {
      if (!signal?.aborted && alive.current) {
        setMe(null);
        setContributions(null);
        setError(cause instanceof Error ? cause.message : "社区数据加载失败，请重试。");
      }
    } finally {
      if (!signal?.aborted && alive.current) setLoading(false);
    }
  }, [actorId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function submitRewardAppeal(ledgerId: string) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const result = await request<{ ok: boolean; error?: { message?: string } }>("/api/rewards/appeals", "POST", { ledgerId, message: appealMessage });
      if (!alive.current) return;
      if (!result.ok) throw new Error(result.error?.message ?? "申诉提交失败。");
      setAppealLedgerId("");
      setAppealMessage("");
      setNotice("申诉已提交，管理员处理后会更新状态。");
      await load();
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : "申诉提交失败。");
    } finally {
      if (alive.current) setPending(false);
    }
  }

  async function submitCheckIn() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const result = await request<{ alreadyCheckedIn: boolean; checkIn: { xpAwarded: number } }>("/api/community/check-in", "POST", {});
      if (!alive.current) return;
      setNotice(result.alreadyCheckedIn ? "今天已经签到，本次未重复增加经验。" : `签到成功，获得 ${result.checkIn.xpAwarded} XP。`);
      await load();
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : "REQUEST_FAILED");
    } finally {
      submitting.current = false;
      if (alive.current) setPending(false);
    }
  }

  return (
    <div className="ans-community-data space-y-6">
      <p className="text-sm text-muted-foreground">
        等级记录你的参与和成长；项目上架与管理权限按实际审核与授权执行。
      </p>
      {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive p-4 text-sm">
        <p>{error}</p><Button variant="outline" onClick={() => void load()} disabled={loading || pending}>重试</Button>
        <Link href="/login?callbackUrl=/community" className="underline">前往登录</Link>
      </div>}
      {notice && <p role="status" className="ans-inline-notice"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />{notice}</p>}
      {loading && !me && <div className="ans-loading-region" role="status"><p className="text-sm text-muted-foreground">正在加载社区数据…</p><div className="ans-loading-block ans-loading-block-wide" aria-hidden="true" /><div className="ans-loading-grid" aria-hidden="true"><div className="ans-loading-block" /><div className="ans-loading-block" /></div></div>}
      {me && contributions && <>
        {showGrowth && <Card>
          <CardHeader><h2 className="text-lg font-semibold">我的社区成长</h2></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-semibold">{me.xp.toLocaleString()} XP <span className="text-base font-normal">· {formatLevel(me.xp)}</span></p>
                <p className="mt-1 text-sm text-muted-foreground">连续签到 {me.checkInStreak} 天 · 按上海时间每日重置</p>
              </div>
              <Button onClick={() => void submitCheckIn()} disabled={pending || loading || Boolean(me.todayCheckIn)}>
                {pending ? "签到中…" : me.todayCheckIn ? "今日已签到" : "每日签到"}
              </Button>
            </div>
            <div role="progressbar" aria-label="等级进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(me.level.progress * 100)} className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${Math.round(me.level.progress * 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {me.level.nextLevel ? `距${me.level.nextLevel.nameZh}纪念称号还需 ${me.level.xpToNext} XP。` : "已获得最高等级纪念称号。"}
              每日签到基础经验 {XP_RULES.CHECK_IN.base} XP，连续签到奖励按社区规则累计。
            </p>
          </CardContent>
        </Card>}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><h2 className="text-lg font-semibold">最近经验流水</h2><p className="text-sm text-muted-foreground">仅自己可见，最多展示最近 50 条。</p></CardHeader>
            <CardContent>
              {me.ledger.length === 0 ? <p className="text-sm text-muted-foreground">暂无经验流水，完成首次签到留下成长记录。</p> :
                <ul className="max-h-96 divide-y overflow-auto">
                  {me.ledger.map((entry) => <li key={entry.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0"><p className="break-words text-sm">{entry.note || (entry.reason in XP_RULES ? XP_RULES[entry.reason as keyof typeof XP_RULES].note : "经验调整")}</p>
                      <time dateTime={entry.createdAt} className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</time>
                    </div>
                    <div className="shrink-0 text-right"><span className="text-sm font-medium">{entry.amount > 0 ? "+" : ""}{entry.amount} XP</span>
                      {["COMMUNITY_REWARD", "COMPETITION_AWARD"].includes(entry.reason) ? (
                        <div className="mt-1">
                          {entry.appeal ? (
                            <span className="text-xs text-muted-foreground">
                              {entry.appeal.status === "PENDING" ? "申诉处理中" : entry.appeal.status === "APPROVED" ? "申诉已通过" : "申诉未通过"}
                            </span>
                          ) : appealLedgerId === entry.id ? (
                            <div className="mt-2 w-full min-w-0 space-y-2 text-left sm:w-64">
                              <Textarea aria-label="申诉说明" minLength={10} maxLength={2000} rows={3} value={appealMessage} onChange={(event) => setAppealMessage(event.target.value)} placeholder="说明你认为奖励需要复核的原因" />
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => setAppealLedgerId("")}>取消</Button>
                                <Button size="sm" disabled={pending || appealMessage.trim().length < 10} onClick={() => void submitRewardAppeal(entry.id)}>提交</Button>
                              </div>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAppealLedgerId(entry.id)}>申请复核</Button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </li>)}
                </ul>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="text-lg font-semibold">贡献榜</h2><p className="text-sm text-muted-foreground">经验前 20 位，同分同名次。</p></CardHeader>
            <CardContent className="space-y-4">
              <p className="rounded-lg bg-muted p-3 text-sm">我的名次：第 {contributions.me.rank} 名 · {contributions.me.xp.toLocaleString()} XP</p>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b"><th scope="col" className="py-2">名次</th><th scope="col">昵称 / 称号</th><th scope="col" className="text-right">经验</th></tr></thead>
                  <tbody>{contributions.top.map((member) => <tr key={member.id} className="border-b last:border-0">
                    <td className="py-3 align-top">{member.rank}</td>
                    <td className="max-w-48 break-words py-3">{member.nickname}{member.id === contributions.me.id && <span className="ml-1 text-xs text-muted-foreground">（我）</span>}<p className="text-xs text-muted-foreground">{formatLevel(member.xp)}</p></td>
                    <td className="py-3 text-right align-top">{member.xp.toLocaleString()}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </>}
    </div>
  );
}
