"use client";

import {
  BadgeCheck,
  Check,
  Clipboard,
  Copy,
  ExternalLink,
  Eye,
  Film,
  FolderOpen,
  Grid3X3,
  Images,
  Loader2,
  Maximize2,
  MessageSquare,
  MonitorPlay,
  Palette,
  Plus,
  RotateCcw,
  Search,
  Send,
  Shirt,
  Sparkles,
  SquareStack,
  ThumbsUp,
  Upload,
  WandSparkles,
  Wrench,
  X
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Image2LanguageToggle, useImage2LanguagePreference } from "@/components/image2-language";
import { localizedCaseText, type Image2Language } from "@/lib/image2-language";
import type {
  Image2WorkbenchData,
  WorkbenchAsset,
  WorkbenchAssetKind,
  WorkbenchCase,
  WorkbenchFeedback,
  WorkbenchFeedbackRating,
  WorkbenchFeedbackStage,
  WorkbenchPromptTemplate,
  WorkbenchPromptTemplateStage,
  WorkbenchReferenceLink
} from "@/lib/image2-workbench-data";

import { CASE_HANDOFF_KEY, CASE_RETURN_KEY, caseReturnUrl, readCasePlan, type CasePlan as CaseHandoff } from '@/lib/image2-plan-protocol';

type WorkbenchView = "workflow" | "matrix" | "templates" | "results" | "cases";
type GeneratedStage = "outfit" | "first-frame";

type GeneratedWorkbenchImage = {
  createdAt: string;
  dataUrl?: string;
  id: string;
  name: string;
  outDir: string;
  prompt: string;
  stage: GeneratedStage;
  assetId?: string;
  src?: string;
};

type GenerationPayload = {
  elapsedSeconds?: number;
  images?: Array<{ dataUrl?: string; name?: string }>;
  outDir?: string;
  sharedAssets?: WorkbenchAsset[];
  error?: string;
};

type FeedbackTarget = {
  assetId: string;
  name: string;
  prompt: string;
  referenceIds: string[];
  stage: WorkbenchFeedbackStage;
  src?: string;
};

type FeedbackPayload = {
  feedback?: WorkbenchFeedback;
  feedbackStats?: Image2WorkbenchData["feedbackStats"];
  error?: string;
};

type AccountAuthMode = "login" | "signup" | "recover";
type AccountOtpMode = "signup" | "recovery" | null;
type SupabaseOtpType = Exclude<AccountOtpMode, null> | "email";

type AccountAuthStatus = {
  message: string;
  tone: "idle" | "busy" | "success" | "error";
};

type Image2AccountSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  user: {
    id: string;
    email?: string;
  };
};

const historyStorageKey = "image2-motion-workbench-history:v2";
const legacyHistoryStorageKey = "image2-motion-workbench-history:v1";
const accountSessionStorageKey = "image2-workbench-team-session:v1";
const sharedAccountSessionStorageKey = "image2-account-session:v1";
const supabaseAuthUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const isSupabaseAuthConfigured = Boolean(supabaseAuthUrl && supabaseAnonKey);
const viewOptions: Array<{ id: WorkbenchView; label: string; icon: typeof Grid3X3 }> = [
  { id: "workflow", label: "流程工作台", icon: SquareStack },
  { id: "matrix", label: "素材矩阵", icon: Grid3X3 },
  { id: "templates", label: "提示词模板", icon: Palette },
  { id: "results", label: "生成结果", icon: Images },
  { id: "cases", label: "案例参考", icon: Sparkles }
];
const assetKindOptions: Array<{ kind: WorkbenchAssetKind; label: string; icon: typeof Images }> = [
  { kind: "person", label: "人物", icon: BadgeCheck },
  { kind: "clothing", label: "服装", icon: Shirt },
  { kind: "scene", label: "场景", icon: MonitorPlay },
  { kind: "motion", label: "动作", icon: Film },
  { kind: "result", label: "结果", icon: Images }
];
const sizeOptions = [
  { value: "1024x1536", label: "竖图 1024x1536" },
  { value: "1024x1024", label: "方图 1024x1024" },
  { value: "1536x1024", label: "横图 1536x1024" }
];
const feedbackReasons = ["人物不像", "服装不准", "场景不融合", "构图不适合动作迁移", "手脚/肢体问题", "画质/水印文字", "操作流程卡点", "其他"];
const feedbackRatingOptions: Array<{ rating: WorkbenchFeedbackRating; label: string; icon: typeof ThumbsUp }> = [
  { rating: "usable", label: "可用", icon: ThumbsUp },
  { rating: "needs-fix", label: "待修", icon: Wrench },
  { rating: "reject", label: "废图", icon: X }
];

const readAccountSession = () => {
  try {
    const raw = window.localStorage.getItem(accountSessionStorageKey) ?? window.localStorage.getItem(sharedAccountSessionStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Image2AccountSession;
    if (!parsed.accessToken || !parsed.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
};

const persistAccountSession = (session: Image2AccountSession) => {
  window.localStorage.setItem(accountSessionStorageKey, JSON.stringify(session));
  window.localStorage.setItem(sharedAccountSessionStorageKey, JSON.stringify(session));
  return session;
};

const clearAccountSession = () => {
  window.localStorage.removeItem(accountSessionStorageKey);
  window.localStorage.removeItem(sharedAccountSessionStorageKey);
};

const supabaseAuthHeaders = (accessToken?: string) => ({
  apikey: supabaseAnonKey,
  "Content-Type": "application/json",
  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
});

const toAccountSession = (data: Record<string, unknown>): Image2AccountSession => {
  const user = data.user as { id?: string; email?: string } | undefined;
  const accessToken = typeof data.access_token === "string" ? data.access_token : "";
  if (!accessToken || !user?.id) throw new Error("登录响应缺少会话信息。");
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : undefined;
  return {
    accessToken,
    refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : undefined,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
    user: {
      id: user.id,
      email: user.email
    }
  };
};

const supabaseAuthRequest = async (path: string, init: RequestInit = {}, accessToken?: string) => {
  if (!isSupabaseAuthConfigured) throw new Error("Supabase 账号入口未配置。");
  const response = await fetch(`${supabaseAuthUrl}/auth/v1/${path}`, {
    ...init,
    headers: {
      ...supabaseAuthHeaders(accessToken),
      ...(init.headers ?? {})
    }
  });
  const text = await response.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { message: text.slice(0, 240) };
    }
  }
  if (!response.ok) {
    throw new Error(String(data.error_description ?? data.msg ?? data.message ?? data.error ?? "账号请求失败。"));
  }
  return data;
};

const signInWithSupabasePassword = async (email: string, password: string) =>
  toAccountSession(
    await supabaseAuthRequest("token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password })
    })
  );

const withAuthRedirect = (path: string, redirectTo?: string) =>
  redirectTo ? `${path}${path.includes("?") ? "&" : "?"}redirect_to=${encodeURIComponent(redirectTo)}` : path;

