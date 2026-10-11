/** Pure permission rules, shared without loading authentication or its credentials. */
export const ADMIN_PERMISSIONS = [
  "USERS_VIEW", "USERS_MANAGE", "PROMPTS_VIEW", "PROMPTS_MANAGE", "SKILLS_VIEW", "SKILLS_MANAGE",
  "REPORTS_MANAGE", "WEBHOOKS_MANAGE", "AUDIT_VIEW", "RECYCLE_BIN_MANAGE", "INVITES_MANAGE", "MARKETPLACE_MANAGE", "CATALOG_MANAGE",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];
export const DEFAULT_ADMIN_PERMISSIONS: readonly AdminPermission[] = ADMIN_PERMISSIONS;
export function hasAdminPermission(storedPermissions: unknown, permission: AdminPermission): boolean {
  // Preserve legacy full access; explicit empty or scoped arrays are restrictive.
  return !Array.isArray(storedPermissions) || storedPermissions.includes(permission);
}
