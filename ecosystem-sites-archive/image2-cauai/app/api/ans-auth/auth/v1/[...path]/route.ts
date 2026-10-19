import { NextRequest, NextResponse } from "next/server";
import { callAnsBridge, signAnsAccessToken, verifyAnsAccessToken } from "@/lib/image2-membership";

export const runtime = "nodejs";

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, context: Context) {
  const path = ((await context.params).path ?? []).join("/");
  if (path === "user") {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const user = verifyAnsAccessToken(token);
    if (!user) {
      return NextResponse.json({ error: "invalid_token", error_description: "登录状态已失效，请重新登录。" }, { status: 401 });
    }
    return NextResponse.json({ id: user.id, email: user.email });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest, context: Context) {
  const path = ((await context.params).path ?? []).join("/");
  if (path === "logout") {
    return NextResponse.json({ ok: true });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (path === "token" || path === "signup" || path === "verify") {
    const mode = path === "signup" ? "register" : "login";
    let res = await callAnsBridge({
      operation: "auth",
      mode,
      email,
      password,
      displayName: email.split("@")[0]
    });

    if (mode === "register" && res.status === 409 && password) {
      res = await callAnsBridge({
        operation: "auth",
        mode: "login",
        email,
        password
      });
    }

    if (!res.ok || !res.body?.ok || !res.body?.user?.id) {
      return NextResponse.json(
        {
          error: res.body?.error || "auth_failed",
          error_description: res.body?.message || "ANS 账号邮箱或密码错误（支持直接使用 ans.cauai.fun 账号登录）。"
        },
        { status: res.status || 400 }
      );
    }

    const user = {
      id: String(res.body.user.id),
      email: String(res.body.user.email || email)
    };
    const expiresIn = 7 * 24 * 3600;
    const accessToken = signAnsAccessToken(user, expiresIn);
    return NextResponse.json({
      access_token: accessToken,
      refresh_token: accessToken,
      token_type: "bearer",
      expires_in: expiresIn,
      user
    });
  }

  if (path === "recover") {
    return NextResponse.json(
      { error: "请前往 ANS 主站 (https://ans.cauai.fun) 管理或重置密码。" },
      { status: 400 }
    );
  }

  return NextResponse.json({ error: "unsupported_auth_action" }, { status: 400 });
}
