import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getPublishedTemplate(key: string) {
  return db.template.findFirst({
    where: { status: "PUBLISHED", OR: [{ id: key }, { slug: key }] },
    select: { id: true, slug: true, title: true },
  });
}

function requestContext(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return {
    ipAddress: (forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || null)?.slice(0, 128) ?? null,
    userAgent: request.headers.get("user-agent")?.slice(0, 512) || null,
  };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized", message: "请先登录" }, { status: 401 });
  }
  const { id: key } = await context.params;
  const template = await getPublishedTemplate(key);
  if (!template) {
    return NextResponse.json({ error: "template_unavailable", message: "模板不存在或未上架" }, { status: 404 });
  }
  const favorite = await db.templateFavorite.findUnique({
    where: { userId_templateId: { userId: session.user.id, templateId: template.id } },
    select: { createdAt: true },
  });
  return NextResponse.json({ favorited: Boolean(favorite) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized", message: "请先登录" }, { status: 401 });
  }
  const { id: key } = await context.params;
  const template = await getPublishedTemplate(key);
  if (!template) {
    return NextResponse.json({ error: "template_unavailable", message: "模板不存在或未上架" }, { status: 404 });
  }
  const favorite = await db.templateFavorite.upsert({
    where: { userId_templateId: { userId: session.user.id, templateId: template.id } },
    create: { userId: session.user.id, templateId: template.id },
    update: {},
  });
  const contextData = requestContext(request);
  await writeAuditLog({
    actorId: session.user.id,
    action: "TEMPLATE_FAVORITED",
    resourceType: "template",
    resourceId: template.id,
    after: { favorited: true, createdAt: favorite.createdAt },
    metadata: { templateId: template.id, templateSlug: template.slug },
    ...contextData,
  });
  return NextResponse.json({ favorited: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized", message: "请先登录" }, { status: 401 });
  }
  const { id: key } = await context.params;
  const template = await getPublishedTemplate(key);
  if (!template) {
    return NextResponse.json({ error: "template_unavailable", message: "模板不存在或未上架" }, { status: 404 });
  }
  const removed = await db.templateFavorite.deleteMany({
    where: { userId: session.user.id, templateId: template.id },
  });
  if (removed.count > 0) {
    const contextData = requestContext(request);
    await writeAuditLog({
      actorId: session.user.id,
      action: "TEMPLATE_UNFAVORITED",
      resourceType: "template",
      resourceId: template.id,
      before: { favorited: true },
      after: { favorited: false },
      metadata: { templateId: template.id, templateSlug: template.slug },
      ...contextData,
    });
  }
  return NextResponse.json({ favorited: false });
}
