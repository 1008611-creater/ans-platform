// @vitest-environment node
import { expect, it } from "vitest";
import { DINO_SPECIES, DINO_WARDROBE_ITEMS, pickCatalogText, type DinoSpeciesDef, type WardrobeItemDef } from "@/domain/mascot/sanctuary";

const SPECIES_FIELDS = ["name", "defaultNickname", "title", "mbti", "tagline", "personality", "agentSpecialty", "agentBuffLabel", "greetingLine", "whipLine", "feedLine"] as const;
const ITEM_FIELDS = ["name", "description", "specialQuote", "styleTag"] as const;
const hasChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);
const species = Object.values(DINO_SPECIES) as DinoSpeciesDef[];

it("每个族群的 11 个文案字段都带英文", () => {
  const missing: string[] = [];
  for (const sp of species) {
    for (const field of SPECIES_FIELDS) {
      const en = (sp as unknown as Record<string, unknown>)[`${field}En`];
      if (typeof en !== "string" || !en) missing.push(`${sp.id}.${field}`);
    }
  }
  expect(missing).toEqual([]);
});

it("每件衣橱物品的 4 个文案字段都带英文", () => {
  const missing: string[] = [];
  for (const item of DINO_WARDROBE_ITEMS as WardrobeItemDef[]) {
    for (const field of ITEM_FIELDS) {
      const en = (item as unknown as Record<string, unknown>)[`${field}En`];
      if (typeof en !== "string" || !en) missing.push(`${item.slot}:${field}:${String(item.name)}`);
    }
  }
  expect(missing).toEqual([]);
});

it("英文字段不残留中文", () => {
  const bad: string[] = [];
  for (const sp of species) {
    for (const field of SPECIES_FIELDS) {
      const en = String((sp as unknown as Record<string, unknown>)[`${field}En`] ?? "");
      if (hasChinese(en)) bad.push(`${sp.id}.${field} = ${en}`);
    }
  }
  for (const item of DINO_WARDROBE_ITEMS as WardrobeItemDef[]) {
    for (const field of ITEM_FIELDS) {
      const en = String((item as unknown as Record<string, unknown>)[`${field}En`] ?? "");
      if (hasChinese(en)) bad.push(`${field} = ${en}`);
    }
  }
  expect(bad).toEqual([]);
});

it("中文界面取中文原文，英文界面取英文；英文缺失时回落中文", () => {
  const sp = DINO_SPECIES.mint_star;
  expect(pickCatalogText(sp, "name", true)).toBe(sp.name);
  expect(pickCatalogText(sp, "name", false)).toBe((sp as unknown as Record<string, string>).nameEn);
  const legacy = { name: "老道具" } as unknown as WardrobeItemDef;
  expect(pickCatalogText(legacy, "name", false)).toBe("老道具");
});
