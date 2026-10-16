import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assertRequestActor, readSameOriginJson } from "@/server/http/json";
import { submitOnboardingQuestionnaire } from "@/server/compute-benefits/service";
import { benefitFailure, benefitResponseHeaders } from "@/server/compute-benefits/http";
export async function POST(request: Request) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers: benefitResponseHeaders });
  try { assertRequestActor(request, userId); return NextResponse.json(await submitOnboardingQuestionnaire(userId, await readSameOriginJson(request, 12000)), { headers: benefitResponseHeaders }); }
  catch (error) { return benefitFailure(error); }
}
