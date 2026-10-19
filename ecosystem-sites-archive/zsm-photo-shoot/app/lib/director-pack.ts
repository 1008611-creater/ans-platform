import { Unzip, UnzipInflate } from "fflate";

export const DIRECTOR_PACK_LIMITS = {
  archiveBytes: 30 * 1024 * 1024,
  entries: 64,
  extractedBytes: 20 * 1024 * 1024,
  imageBytes: 18 * 1024 * 1024,
  textBytes: 32 * 1024,
} as const;

export type DirectorPackCamera = {
  fps?: number;
  startFrame?: number;
  endFrame?: number;
};

export type DirectorAssetPack = {
  image: Blob;
  imageName: string;
  prompt: string | null;
  camera: DirectorPackCamera | null;
  included: string[];
};

const imageSignature = [137, 80, 78, 71, 13, 10, 26, 10];
const basename = (path: string) => path.replaceAll("\\", "/").split("/").at(-1)?.toLowerCase() ?? "";

function cameraSummary(source: string): DirectorPackCamera | null {
  try {
    const value: unknown = JSON.parse(source);
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    const safe: DirectorPackCamera = {};
    for (const key of ["fps", "startFrame", "endFrame"] as const) {
      const candidate = record[key];
      if (typeof candidate === "number" && Number.isFinite(candidate)) safe[key] = candidate;
    }
    return Object.keys(safe).length ? safe : null;
  } catch {
    return null;
  }
}

/** Extract only the small, understood subset of a CozyClay keyframe ZIP. */
export function parseDirectorPack(bytes: Uint8Array): DirectorAssetPack {
  if (bytes.byteLength === 0 || bytes.byteLength > DIRECTOR_PACK_LIMITS.archiveBytes) {
    throw new Error("导演素材包为空，或超过 30 MB 安全上限。");
  }

  const wanted = new Map<string, Uint8Array>();
  const chunkSets = new Map<string, Uint8Array[]>();
  let entryCount = 0;
  let extractedBytes = 0;
  let failure: Error | null = null;
  const unzip = new Unzip((file) => {
    entryCount += 1;
    if (entryCount > DIRECTOR_PACK_LIMITS.entries) {
      failure = new Error("素材包文件数量超过 64 个，已停止导入。");
      return;
    }

    const name = basename(file.name);
    const maxBytes = name === "first.png" ? DIRECTOR_PACK_LIMITS.imageBytes : DIRECTOR_PACK_LIMITS.textBytes;
    if (name !== "first.png" && name !== "prompt.txt" && name !== "camera.json") return;
    if (file.originalSize !== undefined && file.originalSize > maxBytes) {
      failure = new Error(name === "first.png" ? "关键帧图片超过 18 MB 安全上限。" : `${name} 超过 32 KB 安全上限。`);
      return;
    }

    const chunks: Uint8Array[] = [];
    let size = 0;
    file.ondata = (error, chunk) => {
      if (error) {
        failure = new Error("导演素材包解压失败，请重新导出或选择 ZIP 文件。");
        return;
      }
      size += chunk.byteLength;
      extractedBytes += chunk.byteLength;
      if (size > maxBytes || extractedBytes > DIRECTOR_PACK_LIMITS.extractedBytes) {
        failure = new Error("解压后的素材超过安全上限，已停止导入。");
        file.terminate();
        return;
      }
      chunks.push(chunk);
    };
    file.start();
    if (chunkSets.has(file.name)) {
      failure = new Error("素材包中有重复文件名，已拒绝导入。");
      file.terminate();
      return;
    }
    chunkSets.set(file.name, chunks);
  });
  unzip.register(UnzipInflate);
  try {
    unzip.push(bytes, true);
  } catch {
    failure ??= new Error("无法读取该导演素材包，请重新导出 ZIP 文件。");
  }
  if (failure) throw failure;

  for (const [name, chunks] of chunkSets) {
    const length = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const combined = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    wanted.set(name, combined);
  }

  const imageEntry = [...wanted.entries()].find(([path]) => basename(path) === "first.png")?.[1];
  if (!imageEntry) throw new Error("素材包里没有 first.png 关键帧，无法导入构图参考。");
  if (!imageSignature.every((byte, index) => imageEntry[index] === byte)) {
    throw new Error("first.png 不是有效的 PNG 图片，已拒绝导入。");
  }

  const promptEntry = [...wanted.entries()].find(([path]) => basename(path) === "prompt.txt")?.[1];
  const cameraEntry = [...wanted.entries()].find(([path]) => basename(path) === "camera.json")?.[1];
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const prompt = promptEntry ? decoder.decode(promptEntry).trim().slice(0, 4000) || null : null;
  const camera = cameraEntry ? cameraSummary(decoder.decode(cameraEntry)) : null;
  const included = ["first.png", ...(promptEntry ? ["prompt.txt"] : []), ...(camera ? ["camera.json（安全摘要）"] : [])];
  const imageBuffer = new ArrayBuffer(imageEntry.byteLength);
  new Uint8Array(imageBuffer).set(imageEntry);

  return {
    image: new Blob([imageBuffer], { type: "image/png" }),
    imageName: "cozyclay-first-frame.png",
    prompt,
    camera,
    included,
  };
}
