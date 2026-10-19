"use client";

import {
  Camera,
  Clock3,
  Download,
  ImagePlus,
  Images,
  LogIn,
  LogOut,
  Loader2,
  Maximize2,
  RefreshCcw,
  Shuffle,
  Sparkles,
  UploadCloud,
  UserCircle,
  WandSparkles,
  X
} from "lucide-react";
import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useId, useMemo, useState } from "react";
import styles from "./picture-studio.module.css";

type StudioMode = "text-to-image" | "image-to-image" | "smart-edit";
type StudioChannel = "fast" | "stable";
type StudioRatio = "1:1" | "3:4" | "9:16" | "16:9";
type StudioResolution = "1k" | "2k" | "4k";

type UploadedReference = {
  dataUrl: string;
  name: string;
};

type GeneratedImage = {
  dataUrl?: string;
  name?: string;
  path?: string;
  url?: string;
};

type PictureHistoryItem = {
  channel?: StudioChannel | "auto";
  createdAt: string;
  elapsedSeconds?: number;
  id: string;
  images: GeneratedImage[];
  mode?: StudioMode;
  prompt: string;
  ratio?: StudioRatio;
  resolution?: StudioResolution;
  seed?: number;
};

type PictureAccountSession = {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
  user: {
    id: string;
    username: string;
  };
};

type GenerationPayload = {
  channel?: StudioChannel | "auto";
  elapsedSeconds?: number;
  error?: string;
  historyItem?: PictureHistoryItem;
  images?: GeneratedImage[];
  mode?: StudioMode;
  ratio?: StudioRatio;
  resolution?: StudioResolution;
  seed?: number;
};

type AuthPayload = Partial<PictureAccountSession> & {
  error?: string;
};

type HistoryPayload = {
  error?: string;
  items?: PictureHistoryItem[];
};

const modeOptions: Array<{ id: StudioMode; label: string; hint: string }> = [
  { id: "text-to-image", label: "文生图", hint: "写一句话生成新图" },
  { id: "image-to-image", label: "图生图", hint: "上传参考图再改造" },
  { id: "smart-edit", label: "智能改图", hint: "按要求重绘细节" }
];

const legacyChannelOptions: Array<{ id: StudioChannel; label: string; note: string }> = [
  { id: "fast", label: "高速通道", note: "适合快速试稿" },
  { id: "stable", label: "稳定通道", note: "适合备用出图" }
];

const ratioOptions: StudioRatio[] = ["1:1", "3:4", "9:16", "16:9"];
const channelOptions: Array<{ id: StudioChannel; label: string; note: string }> = [
  { id: "fast", label: "OpenLux · image2.5sunburst", note: "gpt-image-2.5-sunburst-c 旗舰高精生图" },
  { id: "stable", label: "OpenLux · image2", note: "gpt-image-2-c 标准生图" }
];
const resolutionOptions: StudioResolution[] = ["1k", "2k", "4k"];

const examplePrompts = [
  "一张干净的手机应用界面，白色背景，绿色强调色，清晰展示上传、参数和生成结果。",
  "自然光下的清新产品照片，浅色背景，主体清晰，适合手机海报。",
  "赛博风插画头像，正面构图，细节精致，适合社交媒体头像。"
];

const accountSessionStorageKey = "picture-account-session:v1";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("图片读取失败。"));
    reader.readAsDataURL(file);
  });
}

function defaultSeed() {
  return Math.floor(100000 + Math.random() * 900000);
}

function downloadDataUrl(dataUrl: string, name = "generated-image.png") {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = name || "generated-image.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function imageOutputUrl(pathValue?: string) {
  return pathValue
    ? `/api/picture/output/${pathValue
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join("/")}`
    : "";
}

function imageSource(image?: GeneratedImage | null) {
  if (!image) return "";
  return image.dataUrl || image.url || imageOutputUrl(image.path);
}

function downloadGeneratedImage(image: GeneratedImage) {
  const source = imageSource(image);
  if (!source) return;
  if (image.dataUrl) {
    downloadDataUrl(image.dataUrl, image.name);
    return;
  }
  const link = document.createElement("a");
  link.href = source;
  link.download = image.name || "generated-image.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function loadStoredSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(accountSessionStorageKey);
    if (!raw) return null;
    const session = JSON.parse(raw) as PictureAccountSession;
    return session?.accessToken && session.user?.username ? session : null;
  } catch {
    return null;
  }
}

