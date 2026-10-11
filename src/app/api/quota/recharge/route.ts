import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpRequestError, readSameOriginJson } from "@/server/http/json";
import { auth } from "@/lib/auth";
import { LdxpRechargeError, createLdxpWechatRecharge } from "@/server/integrations/ldxp-recharge";

export const runtime = "nodejs";
const schema = z.object({ amountCents: z.number().int().min(100).max(100_000_000), requestKey: z.string().regex(/^[A-Za-z0-9_.:-]{16,120}$/) }).strict();

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const body = schema.parse(await readSameOriginJson(request));
    const order = await createLdxpWechatRecharge(session.user.id, body.amountCents, body.requestKey);
    return NextResponse.json({ id: order.id, tradeNo: order.tradeNo, amountCents: order.amountCents, points: Number(order.points), payUrl: order.payUrl, status: order.status, createdAt: order.createdAt }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof HttpRequestError) return NextResponse.json({ error: error.code }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "INVALID_RECHARGE_AMOUNT" }, { status: 400 });
    if (error instanceof LdxpRechargeError) return NextResponse.json({ error: error.code }, { status: error.status });
    console.error("LDXP recharge creation failed");
    return NextResponse.json({ error: "RECHARGE_UNAVAILABLE" }, { status: 502 });
  }
}