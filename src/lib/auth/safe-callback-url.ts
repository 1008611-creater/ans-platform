/** Accept only same-origin relative callback URLs for post-login navigation. */
export function safeCallbackUrl(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u0020\u007f]/.test(value) || /%(?:00|0a|0d|5c)/i.test(value)) {
    return "/";
  }

  try {
    const parsed = new URL(value, "https://ans.invalid");
    if (parsed.origin !== "https://ans.invalid" || ["/login", "/register"].includes(parsed.pathname)) return "/";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/";
  }
}
