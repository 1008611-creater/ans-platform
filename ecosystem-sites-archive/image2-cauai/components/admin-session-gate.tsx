"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Loader2, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import styles from "./admin-session-gate.module.css";

type Identity = {
  email?: string;
  id: string;
};

type SessionResponse = {
  authenticated?: boolean;
  canRefresh?: boolean;
  error?: string;
  identity?: Identity;
};

type GateState = "checking" | "authenticated" | "signed-out" | "forbidden" | "error";

async function readJson(response: Response) {
  return response.json().catch(() => ({})) as Promise<SessionResponse>;
}

export function AdminSessionGate({ children, returnTo }: { children: ReactNode; returnTo: string }) {
  const [state, setState] = useState<GateState>("checking");
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [message, setMessage] = useState("正在验证管理员会话...");

  useEffect(() => {
    let active = true;

    const accept = (data: SessionResponse) => {
      if (!active || !data.authenticated || !data.identity) return false;
      setIdentity(data.identity);
      setState("authenticated");
      return true;
    };

    const verify = async () => {
      try {
        const current = await fetch("/api/admin/session", { cache: "no-store" });
        const currentData = await readJson(current);
        if (current.ok && accept(currentData)) return;
        if (current.status === 403) {
          setState("forbidden");
          setMessage(currentData.error || "当前账号没有管理员权限。");
          return;
        }

        if (!currentData.canRefresh) {
          setState("signed-out");
          setMessage(currentData.error || "请使用管理员账号登录。");
          return;
        }

        const refreshed = await fetch("/api/admin/session/refresh", {
          method: "POST",
          headers: { "x-image2-admin-csrf": "1" }
        });
        const refreshedData = await readJson(refreshed);
        if (refreshed.ok && accept(refreshedData)) return;

        setState(refreshed.status === 403 ? "forbidden" : "signed-out");
        setMessage(refreshedData.error || "请使用管理员账号登录。");
      } catch {
        if (!active) return;
        setState("error");
        setMessage("管理员会话服务暂时不可用，请稍后重试。");
      }
    };

    void verify();
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    await fetch("/api/admin/session", {
      method: "DELETE",
      headers: { "x-image2-admin-csrf": "1" }
    }).catch(() => undefined);
    window.location.assign(`/login?intent=admin&returnTo=${encodeURIComponent(returnTo)}`);
  }

  if (state === "authenticated") {
    return (
      <>
        <div className={styles.sessionBar}>
          <span><ShieldCheck aria-hidden="true" />已验证管理员{identity?.email ? ` · ${identity.email}` : ""}</span>
          <button type="button" onClick={() => void logout()}><LogOut aria-hidden="true" />退出</button>
        </div>
        {children}
      </>
    );
  }

  const loginHref = `/login?intent=admin&returnTo=${encodeURIComponent(returnTo)}`;
  return (
    <main className={styles.gate}>
      <section>
        {state === "checking" ? <Loader2 className={styles.spinner} aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
        <span>Image2 Admin</span>
        <h1>{state === "checking" ? "验证管理员会话" : state === "forbidden" ? "没有管理员权限" : "需要管理员登录"}</h1>
        <p>{message}</p>
        {state !== "checking" ? <a href={loginHref}>使用管理员账号登录</a> : null}
      </section>
    </main>
  );
}
