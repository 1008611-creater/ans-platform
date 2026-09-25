import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listRecentRunsForUser } from "@/server/runs/service";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized", message: "请先登录" }, { status: 401 });
  }

  const result = await listRecentRunsForUser(session.user.id);
  return NextResponse.json(result);
}
