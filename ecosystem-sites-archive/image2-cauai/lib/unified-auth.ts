import crypto from "crypto";
import type { NextRequest } from "next/server";
import {
  getSupabaseConfig,
  parseSupabaseError,
  requireSupabaseConfig,
  serviceHeaders
} from "@/lib/image2-membership";

export type LoginIdentifier = {
  kind: "email" | "phone";
  value: string;
};

export type UnifiedAccountSession = {
  accessToken: string;
  expiresAt?: number;
  expiresIn?: number;
  refreshToken?: string;
  user: {
    email?: string;
    id: string;
    phone?: string;
  };
};

export type UnifiedUserProfile = {
  createdAt?: string;
  displayName?: string;
  email?: string;
  lastLoginAt?: string;
  loginCount?: number;
  phone?: string;
  sourceHost?: string;
  sourceSite?: string;
  updatedAt?: string;
  userId: string;
};

export type AdminUserSummary = UnifiedUserProfile & {
  recentEvents: Array<{
    createdAt: string;
    eventType: string;
    host?: string;
    success: boolean;
  }>;
  wallet?: {
    balance: number;
    lifetimeCredited: number;
    lifetimeSpent: number;
    updatedAt?: string;
  };
};

export class UnifiedAuthError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "UnifiedAuthError";
    this.status = status;
  }
}

type ProfileRow = {
  created_at?: string;
  display_name?: string | null;
  email?: string | null;
  last_login_at?: string | null;
  login_count?: number | null;
  phone?: string | null;
  source_host?: string | null;
  source_site?: string | null;
  updated_at?: string;
  user_id: string;
};

type WalletRow = {
  balance?: number | null;
  lifetime_credited?: number | null;
  lifetime_spent?: number | null;
  updated_at?: string | null;
  user_id: string;
};

type AuthEventRow = {
  created_at: string;
  event_type: string;
  host?: string | null;
  success: boolean;
  user_id?: string | null;
};

function authMockEnabled() {
  if (process.env.NODE_ENV === "production" && !/^(1|true|yes|on)$/i.test(process.env.UNIFIED_AUTH_ALLOW_MOCKS ?? "")) {
    return false;
  }
  return /^(1|true|yes|on|pass|auto)$/i.test(process.env.UNIFIED_AUTH_SUPABASE_MOCK ?? "");
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "";
}

function hashAuditValue(value: string) {
  if (!value) return null;
  const salt = process.env.UNIFIED_AUTH_AUDIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "image2-unified-auth-v1";
  return crypto.createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

function deterministicMockUuid(value: string) {
  const hex = crypto.createHash("sha256").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function authHeaders() {
  const config = requireSupabaseConfig();
  return {
    apikey: config.anonKey,
    "Content-Type": "application/json"
  };
}

function toUnifiedAuthError(message: string) {
  if (/user_profiles|auth_events|schema cache|PGRST202|PGRST205|Could not find the table|relation .* does not exist|404/i.test(message)) {
    return "统一账号数据库还未完成迁移，请先执行 unified auth profiles migration。";
  }
  if (/image2_wallets|image2_wallet_transactions|schema cache|PGRST205|404/i.test(message)) {
    return "图片余额数据库还未完成迁移。";
  }
  return message;
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    throw new UnifiedAuthError(toUnifiedAuthError(await parseSupabaseError(response, fallback)), response.status);
  }
  return (await response.json().catch(() => ({}))) as T;
}

export function requestHost(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || "";
  return host.split(":")[0].toLowerCase();
}

export function sourceSiteFromHost(host: string) {
  if (host === "scene.lsb0713.online") return "scene";
  return "image2";
}

export function normalizeLoginIdentifier(raw: unknown): LoginIdentifier {
  const value = String(raw ?? "").trim();
  if (!value) throw new UnifiedAuthError("请输入邮箱或手机号。", 400);

  if (value.includes("@")) {
    const email = value.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new UnifiedAuthError("邮箱格式不正确。", 400);
    }
    return { kind: "email", value: email };
  }

  const phone = value.replace(/\s+/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new UnifiedAuthError("手机号请使用 E.164 格式，例如 +8613800000000。", 400);
  }
  return { kind: "phone", value: phone };
}

export function maskIdentifier(identifier: LoginIdentifier) {
  if (identifier.kind === "phone") {
    return identifier.value.replace(/^(\+\d{2,4})\d+(\d{4})$/, "$1****$2");
  }
  const [name, domain] = identifier.value.split("@");
  if (!domain) return identifier.value;
  const head = name.length <= 2 ? `${name[0] ?? "*"}*` : `${name.slice(0, 2)}***`;
  return `${head}@${domain}`;
}

