import type { EaselEmbedConfig } from "@/contracts/easel";

/** Deployment is opt-in after the isolated gateway passes its acceptance checks. */
export function getEaselEmbedConfig(userId: string): EaselEmbedConfig | null {
  if (process.env.ANS_EASEL_ENABLED !== "1") return null;
  try {
    const raw = process.env.ANS_EASEL_ORIGIN ?? "";
    const url = new URL(raw);
    const ansOrigin = new URL(process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://ans.cauai.fun").origin;
    if (url.protocol !== "https:" || raw !== url.origin || url.origin === ansOrigin || url.username || url.password || url.hostname.includes("*")) return null;
    return { origin: url.origin, src: `${url.origin}/ans/embed?expected=${encodeURIComponent(userId)}`, loginUrl: `${url.origin}/ans/oidc/start` };
  } catch { return null; }
}
