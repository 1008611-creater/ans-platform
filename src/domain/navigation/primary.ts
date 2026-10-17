/** Shared primary destinations for desktop, sheet and bottom navigation. */
export const PRIMARY_NAVIGATION = [
  { id: "explore", href: "/explore", icon: "compass" },
  { id: "hubs", href: "/hubs", icon: "layers" },
  { id: "community", href: "/community", icon: "users" },
  { id: "competitions", href: "/competitions", icon: "trophy" },
  { id: "market", href: "/market", icon: "store" },
  { id: "workspace", href: "/workspace", icon: "dashboard" },
] as const;
export type PrimaryNavigationId = typeof PRIMARY_NAVIGATION[number]["id"];
function within(pathname: string, root: string) { return pathname === root || pathname.startsWith(root + "/"); }
export function isPrimaryNavigationActive(id: PrimaryNavigationId, pathname: string) {
  switch (id) {
    case "explore": return pathname === "/" || within(pathname, "/explore");
    case "hubs": return ["/hubs", "/vibe-hub"].some(root => within(pathname, root));
    case "workspace": return ["/workspace", "/projects", "/teams"].some(root => within(pathname, root));
    default: return within(pathname, PRIMARY_NAVIGATION.find(item => item.id === id)!.href);
  }
}
