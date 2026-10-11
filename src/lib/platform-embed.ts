/** Exact project origins allowed to host the ANS platform header. */
export function platformEmbedOrigins(): string[] {
  const values = (process.env.ANS_EMBED_ORIGINS || "https://kaogong.cauai.fun,https://suanming.cauai.fun").split(",").map(value => value.trim()).filter(Boolean);
  return [...new Set(values.filter(value => {
    try { const url = new URL(value); return url.protocol === "https:" && url.origin === value && !url.hostname.includes("*") && !url.username && !url.password; } catch { return false; }
  }))];
}
