"use client";

import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Film,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Send,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatChinaDateTime } from "@/lib/time";
import type { AdminQueueResponse, Generation, GenerationStatus } from "@/lib/types";
import { toUserFacingError } from "@/lib/user-facing-error";

type Draft = {
  videoUrl: string;
  coverUrl: string;
  operatorName: string;
  externalAccount: string;
  sourceTaskUrl: string;
  operatorNote: string;
  userMessage: string;
  errorMessage: string;
};

type Doubao2ApiAccountStatus = {
  id: string;
  adminUrl: string;
  reachable: boolean;
  loggedIn: boolean;
  status: string;
  needsCaptcha: boolean;
  inFlight: boolean;
  cooldownUntil?: number;
  loginRequiredUntil?: number;
  lastError?: string;
};

type Doubao2ApiStatus = {
  configured: boolean;
  reachable: boolean;
  providerType: string;
  rootUrl: string;
  error?: string;
  pool?: {
    cooldownUntil?: number;
    lastError?: string;
    lastRateLimitAt?: number;
  };
  accounts: Doubao2ApiAccountStatus[];
};

export function AdminConsole() {
  const [queue, setQueue] = useState<AdminQueueResponse | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [filter, setFilter] = useState<GenerationStatus | "all">("queued");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [channelStatus, setChannelStatus] = useState<Doubao2ApiStatus | null>(null);
  const [channelLoading, setChannelLoading] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!queue) return;
    setDrafts((current) => {
      const next = { ...current };
      for (const job of queue.jobs) {
        next[job.id] ??= draftFromJob(job);
      }
      return next;
    });
  }, [queue]);

  useEffect(() => {
    if (queue?.providerMode !== "doubao2api") {
      setChannelStatus(null);
      return;
    }
    void refreshChannelStatus();
    const timer = window.setInterval(() => void refreshChannelStatus(), 10000);
    return () => window.clearInterval(timer);
  }, [queue?.providerMode]);

  const jobs = useMemo(() => {
    const all = queue?.jobs ?? [];
    return all.filter((job) => {
      const matchStatus = filter === "all" || job.status === filter;
      const text = `${job.title} ${job.prompt} ${job.userId} ${job.externalAccount ?? ""}`.toLowerCase();
      return matchStatus && text.includes(query.trim().toLowerCase());
    });
  }, [queue, filter, query]);

  const filterTabs = useMemo(() => {
    const totals = queue?.totals ?? { queued: 0, running: 0, succeeded: 0, failed: 0, expired: 0 };
    return [
      { value: "queued" as const, label: "待制作", count: totals.queued },
      { value: "running" as const, label: "制作中", count: totals.running },
      { value: "succeeded" as const, label: "已完成", count: totals.succeeded },
      { value: "failed" as const, label: "失败", count: totals.failed },
      { value: "expired" as const, label: "已过期", count: totals.expired },
      {
        value: "all" as const,
        label: "全部",
        count: totals.queued + totals.running + totals.succeeded + totals.failed + totals.expired
      }
    ];
  }, [queue]);

  async function refresh() {
    setBusy("refresh");
    try {
      const response = await fetch("/api/admin/jobs", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "后台加载失败。");
      setQueue(json);
      if (json.providerMode === "doubao2api") {
        void refreshChannelStatus();
      } else {
        setChannelStatus(null);
      }
    } catch (error) {
      flash(toUserFacingError(error instanceof Error ? error.message : error, "后台加载失败。"), "error");
    } finally {
      setBusy("");
    }
  }

  async function refreshChannelStatus() {
    setChannelLoading(true);
    try {
      const response = await fetch("/api/provider/doubao2api/status", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "通道状态读取失败。");
      setChannelStatus(json);
    } catch (error) {
      setChannelStatus({
        configured: false,
        reachable: false,
        providerType: "doubao2api-proxy",
        rootUrl: "",
        error: error instanceof Error ? error.message : "通道状态读取失败。",
        pool: {},
        accounts: []
      });
    } finally {
      setChannelLoading(false);
    }
  }

  async function updateJob(job: Generation, status: GenerationStatus, progress: number) {
    const draft = drafts[job.id] ?? draftFromJob(job);
    setBusy(`${job.id}-${status}`);
    try {
      const response = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-image2-admin-csrf": "1"
        },
        body: JSON.stringify({
          jobId: job.id,
          status,
          progress,
          ...draft
        })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "任务更新失败。");
      setQueue(json);
      flash(status === "succeeded" ? "成片已发布给用户。" : "任务状态已更新。");
    } catch (error) {
      flash(toUserFacingError(error instanceof Error ? error.message : error, "任务更新失败。"), "error");
    } finally {
      setBusy("");
    }
  }

  async function copyTask(job: Generation) {
    await navigator.clipboard.writeText(taskPackage(job));
    flash("任务包已复制。");
  }

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? draftFromJob(queue?.jobs.find((item) => item.id === id)!)),
        ...patch
      }
    }));
  }

  if (!queue) {
    return (
      <main className="admin-login">
        <section className="admin-login-card">
          <Loader2 className="spin" />
          <h1>制作后台</h1>
          <p>正在使用已验证的管理员会话读取制作队列。</p>
          <button className="primary-button" type="button" onClick={() => void refresh()} disabled={busy === "refresh"}>
            重新读取
          </button>
          {notice ? <div className={`notice ${notice.tone === "error" ? "error" : ""}`}>{notice.text}</div> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">人工履约队列</span>
          <h1>制作后台</h1>
          <p>复制任务包去外部平台生成，拿到成片链接后在这里发布给用户。</p>
        </div>
        <button className="light-button admin-refresh" type="button" onClick={() => void refresh()} disabled={busy === "refresh"}>
          {busy === "refresh" ? <Loader2 className="spin" /> : <RefreshCw />}
          刷新
        </button>
      </header>

      {notice ? <section className={`notice ${notice.tone === "error" ? "error" : ""}`}>{notice.text}</section> : null}

      <section className="admin-stats">
        <Stat label="待制作" value={queue.totals.queued} />
        <Stat label="制作中" value={queue.totals.running} />
        <Stat label="已完成" value={queue.totals.succeeded} />
        <Stat label="失败/过期" value={queue.totals.failed + queue.totals.expired} />
      </section>

      <section className="admin-channel-health" aria-label="通道健康状态">
        <div className="admin-channel-head">
          <div>
            <span className="admin-eyebrow">通道健康</span>
            <h2>{providerModeLabel(queue.providerMode)}</h2>
            <p>{providerModeDescription(queue.providerMode, channelStatus)}</p>
          </div>
          {queue.providerMode === "doubao2api" ? (
            <button className="light-button admin-refresh" type="button" onClick={() => void refreshChannelStatus()} disabled={channelLoading}>
              {channelLoading ? <Loader2 className="spin" /> : <RefreshCw />}
              刷新通道
            </button>
          ) : null}
        </div>

        {queue.providerMode === "doubao2api" ? (
          <div className="admin-channel-body">
            {channelStatus?.pool?.cooldownUntil && channelStatus.pool.cooldownUntil > Date.now() ? (
              <div className="admin-channel-alert">
                <KeyRound />
                通道冷却到 {formatLocalTime(channelStatus.pool.cooldownUntil)}
              </div>
            ) : null}
            {channelStatus?.error ? <div className="admin-channel-alert error">{channelStatus.error}</div> : null}
            {(channelStatus?.accounts ?? []).length ? (
              <div className="admin-channel-accounts">
                {channelStatus?.accounts.map((account) => (
                  <article className="admin-channel-account" key={account.id}>
                    <span className={`status-dot ${accountStatusTone(account)}`} />
                    <div>
                      <strong>{account.id}</strong>
                      <small>{accountStatusText(account)}</small>
                      {account.lastError ? <em>{account.lastError}</em> : null}
                    </div>
                    {account.adminUrl ? (
                      <a className="soft-link" href={account.adminUrl} target="_blank" rel="noreferrer">
                        <ExternalLink />
                        登录
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-mini">暂无账号状态，确认 doubao2api 代理已启动。</div>
            )}
          </div>
        ) : null}
      </section>

      <section className="admin-toolbar">
        <div className="admin-tabs">
          {filterTabs.map(({ value, label, count }) => (
            <button
              className={filter === value ? "active" : ""}
              type="button"
              key={value}
              onClick={() => setFilter(value as GenerationStatus | "all")}
            >
              <span>{label}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </div>
        <label className="admin-search">
          <Search />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索任务、用户、账号" />
        </label>
      </section>

      <section className="admin-job-list">
        {jobs.length ? (
          jobs.map((job) => {
            const draft = drafts[job.id] ?? draftFromJob(job);
            const videoUrlReady = isPublicHttpUrl(draft.videoUrl);
            return (
              <article className="admin-job" key={job.id}>
                <div className="admin-job-main">
                  <div className="admin-job-head">
                    <img src={job.coverUrl} alt={job.title} />
                    <div>
                      <span className={`admin-status ${job.status}`}>{statusLabel(job.status)}</span>
                      <h2>{job.title}</h2>
                      <p>
                        {job.durationSeconds === -1 ? "智能时长" : `${job.durationSeconds} 秒`} / {job.resolution} /{" "}
                        {job.ratio} / {modeLabel(job.mode)}
                      </p>
                    </div>
                  </div>

                  <textarea readOnly value={taskPackage(job)} />

                  <div className="admin-actions">
                    <button className="soft-button" type="button" onClick={() => void copyTask(job)}>
                      <Clipboard />
                      复制任务包
                    </button>
                    {job.sourceTaskUrl ? (
                      <a className="soft-link" href={job.sourceTaskUrl} target="_blank" rel="noreferrer">
                        <ExternalLink />
                        外部任务
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="admin-job-side">
                  <label>
                    <span>使用账号/窗口</span>
                    <input
                      value={draft.externalAccount}
                      onChange={(event) => updateDraft(job.id, { externalAccount: event.target.value })}
                      placeholder="NemoVideo 账号备注"
                    />
                  </label>
                  <label>
                    <span>操作人</span>
                    <input
                      value={draft.operatorName}
                      onChange={(event) => updateDraft(job.id, { operatorName: event.target.value })}
                      placeholder="谁在制作"
                    />
                  </label>
                  <label>
                    <span>外部任务链接</span>
                    <input
                      value={draft.sourceTaskUrl}
                      onChange={(event) => updateDraft(job.id, { sourceTaskUrl: event.target.value })}
                      placeholder="可选"
                    />
                  </label>
                  <label>
                    <span>成片链接</span>
                    <input
                      value={draft.videoUrl}
                      onChange={(event) => updateDraft(job.id, { videoUrl: event.target.value })}
                      placeholder="上传到 R2/对象存储后的 URL"
                    />
                  </label>
                  {draft.videoUrl.trim() ? (
                    <a className="soft-link" href={draft.videoUrl.trim()} target="_blank" rel="noreferrer">
                      <ExternalLink />
                      打开成片
                    </a>
                  ) : null}
                  {!videoUrlReady ? <p className="admin-inline-hint">发布前需要填写 http(s) 成片链接。</p> : null}
                  <label>
                    <span>用户提示</span>
                    <input
                      value={draft.userMessage}
                      onChange={(event) => updateDraft(job.id, { userMessage: event.target.value })}
                      placeholder="例如：正在制作中"
                    />
                  </label>
                  <label>
                    <span>内部备注</span>
                    <textarea
                      value={draft.operatorNote}
                      onChange={(event) => updateDraft(job.id, { operatorNote: event.target.value })}
                      placeholder="失败原因、重试信息等"
                    />
                  </label>

                  <div className="admin-submit-row">
                    <button className="light-button" type="button" onClick={() => void updateJob(job, "running", 35)}>
                      <Film />
                      开始制作
                    </button>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => void updateJob(job, "succeeded", 100)}
                      disabled={busy === `${job.id}-succeeded` || !videoUrlReady}
                    >
                      {busy === `${job.id}-succeeded` ? <Loader2 className="spin" /> : <Send />}
                      发布成片
                    </button>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => void updateJob(job, "failed", 100)}
                      disabled={busy === `${job.id}-failed`}
                    >
                      <XCircle />
                      失败退额
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty-state">没有匹配的任务</div>
        )}
      </section>
    </main>
  );

  function flash(text: string, tone: "success" | "error" = "success") {
    setNotice({ text, tone });
    window.clearTimeout((flash as any).timer);
    (flash as any).timer = window.setTimeout(() => setNotice(null), 2800);
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function draftFromJob(job: Generation): Draft {
  return {
    videoUrl: job.videoUrl ?? "",
    coverUrl: job.coverUrl ?? "",
    operatorName: job.operatorName ?? "",
    externalAccount: job.externalAccount ?? "",
    sourceTaskUrl: job.sourceTaskUrl ?? "",
    operatorNote: job.operatorNote ?? "",
    userMessage: job.userMessage ?? "",
    errorMessage: job.errorMessage ?? ""
  };
}

function taskPackage(job: Generation) {
  const assets = job.assets.length
    ? job.assets.map((asset, index) => `${index + 1}. ${asset.name} / ${asset.kind} / ${asset.role}`).join("\n")
    : "无";

  return [
    `任务ID：${job.id}`,
    `用户ID：${job.userId}`,
    `创建时间：${formatChinaDateTime(job.createdAt)}`,
    `模式：${modeLabel(job.mode)}`,
    `规格：${job.resolution} / ${job.ratio} / ${job.durationSeconds === -1 ? "智能时长" : `${job.durationSeconds}秒`}`,
    `生成音频：${job.generateAudio ? "是" : "否"}`,
    job.style ? `风格：${job.style}` : "",
    job.seed ? `Seed：${job.seed}` : "",
    "",
    "提示词：",
    job.prompt,
    "",
    "素材：",
    assets
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function statusLabel(status: GenerationStatus) {
  return {
    queued: "待制作",
    running: "制作中",
    succeeded: "已完成",
    failed: "失败",
    expired: "已过期"
  }[status];
}

function providerModeLabel(mode: AdminQueueResponse["providerMode"]) {
  if (mode === "doubao2api") return "doubao2api 本地通道";
  if (mode === "seedance") return "Seedance 实时通道";
  return "人工制作通道";
}

function providerModeDescription(mode: AdminQueueResponse["providerMode"], status: Doubao2ApiStatus | null) {
  if (mode === "manual") return "复制任务包到外部平台制作，拿到成片链接后回填发布。";
  if (mode === "seedance") return "当前使用 Seedance 实时 API，后台主要负责异常复核与发布记录。";
  if (!status) return "正在读取本地通道账号状态。";
  if (!status.configured || !status.reachable) return "本地代理暂不可达，请检查 doubao2api 服务。";
  const readyCount = status.accounts.filter((account) => account.reachable && account.loggedIn && !account.needsCaptcha).length;
  return `${readyCount} / ${status.accounts.length} 个账号可接单。`;
}

function accountStatusTone(account: Doubao2ApiAccountStatus) {
  if (!account.reachable) return "offline";
  if (account.needsCaptcha) return "warn";
  if (account.cooldownUntil && account.cooldownUntil > Date.now()) return "warn";
  if (account.loggedIn) return "live";
  return "";
}

function accountStatusText(account: Doubao2ApiAccountStatus) {
  if (!account.reachable) return "服务未连接";
  if (account.needsCaptcha) return "需要人工验证";
  if (account.cooldownUntil && account.cooldownUntil > Date.now()) return `冷却到 ${formatLocalTime(account.cooldownUntil)}`;
  if (account.loginRequiredUntil && account.loginRequiredUntil > Date.now()) return "需要扫码登录";
  if (account.loggedIn) return account.inFlight ? "生成中" : "已登录可用";
  return account.status === "not_ready" ? "待扫码登录" : account.status;
}

function formatLocalTime(value: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function modeLabel(mode: Generation["mode"]) {
  return {
    text: "文生视频",
    "first-frame": "首帧图生",
    "first-last": "首尾帧",
    references: "参考素材"
  }[mode];
}

function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
