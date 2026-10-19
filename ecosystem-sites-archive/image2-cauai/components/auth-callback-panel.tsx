"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { toUserFacingError } from "@/lib/user-facing-error";

type AuthCallbackState = "checking" | "ready" | "success" | "error";

type Image2AccountSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  user: {
    id: string;
    email?: string;
  };
};

const accountSessionStorageKey = "image2-account-session:v1";
const supabaseAuthUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const isSupabaseAuthConfigured = Boolean(supabaseAuthUrl && supabaseAnonKey);

const supabaseAuthHeaders = (accessToken?: string) => ({
  apikey: supabaseAnonKey,
  "Content-Type": "application/json",
  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
});

const readAuthRedirectParams = () => {
  const hash = typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, "");
  const hashParams = new URLSearchParams(hash);
  const queryParams = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  return {
    accessToken: hashParams.get("access_token") ?? "",
    error: hashParams.get("error_description") ?? hashParams.get("error") ?? queryParams.get("error_description") ?? queryParams.get("error") ?? "",
    expiresIn: Number(hashParams.get("expires_in") ?? 0) || undefined,
    flowType: hashParams.get("type") ?? queryParams.get("mode") ?? "",
    intent: queryParams.get("intent") === "admin" ? "admin" : "account",
    returnTo: queryParams.get("returnTo") ?? "",
    refreshToken: hashParams.get("refresh_token") ?? undefined
  };
};

const safeReturnTo = (value: string, fallback: string) =>
  value.startsWith("/") && !value.startsWith("//") ? value : fallback;

const persistAccountSession = (session: Image2AccountSession) => {
  window.localStorage.setItem(accountSessionStorageKey, JSON.stringify(session));
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
    throw new Error(
      String(data.error_description ?? data.msg ?? data.message ?? data.error ?? "账号请求失败。")
    );
  }

  return data;
};

const getSupabaseUser = async (accessToken: string) => {
  const data = await supabaseAuthRequest("user", { cache: "no-store" }, accessToken);
  const id = typeof data.id === "string" ? data.id : "";
  if (!id) throw new Error("登录链接已失效。");
  return {
    id,
    email: typeof data.email === "string" ? data.email : undefined
  };
};

const updateSupabasePassword = async (accessToken: string, password: string) => {
  await supabaseAuthRequest(
    "user",
    {
      method: "PUT",
      body: JSON.stringify({ password })
    },
    accessToken
  );
};

const exchangeAdminSession = async (session: Image2AccountSession, expiresIn?: number) => {
  const response = await fetch("/api/admin/session/exchange", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-image2-admin-csrf": "1"
    },
    body: JSON.stringify({
      accessToken: session.accessToken,
      expiresIn,
      refreshToken: session.refreshToken
    })
  });
  const data = (await response.json().catch(() => ({}))) as { admin?: boolean; error?: string };
  if (response.status === 403) return false;
  if (!response.ok || !data.admin) throw new Error(data.error || "管理员会话创建失败。" );
  return true;
};

type AuthCallbackPanelProps = {
  initialIsSceneSite?: boolean;
};

