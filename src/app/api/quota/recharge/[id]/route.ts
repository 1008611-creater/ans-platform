import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { LdxpRechargeError, queryLdxpRecharge } from "@/server/integrations/ldxp-recharge";

export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { id } = await context.params;
    const order = await queryLdxpRecharge(id, session.user.id);
    return NextResponse.json({ id: order.id, tradeNo: order.tradeNo, amountCents: order.amountCents, points: Number(order.points), payUrl: order.status === "PAID" ? null : order.payUrl, status: order.status, createdAt: order.createdAt, paidAt: order.paidAt }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof LdxpRechargeError) return NextResponse.json({ error: error.code }, { status: error.status });
    console.error("LDXP recharge status failed");
    return NextResponse.json({ error: "RECHARGE_STATUS_UNAVAILABLE" }, { status: 502 });
  }
}
