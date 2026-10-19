"use client";

import { Eye, EyeOff, FolderOpen, LogIn, LogOut, PlayCircle, Search, Sparkles, X } from "lucide-react";
import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import { Image2LanguageToggle, useImage2LanguagePreference } from "@/components/image2-language";
import { localizedCaseText, type Image2Language } from "@/lib/image2-language";
import type { Image2PublicHomeData, WorkbenchCase } from "@/lib/image2-workbench-data";
import styles from "./image2-public-home.module.css";

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

const publicHomeCopy = {
  zh: {
    heroKicker: "Prompt reuse library",
    heroTitle: "把好图拆成能复用的提示词。",
    heroDescription: "查案例、读结构、存变体，再带着一套可改写的提示词进入作图流程。",
    casesAction: "查找案例",
    workbenchAction: "打开工作台",
    videoAction: "视频创作",
    loginAction: "登录同步资产",
    logoutAction: "退出",
    navCases: "案例库",
    navWorkbench: "工作台",
    navVideo: "视频创作",
    heroPreviewLabel: "精选案例预览",
    publicContentLabel: "公开内容",
    featuredKicker: "Curated proof",
    featuredTitle: "先看图，再决定怎么复用。",
    featuredAction: "浏览全部案例",
    promptReferenceLabel: "提示词参考",
    promptReferenceTitle: "搜到值得学的图",
    promptReferenceNote: "按用途、风格、来源和提示词结构快速缩小范围。",
    firstFrameTitle: "留下能继续生产的结构",
    firstFrameNote: "保存收藏、改写变体，再进入工作台或视频首帧流程。",
    footerNote: "每个案例保留来源归属；图片与提示词仅按其标注范围使用。"
  },
  en: {
    heroKicker: "Prompt reuse library",
    heroTitle: "Turn strong images into prompts you can reuse.",
    heroDescription: "Find a case, read its structure, save a variation, and continue with a prompt you can actually adapt.",
    casesAction: "Find a Case",
    workbenchAction: "Open Workbench",
    videoAction: "Video Studio",
    loginAction: "Log In to Sync",
    logoutAction: "Log Out",
    navCases: "Cases",
    navWorkbench: "Workbench",
    navVideo: "Video",
    heroPreviewLabel: "Featured case preview",
    publicContentLabel: "Public content",
    featuredKicker: "Curated proof",
    featuredTitle: "See the image before deciding how to reuse it.",
    featuredAction: "Browse All Cases",
    promptReferenceLabel: "Prompt references",
    promptReferenceTitle: "Find a case worth studying",
    promptReferenceNote: "Narrow the library by purpose, style, source, and prompt structure.",
    firstFrameTitle: "Keep a structure you can produce with",
    firstFrameNote: "Save cases, adapt variants, and continue into the workbench or first-frame flow.",
    footerNote: "Each case keeps its source attribution; use images and prompts within their stated scope."
  }
} satisfies Record<Image2Language, Record<string, string>>;

function publicCaseImageUrl(value: string) {
  if (!value || value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return value;
    return `/api/image2/proxy?url=${encodeURIComponent(url.toString())}`;
  } catch {
    return value;
  }
}

const accountSessionStorageKey = "image2-workbench-team-session:v1";
const supabaseAuthUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const isSupabaseAuthConfigured = Boolean(supabaseAuthUrl && supabaseAnonKey);