function persistSession(session: PictureAccountSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(accountSessionStorageKey);
    return;
  }
  window.localStorage.setItem(accountSessionStorageKey, JSON.stringify(session));
}

function formatHistoryTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(date);
}

export function PictureStudio() {
  const [accountSession, setAccountSession] = useState<PictureAccountSession | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authDraft, setAuthDraft] = useState({ username: "", password: "" });
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [mode, setMode] = useState<StudioMode>("text-to-image");
  const [channel, setChannel] = useState<StudioChannel>("fast");
  const [ratio, setRatio] = useState<StudioRatio>("9:16");
  const [resolution, setResolution] = useState<StudioResolution>("2k");
  const [prompt, setPrompt] = useState(examplePrompts[0]);
  const [useFixedSeed, setUseFixedSeed] = useState(false);
  const [seed, setSeed] = useState(() => defaultSeed());
  const [reference, setReference] = useState<UploadedReference | null>(null);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [history, setHistory] = useState<PictureHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [preview, setPreview] = useState<GeneratedImage | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const galleryInputId = useId();
  const cameraInputId = useId();

  const requiresReference = mode !== "text-to-image";
  const selectedMode = useMemo(() => modeOptions.find((item) => item.id === mode) ?? modeOptions[0], [mode]);
  const previewSrc = imageSource(preview);

  useEffect(() => {
    const saved = loadStoredSession();
    if (!saved) return;
    setAccountSession(saved);
    void restoreSession(saved);
  }, []);

  function authHeaders(session = accountSession): HeadersInit {
    return session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
  }

  async function restoreSession(session: PictureAccountSession) {
    try {
      const response = await fetch("/api/picture/auth/me", {
        headers: authHeaders(session)
      });
      const payload = (await response.json()) as AuthPayload;
      if (!response.ok || payload.error || !payload.user?.username) throw new Error(payload.error ?? "登录状态已失效。");
      const nextSession = {
        ...session,
        user: payload.user
      };
      setAccountSession(nextSession);
      persistSession(nextSession);
      await refreshHistory(nextSession);
    } catch {
      persistSession(null);
      setAccountSession(null);
    }
  }

  async function refreshHistory(session = accountSession) {
    if (!session?.accessToken) {
      setHistory([]);
      return;
    }
    setIsHistoryLoading(true);
    try {
      const response = await fetch("/api/picture/history", {
        headers: authHeaders(session)
      });
      const payload = (await response.json()) as HistoryPayload;
      if (!response.ok || payload.error) throw new Error(payload.error ?? "历史读取失败。");
      setHistory(payload.items ?? []);
    } catch (historyError) {
      setAuthMessage(historyError instanceof Error ? historyError.message : "历史读取失败。");
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedUsername = authDraft.username.trim().toLowerCase();
    setAuthDraft((draft) => ({ ...draft, username: normalizedUsername }));
    setIsAuthBusy(true);
    setError("");
    setAuthMessage(authMode === "login" ? "正在登录..." : "正在注册...");
    try {
      const response = await fetch(`/api/picture/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...authDraft, username: normalizedUsername })
      });
      const payload = (await response.json()) as AuthPayload;
      if (!response.ok || payload.error || !payload.accessToken || !payload.user?.username) {
        throw new Error(payload.error ?? "账号操作失败。");
      }
      const session = payload as PictureAccountSession;
      persistSession(session);
      setAccountSession(session);
      setAuthDraft((draft) => ({ ...draft, password: "" }));
      setAuthMessage(authMode === "login" ? "已登录，生成历史会自动保存。" : "注册成功，生成历史会自动保存。");
      await refreshHistory(session);
    } catch (authError) {
      setAuthMessage(authError instanceof Error ? authError.message : "账号操作失败。");
    } finally {
      setIsAuthBusy(false);
    }
  }

  async function signOut() {
    const session = accountSession;
    persistSession(null);
    setAccountSession(null);
    setHistory([]);
    setResults([]);
    setPreview(null);
    setAuthMessage("已退出。");
    if (!session?.accessToken) return;
    await fetch("/api/picture/auth/logout", {
      method: "POST",
      headers: authHeaders(session)
    }).catch(() => undefined);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请上传 PNG、JPG 或 WEBP 图片。");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("参考图请控制在 10MB 以内。");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setReference({ dataUrl, name: file.name || "reference.png" });
      setError("");
      if (mode === "text-to-image") setMode("image-to-image");
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "图片读取失败。");
    }
  }

  async function generate() {
    if (!accountSession?.accessToken) {
      setStatus("");
      setError("请先登录后再生成，历史会自动保存。");
      setAuthMessage("登录或注册后即可开始生成。");
      return;
    }
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < 12) {
      setError("请至少写清主体、场景和画面要求。");
      return;
    }
    if (requiresReference && !reference) {
      setError("当前模式需要先上传一张参考图。");
      return;
    }

    const activeSeed = useFixedSeed ? seed : defaultSeed();
    if (!useFixedSeed) setSeed(activeSeed);
    setIsGenerating(true);
    setError("");
    setStatus("正在提交生成任务...");

    try {
      const response = await fetch("/api/picture", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          mode,
          channel,
          ratio,
          resolution,
          seed: activeSeed,
          prompt: trimmedPrompt,
          n: 1,
          images: reference ? [{ name: reference.name, dataUrl: reference.dataUrl }] : []
        })
      });
      const payload = (await response.json()) as GenerationPayload;
      if (!response.ok || payload.error) throw new Error(payload.error ?? "生成失败。");
      const nextResults = payload.images ?? [];
      setResults(nextResults);
      setPreview(nextResults[0] ?? null);
      if (payload.historyItem) {
        setHistory((items) => [payload.historyItem!, ...items.filter((item) => item.id !== payload.historyItem!.id)]);
      } else {
        await refreshHistory();
      }
      setStatus(payload.elapsedSeconds ? `生成完成，用时 ${payload.elapsedSeconds} 秒。` : "生成完成。");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "生成失败。");
      setStatus("");
    } finally {
      setIsGenerating(false);
    }
  }

  function reuseHistoryItem(item: PictureHistoryItem) {
    setPrompt(item.prompt);
    if (item.mode) setMode(item.mode);
    if (item.channel === "fast" || item.channel === "stable") setChannel(item.channel);
    if (item.ratio) setRatio(item.ratio);
    if (item.resolution) setResolution(item.resolution);
    if (item.seed) {
      setUseFixedSeed(true);
      setSeed(item.seed);
    }
    setStatus("已填入这条历史的参数。");
    setError("");
  }

  function showMissingResultHint(action: "preview" | "download") {
    setStatus("");
    setError(action === "preview" ? "先生成图片后再放大预览。" : "先生成图片后再下载。");
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-label="AI 制图台">
        <header className={styles.header}>
          <div className={styles.brandMark}>
            <Images />
          </div>
          <div>
            <h1>AI 制图台</h1>
            <p>手机也能上传、生成、放大和保存图片。</p>
          </div>
        </header>

        <section className={styles.accountCard} aria-label="账号">
          {accountSession ? (
            <div className={styles.accountSignedIn}>
              <div className={styles.accountBadge}>
                <UserCircle />
                <div>
                  <strong>{accountSession.user.username}</strong>
                  <span>历史会自动保存</span>
                </div>
              </div>
              <div className={styles.accountActions}>
                <button type="button" onClick={() => void refreshHistory()} disabled={isHistoryLoading}>
                  {isHistoryLoading ? <Loader2 className={styles.spin} /> : <Clock3 />}
                  刷新历史
                </button>
                <button type="button" onClick={() => void signOut()}>
                  <LogOut />
                  退出
                </button>
              </div>
            </div>
          ) : (
            <form className={styles.authForm} onSubmit={submitAuth}>
              <div className={styles.authTop}>
                <div>
                  <strong>登录后开始生成</strong>
                  <span>生成记录会保存在你的历史里。</span>
                </div>
                <div className={styles.authTabs} aria-label="账号模式">
                  <button type="button" onClick={() => setAuthMode("login")} aria-pressed={authMode === "login"}>
                    登录
                  </button>
                  <button type="button" onClick={() => setAuthMode("register")} aria-pressed={authMode === "register"}>
                    注册
                  </button>
                </div>
              </div>
              <label>
                用户名
                <input
                  value={authDraft.username}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  inputMode="text"
                  onChange={(event) =>
                    setAuthDraft((draft) => ({ ...draft, username: event.target.value.trim().toLowerCase() }))
                  }
                  placeholder="3-24 位字母、数字或下划线"
                />
              </label>
              <label>
                密码
                <input
                  value={authDraft.password}
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  onChange={(event) => setAuthDraft((draft) => ({ ...draft, password: event.target.value }))}
                  placeholder="至少 8 位"
                  type="password"
                />
              </label>
              <button className={styles.authSubmit} type="submit" disabled={isAuthBusy}>
                {isAuthBusy ? <Loader2 className={styles.spin} /> : <LogIn />}
                {authMode === "login" ? "登录" : "注册并登录"}
              </button>
            </form>
          )}
          {authMessage ? <p className={styles.authMessage}>{authMessage}</p> : null}
        </section>

        <div className={styles.modeTabs} aria-label="生成模式">
          {modeOptions.map((item) => (
            <button
              className={item.id === mode ? styles.activeTab : ""}
              key={item.id}
              type="button"
              onClick={() => {
                setMode(item.id);
                setStatus(`已选择${item.label}模式。`);
                setError("");
              }}
              title={item.hint}
              aria-pressed={item.id === mode}
            >
              {item.id === "text-to-image" ? <WandSparkles /> : item.id === "image-to-image" ? <ImagePlus /> : <Sparkles />}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <strong>描述画面</strong>
              <span>{selectedMode.hint}</span>
            </div>
            <button
              className={styles.iconButton}
              type="button"
              onClick={() => setPrompt(examplePrompts[Math.floor(Math.random() * examplePrompts.length)])}
              aria-label="换一个示例"
            >
              <RefreshCcw />
            </button>
          </div>
          <textarea
            value={prompt}
            maxLength={1000}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="描述你想生成的画面..."
          />
          <div className={styles.counter}>{prompt.length}/1000</div>
        </section>

        <section className={styles.card}>
          <div className={styles.uploadRow}>
            <div>
              <strong>参考图</strong>
              <span>{reference ? reference.name : requiresReference ? "当前模式必传" : "可选"}</span>
            </div>
            {reference?.dataUrl ? <img src={reference.dataUrl} alt="参考图预览" /> : null}
          </div>
          <div className={styles.uploadActions}>
            <label htmlFor={galleryInputId}>
              <UploadCloud />
              上传
            </label>
            <label htmlFor={cameraInputId}>
              <Camera />
              拍照
            </label>
            <label htmlFor={galleryInputId}>
              <Images />
              相册
            </label>
          </div>
          <input id={galleryInputId} className={styles.hiddenInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} />
          <input
            id={cameraInputId}
            className={styles.hiddenInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            capture="environment"
            onChange={handleFileChange}
          />
        </section>

        <section className={styles.controls}>
          <ControlGroup title="生成通道">
            {channelOptions.map((item) => (
              <button
                className={item.id === channel ? styles.selectedPill : ""}
                key={item.id}
                type="button"
                onClick={() => {
                  setChannel(item.id);
                  setStatus(`已选择${item.label}。`);
                  setError("");
                }}
                title={item.note}
                aria-pressed={item.id === channel}
              >
                {item.label}
              </button>
            ))}
          </ControlGroup>

          <ControlGroup title="画面比例">
            {ratioOptions.map((item) => (
              <button
                className={item === ratio ? styles.selectedPill : ""}
                key={item}
                type="button"
                onClick={() => {
                  setRatio(item);
                  setStatus(`画面比例已切换为 ${item}。`);
                  setError("");
                }}
                aria-pressed={item === ratio}
              >
                {item}
              </button>
            ))}
          </ControlGroup>

          <ControlGroup title="分辨率">
            {resolutionOptions.map((item) => (
              <button
                className={item === resolution ? styles.selectedPill : ""}
                key={item}
                type="button"
                onClick={() => {
                  setResolution(item);
                  setStatus(`分辨率已切换为 ${item}。`);
                  setError("");
                }}
                aria-pressed={item === resolution}
              >
                {item}
              </button>
            ))}
          </ControlGroup>

          <div className={styles.seedRow}>
            <strong>随机种子</strong>
            <button
              className={!useFixedSeed ? styles.selectedPill : ""}
              type="button"
              onClick={() => {
                setUseFixedSeed(false);
                setStatus("随机种子已切换为随机。");
                setError("");
              }}
              aria-pressed={!useFixedSeed}
            >
              <Shuffle />
              随机
            </button>
            <button
              className={useFixedSeed ? styles.selectedPill : ""}
              type="button"
              onClick={() => {
                setUseFixedSeed(true);
                setStatus("随机种子已切换为固定种子。");
                setError("");
              }}
              aria-pressed={useFixedSeed}
            >
              固定种子
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={seed}
              onChange={(event) => setSeed(Math.max(1, Number(event.target.value) || defaultSeed()))}
              aria-label="输入种子数字"
            />
          </div>
        </section>

        <button className={styles.generateButton} type="button" onClick={generate} disabled={isGenerating}>
          {isGenerating ? <Loader2 className={styles.spin} /> : <Sparkles />}
          {isGenerating ? "正在生成" : "开始生成"}
        </button>

        {error ? <p className={styles.error}>{error}</p> : null}
        {status ? <p className={styles.status}>{status}</p> : null}

        <section className={styles.results}>
          <div className={styles.resultsHead}>
            <h2>生成结果</h2>
            <span>{results.length ? `${results.length} 张` : "等待生成"}</span>
          </div>
          <div className={styles.resultGrid}>
            {(results.length ? results : [{ name: "placeholder-a" }, { name: "placeholder-b" }]).slice(0, 2).map((item, index) => {
              const itemSrc = imageSource(item);
              return (
                <article className={styles.resultCard} key={item.name ?? index}>
                  {itemSrc ? (
                    <img src={itemSrc} alt={`生成结果 ${index + 1}`} />
                  ) : (
                    <div className={styles.placeholder}>
                      <Sparkles />
                      <span>生成后显示预览</span>
                    </div>
                  )}
                  <div className={styles.resultActions}>
                    <button
                      type="button"
                      onClick={() => (itemSrc ? setPreview(item) : showMissingResultHint("preview"))}
                      disabled={isGenerating}
                    >
                      <Maximize2 />
                      放大
                    </button>
                    <button
                      type="button"
                      onClick={() => (itemSrc ? downloadGeneratedImage(item) : showMissingResultHint("download"))}
                      disabled={isGenerating}
                    >
                      <Download />
                      下载
                    </button>
                    <button type="button" onClick={generate} disabled={isGenerating}>
                      <RefreshCcw />
                      重新生成
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.history}>
          <div className={styles.resultsHead}>
            <h2>我的历史</h2>
            <span>{accountSession ? (history.length ? `${history.length} 条` : "暂无记录") : "登录后查看"}</span>
          </div>
          {!accountSession ? (
            <div className={styles.emptyState}>登录后，每次生成的图片都会自动保存在这里。</div>
          ) : isHistoryLoading ? (
            <div className={styles.emptyState}>正在读取历史...</div>
          ) : history.length ? (
            <div className={styles.historyList}>
              {history.slice(0, 12).map((item) => {
                const firstImage = item.images[0];
                const firstSrc = imageSource(firstImage);
                return (
                  <article className={styles.historyItem} key={item.id}>
                    <button className={styles.historyThumb} type="button" onClick={() => firstImage && setPreview(firstImage)}>
                      {firstSrc ? <img src={firstSrc} alt="历史图片" /> : <Sparkles />}
                    </button>
                    <div className={styles.historyMeta}>
                      <strong>{item.prompt}</strong>
                      <span>
                        {formatHistoryTime(item.createdAt)}
                        {item.ratio ? ` · ${item.ratio}` : ""}
                        {item.resolution ? ` · ${item.resolution}` : ""}
                      </span>
                      <div className={styles.historyActions}>
                        <button type="button" onClick={() => reuseHistoryItem(item)}>
                          复用
                        </button>
                        <button type="button" onClick={() => firstImage && setPreview(firstImage)} disabled={!firstImage}>
                          放大
                        </button>
                        <button type="button" onClick={() => firstImage && downloadGeneratedImage(firstImage)} disabled={!firstImage}>
                          下载
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>还没有历史。生成第一张图后会自动出现。</div>
          )}
        </section>
      </section>

      {previewSrc ? (
        <div className={styles.previewOverlay} role="dialog" aria-modal="true" aria-label="放大预览">
          <button className={styles.closePreview} type="button" onClick={() => setPreview(null)} aria-label="关闭预览">
            <X />
          </button>
          <img src={previewSrc} alt="放大预览" />
          <div className={styles.previewBar}>
            <span>
              <Maximize2 />
              双指缩放预览
            </span>
            <button type="button" onClick={() => preview && downloadGeneratedImage(preview)}>
              <Download />
              下载
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ControlGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className={styles.controlGroup}>
      <strong>{title}</strong>
      <div>{children}</div>
    </div>
  );
}
