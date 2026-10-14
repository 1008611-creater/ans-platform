/** Read only a bounded error body. A supplier error code improves the message;
 * it is never evidence that execution or charging did not occur. */
export async function upstreamFailureCode(response: Response): Promise<string> {
  if (response.status !== 503) return "UPSTREAM_REJECTED";
  if (!response.body || response.body.locked) return "UPSTREAM_REJECTED";
  const reader = response.body.getReader();
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 8192) { await reader.cancel(); return "UPSTREAM_REJECTED"; }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) return "UPSTREAM_REJECTED";
    const error = (body as Record<string, unknown>).error;
    if (!error || typeof error !== "object" || Array.isArray(error)) return "UPSTREAM_REJECTED";
    const code = (error as Record<string, unknown>).code;
    return typeof code === "string" && ["system_cpu_overloaded", "system_memory_overloaded", "system_disk_overloaded"].includes(code)
      ? "UPSTREAM_CAPACITY_UNAVAILABLE" : "UPSTREAM_REJECTED";
  } catch { return "UPSTREAM_REJECTED"; }
  finally { reader.releaseLock(); }
}
