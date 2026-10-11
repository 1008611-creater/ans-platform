import { describe, expect, it } from "vitest";
import { hexToOklch, pickPrimaryForeground } from "@/lib/theme-colors";

describe("theme color readability", () => {
  it("preserves the brand hue and chooses readable text for production indigo", () => {
    expect(hexToOklch("#6366f1")).toBe("oklch(0.585 0.204 277.1)");
    expect(pickPrimaryForeground("#6366f1")).toBe("oklch(0 0 0)");
    expect(pickPrimaryForeground("#4f46e5")).toBe("oklch(1 0 0)");
  });

  it("maintains minimum contrast across a 4096-color sRGB grid", () => {
    for (let r = 0; r <= 255; r += 17) {
      for (let g = 0; g <= 255; g += 17) {
        for (let b = 0; b <= 255; b += 17) {
          const channels = [r, g, b];
          const hex = "#" + channels.map(c => c.toString(16).padStart(2, "0")).join("");
          const linear = channels.map(c => c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
          const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
          const contrast = pickPrimaryForeground(hex) === "oklch(1 0 0)" ? 1.05 / (luminance + 0.05) : (luminance + 0.05) / 0.05;
          expect(contrast, hex).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("handles invalid theme input deterministically", () => {
    expect(hexToOklch("invalid")).toBe("oklch(0.5 0.2 260)");
    expect(pickPrimaryForeground("invalid")).toBe("oklch(1 0 0)");
  });
});
