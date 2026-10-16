"use client";

import { createElement, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  ARCADE_PRIZES,
  CNY_PER_POINT,
  POINTS_PER_USD,
  QUEST_ARCADE_EVENT,
  QUEST_ARCADE_SERVER_CREDITED_EVENT,
  QUEST_DEFINITIONS,
  USD_PER_POINT,
  advanceAndClaimQuest,
  drawArcadePrize,
  isQuestClaimedToday,
  loadQuestArcadeState,
  saveQuestArcadeState,
  type ArcadePrize,
  type ArcadeServerCreditedDetail,
  type PrizeRarity,
  type QuestArcadeState,
  type QuestCategory,
  type QuestDefinition,
} from "@/domain/mascot/quest-arcade";
import { SANCTUARY_EVENT_NAME, loadSanctuaryState } from "@/domain/mascot/sanctuary";

interface CapsuleItem {
  id: string;
  rarity: PrizeRarity;
  icon: string;
  labelZh: string;
  labelEn: string;
  x: number; // 12..88 (%)
  z: number; // 15..85 (%)
  colorClass: string;
  glbId: TripoGlbAssetId;
}

export type TripoGlbAssetId =
  | "claw-cabinet"
  | "claw-arm"
  | "ur-dragon-egg"
  | "ssr-4090-cookie"
  | "mint-star-dino";

export interface TripoGlbAssetMeta {
  id: TripoGlbAssetId;
  icon: string;
  nameZh: string;
  nameEn: string;
  roleZh: string;
  roleEn: string;
  glbUrl: string;
  sheetUrl: string;
  tripoTaskId: string;
  sha256Prefix: string;
  vertexCount: number;
  faceCount: number;
  fallbackRgb: [number, number, number];
  promptZh: string;
}

export const TRIPO_GLB_ASSETS: readonly TripoGlbAssetMeta[] = [
  {
    id: "claw-cabinet",
    icon: "🕹️",
    nameZh: "赛博农林太空抓娃娃机 · 机身舱体",
    nameEn: "Cyber-Agri Space Claw Cabinet",
    roleZh: "八角星轨街机底座 + 钛金透明拱顶展示舱",
    roleEn: "Octagonal cyber base + titanium glass display dome",
    glbUrl: "/arcade-3d/claw-cabinet.glb",
    sheetUrl: "/arcade-3d/sheets/claw-cabinet.png",
    tripoTaskId: "dc168408-327f-48bf-945d-7ebc53cfe331",
    sha256Prefix: "bf044e9a0742",
    vertexCount: 5959,
    faceCount: 7142,
    fallbackRgb: [16, 185, 129],
    promptZh:
      "生成用于三维重建的单个赛博农林科技风太空抓娃娃机机身舱体正交四视图资产表。严格2×2等大四宫格：左上正面、右上背面、左下左侧、右下右侧。结构为圆润八角柱形街机机舱，下半部为深邃暗金与翠绿发光饰条底座（正面中央带内凹出物舱口与琥珀色摇杆凸台，背面为平整银灰散热装甲板），上半部为四根流线型钛金立柱支撑的透明拱顶展示舱框架。",
  },
  {
    id: "claw-arm",
    icon: "🦾",
    nameZh: "青金动力核心 · 三爪机械臂",
    nameEn: "Cyan-Gold Core 3-Prong Claw Arm",
    roleZh: "天车悬吊环 + 墨绿琥珀动力盘 + 镀铬三爪",
    roleEn: "Top suspension ring + emerald-gold core + 3 chrome prongs",
    glbUrl: "/arcade-3d/claw-arm.glb",
    sheetUrl: "/arcade-3d/sheets/claw-arm.png",
    tripoTaskId: "c8a30ed7-0604-4138-bff0-bbb58fc7977f",
    sha256Prefix: "9a1eb0b33023",
    vertexCount: 5269,
    faceCount: 7841,
    fallbackRgb: [251, 191, 36],
    promptZh:
      "生成用于三维重建的单个三爪抓娃娃机械爪头正交四视图资产表。严格2×2等大四宫格：左上正面、右上背面、左下左侧、右下右侧。结构为顶部银白金属圆柱吊环，中间为墨绿与琥珀金配色圆盘动力核心（正面镶嵌一颗青色圆形指示灯，背面为金色齿轮浮雕），下方对称垂落三根圆润微张的弧形镀铬机械爪指，爪尖包裹防滑软胶垫。",
  },
  {
    id: "ur-dragon-egg",
    icon: "🐉",
    nameZh: "UR 紫金星云龙蛋 ($100 / 1000 积分)",
    nameEn: "UR Violet-Gold Dragon Egg ($100 / 1000 Pts)",
    roleZh: "紫金渐变龙鳞浮雕 + 琥珀金龙晶核心",
    roleEn: "Violet-gold dragon scales + amber dragon crystal core",
    glbUrl: "/arcade-3d/ur-dragon-egg.glb",
    sheetUrl: "/arcade-3d/sheets/ur-dragon-egg.png",
    tripoTaskId: "2fd1893b-732c-4fce-a557-cc00326c636a",
    sha256Prefix: "176e90305784",
    vertexCount: 5333,
    faceCount: 7532,
    fallbackRgb: [192, 132, 252],
    promptZh:
      "生成用于三维重建的单个UR级紫金星云龙蛋扭蛋正交四视图资产表。严格2×2等大四宫格：左上正面、右上背面、左下左侧、右下右侧。结构为饱满鹅蛋形3D潮玩盲盒巨蛋，表面覆盖立体层叠的紫金渐变龙鳞浮雕与金色闪电能量脉络，正面中央镶嵌一枚水滴形琥珀金龙晶宝石，背面为对称闭合的紫金龙鳞纹路。",
  },
  {
    id: "ssr-4090-cookie",
    icon: "🔋",
    nameZh: "SSR 4090 显卡夹心饼干 ($50 / 500 积分)",
    nameEn: "SSR RTX 4090 Sandwich Cookie ($50 / 500 Pts)",
    roleZh: "双薄荷奶油涡轮风扇 + 华夫背板 + 金手指插脚",
    roleEn: "Dual mint-cream turbo fans + waffle backplate + gold pins",
    glbUrl: "/arcade-3d/ssr-4090-cookie.glb",
    sheetUrl: "/arcade-3d/sheets/ssr-4090-cookie.png",
    tripoTaskId: "81369246-175e-42c5-8737-62d167f3783b",
    sha256Prefix: "17c182128a8c",
    vertexCount: 5560,
    faceCount: 7444,
    fallbackRgb: [52, 211, 153],
    promptZh:
      "生成用于三维重建的单个SSR级显卡造型夹心饼干扭蛋正交四视图资产表。严格2×2等大四宫格：左上正面、右上背面、左下左侧、右下右侧。结构为圆角厚实长方体潮玩饼干造型，外层为烤金黄色曲奇脆皮与黑巧装甲边框，正面雕刻两个对称翠绿薄荷奶油涡轮风扇浮雕，底部边缘露出一排闪亮金色曲奇插脚，背面为方格华夫饼干背板纹路，中间夹有饱满翠绿荧光奶油层。",
  },
  {
    id: "mint-star-dino",
    icon: "🦖",
    nameZh: "R 薄荷星龙潮玩手办 ($25 / 250 积分)",
    nameEn: "R Mint Star Dino Figurine ($25 / 250 Pts)",
    roleZh: "金麦穗皇冠 + 薄荷绿磨砂机身 + 琥珀金背棘",
    roleEn: "Golden wheat crown + matte mint body + amber dorsal spines",
    glbUrl: "/arcade-3d/mint-star-dino.glb",
    sheetUrl: "/arcade-3d/sheets/mint-star-dino.png",
    tripoTaskId: "b71d10d1-bc96-4a71-92b6-3f4f35bb4979",
    sha256Prefix: "dbaaf20a2193",
    vertexCount: 5145,
    faceCount: 7980,
    fallbackRgb: [110, 231, 183],
    promptZh:
      "生成用于三维重建的单个Q版薄荷绿小恐龙潮玩手办正交四视图资产表。严格2×2等大四宫格：左上正面、右上背面、左下左侧、右下右侧。结构为二头身圆润站姿小恐龙盲盒公仔，通体薄荷翠绿哑光磨砂玩具材质，头顶佩戴一顶小巧金黄麦穗皇冠，正面有圆亮黑眼睛与奶油白圆肚皮，背部与短粗尾巴排列一列圆润琥珀金背棘。",
  },
] as const;

