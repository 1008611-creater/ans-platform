"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage("");
    try {
      const endpoint = sent ? "/api/auth/password-reset/confirm" : "/api/auth/password-reset/request";
      const body = sent ? { email, token: code, password } : { email };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!response.ok) {
        setMessage(data?.message || data?.error || "操作失败，请稍后重试");
        return;
      }
      if (!sent) {
        setSent(true);
        setMessage("验证码已发送，请检查邮箱（包括垃圾邮件文件夹）。");
      } else {
        router.push("/login?reset=success");
      }
    } catch {
      setMessage("网络暂时不可用，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">找回密码</h1>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-medium" htmlFor="reset-email">邮箱</label>
        <input id="reset-email" className="w-full rounded border p-2" type="email" required autoComplete="email" placeholder="请输入注册邮箱" value={email} onChange={(event) => setEmail(event.target.value)} disabled={sent || submitting} />
        {sent && (
          <>
            <label className="block text-sm font-medium" htmlFor="reset-code">4 位验证码</label>
            <input id="reset-code" className="w-full rounded border p-2" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required autoComplete="one-time-code" placeholder="请输入邮箱中的验证码" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))} />
            <label className="block text-sm font-medium" htmlFor="reset-password">新密码</label>
            <input id="reset-password" className="w-full rounded border p-2" type="password" minLength={6} required autoComplete="new-password" placeholder="至少 6 位" value={password} onChange={(event) => setPassword(event.target.value)} />
          </>
        )}
        <button className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-60" type="submit" disabled={submitting}>
          {submitting ? "处理中…" : sent ? "确认修改密码" : "发送验证码"}
        </button>
      </form>
      {message && <p className="mt-4 text-sm" role="status">{message}</p>}
    </main>
  );
}