export function AuthCallbackPanel({ initialIsSceneSite = false }: AuthCallbackPanelProps) {
  const [state, setState] = useState<AuthCallbackState>("checking");
  const [message, setMessage] = useState("正在验证邮箱链接...");
  const [flowType, setFlowType] = useState("");
  const [isSceneSite, setIsSceneSite] = useState(initialIsSceneSite);
  const [isAdminFlow, setIsAdminFlow] = useState(false);
  const [session, setSession] = useState<Image2AccountSession | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmVisible, setPasswordConfirmVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRecoveryFlow = useMemo(() => flowType === "recovery", [flowType]);
  const accountBrand = isAdminFlow ? "Image2 管理员" : isSceneSite ? "场景引擎账号" : "Image2 账号";
  const returnLabel = isAdminFlow ? "返回管理员入口" : isSceneSite ? "返回场景工作台" : "返回 Image2 案例库";
  const returnHref = isAdminFlow ? "/admin/image2-cases" : isSceneSite ? "/workbench" : "/image2-cases";

  useEffect(() => {
    const sceneCallback = window.location.hostname === "scene.lsb0713.online";
    setIsSceneSite(sceneCallback);

    if (!isSupabaseAuthConfigured) {
      setState("error");
      setMessage("当前站点还没有配置 Supabase 账号入口。");
      return;
    }

    const params = readAuthRedirectParams();
    setIsAdminFlow(params.intent === "admin");
    setFlowType(params.flowType);
    if (params.error) {
      setState("error");
      setMessage(params.error);
      return;
    }

    if (!params.accessToken) {
      setState("error");
      setMessage("邮箱链接缺少登录令牌，可能已经过期。");
      return;
    }

    window.history.replaceState(
      null,
      "",
      `/auth/callback?mode=${encodeURIComponent(params.flowType || "confirm")}${params.intent === "admin" ? "&intent=admin" : ""}`
    );

    void getSupabaseUser(params.accessToken)
      .then(async (user) => {
        const nextSession: Image2AccountSession = {
          accessToken: params.accessToken,
          refreshToken: params.refreshToken,
          expiresAt: params.expiresIn ? Date.now() + params.expiresIn * 1000 : undefined,
          user
        };
        const shouldTryAdminExchange = params.intent === "admin" || (!sceneCallback && params.flowType !== "recovery");
        const adminExchanged = shouldTryAdminExchange
          ? await exchangeAdminSession(nextSession, params.expiresIn)
          : false;
        if (adminExchanged) {
          setSession(null);
          setState("success");
          setMessage("管理员身份已验证，正在进入后台。" );
          window.location.replace(safeReturnTo(params.returnTo, "/admin/image2-cases"));
          return;
        }
        if (params.intent === "admin") throw new Error("当前账号没有管理员权限。" );
        persistAccountSession(nextSession);
        setSession(nextSession);
        setState(params.flowType === "recovery" ? "ready" : "success");
        setMessage(
          params.flowType === "recovery"
            ? "账号已验证，请设置一个新密码。"
            : "邮箱验证完成，账号已登录。"
        );
      })
      .catch((error) => {
        setState("error");
        setMessage(toUserFacingError(error instanceof Error ? error.message : error, "邮箱链接验证失败。"));
      });
  }, []);

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!session) return;
    if (password.length < 6) {
      setState("error");
      setMessage("新密码至少需要 6 位。");
      return;
    }
    if (password !== passwordConfirm) {
      setState("error");
      setMessage("两次输入的新密码不一致。");
      return;
    }

    setIsSubmitting(true);
    setState("ready");
    setMessage("正在更新密码...");
    try {
      await updateSupabasePassword(session.accessToken, password);
      setPassword("");
      setPasswordConfirm("");
      setPasswordVisible(false);
      setPasswordConfirmVisible(false);
      setState("success");
      setMessage(isSceneSite ? "密码已更新，可以返回场景工作台继续生成商品图。" : "密码已更新，可以返回 Image2 案例库继续同步资产。");
    } catch (error) {
      setState("error");
      setMessage(toUserFacingError(error instanceof Error ? error.message : error, "密码更新失败。"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-callback-page">
      <section className={`auth-callback-card ${state}`} aria-label="账号邮箱回调">
        <div className="auth-callback-icon" aria-hidden="true">
          {state === "checking" ? (
            <Loader2 className="spinning" />
          ) : state === "error" ? (
            <XCircle />
          ) : state === "ready" ? (
            <KeyRound />
          ) : (
            <CheckCircle2 />
          )}
        </div>
        <p className="auth-callback-kicker">
          <ShieldCheck aria-hidden="true" />
          {accountBrand}
        </p>
        <h1>{isRecoveryFlow ? "设置新密码" : "邮箱验证"}</h1>
        <p>{message}</p>

        {isRecoveryFlow && session && state !== "success" ? (
          <form className="auth-callback-form" onSubmit={submitPassword}>
            <div className="auth-callback-password-field">
              <input
                aria-label="新密码"
                autoComplete="new-password"
                placeholder="新密码（至少 6 位）"
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                aria-label={passwordVisible ? "隐藏密码" : "显示密码"}
                className="auth-callback-password-toggle"
                type="button"
                onClick={() => setPasswordVisible((value) => !value)}
              >
                {passwordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
            <div className="auth-callback-password-field">
              <input
                aria-label="确认新密码"
                autoComplete="new-password"
                placeholder="再次输入新密码"
                type={passwordConfirmVisible ? "text" : "password"}
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
              />
              <button
                aria-label={passwordConfirmVisible ? "隐藏确认密码" : "显示确认密码"}
                className="auth-callback-password-toggle"
                type="button"
                onClick={() => setPasswordConfirmVisible((value) => !value)}
              >
                {passwordConfirmVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="spinning" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
              更新密码
            </button>
          </form>
        ) : null}

        <a className="auth-callback-link" href={returnHref}>
          {returnLabel}
        </a>
      </section>
    </main>
  );
}
