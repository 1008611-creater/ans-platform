import { HttpRequestError, readSameOriginJson, assertRequestActor } from "@/server/http/json";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { applyQuotaOperation, quotaAdminOverview } from "@/server/quota/operations";
import { listLdxpRechargeOrders, reconcilePendingLdxpRecharges } from "@/server/integrations/ldxp-recharge";
import { QuotaError } from "@/server/quota/service";
import { MarketRuleError } from "@/domain/marketplace/order";
export async function GET() {
  if (!await requireAdminPermission("USERS_MANAGE")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  return NextResponse.json({ ...(await quotaAdminOverview()), ldxp: { enabled: false, orders: await listLdxpRechargeOrders() } }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  const admin = await requireAdminPermission("USERS_MANAGE");
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  try { assertRequestActor(request, admin.userId); } catch { return NextResponse.json({ error: "ACCOUNT_CHANGED" }, { status: 409 }); }
  const action = request.headers.get("x-ans-admin-action");
  if (action === "reconcile-ldxp") {
    try { await readSameOriginJson(request); return NextResponse.json(await reconcilePendingLdxpRecharges()); }
    catch { return NextResponse.json({ error: "LDXP_RECONCILIATION_FAILED" }, { status: 502 }); }
  }
  if (Number(request.headers.get("content-length") || 0) > 8192) return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  try {
    return NextResponse.json(await applyQuotaOperation(admin.userId, await readSameOriginJson(request)));
  } catch (error) {
    if (error instanceof HttpRequestError) return NextResponse.json({ error: error.code }, { status: error.status });
    if (error instanceof ZodError || error instanceof SyntaxError) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    if (error instanceof QuotaError || error instanceof MarketRuleError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Quota operation failed");
    return NextResponse.json({ error: "QUOTA_OPERATION_FAILED" }, { status: 500 });
  }
}

