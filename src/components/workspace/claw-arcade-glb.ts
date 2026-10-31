import type { PrizeRarity } from "@/domain/mascot/quest-arcade";

export interface CapsuleItem {
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
    roleZh: "八角星轨街机基座 + 钛金透明拱顶展示舱",
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
      "生成用于三维重建的单个赛博农林科技风太空抓娃娃机机身舱体正交四视图资产表。严格2×2等大四宫格：左上正面、右上背面、左下左侧、右下右侧。结构为圆润八角柱形街机机舱，下半部为深邃暗金与翠绿发光饰条基座（正面中央带内凹出物舱口与琥珀色摇杆凸台，背面为平整银灰散热装甲板），上半部为四根流线型钛金立柱支撑的透明拱顶展示舱框架。",
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
    nameZh: "UR 紫金星云龙蛋 ($30.0 / 300 积分)",
    nameEn: "UR Violet-Gold Dragon Egg ($30.0 / 300 Pts)",
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
    nameZh: "SSR 算力能量夹心饼干 ($8.0 / 80 积分)",
    nameEn: "SSR Compute Sandwich Cookie ($8.0 / 80 Pts)",
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
    nameZh: "SR 农大黄金麦穗胶囊 ($1.5 / 15 积分)",
    nameEn: "SR CAU Golden Wheat Capsule ($1.5 / 15 Pts)",
    roleZh: "琥珀金星轨基座 + 重穗黄金麦浪 + 翡翠叶徽章",
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
      "生成用于三维重建的单个SR级中国农大黄金麦穗胶囊扭蛋正交四视图资产表。严格2×2等大四宫格：左上正面、右上背面、左下左侧、右下右侧。结构为圆润胶囊形3D潮玩盲盒，下半部为琥珀金金属基座并环绕一圈翠绿农林星轨浮雕，上半部为立体饱满的金黄色重穗麦浪雕塑，正面中央镶嵌一枚翡翠绿叶子徽章，背面为对称饱满的黄金麦粒纹理。",
  },
  {
    id: "mint-star-dino",
    icon: "🦖",
    nameZh: "R 薄荷兔兔龙手办 ($1.0 / 10 积分)",
    nameEn: "R Mint Star Dino Figurine ($1.0 / 10 Pts)",
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
  spriteCache?: Map<number, HTMLCanvasElement>;
}

export const glbMeshCache = new Map<TripoGlbAssetId, ParsedGlbMesh>();
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

    const avgY = (v0[1] + v1[1] + v2[1]) / 3;
    const radial = Math.hypot((v0[0] + v1[0] + v2[0]) / 3, (v0[2] + v1[2] + v2[2]) / 3);
    const bandMix = Math.max(
      0,
      Math.min(1, 0.5 + 0.5 * Math.sin(avgY * 9.5 + radial * 5.0 + u * 3.14)),
    );
    const baseR = fallbackRgb[0] * (1 - bandMix * 0.42) + accentRgb[0] * (bandMix * 0.42);
    const baseG = fallbackRgb[1] * (1 - bandMix * 0.42) + accentRgb[1] * (bandMix * 0.42);
    const baseB = fallbackRgb[2] * (1 - bandMix * 0.42) + accentRgb[2] * (bandMix * 0.42);
    const lift = Math.max(0.78, Math.min(1.32, 1.04 + avgY * 0.48));
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
    spriteCache: new Map(),
  };
}

