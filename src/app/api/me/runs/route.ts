import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listRecentRunsForUser } from "@/server/runs/service";

export const runtime = "nodejs";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized", message: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = searchParams.get("limit");
  const limit = rawLimit === null ? DEFAULT_PAGE_SIZE : Number(rawLimit);
  const cursor = searchParams.get("cursor")?.trim() || null;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    return NextResponse.json({ error: "invalid_limit", message: "limit 必须是 1-" + MAX_PAGE_SIZE + " 的整数" }, { status: 400 });
  }
  if (cursor && cursor.length > 128) {
    return NextResponse.json({ error: "invalid_cursor", message: "分页游标无效" }, { status: 400 });
  }

  try {
    const result = await listRecentRunsForUser(session.user.id, { limit, cursor });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "invalid_cursor", message: "分页游标无效或已失效" }, { status: 400 });
  }
}
