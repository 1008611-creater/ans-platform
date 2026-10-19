import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import {
  getBearerToken,
  getSupabaseUserFromAccessToken,
  parseSupabaseError,
  requireSupabaseConfig,
  serviceHeaders,
  type SupabaseUser
} from "@/lib/image2-membership";
import { AdminSessionError, getAdminAccessToken } from "@/lib/admin-session";
import { isProductionRuntime } from "@/lib/runtime-access";

export type AdminIdentity = {
  email?: string;
  id: string;
  method: "break-glass" | "supabase-role";
};

export class AdminAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

type ProfileRow = {
  email: string | null;
  id: string;
  role: string;
};

function isTruthy(value: string | undefined) {
  return /^(1|true|yes|on)$/i.test(value?.trim() ?? "");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function breakGlassEnabled() {
  return !isProductionRuntime() || isTruthy(process.env.IMAGE2_ENABLE_ADMIN_TOKEN_BREAK_GLASS);
}

function tryBreakGlass(request: NextRequest) {
  if (!breakGlassEnabled()) return null;

  const configured = process.env.ADMIN_TOKEN?.trim() ?? "";
  if (!configured) return null;

  const bearer = getBearerToken(request);
  const header = request.headers.get("x-admin-token")?.trim() ?? "";
  const candidate = header || bearer;
  if (!candidate || !safeEqual(candidate, configured)) return null;

  return {
    id: "break-glass",
    method: "break-glass"
  } satisfies AdminIdentity;
}

async function readAdminProfile(userId: string) {
  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,email,role&limit=1`,
    {
      cache: "no-store",
      headers: serviceHeaders()
    }
  );

  if (!response.ok) {
    throw new AdminAuthError(await parseSupabaseError(response, "管理员角色读取失败。"), 503);
  }

  return ((await response.json()) as ProfileRow[])[0] ?? null;
}

export async function requireAdminUser(user: SupabaseUser): Promise<AdminIdentity> {
  const profile = await readAdminProfile(user.id);
  if (!profile || profile.role !== "admin") {
    throw new AdminAuthError("当前账号没有管理员权限。", 403);
  }

  return {
    email: profile.email ?? user.email,
    id: profile.id,
    method: "supabase-role"
  };
}

export async function requireAdminAccessToken(token: string): Promise<AdminIdentity> {
  let user;
  try {
    user = await getSupabaseUserFromAccessToken(token, "登录状态已失效，请重新登录。");
  } catch (error) {
    throw new AdminAuthError(error instanceof Error ? error.message : "登录状态已失效。", 401);
  }
  return requireAdminUser(user);
}

export function adminAuthStatus(error: unknown, fallback = 400) {
  if (error instanceof AdminSessionError) return error.status;
  return error instanceof AdminAuthError ? error.status : fallback;
}

export async function requireAdmin(request: NextRequest): Promise<AdminIdentity> {
  const breakGlass = tryBreakGlass(request);
  if (breakGlass) return breakGlass;

  const token = getBearerToken(request) || getAdminAccessToken(request);
  if (!token) {
    throw new AdminAuthError("请先登录管理员账号。", 401);
  }
  return requireAdminAccessToken(token);
}