async function decodeEmbeddedGlbTexture(mesh: ParsedGlbMesh, meta: TripoGlbAssetMeta): Promise<void> {
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
      const tr = imgData[idx];
      const tg = imgData[idx + 1];
      const tb = imgData[idx + 2];
      const luma = 0.299 * tr + 0.587 * tg + 0.114 * tb;
      const envMix = luma < 65 ? 0.66 : luma < 120 ? 0.42 : 0.2;
      const avgY = (tri.v0[1] + tri.v1[1] + tri.v2[1]) / 3;
      const envR = avgY > -0.05 ? meta.fallbackRgb[0] : meta.accentRgb[0];
      const envG = avgY > -0.05 ? meta.fallbackRgb[1] : meta.accentRgb[1];
      const envB = avgY > -0.05 ? meta.fallbackRgb[2] : meta.accentRgb[2];
      const r = tr * (1 - envMix) + envR * envMix;
      const g = tg * (1 - envMix) + envG * envMix;
      const b = tb * (1 - envMix) + envB * envMix;
      tri.rgb = [
        Math.min(255, Math.round(r * 1.24 + 14)),
        Math.min(255, Math.round(g * 1.24 + 14)),
        Math.min(255, Math.round(b * 1.24 + 14)),
      ];
    }
    mesh.textureApplied = true;
    mesh.baseColorImageBytes = undefined;
    mesh.spriteCache?.clear();
  } catch {
    // Keep procedural multi-tone fallback
  }
}

export function renderGlbAngleSprite(mesh: ParsedGlbMesh, angleStep: number, totalSteps = 16): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  if (!mesh.spriteCache) mesh.spriteCache = new Map();
  const cached = mesh.spriteCache.get(angleStep);
  if (cached) return cached;

  const size = 156;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const yaw = (angleStep / totalSteps) * Math.PI * 2;
  const pitch = 0.24;
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const cx = size * 0.5;
  const cy = size * 0.52;
  const fov = size * 1.52;

  const projected: Array<{
    p0x: number;
    p0y: number;
    p1x: number;
    p1y: number;
    p2x: number;
    p2y: number;
    depth: number;
    fill: string;
  }> = [];

  for (const tri of mesh.triangles) {
    const proj = (v: [number, number, number]) => {
      const rx = v[0] * cosY - v[2] * sinY;
      const rz0 = v[0] * sinY + v[2] * cosY;
      const ry = v[1] * cosP - rz0 * sinP;
      const rz = v[1] * sinP + rz0 * cosP;
      const depth = Math.max(1.05, 2.15 - rz);
      return {
        sx: cx + (rx / depth) * fov,
        sy: cy - (ry / depth) * fov,
        depth,
      };
    };
    const p0 = proj(tri.v0);
    const p1 = proj(tri.v1);
    const p2 = proj(tri.v2);

    const rnx = tri.normal[0] * cosY - tri.normal[2] * sinY;
    const rnz0 = tri.normal[0] * sinY + tri.normal[2] * cosY;
    const rny = tri.normal[1] * cosP - rnz0 * sinP;
    const rnz = tri.normal[1] * sinP + rnz0 * cosP;
    if (rnz < -0.55) continue;

    const diff = Math.max(0.56, Math.min(1.42, 0.78 + rnx * 0.32 + rny * 0.42 + rnz * 0.28));
    const spec = Math.pow(Math.max(0, rny * 0.55 + rnz * 0.8), 6) * 46;
    const rim = Math.pow(1 - Math.max(0, Math.abs(rnz)), 2.2) * 28;
    const r = Math.min(255, Math.round(tri.rgb[0] * diff + spec + rim));
    const g = Math.min(255, Math.round(tri.rgb[1] * diff + spec + rim));
    const b = Math.min(255, Math.round(tri.rgb[2] * diff + spec + rim));
    projected.push({
      p0x: p0.sx,
      p0y: p0.sy,
      p1x: p1.sx,
      p1y: p1.sy,
      p2x: p2.sx,
      p2y: p2.sy,
      depth: (p0.depth + p1.depth + p2.depth) / 3,
      fill: `rgb(${r},${g},${b})`,
    });
  }

  projected.sort((a, b) => b.depth - a.depth);
  ctx.lineJoin = "round";
  ctx.lineWidth = 1.15;
  for (const t of projected) {
    ctx.fillStyle = t.fill;
    ctx.strokeStyle = t.fill;
    ctx.beginPath();
    ctx.moveTo(t.p0x, t.p0y);
    ctx.lineTo(t.p1x, t.p1y);
    ctx.lineTo(t.p2x, t.p2y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  mesh.spriteCache.set(angleStep, canvas);
  return canvas;
}

export async function fetchAndParseGlbAsset(meta: TripoGlbAssetMeta): Promise<ParsedGlbMesh | null> {
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
      const parsed = parseGlbBinaryMesh(meta.id, buf, meta.fallbackRgb, 12000);
      if (parsed) {
        glbMeshCache.set(meta.id, parsed);
        await decodeEmbeddedGlbTexture(parsed, meta);
      }
      return parsed;
    })
    .catch(() => null);
  glbLoadingPromises.set(meta.id, p);
  return p;
}

