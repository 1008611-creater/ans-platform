import { AIGC_CONNECTORS } from "@/lib/aigc/cluster";

/** Opt-in only after the deployed Toonflow supports the account-bound handshake. */
export function getToonflowEmbedConfig() {
  if (process.env.ANS_TOONFLOW_EMBED_ENABLED !== "1") return null;
  try {
    const url = new URL(AIGC_CONNECTORS.find(item => item.id === "toonflow")!.url);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return { origin: url.origin, src: `${url.origin}/?ans_embed=1`, loginUrl: `${url.origin}/api/auth/oidc/start?return_to=%2F` };
  } catch { return null; }
}

/** Enable only after the task-owner result endpoints are deployed and accepted. */
export function getToonflowResultUrl(taskId: string) {
  if (process.env.ANS_TOONFLOW_RESULTS_ENABLED !== "1" || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{7,159}$/.test(taskId)) return null;
  const config = getToonflowEmbedConfig();
  if (!config) return null;
  const result = new URL("/compute/result", config.origin);
  result.searchParams.set("taskId", taskId);
  return result.toString();
}
