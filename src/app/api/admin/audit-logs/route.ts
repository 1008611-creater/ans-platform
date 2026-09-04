import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const context = await requireAdminPermission("AUDIT_VIEW");
  if (!context) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "30")));
  const action = searchParams.get("action")?.trim() || undefined;
  const resourceType = searchParams.get("resourceType")?.trim() || undefined;

  const where = {
    ...(action ? { action } : {}),
    ...(resourceType ? { resourceType } : {}),
  };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        actor: { select: { id: true, username: true, name: true } },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
