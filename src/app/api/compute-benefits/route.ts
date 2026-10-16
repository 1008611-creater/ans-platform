import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assertRequestActor } from "@/server/http/json";
import { getComputeBenefits } from "@/server/compute-benefits/service";
import { benefitFailure, benefitResponseHeaders } from "@/server/compute-benefits/http";
export async function GET(request: Request) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers: benefitResponseHeaders });
  try { assertRequestActor(request, userId); return NextResponse.json(await getComputeBenefits(userId), { headers: benefitResponseHeaders }); }
  catch (error) { return benefitFailure(error); }
}
