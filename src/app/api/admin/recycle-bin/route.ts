import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { writeAuditLog } from "@/lib/audit";
import {
  findDeletedPrompt,
  findDeletedUser,
  listDeletedPrompts,
  listDeletedUsers,
  normalizePagination,
  normalizeRecycleBinType,
  restorePrompt,
  restoreUser,
} from "@/server/admin/recycle-bin";

export async function GET(request: NextRequest) {
  const context = await requireAdminPermission("RECYCLE_BIN_MANAGE");
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const { page, limit } = normalizePagination(
    Number(searchParams.get("page") || "1"),
    Number(searchParams.get("limit") || "20"),
  );
  const type = normalizeRecycleBinType(searchParams.get("type"));

  if (type === "USER") {
    const { items, total } = await listDeletedUsers(page, limit);
    return NextResponse.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  const { items, total } = await listDeletedPrompts(type, page, limit);
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
    const item = await findDeletedUser(id);
    if (!item) return NextResponse.json({ error: "Deleted user not found" }, { status: 404 });
    const updated = await restoreUser(id);
    await writeAuditLog({ actorId: context.userId, action: "RECYCLE_RESTORE", resourceType: "USER", resourceId: id, before: { deletedAt: item.deletedAt }, after: { deletedAt: updated.deletedAt } });
    return NextResponse.json(updated);
  }

  const item = await findDeletedPrompt(id);
  if (!item) return NextResponse.json({ error: "Deleted item not found" }, { status: 404 });

  const updated = await restorePrompt(id);
  await writeAuditLog({ actorId: context.userId, action: "RECYCLE_RESTORE", resourceType: item.type === "SKILL" ? "SKILL" : "PROMPT", resourceId: id, before: { deletedAt: item.deletedAt }, after: { deletedAt: updated.deletedAt } });
  return NextResponse.json(updated);
}
