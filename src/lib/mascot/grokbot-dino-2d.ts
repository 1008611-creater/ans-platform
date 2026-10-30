import type { DinoState } from "./atlas";

/**
 * GrokBot × ANS 兔兔龙 (V4.6 定稿造型) 2D 阻尼弹簧与球面眼交互引擎
 * ----------------------------------------------------------------------------
 * 1. 造型 100% 严格对齐用户确认的 V4.6 兔兔龙定稿（`public/mascot/ans-mascot.png` &
 *    `ClaudeAnimationBase/src/ans_chars.js` 的 `curvyStandingDinoPts`）：
 *    - #9BE0C5 薄荷绿宽圆大脑门与饱满婴儿肥脸颊（rx = 4.88u）
 *    - 宽厚圆滚身体（rx = 4.82u）+ 短粗有弧度的小胖短腿与圆肉脚掌
 *    - 头顶偏右后方 3 个无缝圆润背棘凸起（底部开放无黑线，与额头底色融为一体）
 *    - 标志性双奶白分区（#FFFDF6 宽横下脸颊贴片 + 圆肚皮贴片 + #EFE3C6 底部暖色月牙暗部）
 *    - 肩部无缝融入的圆润小胖手（±4.38u, -4.55u）与低位胯部上翘摇摆小尾巴
 *    - 坐落在奶白下脸颊贴片上沿的圆润黑亮大眼睛（双高光点）+ 粉嫩腮红 + ω 猫咪微笑嘴
 * 2. 动效内核融合 GitHub 开源 GrokBot 动效库（`iduu/grokbot-animation`、`nasawz/GrokBot`、
 *    `Coiggahou2002/grokbot-web`）：
 *    - 120Hz 固定步长半隐式欧拉二阶阻尼弹簧求解器（`stepSpring`）
 *    - 球面经度透视投影（`projectFeatureOnSphere`，转头时五官、肚皮、背棘产生真实 3D 球面视差与远端眼透视收缩）
 *    - 双眸异步指数平滑追光 + 48 点平滑眼睛轮廓插值（圆亮大眼 / 弯弯笑眼 / 星星闪耀眼 / 专注微眯眼 / 好奇大小眼 / 慵懒睡眠眼）
 */

export const HEAD_C = 120;
export const VIEWBOX_MIN = 0;
export const VIEWBOX_SPAN = 240;
export const FIXED_STEP = 1 / 120;

/** V4.6 基准比例尺：脚底中心锚定在 (120, 212)，1u = 16px */
export const DINO_U = 16;
export const DINO_BASE_X = 120;
export const DINO_BASE_Y = 212;

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

export interface SpeciesPalette2D {
  id: string;
  bodyStart: string;
  bodyMid: string;
  bodyEnd: string;
  rimLight: string;
  inkColor: string;
  bellyFill: string;
  bellyShadow: string;
  earInner: string;
  crestFill: string;
  eyeColor: string;
  eyeHighlight: string;
  cheekColor: string;
  accentGlow: string;
  badgeColor: string;
}

