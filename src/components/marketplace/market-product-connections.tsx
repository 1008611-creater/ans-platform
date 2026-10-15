import { ProductConnectionsSection } from "@/components/catalog/product-connections";
import type { MarketOfferView } from "@/contracts/marketplace-view";
import { getMarketConnections } from "@/server/catalog/connections";

/** Optional discovery streams independently of the product and its editor. */
export async function MarketProductConnections({ offer }: { offer: MarketOfferView }) {
  let connections: Awaited<ReturnType<typeof getMarketConnections>>;
  try {
    connections = await getMarketConnections(offer);
  } catch {
    // Discovery must not take down the editor; never log private ORM diagnostics.
    console.warn("Market product connections unavailable.");
    return null;
  }
  return <ProductConnectionsSection connections={connections} />;
}
