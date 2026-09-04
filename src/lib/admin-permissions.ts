import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const ADMIN_PERMISSIONS = [
  "USERS_VIEW",
  "USERS_MANAGE",
  "PROMPTS_VIEW",
  "PROMPTS_MANAGE",
  "SKILLS_VIEW",
  "SKILLS_MANAGE",
  "REPORTS_MANAGE",
  "WEBHOOKS_MANAGE",
  "AUDIT_VIEW",
  "RECYCLE_BIN_MANAGE",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

// Existing ADMIN users retain full access until permissions are explicitly set.
export const DEFAULT_ADMIN_PERMISSIONS: readonly AdminPermission[] = ADMIN_PERMISSIONS;

export function hasAdminPermission(
  storedPermissions: unknown,
  permission: AdminPermission
): boolean {
  // `null`/missing preserves the legacy full-access behavior for existing
  // administrators. An explicit empty array means the account has no access.
  if (!Array.isArray(storedPermissions)) {
    return true;
  }
  return storedPermissions.includes(permission);
}

export async function getAdminContext() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, adminPermissions: true, deletedAt: true },
  });

  if (!user || user.role !== "ADMIN" || user.deletedAt) {
    return null;
  }

  return {
    userId: user.id,
    permissions: user.adminPermissions,
  };
}

export async function requireAdminPermission(permission: AdminPermission) {
  const context = await getAdminContext();
  if (!context || !hasAdminPermission(context.permissions, permission)) {
    return null;
  }
  return context;
}