export const SPECIES_PALETTES: Record<string, SpeciesPalette2D> = {
  mint_star: {
    id: "mint_star",
    bodyStart: "#C2F7E1",
    bodyMid: "#9BE0C5",
    bodyEnd: "#6BCBA5",
    rimLight: "#E6FFF5",
    inkColor: "#18263A",
    bellyFill: "#FFFDF6",
    bellyShadow: "#EFE3C6",
    earInner: "#FF9EB5",
    crestFill: "#8AD8B9",
    eyeColor: "#142033",
    eyeHighlight: "#FFFFFF",
    cheekColor: "#FF8FA3",
    accentGlow: "#34D399",
    badgeColor: "#FBBF24",
  },
  cyber_gold: {
    id: "cyber_gold",
    bodyStart: "#FFF0AD",
    bodyMid: "#FCD34D",
    bodyEnd: "#F59E0B",
    rimLight: "#FFFBEB",
    inkColor: "#291D0E",
    bellyFill: "#FFFDF7",
    bellyShadow: "#F3E1B6",
    earInner: "#FB7185",
    crestFill: "#FBBF24",
    eyeColor: "#1E160C",
    eyeHighlight: "#FFFFFF",
    cheekColor: "#FB7185",
    accentGlow: "#F59E0B",
    badgeColor: "#38BDF8",
  },
  sakura_mochi: {
    id: "sakura_mochi",
    bodyStart: "#FFE0EC",
    bodyMid: "#FFB8D2",
    bodyEnd: "#F48FB1",
    rimLight: "#FFF5F8",
    inkColor: "#2C1826",
    bellyFill: "#FFFDF9",
    bellyShadow: "#F5DCE5",
    earInner: "#FDA4AF",
    crestFill: "#FAA2C1",
    eyeColor: "#241320",
    eyeHighlight: "#FFFFFF",
    cheekColor: "#FF6B9D",
    accentGlow: "#F472B6",
    badgeColor: "#FDE047",
  },
  aurora_ice: {
    id: "aurora_ice",
    bodyStart: "#DDF7FF",
    bodyMid: "#93E1FA",
    bodyEnd: "#56C2E8",
    rimLight: "#F0FBFF",
    inkColor: "#15263B",
    bellyFill: "#F8FDFF",
    bellyShadow: "#D8ECF7",
    earInner: "#C084FC",
    crestFill: "#7DD3FC",
    eyeColor: "#122033",
    eyeHighlight: "#FFFFFF",
    cheekColor: "#F472B6",
    accentGlow: "#38BDF8",
    badgeColor: "#A78BFA",
  },
};

export function getSpeciesPalette(speciesId?: string): SpeciesPalette2D {
  if (speciesId && SPECIES_PALETTES[speciesId]) {
    return SPECIES_PALETTES[speciesId];
  }
  return SPECIES_PALETTES.mint_star;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1), 0, 1);
  return t * t * (3 - 2 * t);
}

export function createSpring(initial: number): DampedSpring {
  return { x: initial, v: 0, target: initial };
}

/**
 * 120Hz 固定步长半隐式欧拉阻尼弹簧积分器（与 GrokBot 引擎一致）
 */
export function stepSpring(
  spring: DampedSpring,
  freqHz: number,
  damping: number,
  dt: number,
): void {
  const omega = freqHz * Math.PI * 2;
  let remaining = clamp(dt, 0, 0.1);
  while (remaining > 1e-6) {
    const step = Math.min(FIXED_STEP, remaining);
    spring.v +=
      (-omega * omega * (spring.x - spring.target) - 2 * damping * omega * spring.v) *
      step;
    spring.x += spring.v * step;
    remaining -= step;
  }
}

/**
 * 将闭合点环转换为三阶 Catmull-Rom 贝塞尔平滑 SVG 路径
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

/**
 * 将开放点序列转换为三阶 Catmull-Rom 贝塞尔开放描边路径（用于头顶 3 个无缝圆凸起与无缝小胖手）
 */
