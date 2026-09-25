import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { runTemplate } from "@/lib/run-service";

export const runtime = "nodejs";

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || null;
  return ip ? ip.slice(0, 128) : null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized", message: "请先登录" }, { status: 401 });
  }

  const { id: slug } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "请求体不是有效 JSON" }, { status: 400 });
  }

  const inputs = (body as { inputs?: unknown })?.inputs;
  const modelKey = (body as { modelKey?: unknown })?.modelKey;
  const bodyIdempotencyKey = (body as { idempotencyKey?: unknown })?.idempotencyKey;
  if (typeof modelKey !== "undefined" && typeof modelKey !== "string") {
    return NextResponse.json({ error: "invalid_model", message: "模型参数无效" }, { status: 400 });
  }
  if (typeof bodyIdempotencyKey !== "undefined" && typeof bodyIdempotencyKey !== "string") {
    return NextResponse.json({ error: "invalid_idempotency_key", message: "幂等键格式无效" }, { status: 400 });
  }
  const headerIdempotencyKey = request.headers.get("idempotency-key")?.trim();
  const idempotencyKey = headerIdempotencyKey || (bodyIdempotencyKey as string | undefined);

  const template = await db.template.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!template) {
    return NextResponse.json({ error: "template_unavailable", message: "模板不存在或未上架" }, { status: 404 });
  }

  const result = await runTemplate({
    userId: session.user.id,
    templateId: template.id,
    inputs,
    modelKey,
    idempotencyKey,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent")?.slice(0, 512) || null,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message, ...(result.runId ? { runId: result.runId } : {}) },
      { status: result.status ?? 400 }
    );
  }
  return NextResponse.json(
    { runId: result.runId, status: result.status, outputText: result.outputText, costPoints: result.costPoints },
    { status: result.status === "SUCCEEDED" ? 200 : 202 }
  );
}
