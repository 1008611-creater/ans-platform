import { PRIMARY_NAVIGATION, isPrimaryNavigationActive } from "@/domain/navigation/primary";

/** Pages that keep the bottom tab bar; every other page is a pushed screen with a back button. */
const TAB_ROOT_PATHS = new Set<string>(["/", ...PRIMARY_NAVIGATION.map(item => item.href), "/competitions/agrihackathon"]);

function normalize(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function isTabRootPath(pathname: string) {
  return TAB_ROOT_PATHS.has(normalize(pathname));
}

/** Where the back button goes when there is no in-app history (opened from a shared link). */
export function sectionRootFor(pathname: string) {
  const path = normalize(pathname);
  if (path.startsWith("/competitions/agrihackathon/")) return "/competitions/agrihackathon";
  return PRIMARY_NAVIGATION.find(item => isPrimaryNavigationActive(item.id, path))?.href ?? "/";
}

export type AppShell = "android" | "ios";

/** The Android shell appends `ANSMobileApp/<version>` to the WebView user agent. */
export function detectAppShell(userAgent: string | null | undefined): AppShell | null {
  return userAgent && /\bANSMobileApp\//.test(userAgent) ? "android" : null;
}
