import terms from "../terms.json";
import tooltipZh from "@/data/vibehub/lessons/zh/tooltip.json";
import tooltipEn from "@/data/vibehub/lessons/en/tooltip.json";
// Only the tooltip preview needs lesson text; do not bundle the full lesson archive.
export const CLIENT_ENTRIES = terms.map(term => ({
  id: term.slug, name: term.name, cn: term.zhName, cat: term.zhCategory,
  tagline: term.slug === "tooltip" ? tooltipZh.data.tagline : "",
  desc: term.slug === "tooltip" ? tooltipZh.data.description : "",
  en: {tagline: term.slug === "tooltip" ? tooltipEn.data.tagline : "", desc: term.slug === "tooltip" ? tooltipEn.data.description : ""},
}));
export function getClientEntry(id: string) { return CLIENT_ENTRIES.find(term => term.id === id) || null; }
