/**
 * GrokBot × 兔兔龙 (TutuLong) 2D 矢量弹簧与球面眼神引擎
 *
 * 融合开源 GrokBot 2D 动画核心机制（参考 iduu/grokbot-animation、nasawz/GrokBot、Coiggahou2002/grokbot-web）：
 * 1. 120Hz 固定步长半隐式欧拉阻尼弹簧求解器（Semi-Implicit Euler Damped Springs）
 * 2. 96 点闭合三次贝塞尔轮廓插值（ringOutline + 6 种可切换几何形态：兔兔龙萌团 / Grok流光团 / 超椭圆块 / 云朵团 / 赛博棱晶 / 星芒体）
 * 3. 48 点双眸轮廓变形（12 组 GrokBot 原版 48 点眼型平滑插值 + 42%/58% 非对称眨眼与单眼 Wink）
 * 4. 球面经度透视投影（Spherical Longitude Eye Projection：转头/360° 旋转时远侧眼透视收窄、绕到球体背面自动隐去）
 * 5. 兔兔龙特征层球面视差联动（头顶三连冠凸起、软萌兔龙耳、腮红贴片、奶白肚皮贴片与摇摆小胖尾）
 * 6. Agent Morph 动效层（Thinking 三点波浪、Orbit 星轨卫星、Radar 脉冲扫描、Sparkle 粒子迸发）
 */

import type { DinoState } from "./atlas";

export const HEAD_C = 114.2705;
export const BODY_SIZE = 228.541;
export const VIEWBOX_MIN = -18;
export const VIEWBOX_SPAN = 264;
export const FIXED_STEP = 1 / 120;
export const MAX_DELTA_SECONDS = 0.1;

export type GrokShapeId =
  | "tutulong"
  | "blob"
  | "squircle"
  | "cloud"
  | "crystal"
  | "star";

export type GrokExpressionId =
  | "neutral"
  | "listening"
  | "happy"
  | "curious"
  | "focused"
  | "thinking"
  | "excited"
  | "sleepy"
  | "proud"
  | "playful"
  | "surprised"
  | "shy";

export type GrokMorphEffect = "none" | "dots" | "orbit" | "radar" | "sparkle";

export type GrokRenderStyle = "grok" | "pixel";

