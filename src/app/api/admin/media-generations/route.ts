import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { HttpRequestError, readSameOriginJson } from "@/server/http/json";
import { listMediaSubmissionReviews, MediaGenerationError, reconcileMediaSubmission } from "@/server/media/service";

function failure(error: unknown) {
  if (error instanceof MediaGenerationError || error instanceof HttpRequestError) return NextResponse.json({ error: error.code }, { status: error.status });
  if (error instanceof z.ZodError) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  console.error("MEDIA_RECONCILIATION_FAILED");
  return NextResponse.json({ error: "MEDIA_RECONCILIATION_FAILED" }, { status: 500 });
}
export async function GET() {
  const actor = await requireAdminPermission("USERS_MANAGE");
  if (!actor) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  try { return NextResponse.json({ reviews: await listMediaSubmissionReviews(actor.userId) }); }
  catch (error) { return failure(error); }
}
export async function PATCH(request: NextRequest) {
  const actor = await requireAdminPermission("USERS_MANAGE");
  if (!actor) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  try {
    const parsed = z.object({ generationId: z.string().min(1).max(100), reconciliation: z.unknown() }).strict().parse(await readSameOriginJson(request));
    return NextResponse.json(await reconcileMediaSubmission(actor.userId, parsed.generationId, parsed.reconciliation));
  } catch (error) { return failure(error); }
}