export interface ParsedGlbTriangle {
  v0: [number, number, number];
  v1: [number, number, number];
  v2: [number, number, number];
  normal: [number, number, number];
  rgb: [number, number, number];
}

export interface ParsedGlbMesh {
  assetId: TripoGlbAssetId;
  vertexCount: number;
  triangleCount: number;
  triangles: ParsedGlbTriangle[];
}

const glbMeshCache = new Map<TripoGlbAssetId, ParsedGlbMesh>();
const glbLoadingPromises = new Map<TripoGlbAssetId, Promise<ParsedGlbMesh | null>>();

export function parseGlbBinaryMesh(
  assetId: TripoGlbAssetId,
  buffer: ArrayBuffer,
  fallbackRgb: [number, number, number],
  maxRenderTriangles = 420,
): ParsedGlbMesh | null {
  if (buffer.byteLength < 28) return null;
  const view = new DataView(buffer);
  const magic = view.getUint32(0, true);
  const version = view.getUint32(4, true);
  if (magic !== 0x46546c67 || version !== 2) return null;

  const jsonLen = view.getUint32(12, true);
  const jsonType = view.getUint32(16, true);
  if (jsonType !== 0x4e4f534a) return null;

  const jsonBytes = new Uint8Array(buffer, 20, jsonLen);
  const gltf = JSON.parse(new TextDecoder("utf-8").decode(jsonBytes));
  const binChunkHeaderOffset = 20 + jsonLen;
  if (binChunkHeaderOffset + 8 > buffer.byteLength) return null;
  const binOffset = binChunkHeaderOffset + 8;

  const prim = gltf.meshes?.[0]?.primitives?.[0];
  if (!prim) return null;

  const posAcc = gltf.accessors?.[prim.attributes?.POSITION];
  const normAcc =
    prim.attributes?.NORMAL !== undefined ? gltf.accessors?.[prim.attributes.NORMAL] : null;
  const indAcc = prim.indices !== undefined ? gltf.accessors?.[prim.indices] : null;
  if (!posAcc || !indAcc) return null;

  const getBufferSlice = (acc: {
    bufferView: number;
    byteOffset?: number;
    count: number;
    type: string;
    componentType: number;
  }) => {
    const bv = gltf.bufferViews[acc.bufferView];
    const start = binOffset + (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
    const comps = acc.type === "VEC3" ? 3 : acc.type === "VEC2" ? 2 : 1;
    const total = acc.count * comps;
    if (acc.componentType === 5126) {
      return new Float32Array(buffer, start, total);
    }
    if (acc.componentType === 5125) {
      return new Uint32Array(buffer, start, total);
    }
    if (acc.componentType === 5123) {
      return new Uint16Array(buffer, start, total);
    }
    return null;
  };

  const positions = getBufferSlice(posAcc) as Float32Array | null;
  const normals = normAcc ? (getBufferSlice(normAcc) as Float32Array | null) : null;
  const indices = getBufferSlice(indAcc) as Uint32Array | Uint16Array | null;
  if (!positions || !indices) return null;

  const totalTriCount = Math.floor(indices.length / 3);
  const step = Math.max(1, Math.floor(totalTriCount / maxRenderTriangles));
  const triangles: ParsedGlbTriangle[] = [];

  for (let t = 0; t < totalTriCount; t += step) {
    const i0 = indices[t * 3] * 3;
    const i1 = indices[t * 3 + 1] * 3;
    const i2 = indices[t * 3 + 2] * 3;

    const v0: [number, number, number] = [positions[i0], positions[i0 + 1], positions[i0 + 2]];
    const v1: [number, number, number] = [positions[i1], positions[i1 + 1], positions[i1 + 2]];
    const v2: [number, number, number] = [positions[i2], positions[i2 + 1], positions[i2 + 2]];

    let nx = 0;
    let ny = 1;
    let nz = 0;
    if (normals) {
      nx = (normals[i0] + normals[i1] + normals[i2]) / 3;
      ny = (normals[i0 + 1] + normals[i1 + 1] + normals[i2 + 1]) / 3;
      nz = (normals[i0 + 2] + normals[i1 + 2] + normals[i2 + 2]) / 3;
    } else {
      const ux = v1[0] - v0[0];
      const uy = v1[1] - v0[1];
      const uz = v1[2] - v0[2];
      const vx = v2[0] - v0[0];
      const vy = v2[1] - v0[1];
      const vz = v2[2] - v0[2];
      nx = uy * vz - uz * vy;
      ny = uz * vx - ux * vz;
      nz = ux * vy - uy * vx;
    }
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;

    // Height-based gradient accent on top of base color for rich 3D readability
    const avgY = (v0[1] + v1[1] + v2[1]) / 3;
    const lift = Math.max(0.72, Math.min(1.28, 1.0 + avgY * 0.45));
    const rgb: [number, number, number] = [
      Math.min(255, Math.round(fallbackRgb[0] * lift)),
      Math.min(255, Math.round(fallbackRgb[1] * lift)),
      Math.min(255, Math.round(fallbackRgb[2] * lift)),
    ];

    triangles.push({ v0, v1, v2, normal: [nx, ny, nz], rgb });
  }

  return {
    assetId,
    vertexCount: posAcc.count,
    triangleCount: totalTriCount,
    triangles,
  };
}

async function fetchAndParseGlbAsset(meta: TripoGlbAssetMeta): Promise<ParsedGlbMesh | null> {
  if (glbMeshCache.has(meta.id)) return glbMeshCache.get(meta.id)!;
  if (
    typeof window === "undefined" ||
    typeof fetch !== "function" ||
    process.env.NODE_ENV === "test"
  ) {
    return null;
  }
  const existing = glbLoadingPromises.get(meta.id);
  if (existing) return existing;

  const p = fetch(meta.glbUrl)
    .then(res => (res.ok ? res.arrayBuffer() : null))
    .then(buf => {
      if (!buf) return null;
      const parsed = parseGlbBinaryMesh(meta.id, buf, meta.fallbackRgb, 360);
      if (parsed) glbMeshCache.set(meta.id, parsed);
      return parsed;
    })
    .catch(() => null);
  glbLoadingPromises.set(meta.id, p);
  return p;
}

const INITIAL_CAPSULES: readonly CapsuleItem[] = [
  {
    id: "cap-ur-1",
    rarity: "UR",
    icon: "🐉",
    labelZh: "UR 紫金龙蛋 ($100)",
    labelEn: "UR Dragon Egg ($100)",
    x: 50,
    z: 52,
    colorClass: "from-amber-300 via-fuchsia-500 to-indigo-600 ring-amber-300/80",
    glbId: "ur-dragon-egg",
  },
  {
    id: "cap-ssr-1",
    rarity: "SSR",
    icon: "🔋",
    labelZh: "SSR 4090 显卡饼干",
    labelEn: "SSR 4090 Cookie",
    x: 26,
    z: 36,
    colorClass: "from-emerald-300 via-teal-500 to-cyan-600 ring-emerald-300/80",
    glbId: "ssr-4090-cookie",
  },
  {
    id: "cap-ssr-2",
    rarity: "SSR",
    icon: "🧊",
    labelZh: "SSR Tripo 3D 建模舱",
    labelEn: "SSR Tripo 3D Pod",
    x: 74,
    z: 64,
    colorClass: "from-cyan-300 via-teal-500 to-emerald-600 ring-cyan-300/80",
    glbId: "ssr-4090-cookie",
  },
  {
    id: "cap-sr-1",
    rarity: "SR",
    icon: "🌾",
    labelZh: "SR 农大黄金麦穗",
    labelEn: "SR Golden Wheat",
    x: 34,
    z: 70,
    colorClass: "from-amber-300 via-orange-400 to-amber-600 ring-amber-200/70",
    glbId: "mint-star-dino",
  },
  {
    id: "cap-sr-2",
    rarity: "SR",
    icon: "🛠️",
    labelZh: "SR 市场算力抵扣胶囊",
    labelEn: "SR Market Voucher",
    x: 68,
    z: 30,
    colorClass: "from-orange-300 via-amber-500 to-yellow-600 ring-orange-200/70",
    glbId: "ur-dragon-egg",
  },
  {
    id: "cap-r-1",
    rarity: "R",
    icon: "🦖",
    labelZh: "R 薄荷星龙 ($25)",
    labelEn: "R Mint Dino ($25)",
    x: 20,
    z: 66,
    colorClass: "from-sky-300 via-blue-500 to-indigo-600 ring-sky-200/70",
    glbId: "mint-star-dino",
  },
  {
    id: "cap-r-2",
    rarity: "R",
    icon: "⚡",
    labelZh: "R 极速 Flash 能量球",
    labelEn: "R Flash Orb ($25)",
    x: 80,
    z: 42,
    colorClass: "from-indigo-300 via-sky-500 to-blue-600 ring-indigo-200/70",
    glbId: "mint-star-dino",
  },
];

const CAPSULE_PALETTE: Record<PrizeRarity, { shell: string; glow: string; core: string }> = {
  UR: { shell: "rgba(245, 158, 11, 0.88)", glow: "rgba(217, 70, 239, 0.55)", core: "#fde047" },
  SSR: { shell: "rgba(16, 185, 129, 0.88)", glow: "rgba(6, 182, 212, 0.55)", core: "#6ee7b7" },
  SR: { shell: "rgba(249, 115, 22, 0.86)", glow: "rgba(251, 191, 36, 0.5)", core: "#fed7aa" },
  R: { shell: "rgba(56, 189, 248, 0.85)", glow: "rgba(99, 102, 241, 0.45)", core: "#bae6fd" },
};

function DinoClaw3DViewport({
  clawX,
  clawZ,
  clawPhase,
}: {
  clawX: number;
  clawZ: number;
  clawPhase: "idle" | "dropping" | "grabbing" | "lifting";
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetRef = useRef({ x: clawX, z: clawZ, phase: clawPhase });
  const meshesRef = useRef< Map<TripoGlbAssetId, ParsedGlbMesh> >(glbMeshCache);

  useEffect(() => {
    targetRef.current = { x: clawX, z: clawZ, phase: clawPhase };
  }, [clawX, clawZ, clawPhase]);

  useEffect(() => {
    for (const meta of TRIPO_GLB_ASSETS) {
      void fetchAndParseGlbAsset(meta).then(mesh => {
        if (mesh) {
          meshesRef.current.set(meta.id, mesh);
        }
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    let disposed = false;
    let rafId = 0;
    let curX = ((targetRef.current.x - 50) / 38) * 1.55;
    let curZ = ((targetRef.current.z - 50) / 38) * 1.1;
    let curDrop = 0;
    let curClose = 0;

    // 3D Perspective Camera projection helper
    const project3D = (wx: number, wy: number, wz: number, w: number, h: number) => {
      const camY = 1.55;
      const camZ = 4.2;
      const pitch = 0.34;
      const dy = wy - camY;
      const dz = wz - camZ;
      const ry = dy * Math.cos(pitch) - dz * Math.sin(pitch);
      const rz = dy * Math.sin(pitch) + dz * Math.cos(pitch);
      const depth = Math.max(0.8, -rz);
      const fov = Math.min(w, h) * 1.18;
      return {
        sx: w * 0.5 + (wx / depth) * fov,
        sy: h * 0.52 - (ry / depth) * fov,
        scale: fov / depth,
        depth,
      };
    };

    const drawGlbInstance = (
      mesh: ParsedGlbMesh,
      cx: number,
      cy: number,
      cz: number,
      scale: number,
      yaw: number,
      w: number,
      h: number,
      alpha = 0.92,
    ) => {
      if (!ctx) return;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const projectedTris: Array<{
        p0: { sx: number; sy: number; depth: number };
        p1: { sx: number; sy: number; depth: number };
        p2: { sx: number; sy: number; depth: number };
        avgDepth: number;
        fill: string;
      }> = [];

      for (const tri of mesh.triangles) {
        const rot = (v: [number, number, number]) => {
          const rx = v[0] * cosY - v[2] * sinY;
          const rz = v[0] * sinY + v[2] * cosY;
          return project3D(cx + rx * scale, cy + v[1] * scale, cz + rz * scale, w, h);
        };
        const p0 = rot(tri.v0);
        const p1 = rot(tri.v1);
        const p2 = rot(tri.v2);
        const rnx = tri.normal[0] * cosY - tri.normal[2] * sinY;
        const rny = tri.normal[1];
        const rnz = tri.normal[0] * sinY + tri.normal[2] * cosY;
        const light = Math.max(0.38, Math.min(1.25, 0.58 + rnx * 0.28 + rny * 0.42 - rnz * 0.25));
        const r = Math.min(255, Math.round(tri.rgb[0] * light));
        const g = Math.min(255, Math.round(tri.rgb[1] * light));
        const b = Math.min(255, Math.round(tri.rgb[2] * light));
        projectedTris.push({
          p0,
          p1,
          p2,
          avgDepth: (p0.depth + p1.depth + p2.depth) / 3,
          fill: `rgba(${r},${g},${b},${alpha})`,
        });
      }

      projectedTris.sort((a, b) => b.avgDepth - a.avgDepth);
      for (const pt of projectedTris) {
        ctx.fillStyle = pt.fill;
        ctx.beginPath();
        ctx.moveTo(pt.p0.sx, pt.p0.sy);
        ctx.lineTo(pt.p1.sx, pt.p1.sy);
        ctx.lineTo(pt.p2.sx, pt.p2.sy);
        ctx.closePath();
        ctx.fill();
      }
    };

    const renderFrame = (timeMs: number) => {
      if (disposed || !canvasRef.current) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvasRef.current.clientWidth || 380;
      const h = canvasRef.current.clientHeight || 220;
      if (canvasRef.current.width !== Math.round(w * dpr) || canvasRef.current.height !== Math.round(h * dpr)) {
        canvasRef.current.width = Math.round(w * dpr);
        canvasRef.current.height = Math.round(h * dpr);
      }
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const t = timeMs * 0.001;
      const targetWorldX = ((targetRef.current.x - 50) / 38) * 1.55;
      const targetWorldZ = ((targetRef.current.z - 50) / 38) * 1.1;
      const phase = targetRef.current.phase;

      curX += (targetWorldX - curX) * 0.14;
      curZ += (targetWorldZ - curZ) * 0.14;
      const desiredDrop = phase === "dropping" || phase === "grabbing" ? 1.0 : phase === "lifting" ? 0.35 : 0;
      curDrop += (desiredDrop - curDrop) * 0.16;
      const desiredClose = phase === "grabbing" || phase === "lifting" ? 0.45 : 0;
      curClose += (desiredClose - curClose) * 0.18;

      // 0. Draw Subtle 3D Cabinet Mesh Frame if claw-cabinet.glb is loaded
      const cabinetMesh = meshesRef.current.get("claw-cabinet");
      if (cabinetMesh) {
        drawGlbInstance(cabinetMesh, 0, 0.12, -0.85, 2.35, 0, w, h, 0.16);
      }

      // 1. Draw 3D Perspective Cyber-Agri Floor Grid
      const floorY = -0.68;
      ctx.lineWidth = 1;
      for (let i = -5; i <= 5; i++) {
        const gx = i * 0.36;
        const p1 = project3D(gx, floorY, -1.35, w, h);
        const p2 = project3D(gx, floorY, 1.35, w, h);
        ctx.strokeStyle = i === 0 ? "rgba(52, 211, 153, 0.35)" : "rgba(148, 163, 184, 0.14)";
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      }
      for (let j = -4; j <= 4; j++) {
        const gz = j * 0.33;
        const p1 = project3D(-1.8, floorY, gz, w, h);
        const p2 = project3D(1.8, floorY, gz, w, h);
        ctx.strokeStyle = j === 0 ? "rgba(251, 191, 36, 0.28)" : "rgba(148, 163, 184, 0.14)";
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      }

      // 2. Draw 3D Target Laser Reticle on Floor
      const retCenter = project3D(curX, floorY + 0.02, curZ, w, h);
      const retRadius = Math.max(10, retCenter.scale * (0.22 + Math.sin(t * 4) * 0.02));
      ctx.save();
      ctx.translate(retCenter.sx, retCenter.sy);
      ctx.scale(1, 0.52);
      ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, retRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 3. Draw 3D Tripo .glb Prize Capsules (or fallback spheres) sorted by depth
      const sortedCapsules = INITIAL_CAPSULES.map((cap, idx) => {
        const wx = ((cap.x - 50) / 38) * 1.55;
        const wz = ((cap.z - 50) / 38) * 1.1;
        const bob = Math.sin(t * 2.2 + idx * 0.9) * 0.04;
        const wy = floorY + 0.24 + bob;
        const proj = project3D(wx, wy, wz, w, h);
        return { cap, wx, wy, wz, proj, idx };
      }).sort((a, b) => b.proj.depth - a.proj.depth);

      for (const item of sortedCapsules) {
        const { cap, wx, wy, wz, proj, idx } = item;
        const pal = CAPSULE_PALETTE[cap.rarity];
        const r = Math.max(11, proj.scale * 0.21);
        const prizeGlb = meshesRef.current.get(cap.glbId);

        if (prizeGlb) {
          drawGlbInstance(prizeGlb, wx, wy, wz, 0.46, t * 0.9 + idx * 1.1, w, h, 0.95);
        } else {
          // Specular 3D Sphere Gradient fallback while .glb streams in
          const grad = ctx.createRadialGradient(
            proj.sx - r * 0.32,
            proj.sy - r * 0.35,
            r * 0.1,
            proj.sx,
            proj.sy,
            r,
          );
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.35, pal.core);
          grad.addColorStop(0.8, pal.shell);
          grad.addColorStop(1, "rgba(15, 23, 42, 0.9)");

          ctx.save();
          ctx.shadowColor = pal.glow;
          ctx.shadowBlur = 14;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Orbiting 3D Energy Ring around UR / SSR capsules
        if (cap.rarity === "UR" || cap.rarity === "SSR") {
          ctx.save();
          ctx.translate(proj.sx, proj.sy);
          ctx.rotate(Math.sin(t * 1.6 + idx) * 0.35);
          ctx.scale(1, 0.42);
          ctx.strokeStyle = pal.core;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, r * 1.32, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 4. Draw 3D Gantry Rail, Telescopic Cable & Tripo claw-arm.glb 3D Mechanical Claw
      const railLeft = project3D(-1.75, 0.92, curZ, w, h);
      const railRight = project3D(1.75, 0.92, curZ, w, h);
      ctx.strokeStyle = "rgba(251, 191, 36, 0.75)";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(railLeft.sx, railLeft.sy);
      ctx.lineTo(railRight.sx, railRight.sy);
      ctx.stroke();

      const carriageProj = project3D(curX, 0.92, curZ, w, h);
      const clawY = 0.62 - curDrop * 0.98;
      const clawHeadProj = project3D(curX, clawY, curZ, w, h);

      // Steel Cable
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(carriageProj.sx, carriageProj.sy);
      ctx.lineTo(clawHeadProj.sx, clawHeadProj.sy);
      ctx.stroke();

      const clawArmMesh = meshesRef.current.get("claw-arm");
      if (clawArmMesh) {
        drawGlbInstance(clawArmMesh, curX, clawY - 0.16, curZ, 0.56, t * 0.5, w, h, 0.96);
      } else {
        // 3-Prong Articulated Cyber Claw procedural fallback
        const hubR = Math.max(6, clawHeadProj.scale * 0.11);
        for (let i = 0; i < 3; i++) {
          const angle = t * 0.6 + (i * Math.PI * 2) / 3;
          const spread = (0.24 - curClose * 0.22) * clawHeadProj.scale;
          const elbowX = clawHeadProj.sx + Math.cos(angle) * spread;
          const elbowY = clawHeadProj.sy + hubR * 1.15;
          const tipX = clawHeadProj.sx + Math.cos(angle) * spread * (0.55 - curClose * 0.4);
          const tipY = clawHeadProj.sy + hubR * 2.35;

          ctx.strokeStyle = i === 0 ? "#38bdf8" : "#f8fafc";
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(clawHeadProj.sx, clawHeadProj.sy);
          ctx.lineTo(elbowX, elbowY);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();
        }
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(clawHeadProj.sx, clawHeadProj.sy, hubR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
    />
  );
}

export function ComputeQuestArcade({ actorId }: { actorId?: string | null }) {
  const locale = useLocale();
  const isEn = locale === "en";

  const [state, setState] = useState<QuestArcadeState>(() => loadQuestArcadeState(actorId));
  const [starBeans, setStarBeans] = useState<number>(() => loadSanctuaryState().starBeans);
  const [arcadeMode, setArcadeMode] = useState<"claw" | "roulette" | "glb">("claw");
  const [selectedGlbId, setSelectedGlbId] = useState<TripoGlbAssetId>("claw-cabinet");
  const [activeCategory, setActiveCategory] = useState<QuestCategory>("daily");

  // 3D Claw Machine state
  const [clawX, setClawX] = useState<number>(50);
  const [clawZ, setClawZ] = useState<number>(50);
  const [clawPhase, setClawPhase] = useState<"idle" | "dropping" | "grabbing" | "lifting">("idle");
  const [grabbedCapsule, setGrabbedCapsule] = useState<CapsuleItem | null>(null);

  // Starlight Roulette state
  const [wheelAngle, setWheelAngle] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);

  // VibeHub 60s immersion timer simulation
  const [vibeTimerRunning, setVibeTimerRunning] = useState<boolean>(false);

  // Prize / Toast banner state
  const [lastWonPrize, setLastWonPrize] = useState<ArcadePrize | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string>("");
  const [serverBalancePoints, setServerBalancePoints] = useState<number | null>(null);
  const [lastServerCredit, setLastServerCredit] = useState<ArcadeServerCreditedDetail | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const syncAll = () => {
      setState(loadQuestArcadeState(actorId));
      setStarBeans(loadSanctuaryState().starBeans);
    };
    const onServerCredited = (ev: Event) => {
      const detail = (ev as CustomEvent<ArcadeServerCreditedDetail>).detail;
      if (detail && typeof detail.balanceAfter === "number") {
        setServerBalancePoints(detail.balanceAfter);
        setLastServerCredit(detail);
      }
    };
    window.addEventListener(QUEST_ARCADE_EVENT, syncAll);
    window.addEventListener(SANCTUARY_EVENT_NAME, syncAll);
    window.addEventListener(QUEST_ARCADE_SERVER_CREDITED_EVENT, onServerCredited);
    window.addEventListener("storage", syncAll);

    if (process.env.NODE_ENV !== "test" && typeof fetch === "function") {
      void fetch("/api/compute-benefits/arcade")
        .then(res => (res.ok ? res.json() : null))
        .then((data: { balancePoints?: number } | null) => {
          if (data && typeof data.balancePoints === "number") {
            setServerBalancePoints(data.balancePoints);
          }
        })
        .catch(() => {});
    }

    const timers = timersRef.current;
    return () => {
      window.removeEventListener(QUEST_ARCADE_EVENT, syncAll);
      window.removeEventListener(SANCTUARY_EVENT_NAME, syncAll);
      window.removeEventListener(QUEST_ARCADE_SERVER_CREDITED_EVENT, onServerCredited);
      window.removeEventListener("storage", syncAll);
      timers.forEach(id => window.clearTimeout(id));
    };
  }, [actorId]);

  useEffect(() => {
    if (!vibeTimerRunning) return;
    const interval = window.setInterval(() => {
      const current = loadQuestArcadeState(actorId);
      const nextSec = Math.min(60, (current.vibehubReadSeconds || 0) + 15);
      const updated: QuestArcadeState = {
        ...current,
        vibehubReadSeconds: nextSec,
        questProgress: {
          ...current.questProgress,
          daily_vibehub_read: nextSec,
        },
      };
      saveQuestArcadeState(updated, actorId);
      setState(updated);
      if (nextSec >= 60) {
        setVibeTimerRunning(false);
        const res = advanceAndClaimQuest("daily_vibehub_read", actorId);
        if (res?.newlyClaimed) {
          setBannerMessage(
            isEn
              ? `🎉 VibeHub 60s Deep Reading completed! Unlocked $${res.quest.unlockUsd} (${res.quest.unlockUsd * POINTS_PER_USD} pts) + 1 Claw Token!`
              : `🎉 VibeHub 60 秒沉浸充电完成！已从金库提取 $${res.quest.unlockUsd}（${res.quest.unlockUsd * POINTS_PER_USD} 积分）+ 1 枚抓娃娃币！`,
          );
        }
      }
    }, 650);
    return () => window.clearInterval(interval);
  }, [vibeTimerRunning, actorId, isEn]);

  function moveClaw(dx: number, dz: number) {
    if (clawPhase !== "idle") return;
    setClawX(prev => Math.max(14, Math.min(86, prev + dx)));
    setClawZ(prev => Math.max(16, Math.min(84, prev + dz)));
  }

  function findNearestCapsule(x: number, z: number): CapsuleItem {
    let best = INITIAL_CAPSULES[0];
    let bestDist = Infinity;
    for (const cap of INITIAL_CAPSULES) {
      const dist = Math.hypot(cap.x - x, cap.z - z);
      if (dist < bestDist) {
        bestDist = dist;
        best = cap;
      }
    }
    return best;
  }

  function handleClawDrop() {
    if (clawPhase !== "idle") return;
    if (state.arcadeTokens < 1) {
      setBannerMessage(
        isEn
          ? "⚠️ Out of Arcade Tokens! Complete any daily quest or Dino easter egg below to earn tokens."
          : "⚠️ 抓娃娃币不足！完成下方任意每日任务或触发小恐龙反常识彩蛋即可免费领币。",
      );
      return;
    }

    const nearest = findNearestCapsule(clawX, clawZ);
    setClawPhase("dropping");
    setLastWonPrize(null);

    const t1 = window.setTimeout(() => {
      setClawPhase("grabbing");
      setGrabbedCapsule(nearest);
    }, 360);

    const t2 = window.setTimeout(() => {
      setClawPhase("lifting");
    }, 760);

    const t3 = window.setTimeout(() => {
      const outcome = drawArcadePrize("claw", actorId);
      setClawPhase("idle");
      setGrabbedCapsule(null);
      if (outcome) {
        setState(outcome.state);
        setLastWonPrize(outcome.prize);
        const pts = outcome.prize.unlockUsd * POINTS_PER_USD;
        setBannerMessage(
          isEn
            ? `🕹️ Claw Critical Hit! Pulled [${outcome.prize.rarity}] ${outcome.prize.nameEn} · Unlocked $${outcome.prize.unlockUsd} (${pts} pts) + ${outcome.prize.starBeans}🪙!`
            : `🕹️ 机械爪暴击出货！抓中【${outcome.prize.rarity}】${outcome.prize.nameZh} · 已从金库提现 $${outcome.prize.unlockUsd}（${pts} 积分）+ ${outcome.prize.starBeans}🪙！`,
        );
      }
    }, 1150);

    timersRef.current.push(t1, t2, t3);
  }

  function handleRouletteSpin(drawsCount: 1 | 5 = 1) {
    if (isSpinning) return;
    const actualDraws = Math.min(drawsCount, state.arcadeTokens);
    if (actualDraws < 1) {
      setBannerMessage(
        isEn
          ? "⚠️ Out of Arcade Tokens! Complete daily quests or Dino easter eggs below to earn tokens."
          : "⚠️ 星轨转盘币不足！完成下方每日任务或小恐龙彩蛋即可免费获取。",
      );
      return;
    }

    setIsSpinning(true);
    setLastWonPrize(null);
    setWheelAngle(prev => prev + 1080 + Math.floor(Math.random() * 360));

    const t = window.setTimeout(() => {
      let latestOutcome: ReturnType<typeof drawArcadePrize> = null;
      let totalUsd = 0;
      for (let i = 0; i < actualDraws; i++) {
        const res = drawArcadePrize("roulette", actorId);
        if (res) {
          latestOutcome = res;
          totalUsd += res.prize.unlockUsd;
        }
      }
      setIsSpinning(false);
      if (latestOutcome) {
        setState(latestOutcome.state);
        setLastWonPrize(latestOutcome.prize);
        const totalPts = totalUsd * POINTS_PER_USD;
        setBannerMessage(
          isEn
            ? `🎡 Starlight Roulette (${actualDraws}x) Complete! Highlight: [${latestOutcome.prize.rarity}] ${latestOutcome.prize.nameEn} · Total Unlocked: $${totalUsd} (${totalPts} pts)!`
            : `🎡 丰收星轨大转盘（${actualDraws} 连抽）出货！最高命中【${latestOutcome.prize.rarity}】${latestOutcome.prize.nameZh} · 累计提现 $${totalUsd}（${totalPts} 积分）！`,
        );
      }
    }, 900);

    timersRef.current.push(t);
  }

  function handleClaimQuest(quest: QuestDefinition) {
    const res = advanceAndClaimQuest(quest.id, actorId);
    if (!res) return;
    setState(res.state);
    if (res.newlyClaimed) {
      const pts = quest.unlockUsd * POINTS_PER_USD;
      setBannerMessage(
        isEn
          ? `✅ Quest Completed: ${quest.titleEn}! Unlocked $${quest.unlockUsd} (${pts} pts) + ${quest.rewardTokens}🎟️ + ${quest.rewardStarBeans}🪙!`
          : `✅ 任务达成：【${quest.titleZh}】！已从金库解锁 $${quest.unlockUsd}（${pts} 积分）+ ${quest.rewardTokens}🎟️ 抓娃娃币 + ${quest.rewardStarBeans}🪙 星豆！`,
      );
    } else {
      setBannerMessage(
        isEn
          ? `ℹ️ Quest [${quest.titleEn}] has already been claimed for this cycle.`
          : `ℹ️ 【${quest.titleZh}】本周期奖励已入账，快去抓娃娃或探索其他隐藏彩蛋吧！`,
      );
    }
  }

  const deepseekPct = Math.min(100, Math.round((state.deepseekUnlockedUsd / state.deepseekTotalUsd) * 100));
  const flagshipPct = Math.min(100, Math.round((state.flagshipUnlockedUsd / state.flagshipTotalUsd) * 100));
  const filteredQuests = QUEST_DEFINITIONS.filter(q => q.category === activeCategory);
  const unlockedSecretCount = Object.keys(state.secretUnlockedAt).length;
  const targetCapsule = findNearestCapsule(clawX, clawZ);

  return (
    <section
      id="ans-quest-arcade-hub"
      aria-label={isEn ? "Compute Vault, 3D Claw Arcade & Gamified Quest Center" : "算力金库、3D 抓娃娃游乐场与游戏化任务中心"}
      className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-slate-100 shadow-2xl sm:p-7"
    >
      {/* Ambient Cyber-Agri Glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />

      {/* Top Header & Official Conversion Ratio Badge */}
      <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 px-3 py-0.5 text-xs font-black text-slate-950">
              {isEn ? "🎮 ANS × CAU AGRIHACKATHON ARCADE" : "🎮 ANS × 中国农大农客松 · 算力游乐场"}
            </span>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
              {isEn
                ? `Official Ratio: 1 Point = ¥${CNY_PER_POINT.toFixed(2)} CNY = $${USD_PER_POINT.toFixed(2)} USD APIC Quota (10 Pts = $1)`
                : `官方计费锚定：1 积分 = ¥${CNY_PER_POINT.toFixed(2)} 元 = $${USD_PER_POINT.toFixed(2)} USD APIC 标称额度（10 积分 = $1）`}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {isEn
              ? "Compute Vault Progressive Unlock · 3D Dino Claw Machine & Quest Center"
              : "算力金库阶梯提现 · 3D 灵龙抓娃娃机 × 反常识彩蛋任务中心"}
          </h2>
          <p className="max-w-3xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            {isEn
              ? "Complete daily/weekly quests, AgriHackathon milestones (M1–M4), or discover the 6 counter-intuitive Dino Agent easter eggs to earn Arcade Tokens and unlock your $1,000 DeepSeek V4.1 Flash + $600 Flagship compute packs."
              : "完成每日打卡、VibeHub 充电、工作流市场上架、农客松 M1–M4 里程碑或触发右下角小恐龙 6 大反常识隐藏彩蛋，即可赚取游乐币，亲手抓出 $1,000 DeepSeek V4.1 Flash 与 $600 农客松顶配旗舰算力包！"}
          </p>
        </div>

        {/* Wallet Counters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-2xl border border-emerald-400/50 bg-emerald-500/15 px-3.5 py-2 text-center">
            <div className="text-[11px] font-medium text-emerald-200">
              {isEn ? "API Gateway Live Points" : "API 网关真实可扣费积分"}
            </div>
            <div className="text-lg font-black text-emerald-300" data-testid="gateway-live-points">
              💳{" "}
              {serverBalancePoints !== null
                ? serverBalancePoints.toLocaleString()
                : ((state.deepseekUnlockedUsd + state.flagshipUnlockedUsd) * POINTS_PER_USD).toLocaleString()}
              {lastServerCredit && !lastServerCredit.duplicate ? (
                <span className="ml-1.5 rounded-full bg-emerald-400/25 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200">
                  +{lastServerCredit.grantedPoints}
                </span>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/15 px-3.5 py-2 text-center">
            <div className="text-[11px] font-medium text-amber-200">{isEn ? "Arcade Tokens" : "游乐场抓娃娃币"}</div>
            <div className="text-lg font-black text-amber-300" data-testid="arcade-token-count">
              🎟️ {state.arcadeTokens}
            </div>
          </div>
          <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-3.5 py-2 text-center">
            <div className="text-[11px] font-medium text-yellow-200">{isEn ? "Star Beans" : "灵龙灵感星豆"}</div>
            <div className="text-lg font-black text-yellow-300">🪙 {starBeans}</div>
          </div>
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-2 text-center">
            <div className="text-[11px] font-medium text-cyan-200">{isEn ? "3D / Market Vouchers" : "3D建模 / 市场券"}</div>
            <div className="text-lg font-black text-cyan-300">
              🧊 {state.tripoFreeVouchers} · 🛠️ {state.marketDiscountVouchers}
            </div>
          </div>
        </div>
      </div>

      {/* Progressive Compute Vault Dual Progress Dashboard */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {/* Vault 1: $1,000 DeepSeek V4.1 Flash (10,000 Points) */}
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {isEn ? "Tier 1 · Universal Onboarding Vault" : "第一梯队 · 全民问卷算力金库"}
              </span>
              <h3 className="text-base font-bold text-white">
                {isEn ? "$1,000 DeepSeek V4.1 Flash (10,000 Pts)" : "$1,000 DeepSeek V4.1 Flash（10,000 专项积分）"}
              </h3>
            </div>
            <span className="rounded-xl bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-300">
              ${state.deepseekUnlockedUsd} / ${state.deepseekTotalUsd} ({state.deepseekUnlockedUsd * POINTS_PER_USD}{" "}
              {isEn ? "pts" : "积分"})
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-500"
              style={{ width: `${deepseekPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {isEn
                ? "Initial $50 (500 pts) unlocked · Unlock remaining $950 via Daily Quests & Claw Machine"
                : "首期已到账 $50（500 积分）· 剩余 $950（9,500 积分）通过每日任务与抓娃娃机实时提现"}
            </span>
            <span className="font-bold text-emerald-300">{deepseekPct}%</span>
          </div>
        </div>

        {/* Vault 2: $600 AgriHackathon Flagship Pack (6,000 Points) */}
        <div className="rounded-2xl border border-amber-500/35 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {isEn ? "Tier 2 · CAU AgriHackathon Flagship Vault" : "第二梯队 · 农客松参赛顶配旗舰金库"}
              </span>
              <h3 className="text-base font-bold text-white">
                {isEn
                  ? "$600 Flagship Pack (6,000 Pts: Terra / GPT-6.1 / Opus 5.5)"
                  : "$600 顶配旗舰包（6,000 积分：$300 Terra + $200 GPT-6.1 + $100 Opus 5.5）"}
              </h3>
            </div>
            <span className="rounded-xl bg-amber-500/20 px-2.5 py-1 text-xs font-black text-amber-300">
              ${state.flagshipUnlockedUsd} / ${state.flagshipTotalUsd} ({state.flagshipUnlockedUsd * POINTS_PER_USD}{" "}
              {isEn ? "pts" : "积分"})
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-all duration-500"
              style={{ width: `${flagshipPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {isEn
                ? "M1 Apply (20% $120) → M2 Code Host (30% $180) → M3 Wall Public (25% $150) → M4 5-Day Streak (25% $150)"
                : "M1 报名(20% $120) → M2 代码托管(30% $180) → M3 作品墙拉Star(25% $150) → M4 5天冲刺(25% $150)"}
            </span>
            <span className="font-bold text-amber-300">{flagshipPct}%</span>
          </div>
        </div>
      </div>

      {/* Live Toast / Status Banner */}
      {bannerMessage && (
        <div
          role="status"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/50 bg-amber-500/15 px-4 py-2.5 text-xs font-semibold text-amber-200 shadow-lg sm:text-sm"
        >
          <span>{bannerMessage}</span>
          <button
            type="button"
            onClick={() => setBannerMessage("")}
            className="shrink-0 rounded-lg bg-white/10 px-2 py-0.5 text-xs text-white hover:bg-white/20"
          >
            {isEn ? "Dismiss" : "收起"}
          </button>
        </div>
      )}

      {/* Main Split Grid: Left = 3D Claw Machine / Starlight Roulette Pod, Right = 4-Tab Gamified Quest Center */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Left Column (5 cols): 3D Claw Machine & Starlight Roulette */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/15 bg-slate-900/90 p-4 lg:col-span-5">
          <div>
            {/* Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex flex-wrap rounded-xl bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setArcadeMode("claw")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    arcadeMode === "claw"
                      ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {isEn ? "🕹️ 3D Dino Claw" : "🕹️ 3D 灵龙抓娃娃机"}
                </button>
                <button
                  type="button"
                  onClick={() => setArcadeMode("roulette")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    arcadeMode === "roulette"
                      ? "bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 shadow"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {isEn ? "🎡 Starlight Roulette" : "🎡 丰收星轨大转盘"}
                </button>
                <button
                  type="button"
                  data-testid="arcade-mode-glb"
                  onClick={() => {
                    setArcadeMode("glb");
                    if (
                      typeof document !== "undefined" &&
                      process.env.NODE_ENV !== "test" &&
                      !document.getElementById("ans-model-viewer-script")
                    ) {
                      const s = document.createElement("script");
                      s.id = "ans-model-viewer-script";
                      s.type = "module";
                      s.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
                      document.head.appendChild(s);
                    }
                  }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    arcadeMode === "glb"
                      ? "bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-emerald-400 text-slate-950 shadow"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {isEn ? "🧊 4-View + .glb 3D" : "🧊 四视图 + .glb 3D 舱"}
                </button>
              </div>
              <span className="rounded-lg border border-purple-400/30 bg-purple-500/15 px-2 py-1 text-[11px] font-bold text-purple-200">
                {isEn ? `SSR/UR Pity: ${state.pityCounter}/10` : `十连保底 SSR/UR：${state.pityCounter}/10`}
              </span>
            </div>

            {arcadeMode === "claw" ? (
              /* 3D Cyber-Agri Claw Machine Cabinet */
              <div className="mt-3">
                <div
                  className="relative h-64 w-full overflow-hidden rounded-2xl border-2 border-amber-400/40 bg-gradient-to-b from-indigo-950/90 via-slate-900 to-slate-950 shadow-inner"
                  style={{ perspective: "700px" }}
                >
                  {/* Top Neon Header */}
                  <div className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/40 px-3 py-1 text-[10px] font-bold text-amber-300">
                    <span>{isEn ? "TRIPO v3.1 MULTIVIEW .GLB RIG · 5 MODELS ACTIVE" : "TRIPO v3.1 四视图 .GLB 实装 · 5 大 3D 资产已挂载"}</span>
                    <span>
                      {isEn ? `Target: ${targetCapsule.labelEn}` : `已瞄准：${targetCapsule.labelZh}`}
                    </span>
                  </div>

                  {/* Interactive Three.js / glTF 2.0 .glb 3D Viewport */}
                  <DinoClaw3DViewport clawX={clawX} clawZ={clawZ} clawPhase={clawPhase} />

                  {/* 3D Gantry & Mechanical Claw */}
                  <div
                    className="pointer-events-none absolute top-6 z-20 -translate-x-1/2 transition-all duration-300"
                    style={{ left: `${clawX}%` }}
                  >
                    {/* Gantry Carriage */}
                    <div className="mx-auto h-2.5 w-8 rounded-full bg-amber-400 shadow" />
                    {/* Steel Cable */}
                    <div
                      className="mx-auto w-0.5 bg-gradient-to-b from-amber-300 to-slate-300 transition-all duration-300"
                      style={{
                        height:
                          clawPhase === "dropping" || clawPhase === "grabbing"
                            ? `${Math.round(68 + clawZ * 0.65)}px`
                            : "26px",
                      }}
                    />
                    {/* 3-Prong Cyber Claw */}
                    <div className="relative mx-auto flex h-7 w-9 items-start justify-center">
                      <span
                        className={`inline-block text-xl transition-transform duration-200 ${
                          clawPhase === "grabbing" || clawPhase === "lifting" ? "scale-90 text-amber-300" : "text-slate-200"
                        }`}
                      >
                        🦾
                      </span>
                      {grabbedCapsule && (
                        <span className="absolute -bottom-5 animate-bounce text-xl">{grabbedCapsule.icon}</span>
                      )}
                    </div>
                  </div>

                  {/* Isometric Floor Grid */}
                  <div
                    className="absolute inset-x-3 bottom-3 top-14 rounded-xl border border-cyan-500/20 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14),transparent_70%)]"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
                      backgroundSize: "24px 24px",
                    }}
                  >
                    {/* Glowing 3D Capsules */}
                    {INITIAL_CAPSULES.map(cap => {
                      const isTargeted = cap.id === targetCapsule.id;
                      return (
                        <button
                          key={cap.id}
                          type="button"
                          onClick={() => {
                            if (clawPhase === "idle") {
                              setClawX(cap.x);
                              setClawZ(cap.z);
                            }
                          }}
                          title={isEn ? `Aim at ${cap.labelEn}` : `点击瞄准：${cap.labelZh}`}
                          style={{ left: `${cap.x}%`, top: `${cap.z}%` }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br p-2 shadow-lg ring-2 transition-transform ${
                            cap.colorClass
                          } ${isTargeted ? "z-10 scale-125 ring-4 ring-white" : " opacity-90 hover:scale-110"}`}
                        >
                          <span className="block text-base leading-none">{cap.icon}</span>
                        </button>
                      );
                    })}

                    {/* Target Shadow Reticle */}
                    <div
                      className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-amber-300/90 bg-amber-400/15 transition-all duration-300"
                      style={{ left: `${clawX}%`, top: `${clawZ}%` }}
                    />
                  </div>
                </div>

                {/* Joystick & Drop Claw Controls */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveClaw(-12, 0)}
                      className="rounded-xl border border-white/15 bg-slate-800 px-2.5 py-1.5 text-xs font-bold hover:bg-slate-700"
                    >
                      ◀ {isEn ? "Left" : "左移"}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveClaw(12, 0)}
                      className="rounded-xl border border-white/15 bg-slate-800 px-2.5 py-1.5 text-xs font-bold hover:bg-slate-700"
                    >
                      {isEn ? "Right" : "右移"} ▶
                    </button>
                    <button
                      type="button"
                      onClick={() => moveClaw(0, -12)}
                      className="rounded-xl border border-white/15 bg-slate-800 px-2.5 py-1.5 text-xs font-bold hover:bg-slate-700"
                    >
                      ▲ {isEn ? "Back" : "前推"}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveClaw(0, 12)}
                      className="rounded-xl border border-white/15 bg-slate-800 px-2.5 py-1.5 text-xs font-bold hover:bg-slate-700"
                    >
                      ▼ {isEn ? "Front" : "后拉"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleClawDrop}
                    disabled={clawPhase !== "idle"}
                    data-testid="claw-drop-button"
                    className="flex-1 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2 text-xs font-black text-slate-950 shadow-lg transition hover:brightness-110 disabled:opacity-50"
                  >
                    {clawPhase === "idle"
                      ? isEn
                        ? "🕹️ DROP CLaw (1 Token · 100% Win)"
                        : "🕹️ 投币下爪抓取（耗 1 币 · 100% 必中算力）"
                      : isEn
                        ? "⚙️ Claw Grabbing Capsule..."
                        : "⚙️ 机械爪正在抓起盲盒胶囊..."}
                  </button>
                </div>
              </div>
            ) : arcadeMode === "roulette" ? (
              /* Starlight Roulette Mode */
              <div className="mt-3">
                <div className="relative flex h-64 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-emerald-400/40 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 p-4">
                  <div
                    className="relative flex h-44 w-44 items-center justify-center rounded-full border-4 border-amber-300/70 bg-gradient-to-tr from-indigo-900 via-emerald-900 to-amber-900 shadow-2xl transition-transform duration-700 ease-out"
                    style={{ transform: `rotate(${wheelAngle}deg)` }}
                  >
                    {ARCADE_PRIZES.map((prize, idx) => {
                      const angle = idx * 90;
                      return (
                        <div
                          key={prize.id}
                          style={{ transform: `rotate(${angle}deg) translateY(-56px)` }}
                          className="absolute flex flex-col items-center text-center"
                        >
                          <span className="text-2xl">{prize.icon}</span>
                          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-black text-amber-200">
                            {prize.rarity} · ${prize.unlockUsd}
                          </span>
                        </div>
                      );
                    })}
                    <div className="z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-slate-950 text-xs font-black text-amber-300 shadow">
                      ANS
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-300">
                    {isEn
                      ? "100% Win Rate · Every spin unlocks Vault Compute + Star Beans!"
                      : "100% 中奖不空军 · 每一转直接从算力金库提取真金白银额度！"}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRouletteSpin(1)}
                    disabled={isSpinning}
                    data-testid="roulette-spin-1"
                    className="rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-3 py-2 text-xs font-black text-slate-950 shadow hover:brightness-110 disabled:opacity-50"
                  >
                    {isEn ? "🎡 Spin 1x (1 Token)" : "🎡 单抽星轨转盘（1 币）"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRouletteSpin(5)}
                    disabled={isSpinning}
                    data-testid="roulette-spin-5"
                    className="rounded-xl bg-gradient-to-r from-amber-400 via-fuchsia-500 to-indigo-500 px-3 py-2 text-xs font-black text-white shadow hover:brightness-110 disabled:opacity-50"
                  >
                    {isEn ? "⚡ 5x Burst Spin" : "⚡ 五连暴击转盘（速冲保底）"}
                  </button>
                </div>
              </div>
            ) : (
              /* Tripo Four-View + Native .glb 3D Model Studio */
              (() => {
                const activeGlb =
                  TRIPO_GLB_ASSETS.find(item => item.id === selectedGlbId) ?? TRIPO_GLB_ASSETS[0];
                return (
                  <div className="mt-3 space-y-2.5" data-testid="tripo-glb-studio">
                    {/* 5 Asset Selector Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {TRIPO_GLB_ASSETS.map(asset => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => setSelectedGlbId(asset.id)}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                            selectedGlbId === asset.id
                              ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                              : "border-white/10 bg-slate-800/80 text-slate-300 hover:text-white"
                          }`}
                        >
                          {asset.icon} {asset.id}.glb
                        </button>
                      ))}
                    </div>

                    {/* Side-by-Side: Left = <model-viewer> 3D .glb Turntable, Right = OpenLux 2x2 Four-View Sheet */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="relative h-48 overflow-hidden rounded-xl border border-cyan-400/40 bg-slate-950 p-2">
                        <div className="relative z-10 flex items-center justify-between text-[10px] font-bold text-cyan-300">
                          <span>{isEn ? "3D PBR .GLB MESH" : "3D 原生 .glb 网格"}</span>
                          <span>{activeGlb.faceCount} tris</span>
                        </div>
                        {createElement("model-viewer", {
                          src: activeGlb.glbUrl,
                          poster: activeGlb.sheetUrl,
                          alt: isEn ? activeGlb.nameEn : activeGlb.nameZh,
                          "camera-controls": "true",
                          "auto-rotate": "true",
                          "shadow-intensity": "1",
                          style: { width: "100%", height: "152px", backgroundColor: "transparent" },
                        })}
                      </div>

                      <div className="relative h-48 overflow-hidden rounded-xl border border-amber-400/40 bg-white p-1.5">
                        <div className="rounded bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                          {isEn ? "OpenLux 2×2 Four-View Sheet" : "OpenLux 2×2 正交四视图原图"}
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeGlb.sheetUrl}
                          alt={isEn ? activeGlb.nameEn : activeGlb.nameZh}
                          className="mx-auto mt-1 h-36 w-36 object-contain"
                        />
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="rounded-xl border border-white/10 bg-slate-950/80 p-2.5 text-[11px]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-white">
                          {activeGlb.icon} {isEn ? activeGlb.nameEn : activeGlb.nameZh}
                        </span>
                        <a
                          href={activeGlb.glbUrl}
                          download={`${activeGlb.id}.glb`}
                          className="rounded-lg bg-cyan-500/20 px-2 py-0.5 font-bold text-cyan-300 hover:bg-cyan-500/30"
                        >
                          ⬇ {isEn ? `Download ${activeGlb.id}.glb` : `下载 ${activeGlb.id}.glb`}
                        </a>
                      </div>
                      <div className="mt-1 text-slate-400">
                        Tripo v3.1 Task: <code>{activeGlb.tripoTaskId.slice(0, 18)}...</code> · SHA256:{" "}
                        <code>{activeGlb.sha256Prefix}</code> · {activeGlb.vertexCount} verts
                      </div>
                      <div className="mt-1 line-clamp-2 text-[10px] text-slate-300" title={activeGlb.promptZh}>
                        Prompt: {activeGlb.promptZh}
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* Prize Pool & Latest Pull Card */}
          <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
            {lastWonPrize && (
              <div className="rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-fuchsia-500/20 p-2.5 text-xs">
                <div className="font-black text-amber-300">
                  {lastWonPrize.icon} [{lastWonPrize.rarity}] {isEn ? lastWonPrize.nameEn : lastWonPrize.nameZh}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-200">
                  {isEn ? lastWonPrize.descEn : lastWonPrize.descZh}
                </div>
              </div>
            )}
            <div className="text-[11px] font-semibold text-slate-400">
              {isEn
                ? "Capsule Pool: 🐉 UR ($100 Flagship, 3%) · 🔋 SSR ($50 + 3D Voucher, 12%) · 🌾 SR ($40 + Market Voucher, 30%) · 🦖 R ($25 Flash, 55%)"
                : "奖池一览：🐉 UR 紫金龙蛋($100旗舰, 3%) · 🔋 SSR 4090饼干($50+3D建模券, 12%) · 🌾 SR 黄金麦穗($40+市场券, 30%) · 🦖 R 薄荷星龙($25保底, 55%)"}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): 4-Tab Gamified Quest & Counter-Intuitive Easter Egg Center */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/15 bg-slate-900/90 p-4 lg:col-span-7">
          <div>
            {/* Category Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    {
                      id: "daily",
                      labelZh: "📅 每日活跃任务",
                      labelEn: "📅 Daily Quests",
                    },
                    {
                      id: "weekly",
                      labelZh: "🛠️ 每周与市场变现",
                      labelEn: "🛠️ Weekly & Market",
                    },
                    {
                      id: "agri",
                      labelZh: "🌾 农客松 M1-M4 ($600)",
                      labelEn: "🌾 AgriHackathon M1-M4",
                    },
                    {
                      id: "secret",
                      labelZh: `🦖 6大反常识彩蛋 (${unlockedSecretCount}/6)`,
                      labelEn: `🦖 6 Secret Easter Eggs (${unlockedSecretCount}/6)`,
                    },
                  ] as const
                ).map(tabItem => (
                  <button
                    key={tabItem.id}
                    type="button"
                    onClick={() => setActiveCategory(tabItem.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      activeCategory === tabItem.id
                        ? "bg-white text-slate-950 shadow"
                        : "bg-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {isEn ? tabItem.labelEn : tabItem.labelZh}
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-semibold text-emerald-300">
                {isEn ? `🔥 Streak: ${state.streakDays} Day(s)` : `🔥 连续备赛打卡：${state.streakDays} 天`}
              </span>
            </div>

            {/* Quest Cards List */}
            <div className="mt-3 space-y-2.5">
              {filteredQuests.map(quest => {
                const claimed = isQuestClaimedToday(state, quest);
                const progress = state.questProgress[quest.id] ?? 0;
                const pts = quest.unlockUsd * POINTS_PER_USD;

                return (
                  <div
                    key={quest.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 transition ${
                      claimed
                        ? "border-emerald-500/40 bg-emerald-950/25"
                        : "border-white/10 bg-slate-950/60 hover:border-amber-400/40"
                    }`}
                  >
                    <div className="min-w-[220px] flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg">{quest.icon}</span>
                        <h4 className="text-sm font-bold text-white">
                          {isEn ? quest.titleEn : quest.titleZh}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            quest.unlockPool === "flagship"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          +${quest.unlockUsd} ({pts} {isEn ? "pts" : "积分"})
                        </span>
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-200">
                          +{quest.rewardTokens}🎟️ +{quest.rewardStarBeans}🪙
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-300">
                        {isEn ? quest.descEn : quest.descZh}
                      </p>
                      {(quest.hintZh || quest.hintEn) && (
                        <p className="text-[11px] font-medium text-amber-300/90">
                          💡 {isEn ? quest.hintEn : quest.hintZh}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {quest.id === "daily_vibehub_read" && !claimed && (
                        <button
                          type="button"
                          onClick={() => setVibeTimerRunning(true)}
                          disabled={vibeTimerRunning}
                          className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25"
                        >
                          {vibeTimerRunning
                            ? `⏱️ ${state.vibehubReadSeconds}s / 60s...`
                            : isEn
                              ? "⚡ Start 60s Timer"
                              : "⚡ 启动 60 秒沉浸计时"}
                        </button>
                      )}

                      {quest.href && (
                        <Link
                          href={quest.href}
                          className="rounded-xl border border-white/15 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                        >
                          {isEn ? "Go →" : "前往 →"}
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => handleClaimQuest(quest)}
                        disabled={claimed}
                        data-testid={`claim-quest-${quest.id}`}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                          claimed
                            ? "cursor-default bg-emerald-500/20 text-emerald-300"
                            : "bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 shadow hover:brightness-110"
                        }`}
                      >
                        {claimed
                          ? isEn
                            ? "✓ Unlocked"
                            : "✓ 已解锁入账"
                          : progress > 0 && quest.targetCount > 1
                            ? `${ isEn ? "Claim" : "打卡领奖" } (${Math.min(progress, quest.targetCount)}/${quest.targetCount})`
                            : isEn
                              ? "Unlock & Claim"
                              : "一键打卡提现"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Note: Anti-Abuse & Model Scope Protection */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-[11px] text-slate-400">
            <span>
              {isEn
                ? "🛡️ Anti-Abuse Guard: Unlocked welfare points are strictly scoped to their designated models (DeepSeek V4.1 Flash / Flagship Trio) and cannot be transferred."
                : "🛡️ 防薅风控说明：福利金库解锁的积分严格绑定对应模型（DeepSeek V4.1 Flash / 农客松三大旗舰模型），不可跨池混用或转赠提现。"}
            </span>
            <Link
              href="/competitions/agrihackathon"
              className="font-bold text-amber-300 hover:underline"
            >
              {isEn ? "View CAU AgriHackathon Hub →" : "前往中国农大农客松赛事大厅 →"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
