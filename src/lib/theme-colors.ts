/** Theme conversion and WCAG foreground selection. No application dependencies. */
function parseHex(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!result) return null;
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
}

function toLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function hexToOklch(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "oklch(0.5 0.2 260)";

  const [r, g, b] = rgb.map(toLinear) as [number, number, number];

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  let hue = (Math.atan2(B, A) * 180) / Math.PI;
  if (hue < 0) hue += 360;

  return `oklch(${L.toFixed(3)} ${Math.hypot(A, B).toFixed(3)} ${hue.toFixed(1)})`;
}

/** Pure black or white provides at least 4.5:1 contrast for any opaque sRGB color. */
export function pickPrimaryForeground(primary: string): string {
  const rgb = parseHex(primary);
  if (!rgb) return "oklch(1 0 0)";
  const luminance = relativeLuminance(rgb);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const blackContrast = (luminance + 0.05) / 0.05;
  return whiteContrast >= blackContrast ? "oklch(1 0 0)" : "oklch(0 0 0)";
}
