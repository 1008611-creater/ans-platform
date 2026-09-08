import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const PAGE_SIZE = 20;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized", message: "请先登录" }, { status: 401 });
  }

  const runs = await db.run.findMany({
    where: { userId: session.user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE,
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
  });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { quotaPoints: true },
  });

  return NextResponse.json({ runs, balance: user?.quotaPoints ?? 0 });
}
