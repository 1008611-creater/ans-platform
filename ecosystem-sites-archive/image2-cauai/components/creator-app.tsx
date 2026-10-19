"use client";

import {
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Film,
  Gift,
  ImageIcon,
  KeyRound,
  ListVideo,
  Loader2,
  Lock,
  Music2,
  Play,
  Settings,
  Sparkles,
  Ticket,
  Upload,
  UserRound,
  WandSparkles,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { formatChinaDateTime } from "@/lib/time";
import type {
  DashboardResponse,
  MediaAsset,
  VideoDuration,
  VideoMode,
  VideoRatio
} from "@/lib/types";
import { toUserFacingError } from "@/lib/user-facing-error";

const storageKey = "seedance-mvp-user-id";
const demoPrompt =
  "夕阳下的海边，女孩慢慢走向镜头，海浪轻轻拍打沙滩，电影感，柔和光影，动作自然稳定。";

const promptIdeas = [
  "雨夜城市街道，一位穿黑色风衣的角色走过霓虹灯牌，镜头缓慢跟随，地面积水反射光影，电影感，稳定运镜。",
  "透明耳机悬浮在浅灰色背景中，柔和棚拍光，产品缓慢旋转，微距细节清晰，干净高级。",
  "雪山日出，登山者站在山脊上回望镜头，云海缓慢流动，金色阳光洒在雪面，史诗感。",
  "森林晨雾里，阳光穿过高大的树木，镜头低角度穿过草叶，空气里有细小水汽，安静自然。"
];

const doubaoImageRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;

type MusicTrack = {
  audioUrl: string;
  title: string;
  duration?: number;
  lyrics?: string;
  coverUrl?: string;
};

type DoubaoImageResult = {
  url: string;
  revisedPrompt?: string;
};

type DoubaoImageReference = {
  name: string;
  mimeType: string;
  dataUrl: string;
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

export function CreatorApp() {
  const [userId, setUserId] = useState("");
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(demoPrompt);
  const [videoModel, setVideoModel] = useState<"sd2.5" | "sd2" | "sd2fast">("sd2.5");
  const [mode, setMode] = useState<VideoMode>("text");
  const [ratio, setRatio] = useState<VideoRatio>("adaptive");
  const [durationSeconds, setDurationSeconds] = useState<VideoDuration>(15);
  const [style, setStyle] = useState("");
  const [seed, setSeed] = useState("");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [musicPrompt, setMusicPrompt] = useState("一首轻快的夏日流行歌曲，旋律明亮，适合短视频开场。");
  const [musicGenre, setMusicGenre] = useState("Pop");
  const [musicLyric, setMusicLyric] = useState("");
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [musicError, setMusicError] = useState("");
  const [musicLoading, setMusicLoading] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("一张高级产品海报，透明耳机悬浮在柔和棚拍光下，干净背景，细节清晰。");
  const [imageRatio, setImageRatio] = useState<(typeof doubaoImageRatios)[number]>("16:9");
  const [imageReference, setImageReference] = useState<DoubaoImageReference | null>(null);
  const [imageResults, setImageResults] = useState<DoubaoImageResult[]>([]);
  const [imageError, setImageError] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [code, setCode] = useState("WEEK-SEED-2026");
  const [accountDraft, setAccountDraft] = useState({ displayName: "", email: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let saved = localStorage.getItem(storageKey);
    if (!saved) {
      saved = crypto.randomUUID();
      localStorage.setItem(storageKey, saved);
    }
    setUserId(saved);
  }, []);

  useEffect(() => {
    if (!userId) return;
    void refreshDashboard(userId);
  }, [userId]);

  useEffect(() => {
    if (!dashboard) return;
    setAccountDraft({
      displayName: dashboard.user.displayName,
      email: dashboard.user.email ?? ""
    });
  }, [dashboard?.user.id]);

  useEffect(() => {
    if (!userId) return;
    const hasActiveJobs = dashboard?.jobs.some((job) => job.status === "queued" || job.status === "running");
    const timer = window.setInterval(() => {
      if (hasActiveJobs) void refreshDashboard(userId, false);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [userId, dashboard?.jobs]);

  const quotaPercent = dashboard?.quota.limit ? dashboard.quota.remaining / dashboard.quota.limit : 0;
  const modeRequiresFiles = mode !== "text";
  const activeJobs = dashboard?.jobs ?? [];
  const gallery = dashboard?.gallery ?? [];
  const providerMode = dashboard?.providerMode ?? "manual";
  const currentRatio = (dashboard?.ratios ?? []).find((item) => item.value === ratio);
  const currentDuration = (dashboard?.durations ?? []).find((item) => item.value === durationSeconds);
  const [channelStatus, setChannelStatus] = useState<Doubao2ApiStatus | null>(null);
  const [channelLoading, setChannelLoading] = useState(false);
  const doubaoCooldownUntil = Math.max(
    channelStatus?.pool?.cooldownUntil ?? 0,
    ...(channelStatus?.accounts ?? []).map((account) => account.cooldownUntil ?? 0)
  );
  const doubaoCoolingDown = providerMode === "doubao2api" && doubaoCooldownUntil > Date.now();
  const doubaoCooldownText = doubaoCoolingDown ? `本地通道冷却到 ${formatLocalTime(doubaoCooldownUntil)}` : "";

  async function refreshDashboard(id = userId, showError = true) {
    if (!id) return;
    try {
      const response = await fetch(`/api/dashboard?userId=${encodeURIComponent(id)}`, {
        headers: { "x-seedance-user": id }
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "加载失败。");
      setDashboard(json);
    } catch (error) {
      if (showError) flash(toUserFacingError(error instanceof Error ? error.message : error, "加载失败。"), "error");
    }
  }

  async function refreshDoubao2ApiStatus() {
    setChannelLoading(true);
    try {
      const response = await fetch("/api/provider/doubao2api/status", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "本地通道状态读取失败。");
      setChannelStatus(json);
    } catch (error) {
      setChannelStatus({
        configured: false,
        reachable: false,
        providerType: "doubao2api-proxy",
        rootUrl: "",
        error: error instanceof Error ? error.message : "本地通道状态读取失败。",
        pool: {},
        accounts: []
      });
    } finally {
      setChannelLoading(false);
    }
  }

  useEffect(() => {
    if (providerMode !== "doubao2api") return;
    void refreshDoubao2ApiStatus();
    const timer = window.setInterval(() => void refreshDoubao2ApiStatus(), 10000);
    return () => window.clearInterval(timer);
  }, [providerMode]);

  async function apiPost(path: string, payload: Record<string, unknown>, successMessage: string) {
    if (!userId) return;
    setBusy(path);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-seedance-user": userId
        },
        body: JSON.stringify({ userId, ...payload })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "操作失败。");
      setDashboard(json);
      flash(successMessage);
    } catch (error) {
      flash(toUserFacingError(error instanceof Error ? error.message : error, "操作失败。"), "error");
    } finally {
      setBusy(null);
    }
  }

  function flash(text: string, tone: "success" | "error" = "success") {
    setNotice({ text, tone });
    window.clearTimeout((flash as any).timer);
    (flash as any).timer = window.setTimeout(() => setNotice(null), 3200);
  }

  async function handleClaim() {
    await apiPost("/api/claim", {}, "免费周卡已激活，今天可以提交 2 个生成任务。");
  }

  async function handleRedeem(event: FormEvent) {
    event.preventDefault();
    await apiPost("/api/redeem", { code }, "卡密兑换成功，周卡权益已刷新。");
  }

  async function handleAccount(event: FormEvent) {
    event.preventDefault();
    await apiPost("/api/account", accountDraft, "账号资料已更新。");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (doubaoCoolingDown) {
      flash(`${doubaoCooldownText}，到点前先别继续提交。`, "error");
      return;
    }
    await apiPost(
      "/api/generations",
      {
        model: videoModel,
        prompt,
        mode,
        ratio,
        durationSeconds,
        resolution: "720p",
        style,
        seed,
        generateAudio,
        privacy: "private",
        assets
      },
      providerSubmitMessage(dashboard?.providerMode)
    );
  }

  async function handleMusicSubmit(event: FormEvent) {
    event.preventDefault();
    const description = musicPrompt.trim();
    if (!description) {
      flash("请输入音乐描述。", "error");
      return;
    }
    if (doubaoCoolingDown) {
      const message = `${doubaoCooldownText}，音乐生成先暂停。`;
      setMusicError(message);
      flash(message, "error");
      return;
    }

    setMusicLoading(true);
    setMusicError("");
    try {
      const response = await fetch("/api/music/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-seedance-user": userId
        },
        body: JSON.stringify({
          prompt: description,
          genre: musicGenre.trim() || undefined,
          lyric: musicLyric.trim() || undefined
        })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "音乐生成失败。");
      const tracks = normalizeMusicTracks(json);
      if (!tracks.length) throw new Error("音乐生成完成，但没有返回可播放音频。");
      setMusicTracks(tracks);
      flash("音乐生成完成。");
    } catch (error) {
      const message = toUserFacingError(error instanceof Error ? error.message : error, "音乐生成失败。");
      setMusicError(message);
      flash(message, "error");
    } finally {
      setMusicLoading(false);
    }
  }

  async function handleDoubaoImageSubmit(event: FormEvent) {
    event.preventDefault();
    const description = imagePrompt.trim();
    if (!description) {
      flash("请输入图片描述。", "error");
      return;
    }
    if (doubaoCoolingDown) {
      const message = `${doubaoCooldownText}，图片生成先暂停。`;
      setImageError(message);
      flash(message, "error");
      return;
    }

    setImageLoading(true);
    setImageError("");
    try {
      const response = await fetch("/api/doubao2api/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-seedance-user": userId
        },
        body: JSON.stringify({
          prompt: description,
          ratio: imageRatio,
          refImageDataUrl: imageReference?.dataUrl,
          refImageName: imageReference?.name,
          refImageMimeType: imageReference?.mimeType
        })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "图片生成失败。");
      const images = normalizeDoubaoImages(json);
      if (!images.length) throw new Error("图片生成完成，但没有返回可展示图片。");
      setImageResults(images);
      flash("图片生成完成。");
    } catch (error) {
      const message = toUserFacingError(error instanceof Error ? error.message : error, "图片生成失败。");
      setImageError(message);
      flash(message, "error");
    } finally {
      setImageLoading(false);
    }
  }

  async function handleDoubaoImageFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      flash("请上传图片文件。", "error");
      return;
    }

    setImageReference({
      name: file.name,
      mimeType: file.type,
      dataUrl: await readFile(file)
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    const nextAssets: MediaAsset[] = [];

    for (const file of selected) {
      const kind = file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
          ? "audio"
          : "image";
      const dataUrl = await readFile(file);
      nextAssets.push({
        id: crypto.randomUUID(),
        name: file.name,
        kind,
        role: "reference_image",
        mimeType: file.type,
        size: file.size,
        dataUrl
      });
    }

    setAssets((current) => trimAssets([...current, ...nextAssets], mode));
  }

  function handleMode(nextMode: VideoMode) {
    setMode(nextMode);
    setAssets((current) => trimAssets(current, nextMode));
  }

  function removeAsset(id: string) {
    setAssets((current) => current.filter((asset) => asset.id !== id));
  }

  const uploadCopy = useMemo(() => {
    if (mode === "first-frame") return "上传首帧图";
    if (mode === "first-last") return "上传首尾帧";
    if (mode === "references") return "上传参考素材";
    return "无需素材";
  }, [mode]);

  return (
    <div className="dashboard">
      <aside className="sidebar" aria-label="主导航">
        <a className="brand" href="#">
          <span className="brand-icon">
            <Sparkles />
          </span>
          <span>
            <strong>Seedance 2.0</strong>
            <small>满血版周卡创作台</small>
          </span>
        </a>

        <nav className="nav-list" aria-label="功能导航">
          <a className="active" href="#composer">
            <Film />
            <span>做视频</span>
          </a>
          <a href="#gallery">
            <ImageIcon />
            <span>作品</span>
          </a>
          <a href="#queue">
            <ListVideo />
            <span>任务</span>
          </a>
          <a href="#tools">
            <Settings />
            <span>工具</span>
          </a>
        </nav>

        <section className="benefit-card" aria-labelledby="benefit-title">
          <div className="benefit-head">
            <h2 id="benefit-title">周卡权益</h2>
            <span>{dashboard?.quota.active ? "生效中" : "未激活"}</span>
          </div>
          <p>Seedance 2.0 满血版周卡</p>
          <small>
            {dashboard?.entitlement
              ? `有效期至 ${formatChinaDateTime(dashboard.entitlement.endsAt)}`
              : "领取或兑换后生效"}
          </small>
          <ul>
            <li>
              <Check /> 每天 2 次生成额度
            </li>
            <li>
              <Check /> 单次最高 15 秒
            </li>
            <li>
              <Check /> 720p 输出
            </li>
            <li>
              <Check /> 支持横竖方与智能比例
            </li>
          </ul>
          <button className="light-button" type="button" onClick={handleClaim} disabled={busy === "/api/claim"}>
            {busy === "/api/claim" ? <Loader2 className="spin" /> : <Gift />}
            领取免费周卡
          </button>
        </section>
      </aside>

      <div className="app">
        <header className="topbar">
          <div className="provider-chip">
            <span className={providerMode === "manual" ? "dot" : "dot live"} />
            {providerStatusLabel(providerMode)}
          </div>
          <div className="topbar-actions">
            <button className="text-button" type="button">
              <BookOpen />
              <span>帮助中心</span>
            </button>
            <button className="icon-button subtle" type="button" aria-label="通知">
              <Bell />
            </button>
            <button className="user-menu" type="button">
              <img src="/assets/avatar.svg" alt="创作者头像" />
              <span>
                <strong>{dashboard?.user.displayName ?? "创作者"}</strong>
                <small>{dashboard?.quota.active ? "周卡用户" : "待激活"}</small>
              </span>
              <ChevronDown />
            </button>
          </div>
        </header>

        <main className="content">
          <section className="page-title">
            <h1>Seedance 视频创作台</h1>
            <p>写提示词，选模式和规格，然后提交生成。</p>
          </section>

          {notice ? <section className={`notice ${notice.tone === "error" ? "error" : ""}`}>{notice.text}</section> : null}

          <section className="work-grid">
            <div className="main-column">
              <form id="composer" className="panel composer" onSubmit={handleSubmit}>
                <div className="section-head">
                  <h2>开始创作</h2>
                  <div className="section-actions">
                    <button
                      className="soft-button"
                      type="button"
                      onClick={() => setPrompt(promptIdeas[Math.floor(Math.random() * promptIdeas.length)])}
                    >
                      <WandSparkles />
                      <span>灵感</span>
                    </button>
                    <button className="soft-button danger" type="button" onClick={() => setPrompt("")}>
                      清空
                    </button>
                    <button className="primary-button generate-button top-generate-button" type="submit" disabled={busy === "/api/generations" || doubaoCoolingDown}>
                      {busy === "/api/generations" ? <Loader2 className="spin" /> : <Sparkles />}
                      <span>{doubaoCoolingDown ? "冷却中" : "开始生成"}</span>
                    </button>
                  </div>
                </div>

                <label className="prompt-field">
                  <span>视频描述</span>
                  <textarea
                    maxLength={1000}
                    rows={7}
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="描述画面主体、动作、镜头、光线、节奏。"
                  />
                  <small>{prompt.length} / 1000</small>
                </label>

                <div className="mode-tabs" role="group" aria-label="火山方舟视频模型">
                  {[
                    { value: "sd2.5", label: "SD 2.5 (火山旗舰)", hint: "doubao-seedance-2-5-260628" },
                    { value: "sd2", label: "SD 2.0 (火山标准)", hint: "doubao-seedance-2-0-260128" },
                    { value: "sd2fast", label: "SD 2.0 Fast (火山极速)", hint: "doubao-seedance-2-0-fast-260128" }
                  ].map((item) => (
                    <button
                      className={`segment ${videoModel === item.value ? "active" : ""}`}
                      type="button"
                      key={item.value}
                      onClick={() => setVideoModel(item.value as "sd2.5" | "sd2" | "sd2fast")}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.hint}</span>
                    </button>
                  ))}
                </div>

                <div className="mode-tabs" role="group" aria-label="生成模式">
                  {(dashboard?.modes ?? []).map((item) => (
                    <button
                      className={`segment ${mode === item.value ? "active" : ""}`}
                      type="button"
                      key={item.value}
                      onClick={() => handleMode(item.value)}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.hint}</span>
                    </button>
                  ))}
                </div>

                {modeRequiresFiles ? (
                  <section className="upload-strip">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple={mode === "references" || mode === "first-last"}
                      accept={mode === "references" ? "image/*,video/mp4,video/quicktime,audio/mpeg,audio/wav" : "image/*"}
                      onChange={(event) => void handleFiles(event.target.files)}
                    />
                    <button className="upload-button" type="button" onClick={() => fileInputRef.current?.click()}>
                      <Upload />
                      {uploadCopy}
                    </button>
                    <div className="asset-list">
                      {assets.map((asset) => (
                        <span className="asset-pill" key={asset.id}>
                          {asset.kind === "image" ? <ImageIcon /> : asset.kind === "video" ? <Film /> : <Clock />}
                          {asset.name}
                          <button type="button" onClick={() => removeAsset(asset.id)} aria-label="移除素材">
                            <X />
                          </button>
                        </span>
                      ))}
                    </div>
                  </section>
                ) : null}

                <div className="composer-footer">
                  <p>
                    <Clock /> 今日额度：
                    <strong>
                      {dashboard?.quota.remaining ?? 0} / {dashboard?.quota.limit ?? 0} 次
                    </strong>
                    <span className="composer-spec">
                      {currentRatio?.label ?? ratio} · {currentDuration?.label ?? `${durationSeconds}s`}
                    </span>
                  </p>
                  <button className="primary-button generate-button" type="submit" disabled={busy === "/api/generations" || doubaoCoolingDown}>
                    {busy === "/api/generations" ? <Loader2 className="spin" /> : <Sparkles />}
                    <span>{doubaoCoolingDown ? "通道冷却中" : "开始生成"}</span>
                  </button>
                </div>

                <section id="settings" className="settings-block">
                  <div className="section-head compact">
                    <h2>视频规格</h2>
                    <span>720p 周卡通道</span>
                  </div>

                  <div className="option-group ratio-options">
                    {(dashboard?.ratios ?? []).map((item) => (
                      <button
                        className={`option-tile ${ratio === item.value ? "active" : ""}`}
                        type="button"
                        key={item.value}
                        onClick={() => setRatio(item.value)}
                      >
                        <span className="tile-shape" data-ratio={item.value} />
                        <strong>{item.label}</strong>
                        <small>{item.size}</small>
                        <em>{item.use}</em>
                      </button>
                    ))}
                  </div>

                  <div className="option-group duration-options">
                    {(dashboard?.durations ?? []).map((item) => (
                      <button
                        className={`duration-chip ${durationSeconds === item.value ? "active" : ""}`}
                        type="button"
                        key={item.value}
                        onClick={() => setDurationSeconds(item.value)}
                      >
                        <strong>{item.label}</strong>
                        <span>{item.hint}</span>
                      </button>
                    ))}
                  </div>

                  <div className="settings-grid">
                    <label>
                      <span>分辨率</span>
                      <select value="720p" disabled>
                        <option value="720p">720p 周卡固定</option>
                      </select>
                    </label>
                    <label>
                      <span>风格</span>
                      <input value={style} onChange={(event) => setStyle(event.target.value)} placeholder="电影感 / 产品广告" />
                    </label>
                    <label>
                      <span>Seed</span>
                      <input value={seed} onChange={(event) => setSeed(event.target.value)} placeholder="随机" inputMode="numeric" />
                    </label>
                    <label className="toggle-row">
                      <input
                        type="checkbox"
                        checked={generateAudio}
                        onChange={(event) => setGenerateAudio(event.target.checked)}
                      />
                      <span>生成音频</span>
                    </label>
                  </div>
                </section>
              </form>

              <details id="tools" className="tool-drawer">
                <summary>
                  扩展工具
                  <strong>图片生成 / 音乐生成</strong>
                </summary>
                <div className="tool-drawer-grid">
              <section id="doubao-image" className="mini-panel doubao-image-panel">
                <div className="section-head">
                  <h2>文生图 / 图生图</h2>
                  <span className="provider-chip compact">
                    <ImageIcon />
                    doubao-image
                  </span>
                </div>

                <form className="doubao-image-form" onSubmit={handleDoubaoImageSubmit}>
                  <label className="prompt-field image-prompt">
                    <span>图片描述</span>
                    <textarea
                      maxLength={800}
                      rows={4}
                      value={imagePrompt}
                      onChange={(event) => setImagePrompt(event.target.value)}
                      placeholder="描述主体、风格、构图、光线和画面比例。"
                    />
                    <small>{imagePrompt.length} / 800</small>
                  </label>

                  <div className="image-tool-row">
                    <div className="image-ratio-tabs" role="group" aria-label="图片比例">
                      {doubaoImageRatios.map((item) => (
                        <button
                          className={`duration-chip ${imageRatio === item ? "active" : ""}`}
                          type="button"
                          key={item}
                          onClick={() => setImageRatio(item)}
                        >
                          <strong>{item}</strong>
                          <span>图片比例</span>
                        </button>
                      ))}
                    </div>

                    <div className="image-reference-actions">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(event) => void handleDoubaoImageFile(event.target.files)}
                      />
                      <button className="upload-button" type="button" onClick={() => imageInputRef.current?.click()}>
                        <Upload />
                        参考图
                      </button>
                      {imageReference ? (
                        <span className="asset-pill">
                          <ImageIcon />
                          {imageReference.name}
                          <button type="button" onClick={() => setImageReference(null)} aria-label="移除参考图">
                            <X />
                          </button>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="music-actions">
                    <button className="primary-button" type="submit" disabled={imageLoading}>
                      {imageLoading ? <Loader2 className="spin" /> : <ImageIcon />}
                      <span>生成图片</span>
                    </button>
                    {imageError ? <p className="inline-error">{imageError}</p> : null}
                  </div>
                </form>

                <div className="doubao-image-results">
                  {imageResults.length ? (
                    imageResults.map((item, index) => (
                      <figure className="doubao-image-result" key={`${item.url}-${index}`}>
                        <a href={item.url} target="_blank" rel="noreferrer">
                          <img src={item.url} alt={item.revisedPrompt || `生成图片 ${index + 1}`} />
                        </a>
                        <figcaption>{item.revisedPrompt || imagePrompt}</figcaption>
                      </figure>
                    ))
                  ) : (
                    <div className="empty-mini">暂无图片</div>
                  )}
                </div>
              </section>

              <section id="music" className="mini-panel music-panel">
                <div className="section-head">
                  <h2>文生音乐</h2>
                  <span className="provider-chip compact">
                    <Music2 />
                    doubao-music
                  </span>
                </div>

                <form className="music-form" onSubmit={handleMusicSubmit}>
                  <label className="prompt-field music-prompt">
                    <span>音乐描述</span>
                    <textarea
                      maxLength={800}
                      rows={4}
                      value={musicPrompt}
                      onChange={(event) => setMusicPrompt(event.target.value)}
                      placeholder="描述歌曲风格、情绪、节奏、用途。"
                    />
                    <small>{musicPrompt.length} / 800</small>
                  </label>

                  <div className="music-fields">
                    <label>
                      <span>流派</span>
                      <input value={musicGenre} onChange={(event) => setMusicGenre(event.target.value)} placeholder="Pop / Folk" />
                    </label>
                    <label>
                      <span>歌词</span>
                      <input value={musicLyric} onChange={(event) => setMusicLyric(event.target.value)} placeholder="可选" />
                    </label>
                  </div>

                  <div className="music-actions">
                    <button className="primary-button" type="submit" disabled={musicLoading}>
                      {musicLoading ? <Loader2 className="spin" /> : <Music2 />}
                      <span>生成音乐</span>
                    </button>
                    {musicError ? <p className="inline-error">{musicError}</p> : null}
                  </div>
                </form>

                <div className="music-results">
                  {musicTracks.length ? (
                    musicTracks.map((track, index) => (
                      <article className="music-track" key={`${track.audioUrl}-${index}`}>
                        <div className="music-track-head">
                          <div>
                            <h3>{track.title || `音乐 ${index + 1}`}</h3>
                            {track.duration ? <p>{formatDuration(track.duration)}</p> : null}
                          </div>
                          <a className="text-button" href={track.audioUrl} target="_blank" rel="noreferrer">
                            打开音频
                          </a>
                        </div>
                        <audio controls src={track.audioUrl} />
                        {track.lyrics ? <pre>{track.lyrics}</pre> : null}
                      </article>
                    ))
                  ) : (
                    <div className="empty-mini">暂无音乐</div>
                  )}
                </div>
              </section>
                </div>
              </details>

              <section id="gallery" className="panel gallery-panel">
                <div className="section-head">
                  <div>
                    <h2>作品区</h2>
                    <div className="filter-tabs">
                      <button className="active" type="button">
                        全部
                      </button>
                      <button type="button">视频</button>
                      <button type="button">分享</button>
                    </div>
                  </div>
                  <button className="text-button" type="button" onClick={() => void refreshDashboard()}>
                    刷新
                  </button>
                </div>
                <div className="gallery-grid">
                  {gallery.length ? (
                    gallery.map((item) => <GalleryCard key={item.id} item={item} />)
                  ) : (
                    <div className="empty-state">
                      <strong>暂无作品</strong>
                      <span>任务发布成片后，会在这里播放、下载和复制链接。</span>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside className="right-column">
              <details id="channel" className="side-drawer">
                <summary>
                  本地通道
                  <strong>登录与状态</strong>
                </summary>
                <div className="side-drawer-content">
              <section className="mini-panel channel-panel">
                <div className="section-head">
                  <h2>本地通道</h2>
                  <button className="text-button" type="button" onClick={() => void refreshDoubao2ApiStatus()}>
                    {channelLoading ? "刷新中" : "刷新"}
                  </button>
                </div>

                {providerMode === "doubao2api" ? (
                  <div className="channel-list">
                    {doubaoCoolingDown ? (
                      <div className="channel-cooldown">
                        <Clock />
                        <span>{doubaoCooldownText}</span>
                      </div>
                    ) : null}
                    {(channelStatus?.accounts ?? []).length ? (
                      channelStatus?.accounts.map((account) => (
                        <article className="channel-account" key={account.id}>
                          <div className="channel-account-main">
                            <span className={`status-dot ${accountStatusTone(account)}`} />
                            <div>
                              <strong>{account.id}</strong>
                              <small>{accountStatusText(account)}</small>
                            </div>
                          </div>
                          {account.adminUrl ? (
                            <a className="text-button channel-login-link" href={account.adminUrl} aria-label={`打开 ${account.id} 登录页`}>
                              登录
                            </a>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <div className="empty-mini">{channelStatus?.error ?? "等待本地代理状态"}</div>
                    )}
                  </div>
                ) : (
                  <div className="empty-mini">当前不是 doubao2api 通道</div>
                )}
              </section>
                </div>
              </details>

              <section className="panel quota-panel">
                <div className="section-head">
                  <h2>今日额度</h2>
                  <button className="text-button" type="button" onClick={() => void refreshDashboard()}>
                    刷新
                  </button>
                </div>
                <div className="quota-gauge" aria-label="今日剩余额度">
                  <svg viewBox="0 0 180 112">
                    <path className="gauge-bg" d="M34 92a56 56 0 0 1 112 0" />
                    <path
                      className="gauge-fill"
                      d="M34 92a56 56 0 0 1 112 0"
                      style={{ strokeDashoffset: 176 - quotaPercent * 176 }}
                    />
                  </svg>
                  <div>
                    <strong>
                      {dashboard?.quota.remaining ?? 0}
                      <small>/{dashboard?.quota.limit ?? 0}</small>
                    </strong>
                    <span>剩余次数</span>
                  </div>
                </div>
                <h3>每日 00:00 重置</h3>
                <p>{dashboard?.quota.resetAt ? `下次重置 ${formatChinaDateTime(dashboard.quota.resetAt)}` : "等待登录"}</p>
                <div className="upgrade-tip">
                  <Lock />
                  <span>1080p 与更多额度可放到下一档会员。</span>
                  <button type="button">升级</button>
                </div>
              </section>

              <details id="account-tools" className="side-drawer">
                <summary>
                  权益与账号
                  <strong>卡密 / 资料</strong>
                </summary>
                <div className="side-drawer-content">
              <section id="redeem" className="mini-panel redeem-panel">
                <div className="section-head">
                  <h2>卡密兑换</h2>
                </div>
                <form className="redeem-form" onSubmit={handleRedeem}>
                  <input value={code} onChange={(event) => setCode(event.target.value)} aria-label="兑换码" />
                  <button className="primary-button" type="submit" disabled={busy === "/api/redeem"}>
                    <KeyRound />
                  </button>
                </form>
                <button className="link-button" type="button">
                  兑换记录
                </button>
              </section>

              <section id="account" className="mini-panel account-panel">
                <div className="section-head">
                  <h2>账号</h2>
                </div>
                <form className="account-form" onSubmit={handleAccount}>
                  <label>
                    <span>昵称</span>
                    <input
                      value={accountDraft.displayName}
                      onChange={(event) => setAccountDraft((draft) => ({ ...draft, displayName: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>邮箱</span>
                    <input
                      value={accountDraft.email}
                      onChange={(event) => setAccountDraft((draft) => ({ ...draft, email: event.target.value }))}
                      placeholder="name@example.com"
                    />
                  </label>
                  <button className="light-button" type="submit" disabled={busy === "/api/account"}>
                    保存账号
                  </button>
                </form>
              </section>
                </div>
              </details>

              <section id="queue" className="panel queue-panel">
                <div className="section-head">
                  <h2>生成队列</h2>
                  <button className="text-button" type="button">
                    查看全部
                  </button>
                </div>
                <div className="queue-list">
                  {activeJobs.length ? (
                    activeJobs.map((job) => <QueueItem key={job.id} item={job} />)
                  ) : (
                    <div className="empty-mini">暂无任务</div>
                  )}
                </div>
              </section>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}

function QueueItem({ item }: { item: DashboardResponse["jobs"][number] }) {
  const statusText = {
    queued: "排队中",
    running: "制作中",
    succeeded: "已完成",
    failed: "失败",
    expired: "已过期"
  }[item.status];

  return (
    <article className="queue-item">
      <img src={item.coverUrl} alt={item.title} />
      <div className="queue-copy">
        <strong>{item.title}</strong>
        <span>
          {item.durationSeconds === -1 ? "智能" : `${item.durationSeconds}s`}｜{item.resolution}｜{item.ratio}
        </span>
      </div>
      <div className={`queue-status ${item.status}`}>{statusText}</div>
      <div className="queue-progress">
        <span style={{ width: `${item.progress}%` }} />
      </div>
      {item.userMessage ? <p className="queue-note">{item.userMessage}</p> : null}
      {item.errorMessage ? <p className="queue-error">{toUserFacingError(item.errorMessage, "任务处理失败。")}</p> : null}
    </article>
  );
}

function GalleryCard({ item }: { item: DashboardResponse["gallery"][number] }) {
  const [copied, setCopied] = useState(false);
  const hasVideo = Boolean(item.videoUrl);
  const hasReviewNote = Boolean(item.operatorNote || item.userMessage);
  const videoUrl = item.videoUrl ?? "";

  async function copyVideoLink() {
    if (!videoUrl) return;
    await navigator.clipboard.writeText(videoUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article className="gallery-card">
      <div className="thumb">
        {videoUrl ? (
          <video className="gallery-video" controls preload="metadata" poster={item.coverUrl} src={videoUrl} />
        ) : (
          <img src={item.coverUrl} alt={item.title} />
        )}
        {!videoUrl ? (
          <span className="play-mark">
            <Play />
          </span>
        ) : null}
        <span className="duration-mark">{item.durationSeconds === -1 ? "AUTO" : `00:${String(item.durationSeconds).padStart(2, "0")}`}</span>
      </div>
      <div className="gallery-badges">
        <span className={`gallery-badge ${hasVideo ? "live" : "pending"}`}>{hasVideo ? "已发布" : "待发布"}</span>
        {item.operatorName ? <span className="gallery-badge subtle">后台 {item.operatorName}</span> : null}
      </div>
      <h3>{item.title}</h3>
      <p>
        {item.resolution}　{item.ratio}　{formatChinaDateTime(item.createdAt)}
      </p>
      {hasReviewNote ? (
        <div className="gallery-meta">
          {item.externalAccount ? <span>账号 {item.externalAccount}</span> : null}
          {item.sourceTaskUrl ? <span>任务已留痕</span> : null}
          {item.operatorNote ? <span>{item.operatorNote}</span> : null}
          {item.userMessage ? <span>{item.userMessage}</span> : null}
        </div>
      ) : null}
      <div className="gallery-actions">
        {item.videoUrl ? (
          <a className="gallery-action" href={item.videoUrl} target="_blank" rel="noreferrer" aria-label="打开成片">
            <ExternalLink />
            打开
          </a>
        ) : null}
        {item.videoUrl ? (
          <a className="gallery-action" href={item.videoUrl} download aria-label="下载成片">
            <Download />
            下载
          </a>
        ) : null}
        {item.videoUrl ? (
          <button className="gallery-action" type="button" onClick={() => void copyVideoLink()} aria-label="复制成片链接">
            <Copy />
            {copied ? "已复制" : "复制链接"}
          </button>
        ) : null}
        {item.sourceTaskUrl ? (
          <a className="gallery-action" href={item.sourceTaskUrl} target="_blank" rel="noreferrer">
            <ExternalLink />
            打开任务
          </a>
        ) : null}
      </div>
    </article>
  );
}

function normalizeMusicTracks(payload: unknown): MusicTrack[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const tracks: MusicTrack[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const audioUrl = stringValue(record.audio_url ?? record.audioUrl ?? record.url);
    if (!audioUrl) continue;
    tracks.push({
      audioUrl,
      title: stringValue(record.title) || "生成音乐",
      duration: numberValue(record.duration),
      lyrics: stringValue(record.lyrics ?? record.lyric),
      coverUrl: stringValue(record.cover_url ?? record.coverUrl)
    });
  }
  return tracks;
}

function normalizeDoubaoImages(payload: unknown): DoubaoImageResult[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const images: DoubaoImageResult[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const url = stringValue(record.url ?? record.image_url ?? record.imageUrl);
    if (!url) continue;
    images.push({
      url,
      revisedPrompt: stringValue(record.revised_prompt ?? record.revisedPrompt)
    });
  }
  return images;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function trimAssets(assets: MediaAsset[], mode: VideoMode) {
  if (mode === "text") return [];
  if (mode === "first-frame") return assets.filter((asset) => asset.kind === "image").slice(0, 1);
  if (mode === "first-last") return assets.filter((asset) => asset.kind === "image").slice(0, 2);

  const images = assets.filter((asset) => asset.kind === "image").slice(0, 9);
  const videos = assets.filter((asset) => asset.kind === "video").slice(0, 3);
  const audios = assets.filter((asset) => asset.kind === "audio").slice(0, 3);
  return [...images, ...videos, ...audios];
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function providerStatusLabel(mode: DashboardResponse["providerMode"]) {
  if (mode === "doubao2api") return "doubao2api 本地通道";
  if (mode === "seedance") return "Seedance 实时通道";
  return "人工制作通道";
}

function providerSubmitMessage(mode?: DashboardResponse["providerMode"]) {
  if (mode === "doubao2api") return "任务已提交到 doubao2api 本地通道。";
  if (mode === "seedance") return "任务已提交到 Seedance 队列。";
  return "任务已进入制作队列。";
}

function accountStatusTone(account: Doubao2ApiAccountStatus) {
  if (!account.reachable) return "offline";
  if (account.needsCaptcha) return "warn";
  if (account.cooldownUntil && account.cooldownUntil > Date.now()) return "warn";
  if (account.loggedIn) return "live";
  return "idle";
}

function accountStatusText(account: Doubao2ApiAccountStatus) {
  if (!account.reachable) return "服务未连接";
  if (account.needsCaptcha) return "需要人工验证";
  if (account.cooldownUntil && account.cooldownUntil > Date.now()) return `冷却到 ${formatLocalTime(account.cooldownUntil)}`;
  if (account.loginRequiredUntil && account.loginRequiredUntil > Date.now()) return "需要扫码登录";
  if (account.loggedIn) return account.inFlight ? "生成中" : "已登录可用";
  return account.status === "not_ready" ? "待扫码登录" : account.status;
}

function formatLocalTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" });
}
