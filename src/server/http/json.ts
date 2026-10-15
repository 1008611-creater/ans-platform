export class HttpRequestError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); this.name = "HttpRequestError"; }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  // Next/reverse proxies may expose an internal request URL. Pin browser writes to
  // configured public origins; never trust client-supplied forwarded host headers.
  const configured = [process.env.AUTH_URL, process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_APP_URL].flatMap((value) => {
    if (!value) return [];
    try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? [url.origin] : []; }
    catch { return []; }
  });
  const allowed = configured.length ? configured : [new URL(request.url).origin];
  if (site === "cross-site" || (origin ? !allowed.includes(origin) : site !== "same-origin")) {
    throw new HttpRequestError("FORBIDDEN", 403);
  }
}

export async function readSameOriginJson(request: Request, limit = 100_000): Promise<unknown> {
  assertSameOrigin(request);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new HttpRequestError("INVALID_INPUT", 415);
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new HttpRequestError("INVALID_INPUT", 400);
  if (Number(request.headers.get("content-length")) > limit) throw new HttpRequestError("REQUEST_TOO_LARGE", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new HttpRequestError("INVALID_JSON", 400);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new HttpRequestError("REQUEST_TOO_LARGE", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new HttpRequestError("INVALID_JSON", 400); }
}


/** Bind a browser operation to the account that rendered its private content. */
export function assertRequestActor(request: Request, actorId: string): void {
  if (request.headers.get("x-ans-actor") !== actorId) throw new HttpRequestError("ACCOUNT_CHANGED", 409);
}
