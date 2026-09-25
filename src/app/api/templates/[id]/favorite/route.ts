import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  favoriteTemplate,
  getPublishedTemplateByKey,
  isTemplateFavorited,
  unfavoriteTemplate,
} from "@/server/templates/favorites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestContext(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return {
    ipAddress: (forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || null)?.slice(0, 128) ?? null,
    userAgent: request.headers.get("user-agent")?.slice(0, 512) || null,
  };
}

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized", message: "请先登录" }, { status: 401 });
  const { id: key } = await context.params;
  const template = await getPublishedTemplateByKey(key);
  if (!template) {
    return NextResponse.json({ error: "template_unavailable", message: "模板不存在或未上架" }, { status: 404 });
  }
  return NextResponse.json({ favorited: await isTemplateFavorited(user.id, template.id) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized", message: "请先登录" }, { status: 401 });
  const { id: key } = await context.params;
  const template = await getPublishedTemplateByKey(key);
  if (!template) {
    return NextResponse.json({ error: "template_unavailable", message: "模板不存在或未上架" }, { status: 404 });
  }
  await favoriteTemplate(user.id, template, requestContext(request));
  return NextResponse.json({ favorited: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized", message: "请先登录" }, { status: 401 });
  const { id: key } = await context.params;
  const template = await getPublishedTemplateByKey(key);
  if (!template) {
    return NextResponse.json({ error: "template_unavailable", message: "模板不存在或未上架" }, { status: 404 });
  }
  await unfavoriteTemplate(user.id, template, requestContext(request));
  return NextResponse.json({ favorited: false });
}
