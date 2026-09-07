import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { createInvite, InviteError, listInvites, listRedemptions } from "@/lib/invite-admin";

export const runtime = "nodejs";

// GET /api/admin/invites?page=&view=invites|redemptions —— 邀请码列表 / 核销审计（仅管理员）
export async function GET(request: NextRequest) {
  const context = await requireAdminPermission("INVITES_MANAGE");
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");
  const view = searchParams.get("view") === "redemptions" ? "redemptions" : "invites";
  try {
    const payload = view === "redemptions" ? await listRedemptions(page) : await listInvites(page);
    return NextResponse.json({ view, ...payload });
  } catch (error) {
    console.error("List invites error:", error);
    return NextResponse.json({ error: "server_error", message: "邀请记录查询失败" }, { status: 500 });
  }
}

// POST /api/admin/invites —— 生成邀请码（仅管理员）
export async function POST(request: NextRequest) {
  const context = await requireAdminPermission("INVITES_MANAGE");
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json().catch(() => null);
    const invite = await createInvite(context.userId, body);
    return NextResponse.json(invite, { status: 201 });
  } catch (error) {
    if (error instanceof InviteError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    }
    console.error("Create invite error:", error);
    return NextResponse.json({ error: "server_error", message: "邀请码生成失败" }, { status: 500 });
  }
}