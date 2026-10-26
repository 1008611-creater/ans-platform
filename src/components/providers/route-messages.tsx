import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { pickMessages } from "@/i18n/client-messages";

/**
 * The root layout ships only the site frame's messages to the browser.
 * A nested provider replaces (does not merge with) the frame's messages for its subtree,
 * so it must carry everything that subtree reads.
 */
export async function RouteMessages({ paths, children }: { paths?: readonly string[]; children: React.ReactNode }) {
  const messages = await getMessages();
  return <NextIntlClientProvider messages={paths ? pickMessages(messages, paths) : messages}>{children}</NextIntlClientProvider>;
}

/** Layout for routes that have not been trimmed yet: their pages get every message, as before. */
export default function FullMessagesLayout({ children }: { children: React.ReactNode }) {
  return <RouteMessages>{children}</RouteMessages>;
}
