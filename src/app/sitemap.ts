import { ANS_LEARNING_PATHS } from "@/domain/vibehub/ans-learning-paths";
import { MetadataRoute } from "next";
import { listPublishedCatalog } from "@/server/catalog/service";
import { HUBS } from "@/domain/hubs/registry";
import vibeTerms from "./vibe-hub/terms.json";
import vibeCourses from "@/data/vibehub/courses/index.json";
import vibeTopics from "./vibe-hub/topics.json";
import vibeJourneys from "@/data/vibehub/journeys-en.json";
import { ANS_PRACTICES } from "@/domain/vibehub/ans-practices";

// Revalidate sitemap every hour (3600 seconds)
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://ans.cauai.fun";

  const staticPages: MetadataRoute.Sitemap = ["", "/explore", "/hubs", "/community", "/competitions", "/competitions/agrihackathon", "/market", "/workflows", "/showcase", "/vibeplan", ...HUBS.map(hub => `/hubs/${hub.slug}`)].map(path => ({ url: baseUrl + path, changeFrequency: "weekly", priority: path ? 0.8 : 1 }));

  const vibeStaticPages: MetadataRoute.Sitemap = ["vibe-hub", "vibe-hub/practice", "vibe-hub/anti-ai-flavor", "vibe-hub/vibehub-skill", "vibe-hub/topics", "vibe-hub/journeys", "vibe-hub/lab", "vibe-hub/updates"].map((path) => ({ url: `${baseUrl}/${path}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: path === "vibe-hub" ? 0.9 : 0.6 }));
  const vibeTermPages: MetadataRoute.Sitemap = vibeTerms.map((term) => ({ url: `${baseUrl}/vibe-hub/${term.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 }));

  const vibeJourneyPages: MetadataRoute.Sitemap = vibeJourneys.data.results.map((journey) => ({ url: `${baseUrl}/vibe-hub/journeys/${journey.id}`, changeFrequency: "monthly" as const, priority: 0.5 }));

  const vibeCoursePages: MetadataRoute.Sitemap = ["courses", ...new Set(vibeCourses.map(item=>`courses/${item.course}`)), ...vibeCourses.map(item=>`courses/${item.course}/${item.id}`), ...vibeTopics.map(item=>`topics/${item.slug}`)].map(path=>({url:`${baseUrl}/vibe-hub/${path}`,changeFrequency:"monthly" as const,priority:0.5}));

  const ansPracticePages: MetadataRoute.Sitemap = ["", ...ANS_PRACTICES.map(item => `/${item.slug}`)].map(path => ({
    url: `${baseUrl}/vibe-hub/ans${path}?lang=zh`,
    changeFrequency: "monthly" as const,
    priority: path ? 0.6 : 0.7,
    alternates: { languages: { "zh-CN": `${baseUrl}/vibe-hub/ans${path}?lang=zh`, en: `${baseUrl}/vibe-hub/ans${path}?lang=en` } },
  }));

  const ansPathPages: MetadataRoute.Sitemap = ANS_LEARNING_PATHS.map(path => ({
    url: `${baseUrl}/vibe-hub/journeys/${path.id}?lang=zh`, changeFrequency: "monthly" as const, priority: 0.6,
    alternates: { languages: { "zh-CN": `${baseUrl}/vibe-hub/journeys/${path.id}?lang=zh`, en: `${baseUrl}/vibe-hub/journeys/${path.id}?lang=en` } },
  }));

  // Database failures omit dynamic contents instead of resurrecting withdrawn entries.
  let catalogPages: MetadataRoute.Sitemap = [];
  try { catalogPages = (await listPublishedCatalog()).map(project => ({ url: `${baseUrl}/explore/${project.slug}`, changeFrequency: "weekly", priority: 0.6 })); } catch { /* Static public entry points remain available. */ }
  return [...staticPages, ...vibeStaticPages, ...vibeTermPages, ...vibeJourneyPages, ...vibeCoursePages, ...ansPracticePages, ...ansPathPages, ...catalogPages];
}
