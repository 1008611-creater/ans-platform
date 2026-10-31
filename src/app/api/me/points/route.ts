import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readMemberPoints } from "@/server/quota/service";

export const runtime = "nodejs";

/** The signed-in member's spendable points, for the phone header's points pill. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized", message: "请先登录" }, { status: 401 });
  }
  const points = await readMemberPoints(session.user.id);
  if (points === null) return NextResponse.json({ error: "not_found", message: "账号不存在" }, { status: 404 });
  return NextResponse.json({ points }, { headers: { "Cache-Control": "private, no-store" } });
}
