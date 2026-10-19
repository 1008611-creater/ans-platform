"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Mail, Phone, ShieldCheck, Sparkles, XCircle } from "lucide-react";

type TurnstileApi = {
  remove?: (widgetId: string) => void;
  render: (
    element: HTMLElement,
    options: {
      callback?: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      sitekey: string;
      theme?: "auto" | "light" | "dark";
    }
  ) => string;
  reset?: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type UnifiedLoginPanelProps = {
  brand: "image2" | "scene";
  intent?: "account" | "admin";
  returnHref: string;
  siteKey?: string;
};

type VerifyResponse = {
  admin?: boolean;
  accessToken?: string;
  error?: string;
  expiresAt?: number;
  expiresIn?: number;
  refreshToken?: string;
  user?: {
    email?: string;
    id?: string;
    phone?: string;
  };
  walletInitialized?: boolean;
};

type ExistingAccountSession = {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
  user: {
    email?: string;
    id: string;
  };
};

const accountSessionStorageKey = "image2-account-session:v1";

function readJson<T>(response: Response): Promise<T> {
  return response.text().then((text) => {
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return { error: text.slice(0, 240) } as T;
    }
  });
}

function isPhone(value: string) {
  return value.trim().startsWith("+") && !value.includes("@");
}

function readExistingAccountSession(): ExistingAccountSession | null {
  try {
    const raw = window.localStorage.getItem(accountSessionStorageKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as Record<string, unknown>;
    const user = value.user && typeof value.user === "object" ? (value.user as Record<string, unknown>) : null;
    const accessToken = typeof value.accessToken === "string" ? value.accessToken.trim() : "";
    const refreshToken = typeof value.refreshToken === "string" ? value.refreshToken.trim() : undefined;
    const userId = typeof user?.id === "string" ? user.id.trim() : "";
    if (!accessToken || accessToken.length > 12_000 || !userId || userId.length > 200) return null;

    return {
      accessToken,
      expiresAt: typeof value.expiresAt === "number" && Number.isFinite(value.expiresAt) ? value.expiresAt : undefined,
      refreshToken: refreshToken && refreshToken.length <= 12_000 ? refreshToken : undefined,
      user: {
        id: userId,
        email: typeof user?.email === "string" ? user.email.slice(0, 320) : undefined
      }
    };
  } catch {
    return null;
  }
}

export function UnifiedLoginPanel({ brand, intent = "account", returnHref, siteKey }: UnifiedLoginPanelProps) {
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "code" | "verifying" | "success" | "error">("idle");
  const [message, setMessage] = useState("输入邮箱或手机号，获取一次性验证码。");
  const [maskedIdentifier, setMaskedIdentifier] = useState("");
  const [sessionSaved, setSessionSaved] = useState(false);
  const [existingSessionAvailable, setExistingSessionAvailable] = useState(false);
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef("");

  const isScene = brand === "scene";
  const isAdmin = intent === "admin";
  const title = isAdmin ? "Image2 管理员" : isScene ? "场景引擎账号" : "Image2 账号";
  const subtitle = isAdmin
    ? "使用已授权的管理员账号验证登录。会话只保存在 HttpOnly Cookie 中。"
    : isScene
      ? "登录后继续生成商品场景图、管理图片额度。"
      : "登录后同步案例收藏、抽卡记录和图片余额。";
  const returnLabel = isAdmin
    ? sessionSaved
      ? "进入管理后台"
      : "返回管理员入口"
    : isScene
      ? "进入场景工作台"
      : "进入 Image2 案例库";
  const inputIcon = isPhone(identifier) ? <Phone aria-hidden="true" /> : <Mail aria-hidden="true" />;
  const canSend = identifier.trim().length > 3 && status !== "sending" && status !== "verifying";
  const canVerify = code.trim().length >= 4 && status !== "sending" && status !== "verifying";

  const statusTone = useMemo(() => {
    if (status === "success") return "success";
    if (status === "error") return "error";
    if (status === "sending" || status === "verifying") return "busy";
    return "idle";
  }, [status]);

  useEffect(() => {
    if (!siteKey || !turnstileRef.current) return;

    const renderWidget = () => {
      if (!turnstileRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        theme: "light",
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => {
          setTurnstileToken("");
          setMessage("人机验证已过期，请重新勾选。");
          setStatus("error");
        },
        "error-callback": () => {
          setTurnstileToken("");
          setMessage("人机验证加载失败，请刷新页面。");
          setStatus("error");
        }
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile-api]");
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.turnstileApi = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", renderWidget);
    return () => {
      script.removeEventListener("load", renderWidget);
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = "";
      }
    };
  }, [siteKey]);

  useEffect(() => {
    if (!isAdmin) return;
    const existingSession = readExistingAccountSession();
    if (!existingSession) return;
    setExistingSessionAvailable(true);

    let cancelled = false;
    const continueWithExistingSession = async () => {
      setStatus("verifying");
      setMessage("检测到你之前已点过登录链接，正在确认管理员身份...");
      try {
        const expiresIn = existingSession.expiresAt
          ? Math.max(60, Math.floor((existingSession.expiresAt - Date.now()) / 1000))
          : undefined;
        const response = await fetch("/api/admin/session/exchange", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-image2-admin-csrf": "1"
          },
          body: JSON.stringify({
            accessToken: existingSession.accessToken,
            expiresIn,
            refreshToken: existingSession.refreshToken
          })
        });
        const data = await readJson<{ admin?: boolean; error?: string }>(response);
        if (!response.ok || !data.admin) {
          if (response.status === 403) throw new Error("当前已登录账号没有管理员权限。");
          if (response.status === 401) throw new Error("之前的登录状态已过期，请重新获取登录链接。");
          throw new Error(data.error || "管理员身份确认失败。");
        }
        if (cancelled) return;
        setSessionSaved(true);
        setStatus("success");
        setMessage("管理员身份已确认，正在进入后台...");
        window.location.replace(returnHref);
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "管理员身份确认失败。");
      }
    };

    void continueWithExistingSession();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, returnHref]);

  function resetTurnstile() {
    setTurnstileToken("");
    if (widgetIdRef.current) window.turnstile?.reset?.(widgetIdRef.current);
  }

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    if (siteKey && !turnstileToken) {
      setStatus("error");
      setMessage("请先完成人机验证。");
      return;
    }

    setStatus("sending");
    setMessage("正在发送验证码...");
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          redirectTo: isAdmin
            ? `${window.location.origin}/auth/callback?intent=admin&returnTo=${encodeURIComponent(returnHref)}`
            : `${window.location.origin}/auth/callback`,
          turnstileToken
        })
      });
      const data = await readJson<{ error?: string; maskedIdentifier?: string }>(response);
      if (!response.ok) throw new Error(data.error || "验证码发送失败。");
      setMaskedIdentifier(data.maskedIdentifier ?? identifier);
      setStatus("code");
      setMessage(`验证码已发送到 ${data.maskedIdentifier ?? identifier}。`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "验证码发送失败。");
      resetTurnstile();
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!canVerify) return;

    setStatus("verifying");
    setMessage("正在校验验证码...");
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(isAdmin ? { "x-image2-admin-csrf": "1" } : {})
        },
        body: JSON.stringify({
          code,
          identifier,
          intent
        })
      });
      const data = await readJson<VerifyResponse>(response);
      if (!response.ok) throw new Error(data.error || "验证码校验失败。");

      if (isAdmin) {
        if (!data.admin || !data.user?.id) throw new Error("管理员会话创建失败。");
        setSessionSaved(true);
        setStatus("success");
        setMessage("管理员身份已验证，正在进入后台...");
        window.location.assign(returnHref);
        return;
      }

      if (!data.accessToken || !data.user?.id) throw new Error("登录响应缺少会话信息。");

      window.localStorage.setItem(
        accountSessionStorageKey,
        JSON.stringify({
          accessToken: data.accessToken,
          expiresAt: data.expiresAt,
          refreshToken: data.refreshToken,
          user: data.user
        })
      );
      window.dispatchEvent(new Event("image2-account-session-updated"));
      setSessionSaved(true);
      setStatus("success");
      setMessage(data.walletInitialized === false ? "账号已登录，图片余额稍后刷新。" : "账号已登录。");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "验证码校验失败。");
    }
  }

  return (
    <main className={`unified-login-page ${isScene ? "scene" : "image2"}`}>
      <section className="unified-login-card" aria-label={title}>
        <div className="unified-login-brand">
          <span>
            {isScene ? <Sparkles aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
            {title}
          </span>
          <small>{isAdmin ? "安全管理员会话" : "统一验证码登录"}</small>
        </div>

        <h1>{isAdmin ? "登录管理后台" : isScene ? "登录场景引擎" : "登录 Image2"}</h1>
        <p>{subtitle}</p>

        {isAdmin && existingSessionAvailable ? (
          <div className="unified-login-existing">
            <Loader2 className={status === "verifying" ? "spinning" : ""} aria-hidden="true" />
            <span>正在使用你之前点过邮件链接后保存的账号登录，无需再次收邮件。</span>
          </div>
        ) : null}

        <form className="unified-login-form" onSubmit={sendCode}>
          <label>
            <span>邮箱或手机号</span>
            <div className="unified-login-input">
              {inputIcon}
              <input
                autoComplete="email tel"
                inputMode={isPhone(identifier) ? "tel" : "email"}
                placeholder="邮箱，或 +8613800000000"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </div>
          </label>

          {siteKey ? (
            <div className="unified-login-turnstile" ref={turnstileRef} aria-label="Cloudflare Turnstile 人机验证" />
          ) : (
            <div className="unified-login-dev-note">
              <ShieldCheck aria-hidden="true" />
              当前环境未配置 Turnstile site key；生产环境会由服务端强制校验。
            </div>
          )}

          <button type="submit" disabled={!canSend}>
            {status === "sending" ? <Loader2 className="spinning" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
            发送验证码
          </button>
        </form>

        <form className="unified-login-form code" onSubmit={verifyCode}>
          <label>
            <span>验证码</span>
            <div className="unified-login-input">
              <KeyRound aria-hidden="true" />
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                placeholder="输入 6 位验证码"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
          </label>
          <button type="submit" disabled={!canVerify}>
            {status === "verifying" ? <Loader2 className="spinning" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
            登录
          </button>
        </form>

        <div className={`unified-login-status ${statusTone}`}>
          {statusTone === "error" ? <XCircle aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
          <span>{message}</span>
          {maskedIdentifier && status === "code" ? <small>{maskedIdentifier}</small> : null}
        </div>

        <a className={sessionSaved ? "unified-login-return ready" : "unified-login-return"} href={returnHref}>
          {returnLabel}
        </a>
      </section>
    </main>
  );
}
