/** Shared primary destinations for desktop, sheet and bottom navigation. */
export const PRIMARY_NAVIGATION = [
  { id: "explore", href: "/explore", icon: "compass" },
  { id: "market", href: "/market", icon: "store" },
] as const;
export type PrimaryNavigationId = typeof PRIMARY_NAVIGATION[number]["id"];
function within(pathname: string, root: string) { return pathname === root || pathname.startsWith(root + "/"); }
export function isPrimaryNavigationActive(id: PrimaryNavigationId, pathname: string) {
  switch (id) {
    case "explore": return pathname === "/" || within(pathname, "/explore");
    default: return within(pathname, PRIMARY_NAVIGATION.find(item => item.id === id)!.href);
  }
}
