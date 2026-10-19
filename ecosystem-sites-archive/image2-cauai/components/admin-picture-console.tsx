"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  Clock3,
  Download,
  History,
  ImageIcon,
  Loader2,
  ShieldCheck,
  Sparkles,
  UsersRound
} from "lucide-react";

type PictureAdminAccount = {
  createdAt?: string;
  generationCount: number;
  lastGenerationAt?: string;
  lastLoginAt?: string;
  loginCount: number;
  sourceHost?: string;
  updatedAt?: string;
  userId: string;
  username: string;
};

type PictureAdminRun = {
  channel: "auto" | "fast" | "stable";
  createdAt: string;
  elapsedSeconds?: number;
  id: string;
  images: Array<{
    available: boolean;
    downloadUrl: string;
    missingReason?: string;
    name: string;
    path: string;
    url: string;
  }>;
  mode: "text-to-image" | "image-to-image" | "smart-edit";
  prompt: string;
  ratio: "1:1" | "3:4" | "9:16" | "16:9";
  resolution: "1k" | "2k" | "4k";
  seed?: number;
  userId: string;
  username?: string;
};

type PictureAdminPayload = {
  accounts?: PictureAdminAccount[];
  error?: string;
  generatedAt?: string;
  health?: {
    authConfigured?: boolean;
    channelsConfigured?: boolean;
    fastChannel?: boolean;
    stableChannel?: boolean;
    supabaseConfigured?: boolean;
  };
  runs?: PictureAdminRun[];
  storageMode?: string;
  totals?: {
    accounts?: number;
    generatedImages?: number;
    runs?: number;
  };
};

type Status = {
  message: string;
  tone: "idle" | "busy" | "success" | "error";
};

type PictureAdminImage = PictureAdminRun["images"][number];

function formatTime(value?: string) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(date);
}

function modeLabel(mode: PictureAdminRun["mode"]) {
  const labels: Record<PictureAdminRun["mode"], string> = {
    "image-to-image": "图生图",
    "smart-edit": "智能改图",
    "text-to-image": "文生图"
  };
  return labels[mode] ?? mode;
}

