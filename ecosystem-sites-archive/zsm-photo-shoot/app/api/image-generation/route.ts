import { NextResponse } from "next/server";
import {
  getOpenLuxConfig,
  OPENLUX_MODELS,
  OpenLuxError,
  requestOpenLux,
  type OpenLuxInput,
} from "@/app/lib/server/openlux";
import { listOpenLuxCapabilities } from "@/app/lib/server/openlux-capabilities";
import { registerOpenLuxResult } from "@/app/lib/server/result-registry";

export const runtime = "nodejs";

const MAX_JSON_BYTES = 128_000;
const MAX_REFERENCE_BYTES = 8 * 1024 * 1024;

/** Exposes only non-secret readiness information for the product UI. */
export function GET() {
  const config = getOpenLuxConfig();
  const configured = Boolean(config.enabled && config.baseUrl && config.apiKey && config.generationPath);
  return NextResponse.json({
    provider: "openlux",
    state: configured ? "configured" : "disabled",
    reason: configured
      ? "Real calls are controlled by the server-side feature flag."
      : "OpenLux endpoint, credentials, or the real-call flag is not configured.",
    capabilities: listOpenLuxCapabilities(),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function statusFor(error: OpenLuxError): number {
  if (error.code === "UNCONFIGURED") return 503;
  if (error.code === "VALIDATION") return 400;
  if (error.code === "RATE_LIMITED") return 429;
  if (error.code === "TIMEOUT") return 504;
  return 502;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const length = Number(request.headers.get("content-length") || 0);
  if (!contentType.includes("multipart/form-data") && length > MAX_JSON_BYTES) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Request body exceeds the image-generation limit." } },
      { status: 413 },
    );
  }

  try {
    let raw: Record<string, unknown>;
    let reference: Blob | undefined;
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const image = form.get("image");
      if (!(image instanceof Blob) || image.size === 0) {
        throw new OpenLuxError("VALIDATION", "Reference image is missing.", { status: 400 });
      }
      if (image.size > MAX_REFERENCE_BYTES) {
        throw new OpenLuxError("VALIDATION", "Reference image exceeds the 8MB limit.", { status: 400 });
      }
      if (!image.type.startsWith("image/")) {
        throw new OpenLuxError("VALIDATION", "Reference image must be an image file.", { status: 400 });
      }
      reference = image;
      raw = Object.fromEntries(form.entries());
    } else {
      const parsed: unknown = await request.json();
      if (!isRecord(parsed)) throw new OpenLuxError("VALIDATION", "Request body is invalid.", { status: 400 });
      raw = parsed;
    }
    if (
      !isRecord(raw)
      || typeof raw.model !== "string"
      || !OPENLUX_MODELS.includes(raw.model as (typeof OPENLUX_MODELS)[number])
    ) {
      throw new OpenLuxError("VALIDATION", "Model is not in the OpenLux allowlist.", { status: 400 });
    }

    const input: OpenLuxInput = {
      model: raw.model as OpenLuxInput["model"],
      prompt: typeof raw.prompt === "string" ? raw.prompt : "",
      n: typeof raw.n === "number" ? raw.n : 1,
      size: typeof raw.size === "string" ? raw.size : "1536x1024",
      quality: typeof raw.quality === "string" ? raw.quality : "medium",
      format: typeof raw.format === "string" ? raw.format : "webp",
      responseFormat: typeof raw.response_format === "string" ? raw.response_format : "url",
      ...(reference ? { reference } : {}),
    };
    const result = await requestOpenLux(input);
    return NextResponse.json(registerOpenLuxResult(result));
  } catch (error) {
    const normalized = error instanceof OpenLuxError
      ? error
      : new OpenLuxError("UPSTREAM", "OpenLux request failed.", { retryable: true });
    return NextResponse.json(
      { error: { code: normalized.code, message: normalized.message, retryable: normalized.retryable } },
      { status: statusFor(normalized) },
    );
  }
}
