import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const context = await requireAdminPermission("RECYCLE_BIN_MANAGE");
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")));
  const type = searchParams.get("type") || "PROMPT";

  if (type === "USER") {
    const where = { deletedAt: { not: null } };
    const [items, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { deletedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, username: true, name: true, email: true, role: true, deletedAt: true },
      }),
      db.user.count({ where }),
    ]);
    return NextResponse.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  const promptWhere = { deletedAt: { not: null }, ...(type === "SKILL" ? { type: "SKILL" as const } : { type: { not: "SKILL" as const } }) };
  const [items, total] = await Promise.all([
    db.prompt.findMany({
      where: promptWhere,
      orderBy: { deletedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, title: true, type: true, slug: true, deletedAt: true, author: { select: { username: true, name: true } } },
    }),
    db.prompt.count({ where: promptWhere }),
  ]);

  return NextResponse.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

export async function PATCH(request: NextRequest) {
  const context = await requireAdminPermission("RECYCLE_BIN_MANAGE");
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Prompt ID is required" }, { status: 400 });

  const resourceType = body.type === "USER" ? "USER" : "PROMPT";
  if (resourceType === "USER") {
    const item = await db.user.findFirst({ where: { id, deletedAt: { not: null } }, select: { id: true, username: true, name: true, email: true, role: true, deletedAt: true } });
    if (!item) return NextResponse.json({ error: "Deleted user not found" }, { status: 404 });
    const updated = await db.user.update({ where: { id }, data: { deletedAt: null }, select: { id: true, username: true, name: true, email: true, role: true, deletedAt: true } });
    await writeAuditLog({ actorId: context.userId, action: "RECYCLE_RESTORE", resourceType: "USER", resourceId: id, before: { deletedAt: item.deletedAt }, after: { deletedAt: updated.deletedAt } });
    return NextResponse.json(updated);
  }

  const item = await db.prompt.findFirst({ where: { id, deletedAt: { not: null } }, select: { id: true, title: true, type: true, deletedAt: true } });
  if (!item) return NextResponse.json({ error: "Deleted item not found" }, { status: 404 });

  const updated = await db.prompt.update({ where: { id }, data: { deletedAt: null }, select: { id: true, title: true, type: true, deletedAt: true } });
  await writeAuditLog({ actorId: context.userId, action: "RECYCLE_RESTORE", resourceType: item.type === "SKILL" ? "SKILL" : "PROMPT", resourceId: id, before: { deletedAt: item.deletedAt }, after: { deletedAt: updated.deletedAt } });
  return NextResponse.json(updated);
}
