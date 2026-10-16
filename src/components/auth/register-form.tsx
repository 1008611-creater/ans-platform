"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import {useTranslations} from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { analyticsAuth } from "@/lib/analytics";
import { DinoAdoptionPod } from "@/components/mascot/dino-adoption-pod";

type Turnstile = {
  render: (node: HTMLElement, options: { sitekey: string; action: string; language: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void; "timeout-callback": () => void }) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
const turnstile = () => (window as Window & { turnstile?: Turnstile }).turnstile;
function createRegisterSchema(isEn: boolean) {
  return z.object({
    name: z.string().trim().min(2, isEn ? "Nickname must be at least 2 characters" : "昵称至少 2 个字符").max(40, isEn ? "Nickname must be at most 40 characters" : "昵称最多 40 个字符"),
    email: z.string().trim().max(254).email(isEn ? "Please enter a valid email" : "请输入有效邮箱"),
    code: z.string().regex(/^\d{6}$/, isEn ? "Enter the 6-digit email verification code" : "请输入 6 位邮箱验证码"),
    password: z.string().min(6, isEn ? "Password must be at least 6 characters" : "密码至少 6 位").refine(value => new TextEncoder().encode(value).length <= 72, isEn ? "Password cannot exceed 72 UTF-8 bytes" : "密码不能超过 72 个 UTF-8 字节"),
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, { message: isEn ? "Passwords do not match" : "两次密码不一致", path: ["confirmPassword"] });
}
type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;

export function RegisterForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const router = useRouter();
  const t = useTranslations("auth");
  const isEn = t("register") === "Register" || (typeof document !== "undefined" && document.documentElement.lang?.toLowerCase().startsWith("en"));
  const [isLoading, setIsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [siteKey, setSiteKey] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const [challenge, setChallenge] = useState("");
  const [challengeError, setChallengeError] = useState("");
  const [challengeStalled, setChallengeStalled] = useState(false);
  const [configError, setConfigError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const widgetNode = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const busy = useRef(false);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(createRegisterSchema(isEn)),
    defaultValues: { name: "", email: "", code: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/register/config", { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.siteKey) throw new Error(result.message || (isEn ? "Registration service is temporarily unavailable" : "注册服务暂不可用"));
        if (!controller.signal.aborted) setSiteKey(result.siteKey);
      }).catch(error => { if (!controller.signal.aborted) setConfigError(error instanceof Error ? error.message : (isEn ? "Registration service is temporarily unavailable" : "注册服务暂不可用")); });
    return () => controller.abort();
  }, [isEn]);

  useEffect(() => {
    const api = turnstile();
    if (!scriptReady || !siteKey || !widgetNode.current || !api) return;
    let active = true;
    let resolved = false;
    setChallengeStalled(false);
    const stallTimer = window.setTimeout(() => {
      if (active && !resolved) setChallengeStalled(true);
    }, 6000);
    const invalidate = (message: string) => {
      resolved = true;
      if (active) { setChallenge(""); setChallengeStalled(false); setChallengeError(message); }
    };
    try {
      widgetId.current = api.render(widgetNode.current, {
        sitekey: siteKey, action: "register", language: isEn ? "en" : "zh-cn",
        callback: token => {
          resolved = true;
          if (active) { setChallenge(token); setChallengeStalled(false); setChallengeError(""); }
        },
        "expired-callback": () => invalidate(isEn ? "Human verification expired, please verify again" : "人机验证已过期，请重新验证"),
        "error-callback": () => invalidate(isEn ? "Human verification failed, please retry below" : "人机验证出错，请重新验证"),
        "timeout-callback": () => invalidate(isEn ? "Human verification timed out, please retry" : "人机验证超时，请重新验证"),
      });
    } catch { invalidate(isEn ? "Failed to initialize human verification, please refresh" : "人机验证加载失败，请刷新重试"); }
    return () => {
      active = false;
      window.clearTimeout(stallTimer);
      if (widgetId.current !== undefined) {
        try { api.remove(widgetId.current); } catch { /* 脚本已清理 widget 时无需重试。 */ }
        widgetId.current = undefined;
      }
    };
  }, [scriptReady, siteKey, isEn]);

  useEffect(() => {
    if (!cooldown) return;
    const timeout = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [cooldown]);

  function resetChallenge() {
    setChallenge("");
    setChallengeStalled(false);
    if (widgetId.current !== undefined) {
      try { turnstile()?.reset(widgetId.current); setChallengeError(""); }
      catch { setChallengeError(isEn ? "Failed to reset human verification, please refresh the page" : "人机验证重置失败，请刷新页面"); }
    }
  }

  async function sendCode() {
    if (busy.current || !challenge || cooldown || !(await form.trigger("email"))) return;
    if (busy.current) return;
    busy.current = true;
    setSending(true);
    try {
      const response = await fetch("/api/auth/register/code", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.getValues("email").trim().toLowerCase(), turnstileToken: challenge }),
      });
      const result = await response.json();
      const retry = Number(response.headers.get("Retry-After") || result.retryAfter);
      if (Number.isFinite(retry) && retry > 0) setCooldown(Math.min(600, Math.ceil(retry)));
      if (!response.ok) { toast.error(result.message || (isEn ? "Failed to send verification code" : "验证码发送失败")); return; }
      setCooldown(60);
      form.setValue("code", "");
      toast.success(isEn ? "Verification code sent! Check your email and complete human verification again before submitting." : "验证码已发送，请查收邮箱并再次完成人机验证");
    } catch { toast.error(isEn ? "Failed to send verification code, please try again later" : "验证码发送失败，请稍后重试"); }
    finally { resetChallenge(); setSending(false); busy.current = false; }
  }

  async function onSubmit(data: RegisterFormValues) {
    if (busy.current || !challenge) return;
    busy.current = true;
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password, code: data.code, turnstileToken: challenge }),
      });
      const result = await response.json();
      if (!response.ok) {
        analyticsAuth.registerFailed(result.error || "registration_failed");
        toast.error(result.message || (isEn ? "Registration failed, please try again later" : "注册失败，请稍后重试"));
        return;
      }
      analyticsAuth.register();
      toast.success(isEn ? "Registration complete! Your email is verified, please sign in." : "注册成功，邮箱已验证，请登录");
      const target = callbackUrl;
      router.push(target === "/" ? "/login" : "/login?" + new URLSearchParams({ callbackUrl: target }).toString());
    } catch { toast.error(isEn ? "Registration failed, please try again later" : "注册失败，请稍后重试"); }
    finally { resetChallenge(); setIsLoading(false); busy.current = false; }
  }

  const disabled = isLoading || sending;
  const fields: { name: keyof RegisterFormValues; label: string; type?: string; placeholder?: string; autoComplete?: string; maxLength?: number }[] = [
    { name: "name", label: isEn ? "Nickname" : "昵称", placeholder: isEn ? "How should we call you (real name not required)" : "你希望大家如何称呼你（无需真实姓名）", autoComplete: "nickname", maxLength: 40 },
    { name: "email", label: isEn ? "Email" : "邮箱", type: "email", placeholder: "name@example.com", autoComplete: "email", maxLength: 254 },
    { name: "code", label: isEn ? "Email Verification Code" : "邮箱验证码", placeholder: isEn ? "6-digit code, valid for 10 minutes" : "6 位验证码，10 分钟有效", autoComplete: "one-time-code", maxLength: 6 },
    { name: "password", label: isEn ? "Password" : "密码", type: "password", autoComplete: "new-password", maxLength: 72 },
    { name: "confirmPassword", label: isEn ? "Confirm Password" : "确认密码", type: "password", autoComplete: "new-password", maxLength: 72 },
  ];
  return (
    <Form {...form}>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setScriptReady(true)} onError={() => { setChallenge(""); setChallengeError(isEn ? "Failed to load human verification script, please refresh and retry" : "人机验证脚本加载失败，请刷新重试"); }} />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        {fields.map(({ name, label, ...props }) => (
          <FormField key={name} control={form.control} name={name} render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs">{label}</FormLabel>
              <FormControl>{name === "password" || name === "confirmPassword" ? <PasswordInput {...props} {...field} className="h-8 text-sm" disabled={disabled} /> : <Input {...props} {...field} inputMode={name === "code" ? "numeric" : undefined} className="h-8 text-sm" disabled={disabled} />}</FormControl>
              <FormMessage className="text-xs" />
              {name === "code" && (
                <div className="space-y-1 pt-0.5">
                  <Button type="button" variant="outline" className="h-8 text-xs" onClick={sendCode} disabled={disabled || !challenge || !siteKey || cooldown > 0}>
                    {sending ? (isEn ? "Sending..." : "正在发送") : cooldown ? (isEn ? `Resend in ${cooldown}s` : `${cooldown} 秒后重发`) : (isEn ? "Send verification code" : "发送验证码")}
                  </Button>
                  {!challenge && !cooldown && (
                    <p className="text-[11px] text-muted-foreground">
                      {isEn ? "Complete the human verification below first to unlock sending the email code." : "请先完成下方人机验证，验证通过后即可发送验证码"}
                    </p>
                  )}
                </div>
              )}
            </FormItem>
          )} />
        ))}
        <DinoAdoptionPod trainerNicknameHint={form.watch("name")} />
        <p className="text-xs text-muted-foreground">{t("openRegistrationNote")}</p>
        <div ref={widgetNode} />
        {challenge && !challengeError && (
          <p role="status" className="text-xs text-emerald-600 dark:text-emerald-400">
            {isEn ? "✓ Human verification passed. You can now send the code or register." : "✓ 人机验证已通过，可发送验证码或提交注册"}
          </p>
        )}
        {challengeStalled && !challenge && !challengeError && (
          <p role="status" className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300">
            {isEn
              ? "Human verification is taking longer than expected or was blocked by your browser. Click \"Retry human verification\" below or disable ad-blockers and refresh."
              : "人机验证组件响应缓慢或被浏览器拦截，请点击下方「重新进行人机验证」，或关闭广告拦截插件后刷新页面重试。"}
          </p>
        )}
        {configError && <p role="alert" className="text-xs text-destructive">{configError}</p>}
        {challengeError && <p role="alert" className="text-xs text-destructive">{challengeError}</p>}
        {siteKey && <Button type="button" variant="ghost" className="h-8 text-xs" disabled={disabled} onClick={resetChallenge}>{isEn ? "Retry human verification" : "重新进行人机验证"}</Button>}
        <Button type="submit" className="w-full h-8 text-sm" disabled={disabled || !siteKey || !challenge || Boolean(configError)}>
          {isLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}{isEn ? "Register" : "注册"}
        </Button>
      </form>
    </Form>
  );
}
