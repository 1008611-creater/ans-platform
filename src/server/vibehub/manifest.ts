import { ANS_PRACTICES } from "@/domain/vibehub/ans-practices";
import snapshot from "@/data/vibehub/manifest.json";
export function makeVibeManifest(origin: string) {
  const apiBaseUrl = `${origin}/api/vibe-hub`;
  return {...snapshot, revision: `ans-${snapshot.revision}`, data:{
    ...snapshot.data, name:"ANS VibeHub", revision:`ans-${snapshot.revision}`, siteUrl:`${origin}/vibe-hub`, apiBaseUrl,
    capabilities:["search-lessons","get-lesson","browse-taxonomy","search-journeys","get-journey","resolve-terms","browse-courses","get-course-chapter"],
    browserContent: {
      knowledgeHome: `${origin}/vibe-hub`,
      practices: `${origin}/vibe-hub/ans`,
      languages: ["zh", "en"],
      guides: ANS_PRACTICES.map(item => ({ id: item.slug, title: item.title, summary: item.summary, pageUrl: `${origin}/vibe-hub/ans/${item.slug}` })),
    },
    endpoints:{manifest:`${origin}/.well-known/vibehub.json`, search:`${apiBaseUrl}/search{?q,category,limit,locale}`, resolver:`${apiBaseUrl}/resolve{?q,locale}`, lesson:`${apiBaseUrl}/lessons/{id}{?locale}`, journeys:`${apiBaseUrl}/journeys{?q,limit,locale}`, journey:`${apiBaseUrl}/journeys/{id}{?locale}`, taxonomy:`${apiBaseUrl}/taxonomy`, courses:`${apiBaseUrl}/courses`, course:`${apiBaseUrl}/courses/{id}`, chapter:`${apiBaseUrl}/courses/{id}/{chapter}`, activity:`${origin}/vibe-hub/lab#spec={base64url-json}`},
  }};
}
