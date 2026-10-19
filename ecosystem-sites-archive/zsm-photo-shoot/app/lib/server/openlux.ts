export const OPENLUX_MODELS = [
  "gpt-image-2.5-flare",
  "gpt-image-2.5-sunburst-c",
  "gpt-image-2.5-sunburst",
] as const;

export type OpenLuxModel = (typeof OPENLUX_MODELS)[number];

export type OpenLuxConfig = {
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  generationPath: string;
  editsPath: string;
};

export type OpenLuxInput = {
  model: OpenLuxModel;
  prompt: string;
  n: number;
  size: string;
  quality: string;
  format: string;
  responseFormat: string;
  reference?: Blob;
};

export type OpenLuxOutput = {
  id: string;
  mediaType: "image";
  url?: string;
  data?: string;
  width?: number;
  height?: number;
};

export type OpenLuxResult = {
  provider: "openlux";
  demo: false;
  status: "succeeded";
  outputs: OpenLuxOutput[];
};

export type OpenLuxErrorCode =
  | "UNCONFIGURED"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "UPSTREAM"
  | "TIMEOUT"
  | "MALFORMED_RESPONSE"
  | "NO_RESULT";

export class OpenLuxError extends Error {
  readonly code: OpenLuxErrorCode;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    code: OpenLuxErrorCode,
    message: string,
    options?: { retryable?: boolean; status?: number },
  ) {
    super(message);
    this.name = "OpenLuxError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.status = options?.status;
  }
}

export function getOpenLuxConfig(env: NodeJS.ProcessEnv = process.env): OpenLuxConfig {
  return {
    baseUrl: (env.OPENLUX_BASE_URL || "https://api.openlux.ai/v1").replace(/\/$/, ""),
    apiKey: env.OPENLUX_API_KEY,
    enabled: env.OPENLUX_REAL_CALLS_ENABLED === "true",
    generationPath: env.OPENLUX_GENERATION_PATH || "/images/generations",
    editsPath: env.OPENLUX_EDITS_PATH || "/images/edits",
  };
}

const SUPPORTED_FORMATS = new Set(["png", "webp", "jpeg", "jpg"]);
const SUPPORTED_RESPONSE_FORMATS = new Set(["url", "b64_json"]);
const SUPPORTED_QUALITIES = new Set(["low", "medium", "high", "xhigh", "max", "auto"]);
const CONFIRMED_IMAGE_MODELS = new Set<OpenLuxModel>([
  "gpt-image-2.5-flare",
  "gpt-image-2.5-sunburst",
  "gpt-image-2.5-sunburst-c",
]);
const MAX_RESPONSE_BYTES = 16_000_000;

export function validateOpenLuxInput(input: OpenLuxInput): void {
  if (!OPENLUX_MODELS.includes(input.model)) {
    throw new OpenLuxError("VALIDATION", "Model is not in the OpenLux allowlist.", { status: 400 });
  }
  if (!CONFIRMED_IMAGE_MODELS.has(input.model)) {
    throw new OpenLuxError("VALIDATION", "This model is not confirmed for the OpenLux image endpoint.", { status: 400 });
  }
  if (!input.prompt.trim() || input.prompt.length > 1_000) {
    throw new OpenLuxError("VALIDATION", "Prompt is empty or exceeds OpenLux's 1,000-character limit.", { status: 400 });
  }
  if (!Number.isInteger(input.n) || input.n < 1 || input.n > 10) {
    throw new OpenLuxError("VALIDATION", "Image count must be between 1 and 10.", { status: 400 });
  }
  if (input.size !== "auto" && !/^\d{2,5}x\d{2,5}$/.test(input.size)) {
    throw new OpenLuxError("VALIDATION", "Image size must be auto or WIDTHxHEIGHT.", { status: 400 });
  }
  if (input.size !== "auto") {
    const [width, height] = input.size.split("x").map(Number);
    const longest = Math.max(width, height);
    const shortest = Math.min(width, height);
    const pixels = width * height;
    if (
      width % 16 !== 0
      || height % 16 !== 0
      || longest > 3_840
      || longest / shortest > 3
      || pixels < 655_360
      || pixels > 8_294_400
    ) {
      throw new OpenLuxError("VALIDATION", "Image size does not satisfy the OpenLux 2.5 constraints.", { status: 400 });
    }
  }
  if (!SUPPORTED_QUALITIES.has(input.quality)) {
    throw new OpenLuxError("VALIDATION", "Image quality is not supported by the confirmed contract.", { status: 400 });
  }
  if (!SUPPORTED_FORMATS.has(input.format.toLowerCase())) {
    throw new OpenLuxError("VALIDATION", "Image format is not confirmed for this provider.", { status: 400 });
  }
  if (!SUPPORTED_RESPONSE_FORMATS.has(input.responseFormat)) {
    throw new OpenLuxError("VALIDATION", "Response format is not confirmed for this provider.", { status: 400 });
  }
}

