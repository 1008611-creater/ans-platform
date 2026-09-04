import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { requireAdminPermission } from "@/lib/admin-permissions";

const updateSchema = z.object({
  status: z.enum(["PENDING", "REVIEWED", "DISMISSED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAdminPermission("REPORTS_MANAGE");
    if (!context) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = updateSchema.parse(body);

    const before = await db.promptReport.findUnique({ where: { id }, select: { status: true } });
    if (!before) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    const report = await db.promptReport.update({
      where: { id },
      data: { status },
    });

    await writeAuditLog({ actorId: context.userId, action: "REPORT_STATUS_UPDATE", resourceType: "REPORT", resourceId: id, before, after: { status: report.status } });
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    console.error("Report update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
