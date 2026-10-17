"use client";

import { useEffect, useRef, useState } from "react";
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
  shortTag: string;
  labelZh: string;
  labelEn: string;
  x: number; // 14..86 (%)
  z: number; // 20..82 (%)
  glbId: TripoGlbAssetId;
}

export type TripoGlbAssetId =
  | "claw-cabinet"
  | "claw-arm"
  | "ur-dragon-egg"
  | "ssr-4090-cookie"
  | "sr-golden-wheat"
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
  accentRgb: [number, number, number];
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
    accentRgb: [245, 158, 11],
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
    accentRgb: [56, 189, 248],
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
    accentRgb: [251, 191, 36],
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
    accentRgb: [245, 158, 11],
    promptZh:
      "生成用于三维重建的单个SSR级显卡造型夹心饼干扭蛋正交四视图资产表。严格2×2等大四宫格：左上正面、右上背面、左下左侧、右下右侧。结构为圆角厚实长方体潮玩饼干造型，外层为烤金黄色曲奇脆皮与黑巧装甲边框，正面雕刻两个对称翠绿薄荷奶油涡轮风扇浮雕，底部边缘露出一排闪亮金色曲奇插脚，背面为方格华夫饼干背板纹路，中间夹有饱满翠绿荧光奶油层。",
  },
  {
    id: "sr-golden-wheat",
    icon: "🌾",
    nameZh: "SR 农大黄金麦穗胶囊 ($40 / 400 积分)",
    nameEn: "SR CAU Golden Wheat Capsule ($40 / 400 Pts)",
    roleZh: "琥珀金星轨底座 + 重穗黄金麦浪 + 翡翠叶徽章",
    roleEn: "Amber star-orbit base + sculpted golden wheat + emerald leaf crest",
    glbUrl: "/arcade-3d/sr-golden-wheat.glb",
    sheetUrl: "/arcade-3d/sheets/sr-golden-wheat.png",
    tripoTaskId: "cau-wheat-capsule-v1-29558a28e926",
    sha256Prefix: "29558a28e926",
    vertexCount: 5329,
    faceCount: 10368,
    fallbackRgb: [245, 158, 11],
    accentRgb: [16, 185, 129],
    promptZh:
      "生成用于三维重建的单个SR级中国农大黄金麦穗胶囊扭蛋正交四视图资产表。严格2×2等大四宫格：左上正面、右上背面、左下左侧、右下右侧。结构为圆润胶囊形3D潮玩盲盒，下半部为琥珀金金属底座并环绕一圈翠绿农林星轨浮雕，上半部为立体饱满的金黄色重穗麦浪雕塑，正面中央镶嵌一枚翡翠绿叶子徽章，背面为对称饱满的黄金麦粒纹理。",
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
    accentRgb: [251, 191, 36],
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
  uv: [number, number];
}

export interface ParsedGlbMesh {
  assetId: TripoGlbAssetId;
  vertexCount: number;
  triangleCount: number;
  triangles: ParsedGlbTriangle[];
  baseColorImageBytes?: Uint8Array;
  baseColorMimeType?: string;
  textureApplied?: boolean;
}

const glbMeshCache = new Map<TripoGlbAssetId, ParsedGlbMesh>();
const glbLoadingPromises = new Map<TripoGlbAssetId, Promise<ParsedGlbMesh | null>>();

export function parseGlbBinaryMesh(
  assetId: TripoGlbAssetId,
  buffer: ArrayBuffer,
  fallbackRgb: [number, number, number],
  maxRenderTriangles = 520,
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
  const uvAcc =
    prim.attributes?.TEXCOORD_0 !== undefined ? gltf.accessors?.[prim.attributes.TEXCOORD_0] : null;
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
  const uvs = uvAcc ? (getBufferSlice(uvAcc) as Float32Array | null) : null;
  const indices = getBufferSlice(indAcc) as Uint32Array | Uint16Array | null;
  if (!positions || !indices) return null;

  // Normalize bounding box to unit sphere/cube [-0.5, +0.5] centered at (0,0,0)
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  if (Array.isArray(posAcc.min) && Array.isArray(posAcc.max) && posAcc.min.length === 3) {
    [minX, minY, minZ] = posAcc.min;
    [maxX, maxY, maxZ] = posAcc.max;
  } else {
    for (let i = 0; i < positions.length; i += 3) {
      const px = positions[i];
      const py = positions[i + 1];
      const pz = positions[i + 2];
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (pz < minZ) minZ = pz;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
      if (pz > maxZ) maxZ = pz;
    }
  }
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const maxSpan = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 0.001);
  const normScale = 1.0 / maxSpan;

  const assetMeta = TRIPO_GLB_ASSETS.find(a => a.id === assetId);
  const accentRgb: [number, number, number] = assetMeta?.accentRgb ?? [251, 191, 36];

  const normVert = (rawIdx: number): [number, number, number] => [
    (positions[rawIdx] - cx) * normScale,
    (positions[rawIdx + 1] - cy) * normScale,
    (positions[rawIdx + 2] - cz) * normScale,
  ];

  const totalTriCount = Math.floor(indices.length / 3);
  const step = Math.max(1, Math.floor(totalTriCount / maxRenderTriangles));
  const triangles: ParsedGlbTriangle[] = [];

  for (let t = 0; t < totalTriCount; t += step) {
    const vi0 = indices[t * 3];
    const vi1 = indices[t * 3 + 1];
    const vi2 = indices[t * 3 + 2];
    const i0 = vi0 * 3;
    const i1 = vi1 * 3;
    const i2 = vi2 * 3;

    const v0 = normVert(i0);
    const v1 = normVert(i1);
    const v2 = normVert(i2);

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

    let u = 0.5;
    let v = 0.5;
    if (uvs) {
      u = (uvs[vi0 * 2] + uvs[vi1 * 2] + uvs[vi2 * 2]) / 3;
      v = (uvs[vi0 * 2 + 1] + uvs[vi1 * 2 + 1] + uvs[vi2 * 2 + 1]) / 3;
      u = ((u % 1) + 1) % 1;
      v = ((v % 1) + 1) % 1;
    }

    // Multi-tone procedural shading (until embedded PBR baseColorTexture is decoded in browser)
    const avgY = (v0[1] + v1[1] + v2[1]) / 3;
    const radial = Math.hypot((v0[0] + v1[0] + v2[0]) / 3, (v0[2] + v1[2] + v2[2]) / 3);
    const bandMix = Math.max(
      0,
      Math.min(1, 0.5 + 0.5 * Math.sin(avgY * 9.5 + radial * 5.0 + u * 3.14)),
    );
    const baseR = fallbackRgb[0] * (1 - bandMix * 0.42) + accentRgb[0] * (bandMix * 0.42);
    const baseG = fallbackRgb[1] * (1 - bandMix * 0.42) + accentRgb[1] * (bandMix * 0.42);
    const baseB = fallbackRgb[2] * (1 - bandMix * 0.42) + accentRgb[2] * (bandMix * 0.42);
    const lift = Math.max(0.74, Math.min(1.3, 1.02 + avgY * 0.48));
    const rgb: [number, number, number] = [
      Math.min(255, Math.round(baseR * lift)),
      Math.min(255, Math.round(baseG * lift)),
      Math.min(255, Math.round(baseB * lift)),
    ];

    triangles.push({ v0, v1, v2, normal: [nx, ny, nz], rgb, uv: [u, v] });
  }

  let baseColorImageBytes: Uint8Array | undefined;
  let baseColorMimeType: string | undefined;
  const imgDef = gltf.images?.[0];
  if (imgDef && typeof imgDef.bufferView === "number") {
    const bv = gltf.bufferViews?.[imgDef.bufferView];
    if (bv && typeof bv.byteLength === "number") {
      const start = binOffset + (bv.byteOffset ?? 0);
      if (start + bv.byteLength <= buffer.byteLength) {
        baseColorImageBytes = new Uint8Array(buffer, start, bv.byteLength);
        baseColorMimeType = imgDef.mimeType || "image/jpeg";
      }
    }
  }

  return {
    assetId,
    vertexCount: posAcc.count,
    triangleCount: totalTriCount,
    triangles,
    baseColorImageBytes,
    baseColorMimeType,
  };
}

