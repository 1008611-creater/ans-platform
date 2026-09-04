import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateApiKey, hashApiKey } from "@/lib/api-key";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      apiKey: true,
      mcpPromptsPublicByDefault: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // The stored value is a SHA-256 hash, so the plaintext key can never be
  // handed back — not even to its owner. A new key is shown exactly once,
  // in the POST response below.
  return NextResponse.json({
    hasApiKey: !!user.apiKey,
    apiKey: null,
    mcpPromptsPublicByDefault: user.mcpPromptsPublicByDefault,
  });
}

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = generateApiKey();

  await db.user.update({
    where: { id: session.user.id },
    data: { apiKey: hashApiKey(apiKey) },
  });

  // Plaintext is returned exactly once and never stored.
  return NextResponse.json({ apiKey });
}

export async function DELETE() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { apiKey: null },
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { mcpPromptsPublicByDefault } = body;

  if (typeof mcpPromptsPublicByDefault !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { mcpPromptsPublicByDefault },
  });

  return NextResponse.json({ success: true });
}
