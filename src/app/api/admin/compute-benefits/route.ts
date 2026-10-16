import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { assertRequestActor } from "@/server/http/json";
import { listBenefitApplications } from "@/server/compute-benefits/service";
import { benefitFailure, benefitResponseHeaders } from "@/server/compute-benefits/http";
export async function GET(request: Request) {
  const actor = await requireAdminPermission("USERS_MANAGE");
  if (!actor) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403, headers: benefitResponseHeaders });
  try { assertRequestActor(request, actor.userId); return NextResponse.json(await listBenefitApplications(actor.userId), { headers: benefitResponseHeaders }); }
  catch (error) { return benefitFailure(error); }
}