async function decodeEmbeddedGlbTexture(mesh: ParsedGlbMesh): Promise<void> {
  if (
    mesh.textureApplied ||
    !mesh.baseColorImageBytes ||
    typeof window === "undefined" ||
    typeof createImageBitmap !== "function"
  ) {
    return;
  }
  try {
    const copyBytes = new Uint8Array(mesh.baseColorImageBytes.byteLength);
    copyBytes.set(mesh.baseColorImageBytes);
    const blob = new Blob([copyBytes.buffer], {
      type: mesh.baseColorMimeType || "image/jpeg",
    });
    const bmp = await createImageBitmap(blob);
    const texSize = 128;
    const offCanvas = document.createElement("canvas");
    offCanvas.width = texSize;
    offCanvas.height = texSize;
    const ctx = offCanvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(bmp, 0, 0, texSize, texSize);
    const imgData = ctx.getImageData(0, 0, texSize, texSize).data;
    for (const tri of mesh.triangles) {
      const tx = Math.max(0, Math.min(texSize - 1, Math.floor(tri.uv[0] * texSize)));
      const ty = Math.max(0, Math.min(texSize - 1, Math.floor(tri.uv[1] * texSize)));
      const idx = (ty * texSize + tx) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      // Boost saturation/brightness slightly if texture pixel is very dark
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const boost = luma < 45 ? 1.45 : luma < 90 ? 1.18 : 1.05;
      tri.rgb = [
        Math.min(255, Math.round(r * boost)),
        Math.min(255, Math.round(g * boost)),
        Math.min(255, Math.round(b * boost)),
      ];
    }
    mesh.textureApplied = true;
    mesh.baseColorImageBytes = undefined;
  } catch {
    // Keep procedural multi-tone fallback
  }
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
    .then(async buf => {
      if (!buf) return null;
      const parsed = parseGlbBinaryMesh(meta.id, buf, meta.fallbackRgb, 900);
      if (parsed) {
        await decodeEmbeddedGlbTexture(parsed);
        glbMeshCache.set(meta.id, parsed);
      }
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
    shortTag: "UR $100",
    labelZh: "UR 紫金龙蛋 ($100)",
    labelEn: "UR Dragon Egg ($100)",
    x: 50,
    z: 52,
    glbId: "ur-dragon-egg",
  },
  {
    id: "cap-ssr-1",
    rarity: "SSR",
    icon: "🔋",
    shortTag: "SSR $50",
    labelZh: "SSR 4090 显卡饼干 ($50)",
    labelEn: "SSR 4090 Cookie ($50)",
    x: 24,
    z: 36,
    glbId: "ssr-4090-cookie",
  },
  {
    id: "cap-ssr-2",
    rarity: "SSR",
    icon: "🧊",
    shortTag: "SSR 3D舱",
    labelZh: "SSR Tripo 3D 建模舱 ($50)",
    labelEn: "SSR Tripo 3D Pod ($50)",
    x: 76,
    z: 62,
    glbId: "claw-cabinet",
  },
  {
    id: "cap-sr-1",
    rarity: "SR",
    icon: "🌾",
    shortTag: "SR $40",
    labelZh: "SR 农大黄金麦穗 ($40)",
    labelEn: "SR Golden Wheat ($40)",
    x: 33,
    z: 72,
    glbId: "sr-golden-wheat",
  },
  {
    id: "cap-sr-2",
    rarity: "SR",
    icon: "🛠️",
    shortTag: "SR 市场券",
    labelZh: "SR 市场算力抵扣胶囊 ($40)",
    labelEn: "SR Market Voucher ($40)",
    x: 68,
    z: 28,
    glbId: "sr-golden-wheat",
  },
  {
    id: "cap-r-1",
    rarity: "R",
    icon: "🦖",
    shortTag: "R $25",
    labelZh: "R 薄荷星龙 ($25)",
    labelEn: "R Mint Dino ($25)",
    x: 18,
    z: 66,
    glbId: "mint-star-dino",
  },
  {
    id: "cap-r-2",
    rarity: "R",
    icon: "⚡",
    shortTag: "R $25",
    labelZh: "R 极速 Flash 能量球 ($25)",
    labelEn: "R Flash Orb ($25)",
    x: 82,
    z: 38,
    glbId: "mint-star-dino",
  },
];

const CAPSULE_PALETTE: Record<PrizeRarity, { shell: string; glow: string; core: string }> = {
  UR: { shell: "rgba(245, 158, 11, 0.92)", glow: "rgba(217, 70, 239, 0.65)", core: "#fde047" },
  SSR: { shell: "rgba(16, 185, 129, 0.92)", glow: "rgba(6, 182, 212, 0.65)", core: "#6ee7b7" },
  SR: { shell: "rgba(249, 115, 22, 0.9)", glow: "rgba(251, 191, 36, 0.55)", core: "#fed7aa" },
  R: { shell: "rgba(56, 189, 248, 0.88)", glow: "rgba(99, 102, 241, 0.5)", core: "#bae6fd" },
};

function DinoClaw3DViewport({
  clawX,
  clawZ,
  clawPhase,
  targetedCapsuleId,
  onSelectCapsule,
}: {
  clawX: number;
  clawZ: number;
  clawPhase: "idle" | "dropping" | "grabbing" | "lifting";
  targetedCapsuleId: string;
  onSelectCapsule: (cap: CapsuleItem) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetRef = useRef({ x: clawX, z: clawZ, phase: clawPhase, targetedCapsuleId });
  const meshesRef = useRef<Map<TripoGlbAssetId, ParsedGlbMesh>>(glbMeshCache);
  const screenCapsulesRef = useRef<Array<{ cap: CapsuleItem; sx: number; sy: number; r: number }>>([]);

  useEffect(() => {
    targetRef.current = { x: clawX, z: clawZ, phase: clawPhase, targetedCapsuleId };
  }, [clawX, clawZ, clawPhase, targetedCapsuleId]);

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

    const project3D = (wx: number, wy: number, wz: number, w: number, h: number) => {
      const camY = 1.45;
      const camZ = 4.05;
      const pitch = 0.33;
      const dy = wy - camY;
      const dz = wz - camZ;
      const ry = dy * Math.cos(pitch) - dz * Math.sin(pitch);
      const rz = dy * Math.sin(pitch) + dz * Math.cos(pitch);
      const depth = Math.max(0.8, -rz);
      const fov = Math.min(w, h) * 1.24;
      return {
        sx: w * 0.5 + (wx / depth) * fov,
        sy: h * 0.54 - (ry / depth) * fov,
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
      alpha = 0.96,
      wireOverlay = false,
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
        const diffuse = Math.max(0.44, Math.min(1.32, 0.66 + rnx * 0.3 + rny * 0.42 - rnz * 0.26));
        const spec = Math.pow(Math.max(0, rny * 0.6 - rnz * 0.8), 6) * 36;
        const r = Math.min(255, Math.round(tri.rgb[0] * diffuse + spec));
        const g = Math.min(255, Math.round(tri.rgb[1] * diffuse + spec));
        const b = Math.min(255, Math.round(tri.rgb[2] * diffuse + spec));
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
        if (wireOverlay) {
          ctx.strokeStyle = "rgba(255,255,255,0.12)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    };

    const renderFrame = (timeMs: number) => {
      if (disposed || !canvasRef.current) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvasRef.current.clientWidth || 380;
      const h = canvasRef.current.clientHeight || 236;
      if (
        canvasRef.current.width !== Math.round(w * dpr) ||
        canvasRef.current.height !== Math.round(h * dpr)
      ) {
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

      curX += (targetWorldX - curX) * 0.15;
      curZ += (targetWorldZ - curZ) * 0.15;
      const desiredDrop =
        phase === "dropping" || phase === "grabbing" ? 1.0 : phase === "lifting" ? 0.32 : 0;
      curDrop += (desiredDrop - curDrop) * 0.16;
      const desiredClose = phase === "grabbing" || phase === "lifting" ? 0.45 : 0;
      curClose += (desiredClose - curClose) * 0.18;

      // 0. Draw Subtle 3D Cabinet Background Silhouette if claw-cabinet.glb is loaded
      const cabinetMesh = meshesRef.current.get("claw-cabinet");
      if (cabinetMesh) {
        drawGlbInstance(cabinetMesh, 0, 0.14, -1.05, 2.2, 0, w, h, 0.18);
      }

      // 1. Draw 3D Perspective Cyber-Agri Floor Grid
      const floorY = -0.68;
      ctx.lineWidth = 1;
      for (let i = -5; i <= 5; i++) {
        const gx = i * 0.36;
        const p1 = project3D(gx, floorY, -1.35, w, h);
        const p2 = project3D(gx, floorY, 1.35, w, h);
        ctx.strokeStyle = i === 0 ? "rgba(52, 211, 153, 0.4)" : "rgba(148, 163, 184, 0.16)";
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      }
      for (let j = -4; j <= 4; j++) {
        const gz = j * 0.33;
        const p1 = project3D(-1.8, floorY, gz, w, h);
        const p2 = project3D(1.8, floorY, gz, w, h);
        ctx.strokeStyle = j === 0 ? "rgba(251, 191, 36, 0.32)" : "rgba(148, 163, 184, 0.16)";
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      }

      // 2. Draw 3D Target Laser Reticle on Floor
      const retCenter = project3D(curX, floorY + 0.02, curZ, w, h);
      const retRadius = Math.max(14, retCenter.scale * (0.28 + Math.sin(t * 4) * 0.025));
      ctx.save();
      ctx.translate(retCenter.sx, retCenter.sy);
      ctx.scale(1, 0.5);
      ctx.strokeStyle = "rgba(251, 191, 36, 0.92)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, retRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 3. Draw 3D Tripo .glb Prize Capsules sorted by depth (back-to-front)
      const sortedCapsules = INITIAL_CAPSULES.map((cap, idx) => {
        const wx = ((cap.x - 50) / 38) * 1.55;
        const wz = ((cap.z - 50) / 38) * 1.1;
        const isGrabbed =
          (phase === "grabbing" || phase === "lifting") &&
          cap.id === targetRef.current.targetedCapsuleId;
        const bob = Math.sin(t * 2.2 + idx * 0.9) * 0.035;
        const wy = isGrabbed ? 0.42 - curDrop * 0.82 : floorY + 0.28 + bob;
        const proj = project3D(wx, wy, wz, w, h);
        return { cap, wx, wy, wz, proj, idx };
      }).sort((a, b) => b.proj.depth - a.proj.depth);

      const nextScreenHits: Array<{ cap: CapsuleItem; sx: number; sy: number; r: number }> = [];

      for (const item of sortedCapsules) {
        const { cap, wx, wy, wz, proj, idx } = item;
        const pal = CAPSULE_PALETTE[cap.rarity];
        const r = Math.max(16, proj.scale * 0.3);
        const isTargeted = cap.id === targetRef.current.targetedCapsuleId;
        nextScreenHits.push({ cap, sx: proj.sx, sy: proj.sy, r: r * 1.25 });

        // Soft glowing pedestal halo beneath each 3D model
        const floorPedestal = project3D(wx, floorY + 0.01, wz, w, h);
        ctx.save();
        ctx.translate(floorPedestal.sx, floorPedestal.sy);
        ctx.scale(1, 0.48);
        ctx.fillStyle = isTargeted ? "rgba(251, 191, 36, 0.34)" : "rgba(16, 185, 129, 0.16)";
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const prizeGlb = meshesRef.current.get(cap.glbId);
        if (prizeGlb) {
          drawGlbInstance(
            prizeGlb,
            wx,
            wy,
            wz,
            isTargeted ? 0.78 : 0.68,
            t * 0.95 + idx * 1.05,
            w,
            h,
            0.98,
          );
        } else {
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
          grad.addColorStop(1, "rgba(15, 23, 42, 0.92)");

          ctx.save();
          ctx.shadowColor = pal.glow;
          ctx.shadowBlur = 14;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, r * 0.78, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Orbiting 3D Energy Ring around UR / SSR or targeted capsule
        if (cap.rarity === "UR" || cap.rarity === "SSR" || isTargeted) {
          ctx.save();
          ctx.translate(proj.sx, proj.sy);
          ctx.rotate(Math.sin(t * 1.6 + idx) * 0.32);
          ctx.scale(1, 0.42);
          ctx.strokeStyle = isTargeted ? "#fde047" : pal.core;
          ctx.lineWidth = isTargeted ? 2.2 : 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Crisp mini HUD tag below the 3D mesh (never covering the 3D mesh itself)
        const tagY = proj.sy + r * 0.85;
        ctx.save();
        ctx.font = "bold 9px system-ui, -apple-system, sans-serif";
        const label = `${cap.icon} ${cap.shortTag}`;
        const tw = ctx.measureText(label).width + 8;
        ctx.fillStyle = isTargeted ? "rgba(251, 191, 36, 0.95)" : "rgba(15, 23, 42, 0.82)";
        ctx.beginPath();
        ctx.roundRect(proj.sx - tw * 0.5, tagY - 7, tw, 13, 4);
        ctx.fill();
        ctx.fillStyle = isTargeted ? "#020617" : "#f8fafc";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, proj.sx, tagY - 0.5);
        ctx.restore();
      }

      screenCapsulesRef.current = nextScreenHits;

      // 4. Draw 3D Gantry Rail, Telescopic Cable & Tripo claw-arm.glb 3D Mechanical Claw
      const railLeft = project3D(-1.75, 0.94, curZ, w, h);
      const railRight = project3D(1.75, 0.94, curZ, w, h);
      ctx.strokeStyle = "rgba(251, 191, 36, 0.82)";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(railLeft.sx, railLeft.sy);
      ctx.lineTo(railRight.sx, railRight.sy);
      ctx.stroke();

      const carriageProj = project3D(curX, 0.94, curZ, w, h);
      const clawY = 0.64 - curDrop * 0.92;
      const clawHeadProj = project3D(curX, clawY, curZ, w, h);

      // Gantry carriage block
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.roundRect(carriageProj.sx - 12, carriageProj.sy - 4, 24, 8, 4);
      ctx.fill();

      // Vertical laser aim beam from claw to floor
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(251, 191, 36, 0.42)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(clawHeadProj.sx, clawHeadProj.sy);
      ctx.lineTo(retCenter.sx, retCenter.sy);
      ctx.stroke();
      ctx.restore();

      // Steel Cable
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(carriageProj.sx, carriageProj.sy);
      ctx.lineTo(clawHeadProj.sx, clawHeadProj.sy);
      ctx.stroke();

      const clawArmMesh = meshesRef.current.get("claw-arm");
      if (clawArmMesh) {
        drawGlbInstance(clawArmMesh, curX, clawY - 0.18, curZ, 0.84, t * 0.55, w, h, 0.98);
      } else {
        const hubR = Math.max(7, clawHeadProj.scale * 0.12);
        for (let i = 0; i < 3; i++) {
          const angle = t * 0.6 + (i * Math.PI * 2) / 3;
          const spread = (0.24 - curClose * 0.22) * clawHeadProj.scale;
          const elbowX = clawHeadProj.sx + Math.cos(angle) * spread;
          const elbowY = clawHeadProj.sy + hubR * 1.15;
          const tipX = clawHeadProj.sx + Math.cos(angle) * spread * (0.55 - curClose * 0.4);
          const tipY = clawHeadProj.sy + hubR * 2.35;

          ctx.strokeStyle = i === 0 ? "#38bdf8" : "#f8fafc";
          ctx.lineWidth = 2.6;
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
      onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        let bestCap: CapsuleItem | null = null;
        let bestDist = Infinity;
        for (const item of screenCapsulesRef.current) {
          const d = Math.hypot(item.sx - clickX, item.sy - clickY);
          if (d < bestDist) {
            bestDist = d;
            bestCap = item.cap;
          }
        }
        if (bestCap) {
          onSelectCapsule(bestCap);
        }
      }}
      className="absolute inset-0 z-[5] h-full w-full cursor-crosshair"
    />
  );
}

function GlbInteractiveTurntable({
  asset,
  isEn,
}: {
  asset: TripoGlbAssetMeta;
  isEn: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const orbitRef = useRef({ yaw: 0.45, pitch: 0.24, dragging: false, lastX: 0, lastY: 0 });
  const meshRef = useRef<ParsedGlbMesh | null>(glbMeshCache.get(asset.id) ?? null);

  useEffect(() => {
    meshRef.current = glbMeshCache.get(asset.id) ?? null;
    void fetchAndParseGlbAsset(asset).then(m => {
      if (m) meshRef.current = m;
    });
  }, [asset]);

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

    const renderTurntable = () => {
      if (disposed || !canvasRef.current || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvasRef.current.clientWidth || 220;
      const h = canvasRef.current.clientHeight || 176;
      if (
        canvasRef.current.width !== Math.round(w * dpr) ||
        canvasRef.current.height !== Math.round(h * dpr)
      ) {
        canvasRef.current.width = Math.round(w * dpr);
        canvasRef.current.height = Math.round(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      if (autoRotate && !orbitRef.current.dragging) {
        orbitRef.current.yaw += 0.018;
      }

      const yaw = orbitRef.current.yaw;
      const pitch = orbitRef.current.pitch;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      // Draw glowing 3D turntable ring at bottom
      const cx = w * 0.5;
      const cy = h * 0.54;
      const radius = Math.min(w, h) * 0.36;

      ctx.save();
      ctx.translate(cx, cy + radius * 0.72);
      ctx.scale(1, 0.34);
      const baseGrad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius * 1.15);
      baseGrad.addColorStop(0, `rgba(${asset.fallbackRgb[0]}, ${asset.fallbackRgb[1]}, ${asset.fallbackRgb[2]}, 0.38)`);
      baseGrad.addColorStop(0.7, `rgba(${asset.accentRgb[0]}, ${asset.accentRgb[1]}, ${asset.accentRgb[2]}, 0.16)`);
      baseGrad.addColorStop(1, "rgba(15, 23, 42, 0)");
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(${asset.fallbackRgb[0]}, ${asset.fallbackRgb[1]}, ${asset.fallbackRgb[2]}, 0.75)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const mesh = meshRef.current;
      if (mesh && mesh.triangles.length > 0) {
        const projVert = (v: [number, number, number]) => {
          const rx = v[0] * cosY - v[2] * sinY;
          const rz0 = v[0] * sinY + v[2] * cosY;
          const ry = v[1] * cosP - rz0 * sinP;
          const rz = v[1] * sinP + rz0 * cosP;
          const depth = Math.max(1.1, 2.35 - rz);
          const fov = Math.min(w, h) * 1.55;
          return {
            sx: cx + (rx / depth) * fov,
            sy: cy - (ry / depth) * fov,
            depth,
          };
        };

        const tris = mesh.triangles.map(tri => {
          const p0 = projVert(tri.v0);
          const p1 = projVert(tri.v1);
          const p2 = projVert(tri.v2);
          const rnx = tri.normal[0] * cosY - tri.normal[2] * sinY;
          const rnz0 = tri.normal[0] * sinY + tri.normal[2] * cosY;
          const rny = tri.normal[1] * cosP - rnz0 * sinP;
          const rnz = tri.normal[1] * sinP + rnz0 * cosP;
          const diff = Math.max(0.42, Math.min(1.35, 0.68 + rnx * 0.34 + rny * 0.44 + rnz * 0.25));
          const spec = Math.pow(Math.max(0, rny * 0.55 + rnz * 0.78), 7) * 44;
          const r = Math.min(255, Math.round(tri.rgb[0] * diff + spec));
          const g = Math.min(255, Math.round(tri.rgb[1] * diff + spec));
          const b = Math.min(255, Math.round(tri.rgb[2] * diff + spec));
          return {
            p0,
            p1,
            p2,
            avgDepth: (p0.depth + p1.depth + p2.depth) / 3,
            fill: `rgb(${r},${g},${b})`,
          };
        });

        tris.sort((a, b) => b.avgDepth - a.avgDepth);
        for (const t of tris) {
          ctx.beginPath();
          ctx.moveTo(t.p0.sx, t.p0.sy);
          ctx.lineTo(t.p1.sx, t.p1.sy);
          ctx.lineTo(t.p2.sx, t.p2.sy);
          ctx.closePath();
          if (wireframe) {
            ctx.strokeStyle = `rgba(${asset.fallbackRgb[0]}, ${asset.fallbackRgb[1]}, ${asset.fallbackRgb[2]}, 0.75)`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          } else {
            ctx.fillStyle = t.fill;
            ctx.fill();
          }
        }
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(renderTurntable);
    };

    rafId = window.requestAnimationFrame(renderTurntable);
    return () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [asset, autoRotate, wireframe]);

  return (
    <div className="relative flex h-52 flex-col justify-between overflow-hidden rounded-xl border border-cyan-500/40 bg-slate-950 p-2.5 text-slate-100">
      <div className="relative z-10 flex items-center justify-between text-[10px] font-bold text-cyan-300">
        <span>{isEn ? "3D PBR .GLB TURNTABLE" : "3D .glb 实时旋转检视"}</span>
        <span>
          {asset.vertexCount.toLocaleString()}v · {asset.faceCount.toLocaleString()} tris
        </span>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={e => {
          orbitRef.current.dragging = true;
          orbitRef.current.lastX = e.clientX;
          orbitRef.current.lastY = e.clientY;
        }}
        onPointerMove={e => {
          if (!orbitRef.current.dragging) return;
          const dx = e.clientX - orbitRef.current.lastX;
          const dy = e.clientY - orbitRef.current.lastY;
          orbitRef.current.lastX = e.clientX;
          orbitRef.current.lastY = e.clientY;
          orbitRef.current.yaw += dx * 0.015;
          orbitRef.current.pitch = Math.max(-0.6, Math.min(0.75, orbitRef.current.pitch + dy * 0.012));
        }}
        onPointerUp={() => {
          orbitRef.current.dragging = false;
        }}
        onPointerLeave={() => {
          orbitRef.current.dragging = false;
        }}
        className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
      />

      <div className="relative z-10 flex items-center justify-between gap-1 text-[10px]">
        <span className="text-slate-400">
          {isEn ? "Drag to orbit 360°" : "拖拽旋转 360°"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWireframe(prev => !prev)}
            className="rounded bg-slate-800/90 px-1.5 py-0.5 font-semibold text-cyan-200 hover:bg-slate-700"
          >
            {wireframe ? (isEn ? "Solid" : "实体") : isEn ? "Wireframe" : "线框"}
          </button>
          <button
            type="button"
            onClick={() => setAutoRotate(prev => !prev)}
            className="rounded bg-slate-800/90 px-1.5 py-0.5 font-semibold text-amber-200 hover:bg-slate-700"
          >
            {autoRotate ? (isEn ? "Pause" : "暂停") : isEn ? "Spin" : "自转"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ComputeQuestArcade({
  actorId,
  initialServerPoints,
}: {
  actorId?: string | null;
  initialServerPoints?: number | null;
}) {
  const locale = useLocale();
  const isEn = locale === "en";

  const [state, setState] = useState<QuestArcadeState>(() => loadQuestArcadeState(actorId));
  const [starBeans, setStarBeans] = useState<number>(() => loadSanctuaryState().starBeans);
  const [arcadeMode, setArcadeMode] = useState<"claw" | "roulette" | "glb">("claw");
  const [selectedGlbId, setSelectedGlbId] = useState<TripoGlbAssetId>("claw-cabinet");
  const [activeCategory, setActiveCategory] = useState<QuestCategory>("daily");

  // 3D Claw Machine state
  const [clawX, setClawX] = useState<number>(50);
  const [clawZ, setClawZ] = useState<number>(52);
  const [clawPhase, setClawPhase] = useState<"idle" | "dropping" | "grabbing" | "lifting">("idle");

  // Starlight Roulette state
  const [wheelAngle, setWheelAngle] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);

  // VibeHub 60s immersion timer simulation
  const [vibeTimerRunning, setVibeTimerRunning] = useState<boolean>(false);

  // Prize / Toast banner state
  const [lastWonPrize, setLastWonPrize] = useState<ArcadePrize | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string>("");
  const [serverBalancePoints, setServerBalancePoints] = useState<number | null>(
    typeof initialServerPoints === "number" ? initialServerPoints : null,
  );
  const [lastServerCredit, setLastServerCredit] = useState<ArcadeServerCreditedDetail | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const syncAll = () => {
      setState(loadQuestArcadeState(actorId));
      setStarBeans(loadSanctuaryState().starBeans);
    };
    const onServerCredited = (ev: Event) => {
      const detail = (ev as CustomEvent<ArcadeServerCreditedDetail>).detail;
      if (!detail) return;
      if (detail.errorCode === "QUEST_PREREQUISITE_NOT_MET") {
        setBannerMessage(
          isEn
            ? "📋 Local milestone progress recorded! Complete the verified AgriHackathon / Marketplace submission to credit live API Gateway points."
            : "📋 已记录本地里程碑进度 + 游乐币！完成农客松报名或作品上架真实核验后，对应积分将自动入账 API 网关。",
        );
        return;
      }
      if (detail.errorCode === "ARCADE_TOKENS_EXHAUSTED") {
        setBannerMessage(
          isEn
            ? "ℹ️ Server draw token limit reached. Complete more daily quests or Dino easter eggs to earn verified tokens!"
            : "ℹ️ 服务端可核验抓娃娃币已用尽，完成每日打卡或小恐龙隐藏彩蛋即可继续获赠真金白银积分！",
        );
        return;
      }
      if (typeof detail.balanceAfter === "number" && detail.balanceAfter >= 0) {
        setServerBalancePoints(detail.balanceAfter);
        setLastServerCredit(detail);
        if (detail.awardedPrizeId) {
          const authPrize = ARCADE_PRIZES.find(p => p.id === detail.awardedPrizeId);
          if (authPrize) {
            setLastWonPrize(authPrize);
          }
        }
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
  }, [actorId, isEn]);

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
    setClawZ(prev => Math.max(18, Math.min(82, prev + dz)));
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
          ? "⚠️ Out of Arcade Tokens! Complete any daily quest or Dino easter egg on the right to earn tokens."
          : "⚠️ 抓娃娃币不足！完成右侧任意每日任务或触发小恐龙反常识彩蛋即可免费领币。",
      );
      return;
    }

    setClawPhase("dropping");
    setLastWonPrize(null);

    const t1 = window.setTimeout(() => {
      setClawPhase("grabbing");
    }, 360);

    const t2 = window.setTimeout(() => {
      setClawPhase("lifting");
    }, 760);

    const t3 = window.setTimeout(() => {
      const outcome = drawArcadePrize("claw", actorId);
      setClawPhase("idle");
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
          ? "⚠️ Out of Arcade Tokens! Complete daily quests or Dino easter eggs on the right to earn tokens."
          : "⚠️ 星轨转盘币不足！完成右侧每日任务或小恐龙彩蛋即可免费获取。",
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
      className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-7"
    >
      {/* Top Header & Official Conversion Ratio Badge */}
      <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-2">
          <div className="inline-flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white dark:bg-emerald-500 dark:text-slate-950">
              {isEn ? "🎮 ANS × CAU AGRIHACKATHON ARCADE" : "🎮 ANS × 中国农大农客松 · 算力游乐场"}
            </span>
            <span className="rounded-full border border-emerald-600/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              {isEn
                ? `Official Ratio: 1 Point = ¥${CNY_PER_POINT.toFixed(2)} CNY = $${USD_PER_POINT.toFixed(2)} USD APIC Quota (10 Pts = $1)`
                : `官方计费锚定：1 积分 = ¥${CNY_PER_POINT.toFixed(2)} 元 = $${USD_PER_POINT.toFixed(2)} USD APIC 标称额度（10 积分 = $1）`}
            </span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {isEn
              ? "Compute Vault Progressive Unlock · 3D Dino Claw Machine & Quest Center"
              : "算力金库阶梯提现 · 3D 灵龙抓娃娃机 × 反常识彩蛋任务中心"}
          </h2>
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {isEn
              ? "Complete daily/weekly quests, AgriHackathon milestones (M1–M4), or discover the 6 counter-intuitive Dino Agent easter eggs to earn Arcade Tokens and unlock your $1,000 DeepSeek V4.1 Flash + $600 Flagship compute packs."
              : "完成每日打卡、VibeHub 充电、工作流市场上架、农客松 M1–M4 里程碑或触发右下角小恐龙 6 大反常识隐藏彩蛋，即可赚取游乐币，亲手抓出 $1,000 DeepSeek V4.1 Flash 与 $600 农客松顶配旗舰算力包！"}
          </p>
        </div>

        {/* Wallet Counters */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2 text-center">
            <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
              {isEn ? "API Gateway Live Points" : "API 网关真实可扣费积分"}
            </div>
            <div
              className="text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-300"
              data-testid="gateway-live-points"
            >
              💳{" "}
              {serverBalancePoints !== null
                ? serverBalancePoints.toLocaleString()
                : ((state.deepseekUnlockedUsd + state.flagshipUnlockedUsd) * POINTS_PER_USD).toLocaleString()}
              {lastServerCredit && !lastServerCredit.duplicate && lastServerCredit.grantedPoints > 0 ? (
                <span className="ml-1.5 rounded-full bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                  +{lastServerCredit.grantedPoints}
                </span>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2 text-center">
            <div className="text-[11px] font-medium text-amber-900 dark:text-amber-200">
              {isEn ? "Arcade Tokens" : "游乐场抓娃娃币"}
            </div>
            <div
              className="text-lg font-black tabular-nums text-amber-700 dark:text-amber-300"
              data-testid="arcade-token-count"
            >
              🎟️ {state.arcadeTokens}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-muted/40 px-3.5 py-2 text-center">
            <div className="text-[11px] font-medium text-muted-foreground">
              {isEn ? "Star Beans" : "灵龙灵感星豆"}
            </div>
            <div className="text-lg font-black tabular-nums text-foreground">🪙 {starBeans}</div>
          </div>
          <div className="rounded-2xl border border-border bg-muted/40 px-3.5 py-2 text-center">
            <div className="text-[11px] font-medium text-muted-foreground">
              {isEn ? "3D / Market Vouchers" : "3D建模 / 市场券"}
            </div>
            <div className="text-lg font-black tabular-nums text-foreground">
              🧊 {state.tripoFreeVouchers} · 🛠️ {state.marketDiscountVouchers}
            </div>
          </div>
        </div>
      </div>

      {/* Progressive Compute Vault Dual Progress Dashboard */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {/* Vault 1: $1,000 DeepSeek V4.1 Flash (10,000 Points) */}
        <div className="rounded-2xl border border-border bg-muted/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {isEn ? "Tier 1 · Universal Onboarding Vault" : "第一梯队 · 全民问卷算力金库"}
              </span>
              <h3 className="text-base font-semibold text-foreground">
                {isEn ? "$1,000 DeepSeek V4.1 Flash (10,000 Pts)" : "$1,000 DeepSeek V4.1 Flash（10,000 专项积分）"}
              </h3>
            </div>
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold tabular-nums text-emerald-800 dark:text-emerald-300">
              ${state.deepseekUnlockedUsd} / ${state.deepseekTotalUsd} ({state.deepseekUnlockedUsd * POINTS_PER_USD}{" "}
              {isEn ? "pts" : "积分"})
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-500 dark:bg-emerald-400"
              style={{ width: `${deepseekPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {isEn
                ? "Initial $50 (500 pts) unlocked · Unlock remaining $950 via Daily Quests & Claw Machine"
                : "首期已到账 $50（500 积分）· 剩余 $950（9,500 积分）通过每日任务与抓娃娃机实时提现"}
            </span>
            <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{deepseekPct}%</span>
          </div>
        </div>

        {/* Vault 2: $600 AgriHackathon Flagship Pack (6,000 Points) */}
        <div className="rounded-2xl border border-border bg-muted/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                {isEn ? "Tier 2 · CAU AgriHackathon Flagship Vault" : "第二梯队 · 农客松参赛顶配旗舰金库"}
              </span>
              <h3 className="text-base font-semibold text-foreground">
                {isEn
                  ? "$600 Flagship Pack (6,000 Pts: Terra / GPT-6.1 / Opus 5.5)"
                  : "$600 顶配旗舰包（6,000 积分：$300 Terra + $200 GPT-6.1 + $100 Opus 5.5）"}
              </h3>
            </div>
            <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold tabular-nums text-amber-800 dark:text-amber-300">
              ${state.flagshipUnlockedUsd} / ${state.flagshipTotalUsd} ({state.flagshipUnlockedUsd * POINTS_PER_USD}{" "}
              {isEn ? "pts" : "积分"})
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500 dark:bg-amber-400"
              style={{ width: `${flagshipPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {isEn
                ? "M1 Apply (20% $120) → M2 Code Host (30% $180) → M3 Wall Public (25% $150) → M4 5-Day Streak (25% $150)"
                : "M1 报名(20% $120) → M2 代码托管(30% $180) → M3 作品墙拉Star(25% $150) → M4 5天冲刺(25% $150)"}
            </span>
            <span className="font-bold tabular-nums text-amber-700 dark:text-amber-300">{flagshipPct}%</span>
          </div>
        </div>
      </div>

      {/* Live Toast / Status Banner */}
      {bannerMessage && (
        <div
          role="status"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-foreground sm:text-sm"
        >
          <span>{bannerMessage}</span>
          <button
            type="button"
            onClick={() => setBannerMessage("")}
            className="shrink-0 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
          >
            {isEn ? "Dismiss" : "收起"}
          </button>
        </div>
      )}

      {/* Main Split Grid: Left = 3D Claw Machine / Starlight Roulette Pod, Right = 4-Tab Gamified Quest Center */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Left Column (5 cols): 3D Claw Machine, Starlight Roulette & 4-View .glb Studio */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-muted/20 p-4 lg:col-span-5">
          <div>
            {/* Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex flex-wrap rounded-xl border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => setArcadeMode("claw")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    arcadeMode === "claw"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isEn ? "🕹️ 3D Dino Claw" : "🕹️ 3D 灵龙抓娃娃机"}
                </button>
                <button
                  type="button"
                  onClick={() => setArcadeMode("roulette")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    arcadeMode === "roulette"
                      ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-400 dark:text-slate-950"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isEn ? "🎡 Starlight Roulette" : "🎡 丰收星轨大转盘"}
                </button>
                <button
                  type="button"
                  data-testid="arcade-mode-glb"
                  onClick={() => setArcadeMode("glb")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    arcadeMode === "glb"
                      ? "bg-cyan-600 text-white shadow-sm dark:bg-cyan-400 dark:text-slate-950"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isEn ? "🧊 4-View + .glb 3D" : "🧊 四视图 + .glb 3D 舱"}
                </button>
              </div>
              <span className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[11px] font-bold text-purple-800 dark:text-purple-200">
                {isEn ? `SSR/UR Pity: ${state.pityCounter}/10` : `十连保底 SSR/UR：${state.pityCounter}/10`}
              </span>
            </div>

            {arcadeMode === "claw" ? (
              /* 3D Cyber-Agri Claw Machine Cabinet */
              <div className="mt-3">
                <div className="relative h-64 w-full overflow-hidden rounded-2xl border-2 border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100 shadow-inner">
                  {/* Top Neon Header */}
                  <div className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/55 px-3 py-1.5 text-[10px] font-bold text-amber-300">
                    <span>
                      {isEn
                        ? "TRIPO v3.1 MULTIVIEW .GLB RIG · 6 MODELS ACTIVE"
                        : "TRIPO v3.1 四视图 .GLB 实装 · 6 大 3D 资产已挂载"}
                    </span>
                    <span className="text-emerald-300">
                      {isEn ? `Locked: ${targetCapsule.labelEn}` : `已瞄准：${targetCapsule.labelZh}`}
                    </span>
                  </div>

                  {/* Pure 3D .glb Canvas Viewport (Cabinet + 7 3D Capsules + 3-Prong 3D Claw Arm) */}
                  <DinoClaw3DViewport
                    clawX={clawX}
                    clawZ={clawZ}
                    clawPhase={clawPhase}
                    targetedCapsuleId={targetCapsule.id}
                    onSelectCapsule={cap => {
                      if (clawPhase === "idle") {
                        setClawX(cap.x);
                        setClawZ(cap.z);
                      }
                    }}
                  />
                </div>

                {/* Quick Target Selector Pills for the 3D Capsules */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1">
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
                        className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold transition ${
                          isTargeted
                            ? "border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cap.icon} {cap.shortTag}
                      </button>
                    );
                  })}
                </div>

                {/* Joystick & Drop Claw Controls */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveClaw(-12, 0)}
                      className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      ◀ {isEn ? "Left" : "左移"}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveClaw(12, 0)}
                      className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      {isEn ? "Right" : "右移"} ▶
                    </button>
                    <button
                      type="button"
                      onClick={() => moveClaw(0, -12)}
                      className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      ▲ {isEn ? "Back" : "前推"}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveClaw(0, 12)}
                      className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      ▼ {isEn ? "Front" : "后拉"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleClawDrop}
                    disabled={clawPhase !== "idle"}
                    data-testid="claw-drop-button"
                    className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-black text-slate-950 shadow-sm transition hover:brightness-105 disabled:opacity-50"
                  >
                    {clawPhase === "idle"
                      ? isEn
                        ? "🕹️ DROP CLAW (1 Token · 100% Win)"
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
                <div className="relative flex h-64 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-800 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 p-4 text-slate-100">
                  {/* Top Pointer Needle */}
                  <div className="z-20 -mb-2 flex flex-col items-center">
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-slate-950 shadow">
                      ▼ {isEn ? "WIN POINTER" : "中奖指针"} ▼
                    </span>
                  </div>

                  {/* 8-Sector Conic-Gradient Wheel with Counter-Rotated Upright Badges */}
                  <div
                    className="relative flex h-44 w-44 items-center justify-center rounded-full border-4 border-amber-400/80 shadow-2xl transition-transform duration-700 ease-out"
                    style={{
                      transform: `rotate(${wheelAngle}deg)`,
                      background:
                        "conic-gradient(from -45deg, #4c1d95 0deg 90deg, #065f46 90deg 180deg, #78350f 180deg 270deg, #1e3a8a 270deg 360deg)",
                    }}
                  >
                    {/* Crosshair sector dividers */}
                    <div className="pointer-events-none absolute inset-0 rotate-45">
                      <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-amber-300/40" />
                      <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-amber-300/40" />
                    </div>

                    {ARCADE_PRIZES.map((prize, idx) => {
                      const angle = idx * 90;
                      const rad = (angle - 90) * (Math.PI / 180);
                      const tx = Math.round(Math.cos(rad) * 56);
                      const ty = Math.round(Math.sin(rad) * 56);
                      return (
                        <div
                          key={prize.id}
                          style={{
                            transform: `translate(${tx}px, ${ty}px) rotate(${-wheelAngle}deg)`,
                          }}
                          className="absolute flex flex-col items-center text-center transition-transform duration-700 ease-out"
                        >
                          <span className="text-xl leading-none drop-shadow">{prize.icon}</span>
                          <span className="mt-0.5 rounded bg-slate-950/90 px-1.5 py-0.5 text-[9px] font-black text-amber-200 ring-1 ring-amber-400/40">
                            {prize.rarity} · ${prize.unlockUsd}
                          </span>
                        </div>
                      );
                    })}
                    <div className="z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-300 bg-slate-950 text-[11px] font-black text-amber-300 shadow">
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
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:brightness-105 disabled:opacity-50 dark:bg-emerald-400 dark:text-slate-950"
                  >
                    {isEn ? "🎡 Spin 1x (1 Token)" : "🎡 单抽星轨转盘（1 币）"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRouletteSpin(5)}
                    disabled={isSpinning}
                    data-testid="roulette-spin-5"
                    className="rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-3 py-2 text-xs font-black text-white shadow-sm hover:brightness-105 disabled:opacity-50"
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
                    {/* 6 Asset Selector Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {TRIPO_GLB_ASSETS.map(asset => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => setSelectedGlbId(asset.id)}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                            selectedGlbId === asset.id
                              ? "border-cyan-600 bg-cyan-500/15 text-cyan-900 dark:border-cyan-400 dark:text-cyan-200"
                              : "border-border bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {asset.icon} {asset.id}.glb
                        </button>
                      ))}
                    </div>

                    {/* Side-by-Side: Left = Native Canvas 3D .glb Turntable, Right = OpenLux 2x2 Four-View Sheet */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <GlbInteractiveTurntable asset={activeGlb} isEn={isEn} />

                      <div className="relative flex h-52 flex-col justify-between overflow-hidden rounded-xl border border-amber-500/40 bg-white p-2 text-slate-900">
                        <div className="flex items-center justify-between rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          <span>{isEn ? "OpenLux 2×2 Four-View" : "OpenLux 2×2 正交四视图"}</span>
                          <span>F/B/L/R</span>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeGlb.sheetUrl}
                          alt={isEn ? activeGlb.nameEn : activeGlb.nameZh}
                          className="mx-auto my-auto h-36 w-36 object-contain"
                        />
                        <div className="text-center text-[10px] font-medium text-slate-500">
                          {isEn ? "Front · Back · Left · Right" : "左上正 · 右上背 · 左下左 · 右下右"}
                        </div>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="rounded-xl border border-border bg-background p-2.5 text-[11px]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-foreground">
                          {activeGlb.icon} {isEn ? activeGlb.nameEn : activeGlb.nameZh}
                        </span>
                        <a
                          href={activeGlb.glbUrl}
                          download={`${activeGlb.id}.glb`}
                          className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-bold text-cyan-800 hover:bg-cyan-500/20 dark:text-cyan-300"
                        >
                          ⬇ {isEn ? `Download ${activeGlb.id}.glb` : `下载 ${activeGlb.id}.glb`}
                        </a>
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        Tripo v3.1 Task: <code>{activeGlb.tripoTaskId.slice(0, 18)}...</code> · SHA256:{" "}
                        <code>{activeGlb.sha256Prefix}</code> · {activeGlb.vertexCount} verts
                      </div>
                      <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground" title={activeGlb.promptZh}>
                        Prompt: {activeGlb.promptZh}
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* Prize Pool & Latest Pull Card */}
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            {lastWonPrize && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
                <div className="font-black text-amber-800 dark:text-amber-300">
                  {lastWonPrize.icon} [{lastWonPrize.rarity}] {isEn ? lastWonPrize.nameEn : lastWonPrize.nameZh}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {isEn ? lastWonPrize.descEn : lastWonPrize.descZh}
                </div>
              </div>
            )}
            <div className="text-[11px] font-medium text-muted-foreground">
              {isEn
                ? "Capsule Pool: 🐉 UR ($100 Flagship, 3%) · 🔋 SSR ($50 + 3D Voucher, 12%) · 🌾 SR ($40 + Market Voucher, 30%) · 🦖 R ($25 Flash, 55%)"
                : "奖池一览：🐉 UR 紫金龙蛋($100旗舰, 3%) · 🔋 SSR 4090饼干($50+3D建模券, 12%) · 🌾 SR 黄金麦穗($40+市场券, 30%) · 🦖 R 薄荷星龙($25保底, 55%)"}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): 4-Tab Gamified Quest & Counter-Intuitive Easter Egg Center */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-muted/20 p-4 lg:col-span-7">
          <div>
            {/* Category Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
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
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                      activeCategory === tabItem.id
                        ? "border-foreground bg-foreground text-background shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isEn ? tabItem.labelEn : tabItem.labelZh}
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
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
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-border bg-background hover:border-amber-500/40"
                    }`}
                  >
                    <div className="min-w-[220px] flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg">{quest.icon}</span>
                        <h4 className="text-sm font-bold text-foreground">
                          {isEn ? quest.titleEn : quest.titleZh}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            quest.unlockPool === "flagship"
                              ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                              : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                          }`}
                        >
                          +${quest.unlockUsd} ({pts} {isEn ? "pts" : "积分"})
                        </span>
                        <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:text-purple-200">
                          +{quest.rewardTokens}🎟️ +{quest.rewardStarBeans}🪙
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {isEn ? quest.descEn : quest.descZh}
                      </p>
                      {(quest.hintZh || quest.hintEn) && (
                        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
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
                          className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-800 hover:bg-cyan-500/20 dark:text-cyan-200"
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
                          className="rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
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
                            ? "cursor-default border border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                            : "bg-emerald-600 text-white shadow-sm hover:brightness-105 dark:bg-emerald-400 dark:text-slate-950"
                        }`}
                      >
                        {claimed
                          ? isEn
                            ? "✓ Unlocked"
                            : "✓ 已解锁入账"
                          : progress > 0 && quest.targetCount > 1
                            ? `${isEn ? "Claim" : "打卡领奖"} (${Math.min(progress, quest.targetCount)}/${quest.targetCount})`
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
            <span>
              {isEn
                ? "🛡️ Anti-Abuse Guard: Unlocked welfare points are strictly scoped to their designated models (DeepSeek V4.1 Flash / Flagship Trio) and cannot be transferred."
                : "🛡️ 防薅风控说明：福利金库解锁的积分严格绑定对应模型（DeepSeek V4.1 Flash / 农客松三大旗舰模型），不可跨池混用或转赠提现。"}
            </span>
            <Link
              href="/competitions/agrihackathon"
              className="font-bold text-emerald-700 hover:underline dark:text-emerald-300"
            >
              {isEn ? "View CAU AgriHackathon Hub →" : "前往中国农大农客松赛事大厅 →"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
