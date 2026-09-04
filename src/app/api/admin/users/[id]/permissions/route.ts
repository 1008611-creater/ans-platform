import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission, ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireAdminPermission("USERS_MANAGE");
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body.permissions)) return NextResponse.json({ error: "permissions must be an array" }, { status: 400 });
  const permissions = [...new Set(body.permissions)].filter((permission: unknown): permission is (typeof ADMIN_PERMISSIONS)[number] => ADMIN_PERMISSIONS.includes(permission as (typeof ADMIN_PERMISSIONS)[number]));

  const user = await db.user.findUnique({ where: { id }, select: { id: true, role: true, adminPermissions: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Only administrators can have admin permissions" }, { status: 400 });

  await db.user.update({ where: { id }, data: { adminPermissions: permissions } });
  await writeAuditLog({ actorId: context.userId, action: "ADMIN_PERMISSIONS_UPDATE", resourceType: "USER", resourceId: id, before: { adminPermissions: user.adminPermissions }, after: { adminPermissions: permissions } });
  return NextResponse.json({ id, permissions });
}
