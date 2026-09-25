import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { listAuditLogs, normalizeAuditLogQuery } from "@/server/admin/audit-logs";

export async function GET(request: NextRequest) {
  const context = await requireAdminPermission("AUDIT_VIEW");
  if (!context) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const result = await listAuditLogs(normalizeAuditLogQuery(searchParams));
  return NextResponse.json(result);
}
