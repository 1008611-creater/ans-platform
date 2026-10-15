import type { MarketOfferView } from "@/contracts/marketplace-view";
import { PLATFORM_RESUME_RECIPE } from "@/domain/workflows/platform-recipes";

export function marketProductPath(offer: Pick<MarketOfferView, "slug" | "official" | "listing">) {
  const binding = offer.listing.execution;
  return offer.official && binding?.definitionHash === PLATFORM_RESUME_RECIPE.definitionHash && binding.version === PLATFORM_RESUME_RECIPE.version
    ? "/market/resume-website" : `/market/${offer.slug}`;
}
