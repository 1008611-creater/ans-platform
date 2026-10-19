import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import {
  getBearerToken,
  getSupabaseConfig,
  getSupabaseUser,
  parseSupabaseError,
  requireSupabaseConfig,
  serviceHeaders,
  type SupabaseUser
} from "@/lib/image2-membership";

export type PictureAccount = {
  createdAt?: string;
  lastLoginAt?: string;
  loginCount?: number;
  updatedAt?: string;
  user: {
    id: string;
    username: string;
  };
};

export type PictureAccountSession = PictureAccount & {
  accessToken: string;
  expiresAt?: number;
  expiresIn?: number;
  refreshToken?: string;
};

type PictureAccountRow = {
  created_at?: string;
  last_login_at?: string | null;
  login_count?: number | null;
  updated_at?: string;
  user_id: string;
  username: string;
};

type PictureProfileRow = {
  created_at?: string;
  display_name?: string | null;
  last_login_at?: string | null;
  login_count?: number | null;
  source_host?: string | null;
  source_site?: string | null;
  updated_at?: string;
  user_id: string;
};

export class PictureAuthError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PictureAuthError";
    this.status = status;
  }
}

function authHeaders(kind: "admin" | "public") {
  const config = requireSupabaseConfig();
  const key = kind === "admin" ? config.serviceRoleKey : config.anonKey;
  const isSecretApiKey = key.startsWith("sb_secret_");
  return {
    apikey: key,
    ...(kind === "admin" && !isSecretApiKey ? { Authorization: `Bearer ${key}` } : {}),
    "Content-Type": "application/json"
  };
}

export function normalizePictureUsername(raw: unknown) {
  const username = String(raw ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    throw new PictureAuthError("用户名只能使用 3-24 位小写字母、数字或下划线。", 400);
  }
  return username;
}

export function normalizePicturePassword(raw: unknown) {
  const password = String(raw ?? "");
  if (password.length < 8 || password.length > 72) {
    throw new PictureAuthError("密码长度需要在 8-72 位之间。", 400);
  }
  return password;
}

function internalEmailForUsername(username: string) {
  const hash = createHash("sha256").update(`picture-account:${username}`).digest("hex").slice(0, 32);
  return `picture-user-${hash}@picture.lsb0713.online`;
}

function toAccount(row: PictureAccountRow): PictureAccount {
  return {
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at ?? undefined,
    loginCount: row.login_count ?? 0,
    updatedAt: row.updated_at,
    user: {
      id: row.user_id,
      username: row.username
    }
  };
}

function isMissingPictureAccountsMessage(message: string) {
  return /picture_accounts|schema cache|PGRST202|PGRST205|Could not find the table|relation .* does not exist|404/i.test(
    message
  );
}

function usernameFromProfile(row: PictureProfileRow) {
  return (row.display_name || "").trim().toLowerCase();
}

function toAccountFromProfile(row: PictureProfileRow): PictureAccount {
  const username = usernameFromProfile(row);
  if (!username) throw new PictureAuthError("账号资料缺少用户名，请重新登录。", 401);
  return {
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at ?? undefined,
    loginCount: row.login_count ?? 0,
    updatedAt: row.updated_at,
    user: {
      id: row.user_id,
      username
    }
  };
}

function toSession(data: Record<string, unknown>, username: string): PictureAccountSession {
  const user = ((data.user && typeof data.user === "object" ? data.user : {}) ?? {}) as { id?: string };
  const accessToken = typeof data.access_token === "string" ? data.access_token : "";
  if (!accessToken || !user.id) {
    throw new PictureAuthError("登录响应缺少会话信息。", 502);
  }

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : undefined;
  const expiresAt =
    typeof data.expires_at === "number"
      ? data.expires_at * 1000
      : expiresIn
        ? Date.now() + expiresIn * 1000
        : undefined;

  return {
    accessToken,
    expiresAt,
    expiresIn,
    refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : undefined,
    user: {
      id: user.id,
      username
    }
  };
}

function pictureAuthMessage(message: string) {
  if (isMissingPictureAccountsMessage(message)) {
    return "账号数据库还未完成迁移，请先执行公开制图台账号与历史迁移。";
  }
  if (/already registered|already been registered|User already registered|duplicate key|violates unique/i.test(message)) {
    return "这个用户名已经被占用。";
  }
  if (/invalid login credentials|invalid grant|email not confirmed|invalid password/i.test(message)) {
    return "用户名或密码不正确。";
  }
  return message;
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    throw new PictureAuthError(pictureAuthMessage(await parseSupabaseError(response, fallback)), response.status);
  }
  return (await response.json().catch(() => ({}))) as T;
}