const getAuthCallbackUrl = (mode: "confirm" | "recovery") => {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/auth/callback?mode=${mode}`;
};

const signUpWithSupabasePassword = async (email: string, password: string, redirectTo?: string) => {
  const data = await supabaseAuthRequest(withAuthRedirect("signup", redirectTo), {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return data.access_token ? toAccountSession(data) : null;
};

const recoverSupabasePassword = async (email: string, redirectTo?: string) => {
  await supabaseAuthRequest(withAuthRedirect("recover", redirectTo), {
    method: "POST",
    body: JSON.stringify({ email })
  });
};

const verifySupabaseEmailCode = async (email: string, token: string, type: SupabaseOtpType) =>
  toAccountSession(
    await supabaseAuthRequest("verify", {
      method: "POST",
      body: JSON.stringify({ email, token, type })
    })
  );

const verifySupabaseSignupCode = async (email: string, token: string) => {
  try {
    return await verifySupabaseEmailCode(email, token, "signup");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/type|otp|token|invalid|verify/i.test(message)) throw error;
    return verifySupabaseEmailCode(email, token, "email");
  }
};

const signOutSupabaseSession = async (accessToken: string) => {
  await supabaseAuthRequest("logout", { method: "POST" }, accessToken);
};

export function Image2Workbench({ initialData }: { initialData: Image2WorkbenchData }) {
  const { language, setLanguage } = useImage2LanguagePreference("zh");
  const [data, setData] = useState(initialData);
  const [accountSession, setAccountSession] = useState<Image2AccountSession | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountOtpCode, setAccountOtpCode] = useState("");
  const [accountOtpMode, setAccountOtpMode] = useState<AccountOtpMode>(null);
  const [accountAuthMode, setAccountAuthMode] = useState<AccountAuthMode>("login");
  const [accountAuthStatus, setAccountAuthStatus] = useState<AccountAuthStatus>({
    message: isSupabaseAuthConfigured ? "正在检查账号..." : "账号入口未配置。",
    tone: "idle"
  });
  const [isAccessCheckComplete, setIsAccessCheckComplete] = useState(!isSupabaseAuthConfigured);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<WorkbenchView>("workflow");
  const [activeAssetKind, setActiveAssetKind] = useState<WorkbenchAssetKind>("person");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => initialSelections(initialData.assets));
  const [outfitTemplateId, setOutfitTemplateId] = useState(() => firstTemplateId(initialData.promptTemplates, "outfit"));
  const [frameTemplateId, setFrameTemplateId] = useState(() => firstTemplateId(initialData.promptTemplates, "first-frame"));
  const [outfitNote, setOutfitNote] = useState("保留人物身份，服装细节准确，画面干净，适合作为后续首帧素材。");
  const [frameNote, setFrameNote] = useState("竖版 9:16，人物全身可迁移，背景真实，主体和服装延续一致。");
  const [size, setSize] = useState("1024x1536");
  const [generating, setGenerating] = useState<GeneratedStage | null>(null);
  const [generationError, setGenerationError] = useState("");
  const [history, setHistory] = useState<GeneratedWorkbenchImage[]>([]);
  const [previewAsset, setPreviewAsset] = useState<WorkbenchAsset | null>(null);
  const [templatePickerStage, setTemplatePickerStage] = useState<WorkbenchPromptTemplateStage | null>(null);
  const [promptModalStage, setPromptModalStage] = useState<GeneratedStage | null>(null);
  const [casePreview, setCasePreview] = useState<WorkbenchCase | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackTarget | null>(null);
  const [copied, setCopied] = useState("");
  const [caseHandoff, setCaseHandoff] = useState<CaseHandoff | null>(null);
  const [useCasePrompt, setUseCasePrompt] = useState(false);
  const [casePlanStatus, setCasePlanStatus] = useState('');
  const updateCasePlan = (patch: Partial<CaseHandoff>) => {
    if (!caseHandoff || caseHandoff.owner !== (readAccountSession()?.user.id ?? null)) return;
    const next = { ...caseHandoff, ...patch };
    setCaseHandoff(next);
    try { window.sessionStorage.setItem(CASE_HANDOFF_KEY, JSON.stringify(next)); setCasePlanStatus('当前方案已暂存，可返回案例继续编辑'); }
    catch { setCasePlanStatus('暂存失败，请先复制完整提示词'); }
  };
  const returnToCase = () => {
    if (!caseHandoff || caseHandoff.owner !== (readAccountSession()?.user.id ?? null)) return;
    try {
      window.sessionStorage.setItem(CASE_RETURN_KEY, JSON.stringify({ ...caseHandoff, updatedAt: new Date().toISOString() }));
      window.location.assign(caseReturnUrl(caseHandoff));
    } catch { setCasePlanStatus('回传失败，请先复制完整提示词'); }
  };
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(CASE_HANDOFF_KEY);
      const plan = readCasePlan(raw ? JSON.parse(raw) : null, readAccountSession()?.user.id ?? null);
      setCaseHandoff(plan); setUseCasePrompt(Boolean(plan));
    } catch { setCaseHandoff(null); setUseCasePrompt(false); }
  }, [accountSession?.user.id]);

  const authHeaders = (session = accountSession): Record<string, string> =>
    session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};

  async function refreshData(sessionOverride = accountSession) {
    const response = await fetch("/api/image2-workbench", {
      cache: "no-store",
      headers: authHeaders(sessionOverride)
    });
    const payload = (await response.json()) as Image2WorkbenchData & { error?: string };
    if (!response.ok) {
      setData(payload);
      throw new Error(payload.error ?? payload.access?.message ?? "刷新失败。");
    }
    setData(payload);
    setSelectedIds((current) => ({ ...initialSelections(payload.assets), ...current }));
    setAccountAuthStatus({
      message: payload.access?.isTeamMember ? "已进入创作界面。" : (payload.access?.message ?? "公开模式，可浏览案例和提示词。"),
      tone: payload.access?.isTeamMember ? "success" : "idle"
    });
    return payload;
  }

  async function restoreTeamSession(session: Image2AccountSession) {
    setAccountSession(session);
    setAccountEmail(session.user.email ?? "");
    try {
      await refreshData(session);
    } catch {
      setAccountAuthStatus({
        message: "当前账号不能进入团队素材库，已切换为公开模式。",
        tone: "idle"
      });
    }
  }

  async function submitAccountAuth(event: FormEvent) {
    event.preventDefault();
    if (!isSupabaseAuthConfigured) return;
    const email = accountEmail.trim();
    const password = accountPassword.trim();

    if (accountOtpMode === "signup") {
      const token = accountOtpCode.trim();
      if (!email || !token) {
        setAccountAuthStatus({ message: "请输入邮箱验证码。", tone: "error" });
        return;
      }
      setAccountAuthStatus({ message: "正在验证邮箱验证码...", tone: "busy" });
      try {
        const session = await verifySupabaseSignupCode(email, token);
        persistAccountSession(session);
        setAccountSession(session);
        setAccountEmail(session.user.email ?? email);
        setAccountPassword("");
        setAccountOtpCode("");
        setAccountOtpMode(null);
        setAccountAuthStatus({ message: "注册并登录成功。", tone: "success" });
        await refreshData(session);
        setIsAuthModalOpen(false);
      } catch (error) {
        setAccountAuthStatus({ message: error instanceof Error ? error.message : "验证码校验失败。", tone: "error" });
      }
      return;
    }

    if (accountOtpMode === "recovery") {
      const token = accountOtpCode.trim();
      if (!email || !token || password.length < 6) {
        setAccountAuthStatus({ message: "请输入验证码和至少 6 位新密码。", tone: "error" });
        return;
      }
      setAccountAuthStatus({ message: "正在验证并重置密码...", tone: "busy" });
      try {
        const session = await verifySupabaseEmailCode(email, token, "recovery");
        await supabaseAuthRequest(
          "user",
          {
            method: "PUT",
            body: JSON.stringify({ password })
          },
          session.accessToken
        );
        persistAccountSession(session);
        setAccountSession(session);
        setAccountEmail(session.user.email ?? email);
        setAccountPassword("");
        setAccountOtpCode("");
        setAccountOtpMode(null);
        setAccountAuthStatus({ message: "密码已重置。", tone: "success" });
      } catch (error) {
        setAccountAuthStatus({ message: error instanceof Error ? error.message : "密码重置失败。", tone: "error" });
      }
      return;
    }

    if (accountAuthMode === "recover") {
      if (!email) {
        setAccountAuthStatus({ message: "请输入要找回密码的邮箱。", tone: "error" });
        return;
      }
      setAccountAuthStatus({ message: "正在发送邮箱验证码...", tone: "busy" });
      try {
        await recoverSupabasePassword(email, getAuthCallbackUrl("recovery"));
        setAccountOtpMode("recovery");
        setAccountOtpCode("");
        setAccountPassword("");
        setAccountAuthStatus({ message: "验证码已发送，请输入验证码并设置新密码。", tone: "success" });
      } catch (error) {
        setAccountAuthStatus({ message: error instanceof Error ? error.message : "验证码发送失败。", tone: "error" });
      }
      return;
    }

    if (!email || password.length < 6) {
      setAccountAuthStatus({ message: "请输入邮箱和至少 6 位密码。", tone: "error" });
      return;
    }

    setAccountAuthStatus({ message: accountAuthMode === "login" ? "正在登录..." : "正在发送注册验证码...", tone: "busy" });
    try {
      const session =
        accountAuthMode === "login"
          ? await signInWithSupabasePassword(email, password)
          : await signUpWithSupabasePassword(email, password, getAuthCallbackUrl("confirm"));
      if (!session) {
        setAccountOtpMode("signup");
        setAccountOtpCode("");
        setAccountAuthStatus({ message: "注册验证码已发送，请查看邮箱并输入验证码。", tone: "success" });
        return;
      }

      persistAccountSession(session);
      setAccountSession(session);
      setAccountPassword("");
      setAccountOtpCode("");
      setAccountOtpMode(null);
      await refreshData(session);
      setIsAuthModalOpen(false);
    } catch (error) {
      setAccountAuthStatus({ message: error instanceof Error ? error.message : "账号请求失败。", tone: "error" });
    }
  }

  async function resendAccountOtp() {
    if (!isSupabaseAuthConfigured || !accountOtpMode) return;
    const email = accountEmail.trim();
    if (!email) {
      setAccountAuthStatus({ message: "请输入邮箱。", tone: "error" });
      return;
    }

    if (accountOtpMode === "signup") {
      const password = accountPassword.trim();
      if (password.length < 6) {
        setAccountAuthStatus({ message: "请先输入至少 6 位密码。", tone: "error" });
        return;
      }
      setAccountAuthStatus({ message: "正在重新发送注册验证码...", tone: "busy" });
      try {
        await signUpWithSupabasePassword(email, password, getAuthCallbackUrl("confirm"));
        setAccountOtpCode("");
        setAccountAuthStatus({ message: "注册验证码已重新发送。", tone: "success" });
      } catch (error) {
        setAccountAuthStatus({ message: error instanceof Error ? error.message : "验证码重新发送失败。", tone: "error" });
      }
      return;
    }

    setAccountAuthStatus({ message: "正在重新发送找回验证码...", tone: "busy" });
    try {
      await recoverSupabasePassword(email, getAuthCallbackUrl("recovery"));
      setAccountOtpCode("");
      setAccountAuthStatus({ message: "找回验证码已重新发送。", tone: "success" });
    } catch (error) {
      setAccountAuthStatus({ message: error instanceof Error ? error.message : "验证码重新发送失败。", tone: "error" });
    }
  }

  async function signOutAccount() {
    const session = accountSession;
    setAccountAuthStatus({ message: "正在退出...", tone: "busy" });
    try {
      if (session?.accessToken) await signOutSupabaseSession(session.accessToken);
    } catch {
      // Local session cleanup still needs to happen when the remote token is already expired.
    }
    clearAccountSession();
    setAccountSession(null);
    setData(initialData);
    setSelectedIds(initialSelections(initialData.assets));
    setAccountPassword("");
    setAccountOtpCode("");
    setAccountOtpMode(null);
    setAccountAuthStatus({ message: "已退出。", tone: "success" });
    window.location.replace("/");
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(historyStorageKey) ?? window.localStorage.getItem(legacyHistoryStorageKey);
      if (raw) setHistory(JSON.parse(raw).slice(0, 24));
      if (!window.localStorage.getItem(historyStorageKey) && window.localStorage.getItem(legacyHistoryStorageKey)) {
        window.localStorage.removeItem(legacyHistoryStorageKey);
      }
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseAuthConfigured) return;
    const saved = readAccountSession();
    if (!saved) {
      setIsAccessCheckComplete(true);
      return;
    }
    void restoreTeamSession(saved).finally(() => setIsAccessCheckComplete(true));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      historyStorageKey,
      JSON.stringify(
        history
          .filter((item) => item.src || item.assetId)
          .slice(0, 24)
          .map((item) => {
            const compact = { ...item };
            delete compact.dataUrl;
            return compact;
          })
      )
    );
  }, [history]);

  const assetsById = useMemo(() => new Map(data.assets.map((asset) => [asset.id, asset])), [data.assets]);
  const assetsByKind = useMemo(() => groupAssetsByKind(data.assets), [data.assets]);
  const feedbackByAssetId = useMemo(() => latestFeedbackByAssetId(data.feedback), [data.feedback]);
  const selectedPerson = selectedIds.person ? assetsById.get(selectedIds.person) : undefined;
  const selectedClothing = selectedIds.clothing ? assetsById.get(selectedIds.clothing) : undefined;
  const selectedScene = selectedIds.scene ? assetsById.get(selectedIds.scene) : undefined;
  const selectedMotion = selectedIds.motion ? assetsById.get(selectedIds.motion) : undefined;
  const selectedResultAsset = selectedIds.result ? assetsById.get(selectedIds.result) : undefined;
  const latestOutfit = history.find((item) => item.stage === "outfit");
  const latestFrame = history.find((item) => item.stage === "first-frame");
  const sharedResults = useMemo(
    () =>
      [...data.assets]
        .filter((item) => item.kind === "result")
        .sort((a, b) => {
          const rank = (item: WorkbenchAsset) => (item.origin === "generated" ? 0 : item.origin === "upload" ? 1 : 2);
          const rankDiff = rank(a) - rank(b);
          if (rankDiff) return rankDiff;
          const timeA = a.createdAt ? Date.parse(a.createdAt) : 0;
          const timeB = b.createdAt ? Date.parse(b.createdAt) : 0;
          return timeB - timeA;
        }),
    [data.assets]
  );
  const outfitTemplate = findTemplate(data.promptTemplates, outfitTemplateId, "outfit");
  const frameTemplate = findTemplate(data.promptTemplates, frameTemplateId, "first-frame");
  const outfitPrompt = useCasePrompt && caseHandoff ? caseHandoff.prompt : buildPrompt(outfitTemplate, {
    person: selectedPerson?.title ?? "人物参考图",
    clothing: selectedClothing?.title ?? "服装参考图",
    outfit: latestOutfit?.name ?? selectedResultAsset?.title ?? "人物穿搭图",
    scene: selectedScene?.title ?? "场景参考图",
    motion: selectedMotion?.title ?? "动作参考",
    note: outfitNote
  });
  const framePrompt = buildPrompt(frameTemplate, {
    person: selectedPerson?.title ?? "人物参考图",
    clothing: selectedClothing?.title ?? "服装参考图",
    outfit: latestOutfit?.name ?? selectedResultAsset?.title ?? "人物穿搭图",
    scene: selectedScene?.title ?? "场景参考图",
    motion: selectedMotion?.title ?? "动作参考",
    note: frameNote
  });
  const filteredAssets = useMemo(
    () => filterAssets(assetsByKind[activeAssetKind] ?? [], query),
    [activeAssetKind, assetsByKind, query]
  );

  function selectAsset(asset: WorkbenchAsset) {
    setSelectedIds((current) => ({ ...current, [asset.kind]: asset.id }));
  }

  function openFeedbackForAsset(asset: WorkbenchAsset) {
    setFeedbackTarget({
      assetId: asset.id,
      name: asset.title,
      prompt: asset.prompt ?? asset.promptHint ?? "",
      referenceIds: [],
      stage: asset.stage ?? "manual",
      src: localImageSrc(asset.previewPath)
    });
    setIsFeedbackOpen(true);
  }

  async function copyText(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1600);
  }

  function applyFeedbackPromptPatch(stage: WorkbenchPromptTemplateStage, patch: string) {
    const normalizedPatch = patch.trim();
    const nextLine = `迭代补丁：${normalizedPatch}`;
    const appendPatch = (current: string) => {
      const trimmed = current.trim();
      if (!normalizedPatch || trimmed.includes(normalizedPatch)) return current;
      return trimmed ? `${trimmed}\n${nextLine}` : nextLine;
    };

    if (stage === "outfit") setOutfitNote(appendPatch);
    if (stage === "first-frame") setFrameNote(appendPatch);
  }

  async function submitFeedback(input: {
    rating: WorkbenchFeedbackRating;
    reasons: string[];
    note: string;
    target: FeedbackTarget;
  }) {
    const response = await fetch("/api/image2-workbench/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        assetId: input.target.assetId,
        stage: input.target.stage,
        rating: input.rating,
        reasons: input.reasons,
        note: input.note,
        prompt: input.target.prompt,
        referenceIds: input.target.referenceIds
      })
    });
    const payload = (await response.json()) as FeedbackPayload;
    if (!response.ok || !payload.feedback || !payload.feedbackStats) throw new Error(payload.error ?? "反馈保存失败。");
    setData((current) => ({
      ...current,
      feedback: [payload.feedback!, ...current.feedback.filter((item) => item.id !== payload.feedback!.id)].slice(0, 500),
      feedbackStats: payload.feedbackStats!
    }));
  }

  async function generate(stage: GeneratedStage) {
    setGenerationError("");
    const isOutfit = stage === "outfit";
    const prompt = isOutfit ? outfitPrompt : framePrompt;
    const referenceIds = isOutfit
      ? [selectedPerson?.id, selectedClothing?.id]
      : [selectedResultAsset?.id, selectedScene?.id, selectedMotion?.id];
    const references =
      !isOutfit && !selectedResultAsset && latestOutfit?.dataUrl ? [{ name: latestOutfit.name, dataUrl: latestOutfit.dataUrl }] : [];

    if (referenceIds.filter(Boolean).length + references.length < 2) {
      setGenerationError(isOutfit ? "请选择人物图和服装图。" : "请选择人物穿搭图和场景图。");
      return;
    }

    setGenerating(stage);
    try {
      const selectedReferenceIds = referenceIds.filter((id): id is string => Boolean(id));
      const response = await fetch("/api/image2-workbench/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          stage,
          prompt,
          size,
          n: 1,
          referenceIds: selectedReferenceIds,
          references
        })
      });
      const payload = (await response.json()) as GenerationPayload;
      if (!response.ok) throw new Error(payload.error ?? "生成失败。");

      const nextImages = (payload.images ?? [])
        .filter((item): item is { dataUrl: string; name?: string } => Boolean(item.dataUrl))
        .map((item, index) => ({
          createdAt: new Date().toISOString(),
          id: `${stage}-${Date.now()}-${index}`,
          name: item.name || (stage === "outfit" ? "人物穿搭图" : "视频首帧图"),
          outDir: payload.outDir || "",
          prompt,
          stage,
          assetId: payload.sharedAssets?.[index]?.id,
          src: payload.sharedAssets?.[index]?.previewPath ? localImageSrc(payload.sharedAssets[index].previewPath) : item.dataUrl
        }));

      if (!nextImages.length) throw new Error("生成完成但没有返回图片。");
      setHistory((current) => [...nextImages, ...current].slice(0, 24));
      if (payload.sharedAssets?.[0]) {
        await refreshData();
        setSelectedIds((current) => ({ ...current, result: payload.sharedAssets![0].id }));
        setFeedbackTarget({
          assetId: payload.sharedAssets[0].id,
          name: payload.sharedAssets[0].title,
          prompt,
          referenceIds: selectedReferenceIds,
          stage,
          src: localImageSrc(payload.sharedAssets[0].previewPath)
        });
        setIsFeedbackOpen(true);
      }
      setActiveView("results");
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "生成失败。");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <main className="image2-workbench">
      <aside className="image2-workbench-sidebar" aria-label="Image2 作图导航">
        <a className="image2-workbench-brand" href="/">
          <span>
            <WandSparkles aria-hidden="true" />
          </span>
          <strong>Image2 作图中控台</strong>
          <small>动作迁移首帧生产线</small>
        </a>
        <Image2LanguageToggle className="image2-workbench-language" language={language} onChange={setLanguage} />

        <nav className="image2-workbench-nav" aria-label="工作台界面">
          {viewOptions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeView === item.id ? "active" : ""}
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="image2-workbench-sidebar-tools" aria-label="作图工具">
          <label>
            <span>出图尺寸</span>
            <select value={size} onChange={(event) => setSize(event.target.value)}>
              {sizeOptions.map((item) => (
                <option value={item.value} key={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setIsUploadOpen(true)}>
            <Upload aria-hidden="true" />
            上传素材
          </button>
          <button type="button" onClick={() => setIsFeedbackOpen(true)}>
            <MessageSquare aria-hidden="true" />
            体验反馈
          </button>
          <button type="button" onClick={() => void refreshData()}>
            <RotateCcw aria-hidden="true" />
            刷新素材
          </button>
        </section>

        <div className="image2-workbench-links">
          {data.referenceLinks.map((item) => (
            <a href={item.href} key={item.href}>
              <FolderOpen aria-hidden="true" />
              <span>
                <strong>{item.label}</strong>
                <small>{item.note}</small>
              </span>
            </a>
          ))}
        </div>
      </aside>

      <section className="image2-workbench-main">
        {caseHandoff ? <section className="case-workbench case-handoff" aria-label="从案例带入的提示词">
          <h2>{caseHandoff.title}</h2>
          <p>完整提示词已带入。参考图链接仅供查看，生成前请在素材矩阵选择你有权使用的输入。</p>
          {caseHandoff.referenceRequired ? <p role="note">需要参考图 · {caseHandoff.inputCompleteness === 'missing' ? '上游缺少输入图，请自行准备。' : '请核对输入图和提示词的对应关系。'}</p> : null}
          <label className="case-workbench-note"><span>案例完整提示词</span>
            <textarea rows={12} aria-label="案例完整提示词" value={caseHandoff.prompt}
              onChange={event => updateCasePlan({ prompt: event.target.value })} />
          </label>
          <label className="case-workbench-note"><span>方案备注</span><textarea aria-label="工作台方案备注" rows={2} value={caseHandoff.note ?? ''} onChange={event => updateCasePlan({ note: event.target.value })} /></label>
          <p>带入偏好：{caseHandoff.aspect || '画幅未知'} · {caseHandoff.resolution || '分辨率未知'} · {caseHandoff.provider || 'McGrox'} / {caseHandoff.model || 'gpt-image-2.5-sunburst'}（生成偏好，未实测）</p>
          {caseHandoff.missingInputs?.length ? <p>仍缺输入：{caseHandoff.missingInputs.join('、')}</p> : null}
          {caseHandoff.constraints?.length ? <details><summary>必须核对的原文约束 · {caseHandoff.constraints.length}</summary>{caseHandoff.constraints.map((line, index) => <p key={index}>{line}</p>)}</details> : null}
          <p role="status">{casePlanStatus}</p>
          {caseHandoff.references.map((reference, index) => <a key={reference.url} href={reference.url} target="_blank" rel="noreferrer">查看上游输入图 {index + 1} </a>)}
          <div className="case-workbench-actions">
            <button type="button" onClick={() => copyText(caseHandoff.prompt, 'case-handoff')}>{copied === 'case-handoff' ? '已复制' : '复制案例完整稿'}</button>
            <button type="button" aria-pressed={useCasePrompt} onClick={() => setUseCasePrompt(current => !current)}>{useCasePrompt ? '恢复穿搭模板' : '使用此稿作为作图提示词'}</button>
            <a href={caseReturnUrl(caseHandoff)} onClick={event => { event.preventDefault(); returnToCase(); }}>返回案例</a>
          </div>
          <p>{useCasePrompt ? '作图提示词采用上方完整稿，未附加穿搭模板。点击生成前请核对所选素材。' : '下方保持已有流程；点击使用此稿可将作图提示词切换到此案例。'}</p>
        </section> : null}
        {activeView === "workflow" ? (
          <WorkflowView
            copied={copied}
            framePrompt={framePrompt}
            frameTemplate={frameTemplate}
            generationError={generationError}
            generating={generating}
            history={history}
            latestFrame={latestFrame}
            latestOutfit={latestOutfit}
            onCopyText={copyText}
            onGenerate={generate}
            onOpenPrompt={setPromptModalStage}
            onOpenTemplate={setTemplatePickerStage}
            onOpenMatrixKind={(kind) => {
              setActiveAssetKind(kind);
              setActiveView("matrix");
            }}
            onPreviewAsset={setPreviewAsset}
            outfitPrompt={outfitPrompt}
            outfitTemplate={outfitTemplate}
            selectedClothing={selectedClothing}
            selectedMotion={selectedMotion}
            selectedPerson={selectedPerson}
            selectedResultAsset={selectedResultAsset}
            selectedScene={selectedScene}
          />
        ) : null}

        {activeView === "matrix" ? (
          <MatrixView
            activeAssetKind={activeAssetKind}
            assetsByKind={assetsByKind}
            filteredAssets={filteredAssets}
            onKindChange={setActiveAssetKind}
            onPreviewAsset={setPreviewAsset}
            onSelectAsset={selectAsset}
            onUpload={() => setIsUploadOpen(true)}
            query={query}
            selectedIds={selectedIds}
            setQuery={setQuery}
          />
        ) : null}

        {activeView === "templates" ? (
          <TemplatesView
            activeFrameTemplateId={frameTemplateId}
            activeOutfitTemplateId={outfitTemplateId}
            frameNote={frameNote}
            onFrameNoteChange={setFrameNote}
            onOutfitNoteChange={setOutfitNote}
            onSelectFrameTemplate={setFrameTemplateId}
            onSelectOutfitTemplate={setOutfitTemplateId}
            outfitNote={outfitNote}
            templates={data.promptTemplates}
          />
        ) : null}

        {activeView === "results" ? (
          <ResultsView
            artifacts={data.artifactPaths}
            history={history}
            latestFrame={latestFrame}
            latestOutfit={latestOutfit}
            feedbackByAssetId={feedbackByAssetId}
            onClear={() => setHistory([])}
            onCopyText={copyText}
            onOpenFeedback={openFeedbackForAsset}
            onSelectResult={(asset) => {
              selectAsset(asset);
              setActiveView("workflow");
            }}
            sharedResults={sharedResults}
          />
        ) : null}

        {activeView === "cases" ? (
          <CasesView cases={data.featuredCases} language={language} onPreview={setCasePreview} />
        ) : null}
      </section>

      {previewAsset ? <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} onSelect={selectAsset} /> : null}

      {templatePickerStage ? (
        <TemplatePickerModal
          activeId={templatePickerStage === "outfit" ? outfitTemplateId : frameTemplateId}
          onClose={() => setTemplatePickerStage(null)}
          onSelect={(id) => {
            if (templatePickerStage === "outfit") setOutfitTemplateId(id);
            else setFrameTemplateId(id);
            setTemplatePickerStage(null);
          }}
          stage={templatePickerStage}
          templates={data.promptTemplates.filter((item) => item.stage === templatePickerStage)}
        />
      ) : null}

      {promptModalStage ? (
        <PromptModal
          copied={copied}
          onClose={() => setPromptModalStage(null)}
          onCopyText={copyText}
          prompt={promptModalStage === "outfit" ? outfitPrompt : framePrompt}
          referenceCount={promptModalStage === "outfit" ? 2 : 3}
          stage={promptModalStage}
          title={promptModalStage === "outfit" ? "人物穿搭图提示词" : "视频首帧图提示词"}
        />
      ) : null}

      {casePreview ? <CasePreviewModal caseItem={casePreview} language={language} onClose={() => setCasePreview(null)} /> : null}

      {isUploadOpen ? (
        <AssetUploadModal
          authHeaders={authHeaders()}
          defaultKind={activeAssetKind}
          onClose={() => setIsUploadOpen(false)}
          onUploaded={async (asset) => {
            await refreshData();
            selectAsset(asset);
            setActiveAssetKind(asset.kind);
            setActiveView("matrix");
            setIsUploadOpen(false);
          }}
        />
      ) : null}

      {isFeedbackOpen ? (
        <FeedbackDrawer
          assetsById={assetsById}
          feedback={data.feedback}
          feedbackStats={data.feedbackStats}
          onClose={() => setIsFeedbackOpen(false)}
          onApplyPromptPatch={applyFeedbackPromptPatch}
          onSubmit={submitFeedback}
          target={feedbackTarget}
        />
      ) : null}
    </main>
  );
}

function PublicWorkbenchGate({
  accountEmail,
  authStatus,
  featuredCases,
  isAuthConfigured,
  isAuthenticated,
  onOpenAuth,
  onSignOut,
  referenceLinks
}: {
  accountEmail: string;
  authStatus: AccountAuthStatus;
  featuredCases: WorkbenchCase[];
  isAuthConfigured: boolean;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onSignOut: () => void;
  referenceLinks: WorkbenchReferenceLink[];
}) {
  return (
    <main className="image2-public-gate">
      <section className="image2-public-panel" aria-label="Image2 公开入口">
        <div className="image2-public-copy">
          <small>Image2 Workbench</small>
          <h1>团队素材库已转入登录白名单</h1>
          <p>外部访问者看到公开入口；团队素材、生成结果和反馈记录只在成员邮箱通过白名单后加载。</p>
          <div className={`image2-public-status ${authStatus.tone}`}>
            <strong>{isAuthenticated ? accountEmail || "已登录账号" : "访客模式"}</strong>
            <span>{isAuthConfigured ? authStatus.message : "当前环境未配置 Supabase 账号入口。"}</span>
          </div>
          <div className="image2-public-actions">
            <button type="button" onClick={onOpenAuth} disabled={!isAuthConfigured}>
              <WandSparkles aria-hidden="true" />
              {isAuthenticated ? "切换团队账号" : "团队成员登录"}
            </button>
            {isAuthenticated ? (
              <button className="ghost" type="button" onClick={onSignOut}>
                退出
              </button>
            ) : null}
          </div>
        </div>

        <div className="image2-public-links">
          {referenceLinks.map((item) => (
            <a href={item.href} key={item.href}>
              <FolderOpen aria-hidden="true" />
              <span>
                <strong>{item.label}</strong>
                <small>{item.note}</small>
              </span>
            </a>
          ))}
        </div>

        <div className="image2-public-cases" aria-label="公开案例参考">
          {featuredCases.slice(0, 4).map((item) => (
            <a href="/image2-cases" key={item.id}>
              <span>{item.categoryLabel}</span>
              <strong>{item.title}</strong>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

function WorkbenchAuthModal({
  authMode,
  authStatus,
  email,
  isConfigured,
  onClose,
  onEmailChange,
  onModeChange,
  onPasswordChange,
  onOtpCodeChange,
  onResendOtp,
  onSubmit,
  otpCode,
  otpMode,
  password
}: {
  authMode: AccountAuthMode;
  authStatus: AccountAuthStatus;
  email: string;
  isConfigured: boolean;
  onClose: () => void;
  onEmailChange: (value: string) => void;
  onModeChange: (mode: AccountAuthMode) => void;
  onPasswordChange: (value: string) => void;
  onOtpCodeChange: (value: string) => void;
  onResendOtp: () => void;
  onSubmit: (event: FormEvent) => void;
  otpCode: string;
  otpMode: AccountOtpMode;
  password: string;
}) {
  const submitLabel =
    otpMode === "signup"
      ? "验证并完成注册"
      : otpMode === "recovery"
        ? "验证并重置密码"
        : authMode === "login"
          ? "登录"
          : authMode === "signup"
            ? "发送注册验证码"
            : "发送找回验证码";
  const showPassword = otpMode === "signup" ? false : authMode !== "recover" || otpMode === "recovery";
  return (
    <ModalShell title="账号登录" kicker="Image2 Account" onClose={onClose}>
      {isConfigured ? (
        <form className="image2-team-auth-form" onSubmit={onSubmit}>
          <div className="image2-team-auth-tabs" role="tablist" aria-label="账号模式">
            {(["login", "signup", "recover"] as AccountAuthMode[]).map((mode) => (
              <button
                aria-pressed={authMode === mode}
                className={authMode === mode ? "active" : ""}
                disabled={Boolean(otpMode)}
                key={mode}
                type="button"
                onClick={() => onModeChange(mode)}
              >
                {mode === "login" ? "登录" : mode === "signup" ? "注册" : "找回密码"}
              </button>
            ))}
          </div>
          <label>
            <span>邮箱</span>
            <input
              autoComplete="email"
              disabled={Boolean(otpMode)}
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
            />
          </label>
          {otpMode ? (
            <label>
              <span>邮箱验证码</span>
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                type="text"
                value={otpCode}
                onChange={(event) => onOtpCodeChange(event.target.value.replace(/\s+/g, ""))}
              />
            </label>
          ) : null}
          {showPassword ? (
            <label>
              <span>{otpMode === "recovery" ? "新密码" : "密码"}</span>
              <input
                autoComplete={otpMode === "recovery" || authMode === "signup" ? "new-password" : "current-password"}
                type="password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
              />
            </label>
          ) : null}
          <p className={`image2-team-auth-status ${authStatus.tone}`}>{authStatus.message}</p>
          <div className="image2-team-auth-actions">
            <button type="button" onClick={onClose}>
              取消
            </button>
            <button className="primary" disabled={authStatus.tone === "busy"} type="submit">
              {authStatus.tone === "busy" ? "处理中" : submitLabel}
            </button>
          </div>
          {otpMode ? (
            <button className="image2-team-auth-link" disabled={authStatus.tone === "busy"} type="button" onClick={onResendOtp}>
              重新发送验证码
            </button>
          ) : null}
        </form>
      ) : (
        <p className="image2-team-auth-status error">账号入口未配置，暂时不能登录。</p>
      )}
    </ModalShell>
  );
}

function WorkflowView(props: {
  copied: string;
  framePrompt: string;
  frameTemplate?: WorkbenchPromptTemplate;
  generationError: string;
  generating: GeneratedStage | null;
  history: GeneratedWorkbenchImage[];
  latestFrame?: GeneratedWorkbenchImage;
  latestOutfit?: GeneratedWorkbenchImage;
  onCopyText: (value: string, key: string) => Promise<void>;
  onGenerate: (stage: GeneratedStage) => Promise<void>;
  onOpenMatrixKind: (kind: WorkbenchAssetKind) => void;
  onOpenPrompt: (stage: GeneratedStage) => void;
  onOpenTemplate: (stage: WorkbenchPromptTemplateStage) => void;
  onPreviewAsset: (asset: WorkbenchAsset) => void;
  outfitPrompt: string;
  outfitTemplate?: WorkbenchPromptTemplate;
  selectedClothing?: WorkbenchAsset;
  selectedMotion?: WorkbenchAsset;
  selectedPerson?: WorkbenchAsset;
  selectedResultAsset?: WorkbenchAsset;
  selectedScene?: WorkbenchAsset;
}) {
  const outfitRefs = [props.selectedPerson, props.selectedClothing].filter(Boolean) as WorkbenchAsset[];
  const frameRefs = [props.selectedResultAsset || props.latestOutfit, props.selectedScene, props.selectedMotion].filter(Boolean);
  const outfitReady = Boolean(props.selectedPerson && props.selectedClothing);
  const frameReady = Boolean((props.latestOutfit || props.selectedResultAsset) && props.selectedScene);

  return (
    <section className="image2-workbench-three-window">
      <div className="image2-workflow-layout">
        <div className="image2-workbench-window reference-window">
          <WindowHead index="01" title="参考篮" subtitle="直接从这里换图，不必回头找入口" />
          <div className="image2-selected-reference-grid">
            <SelectedAssetSlot label="人物图" asset={props.selectedPerson} onPick={() => props.onOpenMatrixKind("person")} onPreview={props.onPreviewAsset} />
            <SelectedAssetSlot label="服装图" asset={props.selectedClothing} onPick={() => props.onOpenMatrixKind("clothing")} onPreview={props.onPreviewAsset} />
            <SelectedAssetSlot label="穿搭 / 主图" asset={props.selectedResultAsset} onPick={() => props.onOpenMatrixKind("result")} onPreview={props.onPreviewAsset} />
            <SelectedAssetSlot label="场景图" asset={props.selectedScene} onPick={() => props.onOpenMatrixKind("scene")} onPreview={props.onPreviewAsset} />
            <SelectedAssetSlot label="动作图" asset={props.selectedMotion} onPick={() => props.onOpenMatrixKind("motion")} onPreview={props.onPreviewAsset} />
          </div>

          <div className="image2-window-note">
            <Check aria-hidden="true" />
            <span>先生成穿搭图，再把穿搭图和场景图组合成首帧。动作图可作为构图和姿态参考。</span>
          </div>
        </div>

        <div className="image2-workbench-window prompt-window">
          <WindowHead index="02" title="生成操作区" subtitle="两步生成固定在中间，少跳转、少找按钮" />
          <GenerationStep
            copied={props.copied}
            disabled={!outfitReady}
            disabledReason="缺人物图或服装图"
            isLoading={props.generating === "outfit"}
            onCopyText={props.onCopyText}
            onGenerate={() => props.onGenerate("outfit")}
            onOpenPrompt={() => props.onOpenPrompt("outfit")}
            onOpenTemplate={() => props.onOpenTemplate("outfit")}
            prompt={props.outfitPrompt}
            referenceCount={outfitRefs.length}
            stage="outfit"
            stepLabel="步骤一"
            template={props.outfitTemplate}
            title="人物穿搭图"
          />
          <GenerationStep
            copied={props.copied}
            disabled={!frameReady}
            disabledReason="缺穿搭图或场景图"
            isLoading={props.generating === "first-frame"}
            onCopyText={props.onCopyText}
            onGenerate={() => props.onGenerate("first-frame")}
            onOpenPrompt={() => props.onOpenPrompt("first-frame")}
            onOpenTemplate={() => props.onOpenTemplate("first-frame")}
            prompt={props.framePrompt}
            referenceCount={frameRefs.length}
            stage="first-frame"
            stepLabel="步骤二"
            template={props.frameTemplate}
            title="视频首帧图"
          />
          {props.generationError ? <p className="image2-generation-error">{props.generationError}</p> : null}
        </div>

        <div className="image2-workbench-window result-window">
          <WindowHead index="03" title="结果托盘" subtitle="最新产物在右侧停留，方便接着做下一步" />
          <div className="image2-current-results">
            <GeneratedPreview title="最新穿搭图" image={props.latestOutfit} empty="生成后自动作为首帧参考" />
            <GeneratedPreview title="最新首帧图" image={props.latestFrame} empty="首帧会进入动作迁移复盘" />
          </div>
          <div className="image2-result-history-strip">
            {props.history.slice(0, 5).map((item) => (
              <img alt={item.name} key={item.id} src={generatedImageSrc(item)} />
            ))}
            {!props.history.length ? <span>暂无生成历史</span> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function MatrixView(props: {
  activeAssetKind: WorkbenchAssetKind;
  assetsByKind: Record<WorkbenchAssetKind, WorkbenchAsset[]>;
  filteredAssets: WorkbenchAsset[];
  onKindChange: (kind: WorkbenchAssetKind) => void;
  onPreviewAsset: (asset: WorkbenchAsset) => void;
  onSelectAsset: (asset: WorkbenchAsset) => void;
  onUpload: () => void;
  query: string;
  selectedIds: Record<WorkbenchAssetKind, string>;
  setQuery: (value: string) => void;
}) {
  return (
    <section className="image2-workbench-section">
      <SectionHead title="素材矩阵" subtitle="按人物、服装、场景、动作、结果分类，点卡片即加入当前流程。" />
      <div className="image2-matrix-toolbar">
        <div className="image2-asset-kind-tabs">
          {assetKindOptions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={props.activeAssetKind === item.kind ? "active" : ""}
                key={item.kind}
                type="button"
                onClick={() => props.onKindChange(item.kind)}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
                <b>{props.assetsByKind[item.kind]?.length ?? 0}</b>
              </button>
            );
          })}
        </div>
        <div className="image2-matrix-actions">
          <label className="image2-search-field">
            <Search aria-hidden="true" />
            <input placeholder="搜索素材名称、标签、备注" value={props.query} onChange={(event) => props.setQuery(event.target.value)} />
          </label>
          <button type="button" onClick={props.onUpload}>
            <Upload aria-hidden="true" />
            上传素材
          </button>
        </div>
      </div>
      <AssetGrid
        assets={props.filteredAssets}
        onPreview={props.onPreviewAsset}
        onSelect={props.onSelectAsset}
        selectedId={props.selectedIds[props.activeAssetKind]}
      />
    </section>
  );
}

function TemplatesView(props: {
  activeFrameTemplateId: string;
  activeOutfitTemplateId: string;
  frameNote: string;
  onFrameNoteChange: (value: string) => void;
  onOutfitNoteChange: (value: string) => void;
  onSelectFrameTemplate: (id: string) => void;
  onSelectOutfitTemplate: (id: string) => void;
  outfitNote: string;
  templates: WorkbenchPromptTemplate[];
}) {
  return (
    <section className="image2-workbench-section">
      <SectionHead title="提示词模板" subtitle="团队成员先选模板，再补少量备注，不需要从空白提示词开始。" />
      <div className="image2-template-columns">
        <TemplateColumn
          activeId={props.activeOutfitTemplateId}
          note={props.outfitNote}
          onNoteChange={props.onOutfitNoteChange}
          onSelect={props.onSelectOutfitTemplate}
          stage="outfit"
          templates={props.templates.filter((item) => item.stage === "outfit")}
          title="人物穿搭图模板"
        />
        <TemplateColumn
          activeId={props.activeFrameTemplateId}
          note={props.frameNote}
          onNoteChange={props.onFrameNoteChange}
          onSelect={props.onSelectFrameTemplate}
          stage="first-frame"
          templates={props.templates.filter((item) => item.stage === "first-frame")}
          title="视频首帧图模板"
        />
      </div>
    </section>
  );
}

function ResultsView(props: {
  artifacts: Image2WorkbenchData["artifactPaths"];
  feedbackByAssetId: Map<string, WorkbenchFeedback>;
  history: GeneratedWorkbenchImage[];
  latestFrame?: GeneratedWorkbenchImage;
  latestOutfit?: GeneratedWorkbenchImage;
  onClear: () => void;
  onCopyText: (value: string, key: string) => Promise<void>;
  onOpenFeedback: (asset: WorkbenchAsset) => void;
  onSelectResult: (asset: WorkbenchAsset) => void;
  sharedResults: WorkbenchAsset[];
}) {
  const artifactCards = [
    { title: "当前主图", path: props.artifacts.mainImage },
    { title: "9 条成片总览", path: props.artifacts.contactSheet },
    { title: "中帧复盘图", path: props.artifacts.middleFrameGrid }
  ].filter((item): item is { title: string; path: string } => Boolean(item.path));

  return (
    <section className="image2-workbench-section">
      <SectionHead title="生成结果" subtitle="这里保留浏览器本地生成历史，以及当前项目沉淀的复盘图。" />
      <div className="image2-results-layout">
        <div className="image2-results-history">
          <div className="image2-results-toolbar">
            <strong>本地生成历史</strong>
            <button type="button" onClick={props.onClear}>
              <X aria-hidden="true" />
              清空
            </button>
          </div>
          <div className="image2-history-grid">
            {props.history.length ? (
              props.history.map((item) => (
                <article className="image2-history-card" key={item.id}>
                  <img alt={item.name} src={generatedImageSrc(item)} />
                  <div>
                    <span>{item.stage === "outfit" ? "人物穿搭图" : "视频首帧图"}</span>
                    <strong>{item.name}</strong>
                    {item.assetId ? <FeedbackBadge feedback={props.feedbackByAssetId.get(item.assetId)} /> : null}
                    <button type="button" onClick={() => props.onCopyText(item.prompt, item.id)}>
                      <Copy aria-hidden="true" />
                      复制提示词
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="image2-empty-state">还没有生成记录</div>
            )}
          </div>
          <div className="image2-shared-results">
            <div className="image2-results-toolbar">
              <strong>团队结果库</strong>
              <span>{props.sharedResults.length} 条</span>
            </div>
            <div className="image2-shared-results-grid">
              {props.sharedResults.length ? (
                props.sharedResults.slice(0, 12).map((asset) => (
                  <button
                    aria-label={`选用 ${asset.title} 作为穿搭/主图`}
                    className="image2-shared-result-card"
                    key={asset.id}
                    type="button"
                    onClick={() => props.onSelectResult(asset)}
                  >
                    <img alt={asset.title} src={localImageSrc(asset.previewPath)} />
                    <div>
                      <span>{asset.stage === "first-frame" ? "首帧图" : "穿搭图"}</span>
                      <strong>{asset.title}</strong>
                      <FeedbackBadge feedback={props.feedbackByAssetId.get(asset.id)} />
                      <small>{asset.subtitle}</small>
                      <em
                        onClick={(event) => {
                          event.stopPropagation();
                          props.onOpenFeedback(asset);
                        }}
                      >
                        反馈
                      </em>
                    </div>
                  </button>
                ))
              ) : (
                <div className="image2-empty-state">团队生成的结果会自动沉淀到这里</div>
              )}
            </div>
          </div>
        </div>
        <aside className="image2-artifact-panel">
          <strong>项目沉淀图</strong>
          <div>
            {artifactCards.map((item) => (
              <figure key={item.title}>
                <img alt={item.title} src={localImageSrc(item.path)} />
                <figcaption>{item.title}</figcaption>
              </figure>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function CasesView({
  cases,
  language,
  onPreview
}: {
  cases: WorkbenchCase[];
  language: Image2Language;
  onPreview: (item: WorkbenchCase) => void;
}) {
  return (
    <section className="image2-workbench-section">
      <SectionHead title="案例参考" subtitle="从现有 Image2 案例库抽取高分案例，用来给团队找构图和提示词结构。" />
      <div className="image2-case-strip">
        {cases.map((item) => {
          const copy = localizedCaseText(item, language);
          return (
            <button className="image2-case-card" key={item.id} type="button" onClick={() => onPreview(item)}>
              <img alt={copy.imageAlt} src={caseImageSrc(item.imageUrl)} />
              <span>{copy.valueTier || item.valueTier} · {item.valueScore}</span>
              <strong>{copy.title}</strong>
              <em>{copy.titleSecondary}</em>
              <p>{copy.promptPreview}</p>
              <small>{copy.categoryLabel}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FeedbackDrawer({
  assetsById,
  feedback,
  feedbackStats,
  onClose,
  onApplyPromptPatch,
  onSubmit,
  target
}: {
  assetsById: Map<string, WorkbenchAsset>;
  feedback: WorkbenchFeedback[];
  feedbackStats: Image2WorkbenchData["feedbackStats"];
  onClose: () => void;
  onApplyPromptPatch: (stage: WorkbenchPromptTemplateStage, patch: string) => void;
  onSubmit: (input: { rating: WorkbenchFeedbackRating; reasons: string[]; note: string; target: FeedbackTarget }) => Promise<void>;
  target: FeedbackTarget | null;
}) {
  const [rating, setRating] = useState<WorkbenchFeedbackRating>("usable");
  const [reasons, setReasons] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const targetAsset = target ? assetsById.get(target.assetId) : undefined;
  const targetImage = target?.src ?? (targetAsset?.previewPath ? localImageSrc(targetAsset.previewPath) : "");
  const insights = useMemo(() => buildFeedbackInsights(feedback), [feedback]);

  useEffect(() => {
    setRating("usable");
    setReasons([]);
    setNote("");
    setError("");
    setSaved("");
  }, [target?.assetId]);

  function toggleReason(reason: string) {
    setReasons((current) => (current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason]));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!target) {
      setError("生成或选择一张结果图后再提交反馈。");
      return;
    }
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await onSubmit({ rating, reasons, note, target });
      setSaved("反馈已记录，我会把这些卡点用于下一轮迭代。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "反馈保存失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="image2-feedback-drawer" aria-label="体验反馈">
      <button className="image2-feedback-backdrop" type="button" aria-label="关闭体验反馈" onClick={onClose} />
      <section className="image2-feedback-panel">
        <header>
          <div>
            <small>Iteration Loop</small>
            <h2>体验反馈</h2>
          </div>
          <button type="button" aria-label="关闭体验反馈" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="image2-feedback-stats">
          <div>
            <strong>{feedbackStats.total}</strong>
            <span>全部反馈</span>
          </div>
          <div>
            <strong>{feedbackStats.usable}</strong>
            <span>可用</span>
          </div>
          <div>
            <strong>{feedbackStats.needsFix}</strong>
            <span>待修</span>
          </div>
          <div>
            <strong>{feedbackStats.reject}</strong>
            <span>废图</span>
          </div>
        </div>

        <div className="image2-feedback-insights">
          <div>
            <small>下一轮优先追问</small>
            <strong>{insights.focus}</strong>
            <p>{insights.question}</p>
          </div>
          <div className="image2-feedback-reason-bars">
            {insights.reasons.length ? (
              insights.reasons.map((item) => (
                <article key={item.reason}>
                  <span>{item.reason}</span>
                  <b>{item.count}</b>
                  <i style={{ width: `${item.percent}%` }} />
                </article>
              ))
            ) : (
              <p>提交几条反馈后，这里会自动出现最该优先处理的问题。</p>
            )}
          </div>
          {insights.outfitPatch || insights.framePatch ? (
            <div className="image2-feedback-patches">
              <span>提示词补丁</span>
              <div>
                {insights.outfitPatch ? (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyPromptPatch("outfit", insights.outfitPatch);
                      setSaved("已应用到人物穿搭图补充要求。");
                    }}
                  >
                    <WandSparkles aria-hidden="true" />
                    应用到穿搭备注
                  </button>
                ) : null}
                {insights.framePatch ? (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyPromptPatch("first-frame", insights.framePatch);
                      setSaved("已应用到视频首帧图补充要求。");
                    }}
                  >
                    <Film aria-hidden="true" />
                    应用到首帧备注
                  </button>
                ) : null}
              </div>
              <p>{insights.outfitPatch || insights.framePatch}</p>
            </div>
          ) : null}
        </div>

        <form className="image2-feedback-form" onSubmit={submit}>
          <div className="image2-feedback-target">
            {targetImage ? <img alt={target?.name ?? "反馈目标"} src={targetImage} /> : <div />}
            <span>{target ? (target.stage === "first-frame" ? "视频首帧图" : target.stage === "outfit" ? "人物穿搭图" : "手动反馈") : "等待生成结果"}</span>
            <strong>{target?.name ?? "出图后这里会自动关联最新结果"}</strong>
          </div>

          <div className="image2-feedback-rating">
            {feedbackRatingOptions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={rating === item.rating ? `active ${item.rating}` : item.rating}
                  key={item.rating}
                  type="button"
                  onClick={() => setRating(item.rating)}
                >
                  <Icon aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="image2-feedback-reasons">
            {feedbackReasons.map((reason) => (
              <button className={reasons.includes(reason) ? "active" : ""} key={reason} type="button" onClick={() => toggleReason(reason)}>
                {reason}
              </button>
            ))}
          </div>

          <label className="image2-feedback-note">
            <span>补充一句</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="比如：人物脸偏成熟，服装领口不像，场景透视可以但脚被切掉。" />
          </label>

          {error ? <p className="image2-feedback-message error">{error}</p> : null}
          {saved ? <p className="image2-feedback-message">{saved}</p> : null}

          <div className="image2-feedback-actions">
            <button type="button" onClick={onClose}>
              跳过
            </button>
            <button className="primary" disabled={busy || !target} type="submit">
              <Send aria-hidden="true" />
              {busy ? "记录中" : "提交反馈"}
            </button>
          </div>
        </form>

        <div className="image2-feedback-recent">
          <strong>最近反馈</strong>
          {feedback.slice(0, 8).length ? (
            feedback.slice(0, 8).map((item) => (
              <article key={item.id}>
                <FeedbackBadge feedback={item} />
                <span>{assetsById.get(item.assetId)?.title ?? item.assetId}</span>
                <small>{item.reasons.length ? item.reasons.join(" / ") : "未选择原因"}</small>
              </article>
            ))
          ) : (
            <p>还没有反馈。下一张生成图会自动问你。</p>
          )}
        </div>

        {insights.reworkItems.length ? (
          <div className="image2-feedback-rework">
            <strong>待修样本</strong>
            {insights.reworkItems.map((item) => (
              <article key={item.id}>
                <FeedbackBadge feedback={item} />
                <span>{assetsById.get(item.assetId)?.title ?? item.assetId}</span>
                <small>{item.reasons.length ? item.reasons.join(" / ") : item.note || "待补充原因"}</small>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </aside>
  );
}

function FeedbackBadge({ feedback }: { feedback?: WorkbenchFeedback }) {
  if (!feedback) return <span className="image2-feedback-badge muted">未反馈</span>;
  return <span className={`image2-feedback-badge ${feedback.rating}`}>{feedbackRatingLabel(feedback.rating)}</span>;
}

function WindowHead({ index, title, subtitle }: { index: string; title: string; subtitle: string }) {
  return (
    <header className="image2-window-head">
      <span>{index}</span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="image2-section-head">
      <div>
        <p>Image2 Workbench</p>
        <h2>{title}</h2>
      </div>
      <span>{subtitle}</span>
    </header>
  );
}

function SelectedAssetSlot({
  asset,
  label,
  onPick,
  onPreview
}: {
  asset?: WorkbenchAsset;
  label: string;
  onPick: () => void;
  onPreview: (asset: WorkbenchAsset) => void;
}) {
  return (
    <article className={asset ? "image2-selected-slot filled" : "image2-selected-slot empty"}>
      {asset ? (
        <>
          <img alt={asset.title} src={localImageSrc(asset.previewPath)} />
          <div>
            <span>{label}</span>
            <strong>{asset.title}</strong>
            <small>{asset.subtitle}</small>
          </div>
          <div className="image2-selected-actions">
            <button type="button" onClick={() => onPreview(asset)} aria-label={`查看${asset.title}`}>
              <Maximize2 aria-hidden="true" />
              查看
            </button>
            <button type="button" onClick={onPick}>
              <Search aria-hidden="true" />
              换图
            </button>
          </div>
        </>
      ) : (
        <button className="image2-selected-empty" type="button" onClick={onPick}>
          <Plus aria-hidden="true" />
          <span>{label}</span>
          <small>点击选择</small>
        </button>
      )}
    </article>
  );
}

function GenerationStep(props: {
  copied: string;
  disabled: boolean;
  disabledReason: string;
  isLoading: boolean;
  onCopyText: (value: string, key: string) => Promise<void>;
  onGenerate: () => void;
  onOpenPrompt: () => void;
  onOpenTemplate: () => void;
  prompt: string;
  referenceCount: number;
  stage: WorkbenchPromptTemplateStage;
  stepLabel: string;
  template?: WorkbenchPromptTemplate;
  title: string;
}) {
  const copyKey = `${props.title}-prompt`;
  const quality = buildPromptQualityCheck(props.stage, props.prompt, props.referenceCount);
  return (
    <article className="image2-generation-step">
      <div className="image2-generation-step-head">
        <div>
          <span>{props.stepLabel}</span>
          <h3>{props.title}</h3>
          <p>{props.template?.title ?? "未选择模板"} · {props.referenceCount} 张参考图</p>
        </div>
        <div className="image2-step-head-actions">
          {props.disabled ? <em>{props.disabledReason}</em> : <em className="ready">可生成</em>}
          <button type="button" onClick={props.onOpenTemplate}>
            <Palette aria-hidden="true" />
            模板
          </button>
        </div>
      </div>
      <PromptQualityMeter check={quality} />
      <pre>{props.prompt}</pre>
      <div className="image2-generation-actions">
        <button type="button" onClick={props.onOpenPrompt}>
          <Eye aria-hidden="true" />
          放大检查
        </button>
        <button type="button" onClick={() => props.onCopyText(props.prompt, copyKey)}>
          <Clipboard aria-hidden="true" />
          {props.copied === copyKey ? "已复制" : "复制"}
        </button>
        <button className="primary" disabled={props.disabled || props.isLoading} type="button" onClick={props.onGenerate}>
          {props.isLoading ? <Loader2 className="spin" aria-hidden="true" /> : <WandSparkles aria-hidden="true" />}
          {props.isLoading ? "生成中" : "生成图片"}
        </button>
      </div>
    </article>
  );
}

function GeneratedPreview({ empty, image, title }: { empty: string; image?: GeneratedWorkbenchImage; title: string }) {
  return (
    <article className="image2-generated-preview">
      <span>{title}</span>
      {image ? (
        <>
          <img alt={image.name} src={generatedImageSrc(image)} />
          <strong>{image.name}</strong>
        </>
      ) : (
        <div>
          <Images aria-hidden="true" />
          <p>{empty}</p>
        </div>
      )}
    </article>
  );
}

function AssetGrid({
  assets,
  onPreview,
  onSelect,
  selectedId
}: {
  assets: WorkbenchAsset[];
  onPreview: (asset: WorkbenchAsset) => void;
  onSelect: (asset: WorkbenchAsset) => void;
  selectedId?: string;
}) {
  return (
    <div className="image2-asset-grid">
      {assets.length ? (
        assets.map((asset) => (
          <article className={selectedId === asset.id ? "image2-asset-card active" : "image2-asset-card"} key={asset.id}>
            <button className="image2-asset-select" type="button" onClick={() => onSelect(asset)}>
              <img alt={asset.title} src={localImageSrc(asset.previewPath)} />
              <span>{asset.group}</span>
              <strong>{asset.title}</strong>
              <small>{asset.subtitle}</small>
            </button>
            <button className="image2-asset-preview" type="button" onClick={() => onPreview(asset)} aria-label={`预览${asset.title}`}>
              <Maximize2 aria-hidden="true" />
            </button>
          </article>
        ))
      ) : (
        <div className="image2-empty-state">没有匹配素材</div>
      )}
    </div>
  );
}

function TemplateColumn(props: {
  activeId: string;
  note: string;
  onNoteChange: (value: string) => void;
  onSelect: (id: string) => void;
  stage: WorkbenchPromptTemplateStage;
  templates: WorkbenchPromptTemplate[];
  title: string;
}) {
  const activeTemplate = findTemplate(props.templates, props.activeId, props.stage);
  const quality = buildPromptQualityCheck(props.stage, [activeTemplate?.prompt ?? "", props.note].filter(Boolean).join("\n"), 2);
  return (
    <article className="image2-template-column">
      <h3>{props.title}</h3>
      <div>
        {props.templates.map((item) => (
          <button
            className={props.activeId === item.id ? "active" : ""}
            key={item.id}
            type="button"
            onClick={() => props.onSelect(item.id)}
          >
            <strong>{item.title}</strong>
            <span>{item.summary}</span>
          </button>
        ))}
      </div>
      <PromptQualityMeter check={quality} compact />
      <label>
        <span>{props.stage === "outfit" ? "穿搭图补充要求" : "首帧图补充要求"}</span>
        <textarea value={props.note} onChange={(event) => props.onNoteChange(event.target.value)} />
      </label>
    </article>
  );
}

function AssetPreviewModal({
  asset,
  onClose,
  onSelect
}: {
  asset: WorkbenchAsset;
  onClose: () => void;
  onSelect: (asset: WorkbenchAsset) => void;
}) {
  return (
    <ModalShell title={asset.title} kicker={`${asset.group} · ${asset.id}`} onClose={onClose}>
      <div className="image2-asset-modal">
        <img alt={asset.title} src={localImageSrc(asset.previewPath)} />
        <div>
          <p>{asset.note}</p>
          <small>{asset.promptHint}</small>
          <div className="image2-tag-row">{asset.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <button
            className="image2-modal-primary"
            type="button"
            onClick={() => {
              onSelect(asset);
              onClose();
            }}
          >
            <Check aria-hidden="true" />
            选入当前流程
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function TemplatePickerModal({
  activeId,
  onClose,
  onSelect,
  stage,
  templates
}: {
  activeId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  stage: WorkbenchPromptTemplateStage;
  templates: WorkbenchPromptTemplate[];
}) {
  return (
    <ModalShell title={stage === "outfit" ? "选择人物穿搭图模板" : "选择视频首帧图模板"} kicker="Prompt Template" onClose={onClose}>
      <div className="image2-template-picker">
        {templates.map((item) => (
          <button className={activeId === item.id ? "active" : ""} key={item.id} type="button" onClick={() => onSelect(item.id)}>
            <strong>{item.title}</strong>
            <span>{item.summary}</span>
            <p>{item.prompt}</p>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

function PromptModal({
  copied,
  onClose,
  onCopyText,
  prompt,
  referenceCount,
  stage,
  title
}: {
  copied: string;
  onClose: () => void;
  onCopyText: (value: string, key: string) => Promise<void>;
  prompt: string;
  referenceCount: number;
  stage: WorkbenchPromptTemplateStage;
  title: string;
}) {
  const quality = buildPromptQualityCheck(stage, prompt, referenceCount);
  return (
    <ModalShell title={title} kicker="Prompt Check" onClose={onClose}>
      <div className="image2-prompt-modal">
        <PromptQualityMeter check={quality} />
        <pre>{prompt}</pre>
        <button type="button" onClick={() => onCopyText(prompt, title)}>
          <Copy aria-hidden="true" />
          {copied === title ? "已复制" : "复制完整提示词"}
        </button>
      </div>
    </ModalShell>
  );
}

function CasePreviewModal({
  caseItem,
  language,
  onClose
}: {
  caseItem: WorkbenchCase;
  language: Image2Language;
  onClose: () => void;
}) {
  const copy = localizedCaseText(caseItem, language);
  return (
    <ModalShell title={copy.title} kicker={`${copy.categoryLabel} · ${copy.valueTier || caseItem.valueTier}`} onClose={onClose}>
      <div className="image2-case-modal">
        <img alt={copy.imageAlt} src={caseImageSrc(caseItem.imageUrl)} />
        <div>
          <strong>{caseItem.valueScore} 分参考案例</strong>
          <em>{copy.titleSecondary}</em>
          <p>{copy.promptPreview}</p>
          <small>{copy.promptPreviewSecondary}</small>
          <a href="/image2-cases">
            <ExternalLink aria-hidden="true" />
            打开完整案例库
          </a>
        </div>
      </div>
    </ModalShell>
  );
}

function AssetUploadModal({
  authHeaders,
  defaultKind,
  onClose,
  onUploaded
}: {
  authHeaders: HeadersInit;
  defaultKind: WorkbenchAssetKind;
  onClose: () => void;
  onUploaded: (asset: WorkbenchAsset) => Promise<void>;
}) {
  const [kind, setKind] = useState<WorkbenchAssetKind>(defaultKind);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setKind(defaultKind);
  }, [defaultKind]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("先选一张图片再上传。");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      formData.append("title", title.trim());
      formData.append("note", note.trim());
      formData.append("tags", tags.trim());
      const response = await fetch("/api/image2-workbench/assets", {
        method: "POST",
        headers: authHeaders,
        body: formData
      });
      const payload = (await response.json()) as { asset?: WorkbenchAsset; error?: string };
      if (!response.ok || !payload.asset) throw new Error(payload.error ?? "上传失败。");
      await onUploaded(payload.asset);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "上传失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="上传团队素材" kicker="Asset Upload" onClose={onClose}>
      <form className="image2-upload-modal" onSubmit={submit}>
        <div className="image2-upload-grid">
          <label>
            <span>分类</span>
            <select value={kind} onChange={(event) => setKind(event.target.value as WorkbenchAssetKind)}>
              {assetKindOptions.map((item) => (
                <option key={item.kind} value={item.kind}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>标题</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="上传后显示的名称" />
          </label>
          <label className="wide">
            <span>备注</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="比如：适合哪类场景、为什么值得保留。" />
          </label>
          <label className="wide">
            <span>标签</span>
            <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="人物, 白底, 返图" />
          </label>
          <label className="wide">
            <span>图片文件</span>
            <input
              accept="image/png,image/jpeg,image/webp"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {file ? (
          <div className="image2-upload-preview">
            {previewUrl ? <img alt={file.name} src={previewUrl} /> : <div aria-hidden="true" className="image2-upload-preview-empty" />}
            <div>
              <strong>{file.name}</strong>
              <small>{Math.round(file.size / 1024)} KB</small>
            </div>
          </div>
        ) : null}

        {error ? <p className="image2-upload-error">{error}</p> : null}

        <div className="image2-upload-actions">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary" disabled={busy} type="submit">
            {busy ? "上传中" : "保存到共享库"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({
  children,
  kicker,
  onClose,
  title
}: {
  children: ReactNode;
  kicker: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <section className="image2-modal-layer" aria-label={title}>
      <button className="image2-modal-backdrop" type="button" aria-label="关闭弹窗" onClick={onClose} />
      <div className="image2-modal-panel" role="dialog" aria-modal="true">
        <header>
          <div>
            <small>{kicker}</small>
            <h2>{title}</h2>
          </div>
          <button type="button" aria-label="关闭弹窗" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </section>
  );
}

function generatedImageSrc(image: GeneratedWorkbenchImage) {
  return image.src || image.dataUrl || "";
}

function initialSelections(assets: WorkbenchAsset[]) {
  return assetKindOptions.reduce(
    (acc, item) => ({
      ...acc,
      [item.kind]: assets.find((asset) => asset.kind === item.kind)?.id ?? ""
    }),
    {} as Record<WorkbenchAssetKind, string>
  );
}

function firstTemplateId(templates: WorkbenchPromptTemplate[], stage: WorkbenchPromptTemplateStage) {
  return templates.find((item) => item.stage === stage)?.id ?? "";
}

function findTemplate(templates: WorkbenchPromptTemplate[], id: string, stage: WorkbenchPromptTemplateStage) {
  return templates.find((item) => item.id === id) ?? templates.find((item) => item.stage === stage);
}

function groupAssetsByKind(assets: WorkbenchAsset[]) {
  return assetKindOptions.reduce(
    (acc, item) => ({
      ...acc,
      [item.kind]: assets.filter((asset) => asset.kind === item.kind)
    }),
    {} as Record<WorkbenchAssetKind, WorkbenchAsset[]>
  );
}

function latestFeedbackByAssetId(feedback: WorkbenchFeedback[]) {
  const byId = new Map<string, WorkbenchFeedback>();
  for (const item of feedback) {
    const current = byId.get(item.assetId);
    if (!current || Date.parse(item.createdAt) > Date.parse(current.createdAt)) byId.set(item.assetId, item);
  }
  return byId;
}

function feedbackRatingLabel(rating: WorkbenchFeedbackRating) {
  if (rating === "usable") return "可用";
  if (rating === "needs-fix") return "待修";
  return "废图";
}

function buildFeedbackInsights(feedback: WorkbenchFeedback[]) {
  const actionable = feedback.filter((item) => item.rating !== "usable");
  const reasonCounts = new Map<string, number>();
  for (const item of actionable) {
    const reasons = item.reasons.length ? item.reasons : ["其他"];
    for (const reason of reasons) reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  }
  const maxCount = Math.max(1, ...reasonCounts.values());
  const reasons = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({
      count,
      percent: Math.max(12, Math.round((count / maxCount) * 100)),
      reason
    }));
  const topReason = reasons[0]?.reason;
  const focus = topReason ? `${topReason} 优先` : "先收集 3 条真实反馈";
  const question = topReason
    ? feedbackQuestionForReason(topReason)
    : "下一轮出图后，我会先问你这张图是可用、待修还是废图，再记录具体原因。";
  const topReasons = reasons.map((item) => item.reason);
  return {
    focus,
    framePatch: buildPromptPatch(topReasons, "first-frame"),
    outfitPatch: buildPromptPatch(topReasons, "outfit"),
    question,
    reasons,
    reworkItems: actionable.slice(0, 5)
  };
}

function feedbackQuestionForReason(reason: string) {
  const questions: Record<string, string> = {
    人物不像: "下一轮我会重点问：脸型、发型、年龄感，哪个最先失真？",
    服装不准: "下一轮我会重点问：版型、颜色、材质、领口袖口，哪一处最影响复用？",
    场景不融合: "下一轮我会重点问：光线、透视、人物落地感，哪一项最不自然？",
    构图不适合动作迁移: "下一轮我会重点问：人物是否全身可见、运动方向是否留白、头手脚有没有被切。",
    "手脚/肢体问题": "下一轮我会重点问：手、脚、腿部比例、身体姿态，哪个最需要约束。",
    "画质/水印文字": "下一轮我会重点问：是清晰度不够、纹理脏，还是出现文字水印。",
    操作流程卡点: "下一轮我会重点问：你卡在哪一步，是找图、选模板、上传，还是结果复用。",
    其他: "下一轮我会让你补一句具体问题，然后把它沉淀成新的原因标签。"
  };
  return questions[reason] ?? questions["其他"];
}

function buildPromptPatch(reasons: string[], stage: WorkbenchPromptTemplateStage) {
  const patches = reasons
    .map((reason) => feedbackPromptPatchForReason(reason)[stage])
    .filter((patch): patch is string => Boolean(patch));
  return [...new Set(patches)].slice(0, 3).join(" ");
}

function feedbackPromptPatchForReason(reason: string): Partial<Record<WorkbenchPromptTemplateStage, string>> {
  const patches: Record<string, Partial<Record<WorkbenchPromptTemplateStage, string>>> = {
    人物不像: {
      outfit: "强化人物身份一致性：保留脸型、五官比例、发型、年龄感和整体气质，不改变人物身份。",
      "first-frame": "首帧必须延续穿搭图中的人物身份、脸型、发型和年龄感，不重新生成另一张脸。"
    },
    服装不准: {
      outfit: "强化服装还原：准确保留领口、袖口、版型、颜色、材质纹理和褶皱结构。",
      "first-frame": "首帧必须延续穿搭图服装结构和颜色，不改变领口袖口、材质和版型。"
    },
    场景不融合: {
      "first-frame": "强化场景融合：人物脚底接地自然，光线方向、阴影、透视和景深与场景一致。"
    },
    构图不适合动作迁移: {
      "first-frame": "强化动作迁移构图：人物全身清晰入镜，头手脚完整，身体周围留出运动空间和方向留白。"
    },
    "手脚/肢体问题": {
      outfit: "强化肢体稳定：手指、手臂、腿部比例自然，避免畸形、粘连、缺失或多余肢体。",
      "first-frame": "首帧肢体必须完整自然，手脚清晰可见，避免切边、畸形、粘连和多余肢体。"
    },
    "画质/水印文字": {
      outfit: "画质要求：真实摄影质感，高清干净，无文字、无水印、无Logo、无脏污伪影。",
      "first-frame": "画质要求：真实摄影质感，高清干净，无文字、无水印、无Logo、无脏污伪影。"
    },
    操作流程卡点: {
      "first-frame": "流程约束：优先生成可直接进入动作迁移的工作底稿，主体、服装、场景关系清楚可复盘。"
    },
    其他: {
      outfit: "根据上一轮反馈优先保证主体清晰、身份稳定和服装可读性。",
      "first-frame": "根据上一轮反馈优先保证首帧可迁移、主体完整和画面可复盘。"
    }
  };
  return patches[reason] ?? patches["其他"];
}

type PromptQualityCheck = {
  checks: Array<{ help: string; label: string; passed: boolean }>;
  label: string;
  missing: string[];
  passedCount: number;
  score: number;
  tone: "strong" | "medium" | "weak";
  total: number;
};

function buildPromptQualityCheck(stage: WorkbenchPromptTemplateStage, prompt: string, referenceCount: number): PromptQualityCheck {
  const text = prompt.replace(/\s+/g, " ");
  const criteria =
    stage === "outfit"
      ? [
          {
            label: "人物一致",
            help: "补充脸型、五官、发型、年龄感或身份稳定。",
            passed: /人物|五官|身份|发型|年龄|脸型|识别|主体/.test(text)
          },
          {
            label: "服装还原",
            help: "补充版型、颜色、材质、纹理、领口袖口或褶皱结构。",
            passed: /服装|衣服|版型|颜色|层次|材质|褶皱|纹理|边缘|领口|袖口/.test(text)
          },
          {
            label: "构图完整",
            help: "补充全身/半身稳定入镜、主体位置、留白或三分法。",
            passed: /全身|半身|入镜|构图|居中|三分|主体|留白/.test(text)
          },
          {
            label: "光线质感",
            help: "补充背景、光线、摄影质感、真实自然或电影感。",
            passed: /背景|光线|棚拍|街拍|电影|真实|自然|摄影|质感/.test(text)
          },
          {
            label: "负面约束",
            help: "补充不要文字、水印、额外人物、Logo 或脏污伪影。",
            passed: /不要|避免|无文字|无水印|水印|文字|额外人物|Logo|伪影|品牌错位/.test(text)
          },
          {
            label: "参考齐全",
            help: "至少选中人物图和服装图。",
            passed: referenceCount >= 2
          }
        ]
      : [
          {
            label: "主体延续",
            help: "补充延续穿搭图的人物身份、脸型、发型和服装。",
            passed: /人物身份|身份|服装延续|延续|一致|保留|主体|穿搭图/.test(text)
          },
          {
            label: "场景融合",
            help: "补充场景、空间、透视、光线、阴影、落地感或景深。",
            passed: /场景|环境|空间|光线|氛围|透视|真实|阴影|景深|落地/.test(text)
          },
          {
            label: "迁移构图",
            help: "补充动作迁移、身体空间、运动方向、姿态或方向留白。",
            passed: /动作迁移|身体空间|运动方向|姿态|可迁移|方向留白|首帧/.test(text)
          },
          {
            label: "肢体安全",
            help: "补充头手脚完整、手脚清晰、避免切边畸形或粘连。",
            passed: /头手脚|手脚|肢体|全身|完整|切边|畸形|粘连|清晰可见/.test(text)
          },
          {
            label: "首帧可用",
            help: "补充视频首帧、开场、封面、画面干净可读或工作底稿。",
            passed: /视频首帧|首帧|开场|封面|画面干净|可读|工作底稿|直接进入/.test(text)
          },
          {
            label: "负面约束",
            help: "补充不要文字、水印、Logo、脏污伪影或额外人物。",
            passed: /不要|避免|无文字|无水印|水印|文字|Logo|伪影|额外人物/.test(text)
          },
          {
            label: "参考齐全",
            help: "至少选中穿搭/主图和场景图；动作图可继续加分。",
            passed: referenceCount >= 2
          }
        ];
  const passedCount = criteria.filter((item) => item.passed).length;
  const total = criteria.length;
  const score = Math.round((passedCount / total) * 100);
  return {
    checks: criteria,
    label: score >= 86 ? "强" : score >= 70 ? "可用" : "需补",
    missing: criteria.filter((item) => !item.passed).map((item) => item.label),
    passedCount,
    score,
    tone: score >= 86 ? "strong" : score >= 70 ? "medium" : "weak",
    total
  };
}

function PromptQualityMeter({ check, compact = false }: { check: PromptQualityCheck; compact?: boolean }) {
  return (
    <div className={`image2-prompt-quality ${check.tone}${compact ? " compact" : ""}`}>
      <div className="image2-prompt-quality-head">
        <span>Prompt 质检</span>
        <strong>{check.score}</strong>
        <small>{check.label} · {check.passedCount}/{check.total}</small>
      </div>
      <div className="image2-prompt-quality-grid">
        {check.checks.map((item) => (
          <span className={item.passed ? "pass" : "miss"} key={item.label} title={item.passed ? "已覆盖" : item.help}>
            {item.passed ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
            {item.label}
          </span>
        ))}
      </div>
      {!compact && check.missing.length ? <p>建议补强：{check.missing.join("、")}</p> : null}
    </div>
  );
}

function filterAssets(assets: WorkbenchAsset[], query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return assets;
  return assets.filter((asset) =>
    [asset.title, asset.subtitle, asset.note, asset.promptHint, ...asset.tags].join(" ").toLowerCase().includes(text)
  );
}

function buildPrompt(
  template: WorkbenchPromptTemplate | undefined,
  vars: { clothing: string; motion: string; note: string; outfit: string; person: string; scene: string }
) {
  const base = (template?.prompt || "")
    .replaceAll("{{person}}", vars.person)
    .replaceAll("{{clothing}}", vars.clothing)
    .replaceAll("{{outfit}}", vars.outfit)
    .replaceAll("{{scene}}", vars.scene)
    .replaceAll("{{motion}}", vars.motion);
  return [
    base,
    vars.note ? `补充要求：${vars.note}` : "",
    "统一质量要求：9:16 竖版优先，人物清晰，服装结构准确，真实摄影质感，无文字，无水印，无多余人物，无畸形手脚。"
  ]
    .filter(Boolean)
    .join("\n\n");
}

function localImageSrc(filePath: string) {
  if (!filePath || filePath.startsWith("/") || /^https?:\/\//i.test(filePath)) {
    return filePath;
  }
  return `/api/image2-workbench/file?path=${encodeURIComponent(filePath)}`;
}

function caseImageSrc(value: string) {
  if (!value || value.startsWith("/")) return value;
  return `/api/image2/proxy?url=${encodeURIComponent(value)}`;
}
