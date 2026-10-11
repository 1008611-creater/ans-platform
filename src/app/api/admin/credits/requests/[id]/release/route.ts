import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { HttpRequestError, readSameOriginJson, assertRequestActor } from "@/server/http/json";
import { QuotaError } from "@/server/quota/service";
import { MarketRuleError } from "@/domain/marketplace/order";
import { waiveUncertainRequest } from "@/server/quota/review";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
 const context = await requireAdminPermission("USERS_MANAGE");
 if (!context) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
 try {
   assertRequestActor(request, context.userId);
   const body = z.object({ reason: z.string().trim().min(3).max(1000) }).strict().parse(await readSameOriginJson(request));
   const { id } = await params;
   return NextResponse.json(await waiveUncertainRequest(context.userId, id, body.reason));
 } catch (error) {
   if (error instanceof ZodError) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
   if (error instanceof HttpRequestError || error instanceof QuotaError || error instanceof MarketRuleError) return NextResponse.json({ error: error.message }, { status: error.status });
   return NextResponse.json({ error: "OPERATION_FAILED" }, { status: 500 });
 }
}