export async function sendSupabaseOtp(input: {
  host: string;
  identifier: LoginIdentifier;
  redirectTo?: string;
}) {
  const config = getSupabaseConfig();
  const body =
    input.identifier.kind === "email"
      ? {
          email: input.identifier.value,
          data: {
            source_host: input.host,
            source_site: sourceSiteFromHost(input.host)
          },
          create_user: true
        }
      : {
          phone: input.identifier.value,
          data: {
            source_host: input.host,
            source_site: sourceSiteFromHost(input.host)
          },
          create_user: true,
          channel: "sms"
        };

  const url = new URL(`${config.url}/auth/v1/otp`);
  if (input.identifier.kind === "email" && input.redirectTo) {
    url.searchParams.set("redirect_to", input.redirectTo);
  }

  if (authMockEnabled()) {
    return {
      mock: true,
      providerRequest: {
        body,
        method: "POST",
        url: url.toString()
      }
    };
  }

  if (!config.url || !config.anonKey) {
    throw new UnifiedAuthError("Supabase 账号入口未配置完整，请检查 URL 和 publishable/anon key。", 400);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
    cache: "no-store"
  });
  await readJson<Record<string, unknown>>(response, "验证码发送失败。");
  return { mock: false };
}

export async function verifySupabaseOtp(input: {
  identifier: LoginIdentifier;
  token: string;
}): Promise<UnifiedAccountSession> {
  const token = input.token.trim();
  if (!/^\d{4,10}$/.test(token)) {
    throw new UnifiedAuthError("请输入正确的验证码。", 400);
  }

  if (authMockEnabled()) {
    const userId = deterministicMockUuid(input.identifier.value);
    return {
      accessToken: `mock-access-token-${userId}`,
      expiresAt: Date.now() + 3600 * 1000,
      expiresIn: 3600,
      refreshToken: `mock-refresh-token-${userId}`,
      user: {
        id: userId,
        email: input.identifier.kind === "email" ? input.identifier.value : undefined,
        phone: input.identifier.kind === "phone" ? input.identifier.value : undefined
      }
    };
  }

  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    throw new UnifiedAuthError("Supabase 账号入口未配置完整，请检查 URL 和 publishable/anon key。", 400);
  }

  const body =
    input.identifier.kind === "email"
      ? { email: input.identifier.value, token, type: "email" }
      : { phone: input.identifier.value, token, type: "sms" };

  const response = await fetch(`${config.url}/auth/v1/verify`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const data = await readJson<Record<string, unknown>>(response, "验证码校验失败。");
  return toAccountSession(data);
}

export async function refreshSupabaseSession(refreshToken: string): Promise<UnifiedAccountSession> {
  const token = refreshToken.trim();
  if (!token) throw new UnifiedAuthError("管理员会话已过期，请重新登录。", 401);

  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    throw new UnifiedAuthError("Supabase 账号入口未配置完整，请检查 URL 和 publishable/anon key。", 500);
  }

  const response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refresh_token: token }),
    cache: "no-store"
  });
  const data = await readJson<Record<string, unknown>>(response, "管理员会话刷新失败，请重新登录。");
  return toAccountSession(data);
}

export async function revokeSupabaseSession(accessToken: string) {
  const token = accessToken.trim();
  if (!token) return;
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) return;

  await fetch(`${config.url}/auth/v1/logout?scope=local`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });
}

function toAccountSession(data: Record<string, unknown>): UnifiedAccountSession {
  const session = (data.session && typeof data.session === "object" ? data.session : data) as Record<string, unknown>;
  const user = ((data.user && typeof data.user === "object" ? data.user : session.user) ?? {}) as {
    email?: string;
    id?: string;
    phone?: string;
  };
  const accessToken = typeof session.access_token === "string" ? session.access_token : "";
  if (!accessToken || !user.id) {
    throw new UnifiedAuthError("登录响应缺少会话信息。", 502);
  }

  const expiresIn = typeof session.expires_in === "number" ? session.expires_in : undefined;
  const expiresAt =
    typeof session.expires_at === "number"
      ? session.expires_at * 1000
      : expiresIn
        ? Date.now() + expiresIn * 1000
        : undefined;

  return {
    accessToken,
    expiresAt,
    expiresIn,
    refreshToken: typeof session.refresh_token === "string" ? session.refresh_token : undefined,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone
    }
  };
}