function channelLabel(channel: PictureAdminRun["channel"]) {
  if (channel === "stable") return "稳定通道";
  if (channel === "auto") return "自动通道";
  return "高速通道";
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

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name || "picture.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}

export function AdminPictureConsole() {
  const [accounts, setAccounts] = useState<PictureAdminAccount[]>([]);
  const [runs, setRuns] = useState<PictureAdminRun[]>([]);
  const [storageMode, setStorageMode] = useState("");
  const [health, setHealth] = useState<NonNullable<PictureAdminPayload["health"]>>({});
  const [status, setStatus] = useState<Status>({
    message: "管理员会话已验证，正在读取制图台数据。",
    tone: "idle"
  });
  const [activeView, setActiveView] = useState<"accounts" | "runs">("accounts");
  const [previewImage, setPreviewImage] = useState<PictureAdminImage | null>(null);

  const stats = useMemo(
    () => ({
      activeAccounts: accounts.filter((account) => account.lastLoginAt).length,
      accounts: accounts.length,
      images: runs.reduce((sum, run) => sum + run.images.length, 0),
      runs: runs.length
    }),
    [accounts, runs]
  );

  const loadOverview = useCallback(async () => {
    setStatus({ message: "正在读取制图台数据...", tone: "busy" });
    try {
      const response = await fetch("/api/admin/picture?limit=120", {
        cache: "no-store"
      });
      const data = await readJson<PictureAdminPayload>(response);
      if (!response.ok) throw new Error(data.error || "制图台数据读取失败。");
      setAccounts(data.accounts ?? []);
      setRuns(data.runs ?? []);
      setHealth(data.health ?? {});
      setStorageMode(data.storageMode ?? "");
      setStatus({
        message: `已读取 ${data.accounts?.length ?? 0} 个账号、${data.runs?.length ?? 0} 条生成记录。`,
        tone: "success"
      });
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : "制图台数据读取失败。", tone: "error" });
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  function openPreview(image: PictureAdminImage) {
    if (!image.available) {
      setStatus({
        message: image.missingReason || "原图文件不在当前服务器，暂时不能查看。",
        tone: "error"
      });
      return;
    }
    setPreviewImage(image);
  }

  async function downloadAdminImage(image: PictureAdminImage) {
    if (!image.available) {
      setStatus({
        message: image.missingReason || "原图文件不在当前服务器，暂时不能下载。",
        tone: "error"
      });
      return;
    }

    setStatus({ message: "正在准备下载图片...", tone: "busy" });
    try {
      const response = await fetch(image.downloadUrl, {
        cache: "no-store"
      });
      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response);
        throw new Error(data.error || "图片下载失败。");
      }
      saveBlob(await response.blob(), image.name);
      setStatus({ message: "图片已开始下载。", tone: "success" });
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : "图片下载失败。", tone: "error" });
    }
  }

  return (
    <section className="admin-picture-panel" aria-label="AI 制图台管理">
      <div className="admin-picture-head">
        <span>
          <Sparkles aria-hidden="true" />
          制图台管理
        </span>
        <strong>账号、生成记录与服务状态</strong>
        <p>只读管理台。用于确认用户是否能注册、最近有没有生成、通道和账号服务是否配置完整。</p>
      </div>

      <div className="admin-picture-auth">
        <div><span>管理员会话</span><small>HttpOnly Cookie · 服务端角色校验</small></div>
        <button type="button" disabled={status.tone === "busy"} onClick={() => void loadOverview()}>
          {status.tone === "busy" ? <Loader2 className="spinning" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
          刷新数据
        </button>
      </div>

      <div className={`admin-picture-status ${status.tone}`}>
        {status.tone === "error" ? <AlertTriangle aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
        <span>{status.message}</span>
        {storageMode ? <small>{storageMode}</small> : null}
      </div>

      <div className="admin-picture-health" aria-label="服务状态">
        <div className={health.authConfigured ? "ready" : "warn"}>
          <span>账号服务</span>
          <strong>{health.authConfigured ? "正常" : "待配置"}</strong>
        </div>
        <div className={health.channelsConfigured ? "ready" : "warn"}>
          <span>生成通道</span>
          <strong>{health.channelsConfigured ? "可用" : "异常"}</strong>
        </div>
        <div className={health.fastChannel ? "ready" : "warn"}>
          <span>高速通道</span>
          <strong>{health.fastChannel ? "已接入" : "未接入"}</strong>
        </div>
        <div className={health.stableChannel ? "ready" : "warn"}>
          <span>稳定通道</span>
          <strong>{health.stableChannel ? "已接入" : "未接入"}</strong>
        </div>
      </div>

      <div className="admin-picture-stats" aria-label="制图台摘要">
        <div>
          <span>{stats.accounts}</span>
          <small>注册账号</small>
        </div>
        <div>
          <span>{stats.activeAccounts}</span>
          <small>有登录记录</small>
        </div>
        <div>
          <span>{stats.runs}</span>
          <small>生成记录</small>
        </div>
        <div>
          <span>{stats.images}</span>
          <small>生成图片</small>
        </div>
      </div>

      <div className="admin-picture-tabs" aria-label="视图切换">
        <button className={activeView === "accounts" ? "active" : ""} type="button" onClick={() => setActiveView("accounts")}>
          <UsersRound aria-hidden="true" />
          账号
        </button>
        <button className={activeView === "runs" ? "active" : ""} type="button" onClick={() => setActiveView("runs")}>
          <History aria-hidden="true" />
          生成记录
        </button>
      </div>

      {activeView === "accounts" ? (
        <div className="admin-picture-table">
          {accounts.length ? (
            accounts.map((account) => (
              <article className="admin-picture-account" key={account.userId}>
                <div>
                  <span>用户名</span>
                  <strong>{account.username}</strong>
                  <small>{account.userId}</small>
                </div>
                <div>
                  <span>登录</span>
                  <strong>{account.loginCount} 次</strong>
                  <small>最近 {formatTime(account.lastLoginAt)}</small>
                </div>
                <div>
                  <span>生成</span>
                  <strong>{account.generationCount} 条</strong>
                  <small>最近 {formatTime(account.lastGenerationAt)}</small>
                </div>
                <div>
                  <span>来源</span>
                  <strong>{account.sourceHost || "picture"}</strong>
                  <small>创建 {formatTime(account.createdAt)}</small>
                </div>
              </article>
            ))
          ) : (
            <div className="admin-picture-empty">
              <UsersRound aria-hidden="true" />
              <strong>暂无账号数据</strong>
              <p>输入后台口令读取。新用户注册成功后会出现在这里。</p>
            </div>
          )}
        </div>
      ) : (
        <div className="admin-picture-runs">
          {runs.length ? (
            runs.map((run) => (
              <article className="admin-picture-run" key={run.id}>
                <div className="admin-picture-run-main">
                  <span>
                    {modeLabel(run.mode)} · {channelLabel(run.channel)} · {run.ratio} · {run.resolution}
                  </span>
                  <strong>{run.prompt || "无提示词"}</strong>
                  <small>
                    {run.username || run.userId} · {formatTime(run.createdAt)}
                    {run.elapsedSeconds ? ` · ${run.elapsedSeconds} 秒` : ""}
                    {run.seed ? ` · seed ${run.seed}` : ""}
                  </small>
                </div>
                <div className="admin-picture-run-images">
                  {run.images.length ? (
                    run.images.slice(0, 3).map((image) => (
                      <div className={image.available ? "admin-picture-image-card" : "admin-picture-image-card missing"} key={`${run.id}-${image.path}`}>
                        {image.available ? (
                          <button
                            aria-label={`查看 ${image.name}`}
                            className="admin-picture-image-thumb"
                            type="button"
                            onClick={() => openPreview(image)}
                          >
                            <img alt={image.name} src={image.url} />
                          </button>
                        ) : (
                          <div className="admin-picture-missing">
                            <ImageIcon aria-hidden="true" />
                            <span>文件未迁移</span>
                          </div>
                        )}
                        <div className="admin-picture-image-actions">
                          <button disabled={!image.available} title={image.available ? "查看大图" : image.missingReason || "原图文件缺失"} type="button" onClick={() => openPreview(image)}>
                            <ExternalLink aria-hidden="true" />
                          </button>
                          <button disabled={!image.available} title={image.available ? "下载图片" : image.missingReason || "原图文件缺失"} type="button" onClick={() => downloadAdminImage(image)}>
                            <Download aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="admin-picture-no-image">
                      <ImageIcon aria-hidden="true" />
                    </div>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="admin-picture-empty">
              <History aria-hidden="true" />
              <strong>暂无生成记录</strong>
              <p>用户生成成功并保存历史后会出现在这里。</p>
            </div>
          )}
        </div>
      )}
      {previewImage ? (
        <div className="admin-picture-preview" role="dialog" aria-modal="true" aria-label="图片预览">
          <button className="admin-picture-preview-backdrop" type="button" aria-label="关闭预览" onClick={() => setPreviewImage(null)} />
          <div className="admin-picture-preview-panel">
            <div className="admin-picture-preview-head">
              <strong>{previewImage.name}</strong>
              <button type="button" onClick={() => setPreviewImage(null)}>
                关闭
              </button>
            </div>
            <img alt={previewImage.name} src={previewImage.url} />
            <div className="admin-picture-preview-actions">
              <button type="button" onClick={() => downloadAdminImage(previewImage)}>
                <Download aria-hidden="true" />
                下载图片
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
