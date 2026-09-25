import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { InviteError, sendInviteEmail } from "@/server/identity/invites";

export const runtime = "nodejs";

// POST /api/admin/invites/send —— 把邀请码通过邮件发给指定邮箱（仅管理员）
export async function POST(request: NextRequest) {
  const context = await requireAdminPermission("INVITES_MANAGE");
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json().catch(() => null);
    const result = await sendInviteEmail(body, context.userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof InviteError) {
      const headers = error.status === 429 ? { "Retry-After": "60" } : undefined;
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status, headers });
    }
    console.error("Send invite email error:", error);
    return NextResponse.json({ error: "server_error", message: "邀请码邮件发送失败" }, { status: 500 });
  }
}