function toProfile(row: ProfileRow): UnifiedUserProfile {
  return {
    userId: row.user_id,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    displayName: row.display_name ?? undefined,
    sourceHost: row.source_host ?? undefined,
    sourceSite: row.source_site ?? undefined,
    lastLoginAt: row.last_login_at ?? undefined,
    loginCount: row.login_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function readProfile(userId: string) {
  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(
      userId
    )}&select=user_id,email,phone,display_name,source_host,source_site,last_login_at,login_count,created_at,updated_at&limit=1`,
    {
      headers: serviceHeaders(),
      cache: "no-store"
    }
  );
  const rows = await readJson<ProfileRow[]>(response, "用户资料读取失败。");
  return rows[0] ?? null;
}

export async function upsertUserProfile(input: {
  host: string;
  identifier: LoginIdentifier;
  session: UnifiedAccountSession;
}) {
  if (authMockEnabled()) {
    return {
      userId: input.session.user.id,
      email: input.session.user.email,
      phone: input.session.user.phone,
      displayName: input.session.user.email ?? input.session.user.phone,
      sourceHost: input.host,
      sourceSite: sourceSiteFromHost(input.host),
      lastLoginAt: new Date().toISOString(),
      loginCount: 1
    } satisfies UnifiedUserProfile;
  }

  const config = requireSupabaseConfig();
  const existing = await readProfile(input.session.user.id);
  const now = new Date().toISOString();
  const email = input.session.user.email ?? (input.identifier.kind === "email" ? input.identifier.value : existing?.email ?? null);
  const phone = input.session.user.phone ?? (input.identifier.kind === "phone" ? input.identifier.value : existing?.phone ?? null);
  const response = await fetch(`${config.url}/rest/v1/user_profiles?on_conflict=user_id&select=user_id,email,phone,display_name,source_host,source_site,last_login_at,login_count,created_at,updated_at`, {
    method: "POST",
    headers: serviceHeaders("resolution=merge-duplicates,return=representation"),
    body: JSON.stringify({
      user_id: input.session.user.id,
      email,
      phone,
      display_name: existing?.display_name ?? email ?? phone ?? "Image2 用户",
      source_host: input.host,
      source_site: sourceSiteFromHost(input.host),
      last_login_at: now,
      login_count: (existing?.login_count ?? 0) + 1
    })
  });
  const rows = await readJson<ProfileRow[]>(response, "用户资料写入失败。");
  if (!rows[0]) throw new UnifiedAuthError("用户资料写入失败。", 500);
  return toProfile(rows[0]);
}

export async function initializeImage2Wallet(userId: string) {
  if (authMockEnabled()) return true;

  const config = requireSupabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/image2_wallets?on_conflict=user_id`, {
    method: "POST",
    headers: serviceHeaders("resolution=ignore-duplicates,return=minimal"),
    body: JSON.stringify({ user_id: userId })
  });
  if (!response.ok) {
    throw new UnifiedAuthError(toUnifiedAuthError(await parseSupabaseError(response, "图片余额初始化失败。")), response.status);
  }
  return true;
}

export async function recordAuthEvent(input: {
  eventType: "otp_send" | "otp_verify" | "login" | "logout" | "admin_read";
  failureReason?: string;
  host: string;
  identifier?: LoginIdentifier;
  request: NextRequest;
  success: boolean;
  userId?: string;
}) {
  if (authMockEnabled()) return;

  const config = getSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) return;

  const response = await fetch(`${config.url}/rest/v1/auth_events`, {
    method: "POST",
    headers: serviceHeaders("return=minimal"),
    body: JSON.stringify({
      user_id: input.userId,
      event_type: input.eventType,
      identifier_type: input.identifier?.kind,
      identifier_hash: input.identifier ? hashAuditValue(input.identifier.value) : undefined,
      ip_hash: hashAuditValue(getClientIp(input.request)),
      user_agent: input.request.headers.get("user-agent")?.slice(0, 500) ?? "",
      host: input.host,
      success: input.success,
      failure_reason: input.failureReason?.slice(0, 240)
    })
  });

  if (!response.ok) {
    throw new UnifiedAuthError(toUnifiedAuthError(await parseSupabaseError(response, "认证事件写入失败。")), response.status);
  }
}

