import catalog from "./visual-stickers.json";
export type StickerStyle = "doodle" | "retro";
export const STICKER_CATEGORIES = ["mbti", "career", "hobby", "pets", "sports", "vibes", "zodiac", "food", "decor"] as const;
export type StickerCategory = typeof STICKER_CATEGORIES[number];
export interface PresetSticker { id: string; category: string; style: string; key: string; path: string; }
export const PRESET_STICKERS: readonly PresetSticker[] = catalog;
const byId = new Map(PRESET_STICKERS.map(item => [item.id, item]));
export function presetSticker(id: string): PresetSticker | undefined { return byId.get(id); }
export function stickerTexturePaths(stickers: readonly { preset?: string }[]): Record<string, string> {
 return Object.fromEntries(stickers.flatMap(sticker => { const preset = sticker.preset ? presetSticker(sticker.preset) : undefined; return preset ? [[preset.id, preset.path]] : []; }));
}
