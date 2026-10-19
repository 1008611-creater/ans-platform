"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, History, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import type { Image2AssetChangeLog, Image2AssetSnapshotSummary } from "@/lib/types";

type ChangesResponse = {
  changes?: Image2AssetChangeLog[];
  error?: string;
  storageMode?: string;
};

type UndoResponse = {
  change?: Image2AssetChangeLog;
  error?: string;
  storageMode?: string;
  undoChange?: Image2AssetChangeLog;
};

type Status = {
  message: string;
  tone: "idle" | "busy" | "success" | "error";
};

function formatTime(value?: string) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function actionLabel(action: string) {
  return action === "admin_undo_asset_snapshot" ? "管理员撤销" : "资产快照保存";
}

function summaryLine(summary?: Image2AssetSnapshotSummary) {
  if (!summary) return "无摘要";
  return [
    `收藏 ${summary.favoriteCaseKeys}`,
    `项目夹 ${summary.collections}`,
    `备注 ${summary.notes}`,
    `草稿 ${summary.promptDrafts}`,
    `复用 ${summary.promptReuseHistory}`,
    `抽卡 ${summary.gachaRuns}`
  ].join(" / ");
}

function changeDelta(change: Image2AssetChangeLog) {
  const before = change.summary.before;
  const after = change.summary.after;
  const delta = {
    favorites: after.favoriteCaseKeys - before.favoriteCaseKeys,
    collections: after.collections - before.collections,
    notes: after.notes - before.notes,
    drafts: after.promptDrafts - before.promptDrafts,
    history: after.promptReuseHistory - before.promptReuseHistory,
    gachaRuns: after.gachaRuns - before.gachaRuns
  };
  return Object.entries(delta)
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => `${key} ${value > 0 ? "+" : ""}${value}`)
    .join("，") || "摘要无数量变化";
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: text.slice(0, 240) } as T;
  }
}

export function AdminImage2CaseChanges() {
  const [changes, setChanges] = useState<Image2AssetChangeLog[]>([]);
  const [storageMode, setStorageMode] = useState("");
  const [status, setStatus] = useState<Status>({
    message: "管理员会话已验证，正在读取最近变更记录。",
    tone: "idle"
  });
  const [undoingId, setUndoingId] = useState("");

  const stats = useMemo(
    () => ({
      undoable: changes.filter((item) => !item.undoneAt && item.action !== "admin_undo_asset_snapshot").length,
      undone: changes.filter((item) => item.undoneAt).length,
      users: new Set(changes.map((item) => item.userId)).size
    }),
    [changes]
  );

  async function loadChanges() {
    setStatus({ message: "正在读取变更记录...", tone: "busy" });
    try {
      const response = await fetch("/api/admin/image2-cases/changes?limit=30", {
        cache: "no-store"
      });
      const data = await readJson<ChangesResponse>(response);
      if (!response.ok) throw new Error(data.error || "变更记录读取失败。");
      setChanges(data.changes ?? []);
      setStorageMode(data.storageMode ?? "");
      setStatus({ message: `已读取 ${data.changes?.length ?? 0} 条最近记录。`, tone: "success" });
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : "变更记录读取失败。", tone: "error" });
    }
  }

  async function undoChange(changeId: string) {
    setUndoingId(changeId);
    setStatus({ message: "正在撤销变更...", tone: "busy" });
    try {
      const response = await fetch("/api/admin/image2-cases/changes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-image2-admin-csrf": "1"
        },
        body: JSON.stringify({ changeId })
      });
      const data = await readJson<UndoResponse>(response);
      if (!response.ok) throw new Error(data.error || "撤销失败。");
      setStorageMode(data.storageMode ?? storageMode);
      setStatus({ message: "撤销完成，正在刷新记录。", tone: "success" });
      await loadChanges();
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : "撤销失败。", tone: "error" });
    } finally {
      setUndoingId("");
    }
  }

  useEffect(() => {
    void loadChanges();
  }, []);

  return (
    <section className="admin-change-panel" aria-label="Image2 变更记录">
      <div className="admin-change-head">
        <span>
          <History aria-hidden="true" />
          变更记录
        </span>
        <strong>用户资产快照安全层</strong>
        <p>查看收藏、项目夹、备注、提示词草稿和抽卡来源的最近保存记录；需要时可撤销到保存前状态。</p>
      </div>

      <div className="admin-change-auth">
        <div>
          <span>管理员会话</span>
          <small>HttpOnly Cookie · 不再输入后台口令</small>
        </div>
        <button type="button" disabled={status.tone === "busy"} onClick={() => void loadChanges()}>
          {status.tone === "busy" ? <Loader2 className="spinning" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
          刷新记录
        </button>
      </div>

      <div className={`admin-change-status ${status.tone}`}>
        {status.tone === "error" ? <AlertTriangle aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
        <span>{status.message}</span>
        {storageMode ? <small>{storageMode}</small> : null}
      </div>

      <div className="admin-change-stats" aria-label="变更摘要">
        <div>
          <span>{changes.length}</span>
          <small>最近记录</small>
        </div>
        <div>
          <span>{stats.undoable}</span>
          <small>可撤销</small>
        </div>
        <div>
          <span>{stats.undone}</span>
          <small>已撤销</small>
        </div>
        <div>
          <span>{stats.users}</span>
          <small>关联用户</small>
        </div>
      </div>

      <div className="admin-change-list">
        {changes.length ? (
          changes.map((change) => {
            const canUndo = !change.undoneAt && change.action !== "admin_undo_asset_snapshot";
            return (
              <article className={canUndo ? "admin-change-item" : "admin-change-item muted"} key={change.id}>
                <div className="admin-change-main">
                  <span>{actionLabel(change.action)}</span>
                  <strong>{changeDelta(change)}</strong>
                  <p>{change.reason || "未填写原因"}</p>
                  <small>
                    用户 {change.userId} · {formatTime(change.createdAt)} · {change.source}
                  </small>
                </div>
                <div className="admin-change-snapshots">
                  <div>
                    <span>之前</span>
                    <small>{summaryLine(change.summary.before)}</small>
                  </div>
                  <div>
                    <span>之后</span>
                    <small>{summaryLine(change.summary.after)}</small>
                  </div>
                </div>
                <div className="admin-change-actions">
                  {change.undoneAt ? (
                    <span className="admin-change-undone">已撤销 {formatTime(change.undoneAt)}</span>
                  ) : change.action === "admin_undo_asset_snapshot" ? (
                    <span className="admin-change-undone">撤销记录</span>
                  ) : (
                    <button type="button" disabled={Boolean(undoingId)} onClick={() => void undoChange(change.id)}>
                      {undoingId === change.id ? <Loader2 className="spinning" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
                      撤销
                    </button>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <div className="admin-change-empty">
            <History aria-hidden="true" />
            <strong>暂无变更记录</strong>
            <p>管理员会话验证后会自动读取；用户保存资产快照后会出现在这里。</p>
          </div>
        )}
      </div>
    </section>
  );
}
