/** Only public, current snapshots are projected into these navigation links. */
export type ProductConnection = {
  slug: string;
  title: string;
  href: string;
  summary?: string | null;
  version?: number;
  kind: "project" | "workflow" | "service" | "resource" | "workflow-offer";
  pricePoints?: number;
};
export type ProductConnections = {
  projects: ProductConnection[];
  workflows: ProductConnection[];
  offers: ProductConnection[];
};
