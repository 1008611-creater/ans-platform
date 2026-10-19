import { NextRequest, NextResponse } from "next/server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  maskIdentifier,
  normalizeLoginIdentifier,
  recordAuthEvent,
  requestHost,
  sendSupabaseOtp,
  UnifiedAuthError
} from "@/lib/unified-auth";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

function safeStatus(error: unknown) {
  return error instanceof UnifiedAuthError ? error.status : 400;
}

export async function POST(request: NextRequest) {
  let identifier: ReturnType<typeof normalizeLoginIdentifier> | undefined;
  const host = requestHost(request);

  try {
    const body = await request.json().catch(() => ({}));
    identifier = normalizeLoginIdentifier(body.identifier);

    const turnstile = await verifyTurnstileToken({
      request,
      token: typeof body.turnstileToken === "string" ? body.turnstileToken : body["cf-turnstile-response"]
    });
    if (!turnstile.ok) {
      await recordAuthEvent({
        eventType: "otp_send",
        failureReason: turnstile.code,
        host,
        identifier,
        request,
        success: false
      }).catch(() => undefined);
      return NextResponse.json(
        {
          code: turnstile.code,
          error: turnstile.message
        },
        { status: turnstile.status }
      );
    }

    const result = await sendSupabaseOtp({
      host,
      identifier,
      redirectTo: typeof body.redirectTo === "string" ? body.redirectTo : undefined
    });
    await recordAuthEvent({
      eventType: "otp_send",
      host,
      identifier,
      request,
      success: true
    }).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      contactType: identifier.kind,
      maskedIdentifier: maskIdentifier(identifier),
      mock: result.mock || turnstile.mock || undefined,
      providerRequest: result.mock ? result.providerRequest : undefined,
      turnstile: {
        disabled: turnstile.disabled || undefined,
        mock: turnstile.mock || undefined
      }
    });
  } catch (error) {
    if (identifier) {
      await recordAuthEvent({
        eventType: "otp_send",
        failureReason: error instanceof Error ? error.message : "otp_send_failed",
        host,
        identifier,
        request,
        success: false
      }).catch(() => undefined);
    }
    return NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "验证码发送失败。") },
      { status: safeStatus(error) }
    );
  }
}
