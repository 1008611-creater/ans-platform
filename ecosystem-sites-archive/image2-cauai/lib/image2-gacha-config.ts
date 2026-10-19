import type { Image2GachaMode } from "@/lib/image2-gacha-store";

const packTargetSlots = 9;
const singleDrawCount = 1;
const singleTargetSlots = 1;
const defaultPackDrawCount = 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getImage2GachaPackDrawCount(value = process.env.IMAGE2_GACHA_PACK_DRAW_COUNT) {
  const parsed = Number(value || defaultPackDrawCount);
  return clamp(Number.isFinite(parsed) ? parsed : defaultPackDrawCount, 1, packTargetSlots);
}

export function getImage2GachaModeConfig(mode: Image2GachaMode) {
  if (mode === "single") {
    return {
      drawCount: singleDrawCount,
      quotaCost: singleDrawCount * 2,
      targetSlots: singleTargetSlots
    };
  }

  const drawCount = getImage2GachaPackDrawCount();
  return {
    drawCount,
    quotaCost: drawCount * 2,
    targetSlots: packTargetSlots
  };
}

export function getImage2GachaConfig() {
  const pack = getImage2GachaModeConfig("pack");
  return {
    modes: {
      pack: {
        ...pack,
        fullPack: pack.drawCount === pack.targetSlots
      },
      single: getImage2GachaModeConfig("single")
    }
  };
}
