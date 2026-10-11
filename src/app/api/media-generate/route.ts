import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { mediaGenerationKeySchema } from "@/contracts/media-generation";
import { HttpRequestError, readSameOriginJson } from "@/server/http/json";
import { getMediaGenerationInfo, MediaGenerationError, readMediaGeneration, submitMediaGeneration } from "@/server/media/service";

function failure(error: unknown) {
  if (error instanceof MediaGenerationError || error instanceof HttpRequestError) {
    return NextResponse.json({ error: error.code }, { status: error.status });
  }
  if (error instanceof z.ZodError) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  console.error("MEDIA_GENERATION_FAILED");
  return NextResponse.json({ error: "MEDIA_GENERATION_FAILED" }, { status: 500 });
}
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const expectedActor = request.headers.get("x-ans-actor");
  if (expectedActor !== null && expectedActor !== session.user.id) return NextResponse.json({ error: "MEDIA_ACCOUNT_CHANGED" }, { status: 409 });
  try {
    const key = request.nextUrl.searchParams.get("key");
    if (key !== null) {
      const result = await readMediaGeneration(session.user.id, mediaGenerationKeySchema.parse(key));
      return NextResponse.json(result.body, { status: result.status });
    }
    return NextResponse.json(await getMediaGenerationInfo(session.user.id));
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const expectedActor = request.headers.get("x-ans-actor");
  if (expectedActor !== null && expectedActor !== session.user.id) return NextResponse.json({ error: "MEDIA_ACCOUNT_CHANGED" }, { status: 409 });
  try {
    const result = await submitMediaGeneration(session.user.id, await readSameOriginJson(request));
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) { return failure(error); }
}