const readAccountSession = () => {
  try {
    const raw = window.localStorage.getItem(accountSessionStorageKey);
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
  return session;
};

const clearAccountSession = () => {
  window.localStorage.removeItem(accountSessionStorageKey);
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
  if (!isSupabaseAuthConfigured) throw new Error("当前环境暂不支持账号登录。");
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

async function hasWorkbenchAccess(session: Image2AccountSession) {
  const response = await fetch("/api/image2-workbench", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${session.accessToken}`
    }
  });
  if (response.status === 401) throw new Error("登录状态已失效。");
  if (!response.ok && response.status !== 403) throw new Error("账号状态暂时无法确认。");
  const payload = (await response.json().catch(() => ({}))) as { access?: { isTeamMember?: boolean } };
  return Boolean(payload.access?.isTeamMember);
}

export function Image2PublicHome({ initialData }: { initialData: Image2PublicHomeData }) {
  const { language, setLanguage } = useImage2LanguagePreference("zh");
  const [accountSession, setAccountSession] = useState<Image2AccountSession | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountOtpCode, setAccountOtpCode] = useState("");
  const [accountOtpMode, setAccountOtpMode] = useState<AccountOtpMode>(null);
  const [accountAuthMode, setAccountAuthMode] = useState<AccountAuthMode>("login");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<AccountAuthStatus>({
    message: isSupabaseAuthConfigured ? "可以使用账号登录。" : "当前环境暂不支持账号登录。",
    tone: "idle"
  });

  const featuredCases = useMemo(() => initialData.featuredCases.filter((item) => item.imageUrl).slice(0, 6), [initialData.featuredCases]);
  const heroCases = featuredCases.slice(0, 4);
  const copy = publicHomeCopy[language];

  useEffect(() => {
    if (!isSupabaseAuthConfigured) return;
    const saved = readAccountSession();
    if (!saved) return;
    setAccountSession(saved);
    setAccountEmail(saved.user.email ?? "");
    void (async () => {
      try {
        if (await hasWorkbenchAccess(saved)) {
          window.location.assign("/workbench");
          return;
        }
        setAuthStatus({ message: "已登录。", tone: "success" });
      } catch {
        clearAccountSession();
        setAccountSession(null);
        setAuthStatus({ message: "可以使用账号登录。", tone: "idle" });
      }
    })();
  }, []);

  async function submitAccountAuth(event: FormEvent) {
    event.preventDefault();
    if (!isSupabaseAuthConfigured) return;
    const email = accountEmail.trim();
    const password = accountPassword.trim();

    if (accountOtpMode === "signup") {
      const token = accountOtpCode.trim();
      if (!email || !token) {
        setAuthStatus({ message: "请输入邮箱验证码。", tone: "error" });
        return;
      }
      setAuthStatus({ message: "正在验证邮箱验证码...", tone: "busy" });
      try {
        const session = await verifySupabaseSignupCode(email, token);
        persistAccountSession(session);
        setAccountSession(session);
        setAccountEmail(session.user.email ?? email);
        setAccountPassword("");
        setAccountOtpCode("");
        setAccountOtpMode(null);
        setAuthStatus({ message: "注册并登录成功。", tone: "success" });
        if (await hasWorkbenchAccess(session)) {
          window.location.assign("/workbench");
          return;
        }
        setIsAuthModalOpen(false);
      } catch (error) {
        setAuthStatus({ message: error instanceof Error ? error.message : "验证码校验失败。", tone: "error" });
      }
      return;
    }

    if (accountOtpMode === "recovery") {
      const token = accountOtpCode.trim();
      if (!email || !token || password.length < 6) {
        setAuthStatus({ message: "请输入验证码和至少 6 位新密码。", tone: "error" });
        return;
      }
      setAuthStatus({ message: "正在验证并重置密码...", tone: "busy" });
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
        setAuthStatus({ message: "密码已重置。", tone: "success" });
      } catch (error) {
        setAuthStatus({ message: error instanceof Error ? error.message : "密码重置失败。", tone: "error" });
      }
      return;
    }

    if (accountAuthMode === "recover") {
      if (!email) {
        setAuthStatus({ message: "请输入要找回密码的邮箱。", tone: "error" });
        return;
      }
      setAuthStatus({ message: "正在发送邮箱验证码...", tone: "busy" });
      try {
        await recoverSupabasePassword(email, getAuthCallbackUrl("recovery"));
        setAccountOtpMode("recovery");
        setAccountOtpCode("");
        setAccountPassword("");
        setAuthStatus({ message: "验证码已发送，请输入验证码并设置新密码。", tone: "success" });
      } catch (error) {
        setAuthStatus({ message: error instanceof Error ? error.message : "验证码发送失败。", tone: "error" });
      }
      return;
    }

    if (!email || password.length < 6) {
      setAuthStatus({ message: "请输入邮箱和至少 6 位密码。", tone: "error" });
      return;
    }

    setAuthStatus({ message: accountAuthMode === "login" ? "正在登录..." : "正在发送注册验证码...", tone: "busy" });
    try {
      const session =
        accountAuthMode === "login"
          ? await signInWithSupabasePassword(email, password)
          : await signUpWithSupabasePassword(email, password, getAuthCallbackUrl("confirm"));
      if (!session) {
        setAccountOtpMode("signup");
        setAccountOtpCode("");
        setAuthStatus({ message: "注册验证码已发送，请查看邮箱并输入验证码。", tone: "success" });
        return;
      }

      persistAccountSession(session);
      setAccountSession(session);
      setAccountPassword("");
      setAccountOtpCode("");
      setAccountOtpMode(null);
      if (await hasWorkbenchAccess(session)) {
        window.location.assign("/workbench");
        return;
      }
      setIsAuthModalOpen(false);
      setAuthStatus({ message: "欢迎回来。", tone: "success" });
    } catch (error) {
      setAuthStatus({ message: error instanceof Error ? error.message : "账号请求失败。", tone: "error" });
    }
  }

  async function resendAccountOtp() {
    if (!isSupabaseAuthConfigured || !accountOtpMode) return;
    const email = accountEmail.trim();
    if (!email) {
      setAuthStatus({ message: "请输入邮箱。", tone: "error" });
      return;
    }

    if (accountOtpMode === "signup") {
      const password = accountPassword.trim();
      if (password.length < 6) {
        setAuthStatus({ message: "请先输入至少 6 位密码。", tone: "error" });
        return;
      }
      setAuthStatus({ message: "正在重新发送注册验证码...", tone: "busy" });
      try {
        await signUpWithSupabasePassword(email, password, getAuthCallbackUrl("confirm"));
        setAccountOtpCode("");
        setAuthStatus({ message: "注册验证码已重新发送。", tone: "success" });
      } catch (error) {
        setAuthStatus({ message: error instanceof Error ? error.message : "验证码重新发送失败。", tone: "error" });
      }
      return;
    }

    setAuthStatus({ message: "正在重新发送找回验证码...", tone: "busy" });
    try {
      await recoverSupabasePassword(email, getAuthCallbackUrl("recovery"));
      setAccountOtpCode("");
      setAuthStatus({ message: "找回验证码已重新发送。", tone: "success" });
    } catch (error) {
      setAuthStatus({ message: error instanceof Error ? error.message : "验证码重新发送失败。", tone: "error" });
    }
  }

  async function signOutAccount() {
    const session = accountSession;
    setAuthStatus({ message: "正在退出...", tone: "busy" });
    try {
      if (session?.accessToken) await signOutSupabaseSession(session.accessToken);
    } catch {
      // Local cleanup still matters when the remote session has already expired.
    }
    clearAccountSession();
    setAccountSession(null);
    setAccountPassword("");
    setAccountOtpCode("");
    setAccountOtpMode(null);
    setAuthStatus({ message: "已退出。", tone: "success" });
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brandCluster}>
          <a className={styles.brand} href="/">
            <Sparkles aria-hidden="true" />
            <span>Image2</span>
          </a>
          <nav className={styles.nav} aria-label="Image2">
            <a href="/image2-cases">{copy.navCases}</a>
            <a href="/workbench">{copy.navWorkbench}</a>
            <a href="/video-studio">{copy.navVideo}</a>
          </nav>
        </div>
        <div className={styles.accountTools}>
          <Image2LanguageToggle className={styles.languageToggle} language={language} onChange={setLanguage} />
          {accountSession ? (
            <button className={styles.accountAction} type="button" onClick={signOutAccount}>
              <LogOut aria-hidden="true" />
              {copy.logoutAction}
            </button>
          ) : (
            <button className={styles.accountAction} type="button" onClick={() => setIsAuthModalOpen(true)} disabled={!isSupabaseAuthConfigured}>
              <LogIn aria-hidden="true" />
              {copy.loginAction}
            </button>
          )}
        </div>
      </header>

      <section className={styles.hero} aria-label={copy.heroTitle}>
        <div className={styles.heroCopy}>
          <small>{copy.heroKicker}</small>
          <h1>{copy.heroTitle}</h1>
          <p>{copy.heroDescription}</p>
          <div className={styles.actions}>
            <a className={styles.primaryAction} href="/image2-cases">
              <FolderOpen aria-hidden="true" />
              {copy.casesAction}
            </a>
            <a className={styles.secondaryAction} href="/workbench">
              <Sparkles aria-hidden="true" />
              {copy.workbenchAction}
            </a>
            <a className={styles.secondaryAction} href="/video-studio">
              <PlayCircle aria-hidden="true" />
              {copy.videoAction}
            </a>
          </div>
          <div className={styles.heroProofs} aria-label="Image2 case contents">
            <span>{language === "zh" ? "真实图片" : "Real image"}</span>
            <span>{language === "zh" ? "原始提示词" : "Original prompt"}</span>
            <span>{language === "zh" ? "来源归属" : "Source attribution"}</span>
          </div>
        </div>

        <div className={styles.heroGrid} aria-label={copy.heroPreviewLabel}>
          {heroCases.map((item, index) => {
            const localized = localizedCaseText(item, language);
            return (
              <a className={styles.heroTile} href={`/image2-cases?case=${item.id}`} key={item.id} style={{ "--tile-index": index } as CSSProperties}>
                <ReliableCaseImage item={item} index={index} alt={localized.imageAlt} loading={index === 0 ? "eager" : "lazy"} />
                <span>
                  <small>{localized.categoryLabel}</small>
                  <strong>{localized.title}</strong>
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section className={styles.sections} aria-label={copy.publicContentLabel}>
        <div className={styles.sectionIntro}>
          <div>
            <span>{copy.featuredKicker}</span>
            <h2>{copy.featuredTitle}</h2>
          </div>
          <a href="/image2-cases">{copy.featuredAction}</a>
        </div>
        <div className={styles.caseGrid}>
          {featuredCases.map((item, index) => (
            <PublicCaseCard item={item} index={index} key={item.id} language={language} />
          ))}
        </div>
      </section>

      <section className={styles.referenceBand} aria-label={copy.promptReferenceLabel}>
        <a href="/image2-cases">
          <Search aria-hidden="true" />
          <span>
            <strong>{copy.promptReferenceTitle}</strong>
            <small>{copy.promptReferenceNote}</small>
          </span>
        </a>
        <a href="/image2-cases">
          <Sparkles aria-hidden="true" />
          <span>
            <strong>{copy.firstFrameTitle}</strong>
            <small>{copy.firstFrameNote}</small>
          </span>
        </a>
      </section>

      <footer className={styles.footer}>
        <strong>Image2</strong>
        <span>{copy.footerNote}</span>
      </footer>

      {isAuthModalOpen ? (
        <AccountAuthModal
          authMode={accountAuthMode}
          authStatus={authStatus}
          email={accountEmail}
          isConfigured={isSupabaseAuthConfigured}
          onClose={() => setIsAuthModalOpen(false)}
          onEmailChange={setAccountEmail}
          onModeChange={(mode) => {
            setAccountAuthMode(mode);
            setAccountOtpMode(null);
            setAccountOtpCode("");
            setAccountPassword("");
            setAuthStatus({
              message:
                mode === "recover"
                  ? "输入邮箱后接收验证码。"
                  : mode === "signup"
                    ? "填写邮箱和密码后接收验证码。"
                    : "可以使用账号登录。",
              tone: "idle"
            });
          }}
          onPasswordChange={setAccountPassword}
          onOtpCodeChange={setAccountOtpCode}
          onResendOtp={resendAccountOtp}
          onSubmit={submitAccountAuth}
          password={accountPassword}
          otpCode={accountOtpCode}
          otpMode={accountOtpMode}
        />
      ) : null}
    </main>
  );
}

function ReliableCaseImage({
  alt,
  index,
  item,
  loading
}: {
  alt: string;
  index: number;
  item: WorkbenchCase;
  loading: "eager" | "lazy";
}) {
  const [src, setSrc] = useState(() => publicCaseImageUrl(item.imageUrl));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(publicCaseImageUrl(item.imageUrl));
    setFailed(false);
  }, [item.imageUrl]);

  if (failed || !src) {
    return (
      <span className={styles.imageFallback} role="img" aria-label={alt}>
        <Sparkles aria-hidden="true" />
        <small>{index + 1}</small>
      </span>
    );
  }

  return <img src={src} alt={alt} loading={loading} onError={() => setFailed(true)} />;
}

function PublicCaseCard({ item, index, language }: { item: WorkbenchCase; index: number; language: Image2Language }) {
  const localized = localizedCaseText(item, language);
  return (
    <a className={styles.caseCard} href={`/image2-cases?case=${item.id}`}>
      <ReliableCaseImage item={item} index={index} alt={localized.imageAlt} loading="lazy" />
      <span>{localized.categoryLabel}</span>
      <strong>{localized.title}</strong>
      <em>{localized.titleSecondary}</em>
      <small>{localized.promptPreview}</small>
      <small className={styles.originalPrompt}>{localized.promptPreviewSecondary}</small>
    </a>
  );
}

function AccountAuthModal({
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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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
  const shouldShowPasswordField = otpMode === "signup" ? false : authMode !== "recover" || otpMode === "recovery";
  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={styles.modal} role="dialog" aria-modal="true" aria-label="账号登录">
        <div className={styles.modalHeader}>
          <span>Account</span>
          <button type="button" onClick={onClose} aria-label="关闭">
            <X aria-hidden="true" />
          </button>
        </div>
        <h2>账号登录</h2>
        {isConfigured ? (
          <form className={styles.authForm} onSubmit={onSubmit}>
            <div className={styles.authTabs} role="tablist" aria-label="账号模式">
              {(["login", "signup", "recover"] as AccountAuthMode[]).map((mode) => (
                <button
                  aria-pressed={authMode === mode}
                  className={authMode === mode ? styles.active : ""}
                  disabled={Boolean(otpMode)}
                  key={mode}
                  type="button"
                  onClick={() => onModeChange(mode)}
                >
                  {mode === "login" ? "登录" : mode === "signup" ? "注册" : "找回"}
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
            {shouldShowPasswordField ? (
              <label>
                <span>{otpMode === "recovery" ? "新密码" : "密码"}</span>
                <div className={styles.passwordInputRow}>
                  <input
                    autoComplete={otpMode === "recovery" || authMode === "signup" ? "new-password" : "current-password"}
                    type={isPasswordVisible ? "text" : "password"}
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={isPasswordVisible ? "隐藏密码" : "显示密码"}
                    title={isPasswordVisible ? "隐藏密码" : "显示密码"}
                    onClick={() => setIsPasswordVisible((current) => !current)}
                  >
                    {isPasswordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </div>
              </label>
            ) : null}
            <p className={`${styles.authMessage} ${styles[authStatus.tone]}`}>{authStatus.message}</p>
            <div className={styles.authActions}>
              <button type="button" onClick={onClose}>
                取消
              </button>
              <button className={styles.primaryButton} disabled={authStatus.tone === "busy"} type="submit">
                {authStatus.tone === "busy" ? "处理中" : submitLabel}
              </button>
            </div>
            {otpMode ? (
              <button type="button" className={styles.linkButton} onClick={onResendOtp} disabled={authStatus.tone === "busy"}>
                重新发送验证码
              </button>
            ) : null}
          </form>
        ) : (
          <p className={`${styles.authMessage} ${styles.error}`}>当前环境暂不支持账号登录。</p>
        )}
      </section>
    </div>
  );
}
