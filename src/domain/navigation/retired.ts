/** Retire public prompt-product pages while retaining APIs, data and embed auth. */
const destinations: Readonly<Record<string, string>> = {
  "/prompts": "/explore", "/templates": "/hubs", "/categories": "/explore", "/tags": "/explore",
  "/skills": "/hubs/vibehub", "/taste": "/hubs", "/book": "/hubs/vibehub", "/feed": "/community",
  "/discover": "/explore", "/promptmasters": "/community", "/kids": "/hubs", "/developers": "/hubs/full-stack",
  "/builder": "/workspace", "/presentation": "/hubs", "/how_to_write_effective_prompts": "/hubs/vibehub",
  "/about": "/hubs", "/brand": "/hubs", "/docs/api": "/hubs/full-stack", "/docs/self-hosting": "/hubs/full-stack",
};
export function retiredDestination(pathname: string): string | null {
  if (pathname === "/embed") return "/hubs";
  if (pathname === "/prompts.csv" || pathname === "/prompts.json") return "/explore";
  for (const [prefix, destination] of Object.entries(destinations)) if (pathname === prefix || pathname.startsWith(prefix + "/")) return destination;
  return null;
}