export interface DampedSpring {
  x: number;
  v: number;
  target: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface SpeciesPalette {
  id: string;
  bodyStart: string;
  bodyMid: string;
  bodyEnd: string;
  rimLight: string;
  bellyFill: string;
  earInner: string;
  crestFill: string;
  eyeColor: string;
  eyeHighlight: string;
  cheekColor: string;
  accentGlow: string;
  badgeColor: string;
}

export const SPECIES_PALETTES: Record<string, SpeciesPalette> = {
  mint_star: {
    id: "mint_star",
    bodyStart: "#b8f5dc",
    bodyMid: "#7ce0ba",
    bodyEnd: "#38b889",
    rimLight: "#e8fff5",
    bellyFill: "#f7fffb",
    earInner: "#ffbfd4",
    crestFill: "#52d1a0",
    eyeColor: "#132a23",
    eyeHighlight: "#ffffff",
    cheekColor: "#ff94b8",
    accentGlow: "#4be3a8",
    badgeColor: "#fbbf24",
  },
  cyber_gold: {
    id: "cyber_gold",
    bodyStart: "#fff1a8",
    bodyMid: "#facc43",
    bodyEnd: "#d98218",
    rimLight: "#fffbeb",
    bellyFill: "#fffdf4",
    earInner: "#fda4af",
    crestFill: "#f59e0b",
    eyeColor: "#261707",
    eyeHighlight: "#ffffff",
    cheekColor: "#fb7185",
    accentGlow: "#fbbf24",
    badgeColor: "#38bdf8",
  },
  sakura_mochi: {
    id: "sakura_mochi",
    bodyStart: "#ffd8ea",
    bodyMid: "#ff9ec7",
    bodyEnd: "#ec5b98",
    rimLight: "#fff2f8",
    bellyFill: "#fff9fc",
    earInner: "#fde047",
    crestFill: "#f472b6",
    eyeColor: "#2b1020",
    eyeHighlight: "#ffffff",
    cheekColor: "#ff5c8a",
    accentGlow: "#f472b6",
    badgeColor: "#a78bfa",
  },
  aurora_ice: {
    id: "aurora_ice",
    bodyStart: "#d6f6ff",
    bodyMid: "#7dd8ff",
    bodyEnd: "#5b7cfa",
    rimLight: "#f0fbff",
    bellyFill: "#f7fcff",
    earInner: "#c4b5fd",
    crestFill: "#60a5fa",
    eyeColor: "#0f1c36",
    eyeHighlight: "#ffffff",
    cheekColor: "#f472b6",
    accentGlow: "#38bdf8",
    badgeColor: "#34d399",
  },
};

export function getSpeciesPalette(speciesId: string): SpeciesPalette {
  return SPECIES_PALETTES[speciesId] ?? SPECIES_PALETTES.mint_star;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / Math.max(edge1 - edge0, 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}

export function createSpring(initial = 0): DampedSpring {
  return { x: initial, v: 0, target: initial };
}

/**
 * 120Hz 半隐式欧拉阻尼弹簧积分（与 GrokBot PhysicsSystem 一致）
 */
export function stepSpring(
  spring: DampedSpring,
  omega: number,
  zeta: number,
  dt: number,
): void {
  const boundedDt = clamp(dt, 0, MAX_DELTA_SECONDS);
  let remaining = boundedDt;
  while (remaining > 1e-6) {
    const step = Math.min(remaining, FIXED_STEP);
    spring.v +=
      (-2 * zeta * omega * spring.v - omega * omega * (spring.x - spring.target)) *
      step;
    spring.x += spring.v * step;
    remaining -= step;
  }
}

/**
 * 将闭合点环转换为三阶 Catmull-Rom 贝塞尔平滑 SVG 路径（与 GrokBot ringOutline 一致）
 */
export function ringOutline(ring: readonly (readonly [number, number])[]): string {
  const round = (val: number) => Math.round(val * 100) / 100;
  const length = ring.length;
  if (length === 0) return "";
  let path = `M${round(ring[0][0])} ${round(ring[0][1])}`;
  for (let index = 0; index < length; index += 1) {
    const previous = ring[(index - 1 + length) % length];
    const point = ring[index];
    const next = ring[(index + 1) % length];
    const after = ring[(index + 2) % length];
    const c1x = round(point[0] + (next[0] - previous[0]) / 6);
    const c1y = round(point[1] + (next[1] - previous[1]) / 6);
    const c2x = round(next[0] - (after[0] - point[0]) / 6);
    const c2y = round(next[1] - (after[1] - point[1]) / 6);
    path += `C${c1x} ${c1y} ${c2x} ${c2y} ${round(next[0])} ${round(next[1])}`;
  }
  return `${path}Z`;
}

export function ringPath(ring: readonly (readonly [number, number])[]): string {
  if (ring.length === 0) return "";
  return `M${ring.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}Z`;
}

export function lerpRing(
  from: readonly (readonly [number, number])[],
  to: readonly (readonly [number, number])[],
  amount: number,
): [number, number][] {
  if (from.length === 0) return [];
  const t = clamp(amount, 0, 1);
  return from.map(([x, y], index) => {
    const target = to.length > 0 ? (to[index] ?? to[index % to.length] ?? [x, y]) : [x, y];
    return [x + (target[0] - x) * t, y + (target[1] - y) * t];
  });
}

export function centroid(ring: readonly (readonly [number, number])[]): [number, number] {
  if (ring.length === 0) return [HEAD_C, HEAD_C];
  let x = 0;
  let y = 0;
  for (const point of ring) {
    x += point[0];
    y += point[1];
  }
  return [x / ring.length, y / ring.length];
}

/**
 * 计算闭合轮廓在给定水平扫描线 y 处的左右边界 [left, right]
 */
export function spanAt(
  ring: readonly (readonly [number, number])[],
  y: number,
): [number, number] {
  let left = -Infinity;
  let right = Infinity;
  for (let index = 0; index < ring.length; index += 1) {
    const start = ring[index];
    const end = ring[(index + 1) % ring.length];
    if ((start[1] <= y) === (end[1] <= y)) continue;
    const x =
      start[0] +
      ((end[0] - start[0]) * (y - start[1])) / (end[1] - start[1]);
    if (x <= HEAD_C) left = Math.max(left, x);
    else right = Math.min(right, x);
  }
  return [
    Number.isFinite(left) ? left : HEAD_C - 72,
    Number.isFinite(right) ? right : HEAD_C + 72,
  ];
}

/**
 * 构建 96 点参数化闭合轮廓（保证所有形状均为相同点数，可任意弹簧插值变形）
 */
function buildParametricRing(
  radiusFn: (theta: number) => [number, number],
  count = 96,
): readonly (readonly [number, number])[] {
  return Array.from({ length: count }, (_, idx) => {
    const theta = (idx / count) * Math.PI * 2;
    const [rx, ry] = radiusFn(theta);
    return [
      Number((HEAD_C + Math.cos(theta) * rx).toFixed(2)),
      Number((HEAD_C + Math.sin(theta) * ry).toFixed(2)),
    ] as const;
  });
}

export const GROK_SHAPE_RINGS: Record<
  GrokShapeId,
  readonly (readonly [number, number])[]
> = {
  // 1. 兔兔龙原态萌团：上窄下饱满婴儿肥脸颊（呼应 V4.6 小恐龙宽胖圆润比例）
  tutulong: buildParametricRing((theta) => {
    const sinT = Math.sin(theta);
    // 下半脸颊微鼓婴儿肥（sin(theta) > 0 为下半部）
    const cheekBulge = sinT > 0 ? 1 + 0.095 * Math.pow(sinT, 1.4) : 1 - 0.03 * Math.abs(sinT);
    // 头顶微隆起
    const crownLift = sinT < -0.5 ? 1 + 0.04 * Math.cos(theta * 3) : 1;
    const baseR = 88;
    return [baseR * cheekBulge * crownLift, baseR * 0.96 * crownLift];
  }),

  // 2. Grok 经典流光圆团
  blob: buildParametricRing((theta) => {
    const r = 90 + 2.4 * Math.cos(theta * 2) + 1.6 * Math.sin(theta * 3);
    return [r, r];
  }),

  // 3. 超椭圆极客方块（Lamé curve n=3.8）
  squircle: buildParametricRing((theta) => {
    const n = 3.8;
    const c = Math.abs(Math.cos(theta));
    const s = Math.abs(Math.sin(theta));
    const factor = Math.pow(Math.pow(c, n) + Math.pow(s, n), -1 / n);
    const r = 84 * factor;
    return [r, r];
  }),

  // 4. 蓬松云朵萌团
  cloud: buildParametricRing((theta) => {
    const lobes = 1 + 0.085 * Math.cos(theta * 6) + 0.03 * Math.sin(theta * 3);
    return [90 * lobes, 82 * lobes];
  }),

  // 5. 赛博八面棱晶
  crystal: buildParametricRing((theta) => {
    const sides = 8;
    const seg = (Math.PI * 2) / sides;
    const local = (((theta % seg) + seg) % seg) - seg / 2;
    const poly = Math.cos(seg / 2) / Math.max(Math.cos(local), 0.72);
    const r = 82 * (0.35 + 0.65 * poly);
    return [r * 0.95, r * 1.02];
  }),

  // 6. 暴富五角柔星团
  star: buildParametricRing((theta) => {
    const starWave = 1 + 0.14 * Math.cos((theta + Math.PI / 2) * 5);
    return [86 * starWave, 86 * starWave];
  }),
};

export const GROK_SHAPE_META: readonly {
  id: GrokShapeId;
  icon: string;
  labelZh: string;
  labelEn: string;
}[] = [
  { id: "tutulong", icon: "🦖", labelZh: "兔兔龙态", labelEn: "TutuDino" },
  { id: "blob", icon: "🫧", labelZh: "Grok流光团", labelEn: "Grok Blob" },
  { id: "squircle", icon: "🧊", labelZh: "超椭圆体", labelEn: "Squircle" },
  { id: "cloud", icon: "☁️", labelZh: "蓬松云朵", labelEn: "Cloud" },
  { id: "crystal", icon: "💎", labelZh: "赛博棱晶", labelEn: "Crystal" },
  { id: "star", icon: "⭐", labelZh: "星芒形态", labelEn: "Star" },
];

function flatToPairs(flat: readonly number[]): readonly (readonly [number, number])[] {
  const pairs: [number, number][] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    pairs.push([flat[i], flat[i + 1]]);
  }
  return pairs;
}

/**
 * 原版 GrokBot 48 点双眸轮廓表（移植自 nasawz/GrokBot & Coiggahou2002/grokbot-web）
 */
const RAW_EXPRESSION_FLATS: Record<GrokExpressionId, readonly [readonly number[], readonly number[]]> = {
  // exp 00: 经典圆润灵动眼
  neutral: [
    [
      130.36, 45.98, 132.71, 46.19, 134.98, 46.81, 137.11, 47.83, 138.97, 49.28, 140.47, 51.09,
      141.68, 53.12, 142.73, 55.23, 143.76, 57.36, 144.78, 59.49, 145.79, 61.62, 146.79, 63.76,
      147.76, 65.91, 148.71, 68.07, 149.63, 70.25, 150.52, 72.43, 151.37, 74.63, 151.99, 76.91,
      152.1, 79.26, 151.64, 81.57, 150.59, 83.68, 149.04, 85.45, 147.1, 86.78, 144.9, 87.62,
      142.56, 87.93, 140.22, 87.71, 137.98, 86.99, 135.93, 85.82, 134.17, 84.24, 132.78, 82.34,
      131.69, 80.25, 130.77, 78.08, 129.87, 75.89, 128.94, 73.72, 128, 71.56, 127.03, 69.4, 126.05,
      67.26, 125.05, 65.12, 124.03, 62.99, 122.93, 60.9, 121.87, 58.79, 121.03, 56.59, 120.72,
      54.26, 121.1, 51.93, 122.15, 49.83, 123.75, 48.1, 125.76, 46.89, 128.01, 46.19,
    ],
    [
      176.61, 37.08, 178.72, 37.59, 180.7, 38.48, 182.52, 39.65, 184.2, 41.03, 185.71, 42.59,
      187.03, 44.31, 188.2, 46.14, 189.26, 48.03, 190.27, 49.96, 191.26, 51.89, 192.23, 53.84,
      193.16, 55.8, 194.05, 57.78, 194.92, 59.77, 195.74, 61.78, 196.53, 63.8, 197.27, 65.84,
      197.97, 67.9, 198.47, 70.01, 198.63, 72.18, 198.4, 74.33, 197.58, 76.33, 195.95, 77.72,
      193.83, 78.08, 191.71, 77.65, 189.76, 76.69, 188.03, 75.38, 186.53, 73.82, 185.28, 72.05,
      184.25, 70.13, 183.4, 68.14, 182.63, 66.11, 181.87, 64.07, 181.07, 62.05, 180.25, 60.04,
      179.39, 58.05, 178.49, 56.07, 177.57, 54.1, 176.61, 52.15, 175.62, 50.22, 174.59, 48.31,
      173.53, 46.41, 172.54, 44.48, 171.86, 42.42, 171.76, 40.26, 172.62, 38.3, 174.45, 37.19,
    ],
  ],
  // exp 10: 倾听专注眼
  listening: [
    [
      103.39, 78.25, 106.56, 78.38, 109.59, 79.28, 112.29, 80.94, 114.43, 83.28, 115.86, 86.1,
      116.52, 89.2, 116.32, 92.37, 115.62, 95.46, 114.86, 98.55, 114.1, 101.63, 113.36, 104.72,
      112.63, 107.81, 111.91, 110.91, 111.2, 114.01, 110.51, 117.1, 109.82, 120.21, 109.16, 123.31,
      108.52, 126.42, 107.84, 129.53, 106.8, 132.52, 105.04, 135.16, 102.66, 137.25, 99.81, 138.63,
      96.7, 139.2, 93.54, 138.96, 90.53, 137.95, 87.87, 136.24, 85.71, 133.92, 84.21, 131.13,
      83.48, 128.05, 83.5, 124.88, 84, 121.74, 84.7, 118.64, 85.4, 115.54, 86.08, 112.44, 86.77,
      109.34, 87.48, 106.24, 88.19, 103.15, 88.92, 100.05, 89.66, 96.96, 90.41, 93.88, 91.18, 90.8,
      91.95, 87.71, 93.1, 84.76, 94.95, 82.19, 97.4, 80.19, 100.28, 78.86,
    ],
    [
      161.99, 91.57, 165.07, 92, 167.9, 93.28, 170.32, 95.23, 172.22, 97.69, 173.49, 100.53,
      174.05, 103.59, 173.93, 106.7, 173.45, 109.78, 172.9, 112.85, 172.33, 115.91, 171.71, 118.97,
      171.06, 122.02, 170.38, 125.06, 169.66, 128.09, 168.91, 131.12, 168.13, 134.14, 167.33,
      137.15, 166.5, 140.16, 165.58, 143.14, 164.33, 145.98, 162.5, 148.5, 160.15, 150.53, 157.38,
      151.95, 154.34, 152.61, 151.24, 152.43, 148.32, 151.38, 145.83, 149.52, 143.99, 147.01,
      142.95, 144.08, 142.73, 140.98, 143.25, 137.91, 144.09, 134.91, 144.94, 131.91, 145.76,
      128.9, 146.54, 125.89, 147.29, 122.86, 148.01, 119.83, 148.69, 116.79, 149.34, 113.74,
      149.95, 110.68, 150.54, 107.62, 151.09, 104.55, 151.6, 101.47, 152.44, 98.48, 154, 95.79,
      156.21, 93.6, 158.94, 92.12,
    ],
  ],
  // exp 02: 开心弯眼笑
  happy: [
    [
      104.84, 104.08, 109.39, 104.89, 113.63, 106.73, 117.32, 109.5, 120.25, 113.08, 122.22,
      117.25, 123.15, 121.77, 122.92, 126.39, 121.86, 130.89, 120.61, 135.35, 119.37, 139.81,
      118.15, 144.27, 116.94, 148.74, 115.74, 153.21, 114.56, 157.69, 113.39, 162.17, 112.24,
      166.65, 111.13, 171.15, 110.04, 175.65, 108.89, 180.13, 106.98, 184.33, 103.8, 187.67, 99.75,
      189.87, 95.25, 190.93, 90.63, 190.93, 86.11, 189.97, 81.86, 188.16, 78.05, 185.54, 74.89,
      182.18, 72.62, 178.16, 71.54, 173.67, 71.94, 169.08, 73.01, 164.57, 74.13, 160.08, 75.26,
      155.59, 76.42, 151.11, 77.59, 146.63, 78.77, 142.15, 79.97, 137.68, 81.18, 133.22, 82.41,
      128.75, 83.65, 124.29, 84.87, 119.83, 86.33, 115.43, 88.67, 111.46, 91.9, 108.15, 95.83,
      105.72, 100.23, 104.35,
    ],
    [
      174.26, 115.55, 178.59, 116.54, 182.37, 118.86, 185.31, 122.2, 187.23, 126.21, 188.12,
      130.57, 188.06, 135.02, 187.52, 139.44, 186.86, 143.85, 186.11, 148.25, 185.25, 152.62,
      184.3, 156.98, 183.24, 161.31, 182.07, 165.61, 180.79, 169.88, 179.39, 174.12, 177.89,
      178.31, 176.27, 182.47, 174.47, 186.55, 172.17, 190.35, 169.21, 193.68, 165.73, 196.46,
      161.84, 198.64, 157.66, 200.16, 153.27, 200.91, 148.83, 200.69, 144.65, 199.19, 141.47,
      196.14, 140.18, 191.91, 140.82, 187.53, 142.46, 183.38, 144.16, 179.26, 145.73, 175.09,
      147.18, 170.87, 148.51, 166.62, 149.73, 162.33, 150.84, 158.01, 151.84, 153.67, 152.74,
      149.3, 153.54, 144.91, 154.24, 140.51, 154.85, 136.1, 155.58, 131.7, 156.93, 127.46, 159.15,
      123.6, 162.12, 120.29, 165.73, 117.68, 169.84, 116,
    ],
  ],
  // exp 03: 好奇大圆眼
  curious: [
    [
      44.72, 103.35, 47.95, 103.93, 51.04, 105.05, 53.93, 106.62, 56.58, 108.57, 58.97, 110.83,
      61.09, 113.35, 62.93, 116.07, 64.5, 118.97, 65.79, 121.99, 66.8, 125.13, 67.52, 128.34,
      67.94, 131.6, 68.08, 134.89, 67.9, 138.17, 67.4, 141.42, 66.56, 144.6, 65.33, 147.66, 63.71,
      150.52, 61.69, 153.11, 59.3, 155.36, 56.54, 157.16, 53.51, 158.42, 50.29, 159.07, 47, 159.09,
      43.76, 158.5, 40.67, 157.39, 37.78, 155.82, 35.13, 153.87, 32.75, 151.6, 30.63, 149.09,
      28.78, 146.36, 27.21, 143.47, 25.92, 140.44, 24.92, 137.31, 24.2, 134.1, 23.77, 130.84,
      23.64, 127.55, 23.81, 124.27, 24.31, 121.01, 25.16, 117.84, 26.38, 114.78, 28, 111.92, 30.02,
      109.33, 32.42, 107.08, 35.17, 105.28, 38.21, 104.02, 41.43, 103.37,
    ],
    [
      114.62, 83.64, 118.31, 83.88, 121.94, 84.6, 125.44, 85.77, 128.77, 87.38, 131.86, 89.4,
      134.67, 91.81, 137.13, 94.56, 139.2, 97.62, 140.85, 100.93, 142.05, 104.42, 142.79, 108.05,
      143.05, 111.73, 142.83, 115.42, 142.13, 119.05, 140.95, 122.55, 139.34, 125.88, 137.3,
      128.96, 134.88, 131.75, 132.11, 134.2, 129.05, 136.27, 125.75, 137.93, 122.25, 139.13,
      118.63, 139.86, 114.94, 140.1, 111.25, 139.86, 107.63, 139.14, 104.12, 137.97, 100.8, 136.36,
      97.7, 134.34, 94.9, 131.93, 92.44, 129.18, 90.36, 126.12, 88.72, 122.81, 87.51, 119.31,
      86.78, 115.69, 86.52, 112.01, 86.74, 108.32, 87.44, 104.69, 88.61, 101.18, 90.23, 97.86,
      92.27, 94.78, 94.69, 91.99, 97.45, 89.54, 100.51, 87.47, 103.82, 85.81, 107.31, 84.61,
      110.94, 83.88,
    ],
  ],
  // exp 04: 专注微眯眼
  focused: [
    [
      90.44, 99.25, 93.11, 99.26, 95.74, 99.79, 98.37, 100.3, 101, 100.82, 103.64, 101.33, 106.27,
      101.85, 108.9, 102.37, 111.53, 102.89, 114.16, 103.41, 116.79, 103.94, 119.42, 104.47,
      122.06, 105, 124.69, 105.53, 127.32, 106.06, 129.94, 106.6, 132.57, 107.14, 135.2, 107.68,
      137.65, 108.73, 139.5, 110.65, 140.44, 113.14, 140.36, 115.81, 139.35, 118.28, 137.48,
      120.18, 135, 121.14, 132.32, 121.11, 129.7, 120.56, 127.08, 120, 124.45, 119.46, 121.82,
      118.93, 119.19, 118.4, 116.56, 117.87, 113.93, 117.35, 111.29, 116.83, 108.66, 116.32,
      106.02, 115.82, 103.39, 115.31, 100.76, 114.79, 98.12, 114.28, 95.49, 113.75, 92.86, 113.22,
      90.23, 112.68, 87.77, 111.66, 85.93, 109.74, 85.01, 107.24, 85.06, 104.57, 86.07, 102.1,
      87.96, 100.22,
    ],
    [
      156.6, 112.56, 158.91, 112.66, 161.18, 113.15, 163.45, 113.64, 165.72, 114.13, 167.99,
      114.62, 170.26, 115.12, 172.53, 115.62, 174.8, 116.12, 177.07, 116.62, 179.34, 117.13, 181.6,
      117.64, 183.87, 118.15, 186.14, 118.67, 188.4, 119.18, 190.67, 119.7, 192.94, 120.2, 195.12,
      120.96, 196.7, 122.63, 197.45, 124.82, 197.53, 127.14, 197.07, 129.41, 196.08, 131.51,
      194.49, 133.18, 192.33, 133.97, 190.04, 133.68, 187.79, 133.09, 185.52, 132.57, 183.26,
      132.05, 180.99, 131.54, 178.72, 131.03, 176.45, 130.53, 174.18, 130.03, 171.91, 129.54,
      169.64, 129.05, 167.37, 128.56, 165.1, 128.07, 162.83, 127.58, 160.56, 127.08, 158.29,
      126.57, 156.02, 126.05, 153.9, 125.14, 152.26, 123.51, 151.32, 121.4, 151.08, 119.1, 151.53,
      116.82, 152.65, 114.8, 154.41, 113.31,
    ],
  ],
  // exp 08: 思考斜睨眼
  thinking: [
    [
      64.12, 83.43, 66.69, 84.08, 68.9, 85.53, 70.57, 87.6, 71.56, 90.05, 71.86, 92.69, 71.53,
      95.32, 70.55, 97.78, 69.06, 99.99, 67.36, 102.03, 65.64, 104.06, 63.95, 106.11, 62.28,
      108.18, 60.63, 110.27, 59, 112.38, 57.41, 114.5, 55.84, 116.65, 54.29, 118.82, 52.78, 121,
      51.31, 123.22, 49.86, 125.45, 48.42, 127.69, 46.67, 129.68, 44.36, 130.96, 41.73, 131.22,
      39.22, 130.38, 37.16, 128.72, 35.64, 126.55, 34.65, 124.08, 34.2, 121.46, 34.29, 118.81,
      34.94, 116.24, 36.12, 113.86, 37.54, 111.61, 39.04, 109.41, 40.54, 107.21, 42.06, 105.03,
      43.61, 102.87, 45.18, 100.73, 46.79, 98.6, 48.41, 96.5, 50.07, 94.42, 51.74, 92.35, 53.45,
      90.31, 55.17, 88.28, 56.94, 86.3, 59.04, 84.67, 61.48, 83.65,
    ],
    [
      104.23, 93.09, 106.97, 93.77, 109.4, 95.24, 111.32, 97.31, 112.59, 99.85, 113.4, 102.57,
      114.13, 105.32, 114.87, 108.06, 115.62, 110.8, 116.37, 113.54, 117.14, 116.28, 117.9, 119.02,
      118.67, 121.75, 119.45, 124.49, 120.23, 127.22, 121.03, 129.95, 121.83, 132.68, 122.6,
      135.41, 122.98, 138.22, 122.57, 141.02, 121.34, 143.57, 119.44, 145.67, 117.05, 147.19,
      114.34, 148.04, 111.51, 148.14, 108.77, 147.45, 106.33, 146.01, 104.38, 143.96, 103.07,
      141.44, 102.21, 138.73, 101.43, 136, 100.65, 133.27, 99.87, 130.53, 99.09, 127.8, 98.32,
      125.06, 97.55, 122.33, 96.79, 119.59, 96.04, 116.85, 95.28, 114.11, 94.53, 111.37, 93.79,
      108.62, 93.05, 105.88, 92.73, 103.07, 93.18, 100.27, 94.42, 97.72, 96.32, 95.62, 98.7, 94.08,
      101.4, 93.21,
    ],
  ],
  // exp 11: 兴奋雀跃眼
  excited: [
    [
      47.23, 91.05, 51.61, 92.47, 55.26, 95.29, 57.96, 99.03, 59.7, 103.31, 60.56, 107.85, 61.28,
      112.42, 62.11, 116.97, 63.06, 121.51, 64.11, 126.01, 65.28, 130.49, 66.56, 134.94, 67.95,
      139.35, 69.44, 143.73, 71.05, 148.07, 72.77, 152.37, 74.62, 156.61, 76.52, 160.83, 78.06,
      165.19, 78.52, 169.78, 77.62, 174.3, 75.2, 178.22, 71.44, 180.86, 66.96, 181.91, 62.36,
      181.55, 57.99, 180.06, 54.03, 177.68, 50.59, 174.58, 47.77, 170.92, 45.62, 166.83, 43.74,
      162.6, 41.96, 158.33, 40.29, 154.01, 38.72, 149.66, 37.27, 145.26, 35.93, 140.83, 34.69,
      136.37, 33.56, 131.88, 32.55, 127.37, 31.65, 122.83, 30.85, 118.27, 30.2, 113.69, 30.08,
      109.07, 30.85, 104.51, 32.49, 100.19, 35.01, 96.32, 38.44, 93.24, 42.64, 91.35,
    ],
    [
      108.93, 73.38, 113.76, 73.6, 118.38, 75.01, 122.49, 77.56, 125.82, 81.07, 128.1, 85.34,
      129.65, 89.93, 131.04, 94.58, 132.43, 99.22, 133.82, 103.87, 135.22, 108.51, 136.6, 113.16,
      137.99, 117.81, 139.36, 122.46, 140.73, 127.11, 142.13, 131.76, 143.51, 136.41, 144.82,
      141.08, 145.51, 145.86, 144.91, 150.66, 143.09, 155.14, 140.17, 158.99, 136.38, 162.01, 132,
      164.05, 127.26, 165.03, 122.42, 164.86, 117.79, 163.48, 113.67, 160.95, 110.36, 157.43,
      108.17, 153.11, 106.72, 148.49, 105.36, 143.83, 103.99, 139.18, 102.62, 134.53, 101.24,
      129.88, 99.87, 125.23, 98.48, 120.58, 97.09, 115.93, 95.7, 111.29, 94.29, 106.64, 92.89, 102,
      91.49, 97.36, 90.81, 92.57, 91.38, 87.77, 93.14, 83.26, 96.02, 79.37, 99.79, 76.34, 104.18,
      74.32,
    ],
  ],
  // exp 13: 慵懒睡眠眼
  sleepy: [
    [
      86.02, 131.33, 88.42, 131.69, 90.54, 132.87, 92.12, 134.71, 93.03, 136.97, 93.17, 139.39,
      92.41, 141.69, 90.78, 143.48, 88.59, 144.52, 86.19, 144.97, 83.78, 145.34, 81.37, 145.72,
      78.96, 146.09, 76.54, 146.45, 74.13, 146.81, 71.72, 147.16, 69.3, 147.5, 66.88, 147.84,
      64.47, 148.16, 62.05, 148.47, 59.62, 148.76, 57.2, 149.03, 54.77, 149.27, 52.34, 149.49,
      49.91, 149.68, 47.53, 149.28, 45.52, 147.92, 44.04, 145.99, 43.12, 143.74, 42.85, 141.32,
      43.44, 138.97, 45.04, 137.17, 47.33, 136.4, 49.76, 136.2, 52.19, 135.96, 54.62, 135.7, 57.04,
      135.43, 59.46, 135.15, 61.89, 134.85, 64.31, 134.54, 66.72, 134.22, 69.14, 133.89, 71.56,
      133.54, 73.97, 133.19, 76.38, 132.83, 78.79, 132.45, 81.2, 132.06, 83.61, 131.67,
    ],
    [
      153.42, 116.84, 155.92, 117.69, 157.78, 119.56, 158.72, 122.03, 158.73, 124.68, 157.84,
      127.18, 156.08, 129.15, 153.71, 130.33, 151.13, 131, 148.55, 131.65, 145.98, 132.32, 143.4,
      132.98, 140.82, 133.63, 138.23, 134.27, 135.65, 134.9, 133.06, 135.53, 130.47, 136.15,
      127.88, 136.76, 125.29, 137.36, 122.69, 137.94, 120.09, 138.51, 117.49, 139.06, 114.88,
      139.59, 112.27, 140.1, 109.62, 140.12, 107.17, 139.14, 105.28, 137.29, 104.18, 134.88,
      104.06, 132.23, 105.03, 129.78, 106.92, 127.93, 109.35, 126.87, 111.96, 126.34, 114.57,
      125.8, 117.17, 125.24, 119.77, 124.67, 122.37, 124.09, 124.96, 123.5, 127.56, 122.9, 130.15,
      122.29, 132.74, 121.68, 135.32, 121.05, 137.91, 120.41, 140.49, 119.76, 143.07, 119.11,
      145.65, 118.44, 148.22, 117.76, 150.78, 117.03,
    ],
  ],
  // exp 15: 骄傲自信眼
  proud: [
    [
      168.71, 85.67, 170.73, 86, 172.64, 86.75, 174.37, 87.85, 175.88, 89.24, 177.11, 90.88,
      178.04, 92.71, 178.71, 94.65, 179.21, 96.64, 179.64, 98.65, 180.05, 100.66, 180.45, 102.67,
      180.83, 104.69, 181.18, 106.71, 181.5, 108.74, 181.77, 110.78, 181.88, 112.82, 181.71,
      114.87, 181.22, 116.86, 180.41, 118.74, 179.27, 120.45, 177.83, 121.91, 176.12, 123.03,
      174.2, 123.74, 172.16, 123.99, 170.13, 123.75, 168.21, 123.04, 166.49, 121.93, 165.03,
      120.48, 163.88, 118.79, 163.02, 116.93, 162.49, 114.95, 162.17, 112.92, 161.85, 110.89,
      161.51, 108.87, 161.14, 106.84, 160.77, 104.83, 160.37, 102.81, 159.96, 100.8, 159.52, 98.79,
      159.24, 96.76, 159.3, 94.71, 159.71, 92.7, 160.48, 90.8, 161.58, 89.08, 163.01, 87.61,
      164.73, 86.49, 166.67, 85.83,
    ],
    [
      206.57, 78.24, 208.3, 78.8, 209.77, 79.87, 210.99, 81.22, 212.01, 82.73, 212.85, 84.34,
      213.53, 86.03, 214.08, 87.77, 214.54, 89.54, 214.95, 91.31, 215.34, 93.09, 215.7, 94.88,
      216.04, 96.67, 216.36, 98.46, 216.64, 100.26, 216.89, 102.07, 217.11, 103.88, 217.25, 105.7,
      217.26, 107.52, 217.1, 109.33, 216.75, 111.12, 216.16, 112.84, 215.3, 114.44, 214.04, 115.75,
      212.34, 116.35, 210.58, 115.96, 209.11, 114.89, 207.97, 113.48, 207.1, 111.88, 206.44,
      110.18, 205.97, 108.42, 205.62, 106.63, 205.35, 104.83, 205.11, 103.02, 204.85, 101.22,
      204.55, 99.42, 204.22, 97.63, 203.87, 95.84, 203.49, 94.05, 203.09, 92.28, 202.67, 90.5,
      202.32, 88.71, 202.1, 86.91, 202.1, 85.08, 202.32, 83.28, 202.77, 81.51, 203.54, 79.86,
      204.82, 78.59,
    ],
  ],
  // exp 17: 俏皮灵动眼
  playful: [
    [
      115.43, 87.59, 118.19, 88.24, 120.69, 89.59, 122.69, 91.59, 124.03, 94.09, 124.63, 96.87,
      124.41, 99.7, 123.7, 102.45, 122.9, 105.18, 122.12, 107.92, 121.34, 110.65, 120.57, 113.39,
      119.79, 116.13, 119.02, 118.87, 118.25, 121.61, 117.48, 124.35, 116.72, 127.09, 115.97,
      129.83, 115.23, 132.58, 114.45, 135.32, 113.3, 137.91, 111.49, 140.09, 109.13, 141.65,
      106.41, 142.48, 103.58, 142.56, 100.82, 141.91, 98.33, 140.54, 96.33, 138.53, 94.99, 136.03,
      94.38, 133.26, 94.57, 130.43, 95.25, 127.67, 96.02, 124.93, 96.79, 122.19, 97.55, 119.45,
      98.31, 116.7, 99.08, 113.96, 99.85, 111.22, 100.62, 108.49, 101.4, 105.75, 102.18, 103.01,
      102.95, 100.27, 103.74, 97.54, 104.51, 94.8, 105.68, 92.21, 107.5, 90.04, 109.88, 88.5,
      112.59, 87.67,
    ],
    [
      155.37, 78.64, 158.04, 79.15, 160.48, 80.37, 162.53, 82.16, 164.33, 84.22, 166.1, 86.3,
      167.85, 88.4, 169.58, 90.51, 171.29, 92.64, 172.98, 94.78, 174.65, 96.94, 176.3, 99.12,
      177.92, 101.32, 179.51, 103.54, 181.06, 105.79, 182.57, 108.07, 184.03, 110.37, 185.2,
      112.83, 185.77, 115.5, 185.73, 118.23, 185.07, 120.87, 183.8, 123.28, 181.94, 125.26, 179.57,
      126.6, 176.89, 127.03, 174.24, 126.43, 171.99, 124.92, 170.26, 122.8, 168.75, 120.53, 167.22,
      118.27, 165.66, 116.03, 164.07, 113.81, 162.45, 111.6, 160.82, 109.41, 159.16, 107.25,
      157.47, 105.1, 155.76, 102.97, 154.03, 100.85, 152.28, 98.76, 150.51, 96.68, 148.74, 94.6,
      147.29, 92.29, 146.49, 89.69, 146.36, 86.97, 146.94, 84.31, 148.23, 81.91, 150.19, 80.02,
      152.66, 78.89,
    ],
  ],
  // exp 21: 惊喜闪亮圆眼
  surprised: [
    [
      52.43, 111.88, 55.76, 112.3, 59, 113.21, 62.08, 114.57, 64.96, 116.3, 67.61, 118.36, 70.01,
      120.71, 72.16, 123.3, 74.02, 126.1, 75.61, 129.06, 76.9, 132.17, 77.89, 135.38, 78.56,
      138.68, 78.89, 142.02, 78.86, 145.39, 78.45, 148.72, 77.63, 151.98, 76.39, 155.11, 74.74,
      158.03, 72.67, 160.68, 70.2, 162.96, 67.38, 164.79, 64.28, 166.08, 61, 166.78, 57.64, 166.91,
      54.3, 166.49, 51.07, 165.57, 47.99, 164.22, 45.11, 162.49, 42.46, 160.42, 40.05, 158.07,
      37.91, 155.48, 36.04, 152.68, 34.46, 149.72, 33.16, 146.62, 32.17, 143.4, 31.51, 140.11,
      31.18, 136.76, 31.21, 133.4, 31.62, 130.06, 32.44, 126.8, 33.67, 123.68, 35.33, 120.75, 37.4,
      118.1, 39.86, 115.82, 42.68, 114, 45.79, 112.71, 49.07, 112.01,
    ],
    [
      126.89, 95.19, 130.56, 95.44, 134.16, 96.17, 137.64, 97.36, 140.94, 98.99, 143.98, 101.06,
      146.73, 103.5, 149.13, 106.29, 151.14, 109.37, 152.72, 112.69, 153.86, 116.19, 154.54, 119.8,
      154.74, 123.47, 154.45, 127.14, 153.67, 130.74, 152.43, 134.2, 150.76, 137.48, 148.69,
      140.51, 146.25, 143.27, 143.48, 145.69, 140.43, 147.75, 137.14, 149.39, 133.66, 150.59,
      130.06, 151.32, 126.39, 151.56, 122.72, 151.31, 119.11, 150.59, 115.63, 149.4, 112.34,
      147.76, 109.29, 145.7, 106.54, 143.22, 104.14, 140.47, 102.13, 137.39, 100.55, 134.07, 99.41, 130.57,
      98.73, 126.96, 98.53, 123.28, 98.83, 119.62, 99.6, 116.02, 100.84, 112.56, 102.51, 109.28,
      104.59, 106.25, 107.03, 103.49, 109.79, 101.07, 112.84, 99.01, 116.13, 97.36, 119.61, 96.16,
      123.22, 95.43,
    ],
  ],
  // exp 24: 害羞柔光眼
  shy: [
    [
      98.62, 121.53, 100.72, 121.6, 102.78, 122.03, 104.72, 122.83, 106.49, 123.97, 108.01, 125.42,
      109.24, 127.12, 110.15, 129.02, 110.66, 131.05, 110.78, 133.15, 110.62, 135.25, 110.34,
      137.33, 110.04, 139.42, 109.76, 141.5, 109.49, 143.59, 109.21, 145.68, 108.92, 147.76, 108.6,
      149.84, 108.08, 151.88, 107.18, 153.78, 105.92, 155.45, 104.34, 156.83, 102.51, 157.86,
      100.51, 158.52, 98.43, 158.81, 96.33, 158.72, 94.28, 158.27, 92.33, 157.47, 90.57, 156.33,
      89.03, 154.89, 87.78, 153.21, 86.85, 151.32, 86.29, 149.3, 86.13, 147.2, 86.28, 145.11,
      86.57, 143.02, 86.9, 140.94, 87.2, 138.86, 87.49, 136.78, 87.79, 134.69, 88.08, 132.61, 88.4,
      130.53, 88.96, 128.5, 89.88, 126.61, 91.15, 124.94, 92.73, 123.56, 94.56, 122.52, 96.54,
      121.84,
    ],
    [
      155.31, 127.29, 157.36, 127.43, 159.33, 127.99, 161.14, 128.96, 162.7, 130.29, 163.95,
      131.92, 164.84, 133.77, 165.35, 135.75, 165.49, 137.8, 165.35, 139.85, 165.07, 141.89,
      164.79, 143.92, 164.53, 145.96, 164.26, 148, 163.97, 150.04, 163.65, 152.06, 163.27, 154.09,
      162.7, 156.06, 161.83, 157.92, 160.68, 159.62, 159.29, 161.13, 157.69, 162.41, 155.9, 163.42,
      153.97, 164.1, 151.94, 164.41, 149.89, 164.32, 147.9, 163.82, 146.06, 162.92, 144.47, 161.62,
      143.24, 159.98, 142.41, 158.1, 142, 156.09, 142.01, 154.04, 142.32, 152.01, 142.64, 149.98,
      142.96, 147.95, 143.25, 145.92, 143.51, 143.88, 143.73, 141.83, 143.97, 139.79, 144.27,
      137.76, 144.74, 135.76, 145.53, 133.87, 146.62, 132.13, 147.98, 130.59, 149.57, 129.28,
      151.35, 128.27, 153.28, 127.58,
    ],
  ],
};

export const GROK_EXPRESSIONS: Record<
  GrokExpressionId,
  readonly [readonly (readonly [number, number])[], readonly (readonly [number, number])[]]
> = {
  neutral: [flatToPairs(RAW_EXPRESSION_FLATS.neutral[0]), flatToPairs(RAW_EXPRESSION_FLATS.neutral[1])],
  listening: [flatToPairs(RAW_EXPRESSION_FLATS.listening[0]), flatToPairs(RAW_EXPRESSION_FLATS.listening[1])],
  happy: [flatToPairs(RAW_EXPRESSION_FLATS.happy[0]), flatToPairs(RAW_EXPRESSION_FLATS.happy[1])],
  curious: [flatToPairs(RAW_EXPRESSION_FLATS.curious[0]), flatToPairs(RAW_EXPRESSION_FLATS.curious[1])],
  focused: [flatToPairs(RAW_EXPRESSION_FLATS.focused[0]), flatToPairs(RAW_EXPRESSION_FLATS.focused[1])],
  thinking: [flatToPairs(RAW_EXPRESSION_FLATS.thinking[0]), flatToPairs(RAW_EXPRESSION_FLATS.thinking[1])],
  excited: [flatToPairs(RAW_EXPRESSION_FLATS.excited[0]), flatToPairs(RAW_EXPRESSION_FLATS.excited[1])],
  sleepy: [flatToPairs(RAW_EXPRESSION_FLATS.sleepy[0]), flatToPairs(RAW_EXPRESSION_FLATS.sleepy[1])],
  proud: [flatToPairs(RAW_EXPRESSION_FLATS.proud[0]), flatToPairs(RAW_EXPRESSION_FLATS.proud[1])],
  playful: [flatToPairs(RAW_EXPRESSION_FLATS.playful[0]), flatToPairs(RAW_EXPRESSION_FLATS.playful[1])],
  surprised: [flatToPairs(RAW_EXPRESSION_FLATS.surprised[0]), flatToPairs(RAW_EXPRESSION_FLATS.surprised[1])],
  shy: [flatToPairs(RAW_EXPRESSION_FLATS.shy[0]), flatToPairs(RAW_EXPRESSION_FLATS.shy[1])],
};

export interface StateRecipe {
  state: DinoState;
  expressions: readonly GrokExpressionId[];
  defaultShape?: GrokShapeId;
  morphEffect: GrokMorphEffect;
  bobAmpY: number;
  bobFreq: number;
  swayAmpX: number;
  swayFreq: number;
  tiltAmpRad: number;
  tiltFreq: number;
  turnAmpRad: number;
  turnFreq: number;
  blushOpacity: number;
  eyeScaleTarget: number;
}

export const STATE_RECIPES: Record<DinoState, StateRecipe> = {
  idle: {
    state: "idle",
    expressions: ["neutral", "listening", "playful"],
    morphEffect: "none",
    bobAmpY: 3.4,
    bobFreq: 2.2,
    swayAmpX: 1.8,
    swayFreq: 1.4,
    tiltAmpRad: 0.045,
    tiltFreq: 1.6,
    turnAmpRad: 0.08,
    turnFreq: 0.9,
    blushOpacity: 0.55,
    eyeScaleTarget: 1.0,
  },
  walk: {
    state: "walk",
    expressions: ["listening", "curious", "playful"],
    morphEffect: "none",
    bobAmpY: 6.2,
    bobFreq: 4.8,
    swayAmpX: 5.5,
    swayFreq: 2.4,
    tiltAmpRad: 0.09,
    tiltFreq: 2.4,
    turnAmpRad: 0.34,
    turnFreq: 1.8,
    blushOpacity: 0.62,
    eyeScaleTarget: 1.04,
  },
  run: {
    state: "run",
    expressions: ["excited", "focused", "proud"],
    morphEffect: "orbit",
    bobAmpY: 8.5,
    bobFreq: 7.2,
    swayAmpX: 7.4,
    swayFreq: 3.6,
    tiltAmpRad: 0.14,
    tiltFreq: 3.6,
    turnAmpRad: 0.42,
    turnFreq: 2.6,
    blushOpacity: 0.72,
    eyeScaleTarget: 1.08,
  },
  work: {
    state: "work",
    expressions: ["focused", "thinking", "listening"],
    morphEffect: "dots",
    bobAmpY: 3.8,
    bobFreq: 3.6,
    swayAmpX: 2.4,
    swayFreq: 2.1,
    tiltAmpRad: 0.07,
    tiltFreq: 2.2,
    turnAmpRad: 0.18,
    turnFreq: 1.4,
    blushOpacity: 0.48,
    eyeScaleTarget: 0.96,
  },
  emote: {
    state: "emote",
    expressions: ["happy", "shy", "playful"],
    morphEffect: "sparkle",
    bobAmpY: 5.2,
    bobFreq: 3.4,
    swayAmpX: 3.8,
    swayFreq: 2.2,
    tiltAmpRad: 0.12,
    tiltFreq: 2.2,
    turnAmpRad: 0.22,
    turnFreq: 1.5,
    blushOpacity: 0.92,
    eyeScaleTarget: 1.06,
  },
  react: {
    state: "react",
    expressions: ["curious", "surprised", "listening"],
    morphEffect: "radar",
    bobAmpY: 4.6,
    bobFreq: 3.2,
    swayAmpX: 4.2,
    swayFreq: 2.5,
    tiltAmpRad: 0.13,
    tiltFreq: 2.0,
    turnAmpRad: 0.38,
    turnFreq: 2.1,
    blushOpacity: 0.68,
    eyeScaleTarget: 1.12,
  },
  action: {
    state: "action",
    expressions: ["excited", "happy", "surprised"],
    morphEffect: "sparkle",
    bobAmpY: 7.8,
    bobFreq: 5.4,
    swayAmpX: 4.8,
    swayFreq: 2.8,
    tiltAmpRad: 0.14,
    tiltFreq: 2.8,
    turnAmpRad: 0.28,
    turnFreq: 2.0,
    blushOpacity: 0.88,
    eyeScaleTarget: 1.08,
  },
  meme: {
    state: "meme",
    expressions: ["proud", "excited", "playful"],
    morphEffect: "orbit",
    bobAmpY: 5.6,
    bobFreq: 4.0,
    swayAmpX: 4.0,
    swayFreq: 2.4,
    tiltAmpRad: 0.11,
    tiltFreq: 2.4,
    turnAmpRad: 0.32,
    turnFreq: 1.8,
    blushOpacity: 0.85,
    eyeScaleTarget: 1.05,
  },
};

export interface ProjectedEyeFrame {
  d: string;
  centerX: number;
  centerY: number;
  finalX: number;
  finalY: number;
  scaleX: number;
  scaleY: number;
  visible: boolean;
  highlightX: number;
  highlightY: number;
  highlightR: number;
}

/**
 * 球面经度眼睛投影（与 GrokBot svg-renderer.js / geometry.ts 一致）
 */
export function projectEyeOnSphere(params: {
  ring: readonly (readonly [number, number])[];
  shapeRing: readonly (readonly [number, number])[];
  turnAngle: number;
  gazeX: number;
  gazeY: number;
  eyeOpen: number;
  eyeScale: number;
  pulse: number;
}): ProjectedEyeFrame {
  const { ring, shapeRing, turnAngle, gazeX, gazeY, eyeOpen, eyeScale, pulse } = params;
  const [centerX, centerY] = centroid(ring);
  const top = Math.min(...shapeRing.map((p) => p[1]));
  const bottom = Math.max(...shapeRing.map((p) => p[1]));

  const sampleY = clamp(centerY + gazeY, top + 14, bottom - 14);
  const [left, right] = spanAt(shapeRing, sampleY);
  const radius = Math.max((right - left) / 2, 16);
  const localCenter = (left + right) / 2;

  // 将眼睛中心移到更贴合兔兔龙面部的黄金象限（微调使双眼在正面与侧转时都自然灵动）
  const rawOffsetX = (centerX - HEAD_C) * 0.82;
  let offsetX = rawOffsetX;
  let perspectiveX = 1;
  let visible = true;
  let perspectiveFade = 1;

  if (Math.abs(turnAngle) > 0.001) {
    const initial = Math.asin(clamp(rawOffsetX / radius, -0.96, 0.96));
    const turned = initial + turnAngle;
    const cosine = Math.cos(turned);
    const baseCosine = Math.max(Math.cos(initial), 0.08);
    visible = cosine > 0.03;
    perspectiveX = clamp(Math.max(cosine, 0.02) / baseCosine, 0.05, 1.35);
    offsetX = radius * Math.sin(turned);
    perspectiveFade = smoothstep(0, 0.48, cosine);
  }

  const scaleX = clamp(perspectiveX * eyeScale * pulse * 0.92, 0.04, 2.2);
  const scaleY = clamp(Math.max(eyeOpen, 0.05) * eyeScale * pulse * 0.92, 0.04, 2.2);

  const desiredX = localCenter + offsetX + gazeX;
  const safeLeft = left + 16 * scaleX;
  const safeRight = right - 16 * scaleX;
  const boundedX =
    safeLeft <= safeRight ? clamp(desiredX, safeLeft, safeRight) : (safeLeft + safeRight) / 2;
  const finalX = boundedX + (desiredX - boundedX) * (1 - perspectiveFade);
  const finalY = clamp(centerY * 0.86 + 18 + gazeY, top + 18, bottom - 22);

  return {
    d: ringPath(ring),
    centerX,
    centerY,
    finalX,
    finalY,
    scaleX,
    scaleY,
    visible,
    highlightX: finalX - 3.2 * scaleX + clamp(gazeX * 0.18, -3, 3),
    highlightY: finalY - 4.2 * scaleY + clamp(gazeY * 0.18, -3, 3),
    highlightR: Math.max(1.4, 3.4 * Math.min(scaleX, scaleY)),
  };
}
