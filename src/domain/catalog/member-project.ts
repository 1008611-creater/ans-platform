import type { MarketOfferView } from "@/contracts/marketplace-view";
import type { CatalogProject } from "./projects";

/** Only reviewed, published snapshots enter the square; private member Project facts are never read. */
export function memberCatalogProject(offer: MarketOfferView): CatalogProject {
  const data = offer.listing;
  const creator = offer.seller.nickname || offer.seller.username;
  return {
    slug: "member-" + offer.slug, category: data.category, subcategory: data.subcategory,
    goal: data.category === "career" ? "career" : data.category === "competition" ? "contest" : "portfolio",
    source: "web", sourceUrl: data.sourceUrl ?? data.previewUrl, preview: "site",
    memberHref: "/market/" + offer.slug, creator,
    ...(data.coverUrl ? {coverUrl: data.coverUrl, coverNote: "创作者上传的项目截图"} : {}),
    content: {zh: {
      title: data.title, summary: data.summary, sample: creator,
      output: data.deliverables.join("\n"), inputs: data.description,
      decisions: data.licenseTerms, model: "以创作者的项目说明为准。",
      prompt: "以创作者的项目说明为准。", skill: "以创作者的项目说明为准。",
      sourceNote: "由 " + creator + " 提交并通过审核；项目资料来自创作者，查看详情了解使用方式。",
    }},
  };
}
