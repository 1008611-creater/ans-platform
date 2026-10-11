import snapshot from "@/data/vibehub/manifest.json";
export function makeVibeManifest(origin: string) {
  const apiBaseUrl = `${origin}/api/vibe-hub`;
  return {...snapshot, revision: `ans-${snapshot.revision}`, data:{
    ...snapshot.data, name:"VibeHub · ANS", revision:`ans-${snapshot.revision}`, siteUrl:`${origin}/vibe-hub`, apiBaseUrl,
    capabilities:["search-lessons","get-lesson","browse-taxonomy","search-journeys","get-journey","resolve-terms"],
    endpoints:{manifest:`${origin}/.well-known/vibehub.json`, search:`${apiBaseUrl}/search{?q,category,limit,locale}`, resolver:`${apiBaseUrl}/resolve{?q,locale}`, lesson:`${apiBaseUrl}/lessons/{id}{?locale}`, journeys:`${apiBaseUrl}/journeys{?q,limit,locale}`, journey:`${apiBaseUrl}/journeys/{id}{?locale}`, taxonomy:`${apiBaseUrl}/taxonomy`, activity:`${origin}/vibe-hub/lab#spec={base64url-json}`},
  }};
}
