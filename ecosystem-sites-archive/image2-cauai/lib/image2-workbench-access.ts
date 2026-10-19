import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, getSupabaseUser } from "./image2-membership";
import { loadImage2WorkbenchData, loadPublicImage2WorkbenchData, type WorkbenchAccessState } from "./image2-workbench-data";

export class Image2WorkbenchAccessError extends Error {
  code: "not_authenticated" | "not_whitelisted" | "not_configured";
  status: 401 | 403;

  constructor(message: string, status: 401 | 403, code: Image2WorkbenchAccessError["code"]) {
    super(message);
    this.name = "Image2WorkbenchAccessError";
    this.status = status;
    this.code = code;
  }
}

function normalizeEmail(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

const defaultTeamEmails = new Set<string>();

function configuredTeamEmails() {
  const envEmails = new Set(
    (process.env.IMAGE2_WORKBENCH_TEAM_EMAILS ?? "")
      .split(/[,;\s]+/)
      .map(normalizeEmail)
      .filter(Boolean)
  );
  return new Set([...defaultTeamEmails, ...envEmails]);
}

export function isImage2WorkbenchTeamEmail(email: string | undefined) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return configuredTeamEmails().has(normalized);
}

export async function getImage2WorkbenchAccess(request: NextRequest): Promise<WorkbenchAccessState> {
  const token = getBearerToken(request);
  if (!token) {
    return {
      isAuthenticated: false,
      isTeamMember: false,
      message: "请先登录。",
      mode: "public"
    };
  }

  let user: Awaited<ReturnType<typeof getSupabaseUser>>;
  try {
    user = await getSupabaseUser(request, "请先登录。");
  } catch (error) {
    throw new Image2WorkbenchAccessError(
      error instanceof Error ? error.message : "登录状态已失效，请重新登录。",
      401,
      "not_authenticated"
    );
  }
  const email = normalizeEmail(user.email);
  const hasWhitelist = configuredTeamEmails().size > 0;
  const isTeamMember = true;

  return {
    email: user.email,
    isAuthenticated: true,
    isTeamMember,
    message: isTeamMember
      ? "账号已验证。"
      : hasWhitelist
        ? "请返回首页继续浏览。"
        : "请返回首页继续浏览。",
    mode: isTeamMember ? "team" : "public"
  };
}

export async function requireImage2WorkbenchTeamMember(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    throw new Image2WorkbenchAccessError("请先登录。", 401, "not_authenticated");
  }

  const access = await getImage2WorkbenchAccess(request);
  if (!access.isTeamMember) {
    throw new Image2WorkbenchAccessError(
      access.message || "请返回首页继续浏览。",
      403,
      configuredTeamEmails().size > 0 ? "not_whitelisted" : "not_configured"
    );
  }

  return access;
}

export async function image2WorkbenchAccessResponse(error: unknown) {
  if (error instanceof Image2WorkbenchAccessError) {
    const access: WorkbenchAccessState = {
      isAuthenticated: error.status !== 401,
      isTeamMember: false,
      message: error.message,
      mode: "public"
    };
    return NextResponse.json(
      {
        ...(await loadPublicImage2WorkbenchData(access)),
        error: error.message,
        code: error.code
      },
      { status: error.status }
    );
  }

  return null;
}

export async function loadImage2WorkbenchDataForRequest(request: NextRequest) {
  const access = await getImage2WorkbenchAccess(request);
  if (!access.isAuthenticated) return loadPublicImage2WorkbenchData(access);
  if (!access.isTeamMember) {
    throw new Image2WorkbenchAccessError(
      access.message || "请返回首页继续浏览。",
      403,
      configuredTeamEmails().size > 0 ? "not_whitelisted" : "not_configured"
    );
  }
  return loadImage2WorkbenchData(access);
}
