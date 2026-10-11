import { NextRequest, NextResponse } from "next/server";
import { reconcilePendingLdxpRecharges } from "@/server/integrations/ldxp-recharge";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ success: true, ...(await reconcilePendingLdxpRecharges()) }); }
  catch { return NextResponse.json({ error: "LDXP_RECONCILIATION_FAILED" }, { status: 502 }); }
}
export async function GET(request: NextRequest) { return POST(request); }
