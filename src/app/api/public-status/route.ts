import { NextResponse } from "next/server";
import { getFreshApicStatus } from "@/lib/apic-status-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = getFreshApicStatus();
  return NextResponse.json(
    snapshot
      ? { success: true, data: snapshot.records, updatedAt: snapshot.generatedAt }
      : { success: false, data: [], updatedAt: null },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