export async function completeVerifiedLogin(input: {
  host: string;
  identifier: LoginIdentifier;
  request: NextRequest;
  session: UnifiedAccountSession;
}) {
  const profile = await upsertUserProfile(input);
  let walletInitialized = false;
  try {
    walletInitialized = await initializeImage2Wallet(input.session.user.id);
  } catch {
    walletInitialized = false;
  }

  try {
    await recordAuthEvent({
      eventType: "login",
      host: input.host,
      identifier: input.identifier,
      request: input.request,
      success: true,
      userId: input.session.user.id
    });
  } catch {
    // Login should not fail only because the audit row could not be written.
  }

  return {
    profile,
    session: input.session,
    walletInitialized
  };
}

function toWallet(row?: WalletRow): AdminUserSummary["wallet"] {
  if (!row) return undefined;
  return {
    balance: Math.max(0, Number(row.balance ?? 0) || 0),
    lifetimeCredited: Math.max(0, Number(row.lifetime_credited ?? 0) || 0),
    lifetimeSpent: Math.max(0, Number(row.lifetime_spent ?? 0) || 0),
    updatedAt: row.updated_at ?? undefined
  };
}

function inFilter(values: string[]) {
  return `in.(${values.map((value) => value.replace(/[()'",]/g, "")).join(",")})`;
}

export async function listAdminUsers(limit: number) {
  if (authMockEnabled()) {
    return {
      storageMode: "mock",
      totals: {
        users: 1,
        walletBalance: 20
      },
      users: [
        {
          userId: deterministicMockUuid("buyer@example.com"),
          email: "buyer@example.com",
          displayName: "buyer@example.com",
          sourceHost: "scene.lsb0713.online",
          sourceSite: "scene",
          lastLoginAt: new Date().toISOString(),
          loginCount: 1,
          wallet: {
            balance: 20,
            lifetimeCredited: 20,
            lifetimeSpent: 0,
            updatedAt: new Date().toISOString()
          },
          recentEvents: [
            {
              createdAt: new Date().toISOString(),
              eventType: "login",
              host: "scene.lsb0713.online",
              success: true
            }
          ]
        }
      ] satisfies AdminUserSummary[]
    };
  }

  const config = requireSupabaseConfig();
  const safeLimit = Math.min(Math.max(Math.floor(limit) || 50, 1), 200);
  const profileResponse = await fetch(
    `${config.url}/rest/v1/user_profiles?select=user_id,email,phone,display_name,source_host,source_site,last_login_at,login_count,created_at,updated_at&order=last_login_at.desc.nullslast&limit=${safeLimit}`,
    {
      headers: serviceHeaders(),
      cache: "no-store"
    }
  );
  const profiles = await readJson<ProfileRow[]>(profileResponse, "用户列表读取失败。");
  const userIds = profiles.map((row) => row.user_id);
  const walletsByUser = new Map<string, WalletRow>();
  const eventsByUser = new Map<string, AuthEventRow[]>();

  if (userIds.length) {
    const walletResponse = await fetch(
      `${config.url}/rest/v1/image2_wallets?user_id=${inFilter(
        userIds
      )}&select=user_id,balance,lifetime_credited,lifetime_spent,updated_at`,
      {
        headers: serviceHeaders(),
        cache: "no-store"
      }
    ).catch(() => null);
    if (walletResponse?.ok) {
      const wallets = (await walletResponse.json().catch(() => [])) as WalletRow[];
      wallets.forEach((row) => walletsByUser.set(row.user_id, row));
    }

    const eventResponse = await fetch(
      `${config.url}/rest/v1/auth_events?user_id=${inFilter(
        userIds
      )}&select=user_id,event_type,success,host,created_at&order=created_at.desc&limit=200`,
      {
        headers: serviceHeaders(),
        cache: "no-store"
      }
    ).catch(() => null);
    if (eventResponse?.ok) {
      const events = (await eventResponse.json().catch(() => [])) as AuthEventRow[];
      events.forEach((event) => {
        if (!event.user_id) return;
        const list = eventsByUser.get(event.user_id) ?? [];
        if (list.length < 5) list.push(event);
        eventsByUser.set(event.user_id, list);
      });
    }
  }

  const users: AdminUserSummary[] = profiles.map((row) => ({
    ...toProfile(row),
    wallet: toWallet(walletsByUser.get(row.user_id)),
    recentEvents: (eventsByUser.get(row.user_id) ?? []).map((event) => ({
      createdAt: event.created_at,
      eventType: event.event_type,
      host: event.host ?? undefined,
      success: event.success
    }))
  }));

  return {
    storageMode: "supabase-postgres",
    totals: {
      users: users.length,
      walletBalance: users.reduce((sum, user) => sum + (user.wallet?.balance ?? 0), 0)
    },
    users
  };
}
