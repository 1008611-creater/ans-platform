"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, Loader2, ShieldCheck, UsersRound, WalletCards } from "lucide-react";

type AdminUserSummary = {
  createdAt?: string;
  displayName?: string;
  email?: string;
  lastLoginAt?: string;
  loginCount?: number;
  phone?: string;
  role?: "admin" | "user";
  recentEvents?: Array<{
    createdAt: string;
    eventType: string;
    host?: string;
    success: boolean;
  }>;
  sourceHost?: string;
  sourceSite?: string;
  userId: string;
  wallet?: {
    balance: number;
    lifetimeCredited: number;
    lifetimeSpent: number;
    updatedAt?: string;
  };
};

type UsersResponse = {
  error?: string;
  storageMode?: string;
  totals?: {
    users?: number;
    walletBalance?: number;
  };
  users?: AdminUserSummary[];
};

type Status = {
  message: string;
  tone: "idle" | "busy" | "success" | "error";
};

function formatTime(value?: string) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: text.slice(0, 240) } as T;
  }
}

function eventLabel(eventType: string) {
  const labels: Record<string, string> = {
    admin_read: "后台读取",
    login: "登录成功",
    logout: "退出登录",
    otp_send: "发送验证码",
    otp_verify: "校验验证码"
  };
  return labels[eventType] ?? eventType;
}

export function AdminUsersConsole() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [storageMode, setStorageMode] = useState("");
  const [status, setStatus] = useState<Status>({
    message: "管理员会话已验证，正在读取统一账号列表。",
    tone: "idle"
  });

  const stats = useMemo(
    () => {
      const wallets = users.map((user) => user.wallet).filter((wallet): wallet is NonNullable<AdminUserSummary["wallet"]> => Boolean(wallet));
      return {
        users: users.length,
        active: users.some((user) => user.lastLoginAt !== undefined) ? users.filter((user) => user.lastLoginAt).length : null,
        balance: wallets.length ? wallets.reduce((sum, wallet) => sum + wallet.balance, 0) : null
      };
    },
    [users]
  );

  const loadUsers = useCallback(async () => {
    setStatus({ message: "正在读取用户列表...", tone: "busy" });
    try {
      const response = await fetch("/api/admin/users?limit=80", {
        cache: "no-store"
      });
      const data = await readJson<UsersResponse>(response);
      if (!response.ok) throw new Error(data.error || "用户列表读取失败。");
      setUsers(data.users ?? []);
      setStorageMode(data.storageMode ?? "");
      setStatus({ message: `已读取 ${data.users?.length ?? 0} 个统一账号。`, tone: "success" });
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : "用户列表读取失败。", tone: "error" });
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  return (
    <section className="admin-users-panel" aria-label="统一用户管理">
      <div className="admin-users-head">
        <span>
          <UsersRound aria-hidden="true" />
          用户管理
        </span>
        <strong>统一账号与图片余额</strong>
        <p>集中查看邮箱、手机号、来源站点、最近登录、验证码事件和图片余额，先用现有后台口令保护。</p>
      </div>

      <div className="admin-users-auth">
        <div>
          <span>管理员会话</span>
          <small>HttpOnly Cookie · 服务端角色校验</small>
        </div>
        <button type="button" disabled={status.tone === "busy"} onClick={() => void loadUsers()}>
          {status.tone === "busy" ? <Loader2 className="spinning" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
          刷新用户
        </button>
      </div>

      <div className={`admin-users-status ${status.tone}`}>
        {status.tone === "error" ? <AlertTriangle aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
        <span>{status.message}</span>
        {storageMode ? <small>{storageMode}</small> : null}
      </div>

      <div className="admin-users-stats" aria-label="用户摘要">
        <div>
          <span>{stats.users}</span>
          <small>统一账号</small>
        </div>
        <div>
          <span>{stats.active ?? "—"}</span>
          <small>{stats.active === null ? "登录记录未接通" : "有登录记录"}</small>
        </div>
        <div>
          <span>{stats.balance ?? "—"}</span>
          <small>{stats.balance === null ? "图片余额未接通" : "图片余额合计"}</small>
        </div>
      </div>

      <div className="admin-users-table">
        {users.length ? (
          users.map((user) => (
            <article className="admin-user-row" key={user.userId}>
              <div className="admin-user-identity">
                <strong>{user.displayName || user.email || user.phone || "未命名用户"}</strong>
                <span>{user.email || user.phone || "无联系方式"}</span>
                <small>{user.userId}</small>
              </div>
              <div>
                <span>角色</span>
                <strong>{user.role === "admin" ? "管理员" : "普通用户"}</strong>
                <small>{user.sourceHost || user.sourceSite || "profiles"}</small>
              </div>
              <div>
                <span>最近登录</span>
                <strong>{formatTime(user.lastLoginAt)}</strong>
                <small>创建 {formatTime(user.createdAt)}</small>
              </div>
              <div className="admin-user-wallet">
                <span>
                  <WalletCards aria-hidden="true" />
                  图片余额
                </span>
                <strong>{user.wallet?.balance ?? 0}</strong>
                <small>
                  累计 +{user.wallet?.lifetimeCredited ?? 0} / -{user.wallet?.lifetimeSpent ?? 0}
                </small>
              </div>
              <div className="admin-user-events">
                {(user.recentEvents ?? []).length ? (
                  user.recentEvents?.slice(0, 3).map((event) => (
                    <small className={event.success ? "success" : "error"} key={`${user.userId}-${event.eventType}-${event.createdAt}`}>
                      {eventLabel(event.eventType)} · {formatTime(event.createdAt)}
                    </small>
                  ))
                ) : (
                  <small>暂无事件</small>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="admin-users-empty">
            <UsersRound aria-hidden="true" />
            <strong>暂无用户数据</strong>
            <p>数据库已连接但没有可展示的统一账号，或相关迁移尚未接通。</p>
          </div>
        )}
      </div>
    </section>
  );
}
