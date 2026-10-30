import { createHmac, randomUUID } from "node:crypto";
import type { EaselEmbedConfig } from "@/contracts/easel";

export const INFINITE_CANVAS_ORIGIN = "https://hb.cauai.fun";

export interface AigcCanvasModelItem {
  id: string;
  label: string;
  provider: string;
  capability: "video" | "image";
  costLabel: string;
  modesLabel: string;
  badge: string;
}

export const PAI_VIDEO_CANVAS_MODELS: readonly AigcCanvasModelItem[] = [
  {
    id: "pixverse-v6",
    label: "PixVerse V6 · 拍我旗舰视频",
    provider: "拍我AI (Pai.video)",
    capability: "video",
    costLabel: "15 积分 / 5秒 (3点/秒)",
    modesLabel: "文生视频 · 图生视频 · 多图参考",
    badge: "🟢 拍我尊享池",
  },
  {
    id: "pixverse-c1",
    label: "PixVerse C1 · 影视全流程引擎",
    provider: "拍我AI (Pai.video)",
    capability: "video",
    costLabel: "15 积分 / 5秒 (3点/秒)",
    modesLabel: "文生视频 · 首尾帧 · 多参融图",
    badge: "🟢 拍我尊享池",
  },
  {
    id: "pai-seedance-2.5",
    label: "Seedance 2.5 · 音画同出旗舰",
    provider: "拍我AI + 火山方舟双活",
    capability: "video",
    costLabel: "25 积分 / 5秒 (5点/秒)",
    modesLabel: "文生 · 首尾帧 · 多图参考 (5~15s)",
    badge: "🟢 双池互备",
  },
  {
    id: "pai-kling-4.0",
    label: "Kling 4.0 · 可灵旗舰视频",
    provider: "拍我AI (Pai.video)",
    capability: "video",
    costLabel: "20 积分 / 5秒 (4点/秒)",
    modesLabel: "文生视频 · 图生视频 (5s/10s)",
    badge: "🟢 拍我尊享池",
  },
  {
    id: "pai-wan-3.0",
    label: "Wan 3.0 · 万相旗舰视频",
    provider: "拍我AI (Pai.video)",
    capability: "video",
    costLabel: "15 积分 / 5秒 (3点/秒)",
    modesLabel: "文生视频 · 图生视频 (5s/10s)",
    badge: "🟢 拍我尊享池",
  },
  {
    id: "image2.5sunburst",
    label: "Image 2.5 Sunburst · 旗舰生图",
    provider: "OpenLux + 拍我AI",
    capability: "image",
    costLabel: "2 积分 / 张",
    modesLabel: "高清文生图 · 参考图精修",
    badge: "🟢 在线即跑",
  },
] as const;

export function buildInfiniteCanvasSsoUrl(user?: { id?: string | null; email?: string | null } | null): string {
  const baseUrl = (process.env.ANS_INFINITE_CANVAS_URL || INFINITE_CANVAS_ORIGIN).trim().replace(/\/+$/, "");
  const email = user?.email?.trim().toLowerCase();
  const sub = user?.id?.trim();
  const secret = (process.env.UNIFIED_AUTH_SECRET || "7a5145b2e31fda1022799cd1f99c233ba6efa4a84bf672b5bc8f72b1f8136111").trim();
  if (!email || !sub || secret.length < 16) {
    return `${baseUrl}/`;
  }
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      email,
      sub,
      aud: "hb",
      purpose: "login",
      jti: randomUUID(),
      iat: now,
      exp: now + 180,
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  const assertion = `${header}.${payload}.${sig}`;
  return `${baseUrl}/api/auth/unified?assertion=${encodeURIComponent(assertion)}&redirect=1`;
}

/** Deployment is opt-in after the isolated gateway passes its acceptance checks. */
export function getEaselEmbedConfig(userId: string): EaselEmbedConfig | null {
  if (process.env.ANS_EASEL_ENABLED !== "1") return null;
  try {
    const raw = process.env.ANS_EASEL_ORIGIN ?? "";
    const url = new URL(raw);
    const ansOrigin = new URL(process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://ans.cauai.fun").origin;
    if (url.protocol !== "https:" || raw !== url.origin || url.origin === ansOrigin || url.username || url.password || url.hostname.includes("*")) return null;
    return { origin: url.origin, src: `${url.origin}/ans/embed?expected=${encodeURIComponent(userId)}`, loginUrl: `${url.origin}/ans/oidc/start?expected=${encodeURIComponent(userId)}` };
  } catch { return null; }
}
