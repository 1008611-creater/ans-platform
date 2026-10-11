import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readQuotaHistory } from "@/server/quota/history";
import { QuotaError } from "@/server/quota/service";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some(key => key !== "cursor") || params.getAll("cursor").length > 1) {
    return NextResponse.json({ error: "INVALID_QUOTA_CURSOR" }, { status: 400 });
  }
  try {
    const cursor = params.get("cursor");
    const result = await readQuotaHistory(session.user.id, cursor === null ? {} : { cursor });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof QuotaError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Quota history unavailable");
    return NextResponse.json({ error: "QUOTA_HISTORY_UNAVAILABLE" }, { status: 500 });
  }
}
