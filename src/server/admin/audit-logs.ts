import { db } from "@/lib/db";

/** 审计日志查询：分页 + 按 action / resourceType 过滤。 */

export const AUDIT_LOG_MAX_LIMIT = 100;
export const AUDIT_LOG_DEFAULT_LIMIT = 30;

export type AuditLogQuery = {
  page: number;
  limit: number;
  action?: string;
  resourceType?: string;
};

export function normalizeAuditLogQuery(searchParams: URLSearchParams): AuditLogQuery {
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const limit = Math.min(
    AUDIT_LOG_MAX_LIMIT,
    Math.max(1, Number(searchParams.get("limit") || String(AUDIT_LOG_DEFAULT_LIMIT)) || AUDIT_LOG_DEFAULT_LIMIT),
  );
  const action = searchParams.get("action")?.trim() || undefined;
  const resourceType = searchParams.get("resourceType")?.trim() || undefined;
  return { page, limit, action, resourceType };
}

export async function listAuditLogs(query: AuditLogQuery) {
  const { page, limit, action, resourceType } = query;
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

  return {
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}