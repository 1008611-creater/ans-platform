import { NextRequest, NextResponse } from "next/server";
import {
  completeVerifiedLogin,
  normalizeLoginIdentifier,
  recordAuthEvent,
  requestHost,
  UnifiedAuthError,
  verifySupabaseOtp
} from "@/lib/unified-auth";
import { toUserFacingError } from "@/lib/user-facing-error";
import { adminAuthStatus, requireAdminUser } from "@/lib/admin-auth";
import { AdminSessionError, requireAdminCsrf, setAdminSessionCookies } from "@/lib/admin-session";

export const runtime = "nodejs";

function safeStatus(error: unknown) {
  if (error instanceof AdminSessionError) return error.status;
  const adminStatus = adminAuthStatus(error, 0);
  if (adminStatus) return adminStatus;
  return error instanceof UnifiedAuthError ? error.status : 400;
}

export async function POST(request: NextRequest) {
  let identifier: ReturnType<typeof normalizeLoginIdentifier> | undefined;
  const host = requestHost(request);

  try {
    const body = await request.json().catch(() => ({}));
    identifier = normalizeLoginIdentifier(body.identifier);
    const code = String(body.code ?? body.token ?? "").trim();
    const adminIntent = body.intent === "admin";
    if (adminIntent) requireAdminCsrf(request);
    const session = await verifySupabaseOtp({ identifier, token: code });
    const result = await completeVerifiedLogin({
      host,
      identifier,
      request,
      session
    });

    if (adminIntent) {
      const identity = await requireAdminUser(result.session.user);
      const response = NextResponse.json({
        admin: true,
        identity,
        user: result.session.user
      });
      response.headers.set("Cache-Control", "no-store, max-age=0");
      setAdminSessionCookies(response, result.session);
      return response;
    }

    return NextResponse.json({
      accessToken: result.session.accessToken,
      expiresAt: result.session.expiresAt,
      expiresIn: result.session.expiresIn,
      profile: result.profile,
      refreshToken: result.session.refreshToken,
      user: result.session.user,
      walletInitialized: result.walletInitialized
    });
  } catch (error) {
    if (identifier) {
      await recordAuthEvent({
        eventType: "otp_verify",
        failureReason: error instanceof Error ? error.message : "otp_verify_failed",
        host,
        identifier,
        request,
        success: false
      }).catch(() => undefined);
    }
    return NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "验证码校验失败。") },
      { status: safeStatus(error) }
    );
  }
}