async function readPictureProfileByUsername(username: string) {
  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/user_profiles?source_site=eq.picture&display_name=eq.${encodeURIComponent(
      username
    )}&select=user_id,display_name,source_host,source_site,last_login_at,login_count,created_at,updated_at&limit=1`,
    {
      headers: serviceHeaders(),
      cache: "no-store"
    }
  );
  const rows = await readJson<PictureProfileRow[]>(response, "账号资料读取失败。");
  return rows[0] ? toAccountFromProfile(rows[0]) : null;
}

async function readPictureProfileByUserId(userId: string) {
  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(
      userId
    )}&select=user_id,display_name,source_host,source_site,last_login_at,login_count,created_at,updated_at&limit=1`,
    {
      headers: serviceHeaders(),
      cache: "no-store"
    }
  );
  const rows = await readJson<PictureProfileRow[]>(response, "账号资料读取失败。");
  return rows[0] ? toAccountFromProfile(rows[0]) : null;
}

async function upsertPictureProfile(input: {
  host: string;
  lastLoginAt?: string | null;
  loginCount?: number;
  userId: string;
  username: string;
}) {
  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/user_profiles?on_conflict=user_id&select=user_id,display_name,source_host,source_site,last_login_at,login_count,created_at,updated_at`,
    {
      method: "POST",
      headers: serviceHeaders("resolution=merge-duplicates,return=representation"),
      body: JSON.stringify({
        user_id: input.userId,
        display_name: input.username,
        source_host: input.host,
        source_site: "picture",
        last_login_at: input.lastLoginAt,
        login_count: Math.max(0, input.loginCount ?? 0)
      })
    }
  );
  const rows = await readJson<PictureProfileRow[]>(response, "账号资料写入失败。");
  if (!rows[0]) throw new PictureAuthError("账号资料写入失败。", 500);
  return toAccountFromProfile(rows[0]);
}

async function readPictureAccountByUsername(username: string) {
  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/picture_accounts?username=eq.${encodeURIComponent(
      username
    )}&select=user_id,username,last_login_at,login_count,created_at,updated_at&limit=1`,
    {
      headers: serviceHeaders(),
      cache: "no-store"
    }
  );
  if (!response.ok) {
    const message = await parseSupabaseError(response, "账号读取失败。");
    if (isMissingPictureAccountsMessage(message)) return readPictureProfileByUsername(username);
    throw new PictureAuthError(pictureAuthMessage(message), response.status);
  }
  const rows = await readJson<PictureAccountRow[]>(response, "账号读取失败。");
  return rows[0] ? toAccount(rows[0]) : null;
}

async function readPictureAccountByUserId(userId: string) {
  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/picture_accounts?user_id=eq.${encodeURIComponent(
      userId
    )}&select=user_id,username,last_login_at,login_count,created_at,updated_at&limit=1`,
    {
      headers: serviceHeaders(),
      cache: "no-store"
    }
  );
  if (!response.ok) {
    const message = await parseSupabaseError(response, "账号读取失败。");
    if (isMissingPictureAccountsMessage(message)) return readPictureProfileByUserId(userId);
    throw new PictureAuthError(pictureAuthMessage(message), response.status);
  }
  const rows = await readJson<PictureAccountRow[]>(response, "账号读取失败。");
  return rows[0] ? toAccount(rows[0]) : null;
}

async function writeUserProfile(userId: string, username: string, host: string) {
  const config = getSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) return;
  const existing = await readPictureProfileByUserId(userId).catch(() => null);
  await upsertPictureProfile({
    host,
    lastLoginAt: new Date().toISOString(),
    loginCount: existing?.loginCount ?? 0,
    userId,
    username
  }).catch(() => undefined);
}

async function createAuthUser(username: string, password: string) {
  const config = requireSupabaseConfig();
  const response = await fetch(`${config.url}/auth/v1/admin/users`, {
    method: "POST",
    headers: authHeaders("admin"),
    body: JSON.stringify({
      email: internalEmailForUsername(username),
      password,
      email_confirm: true,
      user_metadata: {
        picture_username: username,
        source_site: "picture"
      }
    }),
    cache: "no-store"
  });
  const data = await readJson<Record<string, unknown>>(response, "账号创建失败。");
  const user = (data.user && typeof data.user === "object" ? data.user : data) as { id?: string };
  if (!user.id) throw new PictureAuthError("账号创建失败，缺少用户编号。", 502);
  return user.id;
}

async function deleteAuthUser(userId: string) {
  if (!userId) return;
  const config = getSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) return;
  await fetch(`${config.url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: authHeaders("admin")
  }).catch(() => undefined);
}

