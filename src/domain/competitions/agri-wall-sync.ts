import type { AgriStageSubmissionContent } from "@/contracts/agri-submissions";
import { marketListingInputSchema, type MarketListingInput } from "@/contracts/marketplace";

export interface AgriWallSyncCopy {
  stage: string;
  summary: (summary: string) => string;
  description: (summary: string) => string;
  license: string;
  deliverable: string;
}
/** Only the explicitly submitted public summary and stable links are projected.
 * Artifact bodies, task materials and the official roster stay private. */
export function agriSubmissionWallListing(input: {
  slug: string; title: string; content: AgriStageSubmissionContent; copy: AgriWallSyncCopy;
  existing?: Pick<MarketListingInput, "coverUrl">;
}): MarketListingInput {
  const { content, copy } = input;
  const safeLink = (value: string | null | undefined) => {
    if (!value) return undefined;
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password && !u.search && !u.hash ? value : undefined;
    } catch { return undefined; }
  };
  const repository = safeLink(content.repository?.url);
  const github = repository && /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\/?$/.test(repository) ? repository : undefined;
  return marketListingInputSchema.parse({
    slug: input.slug,
    title: (input.title.trim() + " · " + copy.stage).slice(0, 100),
    summary: copy.summary(content.summary).slice(0, 300),
    description: copy.description(content.summary),
    category: "competition", subcategory: "agri-wall", fulfillment: "resource",
    priceMinor: 0, currency: "CNY", deliveryDays: 1, revisionLimit: 0, computeIncluded: false,
    deliverables: [copy.deliverable], licenseTerms: copy.license,
    ...(input.existing?.coverUrl ? { coverUrl: input.existing.coverUrl } : {}),
    ...(github ? { githubUrl: github } : {}),
    ...(safeLink(content.demoUrl) ? { usageUrl: safeLink(content.demoUrl) } : {}),
    ...(repository && !github ? { sourceUrl: repository } : {}),
  });
}