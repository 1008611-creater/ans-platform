import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assertRequestActor, readSameOriginJson } from "@/server/http/json";
import { claimArcadeReward, getArcadeServerBalance } from "@/server/compute-benefits/arcade";
import { benefitFailure, benefitResponseHeaders } from "@/server/compute-benefits/http";

export async function GET() {
  const userId = (await auth())?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers: benefitResponseHeaders });
  }
  try {
    return NextResponse.json(await getArcadeServerBalance(userId), { headers: benefitResponseHeaders });
  } catch (error) {
    return benefitFailure(error);
  }
}

export async function POST(request: Request) {
  const userId = (await auth())?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers: benefitResponseHeaders });
  }
  try {
    if (request.headers.get("x-ans-actor")) {
      assertRequestActor(request, userId);
    }
    const body = await readSameOriginJson(request, 8000);
    return NextResponse.json(await claimArcadeReward(userId, body), { headers: benefitResponseHeaders });
  } catch (error) {
    return benefitFailure(error);
  }
}
