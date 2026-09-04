import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";

// DELETE - Soft delete a prompt (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAdminPermission("PROMPTS_MANAGE");
    if (!context) {
      return NextResponse.json(
        { error: "forbidden", message: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Validate prompt ID
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "invalid_request", message: "Valid prompt ID is required" },
        { status: 400 }
      );
    }

    // Check if prompt exists
    const prompt = await db.prompt.findUnique({
      where: { id },
      select: { id: true, title: true, type: true, deletedAt: true },
    });

    if (!prompt) {
      return NextResponse.json(
        { error: "not_found", message: "Prompt not found" },
        { status: 404 }
      );
    }

    // Use soft delete so versions, reports, comments and votes remain recoverable.
    const deletedAt = new Date();
    await db.prompt.update({
      where: { id },
      data: { deletedAt },
    });

    await writeAuditLog({
      actorId: context.userId,
      action: prompt.type === "SKILL" ? "SKILL_DELETE" : "PROMPT_DELETE",
      resourceType: prompt.type === "SKILL" ? "SKILL" : "PROMPT",
      resourceId: id,
      before: { deletedAt: prompt.deletedAt },
      after: { deletedAt },
    });

    return NextResponse.json({
      success: true,
      message: "Prompt deleted successfully",
      deletedPrompt: {
        id: prompt.id,
        title: prompt.title,
      },
    });
  } catch (error) {
    console.error("Admin delete prompt error:", error);
    return NextResponse.json(
      { error: "server_error", message: "Failed to delete prompt" },
      { status: 500 }
    );
  }
}
