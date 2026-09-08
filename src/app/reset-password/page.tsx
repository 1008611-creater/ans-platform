"use client";

import { FormEvent, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const presetEmail = params.get("email") || "";
  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState("");\n  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const endpoint = token ? "/api/auth/password-reset/confirm" : "/api/auth/password-reset/request";
      const body = token ? { email, token, password } : code ? { email, token: code, password } : { email };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "操作失败");
      setMessage(data.message);
      if (token) setTimeout(() => router.push("/login"), 1200);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "操作失败"); }
    finally { setBusy(false); }
  }

  return <main className="container flex min-h-[calc(100vh-6rem)] items-center justify-center py-8"><div className="w-full max-w-sm space-y-4"><div><h1 className="text-xl font-semibold">{token ? "设置新密�? : "找回密码"}</h1><p className="mt-2 text-sm text-muted-foreground">{token ? "设置后请使用新密码登录�? : "输入账号邮箱，我们会发送重置链接�?}</p></div><form onSubmit={submit} className="space-y-3"><Input type="email" required placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={busy || Boolean(token)} />{!token && message && <Input inputMode="numeric" maxLength={4} placeholder="4λ��֤��" value={code} onChange={e => setCode(e.target.value)} />} {token && <Input type="password" required minLength={6} maxLength={72} placeholder="新密码（至少 6 位）" value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />}<Button className="w-full" disabled={busy}>{busy ? "处理中�? : token ? "保存新密�? : "发送重置链�?}</Button></form>{message && <p role="status" className="text-sm text-green-600">{message}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Link href="/login" className="block text-center text-sm text-muted-foreground hover:underline">返回登录</Link></div></main>;
}

