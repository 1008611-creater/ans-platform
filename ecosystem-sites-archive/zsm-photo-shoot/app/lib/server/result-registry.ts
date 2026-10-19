import type { OpenLuxOutput, OpenLuxResult } from "./openlux";

/**
 * Short-lived, process-local delivery registry.
 *
 * This is deliberately not a database or object store. A restart clears the
 * registry and therefore clears all delivery links, which keeps the current
 * product honest about its persistence boundary.
 */
export const IMAGE_DELIVERY_TTL_MS = 15 * 60 * 1000;
export const MAX_DELIVERY_BYTES = 16_000_000;

type DeliveryRecord = {
  expiresAt: number;
  source: { kind: "remote"; url: string } | { kind: "base64"; value: string };
  fallbackContentType: string;
};

export type DeliveredOpenLuxOutput = Omit<OpenLuxOutput, "url" | "data"> & {
  deliveryUrl: string;
  expiresAt: string;
};

export type DeliveredOpenLuxResult = Omit<OpenLuxResult, "outputs"> & {
  outputs: DeliveredOpenLuxOutput[];
};

const records = new Map<string, DeliveryRecord>();
const MAX_RECORDS = 100;

function cleanup(now = Date.now()): void {
  for (const [token, record] of records) {
    if (record.expiresAt <= now) records.delete(token);
  }
  while (records.size > MAX_RECORDS) {
    const oldest = records.keys().next().value;
    if (!oldest) break;
    records.delete(oldest);
  }
}

function isSafeRemoteUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname === "::1" || hostname === "0:0:0:0:0:0:0:1") return false;
  if (/^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname)) return false;
  if (/^169\.254\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
  return true;
}

function contentTypeFromData(value: string): string {
  const decoded = Buffer.from(value, "base64");
  if (decoded.byteLength > MAX_DELIVERY_BYTES) throw new Error("Image result exceeds the delivery size limit.");
  if (decoded.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "image/png";
  if (decoded.subarray(0, 3).toString("hex") === "ffd8ff") return "image/jpeg";
  if (decoded.subarray(0, 4).toString("ascii") === "RIFF" && decoded.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return "image/webp";
}

function registerOutput(output: OpenLuxOutput, now: number): DeliveredOpenLuxOutput | null {
  const expiresAt = now + IMAGE_DELIVERY_TTL_MS;
  let source: DeliveryRecord["source"];
  let fallbackContentType = "image/webp";
  if (output.url) {
    if (!isSafeRemoteUrl(output.url)) return null;
    source = { kind: "remote", url: output.url };
  } else if (output.data) {
    fallbackContentType = contentTypeFromData(output.data);
    source = { kind: "base64", value: output.data };
  } else {
    return null;
  }
  const token = crypto.randomUUID().replaceAll("-", "");
  records.set(token, { expiresAt, source, fallbackContentType });
  return {
    id: output.id,
    mediaType: output.mediaType,
    ...(output.width !== undefined ? { width: output.width } : {}),
    ...(output.height !== undefined ? { height: output.height } : {}),
    deliveryUrl: `/api/image-result?token=${encodeURIComponent(token)}`,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

export function registerOpenLuxResult(result: OpenLuxResult, now = Date.now()): DeliveredOpenLuxResult {
  cleanup(now);
  const outputs = result.outputs.flatMap((output) => {
    const registered = registerOutput(output, now);
    return registered ? [registered] : [];
  });
  if (outputs.length === 0) throw new Error("OpenLux returned no safe temporary image result.");
  cleanup(now);
  return { provider: result.provider, demo: result.demo, status: result.status, outputs };
}

export type DeliveryLookup =
  | { state: "ready"; record: DeliveryRecord }
  | { state: "expired" }
  | { state: "missing" };

export function lookupDelivery(token: string, now = Date.now()): DeliveryLookup {
  cleanup(now);
  const record = records.get(token);
  if (record) return { state: "ready", record };
  return { state: "missing" };
}

export function getDeliverySource(record: DeliveryRecord): DeliveryRecord["source"] {
  return record.source;
}

export function getDeliveryExpiry(record: DeliveryRecord): number {
  return record.expiresAt;
}

export function getDeliveryFallbackContentType(record: DeliveryRecord): string {
  return record.fallbackContentType;
}
