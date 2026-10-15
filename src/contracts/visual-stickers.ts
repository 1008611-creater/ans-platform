import catalog from "./visual-stickers.json";
export type StickerStyle = "doodle" | "retro" | "fluent";
export const STICKER_CATEGORIES = ["mbti", "career", "hobby", "pets", "sports", "vibes", "zodiac", "food", "decor"] as const;
export type StickerCategory = typeof STICKER_CATEGORIES[number];
export interface PresetSticker { id: string; code: string; category: string; style: string; key: string; path: string; keywords?: string; }
export const PRESET_STICKERS: readonly PresetSticker[] = catalog;
const byId = new Map(PRESET_STICKERS.map(item => [item.id, item]));
export function presetSticker(id: string): PresetSticker | undefined { return byId.get(id); }
const byCode = new Map(PRESET_STICKERS.map(item => [item.code, item]));
const encodedStickerId = /^st1_([a-f0-9]{12})_([a-f0-9]{32})$/;

/** Decode only this shipped catalog; unknown versions and codes remain text stickers. */
export function presetForSticker(id: string): PresetSticker | undefined {
 const match = encodedStickerId.exec(id);
 return match ? byCode.get(match[1]) : undefined;
}
export function createPresetStickerId(catalogId: string, nonce = crypto.randomUUID()): string {
 const preset = presetSticker(catalogId);
 const instance = nonce.replaceAll("-", "");
 if (!preset || !/^[a-f0-9]{32}$/.test(instance)) throw new Error("INVALID_STICKER_ID");
 return `st1_${preset.code}_${instance}`;
}
export function cloneStickerId(id: string): string {
 const preset = presetForSticker(id);
 return preset ? createPresetStickerId(preset.id) : crypto.randomUUID();
}
export function stickerTexturePaths(stickers: readonly { id: string }[]): Record<string, string> {
 return Object.fromEntries(stickers.flatMap(sticker => {
  const preset = presetForSticker(sticker.id);
  return preset ? [[sticker.id, preset.path]] : [];
 }));
}

/** Only compact, signature-checked raster assets can be embedded in exported HTML. */
export function stickerImageMime(bytes: Uint8Array): "image/webp" | "image/png" | null {
 if (bytes.byteLength > 100000 || bytes.byteLength < 12) return null;
 const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
 if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
 if (bytes.byteLength >= 24 && [137,80,78,71,13,10,26,10].every((value,index) => bytes[index] === value) && ascii(12,16) === "IHDR") return "image/png";
 return null;
}

// Preserve Microsoft attribution in every export that embeds Fluent Emoji.
export const FLUENT_EMOJI_NOTICE = "Microsoft Fluent Emoji\nhttps://github.com/microsoft/fluentui-emoji\n    MIT License\n\n    Copyright (c) Microsoft Corporation.\n\n    Permission is hereby granted, free of charge, to any person obtaining a copy\n    of this software and associated documentation files (the \"Software\"), to deal\n    in the Software without restriction, including without limitation the rights\n    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n    copies of the Software, and to permit persons to whom the Software is\n    furnished to do so, subject to the following conditions:\n\n    The above copyright notice and this permission notice shall be included in all\n    copies or substantial portions of the Software.\n\n    THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\n    SOFTWARE\n";