export function parseOpenLuxResult(body: unknown): OpenLuxResult {
  const data = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(data) || data.length === 0) {
    throw new OpenLuxError("NO_RESULT", "OpenLux returned no image result.", { retryable: true });
  }

  const outputs = data.flatMap((item, index) => {
    const value = item as {
      url?: unknown;
      b64_json?: unknown;
      width?: unknown;
      height?: unknown;
    };
    const url = typeof value.url === "string" && value.url.length > 0 ? value.url : undefined;
    const dataUrl = typeof value.b64_json === "string" && value.b64_json.length > 0
      ? value.b64_json
      : undefined;
    if (!url && !dataUrl) return [];
    return [{
      id: `openlux-${index + 1}`,
      mediaType: "image" as const,
      ...(url ? { url } : {}),
      ...(dataUrl ? { data: dataUrl } : {}),
      ...(typeof value.width === "number" ? { width: value.width } : {}),
      ...(typeof value.height === "number" ? { height: value.height } : {}),
    }];
  });

  if (outputs.length === 0) {
    throw new OpenLuxError("MALFORMED_RESPONSE", "OpenLux returned no deliverable image reference.", { retryable: true });
  }
  return { provider: "openlux", demo: false, status: "succeeded", outputs };
}

function timeoutSignal(ms: number): AbortSignal {
  return typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ms)
    : new AbortController().signal;
}

export async function requestOpenLux(
  input: OpenLuxInput,
  fetchImpl: typeof fetch = fetch,
  env: NodeJS.ProcessEnv = process.env,
): Promise<OpenLuxResult> {
  validateOpenLuxInput(input);
  const config = getOpenLuxConfig(env);
  const path = input.reference ? config.editsPath : config.generationPath;
  if (!config.enabled || !config.baseUrl || !config.apiKey || !path) {
    throw new OpenLuxError("UNCONFIGURED", "OpenLux is not fully configured or real calls are disabled.", { status: 503 });
  }

  const url = `${config.baseUrl}${path}`;
  const headers = new Headers({ Authorization: `Bearer ${config.apiKey}` });
  let body: BodyInit;
  if (input.reference) {
    const form = new FormData();
    form.set("image", input.reference, "reference-image");
    form.set("model", input.model);
    form.set("prompt", input.prompt);
    form.set("n", String(input.n));
    form.set("size", input.size);
    form.set("quality", input.quality);
    form.set("format", input.format);
    form.set("response_format", input.responseFormat);
    body = form;
  } else {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify({
      model: input.model,
      prompt: input.prompt,
      n: input.n,
      size: input.size,
      quality: input.quality,
      format: input.format,
      response_format: input.responseFormat,
    });
  }

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers,
      body,
      signal: timeoutSignal(45_000),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new OpenLuxError("TIMEOUT", "OpenLux request timed out.", { retryable: true });
    }
    throw new OpenLuxError("UPSTREAM", "OpenLux is temporarily unavailable.", { retryable: true });
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new OpenLuxError("RATE_LIMITED", "OpenLux rate limit or quota was reached.", { retryable: true, status: 429 });
    }
    throw new OpenLuxError("UPSTREAM", "OpenLux did not accept this request.", {
      retryable: response.status >= 500,
      status: response.status,
    });
  }

  const responseLength = Number(response.headers.get("content-length") || 0);
  if (responseLength > MAX_RESPONSE_BYTES) {
    throw new OpenLuxError("MALFORMED_RESPONSE", "OpenLux response exceeds the local size limit.");
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    throw new OpenLuxError("MALFORMED_RESPONSE", "OpenLux response could not be parsed.", { retryable: true });
  }
  return parseOpenLuxResult(parsed);
}
