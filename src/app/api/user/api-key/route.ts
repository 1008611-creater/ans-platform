import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateApiKey, hashApiKey } from "@/lib/api-key";
import { assertSameOrigin, assertRequestActor, readSameOriginJson, HttpRequestError } from "@/server/http/json";

export const runtime = "nodejs";
const privateHeaders = { "Cache-Control": "private, no-store" };
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: privateHeaders });

/** Keep key changes bound to the account whose settings are visible. This is
 * request binding, not a substitute for the authenticated server session. */
async function keyActor(request: Request) {
  const session = await auth();
  if (!session?.user?.id) throw new HttpRequestError("Unauthorized", 401);
  assertRequestActor(request, session.user.id);
  if (request.headers.get("origin")) assertSameOrigin(request);
  return session.user.id;
}
function keyError(error: unknown) {
  if (error instanceof HttpRequestError) return reply({ error: error.code }, error.status);
  if (error instanceof z.ZodError) return reply({ error: "Invalid request" }, 400);
  return reply({ error: "KEY_UPDATE_FAILED" }, 500);
}

export async function GET(request?: Request) {
  const session = await auth();
  if (!session?.user?.id) return reply({ error: "Unauthorized" }, 401);
  if (request) {
    try { assertRequestActor(request, session.user.id); }
    catch (error) { return keyError(error); }
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { apiKey: true, mcpPromptsPublicByDefault: true },
  });
  if (!user) return reply({ error: "User not found" }, 404);
  // Stored keys are hashes. Plaintext is returned only by generation below.
  return reply({ hasApiKey: !!user.apiKey, apiKey: null, mcpPromptsPublicByDefault: user.mcpPromptsPublicByDefault });
}

export async function POST(request: Request) {
  try {
    const actorId = await keyActor(request);
    const apiKey = generateApiKey();
    await db.user.update({ where: { id: actorId }, data: { apiKey: hashApiKey(apiKey) } });
    return reply({ apiKey });
  } catch (error) { return keyError(error); }
}

export async function DELETE(request: Request) {
  try {
    const actorId = await keyActor(request);
    await db.user.update({ where: { id: actorId }, data: { apiKey: null } });
    return reply({ success: true });
  } catch (error) { return keyError(error); }
}

export async function PATCH(request: Request) {
  try {
    const actorId = await keyActor(request);
    const raw = request.headers.get("origin") ? await readSameOriginJson(request, 1024) : await request.json();
    const body = z.object({ mcpPromptsPublicByDefault: z.boolean() }).strict().parse(raw);
    await db.user.update({ where: { id: actorId }, data: body });
    return reply({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError) return reply({ error: "Invalid request" }, 400);
    return keyError(error);
  }
}
