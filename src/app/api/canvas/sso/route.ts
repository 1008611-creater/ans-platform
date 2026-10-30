import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildInfiniteCanvasSsoUrl } from "@/server/integrations/easel";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const targetUrl = buildInfiniteCanvasSsoUrl(session?.user ?? null);
  return NextResponse.redirect(targetUrl, { status: 302 });
}
