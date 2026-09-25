"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_COOLDOWN_SECONDS = 600;

type ResetResponse = { message?: string; error?: string; retryAfter?: number } | null;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const timeout = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [cooldown]);

  function readRetryAfter(response: Response, data: ResetResponse) {
    const retry = Number(response.headers.get("Retry-After") || data?.retryAfter);
    if (Number.isFinite(retry) && retry > 0) return Math.min(MAX_COOLDOWN_SECONDS, Math.ceil(retry));
    return 0;
  }

  async function sendCode() {
    if (sending || cooldown > 0) return;
    const target = email.trim().toLowerCase();
    if (!target) {
      setError("请输入注册邮箱");
      return;
    }
    setSending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const data = (await response.json().catch(() => null)) as ResetResponse;
      const retry = readRetryAfter(response, data);
      if (retry) setCooldown(retry);

      if (response.status === 429) {
        setError(retry ? `请求过于频繁，请 ${retry} 秒后重试` : "请求过于频繁，请稍后重试");
        return;
      }
      if (response.status === 503) {
        setError(data?.message || "邮件服务暂不可用，请稍后重试");
        return;
      }
      if (!response.ok) {
        setError(data?.message || data?.error || "验证码发送失败，请稍后重试");
        return;
      }

      setSent(true);
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setMessage(
        (sent ? "验证码已重新发送" : "验证码已发送") +
          "，请检查邮箱（包括垃圾邮件文件夹）。若 1 分钟内仍未收到，请确认该邮箱已注册，或点击下方按钮重新发送。",
      );
    } catch {
      setError("网络暂时不可用，请稍后重试");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sent) {
      void sendCode();
      return;
    }
    void confirm();
  }

  async function confirm() {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), token: code, password }),
      });
      const data = (await response.json().catch(() => null)) as ResetResponse;
      if (!response.ok) {
        const retry = readRetryAfter(response, data);
        if (retry) setCooldown(retry);
        setError(data?.message || data?.error || "操作失败，请稍后重试");
        return;
      }
      router.push("/login?reset=success");
    } catch {
      setError("网络暂时不可用，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  const resendLabel = sending
    ? "正在发送…"
    : cooldown > 0
      ? `${cooldown} 秒后可重新发送`
      : sent
        ? "重新发送验证码"
        : "发送验证码";

  return (
    <main className="container mx-auto max-w-sm px-4 py-16">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">找回密码</h1>
        <p className="text-xs text-muted-foreground">
          通过注册邮箱接收 4 位验证码，验证后设置新密码
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs" htmlFor="reset-email">
            邮箱
          </Label>
          <Input
            id="reset-email"
            type="email"
            required
            autoComplete="email"
            placeholder="请输入注册邮箱"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={sent || sending}
          />
        </div>

        {sent && (
          <>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="reset-code">
                4 位验证码
              </Label>
              <Input
                id="reset-code"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                required
                autoComplete="one-time-code"
                placeholder="请输入邮箱中的验证码"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="reset-password">
                新密码
              </Label>
              <PasswordInput
                id="reset-password"
                minLength={6}
                required
                autoComplete="new-password"
                placeholder="至少 6 位"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
              />
            </div>
          </>
        )}

        {sent ? (
          <div className="space-y-2">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "正在提交…" : "确认修改密码"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={sendCode}
              disabled={sending || cooldown > 0}
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              {resendLabel}
            </Button>
          </div>
        ) : (
          <Button type="button" className="w-full" onClick={sendCode} disabled={sending}>
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            {resendLabel}
          </Button>
        )}
      </form>

      {message && (
        <p className="mt-4 text-xs text-muted-foreground" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/login" className="hover:underline">
          返回登录
        </Link>
      </p>
    </main>
  );
}
