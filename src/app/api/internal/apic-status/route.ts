import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { saveApicStatus } from "@/lib/apic-status-cache";

export const dynamic = "force-dynamic";

const statusRecordSchema = z.object({
  monitorName: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(200),
  status: z.enum(["operational", "degraded", "failed", "error"]),
  latencyMs: z.number().int().min(0).max(120_000).nullable(),
  availability24h: z.number().min(0).max(100),
  checkedAt: z.string().datetime({ offset: true }),
});

const payloadSchema = z.object({
  generatedAt: z.string().datetime({ offset: true }),
  records: z.array(statusRecordSchema).max(100),
});

function authorized(request: Request): boolean {
  const expected = process.env.APIC_STATUS_INGEST_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!expected || !authorization.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 100_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status payload" }, { status: 400 });
  }

  saveApicStatus(parsed.data);
  return NextResponse.json({ accepted: true, count: parsed.data.records.length });
}
