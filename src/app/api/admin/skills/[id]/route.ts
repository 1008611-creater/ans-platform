import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireAdminPermission("SKILLS_MANAGE");
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body.action;
  if (action !== "restore" && action !== "unlist" && action !== "relist") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const skill = await db.prompt.findFirst({
    where: { id, type: "SKILL" },
    select: { id: true, title: true, type: true, deletedAt: true, isUnlisted: true },
  });
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  const before = { deletedAt: skill.deletedAt, isUnlisted: skill.isUnlisted };
  const data = action === "restore"
    ? { deletedAt: null }
    : action === "unlist"
      ? { isUnlisted: true, unlistedAt: new Date() }
      : { isUnlisted: false, unlistedAt: null };
  const updated = await db.prompt.update({ where: { id }, data, select: { id: true, title: true, deletedAt: true, isUnlisted: true } });

  await writeAuditLog({
    actorId: context.userId,
    action: `SKILL_${action.toUpperCase()}`,
    resourceType: "SKILL",
    resourceId: id,
    before,
    after: { deletedAt: updated.deletedAt, isUnlisted: updated.isUnlisted },
  });

  return NextResponse.json(updated);
}
