import type { AbstractIntlMessages } from "next-intl";

/**
 * Message paths the site frame reads in the browser: header, footer, mobile tab bar,
 * Agent, notifications and the root error boundaries. The root layout ships only these;
 * routes that need more add their own provider (see route-messages.tsx).
 * src/__tests__/i18n/client-messages.test.ts fails when a frame component reads outside this list.
 */
export const SITE_FRAME_MESSAGE_PATHS = [
  "a11y",
  "brand.copyLogoSvg",
  "companion",
  "footer",
  "hubs.account",
  "hubs.mobileNavigation",
  "hubs.nav",
  "hubs.navigationDescription",
  "hubs.shortNav",
  "learning.newProject",
  "nav",
  "notifications",
  "product.agriIssues",
  "product.computeHistory.title",
  "product.loggingOut",
  "product.logoutFailed",
  "product.logoutRetry",
  "product.market.loadError",
  "product.market.loadErrorBody",
  "product.market.retry",
  "product.mascot",
  "product.menu",
  "product.quotaHistory.title",
  "product.toonflow.embed",
  "serverError",
  "settings.language",
] as const;

/** Extra message paths for public pages that render under the site frame provider only. */
export const PUBLIC_PAGE_MESSAGE_PATHS = {
  explore: ["agriWall", "product.accountBoundary", "product.marketProject"],
  community: ["product.accountBoundary", "product.communityPage", "product.growth"],
} as const;

/** Copies only the listed dot paths, keeping their nesting. */
export function pickMessages(messages: AbstractIntlMessages, paths: readonly string[]): AbstractIntlMessages {
  const picked: AbstractIntlMessages = {};
  for (const path of paths) {
    const keys = path.split(".");
    let source: AbstractIntlMessages | string | undefined = messages;
    let target = picked;
    for (const [index, key] of keys.entries()) {
      if (typeof source !== "object" || !(key in source)) break;
      const value: AbstractIntlMessages | string = source[key];
      if (index === keys.length - 1) target[key] = value;
      else {
        if (typeof target[key] !== "object") target[key] = {};
        target = target[key] as AbstractIntlMessages;
        source = value;
      }
    }
  }
  return picked;
}
