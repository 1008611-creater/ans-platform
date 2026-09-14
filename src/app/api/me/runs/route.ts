import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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
    const [rows, user] = await Promise.all([
      db.run.findMany({
        where: { userId: session.user.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        take: limit + 1,
        select: {
          id: true,
          status: true,
          costPoints: true,
          outputText: true,
          error: true,
          createdAt: true,
          finishedAt: true,
          template: { select: { slug: true, title: true } },
        },
      }),
      db.user.findUnique({
        where: { id: session.user.id },
        select: { quotaPoints: true },
      }),
    ]);
    const hasMore = rows.length > limit;
    const runs = hasMore ? rows.slice(0, limit) : rows;
    return NextResponse.json({
      runs,
      nextCursor: hasMore ? runs[runs.length - 1]?.id ?? null : null,
      balance: user?.quotaPoints ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "invalid_cursor", message: "分页游标无效或已失效" }, { status: 400 });
  }
}
