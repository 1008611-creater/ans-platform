import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRunForViewer } from "@/server/runs/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized", message: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;
  const run = await getRunForViewer(id, { id: session.user.id, role: session.user.role });
  if (!run) {
    return NextResponse.json({ error: "run_not_found", message: "运行记录不存在" }, { status: 404 });
  }
  return NextResponse.json({ run });
}
