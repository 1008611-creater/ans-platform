import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAdminPermission("RECYCLE_BIN_MANAGE");
    if (!context) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if prompt exists and is deleted
    const prompt = await db.prompt.findUnique({
      where: { id },
      select: { id: true, type: true, deletedAt: true },
    });

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    if (!prompt.deletedAt) {
      return NextResponse.json({ error: "Prompt is not deleted" }, { status: 400 });
    }

    // Restore the prompt by setting deletedAt to null
    await db.prompt.update({
      where: { id },
      data: { deletedAt: null },
    });

    await writeAuditLog({
      actorId: context.userId,
      action: prompt.type === "SKILL" ? "SKILL_RESTORE" : "PROMPT_RESTORE",
      resourceType: prompt.type === "SKILL" ? "SKILL" : "PROMPT",
      resourceId: id,
      before: { deletedAt: prompt.deletedAt },
      after: { deletedAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Restore prompt error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
