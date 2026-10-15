import { cache } from "react";
import { auth } from "@/lib/auth";
import { getMarketListing, getPublishedResumeMarketListing } from "./listings";
import { presentMarketWorkflow } from "./workflow-presentation";

/** Viewer-aware presentation, shared by metadata and page within one render only. */
export const readMarketPage = cache(async (slug: string) => {
  const session = await auth();
  if (slug === "resume-website") {
    const { offer, recipe } = await getPublishedResumeMarketListing(session?.user?.id);
    // Reuse this render's exact attested version. Execution still rechecks the live binding.
    const runnable = presentMarketWorkflow(recipe.definition, recipe.workflow.estimatedCost, recipe.version.version);
    return { session, offer, runnable };
  }
  const offer = await getMarketListing(slug, session?.user?.id);
  return { session, offer, runnable: null };
});
