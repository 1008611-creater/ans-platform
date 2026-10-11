import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasAdminPermission, type AdminPermission } from "./admin-permission-values";
export { ADMIN_PERMISSIONS, DEFAULT_ADMIN_PERMISSIONS, hasAdminPermission, type AdminPermission } from "./admin-permission-values";

export async function getAdminContext() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, adminPermissions: true, deletedAt: true, flagged: true },
  });

  if (!user || user.role !== "ADMIN" || user.deletedAt || user.flagged) {
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
