import { getTranslations } from "next-intl/server";
import { CATALOG_PROJECTS } from "@/domain/catalog/projects";
import { CATALOG_TEXT_FIELDS, catalogEntrySchema, type CatalogEntry, type CatalogText } from "@/contracts/catalog-content";
export async function builtinCatalogDrafts(): Promise<CatalogEntry[]> {
  const [zh, en] = await Promise.all([getTranslations({ locale: "zh", namespace: "product" }), getTranslations({ locale: "en", namespace: "product" })]);
  return CATALOG_PROJECTS.map(project => {
    if (project.content) return catalogEntrySchema.parse(project);
    function content(t: typeof zh): CatalogText {
      return Object.fromEntries(CATALOG_TEXT_FIELDS.map(field => {
        const key = `projects.${project.slug}.${field}`;
        return [field, t.has(key) ? t(key) : field === "model" ? t("modelBody") : field === "skill" ? t("skillBody") : t("catalogAdmin.officialSource")];
      })) as CatalogText;
    }
    return catalogEntrySchema.parse({ ...project, content: { zh: content(zh), en: content(en) } });
  });
}