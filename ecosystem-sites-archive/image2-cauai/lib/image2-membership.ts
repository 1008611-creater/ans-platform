import crypto from "crypto";
import { NextRequest } from "next/server";

export type Image2MembershipEntitlement = {
  id: string;
  source: string;
  plan: string;
  status: string;
  startsAt: string;
  endsAt: string;
  dailyLimit: number;
  resolution: string;
  maxDurationSeconds: number;
  canCloudSync: boolean;
  canPromptWorkbench: boolean;
  canBulkExport: boolean;
  canMemberCases: boolean;
  createdAt: string;
};

export type Image2MembershipStatus = {
  storageMode: "supabase-postgres";
  active: boolean;
  activeEntitlement?: Image2MembershipEntitlement;
  entitlements: Image2MembershipEntitlement[];
  user: {
    id: string;
    email?: string;
  };
};

export type SupabaseUser = {
  id: string;
  email?: string;
};

function tokenSecret() {
  return process.env.ANS_QUOTA_BRIDGE_KEY || process.env.ADMIN_TOKEN || "ans-image2-secret-key";
}

export function signAnsAccessToken(user: SupabaseUser, expiresInSeconds = 7 * 24 * 3600): string {
  const payload = {
    sub: user.id,
    email: user.email || "",
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", tokenSecret()).update(body).digest("base64url");
  return `ans.${body}.${sig}`;
}

export function verifyAnsAccessToken(token: string): SupabaseUser | null {
  if (!token || !token.startsWith("ans.")) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [, body, sig] = parts;
  const expected = crypto.createHmac("sha256", tokenSecret()).update(body).digest("base64url");
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      sub?: string;
      email?: string;
      exp?: number;
    };
    if (!parsed.sub || (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000))) return null;
    return { id: parsed.sub, email: parsed.email };
  } catch {
    return null;
  }
}

export async function callAnsBridge(payload: Record<string, unknown>) {
  const url = process.env.ANS_QUOTA_BRIDGE_URL || "https://38.76.193.254:8443/quota";
  const key = process.env.ANS_QUOTA_BRIDGE_KEY || "";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, any>;
  return { ok: response.ok, status: response.status, body };
}

export function getSupabaseConfig() {
  return {
    url: (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://image2.cauai.fun/api/ans-auth").replace(/\/+$/, ""),
    anonKey: process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "ans-unified-auth-v1",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "ans-unified-service-v1"
  };
}

export function requireSupabaseConfig() {
  return getSupabaseConfig();
}

export function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export function serviceHeaders(prefer?: string) {
  const config = getSupabaseConfig();
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {})
  };
}

export async function parseSupabaseError(response: Response, fallback: string) {
  const text = await response.text().catch(() => "");
  if (!text) return fallback;
  try {
    const data = JSON.parse(text) as { error?: string; error_description?: string; message?: string };
    return data.error_description ?? data.message ?? data.error ?? fallback;
  } catch {
    return text.slice(0, 240) || fallback;
  }
}

export async function getSupabaseUser(
  request: NextRequest,
  loginMessage = "请先登录 ANS 账号后再操作。"
): Promise<SupabaseUser> {
  const token = getBearerToken(request);
  if (!token) throw new Error(loginMessage);
  return getSupabaseUserFromAccessToken(token, loginMessage);
}

export async function getSupabaseUserFromAccessToken(
  token: string,
  loginMessage = "登录状态已失效，请重新登录 ANS 账号。"
): Promise<SupabaseUser> {
  const verified = verifyAnsAccessToken(token.trim());
  if (verified) return verified;
  throw new Error(loginMessage);
}

export function hashLicenseCode(code: string) {
  const normalized = code.trim().toUpperCase();
  const pepper = process.env.LICENSE_CODE_PEPPER ?? "";
  return crypto.createHash("sha256").update(`${pepper}:${normalized}`).digest("hex");
}

export function hashAuditValue(value: string) {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const salt = process.env.AUTH_EVENT_IP_SALT ?? process.env.LICENSE_CODE_PEPPER ?? "image2-membership";
  return crypto.createHash("sha256").update(`${salt}:${normalized}`).digest("hex");
}

export async function readImage2Membership(user: SupabaseUser): Promise<Image2MembershipStatus> {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  const activeEntitlement: Image2MembershipEntitlement = {
    id: `ans_entitlement_${user.id}`,
    source: "ans-unified",
    plan: "ans_unified_credits",
    status: "active",
    startsAt: now,
    endsAt: future,
    dailyLimit: 50,
    resolution: "1080p",
    maxDurationSeconds: 15,
    canCloudSync: true,
    canPromptWorkbench: true,
    canBulkExport: true,
    canMemberCases: true,
    createdAt: now
  };
  return {
    storageMode: "supabase-postgres",
    active: true,
    activeEntitlement,
    entitlements: [activeEntitlement],
    user
  };
}

export async function redeemImage2License(_request: NextRequest, user: SupabaseUser, _code: string) {
  const now = new Date().toISOString();
  const endsAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  return {
    redemption: {
      ok: true,
      entitlementId: `ans_${user.id}`,
      plan: "ans_unified_credits",
      startsAt: now,
      endsAt
    },
    membership: await readImage2Membership(user)
  };
}
