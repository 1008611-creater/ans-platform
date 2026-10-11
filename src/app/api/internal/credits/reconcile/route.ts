import { timingSafeEqual } from "node:crypto";
import { reconcilePendingCredits } from "@/server/quota/reconcile";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.APIC_COST_BRIDGE_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer /i, "") || "";
  if (!secret || !provided || Buffer.byteLength(secret) !== Buffer.byteLength(provided) || !timingSafeEqual(Buffer.from(secret), Buffer.from(provided))) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return Response.json(await reconcilePendingCredits(), { headers: { "Cache-Control": "no-store" } });
}
