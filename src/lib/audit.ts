import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type AuditInput = {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;

  // Audit payloads may contain Date instances from Prisma records. Normalize
  // them (and other JSON-compatible values) before sending them to JSONB.
  const serialized = JSON.stringify(value);
  if (serialized === undefined) return undefined;
  return JSON.parse(serialized) as Prisma.InputJsonValue;
}

export async function writeAuditLog(input: AuditInput) {
  try {
    return await db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        before: toJson(input.before),
        after: toJson(input.after),
        metadata: toJson(input.metadata),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    // Audit failure must not turn a successful moderation action into a 500.
    console.error("Audit log write failed:", error);
    return null;
  }
}
