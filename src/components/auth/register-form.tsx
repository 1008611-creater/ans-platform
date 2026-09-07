"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { analyticsAuth } from "@/lib/analytics";

type Turnstile = {
  render: (node: HTMLElement, options: { sitekey: string; action: string; language: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void; "timeout-callback": () => void }) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
const turnstile = () => (window as Window & { turnstile?: Turnstile }).turnstile;
const registerSchema = z.object({
  name: z.string().trim().min(2, "昵称至少 2 个字符").max(40, "昵称最多 40 个字符"),
  email: z.string().trim().max(254).email("请输入有效邮箱"),
  code: z.string().regex(/^\d{6}$/, "请输入 6 位邮箱验证码"),
  inviteCode: z.string().trim().max(128),
  password: z.string().min(6, "密码至少 6 位").refine(value => new TextEncoder().encode(value).length <= 72, "密码不能超过 72 个 UTF-8 字节"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, { message: "两次密码不一致", path: ["confirmPassword"] })
  .refine(data => data.email.toLowerCase().split("@")[1] === "cau.edu.cn" || Boolean(data.inviteCode), { message: "此邮箱需要邀请码", path: ["inviteCode"] });
type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [siteKey, setSiteKey] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const [challenge, setChallenge] = useState("");
  const [challengeError, setChallengeError] = useState("");
  const [configError, setConfigError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const widgetNode = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const busy = useRef(false);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", code: "", inviteCode: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/register/config", { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.siteKey) throw new Error(result.message || "注册服务暂不可用");
        if (!controller.signal.aborted) setSiteKey(result.siteKey);
      }).catch(error => { if (!controller.signal.aborted) setConfigError(error instanceof Error ? error.message : "注册服务暂不可用"); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const api = turnstile();
    if (!scriptReady || !siteKey || !widgetNode.current || !api) return;
    let active = true;
    const invalidate = (message: string) => { if (active) { setChallenge(""); setChallengeError(message); } };
    try {
      widgetId.current = api.render(widgetNode.current, {
        sitekey: siteKey, action: "register", language: "zh-cn",
        callback: token => { if (active) { setChallenge(token); setChallengeError(""); } },
        "expired-callback": () => invalidate("人机验证已过期，请重新验证"),
        "error-callback": () => invalidate("人机验证出错，请重新验证"),
        "timeout-callback": () => invalidate("人机验证超时，请重新验证"),
      });
    } catch { invalidate("人机验证加载失败，请刷新重试"); }
    return () => {
      active = false;
      if (widgetId.current !== undefined) {
        try { api.remove(widgetId.current); } catch { /* 脚本已清理 widget 时无需重试。 */ }
        widgetId.current = undefined;
      }
    };
  }, [scriptReady, siteKey]);

  useEffect(() => {
    if (!cooldown) return;
    const timeout = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [cooldown]);

  function resetChallenge() {
    setChallenge("");
    if (widgetId.current !== undefined) {
      try { turnstile()?.reset(widgetId.current); setChallengeError(""); }
      catch { setChallengeError("人机验证重置失败，请刷新页面"); }
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
      if (!response.ok) { toast.error(result.message || "验证码发送失败"); return; }
      setCooldown(60);
      form.setValue("code", "");
      toast.success("验证码已发送，请查收邮箱并再次完成人机验证");
    } catch { toast.error("验证码发送失败，请稍后重试"); }
    finally { resetChallenge(); setSending(false); busy.current = false; }
  }

  async function onSubmit(data: RegisterFormValues) {
    if (busy.current || !challenge) return;
    busy.current = true;
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password, code: data.code, inviteCode: data.inviteCode, turnstileToken: challenge }),
      });
      const result = await response.json();
      if (!response.ok) {
        analyticsAuth.registerFailed(result.error || "registration_failed");
        toast.error(result.message || "注册失败，请稍后重试");
        return;
      }
      analyticsAuth.register();
      toast.success("注册成功，邮箱已验证，请登录");
      router.push("/login");
    } catch { toast.error("注册失败，请稍后重试"); }
    finally { resetChallenge(); setIsLoading(false); busy.current = false; }
  }

  const disabled = isLoading || sending;
  const fields: { name: keyof RegisterFormValues; label: string; type?: string; placeholder?: string; autoComplete?: string; maxLength?: number }[] = [
    { name: "name", label: "昵称", placeholder: "你希望大家如何称呼你（无需真实姓名）", autoComplete: "nickname", maxLength: 40 },
    { name: "email", label: "邮箱", type: "email", autoComplete: "email", maxLength: 254 },
    { name: "code", label: "邮箱验证码", placeholder: "6 位验证码，10 分钟有效", autoComplete: "one-time-code", maxLength: 6 },
    { name: "inviteCode", label: "邀请码（非 cau.edu.cn 邮箱必填）", maxLength: 128 },
    { name: "password", label: "密码", type: "password", autoComplete: "new-password", maxLength: 72 },
    { name: "confirmPassword", label: "确认密码", type: "password", autoComplete: "new-password", maxLength: 72 },
  ];
  return (
    <Form {...form}>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setScriptReady(true)} onError={() => { setChallenge(""); setChallengeError("人机验证脚本加载失败，请刷新重试"); }} />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        {fields.map(({ name, label, ...props }) => (
          <FormField key={name} control={form.control} name={name} render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs">{label}</FormLabel>
              <FormControl><Input {...props} {...field} inputMode={name === "code" ? "numeric" : undefined} className="h-8 text-sm" disabled={disabled} /></FormControl>
              <FormMessage className="text-xs" />
              {name === "code" && <Button type="button" variant="outline" className="h-8 text-xs" onClick={sendCode} disabled={disabled || !challenge || !siteKey || cooldown > 0}>{sending ? "正在发送" : cooldown ? `${cooldown} 秒后重发` : "发送验证码"}</Button>}
            </FormItem>
          )} />
        ))}
        <p className="text-xs text-muted-foreground">所有邮箱均需验证码验证。仅 cau.edu.cn 精确域名免邀请码；昵称用于公开展示，不收集真实姓名。</p>
        <div ref={widgetNode} />
        {configError && <p role="alert" className="text-xs text-destructive">{configError}</p>}
        {challengeError && <p role="alert" className="text-xs text-destructive">{challengeError}</p>}
        {siteKey && <Button type="button" variant="ghost" className="h-8 text-xs" disabled={disabled} onClick={resetChallenge}>重新进行人机验证</Button>}
        <Button type="submit" className="w-full h-8 text-sm" disabled={disabled || !siteKey || !challenge || Boolean(configError)}>
          {isLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}注册
        </Button>
      </form>
    </Form>
  );
}