async function insertPictureAccount(userId: string, username: string, host: string) {
  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/picture_accounts?select=user_id,username,last_login_at,login_count,created_at,updated_at`,
    {
      method: "POST",
      headers: serviceHeaders("return=representation"),
      body: JSON.stringify({
        user_id: userId,
        username
      })
    }
  );
  if (!response.ok) {
    const message = await parseSupabaseError(response, "账号资料写入失败。");
    if (isMissingPictureAccountsMessage(message)) {
      return upsertPictureProfile({
        host,
        lastLoginAt: null,
        loginCount: 0,
        userId,
        username
      });
    }
    throw new PictureAuthError(pictureAuthMessage(message), response.status);
  }
  const rows = await readJson<PictureAccountRow[]>(response, "账号资料写入失败。");
  if (!rows[0]) throw new PictureAuthError("账号资料写入失败。", 500);
  return toAccount(rows[0]);
}

async function updateLoginStats(userId: string, currentLoginCount = 0, username?: string, host?: string) {
  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/picture_accounts?user_id=eq.${encodeURIComponent(
      userId
    )}&select=user_id,username,last_login_at,login_count,created_at,updated_at`,
    {
      method: "PATCH",
      headers: serviceHeaders("return=representation"),
      body: JSON.stringify({
        last_login_at: new Date().toISOString(),
        login_count: Math.max(0, currentLoginCount) + 1
      })
    }
  );
  if (!response.ok) {
    const message = await parseSupabaseError(response, "登录状态更新失败。");
    if (isMissingPictureAccountsMessage(message)) {
      const profile = username ? null : await readPictureProfileByUserId(userId);
      const resolvedUsername = username || profile?.user.username || "";
      if (!resolvedUsername) throw new PictureAuthError("账号资料缺少用户名，请重新登录。", 401);
      return upsertPictureProfile({
        host: host || "picture.lsb0713.online",
        lastLoginAt: new Date().toISOString(),
        loginCount: Math.max(0, currentLoginCount) + 1,
        userId,
        username: resolvedUsername
      });
    }
    throw new PictureAuthError(pictureAuthMessage(message), response.status);
  }
  const rows = await readJson<PictureAccountRow[]>(response, "登录状态更新失败。");
  return rows[0] ? toAccount(rows[0]) : null;
}

async function signInWithPassword(username: string, password: string) {
  const config = requireSupabaseConfig();
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders("public"),
    body: JSON.stringify({
      email: internalEmailForUsername(username),
      password
    }),
    cache: "no-store"
  });
  return readJson<Record<string, unknown>>(response, "登录失败。");
}

export async function registerPictureAccount(input: {
  host: string;
  password: string;
  username: string;
}) {
  const username = normalizePictureUsername(input.username);
  const password = normalizePicturePassword(input.password);
  const existing = await readPictureAccountByUsername(username);
  if (existing) throw new PictureAuthError("这个用户名已经被占用。", 409);

  let userId = "";
  try {
    userId = await createAuthUser(username, password);
    await insertPictureAccount(userId, username, input.host);
    await writeUserProfile(userId, username, input.host);
    const session = toSession(await signInWithPassword(username, password), username);
    return {
      ...session,
      ...(await updateLoginStats(session.user.id, 0, username, input.host))
    };
  } catch (error) {
    if (userId) await deleteAuthUser(userId);
    if (error instanceof PictureAuthError) throw error;
    throw new PictureAuthError(pictureAuthMessage(error instanceof Error ? error.message : String(error)), 400);
  }
}

export async function loginPictureAccount(input: {
  host: string;
  password: string;
  username: string;
}) {
  const username = normalizePictureUsername(input.username);
  const password = normalizePicturePassword(input.password);
  const account = await readPictureAccountByUsername(username);
  if (!account) throw new PictureAuthError("用户名或密码不正确。", 401);

  const session = toSession(await signInWithPassword(username, password), username);
  const updated = await updateLoginStats(session.user.id, account.loginCount ?? 0, username, input.host);
  await writeUserProfile(session.user.id, username, input.host);

  return {
    ...session,
    ...(updated ?? account)
  };
}

export async function readPictureSession(request: NextRequest): Promise<PictureAccountSession> {
  const user = await getSupabaseUser(request, "请先登录后再继续。");
  const account = await readPictureAccountByUserId(user.id);
  if (!account) throw new PictureAuthError("当前登录账号不是制图台账号，请重新登录。", 401);
  return {
    accessToken: getBearerToken(request),
    ...account
  };
}

export async function requirePictureUser(request: NextRequest): Promise<SupabaseUser & { username: string }> {
  const session = await readPictureSession(request);
  return {
    id: session.user.id,
    username: session.user.username
  };
}

export async function logoutPictureAccount(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) return true;

  const config = requireSupabaseConfig();
  const response = await fetch(`${config.url}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new PictureAuthError(pictureAuthMessage(await parseSupabaseError(response, "退出失败。")), response.status);
  }

  return true;
}
