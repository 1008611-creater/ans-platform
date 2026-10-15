import { cache } from "react";
import { auth } from "@/lib/auth";
import { getMarketListing } from "./listings";

/** Viewer-aware presentation, shared by metadata and page within one render only. */
export const readMarketPage = cache(async (slug: string) => {
  const session = await auth();
  const offer = await getMarketListing(slug, session?.user?.id);
  return { session, offer };
});
