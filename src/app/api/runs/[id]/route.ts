import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized", message: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;
  const run = await db.run.findFirst({
    where: {
      id,
      ...(session.user.role === "ADMIN" ? {} : { userId: session.user.id }),
    },
    select: {
      id: true,
      status: true,
      outputText: true,
      error: true,
      costPoints: true,
      createdAt: true,
      finishedAt: true,
      template: { select: { slug: true, title: true } },
    },
  });

  // 对非本人记录也返回 404，避免泄漏运行记录是否存在。
  if (!run) {
    return NextResponse.json({ error: "run_not_found", message: "运行记录不存在" }, { status: 404 });
  }
  return NextResponse.json({ run });
}