export const INITIAL_CAPSULES: readonly CapsuleItem[] = [
  {
    id: "cap-sp-1",
    rarity: "SP",
    icon: "👑",
    shortTag: "SP 1000分",
    labelZh: "SP 科研特等奖 (1000积分 · 0.1%)",
    labelEn: "SP Grand Research Prize (1,000 Pts · 0.1%)",
    x: 50,
    z: 50,
    glbId: "ur-dragon-egg",
  },
  {
    id: "cap-ur-1",
    rarity: "UR",
    icon: "🐉",
    shortTag: "UR 300分",
    labelZh: "UR 紫金龙蛋 (300积分 · 0.9%)",
    labelEn: "UR Dragon Egg (300 Pts · 0.9%)",
    x: 76,
    z: 62,
    glbId: "ur-dragon-egg",
  },
  {
    id: "cap-ssr-1",
    rarity: "SSR",
    icon: "🔋",
    shortTag: "SSR 80分",
    labelZh: "SSR 4090 显卡饼干 (80积分 · 4%)",
    labelEn: "SSR 4090 Cookie (80 Pts · 4%)",
    x: 24,
    z: 36,
    glbId: "ssr-4090-cookie",
  },
  {
    id: "cap-sr-1",
    rarity: "SR",
    icon: "🌾",
    shortTag: "SR 15分",
    labelZh: "SR 农大黄金麦穗 (15积分)",
    labelEn: "SR Golden Wheat (15 Pts)",
    x: 33,
    z: 72,
    glbId: "sr-golden-wheat",
  },
  {
    id: "cap-sr-2",
    rarity: "SR",
    icon: "🛠️",
    shortTag: "SR 市场券",
    labelZh: "SR 市场算力抵扣胶囊 (15积分)",
    labelEn: "SR Market Voucher (15 Pts)",
    x: 68,
    z: 28,
    glbId: "sr-golden-wheat",
  },
  {
    id: "cap-r-1",
    rarity: "R",
    icon: "🦖",
    shortTag: "R 10分",
    labelZh: "R 薄荷星龙 (10积分)",
    labelEn: "R Mint Dino (10 Pts)",
    x: 18,
    z: 66,
    glbId: "mint-star-dino",
  },
  {
    id: "cap-r-2",
    rarity: "R",
    icon: "⚡",
    shortTag: "R 10分",
    labelZh: "R 极速 Flash 能量球 (10积分)",
    labelEn: "R Flash Orb (10 Pts)",
    x: 82,
    z: 38,
    glbId: "mint-star-dino",
  },
];

export const CAPSULE_PALETTE: Record<PrizeRarity, { shell: string; glow: string; core: string }> = {
  SP: { shell: "rgba(244, 63, 94, 0.95)", glow: "rgba(250, 204, 21, 0.85)", core: "#fef08a" },
  UR: { shell: "rgba(245, 158, 11, 0.92)", glow: "rgba(217, 70, 239, 0.65)", core: "#fde047" },
  SSR: { shell: "rgba(16, 185, 129, 0.92)", glow: "rgba(6, 182, 212, 0.65)", core: "#6ee7b7" },
  SR: { shell: "rgba(249, 115, 22, 0.9)", glow: "rgba(251, 191, 36, 0.55)", core: "#fed7aa" },
  R: { shell: "rgba(56, 189, 248, 0.88)", glow: "rgba(99, 102, 241, 0.5)", core: "#bae6fd" },
};
