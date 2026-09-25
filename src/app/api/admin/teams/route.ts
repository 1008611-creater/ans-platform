import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { listTeamsForAdmin } from "@/server/teams/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await requireAdminPermission("USERS_VIEW");
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") || "30")));
  const query = params.get("q")?.trim() || "";
  return NextResponse.json(await listTeamsForAdmin(query, page, limit));
}