export function openOutline(pts: readonly (readonly [number, number])[]): string {
  const round = (val: number) => Math.round(val * 100) / 100;
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${round(pts[0][0])} ${round(pts[0][1])}`;
  let path = `M${round(pts[0][0])} ${round(pts[0][1])}`;
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const c1x = round(p1[0] + (p2[0] - p0[0]) / 6);
    const c1y = round(p1[1] + (p2[1] - p0[1]) / 6);
    const c2x = round(p2[0] - (p3[0] - p1[0]) / 6);
    const c2y = round(p2[1] - (p3[1] - p1[1]) / 6);
    path += `C${c1x} ${c1y} ${c2x} ${c2y} ${round(p2[0])} ${round(p2[1])}`;
  }
  return path;
}

/**
 * 生成开放圆弧点列（与 `ans_chars.js` 的 `arcContourPts` 一致）
 */
export function arcContourPts(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  a0: number,
  a1: number,
  steps = 12,
  rot = 0,
): [number, number][] {
  const pts: [number, number][] = [];
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i <= steps; i += 1) {
    const a = a0 + (a1 - a0) * (i / steps);
    const lx = Math.cos(a) * rx;
    const ly = Math.sin(a) * ry;
    pts.push([cx + lx * c - ly * s, cy + lx * s + ly * c]);
  }
  return pts;
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
    Number.isFinite(left) ? left : HEAD_C - 76,
    Number.isFinite(right) ? right : HEAD_C + 76,
  ];
}

/**
 * 1:1 移植 `ClaudeAnimationBase/src/ans_chars.js` 的 `curvyStandingDinoPts`（28 个关键控制点）
 * 支持步态相位 `walkPhase`、宽度缩放 `wScale`、身体蹲坐量 `crouch` 等姿态变形，始终保持纯正兔兔龙造型！
 */
export function buildV46StandingDinoRing(options?: {
  walkPhase?: number | null;
  wScale?: number;
  headSquash?: number;
  legShorten?: number;
  cheekPuff?: number;
}): readonly (readonly [number, number])[] {
  const walk = options?.walkPhase ?? null;
  const wScale = options?.wScale ?? 1.0;
  const headSquash = options?.headSquash ?? 0;
  const legShorten = options?.legShorten ?? 0;
  const cheekPuff = options?.cheekPuff ?? 0;

  let liftL = 0;
  let liftR = 0;
  let shiftL = 0;
  let shiftR = 0;
  if (walk !== null) {
    const phL = walk * Math.PI * 2;
    const phR = (walk + 0.5) * Math.PI * 2;
    shiftL = Math.sin(phL) * 0.34;
    liftL = -Math.max(0, Math.cos(phL)) * 0.48;
    shiftR = Math.sin(phR) * 0.34;
    liftR = -Math.max(0, Math.cos(phR)) * 0.48;
  }

  const raw: [number, number][] = [
    // 1. 宽圆饱满的大脑门 (Wide, round cute baby-head dome, matching ans-mascot.png)
    [0.0, -10.35 + headSquash * 0.45],
    [2.45 * wScale, -10.02 + headSquash * 0.4],
    [4.08 * wScale, -8.88 + headSquash * 0.3],
    // 2. 饱满宽胖婴儿肥脸颊 (rx=4.86u) + 脸颊与肩膀之间的俏皮微收颈窝 (y=-4.85u)
    [(4.78 + cheekPuff) * wScale, -7.35 + headSquash * 0.2],
    [(4.88 + cheekPuff) * wScale, -5.95 + headSquash * 0.15],
    [(4.42 + cheekPuff * 0.5) * wScale, -4.85],
    // 3. 宽厚圆滚滚的胖身体 (rx=4.76u)
    [(4.72 + cheekPuff * 0.7) * wScale, -3.75],
    [(4.62 + cheekPuff * 0.6) * wScale, -2.55],
    // 4. 右侧圆润小胖腿弧度 + 圆肉脚掌 (matching ans-mascot.png bottom legs)
    [(4.05 + shiftR * 0.3) * wScale, -1.65 + liftR * 0.25],
    [(3.22 + shiftR * 0.6) * wScale, -0.95 + liftR * 0.55 + legShorten * 0.35],
    [(2.88 + shiftR) * wScale, -0.18 + liftR + legShorten * 0.45],
    [(2.45 + shiftR) * wScale, 0.08 + liftR + legShorten * 0.4],
    [(1.28 + shiftR) * wScale, 0.08 + liftR + legShorten * 0.4],
    [(0.95 + shiftR) * wScale, -0.32 + liftR + legShorten * 0.45],
    // 5. 低位圆肚底弧 (-0.88u，与奶白肚皮下沿自然贴合)
    [(0.82 + shiftR * 0.4) * wScale, -0.78 + liftR * 0.4 + legShorten * 0.38],
    [0.0, -0.88 + legShorten * 0.35],
    // 6. 左侧短粗圆润小胖腿与圆肉脚掌
    [(-0.82 + shiftL * 0.4) * wScale, -0.78 + liftL * 0.4 + legShorten * 0.38],
    [(-0.95 + shiftL) * wScale, -0.32 + liftL + legShorten * 0.45],
    [(-1.28 + shiftL) * wScale, 0.08 + liftL + legShorten * 0.4],
    [(-2.45 + shiftL) * wScale, 0.08 + liftL + legShorten * 0.4],
    [(-2.88 + shiftL) * wScale, -0.18 + liftL + legShorten * 0.45],
    [(-3.22 + shiftL * 0.6) * wScale, -0.95 + liftL * 0.55 + legShorten * 0.35],
    [(-4.05 + shiftL * 0.3) * wScale, -1.65 + liftL * 0.25],
    // 7. 左侧宽厚胖身体 + 颈窝微收 + 婴儿肥脸颊
    [(-4.62 - cheekPuff * 0.6) * wScale, -2.55],
    [(-4.72 - cheekPuff * 0.7) * wScale, -3.75],
    [(-4.42 - cheekPuff * 0.5) * wScale, -4.85],
    [(-4.88 - cheekPuff) * wScale, -5.95 + headSquash * 0.15],
    [(-4.78 - cheekPuff) * wScale, -7.35 + headSquash * 0.2],
    [-4.08 * wScale, -8.88 + headSquash * 0.3],
    [-2.45 * wScale, -10.02 + headSquash * 0.4],
  ];

  return raw.map(([px, py]) => [DINO_BASE_X + px * DINO_U, DINO_BASE_Y + py * DINO_U]);
}

/**
 * 6 种保持纯正兔兔龙 Q 萌造型的姿态轮廓（全部基于 V4.6 `curvyStandingDinoPts` 30 点同拓扑插值）
 */
export const GROK_SHAPE_RINGS: Record<GrokShapeId, readonly (readonly [number, number])[]> = {
  tutulong: buildV46StandingDinoRing({ wScale: 1.0, headSquash: 0, legShorten: 0, cheekPuff: 0 }),
  blob: buildV46StandingDinoRing({ wScale: 1.05, headSquash: 0.38, legShorten: 0.45, cheekPuff: 0.22 }),
  squircle: buildV46StandingDinoRing({ wScale: 0.98, headSquash: -0.18, legShorten: -0.1, cheekPuff: 0.08 }),
  cloud: buildV46StandingDinoRing({ wScale: 1.08, headSquash: 0.62, legShorten: 0.72, cheekPuff: 0.32 }),
  crystal: buildV46StandingDinoRing({ wScale: 0.96, headSquash: 0.12, legShorten: 0.15, cheekPuff: 0.05 }),
  star: buildV46StandingDinoRing({ wScale: 1.02, headSquash: -0.25, legShorten: -0.18, cheekPuff: 0.15 }),
};

export const GROK_SHAPE_META: readonly {
  id: GrokShapeId;
  icon: string;
  labelZh: string;
  labelEn: string;
  armLiftL: number;
  armLiftR: number;
}[] = [
  { id: "tutulong", icon: "🦖", labelZh: "标准萌姿", labelEn: "Standard Pose", armLiftL: 0.04, armLiftR: 0.04 },
  { id: "blob", icon: "🫧", labelZh: "软糯团子", labelEn: "Mochi Sit", armLiftL: 0.0, armLiftR: 0.0 },
  { id: "squircle", icon: "🙌", labelZh: "举手欢呼", labelEn: "Cheer Up", armLiftL: 1.08, armLiftR: 1.08 },
  { id: "cloud", icon: "☁️", labelZh: "趴趴小憩", labelEn: "Cozy Loaf", armLiftL: -0.04, armLiftR: -0.04 },
  { id: "crystal", icon: "💻", labelZh: "极客专注", labelEn: "Geek Focus", armLiftL: 0.36, armLiftR: 0.42 },
  { id: "star", icon: "⭐", labelZh: "闪耀跳跃", labelEn: "Star Jump", armLiftL: 1.18, armLiftR: 1.18 },
];

/**
 * 构建 48 点闭合眼睛轮廓：以兔兔龙标志性的圆润黑亮大眼睛（±1.88u, -7.35u -> cx = 89.92 / 150.08, cy = 94.40）为基准，
 * 生成 12 种支持 GrokBot 弹簧无缝插值（`lerpRing`）的 Q 萌表情眼型！
 */
function buildKawaiiEyePair(
  shapeFn: (side: -1 | 1, theta: number) => [number, number],
  count = 48,
): readonly [readonly (readonly [number, number])[], readonly (readonly [number, number])[]] {
  const buildOne = (side: -1 | 1) => {
    const cx = DINO_BASE_X + side * 1.88 * DINO_U; // 89.92 & 150.08
    const cy = DINO_BASE_Y - 7.35 * DINO_U; // 94.40
    return Array.from({ length: count }, (_, idx) => {
      const theta = (idx / count) * Math.PI * 2;
      const [dx, dy] = shapeFn(side, theta);
      return [cx + dx, cy + dy] as const;
    });
  };
  return [buildOne(-1), buildOne(1)];
}

export const GROK_EXPRESSIONS: Record<
  GrokExpressionId,
  readonly [readonly (readonly [number, number])[], readonly (readonly [number, number])[]]
> = {
  // 1. 经典圆润黑亮萌眼 (还原 ans-mascot.png 的圆黑豆豆眼 rx=9.6, ry=10.4)
  neutral: buildKawaiiEyePair((_side, theta) => [
    Math.cos(theta) * 9.6,
    Math.sin(theta) * 10.4,
  ]),
  // 2. 倾听专注微亮大眼
  listening: buildKawaiiEyePair((_side, theta) => [
    Math.cos(theta) * 10.2,
    Math.sin(theta) * 11.0,
  ]),
  // 3. 开心弯弯笑眼 (还原 dino-atlas.png 欢呼/开心时的上弯月牙笑眼 ^ ^：中心 x=0 处 sin²θ=1 向上高拱，两端 x=±R 向下弯)
  happy: buildKawaiiEyePair((_side, theta) => {
    const x = Math.cos(theta) * 10.6;
    const arch = (0.35 - Math.sin(theta) * Math.sin(theta)) * 7.2;
    const y = Math.sin(theta) * 3.1 + arch;
    return [x, y];
  }),
  // 4. 好奇灵动大小眼 (左眼圆大、右眼微大，充满好奇感)
  curious: buildKawaiiEyePair((side, theta) => {
    const rMul = side < 0 ? 1.15 : 0.96;
    return [Math.cos(theta) * 10.0 * rMul, Math.sin(theta) * 10.8 * rMul];
  }),
  // 5. 搬砖极客专注眼 (上眼睑微平的认真眼神)
  focused: buildKawaiiEyePair((side, theta) => {
    const rawY = Math.sin(theta) * 9.6;
    const topClip = rawY < -3.5 ? -3.5 + (rawY + 3.5) * 0.35 - side * Math.cos(theta) * 1.1 : rawY;
    return [Math.cos(theta) * 9.8, topClip];
  }),
  // 6. 思考向上凝视萌眼
  thinking: buildKawaiiEyePair((_side, theta) => [
    Math.cos(theta) * 9.6,
    Math.sin(theta) * 10.0 - 1.4,
  ]),
  // 7. 兴奋星光大圆眼
  excited: buildKawaiiEyePair((_side, theta) => [
    Math.cos(theta) * 11.2,
    Math.sin(theta) * 12.0,
  ]),
  // 8. 慵懒睡眠半眯眼
  sleepy: buildKawaiiEyePair((_side, theta) => [
    Math.cos(theta) * 10.0,
    Math.sin(theta) * 2.2 + 1.8,
  ]),
  // 9. 骄傲神气笑弧眼 (^ ^)
  proud: buildKawaiiEyePair((_side, theta) => {
    const x = Math.cos(theta) * 10.4;
    const arch = (0.35 - Math.sin(theta) * Math.sin(theta)) * 6.5;
    return [x, Math.sin(theta) * 3.2 + arch];
  }),
  // 10. 俏皮灵动眼 (左眼圆亮、右眼上弯笑弧 Wink)
  playful: buildKawaiiEyePair((side, theta) => {
    if (side > 0) {
      const x = Math.cos(theta) * 10.2;
      const arch = (0.35 - Math.sin(theta) * Math.sin(theta)) * 6.8;
      return [x, Math.sin(theta) * 3.0 + arch];
    }
    return [Math.cos(theta) * 10.2, Math.sin(theta) * 11.0];
  }),
  // 11. 吃瓜惊喜大圆眼
  surprised: buildKawaiiEyePair((_side, theta) => [
    Math.cos(theta) * 11.4,
    Math.sin(theta) * 12.2,
  ]),
  // 12. 害羞柔光笑眼 (^ ^)
  shy: buildKawaiiEyePair((_side, theta) => {
    const x = Math.cos(theta) * 9.8;
    const arch = (0.35 - Math.sin(theta) * Math.sin(theta)) * 5.8;
    return [x, Math.sin(theta) * 3.5 + arch];
  }),
};

export interface StateRecipe {
  state: DinoState;
  expressions: readonly GrokExpressionId[];
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
  walkSpeed: number;
  armWaveAmp: number;
}

export const STATE_RECIPES: Record<DinoState, StateRecipe> = {
  idle: {
    state: "idle",
    expressions: ["neutral", "listening", "playful"],
    morphEffect: "none",
    bobAmpY: 2.8,
    bobFreq: 2.2,
    swayAmpX: 1.4,
    swayFreq: 1.4,
    tiltAmpRad: 0.035,
    tiltFreq: 1.5,
    turnAmpRad: 0.08,
    turnFreq: 0.9,
    blushOpacity: 0.72,
    eyeScaleTarget: 1.0,
    walkSpeed: 0,
    armWaveAmp: 0.08,
  },
  walk: {
    state: "walk",
    expressions: ["listening", "curious", "neutral"],
    morphEffect: "none",
    bobAmpY: 5.2,
    bobFreq: 4.8,
    swayAmpX: 4.2,
    swayFreq: 2.4,
    tiltAmpRad: 0.065,
    tiltFreq: 2.4,
    turnAmpRad: 0.26,
    turnFreq: 1.6,
    blushOpacity: 0.75,
    eyeScaleTarget: 1.02,
    walkSpeed: 1.8,
    armWaveAmp: 0.35,
  },
  run: {
    state: "run",
    expressions: ["excited", "focused", "happy"],
    morphEffect: "orbit",
    bobAmpY: 7.4,
    bobFreq: 7.2,
    swayAmpX: 6.0,
    swayFreq: 3.6,
    tiltAmpRad: 0.1,
    tiltFreq: 3.6,
    turnAmpRad: 0.32,
    turnFreq: 2.4,
    blushOpacity: 0.82,
    eyeScaleTarget: 1.06,
    walkSpeed: 3.4,
    armWaveAmp: 0.65,
  },
  work: {
    state: "work",
    expressions: ["focused", "thinking", "listening"],
    morphEffect: "dots",
    bobAmpY: 3.2,
    bobFreq: 3.8,
    swayAmpX: 2.0,
    swayFreq: 2.0,
    tiltAmpRad: 0.05,
    tiltFreq: 2.2,
    turnAmpRad: 0.15,
    turnFreq: 1.3,
    blushOpacity: 0.65,
    eyeScaleTarget: 0.98,
    walkSpeed: 0,
    armWaveAmp: 0.48,
  },
  emote: {
    state: "emote",
    expressions: ["happy", "playful", "shy"],
    morphEffect: "sparkle",
    bobAmpY: 4.6,
    bobFreq: 3.4,
    swayAmpX: 3.2,
    swayFreq: 2.0,
    tiltAmpRad: 0.09,
    tiltFreq: 2.0,
    turnAmpRad: 0.2,
    turnFreq: 1.4,
    blushOpacity: 0.95,
    eyeScaleTarget: 1.04,
    walkSpeed: 0,
    armWaveAmp: 0.42,
  },
  react: {
    state: "react",
    expressions: ["curious", "surprised", "listening"],
    morphEffect: "radar",
    bobAmpY: 4.0,
    bobFreq: 3.2,
    swayAmpX: 3.5,
    swayFreq: 2.2,
    tiltAmpRad: 0.1,
    tiltFreq: 1.9,
    turnAmpRad: 0.3,
    turnFreq: 1.8,
    blushOpacity: 0.78,
    eyeScaleTarget: 1.08,
    walkSpeed: 0,
    armWaveAmp: 0.28,
  },
  action: {
    state: "action",
    expressions: ["happy", "excited", "playful"],
    morphEffect: "sparkle",
    bobAmpY: 6.8,
    bobFreq: 5.2,
    swayAmpX: 4.0,
    swayFreq: 2.6,
    tiltAmpRad: 0.11,
    tiltFreq: 2.6,
    turnAmpRad: 0.24,
    turnFreq: 1.8,
    blushOpacity: 0.92,
    eyeScaleTarget: 1.06,
    walkSpeed: 1.2,
    armWaveAmp: 0.85,
  },
  meme: {
    state: "meme",
    expressions: ["excited", "proud", "happy"],
    morphEffect: "sparkle",
    bobAmpY: 5.4,
    bobFreq: 4.2,
    swayAmpX: 3.6,
    swayFreq: 2.2,
    tiltAmpRad: 0.09,
    tiltFreq: 2.2,
    turnAmpRad: 0.26,
    turnFreq: 1.6,
    blushOpacity: 0.9,
    eyeScaleTarget: 1.06,
    walkSpeed: 0.8,
    armWaveAmp: 0.55,
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
  subHighlightX: number;
  subHighlightY: number;
  subHighlightR: number;
}

/**
 * 球面经度眼睛投影（GrokBot 球面几何 + 兔兔龙双高光大眼睛）
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

  const sampleY = clamp(centerY + gazeY * 0.55, top + 16, bottom - 24);
  const [left, right] = spanAt(shapeRing, sampleY);
  const radius = Math.max((right - left) / 2, 24);
  const localCenter = (left + right) / 2;

  const rawOffsetX = centerX - HEAD_C;
  let offsetX = rawOffsetX;
  let perspectiveX = 1;
  let visible = true;
  let perspectiveFade = 1;

  if (Math.abs(turnAngle) > 0.001) {
    const initial = Math.asin(clamp(rawOffsetX / radius, -0.94, 0.94));
    const turned = initial + turnAngle;
    const cosine = Math.cos(turned);
    const baseCosine = Math.max(Math.cos(initial), 0.12);
    visible = cosine > 0.03;
    perspectiveX = clamp(Math.max(cosine, 0.04) / baseCosine, 0.08, 1.28);
    offsetX = radius * Math.sin(turned);
    perspectiveFade = smoothstep(0, 0.45, cosine);
  }

  const scaleX = clamp(perspectiveX * eyeScale * pulse, 0.06, 2.0);
  const scaleY = clamp(Math.max(eyeOpen, 0.05) * eyeScale * pulse, 0.05, 2.0);

  const desiredX = localCenter + offsetX + gazeX * 0.65;
  const safeLeft = left + 18 * scaleX;
  const safeRight = right - 18 * scaleX;
  const boundedX =
    safeLeft <= safeRight ? clamp(desiredX, safeLeft, safeRight) : (safeLeft + safeRight) / 2;
  const finalX = boundedX + (desiredX - boundedX) * (1 - perspectiveFade);
  const finalY = clamp(centerY + gazeY * 0.55, top + 20, bottom - 40);

  return {
    d: ringOutline(ring),
    centerX,
    centerY,
    finalX,
    finalY,
    scaleX,
    scaleY,
    visible,
    // 还原 ans_chars.js 的双高光点（左上方大高光 + 右下方小高光）
    highlightX: finalX - 3.1 * scaleX + clamp(gazeX * 0.16, -2.6, 2.6),
    highlightY: finalY - 3.3 * scaleY + clamp(gazeY * 0.16, -2.4, 2.4),
    highlightR: Math.max(1.5, 3.5 * Math.min(scaleX, scaleY)),
    subHighlightX: finalX + 2.7 * scaleX + clamp(gazeX * 0.1, -1.8, 1.8),
    subHighlightY: finalY + 2.9 * scaleY + clamp(gazeY * 0.1, -1.8, 1.8),
    subHighlightR: Math.max(0.8, 1.65 * Math.min(scaleX, scaleY)),
  };
}
