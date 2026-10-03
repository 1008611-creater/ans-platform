/** Accept only same-origin relative callback URLs for post-login navigation. */
export function safeCallbackUrl(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }

  try {
    const parsed = new URL(value, "https://ans.invalid");
    if (parsed.origin !== "https://ans.invalid" || parsed.pathname === "/login") return "/";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/";
  }
}
