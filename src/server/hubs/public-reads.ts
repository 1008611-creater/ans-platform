import type { CatalogProject } from "@/domain/catalog/projects";
import { listPublishedCatalog } from "@/server/catalog/service";
import { findPublishedPlatformRecipe } from "@/server/workflows/platform-recipes";
import { publishedRecipeMarketPath } from "@/server/marketplace/workflows";

// Hub pages read the whole published catalog and the platform recipe on every
// visit. Both change only when an editor publishes, so a short in-process TTL
// keeps Hub pages from paying those database round trips on every request.
// Failures are never cached: the next visit retries.
const TTL_MS = 60_000;
type Entry<T> = { at: number; value: Promise<T> };
let catalog: Entry<readonly CatalogProject[]> | null = null;
let platform: Entry<HubPlatformRead> | null = null;

export type HubPlatformRead = {
  platform: Awaited<ReturnType<typeof findPublishedPlatformRecipe>>;
  workflowsUnavailable: boolean;
  marketPath: string | null;
  marketUnavailable: boolean;
};

export function readHubCatalog(): Promise<readonly CatalogProject[]> {
  if (catalog && Date.now() - catalog.at < TTL_MS) return catalog.value;
  const entry: Entry<readonly CatalogProject[]> = { at: Date.now(), value: listPublishedCatalog() };
  catalog = entry;
  entry.value.catch(() => { if (catalog === entry) catalog = null; });
  return entry.value;
}

async function loadPlatform(): Promise<HubPlatformRead> {
  let recipe: HubPlatformRead["platform"];
  try { recipe = await findPublishedPlatformRecipe(); }
  catch { return { platform: null, workflowsUnavailable: true, marketPath: null, marketUnavailable: false }; }
  if (!recipe) return { platform: recipe, workflowsUnavailable: false, marketPath: null, marketUnavailable: false };
  try {
    const marketPath = await publishedRecipeMarketPath(recipe.workflow, recipe.version, recipe.recipe.definitionHash);
    return { platform: recipe, workflowsUnavailable: false, marketPath, marketUnavailable: false };
  } catch { return { platform: recipe, workflowsUnavailable: false, marketPath: null, marketUnavailable: true }; }
}

/** The platform recipe and its market card; an unavailable read is returned but not kept. */
export function readHubPlatform(): Promise<HubPlatformRead> {
  if (platform && Date.now() - platform.at < TTL_MS) return platform.value;
  const entry: Entry<HubPlatformRead> = { at: Date.now(), value: loadPlatform() };
  platform = entry;
  void entry.value.then(result => { if ((result.workflowsUnavailable || result.marketUnavailable) && platform === entry) platform = null; });
  return entry.value;
}

/** Tests swap the underlying reads between cases. */
export function resetHubReadCache() { catalog = null; platform = null; }
