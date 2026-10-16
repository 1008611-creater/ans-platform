import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { assertRequestActor, readSameOriginJson } from "@/server/http/json";
import { reviewAgriApplication } from "@/server/compute-benefits/service";
import { benefitFailure, benefitResponseHeaders } from "@/server/compute-benefits/http";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminPermission("USERS_MANAGE");
  if (!actor) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403, headers: benefitResponseHeaders });
  try { assertRequestActor(request, actor.userId); const { id } = await context.params;
    return NextResponse.json(await reviewAgriApplication(actor.userId, id, await readSameOriginJson(request, 12000)), { headers: benefitResponseHeaders }); }
  catch (error) { return benefitFailure(error); }
}
